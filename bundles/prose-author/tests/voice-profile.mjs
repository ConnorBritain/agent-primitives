/**
 * voice-profile — schema check and corpus lock for `voice-profile-render`.
 *
 * Two jobs, and they exist for the same reason: a rendered voice profile is prose,
 * and prose that invented its observations reads exactly like prose that cited them.
 * There is no surface signal to review against. So the checkable half is pulled out
 * into the emitted JSON and asserted here.
 *
 *   validateVoiceProfile()  the render carries a support count per observation,
 *                           the counts match the prose, nothing shipped uncited
 *   corpusLock()            the profile is keyed to the corpus that produced it,
 *                           so a stale profile can be detected rather than trusted
 *
 * The primitive emits no hashes (it cannot compute one reliably, and a fabricated
 * hash inside a provenance block is worse than an absent field — same rule as
 * prose-reviser). Hashes are produced here, deterministically.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { parseFences } from "./fences.mjs";
import { readSamples } from "../skills/prose-draft/tools/exemplars.mjs";

export const SCHEMA_ID = "voice-profile/1";

/** Sections the renderer may emit. It may not add to this list. */
export const SECTIONS = [
  "cadence",
  "openings",
  "closings",
  "address",
  "figures",
  "register-range",
  "absences",
  "gaps",
];

export const CONFIDENCE = ["thin", "full"];

/**
 * The frequency vocabulary (FU-16). Fixed words, because the point is that a drafter can
 * act on them — "often" and "regularly" are the same problem the count already has.
 */
export const FREQUENCIES = ["once or twice per piece", "several times per piece", "throughout"];

/**
 * Words that assert a habit is pervasive. Any of these obliges a frequency, and only
 * `throughout` licenses them.
 *
 * This list exists because of a measured failure: five consecutive profiles opened on the
 * same observation — "a long sentence accumulates, then a short flat one lands" — each
 * introduced as the engine of that voice. A drafter read one of them and ended 7 of 7
 * paragraphs on the move, against a corpus that does it once or twice per piece.
 *
 * Note what this does NOT do. It does not check whether the habit is real, or whether the
 * stated frequency is accurate; only the renderer has read the corpus and only a human can
 * judge the prose. It checks that a claim of pervasiveness is accompanied by the one word
 * that makes it actionable, which is a documentation property and decidable from the text.
 */
export const DOMINANCE_PHRASES = [
  "the engine of", "engine of this prose", "the defining move", "defining feature",
  "everywhere", "every paragraph", "every sentence", "constantly", "relentlessly",
  "at every turn", "never varies", "without exception",
];
export const VOICE_CARD_STATES = ["empty", "corroborating", "contradicted"];

/** Corpus-size rules. Borrowed, not invented — see .planning/PI-02-S2-design.md D5. */
export const REFUSE_BELOW = 5; // the floor calibrate.mjs refuses at
export const FULL_AT = 10; // CORPUS_MINIMUM in exemplars.mjs
export const REFUSE_ABOVE = 50; // past a whole read; sampling nobody can see

const RENDER_KEYS = [
  "schema", "profile", "confidence", "samples_used", "samples_excluded",
  "voice_card", "observations", "observations_dropped", "multiple_voices_suspected",
];
const REFUSAL_KEYS = ["schema", "profile", "refused"];

const isInt = (v) => Number.isInteger(v);
const isStr = (v) => typeof v === "string" && v.length > 0;

/**
 * Validate an emitted voice-profile JSON block.
 *
 * @param {object} obj      the parsed json fence
 * @param {string} markdown the parsed markdown fence, or "" for a refusal
 * @returns {{ok: boolean, refusal: boolean, errors: string[]}}
 */
/**
 * Frequency discipline in a rendered profile (FU-16).
 *
 * Two checks, both on the prose rather than the json, because this is a property of what
 * the drafter will read:
 *
 *   1. A sentence claiming a habit is pervasive must carry a frequency, and it must be
 *      `throughout` — otherwise the claim and the rate contradict each other.
 *   2. The profile must state at least one frequency somewhere. A profile with counts and
 *      no rates is the pre-FU-16 shape, and it is what produced the caricature.
 *
 * Returns findings rather than throwing, so a caller can report all of them at once.
 */
export function checkFrequencyDiscipline(markdown) {
  const findings = [];
  const text = markdown ?? "";

  const sentences = text
    .split(/\n\s*\n/)
    .flatMap((block) => block.split(/(?<=[.!?])\s+(?=[A-Z*`])/))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const stated = FREQUENCIES.filter((f) => text.toLowerCase().includes(f));
  if (stated.length === 0) {
    findings.push({
      kind: "no-frequency-anywhere",
      detail: `profile states none of: ${FREQUENCIES.join(" | ")}`,
    });
  }

  for (const s of sentences) {
    const lower = s.toLowerCase();
    // Only sentences that actually carry an observation - a count - are in scope. Prose
    // in section 8 discussing the corpus generally is not making a habit claim.
    if (!/\d+\s*\/\s*\d+/.test(s)) continue;
    const hit = DOMINANCE_PHRASES.find((p) => lower.includes(p));
    if (!hit) continue;
    if (!lower.includes("throughout")) {
      findings.push({
        kind: "dominance-without-throughout",
        phrase: hit,
        detail: s.slice(0, 140),
      });
    }
  }
  return findings;
}

export function validateVoiceProfile(obj, markdown = "") {
  const errors = [];
  const err = (m) => errors.push(m);

  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, refusal: false, errors: ["not a json object"] };
  }

  if (obj.schema !== SCHEMA_ID) err(`schema must be "${SCHEMA_ID}", got ${JSON.stringify(obj.schema)}`);
  if (!isStr(obj.profile)) err("profile must be a non-empty string");

  // A refusal is a DIFFERENT SHAPE, not a render with a flag bolted on. Keeping the
  // two shapes disjoint is what stops a caller reading observations off a refusal.
  const refusal = Object.hasOwn(obj, "refused");
  if (refusal) {
    if (!isStr(obj.refused)) err("refused must be a non-empty reason string");
    if (markdown.trim() !== "") err("a refusal emits the json fence alone — no markdown fence");
    for (const k of Object.keys(obj)) {
      if (!REFUSAL_KEYS.includes(k)) err(`refusal carries key not in the refusal shape: ${k}`);
    }
    return { ok: errors.length === 0, refusal: true, errors };
  }

  for (const k of Object.keys(obj)) {
    if (!RENDER_KEYS.includes(k)) err(`key not in the output contract: ${k}`);
  }
  for (const k of RENDER_KEYS) {
    if (!Object.hasOwn(obj, k)) err(`missing required key: ${k}`);
  }

  if (!CONFIDENCE.includes(obj.confidence)) err(`confidence must be one of ${CONFIDENCE.join("|")}`);
  if (!VOICE_CARD_STATES.includes(obj.voice_card)) err(`voice_card must be one of ${VOICE_CARD_STATES.join("|")}`);
  if (typeof obj.multiple_voices_suspected !== "boolean") err("multiple_voices_suspected must be a boolean");
  if (!isInt(obj.observations_dropped) || obj.observations_dropped < 0) {
    err("observations_dropped must be a non-negative integer");
  }

  const used = obj.samples_used;
  if (!Array.isArray(used) || !used.every(isStr)) {
    err("samples_used must be an array of filenames");
  } else {
    // Filenames only. A path would mean the render is quoting its own filesystem
    // into an artefact that gets checked in and read on another machine.
    for (const f of used) if (f.includes("/")) err(`samples_used must be filenames, not paths: ${f}`);
    if (new Set(used).size !== used.length) err("samples_used contains duplicates");

    if (used.length < REFUSE_BELOW) err(`rendered on ${used.length} samples; below ${REFUSE_BELOW} must refuse`);
    if (used.length > REFUSE_ABOVE) err(`rendered on ${used.length} samples; above ${REFUSE_ABOVE} must refuse`);

    // The confidence tier is not a free choice — it follows from the sample count.
    const expected = used.length >= FULL_AT ? "full" : "thin";
    if (obj.confidence !== expected) {
      err(`confidence "${obj.confidence}" contradicts ${used.length} samples (expected "${expected}")`);
    }
  }

  if (!Array.isArray(obj.samples_excluded)) {
    err("samples_excluded must be an array");
  } else {
    for (const e of obj.samples_excluded) {
      if (!e || typeof e !== "object" || !isStr(e.file) || !isStr(e.reason)) {
        err("each samples_excluded entry needs a file and a reason");
      }
    }
  }

  // The citation contract, which is the whole point of this file.
  const obs = obj.observations;
  if (!Array.isArray(obs)) {
    err("observations must be an array");
  } else {
    if (obs.length === 0) err("a render with no observations is a refusal, not a profile");
    const ids = new Set();
    for (const [i, o] of obs.entries()) {
      const at = `observations[${i}]`;
      if (!o || typeof o !== "object") { err(`${at} is not an object`); continue; }
      for (const k of Object.keys(o)) {
        if (!["id", "section", "support", "of"].includes(k)) err(`${at} has key not in contract: ${k}`);
      }
      if (!isStr(o.id)) err(`${at}.id must be a non-empty string`);
      else if (ids.has(o.id)) err(`${at}.id is a duplicate: ${o.id}`);
      else ids.add(o.id);

      if (!SECTIONS.includes(o.section)) err(`${at}.section "${o.section}" is not one of the eight fixed sections`);

      // support >= 1 is THE assertion. Zero support is an invented observation that
      // reached the artefact, which is this primitive's one failure mode.
      if (!isInt(o.support) || o.support < 1) err(`${at}.support must be an integer >= 1 (uncited observations are dropped, not shipped)`);
      if (!isInt(o.of) || o.of < 1) err(`${at}.of must be an integer >= 1`);
      if (isInt(o.support) && isInt(o.of) && o.support > o.of) {
        err(`${at} claims support ${o.support} of ${o.of}`);
      }
      if (Array.isArray(used) && isInt(o.of) && used.length > 0 && o.of !== used.length) {
        err(`${at}.of is ${o.of} but ${used.length} samples were used`);
      }
    }

    // The prose and the json must agree. Cheap to check, and the failure it catches
    // — a count edited in one place — is invisible to a reader of either alone.
    if (markdown) {
      for (const [i, o] of obs.entries()) {
        if (!isInt(o.support) || !isInt(o.of)) continue;
        const pattern = new RegExp(`\\b${o.support}\\s*/\\s*${o.of}\\b`);
        if (!pattern.test(markdown)) {
          err(`observations[${i}] claims ${o.support}/${o.of}, which appears nowhere in the profile prose`);
        }
      }
    }
  }

  return { ok: errors.length === 0, refusal: false, errors };
}

/**
 * Scan a profile directory's human corpus, splitting usable from unusable.
 *
 * This DELEGATES to `exemplars.mjs`, deliberately. PROFILES.md's rule is that the
 * corpus has several readers and they must agree about what is in it; a renderer
 * that counts ten samples where drafting counts eight is describing a corpus the
 * drafter will never see. The provenance rule, the 200-word floor, the extension
 * filter and the group-subdirectory walk all live in one place and are read from
 * there — not reimplemented here, because within one bundle there is no
 * load-independence reason to pay for a port and a contract test.
 *
 * The only thing added on top is the per-file hash, which drafting has no use for
 * and the cache key cannot do without.
 */
export function scanCorpus(profileDir) {
  const dir = join(profileDir, "corpus", "human");
  if (!existsSync(dir)) return { usable: [], excluded: [] };
  const { usable, excluded } = readSamples(dir, { requireAttestation: true });
  return {
    usable: usable.map((s) => ({
      file: s.file,
      group: s.group,
      words: s.words,
      sha256: createHash("sha256").update(readFileSync(s.path)).digest("hex"),
    })),
    excluded,
  };
}

/**
 * The cache key. Covers more than the corpus on purpose: a profile rendered by an
 * older version of the prompt is not interchangeable with one rendered by the
 * current version. The cross-author run's MANIFEST.json records agent_sha256 for
 * the same reason.
 *
 * Invalidation REPORTS. It does not silently re-render — the profile is an artefact
 * the author read and approved.
 */
export function corpusLock(profileDir, { agentPath = null } = {}) {
  const { usable, excluded } = scanCorpus(profileDir);

  // Which primitive produced this lock. agent_sha256 alone cannot answer "is this
  // stale?" - a consumer holding the hash has nothing to compare it against unless it
  // also knows WHICH agent.md to hash, and this bundle now has two primitives writing
  // locks in the same format. Recording the name makes the lock self-describing rather
  // than interpretable only by whoever happened to create it. Derived from the path so
  // it cannot disagree with the hash beside it.
  //
  // (A reviewer read this as a test-only field. It is not: the alternative - encoding
  // the owner in a directory name - breaks silently on a rename, and leaves a lock
  // shipped next to a user's profile unable to say what produced it.)
  const agentName = agentPath ? agentPath.replace(/\/agent\.md$/, "").split("/").pop() : null;

  const sha = (p) => (existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : null);
  const voiceCard = sha(join(profileDir, "voice.md"));
  // profile.json is the third thing the renderer reads - it supplies the register,
  // the medium, and the notes. It was missing from this key until a fixture's notes
  // were rewritten and nothing reported the profile as stale. An input the renderer
  // reads and the cache does not cover is an input that can change under a profile
  // silently, which is the whole failure the lock exists to make impossible.
  const profileMeta = sha(join(profileDir, "profile.json"));
  const agent = agentPath ? sha(agentPath) : null;

  const aggregate = createHash("sha256");
  for (const f of usable) aggregate.update(`${f.file}\0${f.sha256}\n`);
  aggregate.update(`voice.md\0${voiceCard ?? "absent"}\n`);
  aggregate.update(`profile.json\0${profileMeta ?? "absent"}\n`);
  aggregate.update(`agent.md\0${agent ?? "absent"}\n`);

  return {
    schema: "voice-profile-lock/1",
    files: usable,
    excluded,
    voice_card_sha256: voiceCard,
    profile_json_sha256: profileMeta,
    agent: agentName,
    agent_sha256: agent,
    sample_count: usable.length,
    aggregate_sha256: aggregate.digest("hex"),
  };
}

/** A two-fence render, named in this primitive's own terms. */
export function parseRender(text) {
  const f = parseFences(text);
  return {
    markdown: f.markdown ?? "",
    json: f.json,
    jsonError: f.jsonError,
    hadMarkdownFence: f.hadMarkdown,
    hadJsonFence: f.hadJson,
  };
}

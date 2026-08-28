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
import {
  FREQUENCIES as PORTABLE_FREQUENCIES,
  FREQUENCY_BANDS as PORTABLE_FREQUENCY_BANDS,
  frequencyForPerPiece,
} from "../skills/prose-draft/tools/profile-contract.mjs";

export const SCHEMA_ID_V1 = "voice-profile/1";
export const SCHEMA_ID = "voice-profile/2";
export const SCHEMA_IDS = [SCHEMA_ID_V1, SCHEMA_ID];

/**
 * Coverage is deliberately fixed while observations remain corpus-derived. These are
 * questions every render must answer, not habits every author is expected to have.
 */
export const COVERAGE_DIMENSIONS = [
  "person-reader-stance",
  "contraction-negation",
  "qualification-hedging",
  "questions-imperatives-vocatives",
  "opponents-allies-sources",
  "profanity-vulgarity",
  "self-reference-biography",
  "interruption-punctuation",
  "figures-analogy",
  "openings-endings-closure",
];

export const COVERAGE_STATUSES = ["rated", "described", "absent-paired", "unresolved"];

/** Locate an exact numeric support claim without making punctuation part of the schema. */
function supportPattern(support, of) {
  return new RegExp(`\\b${support}\\s*(?:/|(?:out\\s+)?of)\\s*${of}\\b`, "i");
}

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
export const FREQUENCIES = PORTABLE_FREQUENCIES;

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

const RENDER_KEYS_V1 = [
  "schema", "profile", "confidence", "samples_used", "samples_excluded",
  "voice_card", "observations", "observations_dropped", "multiple_voices_suspected",
];
const RENDER_KEYS_V2 = [...RENDER_KEYS_V1, "profile_markdown", "corpus_words", "coverage"];
const REFUSAL_KEYS = ["schema", "profile", "refused"];
const PROFILE_MARKER = "<!-- voice-profile/2:profile -->";
const RECORD_MARKER = "<!-- voice-profile/2:record -->";

const isInt = (v) => Number.isInteger(v);
const isStr = (v) => typeof v === "string" && v.length > 0;
const isText = (v) => typeof v === "string" && v.trim().length > 0;

/**
 * Validate an emitted voice-profile JSON block.
 *
 * @param {object} obj      the parsed json fence
 * @param {string} markdown historical separately parsed Markdown, or "" to use the v2 envelope
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

/**
 * Per-piece thresholds the frequency vocabulary means, in instances per sample.
 *
 * These make FREQUENCIES checkable instead of impressionistic. They are not a
 * redefinition: `once or twice` means once or twice, and `throughout` is glossed in the
 * prompt as "hard to find a paragraph without it", which in a piece of twenty-odd
 * paragraphs is upwards of ten.
 */
export const FREQUENCY_BANDS = PORTABLE_FREQUENCY_BANDS;

/**
 * A rate the renderer states must be arithmetic on the corpus it says it read.
 *
 * This is the check that makes a renderer-emitted number worth having. The same
 * quantity was measured three different ways during PI-02 and came back 16, 26 and 56
 * occurrences; a number in a profile with nothing able to recompute it is a confident
 * wrong number with better distribution than a hedge.
 *
 * It verifies `per_1000_words` against `count` over the corpus word total. It cannot
 * verify `count` itself - only a pattern-based screen can do that, and only for habits
 * a pattern can express - so a renderer that miscounts consistently still passes here.
 * That limit is why `corpus-rates.mjs` exists alongside this rather than instead of it.
 */
export function checkRateArithmetic(obj, corpusWords, { tolerance = 0.05 } = {}) {
  const findings = [];
  if (!obj || !Array.isArray(obj.observations) || !corpusWords) return findings;

  for (const o of obj.observations) {
    const r = o?.rate;
    if (!r || typeof r.count !== "number" || typeof r.per_1000_words !== "number") continue;
    const expected = (r.count / corpusWords) * 1000;
    if (Math.abs(r.per_1000_words - expected) > Math.max(tolerance, expected * tolerance)) {
      findings.push({
        id: o.id,
        stated: r.per_1000_words,
        expected: Math.round(expected * 100) / 100,
        detail: `${o.id}: states ${r.per_1000_words} per 1000 words, but ${r.count} occurrences over ${corpusWords} words is ${Math.round(expected * 100) / 100}`,
      });
    }
  }
  return findings;
}

/**
 * The frequency word in the prose must agree with the number beside it.
 *
 * A profile can now say two things about how often a habit occurs - a phrase and a
 * rate - and a drafter reading the phrase while the harness reads the number is exactly
 * the split this was built to close. Measured instance: a corpus habit occurring 2.6
 * times per piece was described as `once or twice per piece` by one render and `several
 * times per piece` by another.
 *
 * ONLY GROSS DISAGREEMENT IS REPORTED - two bands apart, not one. The band edges are
 * judgement calls sitting in a continuum, and a habit at 2.6 per piece genuinely
 * straddles the first two phrases. Flagging that would train renderers to write toward
 * the checker, which is how a profile stops describing the corpus.
 */
export function checkFrequencyAgainstRate(markdown, obj, meanPieceWords) {
  const findings = [];
  if (!markdown || !obj || !Array.isArray(obj.observations) || !meanPieceWords) return findings;

  const sentences = markdown
    .split(/\n\s*\n/)
    .flatMap((b) => b.split(/(?<=[.!?])\s+/))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const o of obj.observations) {
    const r = o?.rate;
    if (!r || typeof r.per_1000_words !== "number") continue;

    const countPattern = supportPattern(o.support, o.of);
    const locator = r.counting_rule?.match(/\[measurement:[a-z0-9-]+\]/)?.[0];
    // Several observations legitimately share the same support fraction. Prefer the
    // stable measurement locator or the first N/N sentence can lend one observation's
    // frequency to another.
    const host = (locator && sentences.find((s) => s.includes(locator)))
      ?? sentences.find((s) => countPattern.test(s));
    if (!host) continue;

    const statedBand = FREQUENCY_BANDS.findIndex((b) => host.toLowerCase().includes(b.phrase));
    if (statedBand === -1) continue;

    const perPiece = (r.per_1000_words * meanPieceWords) / 1000;
    const actualBand = FREQUENCY_BANDS.findIndex((b) => b.phrase === frequencyForPerPiece(perPiece));
    if (Math.abs(statedBand - actualBand) >= 2) {
      findings.push({
        id: o.id,
        stated: FREQUENCY_BANDS[statedBand].phrase,
        perPiece: Math.round(perPiece * 100) / 100,
        detail: `${o.id}: prose says "${FREQUENCY_BANDS[statedBand].phrase}" but the stated rate is ${Math.round(perPiece * 100) / 100} per piece`,
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

  if (!SCHEMA_IDS.includes(obj.schema)) {
    err(`schema must be one of ${SCHEMA_IDS.join("|")}, got ${JSON.stringify(obj.schema)}`);
  }
  const v2 = obj.schema === SCHEMA_ID;
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

  const renderKeys = v2 ? RENDER_KEYS_V2 : RENDER_KEYS_V1;
  for (const k of Object.keys(obj)) {
    if (!renderKeys.includes(k)) err(`key not in the output contract: ${k}`);
  }
  for (const k of renderKeys) {
    if (!Object.hasOwn(obj, k)) err(`missing required key: ${k}`);
  }

  if (v2) {
    if (!isText(obj.profile_markdown)) {
      err("profile_markdown must contain the complete Markdown profile");
    } else {
      const embedded = obj.profile_markdown.trim();
      if (markdown.trim() && markdown.trim() !== embedded) {
        err("profile_markdown diverges from the separately supplied Markdown profile");
      }
      // The envelope is canonical. Callers may pass the extracted prose for historical
      // two-fence handling, or pass nothing and let validation materialize it here.
      markdown = obj.profile_markdown;
    }
  }
  if (v2 && (!isInt(obj.corpus_words) || obj.corpus_words < 1)) {
    err("corpus_words must be a positive integer");
  }
  if (v2 && markdown.trim() === "") {
    err("voice-profile/2 render must include its markdown profile");
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

  // Validate coverage before rates: an absent observation is the one legitimate case
  // where an enumerated count may be zero.
  const absenceObservationIds = new Set();
  const coverage = obj.coverage;
  if (v2) {
    if (!Array.isArray(coverage)) {
      err("coverage must be an array");
    } else {
      const seen = new Set();
      for (const [i, c] of coverage.entries()) {
        const at = `coverage[${i}]`;
        if (!c || typeof c !== "object" || Array.isArray(c)) {
          err(`${at} is not an object`);
          continue;
        }
        const allowed = c.status === "unresolved"
          ? ["dimension", "status", "unresolved_reason"]
          : c.status === "absent-paired"
            ? ["dimension", "status", "observation_ids", "positive_observation_id", "absence_observation_id"]
            : ["dimension", "status", "observation_ids"];
        for (const k of Object.keys(c)) {
          if (!allowed.includes(k)) err(`${at} has key not in contract: ${k}`);
        }
        if (!COVERAGE_DIMENSIONS.includes(c.dimension)) {
          err(`${at}.dimension ${JSON.stringify(c.dimension)} is not a fixed coverage dimension`);
        } else if (seen.has(c.dimension)) {
          err(`${at}.dimension is duplicated: ${c.dimension}`);
        } else {
          seen.add(c.dimension);
        }
        if (!COVERAGE_STATUSES.includes(c.status)) {
          err(`${at}.status must be one of ${COVERAGE_STATUSES.join("|")}`);
          continue;
        }
        if (c.status === "unresolved") {
          if (!isText(c.unresolved_reason)) err(`${at}.unresolved_reason must explain why the dimension is unresolved`);
          continue;
        }
        if (!Array.isArray(c.observation_ids) || c.observation_ids.length === 0 || !c.observation_ids.every(isStr)) {
          err(`${at}.observation_ids must be a non-empty array of observation ids`);
        } else if (new Set(c.observation_ids).size !== c.observation_ids.length) {
          err(`${at}.observation_ids contains duplicates`);
        }
        if (c.status === "absent-paired") {
          if (!isStr(c.positive_observation_id) || !c.observation_ids?.includes(c.positive_observation_id)) {
            err(`${at}.positive_observation_id must name one of observation_ids`);
          }
          if (!isStr(c.absence_observation_id) || !c.observation_ids?.includes(c.absence_observation_id)) {
            err(`${at}.absence_observation_id must name one of observation_ids`);
          } else {
            absenceObservationIds.add(c.absence_observation_id);
          }
          if (c.positive_observation_id === c.absence_observation_id) {
            err(`${at} must use different observations for the positive habit and its absence`);
          }
        }
      }
      for (const dimension of COVERAGE_DIMENSIONS) {
        if (!seen.has(dimension)) err(`coverage silently omits required dimension: ${dimension}`);
      }
      if (coverage.length !== COVERAGE_DIMENSIONS.length) {
        err(`coverage must contain exactly ${COVERAGE_DIMENSIONS.length} dimensions`);
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
        if (!["id", "section", "support", "of", "rate"].includes(k)) err(`${at} has key not in contract: ${k}`);
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

      // OPTIONAL, and optional on purpose. Most observations in a profile describe
      // something no count can express - how a figure is built, what a close does with
      // the opponent's word. Requiring a rate everywhere would force the renderer to
      // invent numbers for things that do not have them, which is the failure this
      // whole primitive is arranged against.
      //
      // But where a habit CAN be counted by pointing at instances, the count is the
      // only form a drafter can act on. `9/10 samples, several times per piece` cannot
      // tell a 700-word draft how many times to do something the author does 2.6 times
      // in 1755 words. That gap is what produced FU-17's overshoot.
      if (o.rate !== undefined) {
        const r = o.rate;
        if (!r || typeof r !== "object" || Array.isArray(r)) {
          err(`${at}.rate must be an object`);
        } else {
          const rateKeys = v2 ? ["count", "per_1000_words", "counting_rule"] : ["count", "per_1000_words"];
          for (const k of Object.keys(r)) {
            if (!rateKeys.includes(k)) err(`${at}.rate has key not in contract: ${k}`);
          }
          if (!isInt(r.count)) err(`${at}.rate.count must be an integer`);
          const isAbsence = absenceObservationIds.has(o.id);
          if (typeof r.per_1000_words !== "number" || !Number.isFinite(r.per_1000_words)
              || (isAbsence ? r.per_1000_words < 0 : r.per_1000_words <= 0)) {
            err(`${at}.rate.per_1000_words must be ${isAbsence ? "a non-negative" : "a positive"} number`);
          }
          // An observation supported by n samples cannot have fewer than n instances.
          //
          // This subsumes the zero check that used to sit above it: `support` is already
          // required to be >= 1, so a count of zero always fails here. The separate
          // `count >= 1` test was dead - a mutation removing it killed nothing, which is
          // how it was found. One assertion, not two overlapping ones.
          if (isInt(r.count) && !isAbsence && isInt(o.support) && r.count < o.support) {
            err(`${at}.rate.count is ${r.count} but the habit is claimed in ${o.support} samples (a count of zero is an absence, not a habit)`);
          }
          if (isInt(r.count) && isAbsence && r.count < 0) {
            err(`${at}.rate.count must be a non-negative integer for an absence`);
          }
          if (v2 && !isText(r.counting_rule)) {
            err(`${at}.rate.counting_rule must be a reproducible non-empty rule`);
          } else if (v2) {
            // A deterministic analyzer locator is stronger than byte-copying a long
            // prose rule. The renderer may grammatically introduce the rule, but the
            // stable marker must occur in both artefacts so the independent counter can
            // be resolved without guessing. Hand-counted rules have no marker and retain
            // the stricter historical byte-location check.
            const locator = r.counting_rule.match(/\[measurement:[a-z0-9-]+\]/)?.[0] ?? r.counting_rule;
            if (!markdown.includes(locator)) err(`${at}.rate.counting_rule is unlocatable in the profile prose`);
          }
          if (v2 && isInt(r.count) && typeof r.per_1000_words === "number"
              && Number.isFinite(r.per_1000_words) && isInt(obj.corpus_words) && obj.corpus_words > 0) {
            const expected = (r.count / obj.corpus_words) * 1000;
            if (Math.abs(r.per_1000_words - expected) > Math.max(0.01, expected * 0.005)) {
              err(`${at}.rate arithmetic is invalid: ${r.count} occurrences over ${obj.corpus_words} words is ${Math.round(expected * 100) / 100} per 1000 words`);
            }
          }
        }
      }
    }

    // The prose and the json must agree. Cheap to check, and the failure it catches
    // — a count edited in one place — is invisible to a reader of either alone.
    if (markdown) {
      for (const [i, o] of obs.entries()) {
        if (!isInt(o.support) || !isInt(o.of)) continue;
        const pattern = supportPattern(o.support, o.of);
        if (!pattern.test(markdown)) {
          err(`observations[${i}] claims ${o.support}/${o.of}, which appears nowhere in the profile prose`);
        }
      }
    }

    if (v2 && Array.isArray(coverage)) {
      const ids = new Set(obs.filter((o) => o && typeof o === "object" && isStr(o.id)).map((o) => o.id));
      const byId = new Map(obs.filter((o) => o && typeof o === "object" && isStr(o.id)).map((o) => [o.id, o]));
      for (const [i, c] of coverage.entries()) {
        if (!c || typeof c !== "object" || !Array.isArray(c.observation_ids)) continue;
        for (const id of c.observation_ids) {
          if (!ids.has(id)) err(`coverage[${i}] has dangling observation reference: ${id}`);
        }
        if (c.status === "rated" && !c.observation_ids.some((id) => byId.get(id)?.rate)) {
          err(`coverage[${i}] is rated but none of its observations carries a rate`);
        }
        if (c.status === "described" && c.observation_ids.some((id) => byId.get(id)?.rate)) {
          err(`coverage[${i}] is described but references a rated observation`);
        }
        if (c.status === "absent-paired") {
          if (!byId.get(c.positive_observation_id)?.rate) {
            err(`coverage[${i}] positive replacement must carry a counted rate`);
          }
          if (!byId.get(c.absence_observation_id)?.rate) {
            err(`coverage[${i}] absence must carry a counted rate`);
          }
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

/** Parse historical two-fence renders and the self-contained voice-profile/2 envelope. */
export function parseRender(text) {
  const f = parseFences(text);
  if (f.markdown?.includes(PROFILE_MARKER) || f.markdown?.includes(RECORD_MARKER)) {
    const profileAt = f.markdown.indexOf(PROFILE_MARKER);
    const recordAt = f.markdown.indexOf(RECORD_MARKER);
    if (profileAt !== 0 || recordAt <= PROFILE_MARKER.length) {
      return {
        markdown: "", json: null,
        jsonError: "voice-profile/2 envelope markers are missing, duplicated, or out of order",
        hadMarkdownFence: f.hadMarkdown, hadJsonFence: f.hadJson,
      };
    }
    const markdown = f.markdown.slice(PROFILE_MARKER.length, recordAt).trim();
    const recordText = f.markdown.slice(recordAt + RECORD_MARKER.length).trim();
    try {
      const record = JSON.parse(recordText);
      if (Object.hasOwn(record, "profile_markdown")) {
        throw new Error("embedded record must not duplicate profile_markdown");
      }
      return {
        markdown,
        json: { ...record, profile_markdown: markdown },
        jsonError: null,
        hadMarkdownFence: f.hadMarkdown,
        hadJsonFence: f.hadJson,
      };
    } catch (error) {
      return {
        markdown, json: null, jsonError: `voice-profile/2 embedded record is invalid JSON: ${error.message}`,
        hadMarkdownFence: f.hadMarkdown, hadJsonFence: f.hadJson,
      };
    }
  }
  const embedded = f.json?.schema === SCHEMA_ID && isText(f.json?.profile_markdown)
    ? f.json.profile_markdown
    : null;
  return {
    markdown: f.markdown ?? embedded ?? "",
    json: f.json,
    jsonError: f.jsonError,
    hadMarkdownFence: f.hadMarkdown,
    hadJsonFence: f.hadJson,
  };
}

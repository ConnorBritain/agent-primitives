#!/usr/bin/env node
/**
 * exemplars — choose what the drafter is allowed to read as style input.
 *
 *   node exemplars.mjs <profile-dir> [--target-words 800] [--n 3] [--json]
 *
 * This is the gate on the one channel that can quietly poison a voice. What the
 * drafter sees as "how this person writes" becomes what it writes, so the
 * selection rules matter more than the drafting prompt does.
 *
 * FOUR RULES, and the last two are the ones with teeth.
 *
 * 1. WHOLE FILES, NEVER EXCERPTS. A paragraph lifted out of a piece teaches the
 *    wrong thing: it shows a rhythm without showing what the rhythm was
 *    responding to. Length matching picks which whole samples to show, and never
 *    licenses cutting one down.
 *
 * 2. NEVER THE CATALOG. This tool does not read catalog.json and must not learn
 *    to. Prose optimised against a tell list scores zero and reads like nobody
 *    wrote it, which is the failure the catalog exists to DETECT, reproduced by
 *    the tool meant to prevent it. See bundles/prose-author/DESIGN.md.
 *
 * 3. HUMAN KEEPS THE MAJORITY, ALWAYS. Approved model drafts may fill at most
 *    `cap` of the exemplar slots. The cap is clamped below 0.5 in code, not in
 *    config, because a corpus where the model is the majority voice is not a
 *    setting anyone means to choose.
 *
 * 4. APPROVED SAMPLES SUPPLEMENT; THEY NEVER BOOTSTRAP. Below CORPUS_MINIMUM
 *    human samples they contribute ZERO. Otherwise the cold-start path is: fill
 *    the folder with model output, draft against model norms on day one, and
 *    never find out.
 *
 * WHY A COUNT CAP IS NOT ENOUGH, stated here because the number looks
 * reassuring and is not. Approved generations are less varied than human ones
 * twice over: the model already regressed to a mode, and the author then picked
 * the ones they liked. So 20% of slots is more than 20% of influence. The cap is
 * a floor on safety, not a guarantee of it, and that is why rule 4 exists and
 * why cadence bands never see these files at all (PROFILES.md rule 3).
 */

import { readFileSync, readdirSync, existsSync, statSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/** Matches calibrate.mjs. Below this many human samples, nothing else counts. */
export const CORPUS_MINIMUM = 10;

/** PROFILES.md default. Configurable up, but never to or past the clamp. */
export const DEFAULT_CAP = 0.2;

/**
 * Below this, a sample is too short to teach a rhythm. Matches calibrate.mjs.
 *
 * These next three rules are a PORT, not an import, and the distinction is
 * deliberate: importing across the bundle boundary would make prose-author
 * unloadable without prose-tell-scan installed, which is a worse failure than
 * the drift a port risks. The drift is handled instead by a contract test
 * (tests/selftest.mjs) that runs both implementations over the same fixtures
 * and fails when they disagree.
 *
 * PROFILES.md is the contract both sides implement. Change it and change both.
 */
export const MIN_SAMPLE_WORDS = 200;

/**
 * A sample must ATTEST to being human-written, or it does not count.
 *
 * This is the guard against AI-assisted drafts silently becoming the definition
 * of "human", and it was missing from the first version of this file. The
 * consequence was not theoretical: every profile this repo ships contains a
 * placeholder `README.md` explaining how to fill the corpus, and without these
 * checks that README counted as a writing sample. The cold-start refusal never
 * fired, and the drafter would have been handed the scanner's own instructional
 * boilerplate as an example of how this person writes.
 *
 * That is the exact failure DESIGN.md names as the worst available outcome:
 * confident, personal-sounding, and about nobody.
 */
export function attested(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!m) return { ok: false, reason: "no frontmatter block" };
  const field = (name) => {
    const hit = m[1].match(new RegExp(`^\\s*${name}\\s*:\\s*(.+?)\\s*$`, "m"));
    return hit ? hit[1].replace(/^["']|["']$/g, "") : null;
  };
  const human = field("human_authored");
  if (human === null) return { ok: false, reason: "no human_authored field" };
  if (!/^(true|yes)$/i.test(human)) return { ok: false, reason: `human_authored is "${human}"` };
  if (!field("source")) return { ok: false, reason: "no source field" };
  if (!field("date")) return { ok: false, reason: "no date field" };
  return { ok: true, body: text.slice(m[0].length) };
}

/**
 * Hard ceiling on the approved share, enforced in code rather than config.
 *
 * A config file that can express "the model is 80% of my voice" will eventually
 * be set that way by someone who has stopped thinking about it. This is the
 * value that cannot be argued with at 2am.
 */
export const CAP_CLAMP = 0.5;

/** README files are scaffolding, never samples. Matches calibrate.mjs. */
const isReadme = (name) => /^readme\b/i.test(name);
const isText = (name) => name.endsWith(".txt") || name.endsWith(".md");

function readSamples(dir, { requireAttestation }) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return { usable: [], excluded: [] };
  const usable = [];
  const excluded = [];

  const take = (path, group) => {
    const raw = readFileSync(path, "utf8");
    const file = path.split("/").pop();
    if (requireAttestation) {
      const a = attested(raw);
      if (!a.ok) {
        excluded.push({ file, reason: a.reason });
        return;
      }
    }
    const s = load(path, group, raw);
    if (s.words < MIN_SAMPLE_WORDS) {
      excluded.push({ file, reason: `too short (${s.words} words)` });
      return;
    }
    usable.push(s);
  };

  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // A group: a voice the author named inside this register.
      for (const inner of readdirSync(path).sort()) {
        if (!isText(inner) || isReadme(inner)) continue;
        take(join(path, inner), name);
      }
      continue;
    }
    if (!isText(name) || isReadme(name)) continue;
    take(path, null);
  }
  return { usable, excluded };
}

function load(path, group, raw) {
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
  const fm = raw.startsWith("---\n") ? raw.slice(4, raw.indexOf("\n---\n", 3)) : "";
  const field = (k) => {
    const m = fm.match(new RegExp(`^${k}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : null;
  };
  const editFraction = Number.parseFloat(field("edit_fraction"));
  return {
    path,
    file: path.split("/").pop(),
    group,
    words: body.split(/\s+/).filter(Boolean).length,
    // Never trusted from an approved sample: PROFILES.md requires this be
    // COMPUTED by ingest from a diff against the kept original. A number an
    // author declares about their own contribution drifts upward.
    editFraction: Number.isFinite(editFraction) ? editFraction : null,
    provenance: field("provenance"),
  };
}

/**
 * Pick exemplars for one drafting job.
 *
 * Returns the chosen samples plus a `refusal` when the corpus cannot support the
 * request. A refusal is a first-class result here, not an exception: the caller
 * has to be able to say WHY it will not compare, and "no corpus" is the most
 * common reason it should not.
 */
export function selectExemplars(profileDir, { targetWords = 800, n = 3, cap = DEFAULT_CAP } = {}) {
  const humanDir = join(profileDir, "corpus", "human");
  const approvedDir = join(profileDir, "corpus", "approved");

  // Human samples must ATTEST. Approved drafts carry `human_authored: false` by
  // definition, so the same check would exclude all of them; they are gated by
  // the cap and the corpus minimum instead.
  const { usable: human, excluded: humanExcluded } = readSamples(humanDir, { requireAttestation: true });
  if (!human.length) {
    const why = humanExcluded.length
      ? ` ${humanExcluded.length} file(s) were found and excluded: `
        + `${humanExcluded.slice(0, 4).map((e) => `${e.file} (${e.reason})`).join(", ")}.`
      : "";
    return {
      refusal: "no-corpus",
      message:
        `No usable human samples in ${humanDir}.${why} Without them there is no `
        + "measurement of how you write, and exemplars drawn from anywhere else "
        + "would be someone else's voice wearing your name.",
      excluded: humanExcluded,
      exemplars: [],
    };
  }

  const effectiveCap = Math.min(Math.max(cap, 0), CAP_CLAMP - Number.EPSILON);
  const approvedAllowed = human.length >= CORPUS_MINIMUM;
  const approved = approvedAllowed
    ? readSamples(approvedDir, { requireAttestation: false }).usable
    : [];

  // Rule 3: approved may fill at most `cap` of the slots, rounded DOWN. At n=3
  // and cap=0.2 that is zero, which is the right answer - it takes a larger
  // request before a model draft earns a slot at all.
  const approvedSlots = Math.min(approved.length, Math.floor(n * effectiveCap));
  const humanSlots = n - approvedSlots;

  const byProximity = (list) =>
    [...list].sort((a, b) => Math.abs(a.words - targetWords) - Math.abs(b.words - targetWords));

  // Approved samples are ordered by how much of them is actually the author.
  // A generation approved untouched is worth approximately nothing as evidence
  // about a person, and sorts last on its own.
  const byEdit = (list) =>
    [...list].sort((a, b) => (b.editFraction ?? 0) - (a.editFraction ?? 0));

  const chosen = [
    ...byProximity(human).slice(0, humanSlots).map((s) => ({ ...s, origin: "human" })),
    ...byEdit(approved).slice(0, approvedSlots).map((s) => ({ ...s, origin: "approved" })),
  ];

  return {
    refusal: null,
    exemplars: chosen,
    excluded: humanExcluded,
    accounting: {
      human_available: human.length,
      approved_available: approved.length,
      approved_suppressed: !approvedAllowed && existsSync(approvedDir),
      corpus_minimum: CORPUS_MINIMUM,
      cap_requested: cap,
      cap_applied: effectiveCap,
      cap_clamp: CAP_CLAMP,
      human_slots: humanSlots,
      approved_slots: approvedSlots,
      // Surfaced because the arithmetic surprises people: floor(n x cap) is 0
      // for every n below 1/cap. At the documented default (n=3, cap=0.2) that
      // is floor(0.6) = 0, so approved drafts get NO slot at all until a larger
      // exemplar set is requested. That is the intended direction - the cap is a
      // ceiling, not a quota - but it is silent unless the tool says it.
      approved_zero_by_arithmetic: approvedAllowed && approved.length > 0 && approvedSlots === 0,
    },
  };
}

export function renderExemplars(result, profileDir) {
  const out = [""];
  if (result.refusal) {
    out.push(`  cannot select exemplars — ${result.refusal}`, "");
    out.push(`  ${result.message}`, "");
    return out.join("\n");
  }
  const a = result.accounting;
  out.push(`  exemplars for ${profileDir}`, "");
  for (const e of result.exemplars) {
    const tag = e.origin === "human"
      ? "human"
      : `approved (edit_fraction ${e.editFraction ?? "?"})`;
    out.push(`    ${e.file.padEnd(38)} ${String(e.words).padStart(6)}w  ${tag}`);
  }
  out.push("");
  out.push(`  human ${a.human_slots} / approved ${a.approved_slots}  ·  cap ${a.cap_applied} (clamped below ${a.cap_clamp})`);
  if (a.approved_zero_by_arithmetic) {
    out.push("");
    out.push(`  corpus/approved/ has ${a.approved_available} sample(s) and contributed 0 slots:`);
    out.push(`  floor(${a.human_slots + a.approved_slots} x ${a.cap_applied}) = 0. The cap is a ceiling, not a`);
    out.push("  quota, so approved drafts earn a slot only on larger exemplar sets.");
  }
  if (a.approved_suppressed) {
    out.push("");
    out.push(`  corpus/approved/ exists and contributed NOTHING: ${a.human_available} human`);
    out.push(`  samples is below the minimum of ${a.corpus_minimum}. Approved drafts`);
    out.push("  supplement a corpus; they never bootstrap one.");
  }
  out.push("");
  return out.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const profileDir = args.find((a) => !a.startsWith("--"));
  if (!profileDir) {
    process.stderr.write("exemplars: usage: node exemplars.mjs <profile-dir> [--target-words N] [--n N] [--json]\n");
    process.exit(2);
  }
  const num = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i === -1 ? dflt : Number(args[i + 1]);
  };
  const result = selectExemplars(profileDir, {
    targetWords: num("--target-words", 800),
    n: num("--n", 3),
    cap: num("--cap", DEFAULT_CAP),
  });
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderExemplars(result, profileDir)}\n`);
  }
  process.exit(result.refusal ? 1 : 0);
}

// Run only when invoked directly.
//
// The obvious form - comparing import.meta.url to `file://${process.argv[1]}` -
// silently does nothing when the path contains a symlink, because import.meta.url
// is fully resolved and argv[1] is not. On macOS /tmp is a symlink to /private/tmp,
// so any install under a temp dir exited 0 having printed nothing, which reads as
// success. Resolve both sides.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();

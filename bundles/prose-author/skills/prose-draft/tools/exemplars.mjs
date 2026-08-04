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

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** Matches calibrate.mjs. Below this many human samples, nothing else counts. */
export const CORPUS_MINIMUM = 10;

/** PROFILES.md default. Configurable up, but never to or past the clamp. */
export const DEFAULT_CAP = 0.2;

/**
 * Hard ceiling on the approved share, enforced in code rather than config.
 *
 * A config file that can express "the model is 80% of my voice" will eventually
 * be set that way by someone who has stopped thinking about it. This is the
 * value that cannot be argued with at 2am.
 */
export const CAP_CLAMP = 0.5;

function readSamples(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      // A group: a voice the author named inside this register.
      for (const inner of readdirSync(path).sort()) {
        if (!inner.endsWith(".txt") && !inner.endsWith(".md")) continue;
        out.push(load(join(path, inner), name));
      }
      continue;
    }
    if (!name.endsWith(".txt") && !name.endsWith(".md")) continue;
    out.push(load(path, null));
  }
  return out;
}

function load(path, group) {
  const raw = readFileSync(path, "utf8");
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

  const human = readSamples(humanDir);
  if (!human.length) {
    return {
      refusal: "no-corpus",
      message:
        `No human samples in ${humanDir}. Without them there is no measurement of `
        + "how you write, and exemplars drawn from anywhere else would be someone "
        + "else's voice wearing your name.",
      exemplars: [],
    };
  }

  const effectiveCap = Math.min(Math.max(cap, 0), CAP_CLAMP - Number.EPSILON);
  const approvedAllowed = human.length >= CORPUS_MINIMUM;
  const approved = approvedAllowed ? readSamples(approvedDir) : [];

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

if (import.meta.url === `file://${process.argv[1]}`) main();

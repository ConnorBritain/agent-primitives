#!/usr/bin/env node
/**
 * ingest-edit — record a kept generation with its measured edit_fraction.
 *
 *   node ingest-edit.mjs <edited> --original <path> --profile <name>
 *                                 [--profiles-dir <dir>] [--project <dir>]
 *                                 [--model <id>] [--force] [--json]
 *
 * The correction channel. When the drafter produces something and the author
 * edits it into shape, the pair - original and edit - is the most concentrated
 * evidence about that person's voice that exists: a correction in context. This
 * writes the edited version into corpus/approved/ under the discipline
 * PROFILES.md defines.
 *
 * ONE RULE THAT MATTERS AND IS WORTH RESTATING: `edit_fraction` is computed
 * here from a diff of the two files. It is never a flag, never a frontmatter
 * value carried in from the caller, never trusted from the edited file. The
 * design precedent is --attest in the scanner: an author's claim about how
 * human a sample is cannot be verified, so it is stated deliberately and
 * accepted as a claim. This one IS verifiable, so it is verified. A number
 * nobody can check does not go in a file that decides thresholds.
 *
 * THREE REFUSALS, each guarding a distinct failure mode.
 *
 * A. Not enough of it is yours. Below INGEST_FLOOR (10%) the sample teaches the
 *    drafter to reproduce its own output. That is exactly the "converges on the
 *    model's register" failure DESIGN.md warns about, and the cheapest place to
 *    catch it is at ingest.
 *
 * B. Not enough sample. Below MIN_SAMPLE_WORDS calibration would exclude it
 *    anyway, so recording it as "approved" would be misleading storage - a file
 *    that looks like evidence and never counts as any.
 *
 * C. The original does not match. If sha256(<original file>) does not equal the
 *    hash inside the edited file's frontmatter's `original: .originals/<sha>.txt`
 *    field, someone has been rearranging files by hand and the pair no longer
 *    describes a real edit. Refuse rather than record a fiction.
 *
 * WHERE THINGS LAND. Under the target profile:
 *
 *   corpus/approved/<yyyymmdd>-<shorthash>.txt   the edited draft + frontmatter
 *   corpus/approved/.originals/<sha256>.txt      the pre-edit generation
 *
 * The stored original has no frontmatter and is content-addressed, so identical
 * generations share one file. It is never read for style; it exists solely so
 * next time's ingest can re-verify the diff.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";

import { MIN_SAMPLE_WORDS } from "./exemplars.mjs";

/**
 * Below this, "you barely touched it" - and recording it as evidence about your
 * voice teaches the drafter to reproduce its own output. Chosen deliberately
 * high enough that a typo pass does not become a corpus sample: the cost of
 * false positives here is silent voice collapse over many rounds.
 */
export const INGEST_FLOOR = 0.10;

/**
 * Word-level Longest Common Subsequence. Standard DP, O(n*m). For prose
 * fragments up to a few thousand words this finishes instantly.
 *
 * WHY LCS AND NOT SET-INTERSECTION. A draft that keeps every word of the
 * original but reorders them has the same set - and is not the same edit.
 * Prose is a sequence; the measurement has to respect order or it lies in the
 * direction that flatters "you rewrote a lot".
 */
export function lcsLength(a, b) {
  if (!a.length || !b.length) return 0;
  const m = a.length;
  const n = b.length;
  // Two-row rolling table. Keeping the full m*n grid would use ~30 MB on a
  // 2000x2000 comparison and add nothing.
  let prev = new Uint32Array(n + 1);
  let curr = new Uint32Array(n + 1);
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return prev[n];
}

/**
 * The single measurement this file exists to produce.
 *
 * edit_fraction = (words in EDITED that are new to it) / (words in edited)
 *
 * Bounded [0, 1]. An untouched generation lands near 0; a completely rewritten
 * one lands near 1; a rewrite that shortens by half but keeps the same words
 * lands near 0. This matches PROFILES.md's "one you rewrote two thirds of
 * contributes about two thirds of a human sample" exactly - the direction and
 * the reason - and it does so without needing anyone to explain what "diff"
 * meant in that sentence.
 */
export function editFraction(original, edited) {
  const a = tokens(original);
  const b = tokens(edited);
  if (b.length === 0) return 0;
  const lcs = lcsLength(a, b);
  return round((b.length - lcs) / b.length, 4);
}

/** Body words only. Frontmatter is metadata, not prose the author wrote. */
export function tokens(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  return body.split(/\s+/).filter(Boolean);
}

function round(n, places) {
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * yyyymmdd, in local time. Deliberately not ISO with a timezone: this appears
 * in a filename and in frontmatter, and a filename that changes when you move
 * timezones is a filename that breaks reproducibility for a decorative reason.
 */
function today(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function frontmatterBlock({ date, provenance, model, originalRel, editFraction: ef }) {
  return [
    "---",
    "source: prose-author draft",
    `date: ${date}`,
    "human_authored: false",
    `provenance: ${provenance}`,
    `model: ${model || "unknown"}`,
    `original: ${originalRel}`,
    `edit_fraction: ${ef}`,
    "---",
    "",
  ].join("\n");
}

/** Determine the profile directory the way exemplars.mjs and scan.mjs do. */
export function resolveProfileDir({ profile, profilesDir, project }) {
  const roots = [
    profilesDir ? resolve(profilesDir) : null,
    project ? resolve(project, ".claude", "humanizer", "profiles") : null,
    resolve(process.cwd(), ".claude", "humanizer", "profiles"),
  ].filter(Boolean);
  for (const root of roots) {
    const dir = join(root, profile);
    if (existsSync(dir) && statSync(dir).isDirectory()) return dir;
  }
  return null;
}

/**
 * The whole pipeline as a pure-ish function, so tests can drive it with in-
 * memory content and the CLI can drive it with paths.
 */
export function planIngest({ original, edited, profileDir, model, now = new Date(), force = false }) {
  // Body-only word count for the floor. Frontmatter would inflate it.
  const editedWords = tokens(edited).length;
  if (editedWords < MIN_SAMPLE_WORDS) {
    return { refusal: "too-short", reason: `edited draft has ${editedWords} words; minimum is ${MIN_SAMPLE_WORDS}` };
  }

  const ef = editFraction(original, edited);
  if (ef < INGEST_FLOOR) {
    return {
      refusal: "trivial-edit",
      editFraction: ef,
      reason:
        `edit_fraction is ${ef}, below the ${INGEST_FLOOR} floor. Recording this `
        + "would teach the drafter to reproduce its own output. If you kept it "
        + "unchanged because it was already right, that is not evidence about "
        + "your voice - it is evidence the drafter got lucky.",
    };
  }

  const originalHash = sha256(original);
  const editedHash = sha256(edited).slice(0, 8);
  const originalRel = `.originals/${originalHash}.txt`;
  const sampleName = `${today(now)}-${editedHash}.txt`;

  const originalPath = join(profileDir, "corpus", "approved", ".originals", `${originalHash}.txt`);
  const samplePath = join(profileDir, "corpus", "approved", sampleName);

  // Refuse to clobber. An accidental double-ingest is silent otherwise, and the
  // second copy would carry an updated `date` while claiming the same edit -
  // exactly the kind of drift the whole design is built to notice.
  if (existsSync(samplePath) && !force) {
    return {
      refusal: "already-exists",
      path: samplePath,
      reason: `${sampleName} already exists. Re-ingesting silently would change its date. Pass --force if that is what you meant.`,
    };
  }

  const frontmatter = frontmatterBlock({
    date: today(now),
    provenance: "model-drafted-human-edited",
    model,
    originalRel,
    editFraction: ef,
  });

  return {
    refusal: null,
    editFraction: ef,
    originalPath,
    samplePath,
    // The final file, ready to write. The caller writes; the planner does not,
    // so tests can inspect what would happen without side effects.
    write: () => {
      mkdirSync(dirname(originalPath), { recursive: true });
      mkdirSync(dirname(samplePath), { recursive: true });
      // Content-addressed: if the same original has been ingested before, this
      // is a re-write of an identical file.
      writeFileSync(originalPath, original);
      writeFileSync(samplePath, frontmatter + edited.replace(/^---\n[\s\S]*?\n---\n/, ""));
    },
  };
}

export function renderPlan(plan, { profileDir } = {}) {
  const out = [""];
  if (plan.refusal) {
    out.push(`  cannot ingest — ${plan.refusal}`, "");
    out.push(`  ${plan.reason}`, "");
    return out.join("\n");
  }
  out.push(`  ingested into ${profileDir || plan.samplePath}`, "");
  out.push(`    ${plan.samplePath.split("/").pop().padEnd(30)} edit_fraction ${plan.editFraction}`);
  out.push(`    ${plan.originalPath.split("/").slice(-2).join("/")}`);
  out.push("");
  out.push(`  This sample contributes AT MOST ${plan.editFraction} of a human sample's weight to calibration,`);
  out.push("  and only once the human corpus has reached its minimum. Cadence bands never");
  out.push("  see it.");
  out.push("");
  return out.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const edited = args.find((a) => !a.startsWith("--"));
  const val = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? undefined : args[i + 1];
  };
  const profile = val("--profile");
  const originalPath = val("--original");

  if (!edited || !profile || !originalPath) {
    process.stderr.write(
      "ingest-edit: usage: node ingest-edit.mjs <edited> --original <path> --profile <name>\n"
      + "                                      [--profiles-dir <dir>] [--project <dir>]\n"
      + "                                      [--model <id>] [--force] [--json]\n",
    );
    process.exit(2);
  }
  if (!existsSync(edited)) { process.stderr.write(`ingest-edit: not found: ${edited}\n`); process.exit(2); }
  if (!existsSync(originalPath)) { process.stderr.write(`ingest-edit: not found: ${originalPath}\n`); process.exit(2); }

  const profileDir = resolveProfileDir({
    profile, profilesDir: val("--profiles-dir"), project: val("--project"),
  });
  if (!profileDir) {
    process.stderr.write(`ingest-edit: profile not found: ${profile}\n`);
    process.exit(2);
  }

  const plan = planIngest({
    original: readFileSync(originalPath, "utf8"),
    edited: readFileSync(edited, "utf8"),
    profileDir,
    model: val("--model"),
    force: args.includes("--force"),
  });

  if (args.includes("--json")) {
    // The write closure cannot be serialised; strip it.
    const { write, ...serial } = plan;
    process.stdout.write(`${JSON.stringify(serial, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderPlan(plan, { profileDir })}\n`);
  }

  if (plan.refusal) process.exit(1);
  plan.write();
  process.exit(0);
}

// Same guard as exemplars.mjs / verify.mjs, and for the same reason: without it
// importing this module runs the CLI. See CALIBRATION.md FN-2026-08-04-i.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();

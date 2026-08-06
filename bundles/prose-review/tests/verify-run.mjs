#!/usr/bin/env node
/**
 * verify-run — re-derive a harness run's headline numbers from its transcripts.
 *
 *   node tests/verify-run.mjs runs/2026-08-04-b
 *
 * WHY THIS EXISTS. `critic-harness.md` requires verbatim transcripts because a
 * summary table is the reporter grading their own transcript. Checking the
 * transcripts in fixes who can see the evidence. It does not fix who did the
 * counting — a summary can still say "0 of 12" over a directory that says
 * something else, and nobody would notice.
 *
 * This is the same lesson the project has now learned seven times and logged in
 * CALIBRATION.md: a number needs a method anyone can re-run, and the method
 * needs reading too. So the run's numbers are computed here, from the files, and
 * the summary quotes this output rather than the other way round.
 *
 * The contract counts are the point. For each critic they must be zero, and
 * either being non-zero blocks the primitive regardless of how well it scored —
 * so those exit non-zero rather than printing a warning.
 *
 * TWO CRITICS NOW, AND THE VERDICT VOCABULARY IS PER-CRITIC. An earlier version
 * hardcoded CLEAN|REVISE. Adding a second critic by loosening that regex to
 * "any word" would have made a typo'd verdict parse as a valid one, so the
 * vocabularies are enumerated per critic instead, and a run directory must be
 * homogeneous: two critics' transcripts in one directory would share a
 * denominator that means nothing.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { scanFidelity, verdict as scanVerdict } from "../tools/fidelity-scan.mjs";

/**
 * Per-critic profile. `clean` is the verdict that means "nothing to report" and
 * `flag` the one that means "something was found"; `contract` lists the counts
 * that must be zero for the primitive to ship at all.
 *
 * `labels` exist so this file can serve both critics without either one's
 * published output changing wording. The voice-critic rows are quoted verbatim
 * in critic-harness.md and in a checked-in run log.
 */
const CRITICS = {
  voice: {
    clean: "CLEAN",
    flag: "REVISE",
    contract: ["uncited", "authorship_claims"],
    labels: {
      negative: "negative (leave-one-out, n=%N%):  ",
      positive: "positive (AI drafts, n=%N%):       ",
      uncited: "findings without corpus citation: %V%          <- must be 0",
      authorship_claims: "any claim about machine authorship: %V%        <- must be 0",
    },
  },
  fidelity: {
    clean: "FAITHFUL",
    flag: "MATERIAL-LOSS",
    contract: ["uncited", "contradicts_scan"],
    labels: {
      negative: "negative (faithful revisions, n=%N%):    ",
      positive: "positive (lossy revisions, n=%N%):       ",
      uncited: "findings not quoting both original and revision: %V%   <- must be 0",
      contradicts_scan: "claims an atom is present that the scan flagged: %V%   <- must be 0",
    },
    // Fixtures live in tests/fixtures/<critic>/, resolved from the run directory.
    report: (...a) => scannerAgreement(...a),
  },
};

const VERDICTS = Object.fromEntries(
  Object.entries(CRITICS).flatMap(([name, c]) => [[c.clean, name], [c.flag, name]]),
);

const RESULT = /RESULT:\s*([A-Z][A-Z-]*)\s*\|\s*(.+?)\s*$/m;
const KIND = /^#\s+(Negative|Positive)\b/im;

/** `findings=0 | uncited=0 | ...` → an object. A malformed pair yields no key,
 * which then trips the required-key check below rather than defaulting to 0.
 * Defaulting a missing contract count to 0 would flatter the result silently,
 * which is the one direction this file exists to close off. */
function parseFields(rest) {
  const out = {};
  for (const part of rest.split("|")) {
    const m = part.trim().match(/^([a-z_]+)=(\d+)$/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

export function readRun(dir) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort();

  const runs = [];
  const malformed = [];
  const mismatched = [];
  for (const f of files) {
    const text = readFileSync(join(dir, f), "utf8");
    const m = text.match(RESULT);
    if (!m) {
      // A transcript without a RESULT line cannot be counted, and silently
      // skipping it would understate the denominator - which is the direction
      // that flatters the result.
      malformed.push(f);
      continue;
    }

    const critic = VERDICTS[m[1]];
    if (!critic) {
      malformed.push(`${f} (unknown verdict "${m[1]}")`);
      continue;
    }
    const profile = CRITICS[critic];
    const fields = parseFields(m[2]);
    const required = ["findings", ...profile.contract];
    const absent = required.filter((k) => !(k in fields));
    if (absent.length) {
      malformed.push(`${f} (RESULT line missing ${absent.join(", ")})`);
      continue;
    }

    const declared = text.match(KIND);
    if (!declared) {
      malformed.push(`${f} (no "# Negative"/"# Positive" heading)`);
      continue;
    }
    const fromHeading = declared[1].toLowerCase();
    const fromName = f.startsWith("p-") ? "positive" : "negative";
    if (fromHeading !== fromName) {
      mismatched.push(`${f}: heading says ${fromHeading}, filename says ${fromName}`);
      continue;
    }

    runs.push({ file: f, critic, kind: fromHeading, verdict: m[1], ...fields });
  }
  return { runs, malformed, mismatched };
}

export function tally(runs, profile) {
  const of = (kind) => runs.filter((r) => r.kind === kind);
  const count = (list, v) => list.filter((r) => r.verdict === v).length;
  const t = {
    negative: { n: of("negative").length, flagged: count(of("negative"), profile.flag) },
    positive: { n: of("positive").length, flagged: count(of("positive"), profile.flag) },
    findings: runs.reduce((a, r) => a + r.findings, 0),
  };
  for (const k of profile.contract) t[k] = runs.reduce((a, r) => a + r[k], 0);
  return t;
}

/**
 * Fidelity only. The argument for this critic existing is that it DISAGREES with
 * `fidelity-scan` in both directions - clearing atoms the scan over-flagged, and
 * catching losses the scan is structurally blind to. A critic whose verdict
 * always matched the scanner would be an expensive wrapper around a regex.
 *
 * So the scan verdict is re-derived HERE from the fixture files, not read from
 * the transcript. A self-reported disagreement rate is the reporter grading
 * their own transcript again, one level up.
 */
function scannerAgreement(runs, dir, critic, line) {
  const fixturesDir = join(dir, "..", "..", "fixtures", critic);
  if (!existsSync(join(fixturesDir, "fixtures.json"))) return 0;

  const manifest = JSON.parse(readFileSync(join(fixturesDir, "fixtures.json"), "utf8"));
  const byName = new Map(manifest.fixtures.map((f) => [f.name, f]));
  let echo = 0, clearedOverFlag = 0, caughtBlindSpot = 0, correct = 0;
  const unresolved = [], corrected = [];

  for (const r of runs) {
    const name = r.file.replace(/\.md$/, "");
    const f = byName.get(name);
    if (!f) { unresolved.push(r.file); continue; }

    // A fixture whose expected verdict was changed AFTER this run scored against it.
    // The score is then partly a score against an answer the run itself supplied, and
    // a reader has to know that to read the number. Printed rather than left to a
    // sentence in a summary, because sentences in summaries are what CALIBRATION.md
    // is a list of.
    // ONLY when the correction happened after THIS run. `corrected_after_run`
    // names the run whose score was computed against the old expectation; a later
    // run scored against the corrected one and is not caveated by it.
    //
    // The first version tested only that the key was present, so every future run
    // inherited a warning about a correction that predated it. Left alone, that
    // trains readers to skip the block - and this block is the one thing standing
    // between a 12-of-13 and a reader who does not know one answer came from the
    // run itself. A caveat that cries wolf is worse than no caveat.
    if (f.corrected_after_run === basename(resolve(dir))) {
      corrected.push(`${name}: expected ${f.previous_expect} when run, now ${f.expect}`);
    }
    const scan = scanVerdict(scanFidelity(
      readFileSync(join(fixturesDir, name, "original.md"), "utf8"),
      readFileSync(join(fixturesDir, name, "revision.md"), "utf8"),
    ));
    if (r.verdict === f.expect) correct += 1;
    if (r.verdict === scan) echo += 1;
    else if (scan === "MATERIAL-LOSS") clearedOverFlag += 1;
    else caughtBlindSpot += 1;
  }

  const n = runs.length - unresolved.length;
  process.stdout.write("\n");
  line(`verdicts matching the fixture's expected verdict:  ${correct} of ${n}`);
  line(`losses the scan flagged and the critic cleared:    ${clearedOverFlag}`);
  line(`losses the scan missed and the critic caught:      ${caughtBlindSpot}`);
  line(`verdicts identical to fidelity-scan's (echo rate): ${echo} of ${n}`);

  let bad = 0;
  if (corrected.length) {
    process.stdout.write("\n");
    line(`${corrected.length} fixture(s) whose expected verdict was CORRECTED after this run:`);
    for (const c of corrected) line(`  ${c}`);
    line("  Read fixtures.json's correction_note before quoting the score above.");
  }
  if (unresolved.length) {
    // An unresolvable transcript is one whose ground truth nobody can check.
    process.stdout.write(`\n    ${unresolved.length} transcript(s) naming no known fixture: ${unresolved.join(", ")}\n`);
    bad += 1;
  }
  return bad;
}

function main() {
  const dir = process.argv[2];
  if (!dir || !existsSync(dir)) {
    process.stderr.write("verify-run: usage: node tests/verify-run.mjs <run-dir>\n");
    process.exit(2);
  }
  const { runs, malformed, mismatched } = readRun(dir);

  // A directory mixing two critics would sum their findings and share their
  // denominators, producing numbers that describe neither.
  const critics = [...new Set(runs.map((r) => r.critic))];
  if (critics.length > 1) {
    process.stdout.write(`\n  ${dir} — transcripts from more than one critic: ${critics.join(", ")}\n`);
    process.stdout.write("    A run directory holds one critic. Split them.\n\n");
    process.exit(1);
  }
  const critic = critics[0] ?? "voice";
  const profile = CRITICS[critic];
  const t = tally(runs, profile);
  const line = (s) => process.stdout.write(`    ${s}\n`);

  process.stdout.write(`\n  ${dir} — ${runs.length} transcripts\n\n`);
  for (const kind of ["negative", "positive"]) {
    const { n, flagged } = t[kind];
    line(`${profile.labels[kind].replace("%N%", String(n))} ${flagged} ${profile.flag}, ${n - flagged} ${profile.clean}`);
  }
  for (const k of profile.contract) line(profile.labels[k].replace("%V%", String(t[k])));

  // Anything a critic needs beyond the shared counts goes through this hook, so
  // `main` does not grow a branch per critic. `prose-pattern-critic` is next and
  // reads a different deterministic artifact; it gets a `report` of its own rather
  // than another `if` here.
  let bad = profile.report ? profile.report(runs, dir, critic, line) : 0;
  process.stdout.write("\n");

  if (mismatched.length) {
    process.stdout.write(`    ${mismatched.length} transcript(s) whose heading and filename disagree:\n`);
    for (const m of mismatched) process.stdout.write(`      ${m}\n`);
    process.stdout.write("\n");
    bad += 1;
  }
  if (malformed.length) {
    process.stdout.write(`    ${malformed.length} transcript(s) with no RESULT line: ${malformed.join(", ")}\n\n`);
    bad += 1;
  }
  if (profile.contract.some((k) => t[k])) {
    process.stdout.write("    CONTRACT VIOLATION — this blocks the primitive regardless of score.\n\n");
    bad += 1;
  }
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith("verify-run.mjs")) main();

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
 * The two contract counts are the point. `uncited` and `authorship_claims` must
 * both be zero, and either being non-zero blocks the primitive regardless of how
 * well it scored — so those exit non-zero rather than printing a warning.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RESULT = /RESULT:\s*(CLEAN|REVISE)\s*\|\s*findings=(\d+)\s*\|\s*uncited=(\d+)\s*\|\s*authorship_claims=(\d+)/;

/**
 * Each transcript declares its own kind in its heading, and the filename says it
 * again. Both are checked, and a disagreement is an error.
 *
 * An earlier version trusted the `p-` filename prefix alone. A reviewer showed a
 * positive result in a file without the prefix being counted silently as a
 * negative - moving a result between the two headline denominators with nothing
 * in the output to notice. One source of truth for a number this load-bearing is
 * one too few.
 */
const KIND = /^#\s+(Negative|Positive)\b/im;

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

    runs.push({
      file: f,
      kind: fromHeading,
      verdict: m[1],
      findings: Number(m[2]),
      uncited: Number(m[3]),
      authorship: Number(m[4]),
    });
  }
  return { runs, malformed, mismatched };
}

export function tally(runs) {
  const of = (kind) => runs.filter((r) => r.kind === kind);
  const count = (list, v) => list.filter((r) => r.verdict === v).length;
  return {
    negative: { n: of("negative").length, revise: count(of("negative"), "REVISE") },
    positive: { n: of("positive").length, revise: count(of("positive"), "REVISE") },
    findings: runs.reduce((a, r) => a + r.findings, 0),
    uncited: runs.reduce((a, r) => a + r.uncited, 0),
    authorship: runs.reduce((a, r) => a + r.authorship, 0),
  };
}

function main() {
  const dir = process.argv[2];
  if (!dir || !existsSync(dir)) {
    process.stderr.write("verify-run: usage: node tests/verify-run.mjs <run-dir>\n");
    process.exit(2);
  }
  const { runs, malformed, mismatched } = readRun(dir);
  const t = tally(runs);

  process.stdout.write(`\n  ${dir} — ${runs.length} transcripts\n\n`);
  process.stdout.write(`    negative (leave-one-out, n=${t.negative.n}):   ${t.negative.revise} REVISE, ${t.negative.n - t.negative.revise} CLEAN\n`);
  process.stdout.write(`    positive (AI drafts, n=${t.positive.n}):        ${t.positive.revise} REVISE, ${t.positive.n - t.positive.revise} CLEAN\n`);
  process.stdout.write(`    findings without corpus citation: ${t.uncited}          <- must be 0\n`);
  process.stdout.write(`    any claim about machine authorship: ${t.authorship}        <- must be 0\n\n`);

  let bad = 0;
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
  if (t.uncited || t.authorship) {
    process.stdout.write("    CONTRACT VIOLATION — this blocks the primitive regardless of score.\n\n");
    bad += 1;
  }
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith("verify-run.mjs")) main();

/**
 * bar — apply the pre-registered generator ship bar to a run directory.
 *
 * WHY THIS IS CODE AND NOT A HUMAN READING A TALLY.
 *
 * Every bar result in PI-02 so far was scored by hand. That produced two errors that
 * reached committed documents: a stability table that mixed a discarded render into a
 * k=3 comparison, and a rate table built on two regexes that were overcounting. Both were
 * caught late and by accident. A scorer cannot make either mistake, because it reads the
 * artefacts and applies one rule.
 *
 * THE THRESHOLDS ARE NOT ARGUMENTS. They are transcribed from
 * `.planning/2026-08-07-generator-ship-bar.md`, pre-registered 2026-08-07, which states:
 * "Nothing below may be changed after seeing acceptance results." Exposing them as
 * parameters would make them adjustable by whoever runs the scorer, which is exactly the
 * failure the pre-registration exists to prevent. They are constants, and the test suite
 * asserts their values so a silent edit fails a gate.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { summarise } from "./loop.mjs";

/** Bar criterion 1: at least this many of k draws must be CLEAN. Pre-registered. */
export const MAJORITY_VERDICT = "CLEAN";

/** Bar criterion 2: mean findings per draw must not exceed this. Pre-registered, absolute. */
export const MAX_FINDINGS_PER_DRAW = 1.0;

/**
 * Score one draft's draws against the bar.
 *
 * CONJUNCTIVE, and the pre-registration is explicit about why: the rate alone passes a
 * draft that accumulates small problems below the verdict threshold, and the verdict alone
 * is a 2/1 coin flip on borderline drafts. A draft passes only if both hold.
 */
export function scoreDraft(draws) {
  const s = summarise(draws);
  if (s.draws === 0) {
    return { ...s, majorityClean: false, rateOk: false, passes: false, reason: "no draws" };
  }
  const majorityClean = s.majority === MAJORITY_VERDICT;
  // Guard the float compare: a mean of exactly 1.0 PASSES (the pre-registration's
  // calibration recorded a draft passing "exactly at the ceiling"), so this must be <=,
  // and 1.0000000000000002 from summing thirds must not fail it.
  const rateOk = s.findings.mean <= MAX_FINDINGS_PER_DRAW + 1e-9;
  return {
    ...s,
    majorityClean,
    rateOk,
    passes: majorityClean && rateOk,
    reason: majorityClean && rateOk ? "" : [
      majorityClean ? null : `majority ${s.majority}`,
      rateOk ? null : `${s.findings.mean.toFixed(2)} findings/draw`,
    ].filter(Boolean).join(", "),
  };
}

/** The four structural gates. All must hold; none is tradeable against voice quality. */
export const STRUCTURAL_GATES = [
  "fabricated_citations",
  "corpus_leakage",
  "refuses_when_underdetermined",
  "no_resemblance_claims",
];

/**
 * Score a whole run.
 *
 * A structural gate failure fails the RUN, not the draft that carried it. The
 * pre-registration lists them separately from the per-draft bar and says "all must hold,
 * no exceptions" — so a run with five clean drafts and one fabricated citation has not
 * cleared the bar, and reporting it as 5-of-6 would be false.
 */
export function scoreRun(tally) {
  const drafts = (tally.drafts ?? []).map((d) => ({
    id: d.id,
    topic: d.topic ?? "",
    ...scoreDraft((d.verdicts ?? []).map((v, i) => ({ verdict: v, findings: d.findings[i] }))),
  }));
  const structural = tally.structural_gates ?? {};
  const gateFailures = STRUCTURAL_GATES.filter((g) => structural[g] !== "pass");
  const passed = drafts.filter((d) => d.passes).length;
  return {
    drafts,
    passed,
    of: drafts.length,
    gateFailures,
    // A run "clears" only if every draft passes AND every structural gate holds. The
    // per-draft count is reported either way, because a 5-of-6 is informative even when
    // it is not a pass.
    clears: drafts.length > 0 && passed === drafts.length && gateFailures.length === 0,
  };
}

export function loadTally(runDir) {
  const p = join(runDir, "TALLY.json");
  if (!existsSync(p)) throw new Error(`no TALLY.json in ${runDir}`);
  return JSON.parse(readFileSync(p, "utf8"));
}

function main() {
  const dir = process.argv[2];
  if (!dir) { process.stderr.write("usage: bar.mjs <run-dir>\n"); process.exit(2); }
  const r = scoreRun(loadTally(dir));
  process.stdout.write(`\n  bar: majority ${MAJORITY_VERDICT} AND <= ${MAX_FINDINGS_PER_DRAW.toFixed(1)} findings/draw, conjunctive\n\n`);
  for (const d of r.drafts) {
    const mark = d.passes ? "pass" : "FAIL";
    const per = d.findings ? d.findings.per.join(", ") : "-";
    const mean = d.findings ? d.findings.mean.toFixed(2) : "-";
    process.stdout.write(`  ${mark}  ${String(d.id).padEnd(5)} [${per}] mean ${mean} ${d.majority}${d.reason ? "  <- " + d.reason : ""}\n`);
  }
  process.stdout.write(`\n  drafts: ${r.passed} of ${r.of}\n`);
  for (const g of r.gateFailures) process.stdout.write(`  STRUCTURAL GATE FAILED: ${g}\n`);
  process.stdout.write(r.clears ? "\n  BAR CLEARED\n\n" : "\n  BAR NOT CLEARED\n\n");
  process.exit(r.clears ? 0 : 1);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) main();

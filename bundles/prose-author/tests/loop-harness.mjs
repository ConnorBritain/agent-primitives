#!/usr/bin/env node
/**
 * loop-harness — drives the generate → critique → revise loop, and replays a finished
 * one from its own artefacts.
 *
 * Written after a reviewer pointed out that S4's worked run was "a human simulating the
 * loop, not the loop running": a person invoked the two critic harnesses by hand, then
 * read the numbers into `loop.mjs` by inspection. The decisions were real and the
 * artefacts were checked in, but nothing could be re-run, so "the loop runs to
 * completion" was a narrated claim rather than a reproducible one.
 *
 * `replay` fixes exactly that. It recomputes every loop decision from the checked-in
 * artefacts and **exits non-zero if the recomputation disagrees with what the run
 * recorded** — which turns the run doc's numbers into something a suite can assert
 * rather than something a reader has to trust.
 *
 * `status` does the same for a live run and says what the loop wants next.
 *
 * Dispatching is deliberately NOT reimplemented here: `run-harness.mjs` and
 * `revise-harness.mjs` already do it, and this composes them by CLI rather than by
 * importing across a bundle boundary that nothing else in this repo crosses.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { summarise, detectDegradation, attributeToEdits, shouldStop, nextAction } from "./loop.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const die = (m) => { process.stderr.write(`loop-harness: ${m}\n`); process.exit(1); };
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** Everything a decision needs, gathered from one run directory. */
export function loadRun(runDir) {
  const tallyPath = join(runDir, "TALLY.json");
  if (!existsSync(tallyPath)) die(`no TALLY.json in ${runDir}`);
  const tally = readJson(tallyPath);

  const logPath = join(runDir, "raw", "reviser-log.json");
  const draftPath = join(runDir, "inputs", "draft.txt");
  return {
    tally,
    changeLog: existsSync(logPath) ? readJson(logPath) : null,
    original: existsSync(draftPath) ? readFileSync(draftPath, "utf8") : "",
  };
}

const asDraws = (side) => side.findings.map((f, i) => ({ verdict: side.verdicts[i], findings: f }));

/** Recompute every decision. Pure — takes only what loadRun returned. */
export function decide({ tally, changeLog, original }) {
  const draft = asDraws(tally.draft);
  const revision = asDraws(tally.revision);

  const degradation = detectDegradation(draft, revision);
  // The critic's LOCATION line verbatim, not the summary in `what`. Attribution is a
  // text match against what an edit introduced, so a paraphrase here silently produces
  // zero attributions and the run looks clean for the wrong reason. The first replay of
  // the S4 run failed on exactly this.
  const findings = (tally.revision.findings_detail ?? [])
    .map((d) => ({ location: d.location ?? d.what, draw: d.draw }));
  const attributions = attributeToEdits(findings, changeLog, original);
  const action = nextAction({
    history: [summarise(draft), summarise(revision)],
    pendingPlan: changeLog ? { entries: changeLog.edits } : null,
    lastDegradation: degradation,
    attributions,
  });
  const stop = shouldStop([summarise(draft), summarise(revision)]);
  return { draft: summarise(draft), revision: summarise(revision), degradation, attributions, action, stop };
}

/**
 * The recorded expectations a replay must reproduce. Written as a separate function so
 * the comparison is explicit rather than a pile of inline conditionals — and so a
 * mismatch names which claim broke.
 */
export function checkAgainstRecord(d, tally) {
  const rec = tally.decisions ?? {};
  const out = [];
  const cmp = (what, got, want) => {
    if (want === undefined) return;
    out.push({ what, got, want, ok: JSON.stringify(got) === JSON.stringify(want) });
  };
  cmp("detectDegradation.degraded", d.degradation.degraded, rec.detectDegradation?.degraded);
  if (rec.detectDegradation?.delta !== undefined) {
    out.push({
      what: "detectDegradation.delta",
      got: Number(d.degradation.delta.toFixed(2)),
      want: rec.detectDegradation.delta,
      ok: Math.abs(d.degradation.delta - rec.detectDegradation.delta) < 0.005,
    });
  }
  cmp("attributeToEdits.caused", d.attributions.filter((a) => a.causedByEdit).length,
    rec.attributeToEdits?.caused);
  cmp("attributeToEdits.plan_ids",
    [...new Set(d.attributions.flatMap((a) => a.planIds))].sort(), rec.attributeToEdits?.plan_ids);
  cmp("nextAction.action", d.action.action, rec.nextAction?.action);
  cmp("nextAction.refusedPlanIds", d.action.refusedPlanIds ?? null, rec.nextAction?.refusedPlanIds ?? undefined);
  cmp("shouldStop.outcome", d.stop.outcome, rec.shouldStop_if_applied?.outcome);
  return out;
}

function report(runDir) {
  const run = loadRun(runDir);
  const d = decide(run);
  const w = process.stdout.write.bind(process.stdout);

  w(`\n${runDir.split("/").pop()}\n\n`);
  w(`  draft     ${JSON.stringify(d.draft.findings.per)}  majority ${d.draft.majority}`
    + `${d.draft.split ? " (split)" : ""}\n`);
  w(`  revision  ${JSON.stringify(d.revision.findings.per)}  majority ${d.revision.majority}`
    + `${d.revision.split ? " (split)" : ""}\n\n`);
  w(`  detectDegradation  ${d.degradation.degraded ? "DEGRADED" : "ok"} — ${d.degradation.reason}\n`);
  const caused = d.attributions.filter((a) => a.causedByEdit);
  w(`  attributeToEdits   ${caused.length} finding(s) caused by `
    + `${[...new Set(caused.flatMap((a) => a.planIds))].join(", ") || "no edit"}\n`);
  w(`  nextAction         ${d.action.action}${d.action.refusedPlanIds ? ` ${JSON.stringify(d.action.refusedPlanIds)}` : ""}`
    + ` — ${d.action.reason}\n`);
  w(`  shouldStop         ${d.stop.outcome ?? "continue"} — ${d.stop.reason}\n`);
  return { run, d };
}

function replay(runDir) {
  const { run, d } = report(runDir);
  const checks = checkAgainstRecord(d, run.tally);
  const w = process.stdout.write.bind(process.stdout);

  if (checks.length === 0) {
    w("\n  TALLY.json records no decisions to verify against.\n");
    return 0;
  }
  w("\n  recomputed vs recorded:\n");
  let bad = 0;
  for (const c of checks) {
    if (!c.ok) bad += 1;
    w(`    ${c.ok ? "ok  " : "FAIL"} ${c.what.padEnd(28)} got ${JSON.stringify(c.got)}`
      + `${c.ok ? "" : `, recorded ${JSON.stringify(c.want)}`}\n`);
  }
  w(bad === 0
    ? "\n  every decision this run recorded reproduces from its own artefacts.\n\n"
    : `\n  ${bad} recorded decision(s) DO NOT reproduce — the run doc and the artefacts disagree.\n\n`);
  return bad === 0 ? 0 : 1;
}

const USAGE = `loop-harness: usage:
  node tests/loop-harness.mjs replay <run-dir>   recompute every decision from the run's
                                                artefacts; non-zero if the run's recorded
                                                numbers do not reproduce
  node tests/loop-harness.mjs status <run-dir>   same recomputation, no pass/fail — says
                                                what the loop wants next

Dispatching is not reimplemented here. Use prose-review's harnesses:
  run-harness.mjs    prepare|dispatch|collect   (critic rounds, k=3 by default)
  revise-harness.mjs dispatch|collect           (the reviser)
and author plan.json by hand at the consolidation seam — see LOOP-PROTOCOL.md.
`;

function main([cmd, arg]) {
  const dir = () => {
    if (!arg) die(USAGE);
    const full = existsSync(arg) ? resolve(arg) : join(HERE, "runs", arg);
    if (!existsSync(full)) die(`no such run directory: ${arg}`);
    return full;
  };
  if (cmd === "replay") process.exit(replay(dir()));
  else if (cmd === "status") { report(dir()); process.exit(0); }
  else die(USAGE);
}

if (process.argv[1] && process.argv[1].endsWith("loop-harness.mjs")) main(process.argv.slice(2));

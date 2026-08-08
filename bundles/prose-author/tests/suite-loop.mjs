/**
 * The loop's two decisions — when it stops, and when it refuses a revision.
 *
 * Both failures are silent. A loop that never stops burns dispatches and looks busy; a
 * loop that accepts a degrading revision produces a draft further from the author every
 * round, with a tidy transcript showing every edit was authorised. Neither shows up in
 * the output, so both get tests.
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  summarise, detectDegradation, shouldStop, nextAction, attributeToEdits,
  MAX_ITERATIONS, MIN_ATTRIBUTABLE_CHARS,
} from "./loop.mjs";
import { loadRun, decide, checkAgainstRecord } from "./loop-harness.mjs";

const round = (verdicts, findings) =>
  summarise(verdicts.map((v, i) => ({ verdict: v, findings: findings[i] })));

export async function run(t, { HERE } = {}) {
  t.group("loop — summarising a k=3 round");
  {
    const clean = round(["CLEAN", "CLEAN", "CLEAN"], [0, 0, 0]);
    t.check("unanimous CLEAN is reported as unanimous, not merely majority",
      clean.majority === "CLEAN" && clean.unanimous && !clean.split);

    const split = round(["CLEAN", "REVISE", "CLEAN"], [0, 2, 1]);
    t.check("a 2-1 majority is still flagged as a split", split.majority === "CLEAN" && split.split);

    // A 1-1 tie resolving to CLEAN would let a coin flip end the loop as a success.
    const tie = round(["CLEAN", "REVISE"], [0, 3]);
    t.check("a tie resolves to the WORSE verdict — a coin flip is not evidence of clean",
      tie.majority === "REVISE");

    t.check("finding spread is kept, not just the mean",
      split.findings.min === 0 && split.findings.max === 2 && Math.abs(split.findings.mean - 1) < 1e-9);

    t.check("an empty round is not silently treated as clean",
      summarise([]).majority === null && summarise([]).findings === null);
  }

  t.group("loop — refusing a revision that made the voice worse");
  {
    // Trigger 1: the verdict itself fell. Unambiguous, and the loop must not apply it.
    const fell = detectDegradation(
      [{ verdict: "CLEAN", findings: 0 }, { verdict: "CLEAN", findings: 0 }, { verdict: "CLEAN", findings: 1 }],
      [{ verdict: "REVISE", findings: 3 }, { verdict: "REVISE", findings: 2 }, { verdict: "REVISE", findings: 3 }],
    );
    t.check("a revision that drops the majority verdict is refused", fell.degraded);
    t.check("and the refusal says which verdict fell", /CLEAN to REVISE/.test(fell.reason));

    // Trigger 2: every draw worse. Strict on purpose — see the noise case below.
    const allWorse = detectDegradation(
      [{ verdict: "REVISE", findings: 1 }, { verdict: "REVISE", findings: 2 }, { verdict: "REVISE", findings: 1 }],
      [{ verdict: "REVISE", findings: 3 }, { verdict: "REVISE", findings: 4 }, { verdict: "REVISE", findings: 3 }],
    );
    t.check("a revision where every draw beats the draft's worst draw is refused", allWorse.degraded);

    // THE ONE THAT MATTERS. The S3 matched-Chekhov cell ran 1, 2, 0 on an unchanged
    // draft. A rule that blocked on a mean tick-up would refuse good revisions at random
    // and nobody would see it happen — the loop would just stop improving.
    const noise = detectDegradation(
      [{ verdict: "REVISE", findings: 1 }, { verdict: "REVISE", findings: 2 }, { verdict: "REVISE", findings: 0 }],
      [{ verdict: "REVISE", findings: 2 }, { verdict: "REVISE", findings: 1 }, { verdict: "REVISE", findings: 1 }],
    );
    t.check("a mean that ticks up within k=3 noise does NOT block", !noise.degraded);
    t.check("but the rise is still surfaced rather than averaged away",
      /surfaced, not blocking/.test(noise.reason));

    const better = detectDegradation(
      [{ verdict: "REVISE", findings: 3 }, { verdict: "REVISE", findings: 3 }, { verdict: "REVISE", findings: 3 }],
      [{ verdict: "REVISE", findings: 1 }, { verdict: "REVISE", findings: 1 }, { verdict: "REVISE", findings: 0 }],
    );
    t.check("a genuine improvement is not refused", !better.degraded && better.delta < 0);

    t.check("comparing against nothing is not treated as an improvement",
      detectDegradation([], [{ verdict: "CLEAN", findings: 0 }]).degraded === false
      && /not enough draws/.test(detectDegradation([], []).reason));
  }

  t.group("loop — termination, and only one way out is success");
  {
    const clean = round(["CLEAN", "CLEAN", "CLEAN"], [0, 0, 0]);
    const rev3 = round(["REVISE", "REVISE", "REVISE"], [3, 3, 3]);
    const rev2 = round(["REVISE", "REVISE", "REVISE"], [2, 2, 2]);

    const conv = shouldStop([rev3, clean]);
    t.check("unanimous CLEAN converges", conv.stop && conv.outcome === "converged");

    // A split CLEAN ending the loop as "converged" would read the half of a
    // disagreement that suits the loop. The sampling policy says surface it.
    const splitClean = shouldStop([round(["CLEAN", "CLEAN", "REVISE"], [0, 0, 2])]);
    t.check("a split CLEAN stops as SPLIT, not as converged",
      splitClean.stop && splitClean.outcome === "split");
    t.check("and the split stop says it is for the author to resolve",
      /not resolved/.test(splitClean.reason));

    // The diffuse-finding case: a surgical reviser cannot fix "no contractions
    // anywhere", so the loop would otherwise re-derive the same plan until the cap.
    const stalled = shouldStop([rev3, rev3]);
    t.check("two rounds at the same verdict with no ground gained stops as STALLED",
      stalled.stop && stalled.outcome === "stalled");

    t.check("improvement under the cap keeps going", !shouldStop([rev3, rev2]).stop);

    const capped = shouldStop([rev3, rev2, round(["REVISE", "REVISE", "REVISE"], [1, 1, 1])]);
    t.check(`still improving at the ${MAX_ITERATIONS}-iteration cap stops as CAP`,
      capped.stop && capped.outcome === "cap");

    t.check("no iterations yet is not a stop", !shouldStop([]).stop);
  }

  t.group("loop — which findings the revision CAUSED, which it merely revealed");
  {
    // This group exists because the S4 worked run produced a regression that
    // detectDegradation correctly declined to block: findings rose 1.00 -> 1.67/draw,
    // inside k=3 noise, and the rise was confounded anyway (fixing one finding lets the
    // critic see the next ones down). Counting cannot separate "the revision broke
    // something" from "the revision revealed something". The change log can.
    const original = "the calendar in the passage is two years old and nobody will take it down. "
      + "Write to me. I mean it: write, and put the year on the letter.";
    const log = { edits: [
      { plan_id: "e02", before: "nobody will take it down", after: "nobody'll take it down" },
      { plan_id: "e03", before: "and I do not much mind", after: "and I don't much mind" },
    ] };

    const attributed = attributeToEdits([
      { location: "line 13 — 'the calendar in the passage is two years old and nobody'll take it down'" },
      { location: "line 13 — 'Write to me. I mean it: write, and put the year on the letter'" },
    ], log, original);

    t.check("a finding quoting text an edit introduced is attributed to that edit's plan_id",
      attributed[0].causedByEdit && attributed[0].planIds.join() === "e02");
    t.check("a finding on text the edit never touched is NOT blamed on the revision",
      !attributed[1].causedByEdit);

    // Without this, every edit would look like a cause the moment its text appeared
    // anywhere in the revision - including text that was already there.
    const noop = attributeToEdits(
      [{ location: "nobody will take it down" }],
      { edits: [{ plan_id: "e09", before: "x", after: "nobody will take it down" }] },
      original,
    );
    t.check("an edit whose text was already in the original introduced nothing, so causes nothing",
      !noop[0].causedByEdit);

    t.check("an edit that changed nothing is not a cause",
      !attributeToEdits([{ location: "abc" }],
        { edits: [{ plan_id: "e01", before: "abc", after: "abc" }] }, "")[0].causedByEdit);

    t.check("matching survives whitespace and case differences between transcript and log",
      attributeToEdits([{ location: "…and   NOBODY'LL   take it down…" }], log, original)[0].causedByEdit);

    // A reviewer probed the first version with `after: "it"` against an unrelated
    // finding and got a confident false attribution. That fails toward over-refusal —
    // the loop would reject a GOOD edit and the transcript would look reasoned, which
    // is the expensive kind of wrong because nothing in the output looks off.
    t.check("a too-short introduction is not attributable — the reviewer's own probe",
      !attributeToEdits(
        [{ location: "the finding mentions it somewhere unrelated" }],
        { edits: [{ plan_id: "eX", before: "cat", after: "it" }] },
        "",
      )[0].causedByEdit);

    t.check(`the attributable floor is ${MIN_ATTRIBUTABLE_CHARS} characters and is exported, not buried`,
      MIN_ATTRIBUTABLE_CHARS >= 3);

    // Word-boundary matching: an introduced word must not be found inside a longer one.
    t.check("an introduced word is not matched inside a longer word",
      !attributeToEdits(
        [{ location: "the cathedral was mentioned" }],
        { edits: [{ plan_id: "eY", before: "dog", after: "cath" }] },
        "",
      )[0].causedByEdit);

    t.check("but a real multi-word introduction still attributes",
      attributeToEdits(
        [{ location: "flagged: 'and I don't much mind which day'" }],
        { edits: [{ plan_id: "e03", before: "and I do not much mind", after: "and I don't much mind" }] },
        "and I do not much mind which day that is",
      )[0].causedByEdit);

    t.check("no findings and no edits is not an accusation",
      attributeToEdits([], log, original).length === 0
      && !attributeToEdits([{ location: "anything" }], { edits: [] }, original)[0].causedByEdit);

    // Causation must outrank counts, or the loop discards a mostly-good revision on a
    // total while keeping the one edit that actually broke something.
    const refused = nextAction({
      history: [round(["REVISE", "REVISE", "REVISE"], [1, 2, 2])],
      pendingPlan: { entries: [] },
      attributions: attributed,
    });
    t.check("a caused finding refuses by plan_id even when the totals look acceptable",
      refused.action === "refuse" && refused.refusedPlanIds.join() === "e02");
    t.check("and it says to retry without that entry, not to throw the revision away",
      /retry without those entries/.test(refused.reason));
  }

  t.group("loop — what it asks for next, and the seam it will not cross");
  {
    const rev = round(["REVISE", "REVISE", "REVISE"], [2, 2, 2]);

    t.check("with no critic round yet, it critiques",
      nextAction({ history: [] }).action === "critique");

    // The consolidation seam. S4 deliberately does not automate this: turning
    // "no contracted forms anywhere in ~490 words" into a plan entry with an exact
    // quote and a specific change is judgement, and FU-2 owns it.
    const seam = nextAction({ history: [rev] });
    t.check("with findings and no plan, it asks for consolidation and stops there",
      seam.action === "consolidate");
    t.check("and says plainly that the step is not automated",
      /not automated/.test(seam.reason));

    t.check("with a plan ready, it revises",
      nextAction({ history: [rev], pendingPlan: { entries: [] } }).action === "revise");

    // Refusal outranks everything, including a plan sitting ready to apply.
    const refused = nextAction({
      history: [rev],
      pendingPlan: { entries: [] },
      lastDegradation: { degraded: true, reason: "majority verdict fell from CLEAN to REVISE" },
    });
    t.check("a degraded revision is refused even with a plan ready to apply",
      refused.action === "refuse");
    t.check("and the refusal carries the degradation's own reason",
      /verdict fell/.test(refused.reason));

    const done = nextAction({ history: [round(["CLEAN", "CLEAN", "CLEAN"], [0, 0, 0])] });
    t.check("a converged loop stops rather than asking for another plan",
      done.action === "stop" && done.outcome === "converged");
  }
  t.group("loop — the recorded run reproduces from its own artefacts");
  {
    // A reviewer called the S4 worked run "a human simulating the loop, not the loop
    // running" — the decisions were real but nothing could be re-run, so the run doc's
    // numbers were a narrated claim. This asserts they recompute.
    //
    // It has already earned its place: the first replay FAILED, because TALLY.json
    // stored paraphrases of the findings rather than the critic's verbatim LOCATION
    // lines, and attribution is a text match. The run had looked clean while being
    // unreproducible.
    const base = HERE ?? resolve(".");
    const runDir = join(base, "runs", "2026-08-07-pi02-s4-loop");
    if (!existsSync(runDir)) {
      t.check("the S4 loop run is checked in", false, runDir);
    } else {
      const run = loadRun(runDir);
      const d = decide(run);
      const checks = checkAgainstRecord(d, run.tally);

      t.check("the run records decisions to verify against, not just numbers",
        checks.length >= 5, `${checks.length} recorded`);
      for (const c of checks) {
        t.check(`replay reproduces ${c.what}`, c.ok,
          c.ok ? "" : `got ${JSON.stringify(c.got)}, recorded ${JSON.stringify(c.want)}`);
      }

      // The specific thing the first replay caught. Without verbatim locations the
      // attribution silently returns zero and the run reads as clean.
      t.check("findings carry the critic's verbatim LOCATION, not a paraphrase",
        (run.tally.revision.findings_detail ?? []).every((f) => typeof f.location === "string" && f.location.length > 20));
    }
  }
}

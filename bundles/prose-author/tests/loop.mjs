/**
 * The generate → critique → revise loop: when it stops, and when it refuses.
 *
 * Deliberately pure. Everything here operates on plain verdict/finding data, so this
 * module imports nothing — not the critic harness, not the reviser harness, not the
 * bundle next door. The loop *spans* two bundles, and the only two decisions it owns
 * that neither bundle already makes are the two below. Parsing transcripts and applying
 * change logs are jobs `prose-review`'s harnesses already do, and the loop composes them
 * by invoking their CLIs rather than by importing across a boundary that no other test
 * in this repo crosses.
 *
 * Two decisions:
 *
 *   shouldStop()          — the loop must terminate, and "the critic is still finding
 *                           things" is not a reason to keep going forever.
 *   detectDegradation()   — a revision can make the voice WORSE. If it does, the loop
 *                           has to notice and refuse, or it will happily walk a draft
 *                           away from the author one accepted edit at a time.
 *
 * Both are k=3-aware per .planning/SAMPLING-POLICY.md: they read a majority and they
 * surface a split rather than resolving it.
 */

/** PI-02's lean, adopted: a hard cap so a stubborn finding cannot spin the loop. */
export const MAX_ITERATIONS = 3;

/**
 * Summarise one k=n critic round into the shape the loop's decisions read.
 *
 * `draws` is [{ verdict, findings }]. The majority is the mode; ties resolve to the
 * WORSE verdict, because a 1-1 split between CLEAN and REVISE is not evidence of clean.
 */
export function summarise(draws) {
  if (!Array.isArray(draws) || draws.length === 0) {
    return { draws: 0, majority: null, unanimous: false, split: false, findings: null };
  }
  const tally = new Map();
  for (const d of draws) tally.set(d.verdict, (tally.get(d.verdict) ?? 0) + 1);

  let majority = null;
  let best = -1;
  // Iterate worst-first so a tie lands on the worse verdict rather than on whichever
  // happened to be seen first.
  for (const v of ["REVISE", "CLEAN"]) {
    const n = tally.get(v) ?? 0;
    if (n > best) { best = n; majority = n > 0 ? v : majority; }
  }
  const counts = draws.map((d) => d.findings);
  return {
    draws: draws.length,
    majority,
    unanimous: tally.size === 1,
    split: tally.size > 1,
    findings: {
      per: counts,
      mean: counts.reduce((a, b) => a + b, 0) / counts.length,
      min: Math.min(...counts),
      max: Math.max(...counts),
    },
  };
}

/**
 * Has the revision made the voice worse than the draft it came from?
 *
 * This is the loop's safety property. Without it the loop can walk a draft steadily
 * away from the author: each round the critic finds something, the reviser dutifully
 * changes it, and nothing ever asks whether the change helped.
 *
 * Two triggers, and the second is deliberately strict:
 *
 *   1. The majority verdict got worse (CLEAN → REVISE). Unambiguous.
 *   2. EVERY draw found more than the draft's worst draw. Requiring every draw is what
 *      makes this robust to k=3 noise — the S3 matched-Chekhov cell ran 1, 2, 0 on an
 *      unchanged draft, so a mean that ticks up by half a finding says nothing. A real
 *      degradation shows in all of them.
 *
 * The count delta is returned either way. Per the sampling policy the loop surfaces what
 * it saw; it does not quietly average it away.
 */
export function detectDegradation(before, after) {
  const b = summarise(before);
  const a = summarise(after);
  if (!b.findings || !a.findings) {
    return { degraded: false, reason: "not enough draws to compare", before: b, after: a };
  }

  const verdictWorse = b.majority === "CLEAN" && a.majority === "REVISE";
  const allWorse = a.findings.min > b.findings.max;

  const delta = a.findings.mean - b.findings.mean;
  let reason;
  if (verdictWorse) {
    reason = `majority verdict fell from ${b.majority} to ${a.majority}`;
  } else if (allWorse) {
    reason = `every revision draw (min ${a.findings.min}) found more than the draft's worst (max ${b.findings.max})`;
  } else if (delta > 0) {
    reason = `findings rose by ${delta.toFixed(2)}/draw, within k=${b.draws} noise — surfaced, not blocking`;
  } else {
    reason = `findings fell by ${Math.abs(delta).toFixed(2)}/draw`;
  }

  return { degraded: verdictWorse || allWorse, reason, delta, before: b, after: a };
}

const squash = (s) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Which findings on a revision were CAUSED by the revision?
 *
 * Counting findings cannot answer this, and the S4 worked run is why the function
 * exists. There, a hand-authored plan turned "nobody will take it down" into
 * "nobody'll take it down" — and the critic flagged it, because that contraction class
 * appears nowhere in the corpus. `detectDegradation` did not block: findings rose only
 * 1.00 → 1.67/draw, inside k=3 noise, and the rise was confounded anyway because fixing
 * one finding lets the critic see the next ones down.
 *
 * So the count was right not to block and still missed a real regression. Causation is
 * the thing that was actually knowable: the change log records the exact text each edit
 * INTRODUCED, so a finding quoting that text was caused by that edit. Deterministic, and
 * it names the `plan_id` — which is what lets a loop retry without the bad entry instead
 * of throwing away a revision that was mostly right.
 *
 * An `after` string already present in the original is ignored: the edit did not
 * introduce it, so a finding quoting it was not caused here.
 */
export const MIN_ATTRIBUTABLE_CHARS = 4;

export function attributeToEdits(findings, changeLog, original = "") {
  const before = squash(original);
  const introduced = (changeLog?.edits ?? [])
    .filter((e) => e.after && e.after !== e.before && !before.includes(squash(e.after)))
    .map((e) => ({ planId: e.plan_id, needle: squash(e.after) }))
    // Too short to carry evidence. A naked substring match on a two-letter `after`
    // blames an edit for every finding whose prose happens to contain those letters —
    // caught by a reviewer probing `after: "it"` against an unrelated finding. Short
    // introductions are simply not attributable, and saying so beats a confident wrong
    // plan_id: the loop would refuse a good edit and the transcript would look reasoned.
    .filter((i) => i.needle.length >= MIN_ATTRIBUTABLE_CHARS);

  return (findings ?? []).map((f) => {
    const hay = squash(typeof f === "string" ? f : f.location);
    // Word-boundary match, so an introduced word is not found inside a longer one.
    const planIds = introduced
      .filter((i) => new RegExp(`(^|\\W)${escapeRe(i.needle)}(\\W|$)`).test(hay))
      .map((i) => i.planId);
    return { finding: f, planIds, causedByEdit: planIds.length > 0 };
  });
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Should the loop run another iteration?
 *
 * `history` is [{ verdict summary of that iteration's accepted state }], oldest first.
 * Four ways to stop, and only one of them is success.
 */
export function shouldStop(history, { maxIterations = MAX_ITERATIONS } = {}) {
  if (history.length === 0) return { stop: false, reason: "no iterations yet" };

  const last = history[history.length - 1];

  // Success. The point of the loop, and the only stop that is not a compromise.
  if (last.majority === "CLEAN" && last.unanimous) {
    return { stop: true, outcome: "converged", reason: "critic returned unanimous CLEAN" };
  }

  // A split CLEAN is not converged. Per the sampling policy the loop surfaces the
  // disagreement rather than reading the half it prefers.
  if (last.majority === "CLEAN" && last.split) {
    return {
      stop: true,
      outcome: "split",
      reason: `majority CLEAN but not unanimous (${last.findings.per.join(", ")} findings across draws) — surfaced for the author, not resolved`,
    };
  }

  // Stalled: same verdict two rounds running and no ground gained. Continuing would
  // spend dispatches to re-derive the same plan. This is the common case for a diffuse
  // finding a surgical reviser structurally cannot reach.
  if (history.length >= 2) {
    const prev = history[history.length - 2];
    if (prev.majority === last.majority && last.findings.mean >= prev.findings.mean) {
      return {
        stop: true,
        outcome: "stalled",
        reason: `two consecutive rounds at ${last.majority} with no reduction `
          + `(${prev.findings.mean.toFixed(2)} → ${last.findings.mean.toFixed(2)} findings/draw)`,
      };
    }
  }

  if (history.length >= maxIterations) {
    return { stop: true, outcome: "cap", reason: `hit the ${maxIterations}-iteration cap still at ${last.majority}` };
  }

  return { stop: false, reason: `improving (${last.findings.mean.toFixed(2)} findings/draw), under the cap` };
}

/**
 * What the loop wants next, given where it is. The consolidation step is a SEAM: this
 * returns `consolidate` and stops, because turning critic findings into a reviser plan
 * needs judgement no function here has. FU-2 owns automating it.
 */
export function nextAction(state) {
  const { history = [], pendingPlan = null, lastDegradation = null, attributions = [] } = state;

  // Causation outranks counts. An edit that introduced a finding is refused by plan_id
  // even when the totals look fine, because the totals cannot see it — see
  // attributeToEdits. Refusing the entry rather than the whole revision keeps the edits
  // that were right.
  const caused = attributions.filter((a) => a.causedByEdit);
  if (caused.length > 0) {
    const ids = [...new Set(caused.flatMap((a) => a.planIds))].sort();
    return {
      action: "refuse",
      refusedPlanIds: ids,
      reason: `${caused.length} finding(s) on the revision quote text introduced by ${ids.join(", ")} — `
        + "retry without those entries rather than discarding the whole revision",
    };
  }

  if (lastDegradation?.degraded) {
    return { action: "refuse", reason: `revision rejected — ${lastDegradation.reason}` };
  }
  const verdict = shouldStop(history);
  if (verdict.stop) return { action: "stop", outcome: verdict.outcome, reason: verdict.reason };
  if (history.length === 0) return { action: "critique", reason: "no critic round yet" };
  if (!pendingPlan) {
    return {
      action: "consolidate",
      reason: `${history[history.length - 1].findings.per.reduce((a, b) => a + b, 0)} findings across `
        + `${history[history.length - 1].draws} draws need turning into a plan — this step is not automated`,
    };
  }
  return { action: "revise", reason: "plan is ready" };
}

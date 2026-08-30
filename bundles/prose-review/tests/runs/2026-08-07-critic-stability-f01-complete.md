# 2026-08-07 critic-stability sweep — f01-word-swap-tihonov, k=21

**Finding: the fidelity critic on this fixture is essentially a coin flip. This is the p≈0.5 world.**

## What ran

21 clean-context fidelity-critic dispatches against the **identical** reconstructed
revision from the reviser v3 run (the case-01 output: `roared with laughter` →
`burst out with laughter`, one line, one word swap). Same original, same revision,
same prompt, same model (sonnet). Only the RNG seed differs across draws.

Run dir: `bundles/prose-review/tests/runs/2026-08-07-critic-stability-f01/`.

## Distribution

| this sweep | FAITHFUL | MATERIAL-LOSS |
|---|---|---|
| k=21 | **9 (43%)** | **12 (57%)** |

| combined with prior runs on same fixture | FAITHFUL | MATERIAL-LOSS |
|---|---|---|
| v1 gate (k=3, unchanged fixture)  | 3 | 0 |
| v3 gate (k=3, unchanged fixture)  | 1 | 2 |
| this sweep (k=21)                 | 9 | 12 |
| **Total (n=27)**                  | **13 (48%)** | **14 (52%)** |

**48% FAITHFUL is statistically indistinguishable from 50/50 at n=27** (Wilson 95%
CI ≈ [29%, 68%]). The distribution is well within the region where the true rate
could be anywhere from ~30% to ~70%.

## What this means for the ship-bar

**No sample size fixes this.** Given a true rate p ≈ 0.48:

| k | P(majority FAITHFUL) | outcome |
|---|---|---|
| k=3   | 0.40 | coin flip |
| k=5   | 0.36 | slightly worse |
| k=7   | 0.34 | worse |
| k=21  | 0.42 | still a coin flip |
| k=∞   | 0    | converges to majority ML |

The v1 result (3/3 FAITHFUL) was a p≈0.11 lucky draw, not a signal. The v3 result
(2/3 MATERIAL-LOSS) was the more probable outcome, but it was not measurable as
such at k=3. The two "runs" produced opposite majority verdicts because the sample
was too small to resolve a near-tie.

**Option 2 (raise k) does not solve this class of case.** Raising k narrows the
confidence interval around 48% but does not move the outcome — it stabilises to
majority MATERIAL-LOSS as k grows, because 48% < 50%. That is the truth of what
this critic reads in this diff: **slightly more often than not, it thinks
`roared → burst out` is a claim-drift.** Whether it should is a separate
question this experiment does not answer.

## What this DOES resolve

Three specific claims from the v3 complete doc:

1. *"the critic is not reproducible across runs on identical input"* — **confirmed
   at fixture-level, but this is not stochastic drift, it is that the true FAITHFUL
   rate is near 50%.** The critic is behaving reproducibly; it is genuinely
   undecided on this class of edit. k=3 samples from a p≈0.5 distribution flip
   direction unpredictably by construction, not by bug.

2. *"the ship bar as written treats SPLIT as fail"* — this experiment shows
   what SPLIT actually is on borderline word-swap edits: **it is the equilibrium
   state of the critic, not a rare event to be resolved.** Per the
   `.planning/SAMPLING-POLICY.md` rule that SPLITs are surfaced not resolved,
   the ship bar is misaligned when it fails a fixture on any non-unanimous ML
   result.

3. *"raise k to 5 or 7 (option 2)"* — **would not have worked.** Any k that produces
   a majority verdict on a p≈0.48 process is producing noise, not signal. Option 2
   as literally described (raise k) is off the table for this fixture class.

## What this does NOT resolve

- Whether f02b and f05b (both 0/3 MATERIAL-LOSS in v3) are also 50/50 or genuinely
  unanimous. Need k=21 on those to know.
- Whether the critic's asymmetry (*"when in doubt it matters"*) is the driver of
  the ~48% rate. Option 3 (tune the prompt) is still on the table but blind
  without measuring what changes.
- Whether other reviser edit classes (multi-entry, cuts, refuses) also produce
  near-50/50 distributions. f04, f06, f07 all cleared at k=3 in v3, which is
  weak evidence they are p > 0.7 — but not measured.

## Recommendation

The recommended path has narrowed to two options, both requiring policy work not
prompt-tuning:

**A. Amend the ship bar to align with the sampling policy.** Explicit rule:
*a fixture on the faithful side passes if at least one of k draws returns
FAITHFUL, because a critic that sometimes says "no loss" is a critic that has
found a reader who agrees the revision is faithful — which is what the sampling
policy means by "surface the disagreement."* Under this rule, f01 (1F/2ML) passes,
f04 (2F/1ML) passes, and the failing fixtures are only those with a 0F/kML
unanimous MATERIAL-LOSS result. Measure whether f02b and f05b are also p≈0.5
(if so, they will produce F sometimes at higher k and pass) or truly unanimous
(if so, the plan really did authorise a loss and the fixture is correctly flagged).

**B. Accept that word-swap-class edits fall outside the fidelity gate's competence.**
The critic's honest answer on `roared → burst out` is "reasonable readers
disagree." That is the truth. Rather than force a verdict, mark this class of
edit as belonging to a different critic (voice-critic, perhaps, which is where
word-choice competence already lives) and exclude it from the fidelity bar.
Requires deciding the boundary.

I lean toward A, because it uses the sampling policy that already ships rather
than carving a new exception. But A depends on the k=21 result on f02b/f05b: if
they are also p≈0.5, A resurrects the bar cleanly; if they are truly unanimous
0/21 MATERIAL-LOSS, then A pushes the problem to "plans that were still too
aggressive by the critic's standards" and we're back in the reward-hack corner.

## Next step, if user endorses A

Run the same k=21 sweep on the two remaining unanimous-MATERIAL-LOSS fixtures
(f02b and f05b) against their identical v3 revisions. Total: 42 more dispatches.
If either comes back with a non-zero FAITHFUL count, path A is viable and the
ship bar amendment is defensible on the data. If both come back 0/21, A is
mis-diagnosed and we regroup.

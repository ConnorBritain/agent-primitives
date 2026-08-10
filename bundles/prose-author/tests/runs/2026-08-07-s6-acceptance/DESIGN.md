# PI-02 · S6 — acceptance run

Bar: `.planning/2026-08-07-generator-ship-bar.md`, pre-registered and **not adjustable by
this run's results.** If the bar is missed, the output is a completion doc and a proposal.

## Scale, and why it is not n=20

PI-02 says n=20. This run is **n=8 drafts × k=3 = 32 dispatches**, and the reduction is
stated here rather than discovered in the results.

The bar is conjunctive and per-draft, so it is evaluated draft-by-draft; n changes the
confidence in the *pass rate*, not whether any given draft passes. Eight drafts on one
corpus already distinguishes "usually passes" from "sometimes passes" — the distinction
that matters for a hold-lift decision — and the honest limiting factor is corpus breadth,
not draft count. Twenty drafts on one professional blogger would buy precision about a
population of one.

**If the pass rate lands mid-range (4–6 of 8), that is explicitly not enough to lift a
hold**, and the completion doc must say so rather than rounding up.

## Cells

Eight prompts, all `doctorow-blog`, all ~700-word blog posts for a returning readership.
Two are re-runs of calibration prompts under the current prompt (b02 failed on weekday
names, b03-refix passed); six are new topics the drafter has not seen.

Topic spread is deliberate: some where the drafter plausibly holds verified facts
(standards, scholarly publishing) and some where it plausibly does not (streaming
licensing, banking fees). FU-18's `claims` list and the naming-vs-citing rule behave
differently in those two cases, and the run should show both.

## Structural gates, all must hold

- zero fabricated citations
- zero corpus leakage (6-gram, minus what the profile quoted)
- no draft claiming to sound like the author, to be good, or to pass a detector
- every checkable assertion recorded in `claims`

## What this cannot establish

One corpus, one author, one register, one length. Nothing here is about the tool's actual
user, whose corpus has never been through any of it.

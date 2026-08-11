# PI-02 · S6 re-run — acceptance against the rate-bearing profile

**Written before any draft was critiqued.**

## The bar has not moved and cannot

`.planning/2026-08-07-generator-ship-bar.md`, pre-registered 2026-08-07 and unchanged:

1. **Majority CLEAN** from `prose-voice-critic`, at least 2 of 3 draws.
2. **≤ 1.0 findings per draw**, mean across three draws.

Both absolute. Structural gates: zero fabricated citations, zero corpus leakage, refusal
when the register is underdetermined, no draft claiming to sound like the author or to
pass a detector.

## What is different, and why it is not a bar change

Since the 2026-08-07 run, three things changed — all upstream of the critic, none of them
in the bar:

- **The renderer works a register checklist** (FU-12), so the profile now records habits
  it previously missed. Chief among them the solidaristic `we/us`, present at 10/10 in the
  corpus and absent from the old profile, which is what b07 failed on.
- **The renderer states measured rates** (FU-19 option 3). 14 of 24 observations carry a
  count and a per-1000-word figure.
- **The drafters are told the arithmetic**: a rate of R per 1,000 words means ~0.7R
  instances in a 700-word draft. The old run's drafters read a per-piece phrase measured
  on 1,755-word samples and applied it to a 700-word draft, which is FU-17's overshoot.

## The rate measurements are DISCLOSURE, not a gate

`corpus-rates.mjs` can now flag a draft using a habit at more than twice the corpus rate.
It would be easy, and wrong, to add that as a structural gate here.

**A bar made stricter after seeing results is as post-hoc as a bar made looser.** The
pre-registration's rule is that the bar is not adjustable by the run, in either direction.
So the pass/fail verdict below is the original two criteria and the original four
structural gates, exactly.

Rate findings are reported alongside, as evidence about *the next* bar. If they show the
critic clearing drafts this instrument flags, that is a finding about the bar's validity
to be acted on in a pre-registered successor — not a retroactive disqualification.

## Cells

Six drafts, all `doctorow-blog`, all ~700-word posts, k=3 each. Same six topics the
2026-08-07 run measured: password managers, open standards, parts pairing, ad-tech
targeting, streaming licence lapse, overdraft fees.

**The prompts are reconstructed, not identical.** The 2026-08-07 run checked in its drafts
but not its prompts, so these were rebuilt from the topics in that run's `TALLY.json`. The
comparison is therefore topic-matched, not prompt-matched, and any per-draft difference
carries that caveat. `inputs/prompts.json` stores them so the next re-run does not have
this problem.

## What this cannot establish

One corpus, one author, one register, one length. Nothing here is about the tool's actual
user, whose corpus has still never been through any of it. Clearing this bar would not
change that.

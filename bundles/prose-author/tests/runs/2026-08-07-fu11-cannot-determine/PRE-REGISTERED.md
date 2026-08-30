# FU-11 — measurement, fixed before the re-draft was read

## The defect

`voice-draft`'s prompt said: *"do not reproduce … archaic spelling or inflection the
profile attributes to the period rather than the person."*

The Bacon profile does not attribute it to the period. It says the opposite:

> Every sample uses the archaic inflection — *hath*, *doth*, *maketh*, *seemeth* — 10/10
> samples. The corpus **cannot separate** what is this writer's habit from what is 1625
> English, so it **cannot tell a drafter whether to reproduce it**.

The prompt turned *"cannot tell"* into *"belongs to the period"*, so the drafter
suppressed a habit present in every sample. A critic caught it and cited all ten.

## The fix under test

Section 8 now reports **three** things in the prompt, not two: attributed-elsewhere (do
not reproduce), **observed-but-unattributable (reproduce — attribution decides what you
may claim, not what the prose looks like)**, and no-evidence (write, invent nothing).

## A weakness in this ticket's own bar, found before running it

FU-11's stated bar was *"re-run the bacon matched cell k=3; the `-eth` finding does not
recur."* Checking the baseline first: **the finding fired in only 1 of 3 draws** (d3), not
3 of 3. The other two draws flagged missing authority and the `"Rather,"` pivot instead.

So a k=3 re-run has roughly a **(2/3)³ ≈ 30% chance of not seeing it even if nothing
changed.** The bar as written could be cleared by luck three times in ten. That is too
weak to carry a fix, and it is better to say so now than to notice it in the result.

## The bar actually used

**Primary — deterministic, on the artefact.** Count archaic third-person inflections
(`-eth` forms) in the superseded draft and the new one. This tests the prompt change
directly and cannot be got by luck.

- **Pass:** the new draft inflects where the corpus does; the superseded one did not.
- **Fail:** still zero.

**Secondary — critic, k=3, same corpus and protocol as S3.**

- The `-eth` finding does not appear in any draw.
- Total findings per draw do not exceed the S3 baseline of **3, 3, 3**. A fix that removes
  one finding and adds another has traded, not improved.
- Reported with the base-rate caveat above attached, because at 1-of-3 it is corroboration
  and not proof.

**Not a bar, and deliberately so:** whether the new draft is *better*. That is the
author's judgement and S5's measurement, not this ticket's.

## Result

**FAILED on every clause. See `COMPLETE.md`.** The prompt bug was real and is fixed; the
ticket's remedy was rejected on evidence; the finding is FU-13.

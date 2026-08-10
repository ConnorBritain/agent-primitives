# PI-02 · S6 — acceptance run (2026-08-07)

**Result: the bar is NOT cleared. 3 of 6 measured drafts pass. The hold stays on.**

Bar: `.planning/2026-08-07-generator-ship-bar.md`, pre-registered before any of this ran
and **not adjusted by it**. The pre-registration says a mid-range pass rate is explicitly
not enough to lift a hold. This is a mid-range pass rate.

## The measured drafts

All `doctorow-blog`, k=3 each, conjunctive bar (majority CLEAN **and** ≤ 1.0 findings/draw).

| draft | topic | findings | mean | majority | bar |
|---|---|---|---|---|---|
| v3 | password managers | 3, 0, 0 | 1.00 | CLEAN | **pass** |
| b03-refix | parts pairing | 0, 0, 0 | 0.00 | CLEAN | **pass** |
| b04 | ad-tech targeting | 0, 0, 0 | 0.00 | CLEAN | **pass** |
| b02 | open standards | 1, 1, 2 | 1.33 | REVISE | fail |
| b07 | streaming licence lapse | 2, 2, 0 | 1.33 | REVISE | fail |
| b08 | overdraft fees | 3, 0, 2 | 1.67 | REVISE | fail |

**3 of 6.** Two drafts (b05, b06) were drafted and structurally gated but not critiqued —
budget, stated here rather than folded into the denominator.

**Structural gates: all pass, all drafts.** Zero fabricated citations, zero corpus leakage,
every checkable claim disclosed, no draft claiming to sound like the author or to pass a
detector.

## The failures are three specific, countable habits

Not "it doesn't sound like him". Each is a rated habit the drafter under-applied, and each
is verifiable without a critic:

| habit | corpus | the drafts |
|---|---|---|
| profanity at the point of maximum contempt | 10/10 samples | b04 1, b05 1, b06 1, b07 2, **b08 0** |
| solidaristic *we / us / our* | 10/10 samples | b04 3, b05 0, b06 1, **b07 0**, b08 2 |
| analogies as bare mechanisms, not staged scenes | 10/10 samples | b07 flagged high-confidence |

b08 failed on the first, b07 on the second and third. The profile rates profanity
`several times per piece`; **no draft managed more than two, and the one that managed
zero failed.** This is FU-17's residue — the drafter under-applies rated habits — showing
up as a bar failure rather than a disclosure, which is what an acceptance run is for.

## What passed, and what that is worth

**b04 and b03-refix both returned 0 findings, unanimous CLEAN** — identical to the human
baseline (18 draws, 0 findings, unanimous CLEAN). Three separate critics cleared each of
them across all five categories with corpus citations for every construction they checked.

That is a real result and it should not be inflated: **half the measured drafts did not
do it**, and the difference between the halves is countable habits, not mystery.

## The epigram finding, fifth appearance

Flagged again on b08 at high confidence — *"every one of the eight paragraphs terminates
in a short epigrammatic kicker"*. FU-14 now records three failed fixes. It does not appear
on the passing drafts, which is the first evidence that it is a symptom of the same
under-application rather than an independent defect: a draft that carries the profanity,
the *we*, and the flat functional analogy has other places to end a paragraph.

## Honest limits

- **One corpus, one author, one register, one length.** Everything here is one professional
  blogger writing ~700-word polemics.
- **n is small and was reduced from PI-02's 20.** The reduction was stated in `DESIGN.md`
  before results; the reasoning was that the bar is per-draft and corpus breadth is the
  real limiter. That reasoning still holds and does not make 6 into 20.
- **Two drafts un-critiqued.** Reported, not silently dropped.
- **The author has read exactly one of these drafts.** The one they read passed.
- **Nothing here is the tool's actual user.** No corpus belonging to the person this is
  being built for has been through any of it, and clearing this bar would not have closed
  that gap.

## Recommendation

**Do not lift the hold.** Both primitives stay `ships: false`.

The gap is one diagnosed problem — rated habits under-applied — with a countable signature
and three candidate fixes already written up in FU-17. That is a better position than a
vague shortfall, and it is a worse position than a pass. The next move is FU-17, then
re-run this same set; the drafts, prompts and locks are all checked in, so the re-run is
cheap and directly comparable.

**The bar does not move.** It was written to be missable and it was missed.

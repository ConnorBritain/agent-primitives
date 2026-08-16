# PI-02 · S6 re-run — acceptance against the rate-bearing profile (2026-08-11)

**Result: 5 of 6 drafts clear the bar. Three are unanimous CLEAN with zero findings. The
hold does NOT lift, for reasons given in §6 — and one of them is that the single failure is
plausibly caused by a change made in this same work.**

Bar: `.planning/2026-08-07-generator-ship-bar.md`, pre-registered 2026-08-07, **not adjusted
by this run in either direction.** Design and the rate-disclosure discipline:
[`DESIGN.md`](DESIGN.md).

---

## 1. The measured drafts

k=3 each, conjunctive bar (majority CLEAN **and** ≤ 1.0 findings/draw).

| draft | topic | findings | mean | majority | bar | 2026-08-07 |
|---|---|---|---|---|---|---|
| b03 | parts pairing | 0, 0, 0 | **0.00** | CLEAN | **pass** | pass |
| b07 | streaming licence lapse | 0, 0, 0 | **0.00** | CLEAN | **pass** | *fail* → pass |
| b08 | overdraft fees | 0, 0, 0 | **0.00** | CLEAN | **pass** | *fail* → pass |
| v3 | password managers | 1, 0, 0 | 0.33 | CLEAN | **pass** | pass |
| b02 | open standards | 0, 1, 0 | 0.33 | CLEAN | **pass** | *fail* → pass |
| b04 | ad-tech targeting | 1, 1, 3 | 1.67 | REVISE | **fail** | *pass* → fail |

**18 draws, 6 findings total.** Against the 2026-08-07 run's 3-of-6 (and 5-of-6 after
FU-17), this is 5 of 6 with **three drafts at unanimous zero** where that run had two.

**Structural gates: all pass, all drafts.** Zero corpus leakage, zero fabricated citations,
21 checkable claims disclosed across the set, no draft claiming to sound like the author or
to pass a detector.

## 2. b07 is the clean causal result

b07 failed the 2026-08-07 run on the **solidaristic `we/us`** — a habit present at 10/10 in
the corpus and **absent from the profile entirely**, so the drafter could not have known it
existed. That was FU-12's headline defect.

FU-12 put a register checklist in the renderer; the profile now records the habit with a
rate. b07 went **0 → 9 instances, deficit → in-band (1.19×)**, and **three of three draws
returned CLEAN with zero findings.**

Same topic, same bar, same critic. One diagnosed defect, one fix, one converted draft.

## 3. The second-person overshoot closed at the source

The 2026-08-07 drafts used *you* at 2.09×, 2.09× and 2.47× the corpus rate, and **nine
critic draws cleared them anyway** — the one-sidedness that FU-19 was filed for.

This run's drafters were told the arithmetic: a rate of R per 1,000 words means ~0.7R
instances in a 700-word draft. Result:

| | 2026-08-07 | now |
|---|---|---|
| b04 second person | 2.09× **excess** | 1.59× in-band |
| b07 second person | 2.09× **excess** | 1.50× in-band |
| b08 second person | 2.47× **excess** | 1.58× in-band |
| drafts at `we/us` deficit | 5 of 5 | 2 of 6 |

**Every excess flag is gone**, and the two remaining deficits (b04, b08 at ~0.4×) are a
weaker failure than the zeros they replaced. This is FU-17's overshoot resolved at the
source rather than counted after the fact.

## 4. The instrument and the critic agreed on a finding

b02's dissenting draw found **no first-person authorial anchor anywhere**, citing eight
corpus samples where the author anchors the argument in his own experience.

`corpus-rates.mjs`, which shares no code and no method with the critic, independently
measures **b02 at zero first-person tokens** against a corpus rate of 6.21 per 1,000 words
at 10/10 samples.

That is the first time in PI-02 the two instruments have agreed on a *finding* rather than
on a corpus count. It also cross-checks the renderer again: it reported 110 first-person
instances at 6.27/1000, the harness measures 109 at 6.21 — **0.9% apart.**

**And the profile recorded that habit, with its number.** b02's drafter was handed "110
instances, 6.27 per 1,000, 10/10 samples" and wrote zero. That is not FU-12's failure mode;
it is a drafter that had the number and did not act on it. Different defect, different
owner, and it belongs to whatever comes after this.

## 5. b04 failed, and I may have caused it

**All three draws found the same thing:** the draft never routes an argument through a
named person. Two rated it high confidence. Draw 2 listed the corpus habit exhaustively —
*"As Weil writes," "As Quiggin notes," "As Upton Sinclair famously quipped," "what Douglas
Rushkoff calls,"* across all ten samples — against **zero instances in the draft**.

Here is the problem. The FU-12 profile, rendered *before* the rate change, contained this:

> *"A named person's verbatim words are the hinge the argument turns on, quoted at length
> and then answered in the writer's own voice — 8/10 samples, once or twice per piece"*

**The rate-bearing profile does not contain it.** It records that named people are targets
of attack, which is a different habit. The observation b04 failed on was in the previous
profile and is missing from this one.

The renders also differ in size: **34 observations before, 24 after.**

**The hypothesis is that requiring rates crowded out an observation that cannot carry
one** — you cannot put a per-1000 figure on "the argument turns on a named person's
quoted words" — and a draft then failed on exactly that habit. The mechanism is plausible
and the timing is exact.

**It is not proven.** Four other drafts used the same profile and passed, so the gap is not
sufficient on its own; b04's topic is one where the drafter held few verified attributions,
which is the same condition that produced b03's namelessness failure in the calibration run.
Topic and profile are confounded here and this run cannot separate them.

Filed as **FU-20**. It is a direct risk created by FU-19 option 3 and it needs its own test:
re-render with the rate rule, check whether unrateable observations survive at the same rate
as before.

## 6. Why the hold does not lift

1. **The single failure may be self-inflicted** (§5). Shipping on a 5-of-6 whose one loss
   traces to a regression introduced in the same change would be encoding an unexamined
   defect as an acceptable rate.
2. **The prompts are reconstructed, not identical.** The 2026-08-07 run stored its drafts
   and not its prompts, so every before/after comparison here is topic-matched rather than
   prompt-matched. Some of the improvement could be prompt luck. `inputs/prompts.json` fixes
   this going forward and cannot fix it retroactively.
3. **n = 6, one corpus, one author, one register, one length.** PI-02 specified n=20; the
   reduction was stated in the 2026-08-07 design before results and still holds, but 6 is 6.
4. **Two `we/us` deficits remain**, at b04 and b08.
5. **The author has read none of these six drafts.** The one human judgement in PI-02 was on
   a draft from a different run.
6. **Nothing here is the tool's actual user.** No corpus belonging to the person this is
   being built for has been through any of it. Clearing this bar does not close that gap and
   never could.

**Recommendation: do not lift. Both primitives stay `ships: false`.**

## 7. What this run does establish

- **FU-12's fix works, causally, on the draft it was diagnosed from.** b07 converted from
  fail to unanimous zero, on the habit the renderer had been missing.
- **FU-19's overshoot is closed at the source.** Zero excess flags across 24 habit-cells,
  where the previous run had three.
- **The two instruments agree**, on a corpus count (0.9% apart) and now on a finding.
- **Three drafts matched the human baseline exactly** — unanimous CLEAN, zero findings, on
  a bar written to be missable and previously missed.

That is a real result. It is also 6 drafts on one blogger, judged by an instrument whose
blind spot in the other direction was discovered four days ago, with one failure I cannot
yet exonerate myself for.

---

# CORRECTION — 2026-08-15: two of the rate numbers above were wrong

**The verdicts, findings and bar result are unaffected.** The critic never saw these
numbers. What changes is §3's disclosure table and §6's reason 4.

FU-20's k=3 measurement produced three renders whose counts disagreed with the harness on
two habits. I initially read that as renderer instability. **It was not — the bugs were in
`corpus-rates.mjs`, and two of the three renders had them right.**

| habit | harness (buggy) | corrected | draw 1 | draw 2 | draw 3 |
|---|---|---|---|---|---|
| we/us/our | 168 | **127** | 120 | 169 | 121 |
| contraction | 424 | **300** | 296 | 417 | 285 |

1. **`/\bus\b/gi` matched the country.** This corpus is American political writing and
   contains 41 instances of `US`. That is the whole 168 → 127 gap, a 32% inflation.
2. **`[A-Za-z]+['’]s` counted possessives as contractions** — `earth's`, `world's`,
   `library's`, `boss's`. 228 of 424 matches ended in `'s`. Restricting `'s` to a closed
   host set gives 300, a 41% inflation removed.

Corrected corpus rates: **we/us 7.24 per 1000** (was 9.57), **contraction 17.09** (was
24.16). Both patterns now carry tests and mutations.

## What the correction does to §3

**The two `we/us` deficits are gone.** b04 and b08 were reported at 0.40× and 0.42×
against an inflated corpus rate; against the true rate they are **0.54× and 0.55×, both
in-band**. Every draft in this run is in-band on `we/us`.

**A real excess appears that the inflated rate was hiding:** b03 contraction at **2.12×**.
An inflated corpus denominator made over-contraction look normal.

Corrected table, all 24 cells:

| draft | profanity | we/us | 2nd person | contraction |
|---|---|---|---|---|
| v3 | 0.82× | 0.84× | 1.71× | 1.28× |
| b02 | 0.91× | 0.93× | 1.17× | 1.42× |
| b03 | 0.91× | 1.48× | 0.86× | **!2.12×** |
| b04 | 0.87× | 0.54× | 1.59× | 1.89× |
| b07 | 0.86× | 1.58× | 1.50× | 1.93× |
| b08 | 1.80× | 0.55× | 1.58× | 1.48× |

**1 flagged cell of 24**, not 2 — and a different one.

## What it does NOT change

- **b07's causal result stands.** Its `we/us` went from 0 instances to 9; zero is zero
  under either pattern.
- **The 2026-08-07 comparison stands.** Recomputed with the corrected patterns, that run's
  five drafts are still at deficit: 0×, 0×, 0.18×, 0×, 0×.
- **All second-person and profanity figures stand.** Neither pattern was touched.

## The part worth keeping

**Some of the cross-checks I reported as validation were two instruments sharing an
error.** Draw 2 reproduced both of my bugs independently — 169 and 417 against my 168 and
424 — so a renderer/harness agreement is weaker evidence than I treated it as. The genuine
agreements (second person 385/390/395, first person 109/110) still hold.

Nothing in the pipeline caught this. `checkRateArithmetic` passed, because each rate was
arithmetic on its own count. The harness cross-check passed, because both sides were
wrong the same way. **It was caught only because three independent draws disagreed with
each other**, which is an argument for k>1 on renders and not just on critiques.

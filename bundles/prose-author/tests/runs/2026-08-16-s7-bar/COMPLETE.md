# PI-02 · S7 — the bar, run against current prompts (2026-08-16)

**Result: BAR NOT CLEARED. 5 of 6 drafts pass. All 4 structural gates pass. b07 fails both
criteria.** Scored by `bar.mjs`, exit 1. The design was committed before any draft existed
(`0da6e34`); the bar is quoted verbatim from the 2026-08-07 pre-registration.

---

## 1. The result

```
  bar: majority CLEAN AND <= 1.0 findings/draw, conjunctive

  pass  v3    [0, 0, 0] mean 0.00 CLEAN
  pass  b02   [0, 0, 0] mean 0.00 CLEAN
  pass  b03   [0, 1, 0] mean 0.33 CLEAN
  pass  b04   [0, 0, 2] mean 0.67 CLEAN
  FAIL  b07   [0, 3, 1] mean 1.33 REVISE  <- majority REVISE, 1.33 findings/draw
  pass  b08   [0, 0, 0] mean 0.00 CLEAN

  drafts: 5 of 6        BAR NOT CLEARED
```

18 draws, 7 findings. Structural gates, produced by `run-gates.mjs`: fabricated citations
**pass**, corpus leakage **pass**, refusal when underdetermined **pass**, resemblance
claims **pass**.

**The refusal gate ran for the first time.** It has been in the pre-registration since
2026-08-07 and no acceptance run had exercised it. The drafter refused, and named which
decision it could not make: *"the profile records a register range that only a subject and
occasion could resolve... drafting would silently assert one."*

## 2. Why b07 failed

Two of three draws found the same thing with different evidence: the draft closes
paragraphs on quiet images — *"the way water closes over a stone"*, *"their hand is on the
sash"* — and the corpus's figures are comic, grotesque or mechanical, and always doing
argumentative work.

**The draws split on the same span, and the split is the interesting part.** Draw 1 named
that exact simile as the construction it most suspected, went looking, and cleared it on
finding *"...the way restaurants get to"* in the corpus. Draws 2 and 3 flagged it at high
confidence.

They were not judging the same thing. Draw 1 matched the **syntactic frame** — a trailing
`the way X` comparison, which is attested. Draws 2 and 3 matched the **function** — a
figure doing mood work rather than argument, which is not. The split resolved 2-1 and draw
1 was the outlier.

At k=1 either verdict would have been the answer.

## 3. The finding I verified, and it is the sharpest in the project

b04 draw 3 stated a defect as a falsifiable count. Every number checked out exactly:

| claim | verified |
|---|---|
| `", and which"` appears zero times in the corpus | **0 in 17,549 words** |
| the draft uses it | **3 times** |
| `"which is to say"` absent from the corpus | **0** (the author writes *"In other words"*, 6 times) |
| the draft over-uses `", which"` | **6.01/1000 vs corpus 1.54 — 3.9x** |

A syntactic habit the drafter has and the author does not, measurable in one grep — and
**every instrument in this repo missed it.** That is an argument for keeping the critic,
not for replacing it.

## 4. What the run established about the mechanism

Measured across all six drafts, every habit split by whether the profile gave it a number:

| | draft cells at >= half the corpus rate | cells at exactly zero |
|---|---|---|
| habits the profile **rated** | **34 of 36** | **0 of 36** |
| habits the profile **did not rate** | **0 of 12** | **12 of 12** |

Categorical, not a tendency. And the unrated observations were not vague — the profile
said `10/10 samples, several times per piece` for both.

**So the drafter acts on numbers and ignores phrases.** A support count and a frequency
phrase produced zero, six times out of six, on two separate habits.

This also settles an older worry in the opposite direction from what I assumed. I had
recorded that "the drafter does not reliably act on stated rates" (b02's zero first person,
FU-22's zero parentheses). It does act on them — reliably, 34 of 36. What it drops is
everything else.

**FU-22 is confirmed fixed by the same evidence.** The profile now rates the parenthesis
and the en dash; six drafts came in at 4.8/4.8/5.5/2.4/4.9/5.1 against a corpus 5.01, and
**not one em dash appeared in any of the six.** The rule I wrote telling the drafter to
interrupt itself did nothing. The number did all of it.

## 5. Why the renderer left those two habits unrated

Its stated reasons are honest and correct:

> No rate: I could not draw a line around "a figure" that I could apply the same way twice.
> No rate: the boundary of what counts as naming an opponent is not one I could apply consistently.

It genuinely cannot bound "a figure". But it conflated the concept it could not bound with
a component it could: **the vocabulary those figures are made of is trivially countable.**
Measured, the corpus draws on a body-and-indignity register at 0.80/1000 across 10/10
samples. All six drafts: **zero**.

That is the fix, and it is recorded in §6.

## 6. Honest limits

- **One corpus, one author, six drafts.** Unchanged.
- **The prompts are the 2026-08-11 topics.** Topic-matched, so a per-draft comparison
  against that run is fair; a comparison against 2026-08-07 is not, since that run stored
  no prompts.
- **A fabricated biographical fact went uncaught.** v3 asserts *"my employer's annual
  training"*; the author self-publishes. No gate covers it: no URL, not a voice property,
  and the drafter does not treat a fact about itself as a claim. **Not counted against this
  run** — the four gates are pre-registered and this is none of them. Recorded as a gap in
  the gate set.
- **A pronoun slip went uncaught.** b08 has *"the hours between owning our money"*. A
  critic flagged it as outside its remit. Nothing in the pipeline catches it.

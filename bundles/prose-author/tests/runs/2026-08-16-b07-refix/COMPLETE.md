# b07 re-fix — the fix did not work, and the reason is in the profile (2026-08-16)

**Result: 2 of 3 pre-registered predictions FALSIFIED. The countable-part rule changes the
profile and does not reach the draft.** Predictions committed in `dcede29` before the render
existed; checker committed in `dc2632e` before the draft existed.

---

## 1. The result

```
  P1 figure vocabulary   corpus 1.14/1000 (7/10)   draft 0 (0.00)   FALSIFIED

  P3 no collateral damage
     second person   corpus  21.94   draft  20.16   in band
     we/us           corpus   7.24   draft   4.48   in band
     contraction     corpus  17.09   draft   8.96   in band
     profanity       corpus   1.48   draft   1.12   in band
     parenthesis     corpus   5.01   draft   1.12   OUT OF BAND
     en dash         corpus   4.16   draft   3.36   in band
     em dash         corpus   0.00   draft      0   in band
```

**P1 falsified.** The profile rated the body-and-bodily-function vocabulary at 46 tokens,
2.64 per 1,000, 10/10 samples. The draft used it **zero** times — exactly as the six S7
drafts did when it was unrated.

**P3 falsified** on the parenthesis: 1.12 against a corpus 5.01, where all six S7 drafts
had landed between 2.40 and 5.46.

**P2 not reached.** No point critiquing for a finding about figures when the draft contains
none of the vocabulary the fix was meant to introduce.

## 2. Why P1 failed, and it is my fault

The profile's section 8, verbatim:

> The figure-building move in section 5 has no rate, for the reason given there: the two
> word lists are components of it, not measurements of it, and **a drafter should read them
> as raw material rather than as a target.**

The renderer produced the number and then instructed the drafter not to aim at it. The
drafter obeyed.

**That instruction is a correct reading of the rule I wrote.** The rule says to rate the
component and *"name it as the component, not as the whole"*. The renderer's honest way of
naming it as a component was to say it is not a target — which is true of the *whole* and
false of the *component*, and the rule gave it no way to say so.

So the fix produced a number wrapped in a disclaimer that cancelled it. The mechanism S7
identified — rated habits get written, unrated ones do not — did not fail. It was never
engaged, because the profile told the drafter this number was not the kind you aim at.

## 3. What the parenthesis miss is, and is not

The draft has one parenthetical in 890 words. Six S7 drafts ran 2.40-5.46 per 1,000 against
a corpus 5.01.

One difference is visible: in the S7 profile the parenthesis sat in section 5 among the
figures; in this render it sits in section 7, under *"What the corpus never does"* — a
section about absences. Whether section placement changes how a drafter weighs a rated
habit is a real question and **n=1 cannot answer it.** Recorded as an observation, not a
diagnosis.

## 4. What this does and does not overturn

**Does not overturn S7's mechanism.** 34 of 36 rated cells in band, 12 of 12 unrated at
zero, still stands. This run is consistent with it: the figure vocabulary was rated *and
disclaimed*, and behaved like an unrated habit.

**Does overturn my fix.** The countable-part rule as written reaches the profile and stops
there. Three renders applying it beautifully is not evidence that it works, and I said as
much before this run — *"whether it changes the draft is the actual question and it is
untested"* — which is the only reason this is a clean negative rather than a retraction.

**The rule is still worth keeping**, on separate grounds: it made the renderer state
reproducible word lists, and all four of its reproducible measures were verified exact
(46/46, 33/33, 73/73, 186/186). That is a real improvement in profile quality. It is just
not the fix for the S7 failure.

## 5. The amendment this points to

The tension the rule failed to resolve: a component is genuinely not a measurement of the
whole, **and is still a target for itself.** "Use this vocabulary at about this rate" is a
legitimate instruction even when "how many figures" remains uncounted.

The rule must say that, or the honest renderer will keep neutralising its own number.

## 6. Honest limits

- **One draft.** The failure is clean and diagnosed, but n=1.
- **P2 untested.**
- **The parenthesis regression is unexplained.**
- **One corpus.**

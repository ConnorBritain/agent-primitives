# The countable-part rule — the S7 failure, fixed at the source (2026-08-16)

**Result: 3 of 3 renders applied the rule and rated the figures section in full, where the
S7 profile had left it unrated. Draw 3 also exposed a trap in the rule, now closed, and a
bug in my own harness.**

---

## 1. What S7 established

Splitting every habit by whether the profile gave it a number:

| | draft cells at >= half the corpus rate | cells at zero |
|---|---|---|
| profile **rated** it | **34 of 36** | **0** |
| profile did **not** rate it | **0 of 12** | **12 of 12** |

The unrated observations were not vague. The profile said `10/10 samples, several times per
piece` for both. **The drafter acts on numbers and ignores phrases.**

And the two habits it dropped are exactly what b07 failed on: the corpus's figures are made
of body-and-indignity vocabulary and doing argumentative work; the drafts reached upward for
literary images doing mood work. Measured, the corpus uses that register at 0.80/1000 across
10/10 samples. All six drafts: **zero**.

## 2. Why the renderer left it unrated, and why that was half-right

Its reason was honest and correct:

> No rate: I could not draw a line around "a figure" that I could apply the same way twice.

It genuinely cannot bound "a figure". But it conflated the concept it could not bound with
a component it could — **the vocabulary those figures are made of is trivially countable.**

## 3. The rule

Before writing *no rate*, ask whether a well-defined component of the habit can be
enumerated. If so, rate the component and **name it as the component**, not as the whole.
The prompt states the measured reason it exists: whatever carries a number gets written,
whatever carries only words does not.

The rule explicitly does not license inventing numbers. The refusal stays available; what
changes is that it must be reached second, not first.

## 4. Result — both renders applied it, in the rule's own terms

**Draw 2**, section 5:

> Images come from the body and its waste. **I cannot draw a line around "a figure", so this
> is not a count of figures: it is a count of the vocabulary they are built from** —
> *orifice, asshole, piss, pee, bladder, balls, kidney, vagina, gut, throat, blood* — 18
> words, 8/10 samples, once or twice per piece (1.03 per 1,000).

**Draw 1**, section 5, which found four wells rather than two:

> I cannot draw a line around "a figure", so this is not a count of figures — it is a count
> of the vocabulary they are built from, using four word-lists of my own... 101 words,
> 10/10 samples, 5.79 per 1,000.

Both then did the same for the extended parable, rating only the comparison marker. Draw 1
added the caveat that makes it honest:

> which is the point, since most of the analogies carry no marker at all.

### The figures section, before and after

| | observations | rated |
|---|---|---|
| S7 profile | 4 | **1** |
| draw 1 | 2 | **2** |
| draw 2 | 3 | **3** |

## 5. Verification

Both renders' figure counts check out against the harness using their own stated word lists:

| claim | renderer | harness |
|---|---|---|
| body/waste vocabulary (draw 2) | 18 | 19 |
| simile marker (draw 2) | 14 | 14 |
| monarchy/priesthood (draw 2) | 53 | 50 |

And draw 1's rated habits generally:

| habit | draw 1 | harness | delta |
|---|---|---|---|
| second person | 390 | 385 | +1% |
| contraction | 298 | 300 | −1% |
| en dash | 72 | 73 | −1% |
| em dash | 0 | 0 | exact |
| profanity | 24 | 26 | −8% |
| we/us | 121 | 127 | −5% |

**Draw 1 independently avoided both regex bugs I shipped in `corpus-rates.mjs`** — it
excluded the uppercase country abbreviation from *we/us*, and restricted `'s` to elisions
rather than possessives, saying so in both cases.

## 5b. Draw 3, and the trap it found

Draw 3 applied the rule and picked a **third** countable component:

> I cannot draw a line around a figure, so this is not a count of figures: it is a count of
> **the manufactured compound**, the unit the figures are assembled from — 185 hyphenated
> compound words, 10.61 per 1,000.

**That number does not reproduce.** A plain hyphenated-compound count over the same corpus
gives 330. "Manufactured" is a judgement about which compounds are coinages — so the render
named the component but kept the decision it could not make hidden inside the name.

This is the fake-precision risk the rule was written against, walked into on its first
outing. The rule now requires the component be one **somebody else could count the same
way**, with the failing example in it, and it restates that `no rate` remains correct and
available — only its position changed, from first resort to second.

**Three renders, three different components** — four vocabulary wells, two wells plus
simile markers, hyphenated compounds. Each is defensible and each was named. That the
components differ is not a defect: "a figure" genuinely has several countable aspects. It
does mean two profiles of one corpus are not interchangeable, which is worth knowing.

## 5c. Draw 3 also found a bug in my harness

It reported the corpus's ten closing sentences as 13-46 words. My harness said 6-46, with
three at six and seven words. **My harness was wrong.** Those three are image credits —
`(Image: Kanerva T, CC BY 4.0, modified)` — publication furniture standing as its own
paragraph, which `paragraphEndings` was counting as a sentence the author wrote to close a
paragraph.

Fixed, with two tests: a credit line is excluded, and an ordinary paragraph that merely
opens on a parenthesis is not.

**Impact on FU-14, which used this measure**: corpus short-final 9.3% -> 8.4%, median final
sentence 28 -> 29, drift 1.22 -> 1.26. Three paragraphs of 301. The direction is unchanged
and slightly strengthened; the conclusion stands.

**Sixth time today a primitive found a defect in my measurement that no test did.**

## 6. Not yet established

- **No draft has been written from these profiles.** The rule demonstrably changes the
  profile. Whether it changes the draft is the actual question and it is untested.
- **b07 has not been re-drafted**, so the finding that failed the bar has not been shown to
  stop recurring.
- **One corpus.**

## 7. Incidental — FU-14's hypothesis rejected a third time

Draw 1's dropped-observation list includes:

> an impression that paragraphs end on their shortest sentence (**it did not hold when I
> checked**)

That is the belief FU-14's three failed fixes were built on, formed and rejected by a
renderer reading the corpus directly. Third independent rejection.

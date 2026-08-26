# The amendment reaches the draft (2026-08-16)

**Result: all three predictions hold. P1 and P3 measured; P2 returned [0, 0, 2], mean 0.67,
majority CLEAN — and no draw raised figures or decorative imagery, which is the axis the
S7 bar failed on.** Predictions committed in `dcede29`; checker in `dc2632e`. Neither was written
after seeing this draft.

---

## 1. The result

```
  P1 figure vocabulary   corpus 1.14/1000 (7/10)   draft 2 (2.67)   PASS

  P3 no collateral damage
     second person   corpus  21.94   draft  34.71   in band
     we/us           corpus   7.24   draft   8.01   in band
     contraction     corpus  17.09   draft  20.03   in band
     profanity       corpus   1.48   draft   1.34   in band
     parenthesis     corpus   5.01   draft   4.01   in band
     en dash         corpus   4.16   draft   4.01   in band
     em dash         corpus   0.00   draft      0   in band
```

## 2. What changed across three attempts

| | figure vocabulary | parenthesis |
|---|---|---|
| S7 drafts (six of them) | **0** | 2.40–5.46 |
| first fix — rated, then disclaimed | **0** | 1.12 ✗ |
| **amended — rated, and named a target** | **2 (2.67)** | **4.01** |

Every draft before this one used the vocabulary zero times. Both fixed versions handed the
drafter the same kind of number. The difference is one sentence.

The failed profile said:

> a drafter should read them as raw material rather than as a target

The amended profile says:

> Use that vocabulary at about this rate.

**Same number. Opposite outcome.** That is as close to a controlled result as this project
has produced: the corpus is identical, the topic is identical, the drafter prompt is
identical, and the profile differs in whether it tells the drafter to aim.

## 3. The amendment did not turn into "rate everything"

That was the risk. It did not happen. The amended profile still refuses three times, each
naming its reason:

> No rate: I cannot state a rule for where a figure starts and stops that a stranger would
> apply the same way.

> No rate: I cannot bound "a judgement" reproducibly.

> No rate: I cannot write a rule for "the term the piece has been contesting" that a
> stranger reproduces from the text alone.

Measured on the profile text: **0 neutralising caveats, 2 explicit rate instructions, 3
honest refusals.**

## 4. Incidental — the renderer derived FU-14 on its own

> Only 24% of short sentences end their paragraph, against a 40.5% baseline for all 733
> sentences — so if you want the flat verdict, **put it at the top of the paragraph and
> unpack it underneath, not at the bottom as a punch.**

FU-14 took six critic complaints and three failed fixes to reach that conclusion. The
renderer reached it from the corpus, quantified it, and wrote it as an instruction. It is
now in the profile rather than in a ticket.

## 5. P2 — the finding did not recur

`[0, 0, 2]`, mean 0.67, majority CLEAN. **Zero draws mentioned figures, mood-only imagery,
or decorative comparison.** That was the whole S7 failure and it is absent from all three.

Draw 3's two findings are new. The high-confidence one is uncontracted forms, and I
verified every countable claim in it: `cannot` 0, `could not` 0, `is not` 1, against
`isn't` 16, `can't` 11, `don't` 30, `it's` 46 vs `it is` 5. Its numbers run slightly below
mine because it excluded quoted material, which it said.

## 5b. The finding is the mechanism again, and I caused it

| profile | rates the absence? | draft's uncontracted forms |
|---|---|---|
| S7 | **yes** — "9 uncontracted negations in the whole corpus" | **2** (2.43/1000) |
| amended | **no** — the clause is gone | **8** (10.68/1000) |

The amended render improved section 5 and **silently dropped the uncontracted count the S7
render carried**. The draft's rate rose 4.4x and a critic caught it at high confidence.

**The contraction rate was in band the whole time** — 20.03 against a corpus 17.09. So a
rate can be correct while its paired absence is violated, because the absence carried no
number.

That is a sharper form of the same rule, and it is the fourth demonstration today: **it is
not enough to rate a habit. Where the habit has a near-zero counterpart, the counterpart
needs a number too.** Section 7's pairing rule already requires an absence be paired with
the positive habit occupying its place; what it does not require is that the absence carry
a count.

## 6. Not yet established
- **One draft.** The bar needs six drafts and eighteen draws.
- **One corpus.**
- **The two defects no gate catches** — a fabricated biographical fact and a pronoun slip —
  are untouched by any of this.

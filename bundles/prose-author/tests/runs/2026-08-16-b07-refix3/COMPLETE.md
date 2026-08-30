# The absence-count rule works, and it exposed the real problem (2026-08-16)

**Result: the absence prediction held almost exactly. P1 and P3 were falsified — and the
same mechanism explains all three. The problem is no longer the rule. It is that each
render rates a different subset of habits.**

---

## 1. The absence-count rule: it worked

| | uncontracted forms | rate |
|---|---|---|
| corpus | 26 | **1.48/1000** |
| draft, absence NOT counted (refix2) | 8 | 10.68/1000 |
| **draft, absence counted (refix3)** | **1** | **1.37/1000** |

8 to 1, landing within 8% of the corpus rate. The profile said *"only 10 uncontracted
negations in all 17,418 words... **Do not write is not, cannot, does not or it is; he does
not.**"* The draft contains one `it is` and nothing else.

Every absence count in that profile verified exactly against the harness: 10 uncontracted,
0 em dashes, 0 double hyphens. The renderer also split the 10 further than the rule asked —
**4 inside block quotes from other writers, 6 in his own prose.**

## 2. P1 and P3 falsified — by the same mechanism

```
  P1 figure vocabulary   corpus 1.14/1000   draft 0 (0.00)   FALSIFIED
  P3 parenthesis         corpus 5.01        draft 0.00       OUT OF BAND
```

Both dropped to zero. And both were **absent from this profile**:

| habit | refix2 profile | refix3 profile | refix2 draft | refix3 draft |
|---|---|---|---|---|
| parenthesis | rated 5.05 | **not present** | 4.01 | **0.00** |
| body vocabulary | rated | **not present** | 2.67 | **0.00** |
| monarchy vocabulary | not present | rated 2.76 | — | — |
| uncontracted forms | not counted | **counted** | 10.68 | **1.37** |

Nothing regressed in the drafter. The drafter did exactly what it has done all day: it
wrote what carried a number and dropped what did not.

## 3. So the finding is not about the rule any more

The mechanism is now confirmed five times, in both directions:

1. rated habits reproduced 34/36; unrated 0/12 (S7)
2. rated-then-disclaimed behaved as unrated (refix1)
3. rated as a target reproduced (refix2)
4. absence counted -> reproduced at corpus rate (refix3)
5. **habit dropped from the profile -> dropped from the draft** (refix3, twice)

The rule is reliable. **What is unreliable is which habits a given render decides to
rate.** Three renders of one corpus produced three different subsets. Fixing one gap
opened two others, not because the fix was wrong but because the renderer re-chose what to
cover.

## 4. What this means for the bar

**Running the full bar now would be measuring one arbitrary subset.** A draft's score
would depend on which habits that day's render happened to include, which is not a property
of the generator worth certifying.

Two candidate fixes, and this run cannot choose between them:

1. **Union across k=3 renders.** Rate a habit if any render rated it. Cheap, uses the
   sampling policy already in force, and risks a profile bloated with weakly-supported
   observations.
2. **A required-coverage list.** The register checklist already forces the renderer to
   *look* at certain dimensions; it does not force it to *rate* them. Extending it would
   make coverage deterministic and risks the tell-list failure the whole bundle avoids.

## 5. Honest limits

- **One draft per condition.** The uncontracted result is dramatic (8 to 1) but n=1.
- **P2 not run.** No critic saw this draft.
- **One corpus.**
- The two defects no gate catches are untouched.

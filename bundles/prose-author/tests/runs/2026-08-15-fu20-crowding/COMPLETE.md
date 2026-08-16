# PI-02 · FU-20 — the hypothesis was wrong and the measurement was worth more (2026-08-15)

**Result: FU-20's claim is refuted. The k=3 measurement found two different problems, one
of them in my own instrument, and both are now fixed or ticketed.**

Artefacts: `raw/draw1.json`, `raw/draw2.json` (draw 3 counts recorded below).

---

## 1. The claim, and why it is refuted

FU-20 said: requiring rates crowds out observations that cannot carry one, and b04 failed
on such an observation. Evidence was a single render at 24 observations against a pre-rate
render at 34.

Three renders under the current prompt, same corpus:

| | observations | rated | unrated | dropped |
|---|---|---|---|---|
| FU-12 render (no rate rule) | 34 | — | 34 | 8 |
| FU-19 render (triggered the ticket) | 24 | 14 | 10 | 6 |
| **draw 1** | **30** | 14 | 16 | 9 |
| **draw 2** | **30** | 13 | 17 | 7 |
| **draw 3** | **38** | 12 | 26 | 10 |

**The 24 was a low draw.** Unrated observations run 16–26 under the rate rule. There is no
suppression effect. The ticket blamed a cause that does not exist, and the only reason that
is now known is that the measurement was run at k=3 instead of comparing two renders.

## 2. The harness was wrong, not the renderer

The three draws disagreed with `corpus-rates.mjs` on two habits. My first reading was
renderer instability — "draw 1 is 30% low". **That was backwards.**

| habit | harness (buggy) | corrected | draw 1 | draw 2 | draw 3 |
|---|---|---|---|---|---|
| we/us/our | 168 | **127** | 120 | 169 | 121 |
| contraction | 424 | **300** | 296 | 417 | 285 |

**Bug 1 — `/\bus\b/gi` matched the country.** 41 instances of `US` in a corpus of American
political writing, counted as the pronoun. 32% inflation.

**Bug 2 — `[A-Za-z]+['’]s` counted possessives as contractions.** 228 of 424 matches ended
in `'s`: `earth's`, `world's`, `library's`, `boss's`, `wilhoit's`. 41% inflation.

Draws 1 and 3 land within 6% of the corrected values. **Draw 2 reproduced both of my bugs
independently** (169, 417), which is the more instructive result.

Both patterns now carry tests naming the bug and mutations that kill on reintroduction.

## 3. What the correction changed downstream

Corrected corpus rates: **we/us 7.24** per 1000 (was 9.57), **contraction 17.09** (was
24.16). Applied to the S6 re-run:

- **The two `we/us` deficits were false.** b04 and b08 are 0.54× and 0.55× — in-band. Every
  draft in that run is in-band on `we/us`.
- **A real excess was hidden by the inflated denominator:** b03 contraction at **2.12×**.
- Flagged cells 2 → 1, and a different cell.

Unaffected: b07's causal result (0 → 9 instances; zero is zero under either pattern), the
2026-08-07 comparison (still 0×, 0×, 0.18×, 0×, 0× on we/us), and every second-person and
profanity figure.

## 4. The methodological finding

**Nothing in the pipeline caught this.**

- `checkRateArithmetic` passed — each rate *was* arithmetic on its own stated count.
- The renderer/harness cross-check passed — both sides were wrong the same way.

It was caught only because **three independent draws disagreed with each other.** Two
instruments agreeing is weaker evidence than I have been treating it as, and several
"cross-check confirms" claims in earlier run docs were partly two instruments sharing an
error. The genuine agreements — second person at 385/390/395, first person at 109/110 —
still hold.

**Practical consequence: k>1 belongs on renders, not just on critiques.** A single render
is a single measurement of a corpus, and this project has now measured the same quantity
wrongly three separate times.

## 5. The named-source habit is a renderer blind spot

b04 failed 3/3 on "never routes an argument through a named person". **None of the three
new renders records that habit.** Closest: draw 1's "agency is assigned to a named company
or person" (who gets the verb) and draw 3's "positions are attributed to a person or a
company with a link". Neither is the corpus's move — *"As Weil writes," "As Quiggin
notes"* — where the argument is carried by handing the floor to a named source.

The pre-rate FU-12 render had it. **So it appears in 1 of 4 renders**, which makes it an
unreliable catch rather than a regression FU-19 introduced.

The register checklist covers person, contraction, hedging, naming the opposition,
profanity and self-reference. It has nothing about **whose words carry the argument.**
Filed as **FU-21**.

## 6. Effect on the hold

**None. Both primitives stay `ships: false`.**

One reason for the hold is retired: b04's failure is *not* attributable to FU-19. One is
added: the harness that produced the S6 disclosure numbers had two inflation bugs, and the
run doc's rate table needed correcting after the fact.

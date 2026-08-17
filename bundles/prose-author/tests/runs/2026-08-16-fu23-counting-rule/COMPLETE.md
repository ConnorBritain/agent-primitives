# FU-23 — a count is only reproducible if the rule that produced it is stated (2026-08-16)

**Result: the fix works. Every disagreement between the renderer and the harness is now
traceable to a rule the render states in its own prose — and the renderer independently
applied all three counting bugs I had to fix in my own harness.**

---

## 1. The problem

Three renders of one corpus counted contraction at 144, 126 and 86 — a 1.7× spread — because
each resolved an ambiguity differently and none said which way. `checkRateArithmetic` passed
all three, since each was arithmetic on its own count. The verifier built for FU-19 option 3
cannot see this class of error.

## 2. The fix

The renderer must state its counting rule in the prose wherever a habit admits more than
one, and must resolve two ambiguities explicitly: what counts as an instance, and which
samples are in scope. Narrowing the denominator silently is forbidden.

## 3. Result — every delta is now explained

| habit | renderer | harness | delta | stated rule |
|---|---|---|---|---|
| second person | 390 | 385 | **+1%** | *"counting a contraction like you're once as you"* |
| solidaristic *we/us* | 123 | 127 | **−3%** | *"counted case-sensitively so the country abbreviation US is excluded"* |
| contraction | 193 | 300 | −36% | *"counting n't, 're, 've, 'll, 'm and 'd, with 's excluded entirely because it is ambiguous with the possessive"* |
| profanity | 17 | 26 | −35% | *"counting occurrences inside quoted matter and excluding the coinage dickover"* |

**The two large deltas are no longer variance — they are two defensible conventions, each
declared.** The renderer excludes `'s` from contractions entirely; the harness includes a
closed host set. A reader can now reconcile the numbers instead of guessing which is wrong.

That is the whole point of the fix. The spread has not been eliminated, and eliminating it
was never the goal — a number nobody can reproduce was.

## 4. The renderer independently found three of my own bugs

Unprompted, and stated as counting rules:

| rule the render states | the bug it corresponds to |
|---|---|
| *"counted case-sensitively so the country abbreviation US is excluded"* | **FU-20 bug 1** — `/\bus\b/gi` matched the country 41 times, a 32% inflation |
| *"with 's excluded entirely because it is ambiguous with the possessive"* | **FU-20 bug 2** — 228 of 424 matches were possessives, a 41% inflation |
| *"excluding the coinage dickover"* | the open-suffix bug — `dick\w*` matched a coined term 28 times |

All three are errors I shipped in `corpus-rates.mjs` and had to fix after independent
renders disagreed with me. The renderer reached the same three conclusions from the corpus
alone and, under the new rule, wrote down why.

## 5. It also corroborated FU-22 and priced its own limits

**FU-22.** The render records **both** interrupting marks with rates — parentheses 86
(4.93/1000) and dashes 72 (4.13/1000) — against the harness's 88 (5.01) and 73 (4.16), a
2–3% agreement. That is independent confirmation of FU-22's re-diagnosis: the corpus splits
its interruption budget across two marks, and the drafts spend it all on one.

**Its own limits, unprompted:**
- *"The samples are HTML scrapes that still carry entity residue... the two typographic
  observations may reflect the scraper's normalisation rather than the author's keystrokes,
  and should be treated as weaker than the grammatical findings."*
- *"Paragraph rhythm — how long a paragraph runs and where it breaks — is not counted here. I
  read it as short, but I did not measure it and will not assert it."*

The second is a refusal to state an observation it could not back — the behaviour the whole
primitive is arranged around, applied to a habit that another ticket in this project spent
six critic complaints getting wrong.

## 6. Honest limits

- **k=1.** One render under the new rule. The 1.7× spread was found at k=3, and confirming
  the fix properly needs k=3 too.
- **The fix makes counts *reconcilable*, not *identical*.** Two renders could still differ
  by 1.7× and both be correct under this rule, provided both say what they did. Whether that
  is enough for a drafter given a target is a separate question and is not settled here.
- **One corpus.**

---

## 7. Second corpus, and the fix converges

A render of `eff-mullin` under the same rule. Contraction is the habit FU-23 was filed for —
it varied **144 / 126 / 86** across three renders of that corpus before the fix.

| habit | renderer | harness | |
|---|---|---|---|
| **contraction** | **86** | **86** | **exact** |
| solidaristic *we/us* | 15 | 19 | renderer counts author-voice only |
| second person | 9 | 11 | renderer excludes quoted matter |

**The contraction count is now exact**, and the reason is visible in the render's own prose:

> *"counting `n't`, `'re`, `'ve`, `'ll`, `'d`, `'m`, and `'s` only where `'s` is an elision
> (`it's`, `that's`, `there's`, `here's`) and not a possessive; straight and curly
> apostrophes both counted."*

That is the same rule `corpus-rates.mjs` implements, arrived at independently and written
down. **When two counters state their rules and the rules agree, the counts agree.** That is
the fix doing exactly what it was built to do, and it is stronger evidence than the
doctorow render, where the rules differed and the numbers differed accordingly.

## 8. FU-21's checklist working in the negative

The same render records the named-source habit as **absent**, paired with what occupies its
place:

> *"Nothing here shows the writer handing the floor to a named individual and building on
> their term — allies appear as institutions and coalitions, never as *as X writes* or *what
> Y calls* — 11/11 samples. A drafter has no evidence for how this voice cites a person it
> agrees with."*

FU-21 added that checklist row after b04 failed 3/3 on the habit's absence from a profile.
Here the renderer checks for it, finds it absent, and says so as a **gap** — which is what a
drafter needs, and what the absence-pairing rule requires.

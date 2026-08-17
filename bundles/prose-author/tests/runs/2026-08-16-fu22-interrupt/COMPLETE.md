# FU-22 — the prompt fix failed, and the measurement re-diagnosed the defect (2026-08-16)

**Result: the rule I added changed nothing — zero parentheticals before and after. But
measuring the fix's failure showed the diagnosis was wrong. The drafter is not failing to
interrupt itself; it is interrupting itself with exactly one mark where the corpus uses
two.**

---

## 1. The fix, and its failure

FU-22 said the drafter never interrupts itself. I added a rule to `voice-draft`: the habits
you will silently drop are the ones that break your own sentence — parenthetical asides,
questions to the reader — so count them before you finish.

Re-drafted b07 and b08 under it:

| | parentheticals | question marks |
|---|---|---|
| corpus | **5.01/1000** | 2.17/1000 |
| b07 before | 0 | 0 |
| **b07 after** | **0** | **0** |
| b08 before | 0 | 1 |
| **b08 after** | **0** | 1 |

**No change.** A prompt rule naming the habit, explaining why it gets dropped, and
instructing the drafter to count, produced zero additional instances across two drafts.

## 2. What the failure revealed

Measuring *all* interrupting punctuation, not just parentheses:

| mark | corpus | b07 | b08 |
|---|---|---|---|
| em dash `—` | **0.00** | 2.60 | 7.79 |
| en dash `–` | **4.16** | **0.00** | **0.00** |
| parenthesis | **5.01** | **0.00** | **0.00** |
| **total** | **9.17** | 2.60 | 7.79 |

**The corpus never uses an em dash. The drafts use nothing else.**

So the original diagnosis was wrong. The drafter *does* interrupt itself — b08 reaches 85%
of the corpus's total interruption rate — but spends the entire budget on a single mark the
author never uses, while never touching the two he does.

That is a **monoculture**, not an absence, and it explains why the prompt rule failed: the
drafter was not declining to interrupt. It was already interrupting, at roughly the right
rate, and had no reason to think anything was wrong.

## 3. Why nothing caught this earlier

The em-dash-vs-en-dash difference has been noticed repeatedly by voice critics and
**dismissed every time as formatting rather than voice** — correctly, under their own rules,
since it does not survive being read aloud.

But the substitution is not typographic. The corpus's en dash and parenthesis are two
*different* moves — a dashed turn keeps the sentence's spine, a parenthesis steps outside it
— and collapsing both onto one mark loses the distinction regardless of which glyph is used.
The critics were right that the glyph does not matter and wrong that nothing mattered.

## 4. What FU-22 should now say

**Not** "the drafter never interrupts itself" — measurably false.

**Instead:** the drafter has one interruption move where the author has two, and it is the
one the author never uses. The renderer already records the parenthetical with a rate; what
neither prompt records is that the corpus's interruptions are *split across two marks with
different jobs*.

**Revised ship criterion.** Drafts show non-zero parentheticals AND non-zero dashed turns,
with the combined rate within the band, rather than the whole budget on one mark.

## 5. Honest status

**The fix is not landed.** The rule is in the prompt and does nothing measurable. I am
leaving it in — it is accurate and costs nothing — but it is not the fix, and calling FU-22
done on the strength of having edited a prompt would be exactly the mistake FU-14 took three
attempts and six critic complaints to stop making.

**n = 2 drafts, one corpus.**

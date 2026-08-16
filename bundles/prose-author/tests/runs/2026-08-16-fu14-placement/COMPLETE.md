# PI-02 · FU-14 — placement, not frequency (2026-08-16)

**Result: the diagnosis holds. 2 of 3 drafts land at or above the corpus, the third drifts
slightly the wrong way, and 6 critic draws across two of them returned zero findings. FU-14
stays open on a technicality that matters: the drafts that drew the original finding have
not been re-drafted.**

---

## 1. The diagnosis

Six critic complaints across three fixes, all of the form *"every paragraph lands on a
short epigrammatic kicker"*. All three fixes told the drafter to use **fewer** epigrams.
All three failed, and every measure built to check them counted short sentences
**anywhere** in the draft — on which the problem read as solved (0.11 against a corpus
0.12) and the measure was retracted as invalid.

The critic was never talking about short sentences in general. Measuring **paragraph
endings** separately splits the two apart:

| | short final (≤8w) | median final | drift |
|---|---|---|---|
| **corpus** | **9.3%** | **28** | **1.22** |
| b07 (08-07, flagged) | 27.3% | 10 | 0.77 |
| b08 (08-07, flagged) | 37.5% | 11 | 1.00 |

`drift` is median-final ÷ median-overall. **The corpus ends paragraphs LONGER than it
writes generally.** Its short flat verdict is real and lands *inside* a paragraph or
stands alone — it is not where the paragraph comes to rest. The flagged drafts do the
opposite.

That is why "use fewer epigrams" could never work: the corpus's epigram count is not the
variable. **Placement is.**

## 2. The fix

`voice-draft`'s paragraph-endings rule now says: write down the length of every
paragraph's last sentence and compare the list against your typical sentence. If the
endings run conspicuously shorter, you are ending on the beat every time. **Do not delete
the verdicts — move them**, so the argument continues past them and the paragraph ends on
an ordinary sentence.

The prompt keeps the old warning that word-count cannot identify an individual epigram —
that is still true — and adds that counting them **as a set** detects the drumbeat, which
no per-sentence check can.

## 3. Result — mixed, and the negative is on the draft that needed it least

Three drafts, same profile, only the drafter prompt changed:

| draft | topic | short final | median final | drift |
|---|---|---|---|---|
| corpus | — | 9.3% | 28 | **1.22** |
| **b10** | device lifespan | **0.0%** | 31 | **1.55** |
| **b09** | algorithmic scheduling | 11.1% | 21 | **1.00** |
| **b04** | ad-tech targeting | 12.5% | 19 | **0.90** |

**b10 is clean** — zero short endings, median final above the corpus.

**b09 sits at drift 1.00** — endings level with its prose. Not the corpus's 1.22, but well
clear of the 0.77 that drew a high-confidence finding.

**b04 is the negative, and it is the weak case.** Its predecessor under the *old* prompt
was already at 0% short-final and drift 1.18 — at the corpus, nothing to fix. Under the
new rule it moved to 12.5% and 0.90. One draw, on a draft not exhibiting the defect, so
this is evidence the rule can cost something where there was no problem.

**No draft reaches the 0.77 / 27–37% range that produced the original findings.**

## 4. Critics ran — 6 draws, 0 findings

k=3 on b09 and b10, judged against the corpus directly:

| draft | findings | mean | verdicts |
|---|---|---|---|
| b09 | 0, 0, 0 | **0.00** | unanimous CLEAN |
| b10 | 0, 0, 0 | **0.00** | unanimous CLEAN |

Both at the human-writing baseline. **The epigram finding did not appear on any draw**, and
several draws affirmatively cleared the rhythm category with corpus citations — *"long
periodic sentences punctuated by short declaratives... the corpus varies identically."*

b04 was not re-critiqued here; its k=3 under FU-21 returned [2,0,0] and neither finding was
about paragraph endings.

## 5. Why this is STILL not called done

- **These are the wrong drafts to prove the fix.** My own ship criterion says re-draft
  **b07 and b08** — the two that actually drew the original finding — and check it does not
  recur. b09 and b10 are new topics. Six clean draws show the rule does no harm and that
  drafts written under it pass; they do not show it repairs the drafts that were broken.
  That test is still outstanding and is cheap.
- **b04 got worse on the deterministic measure.** Small, one draw, on the least informative
  case — its predecessor was already at the corpus. The critics did not flag it, but the
  drift number moved the wrong way and the rule now has a cost as well as a benefit.
- **n = 3, one corpus.**
- **The measure's known limit is real:** it cannot tell an epigram from a flatly expository
  short sentence. It detects the set-level drift, which is what the critic sees, and
  nothing finer.

**Ship criterion, restated for the next attempt:** re-draft the two drafts that drew the
original finding (b07, b08 at 08-07) under the placement rule, run k=3 critics, and require
that the epigram finding does not recur AND that drift stays ≥ 1.0.

## 5. What is established

**The six-appearance finding is diagnosed** after three failed fixes, and the diagnosis is
falsifiable and was checked before being acted on — it survives dropping the paragraph word
floor, which is what killed every earlier epigram measure.

**An independent render agreed.** One of the FU-21 renders formed and then dropped the
observation *"that paragraphs end on their shortest sentence"* for lack of support — a
renderer reading the corpus directly declined to record the very belief the three failed
fixes assumed.

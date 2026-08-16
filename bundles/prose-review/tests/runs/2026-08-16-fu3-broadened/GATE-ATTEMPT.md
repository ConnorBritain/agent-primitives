# FU-3 gate attempt — INVALID RUN, and a real doubt about my fixtures

**Result: the run is not a gate result. I dispatched the fidelity critic without the
`fidelity-scan` output its contract expects, and all four critics said so. Separately, the
verdicts raise a substantive doubt about how I authored the fixtures.**

---

## 1. What I got wrong

The harness stages three inputs for this critic: original, revision, and **the output of
`fidelity-scan` over the pair** (`run-harness.mjs:234`). I dispatched with two.

All four critics flagged it unprompted:

> *"no `fidelity-scan` output was supplied with this task, so there is no flagged-atom list
> to account for... this section is empty rather than complete."*
> *"Presence claims here are therefore uncorroborated by a string comparison; treat the
> account of losses as possibly incomplete."*

**These verdicts cannot be compared against the v3 gate**, which ran with the scan. Fourth
time in this session a primitive reported a defect in my setup that no test caught.

## 2. The verdicts, recorded but not counted

| fixture | author | expected | got |
|---|---|---|---|
| f09 | Chesterton | FAITHFUL | MATERIAL-LOSS |
| f10 | Darwin | FAITHFUL | MATERIAL-LOSS |
| f15 | EFF | FAITHFUL | MATERIAL-LOSS |
| **f14** | Darwin, safety net | **MATERIAL-LOSS** | **MATERIAL-LOSS** ✓ |

**f14 is the one result that survives.** The safety net catches an authorised cut that drops
a concrete fact — *"the duration of the drought... the fact that converts a general
description of the climate into a report of an observed extreme"* — on a non-Chekhov corpus.
That is what the fixture was built to test and it passed. A missing scan cannot manufacture
a MATERIAL-LOSS, so this direction is robust to the defect.

## 3. The doubt about my fixtures, which is not explained by the missing scan

Three critics, three authors, three independent runs, the same class of argument:

- **f09** — *"'really' marks the condition as counterfactual... without it the clause reads
  as a neutral open condition, and the reader can no longer tell that Chesterton is denying
  the antecedent rather than entertaining it."*
- **f10** — *"the degree of the general verdict is downgraded from an emphatic one to a mild
  one, so the reader can no longer see how wide the gap is between the common judgement and
  Darwin's own, which is the whole point of the contrast the sentence sets up with 'but'."*
- **f15** — *"'actually' is contrastive here, not decorative — it marks the companies as the
  real owners as opposed to the paying customer, which is the sentence's whole point."*

Each says the deleted intensifier was **load-bearing**, and each names the specific work it
was doing. None of that reasoning depends on the scan, which is blind to this class by
construction — all three critics say so explicitly.

**I built six of the seven fixtures around one edit type: delete an intensifier.** I modelled
them on f01, which is a word *swap* ("roared" → "burst out"), and assumed deletion was
equally safe. The critics are arguing it is not: a swap preserves the slot, a deletion
removes a contrast marker.

If they are right, `expected: FAITHFUL` is wrong on those fixtures and the fixture set tests
much less than intended — six near-identical edits of a kind that may be inherently
material.

## 4. What has to happen before FU-3 can be called done

1. **Re-run with the scan staged.** Use the harness rather than hand-dispatching, which is
   how this went wrong.
2. **Then decide the fixtures on the evidence, not on my prior.** If the intensifier
   deletions still return MATERIAL-LOSS with the scan present, the honest move is to
   re-classify them — a fixture's `expected` is a hypothesis, and three independent critics
   contradicting it is data. Changing the fixture to make the run pass would be exactly the
   tuning `fixtures.json` forbids.
3. **Author at least one faithful-side fixture that is a swap, not a deletion**, so the
   faithful side is not resting entirely on one contested edit type.

**FU-3 stays open**, and the reason is now sharper than "the gate has not run": the gate has
not run *validly*, and the fixture set it would run against is under legitimate suspicion.

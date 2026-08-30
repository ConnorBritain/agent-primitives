# prose-reviser · FU-3 — one author to seven (2026-08-16)

**Result: the reviser axis holds across all seven registers — 7 of 7 match their
pre-recorded expectation. The fidelity gate re-run is NOT done, so the ship-bar question
FU-3 asked is still open.**

---

## 1. Why

All 11 reviser fixtures were Chekhov letters. The k=21 stability data showed the critic
sits near 50% on some word swaps, and nobody knew whether that was Chekhov-specific. A
primitive calibrated on one voice and shipped for any voice is calibrated on nothing in
particular.

## 2. The new fixtures

Seven, chosen so that register varies as much as the corpus allows:

| fixture | author | register |
|---|---|---|
| f09 | Chesterton | whimsical-digressive essay |
| f10 | Darwin | observational scientific narrative |
| f11 | Huxley | didactic lecture, first-person, addressed |
| f12 | Chopin | third-person fiction, free-indirect style |
| f13 | O. Henry | refusal case |
| f14 | Darwin | safety net |
| f15 | EFF Deeplinks | contemporary advocacy, 2026 |

**f11 is the control.** Didactic lecture is the nearest register to Chekhov's letters, so
if it behaves and the others do not, the difference is register rather than authorship.

**f15 needed a mechanism.** The manifest had one `corpus_root` pointing at the Gutenberg
tree, so no contemporary sample could be declared at all. Fixtures may now override
`corpus_root` per entry — the alternative was leaving the corpus period-locked, which is
the limitation this ticket exists to remove.

Every fixture keeps the anti-tuning rule: `original.md` is byte-identical to a corpus file
I did not write, every plan quote appears verbatim in it, and both are enforced by the
selftest (240 → 282 assertions).

## 3. The reviser axis — 7 of 7

| fixture | expected | got |
|---|---|---|
| f09 Chesterton | applied | **applied** |
| f10 Darwin | applied | **applied** |
| f11 Huxley | applied | **applied** |
| f12 Chopin | applied | **applied** |
| f15 EFF | applied | **applied** |
| f13 O. Henry | refused | **refused** |
| f14 Darwin | applied | **applied** (after re-authoring — see §5) |

**Refusal is not Chekhov-specific.** f13's reason enumerated the three distinct edits
*"tighten the opening"* could mean — cut "impressively", cut the second sentence, or merge
the two — and refused because none is determined by the entry. That is the f07 behaviour
reproduced in a new author with independent reasoning.

**f09 is the best individual result.** It logged two things under
`noticed_but_not_edited`: that the plan's line number was wrong and it had matched on the
verbatim quote instead, and that the same word appeared again later and **was not named by
the plan**. It edited neither. The second is the authorisation-set rule holding against an
obvious, adjacent, unauthorised improvement.

## 4. What is NOT established

**The fidelity gate was not re-run.** FU-3's ship criterion is the k=7 gate under Path A
with the v3 bar (faithful side ≥ 5 of N, safety net all pass). That is 7 fixtures × 7
draws = 49 dispatches and it has not run. **So the question FU-3 actually asked — is the
critic's stability voice-dependent? — remains unanswered.** What this run establishes is
that the reviser's own behaviour is not.

Everything the gate needs is checked in: fixtures, plans, expectations, and the reviser
change logs. The re-run is a separable next step, not a redesign.

## 5. My fixture was wrong before the reviser was

f14's first plan authorised cutting `"rains very seldom, but during a short portion of the
year heavy"`. **The reviser refused it, and was right to.** That span is not a
self-contained clause: it starts after the subject `It` and ends on `heavy`, which modifies
`torrents` outside the quote. Cutting exactly the named span yields broken text, and
repairing it would require editing outside `location.quote`, which the plan does not
authorise.

I authored that quote by pattern-matching a hedge word across a hard-wrapped corpus without
reading the sentence. The reviser caught the defect, named the mechanism precisely, and
refused rather than produce a plausible repair.

Re-authored to cut `"It had not now rained for an entire year."` — a self-contained
sentence carrying a concrete duration, which is a clean material loss the gate should
catch. **That is what a safety-net fixture is supposed to be**, and the first version was
not one.

## 6. Honest limits

- **One edit per fixture.** The Chekhov set has a multi-entry case (f04); the new set does
  not, so multi-entry behaviour is still measured on one author only.
- **Six of seven are the same edit type** — an intensifier cut. That isolates register
  cleanly and tests nothing about edit variety.
- **No k=7 gate run**, per §4.
- **The safety net outside Chekhov is authored but unmeasured.** f14 now has a
  well-formed plan; whether the gate catches the loss is exactly what the un-run gate would
  tell us.

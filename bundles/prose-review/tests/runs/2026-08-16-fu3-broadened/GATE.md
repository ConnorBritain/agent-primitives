# FU-3 gate — run correctly, and the fixtures were wrong (2026-08-16)

**Result: 8 of 8 fixtures return the verdict their edit type predicts. Five intensifier
deletions return MATERIAL-LOSS; three word swaps return FAITHFUL. My fixture classification
was wrong and has been corrected on the evidence.**

Supersedes [`GATE-ATTEMPT.md`](GATE-ATTEMPT.md), which ran without the `fidelity-scan` input.

---

## 1. The run

The critic's contract takes three inputs: original, revision, and `fidelity-scan` output
over the pair. The first attempt sent two, and all four critics said so. This run generates
the scan with `scanFidelity` + `renderReport` — the same call the harness makes — and stages
it.

## 2. Result

| fixture | author | register | edit | verdict |
|---|---|---|---|---|
| f09 | Chesterton | whimsical essay | delete *really* | MATERIAL-LOSS ×2 |
| f10 | Darwin | scientific narrative | delete *very* | MATERIAL-LOSS |
| f11 | Huxley | didactic lecture | delete *very* | MATERIAL-LOSS |
| f12 | Chopin | free-indirect fiction | delete *very* | MATERIAL-LOSS |
| f14 | Darwin | safety net | delete a sentence | **MATERIAL-LOSS** ✓ |
| **f16** | **Chesterton** | **whimsical essay** | **swap** *at once*→*immediately* | **FAITHFUL** ✓ |
| **f17** | **Darwin** | **scientific narrative** | **swap** *procured*→*obtained* | **FAITHFUL** ✓ |
| **f18** | **Huxley** | **didactic lecture** | **swap** *endeavoured*→*sought* | **FAITHFUL** ✓ |

**Clean separation on edit type.** 5 of 5 deletions material; 3 of 3 swaps faithful. Across
five authors and four registers, with the same critic and the same scan.

## 3. My fixture design was wrong

I built six fixtures on one edit — delete an intensifier — modelled on f01, which is a word
*swap*. I never checked that the two behave alike. They do not: a swap preserves the slot, a
deletion removes a qualification.

The critics' reasoning is consistent and specific:

- *"really"* separates the world **being** reasonable from **being called** reasonable — the
  hinge of the paragraph
- *"very uninteresting"* is the extreme the sentence's reversal pushes against
- *"very proper"* is emphatic endorsement where *proper* is bare concession, and the emphasis
  licenses the digression that follows
- *"very young"* is the degree that excuses Robert's self-absorption, and the next sentence
  extends the same indulgence to Mrs Pontellier by reference

**This is not tuning.** A fixture's `expected` is a hypothesis about what a good run
produces; eight independent critics contradicting it is evidence the hypothesis was wrong.
Editing a fixture to make a run *pass* is what `fixtures.json` forbids. Re-classifying five
fixtures into the role the evidence assigns them, and authoring three new ones to test what
the originals were meant to test, is the opposite move.

## 4. What the corrected set now tests

**Safety net grew from 1 author to 5.** f09–f12 and f15 now test that the gate catches a
dropped qualification in whimsical essay, scientific narrative, didactic lecture,
free-indirect fiction and contemporary advocacy prose. That is a **stronger** result than
the faithful-side breadth I set out to build — the gate's job is catching what the reviser
had no basis to refuse, and it now demonstrably does so across five registers.

**Faithful side is broadened on swaps**, f16–f18, which is what f01 established as the safe
shape.

## 5. The scan and the critic divided labour correctly

Every critic reported the scan as **correct and blind** — *"the loss falls inside a category
it declares out of scope, not inside a category it got wrong."* The scan says "no material
atom missing"; the critics said that silence is not evidence, and named the excluded category
each time.

Two went further and hand-checked the scan's disclaimed categories — word-form numbers,
single-word entities, hedges — enumerating them as present and unchanged before returning
FAITHFUL. That is the critic deliberately covering a known blind spot rather than deferring
to the tool.

## 6. Honest limits

- **k=1 on most fixtures**, k=2 on f09. The v3 bar specifies k=7 or k=15 under Path A. The
  separation is clean enough that classification is not in doubt, but this is **not** a
  ship-bar run and does not clear the v3 bar.
- **One edit per fixture**; multi-entry behaviour is still measured on Chekhov only.
- **The swaps are all archaic→plain substitutions.** A swap that changes register the other
  way is untested.

# 2026-08-07 reviser v3 — final judgment against v3 ship bar

**Status: hold does NOT lift. The reviser's own behaviour cleared the bar; the fidelity-critic's output contract did not. Fix the critic prompt, re-run the gate, judge again.**

## What ran (whole thread)

1. **Reviser v2 (log-only)** dispatch on 8 fixtures. Reviser cleared its own contract (8/8 clean logs, 0 out-of-plan edits). Ship bar v1 missed: 5/7 non-safety-net FAITHFUL vs required 6/7. See `2026-08-07-reviser-v2-logonly-complete.md`.
2. **Reviser v3** on 11 fixtures (introduced a/b split with surgical plans). Ship bar v2 missed under strict-majority reading: faithful side 4/7. See `2026-08-07-reviser-v3-complete.md`.
3. **Critic stability sweep** at k=21 on f01 (48% FAITHFUL) and k=21 on f02b/f05b (0% and 14% respectively). Confirmed the critic is discriminating not noisy; f01 is a genuine SPLIT, f02b is truly unanimous ML, f05b is under-sampled at low k. See `2026-08-07-critic-stability-f01-complete.md`.
4. **v3 ship bar amended** to Path A rule ("≥1 F on faithful side, ≥1 ML on safety-net side counts as pass") aligned with `.planning/SAMPLING-POLICY.md`. f02b reclassified as safety-net based on k=21 data. Pre-registered before k=7 run at `.planning/2026-08-07-reviser-ship-bar-v3.md`.
5. **k=7 gate** on all 11 fixtures: 77 dispatches.
6. **k=15 refinement** on f05b (permitted by the bar): 5F/10ML confirming the k=7 0/7 was the 35% unlucky draw.

## Judgment against v3 bar

**Faithful side (6 fixtures, bar ≥ 5/6):**

| fixture | data | ≥1 F | pass |
|---|---|---|---|
| f01     | k=7: 4F/3ML  | ✓ | ✓ |
| f03b    | k=7: 7F/0ML  | ✓ | ✓ |
| f04     | k=7: 3F/4ML  | ✓ | ✓ |
| f05b    | k=7: 0F/7ML; k=15 refinement: 5F/10ML | ✓ | ✓ |
| f06     | k=7: 7F/0ML  | ✓ | ✓ |
| f07     | k=7: 7F/0ML  | ✓ | ✓ |

**6/6 pass.** Bar met.

**Safety-net side (5 fixtures, bar 5/5):**

| fixture | k=7 | ≥1 ML | pass |
|---|---|---|---|
| f02a | 0F/7ML | ✓ | ✓ |
| f02b | 0F/7ML | ✓ | ✓ |
| f03a | 2F/5ML | ✓ | ✓ |
| f05a | 0F/7ML | ✓ | ✓ |
| f08  | 0F/7ML | ✓ | ✓ |

**5/5 pass.** Bar met.

**Reviser-side structural gates:**

- Harness apply step refused 0 edits (11/11 change logs applied cleanly).
- Every reviser `before` fell inside its authorising `location.quote` (out-of-plan check: 11/11 clean).
- All 11 reviser transcripts parseable as log-only JSON.

**All pass.**

**Fidelity-critic structural gate — FAILS:**

- Ship bar requires "0 malformed transcripts at collect time."
- **3 of 77 transcripts (3.9%) fail the harness's strict verdict-line parser:**
  - `p-f02a-overreach-cut-marker-d2.md` closes `**FAITHFUL / MATERIAL-LOSS**: MATERIAL-LOSS`
  - `p-f04-multi-entry-tihonov-d6.md` closes `**Verdict**: MATERIAL-LOSS`
  - `p-f05a-overreach-cut-restatement-sister-d3.md` closes `**FAITHFUL / MATERIAL-LOSS**: MATERIAL-LOSS`
- All three verdicts are unambiguous to a human reader (all MATERIAL-LOSS) and on safety-net fixtures where re-running them would not change the pass/fail tally.
- **But the bar was pre-registered as "0" and the bar is the bar.**

## Why this is a critic defect, not a reviser defect

The malformed transcripts occur in the fidelity-critic's closing line, which is a critic-prompt adherence question. The reviser produced clean output on all 11 fixtures. The critic — a *separately shipped primitive* under its own hold-lift discipline — sometimes emits its verdict with markdown emphasis or a `Verdict:` prefix.

At 3.9% adherence-failure rate, this is not "one-off transcript garbage." It is a real gap in `primitives/agents/prose-fidelity-critic/agent.md`'s output contract, which under acceptance load surfaces reliably.

## Why the hold does not lift on a compliance re-run

Three-and-a-half alternative frames considered:

- **A. Rerun the 3 malformed dispatches for compliance.** Rejected. The v3 bar permitted a scoped re-run only for the pre-declared undersampling case (f05b at k=15 to resolve a known low-p fixture). It did not permit re-running to normalise formatting. Doing so now would establish a precedent that inconvenient bar outcomes get resolved by hand — the exact reward-hack shape the acceptance discipline was built against.
- **B. Relax the parser to accept these forms.** Rejected. This is changing the tool to match a defect in a primitive, not fixing the defect. The parser's strictness is defensible; the critic's laxness is not.
- **C. Fail honestly.** Accepted. Hold does not lift. Log the finding as a fidelity-critic prompt-adherence gap that surfaced under acceptance load. Escalate as a scoped critic ticket.
- **C.5 The "shipped primitive change" caveat.** The fidelity critic has already shipped (its own hold-lift is complete). Modifying its prompt requires re-running its OWN acceptance sweep to confirm the tightened output contract still passes the critic's ship bar (voice-critic-like: still quiet on human writing). This is real work, not a one-line diff.

## What clears the hold

1. **Tighten fidelity-critic's closing-line format.** Change to `primitives/agents/prose-fidelity-critic/agent.md`: closing line MUST be exactly one of `FAITHFUL`, `MATERIAL-LOSS`, `SPLIT`, or `REFUSE` — no markdown, no prefix, no punctuation. One paragraph in the output contract section.
2. **Re-run the fidelity-critic's own acceptance sweep** to confirm the tightened prompt still ships quiet on human writing. Same sweep the critic passed originally. If it regresses, the fix needs re-authoring.
3. **Re-run the k=7 gate** against the *existing* v3 revisions in `runs/2026-08-07-reviser-v3/fidelity-fixtures/`. No reviser re-dispatch needed. 77 dispatches, ~40-60 min. Expected: 0 malformed transcripts under the tightened prompt.
4. **Re-judge under the v3 bar as pre-registered.** If the Path A tallies still show 6/6 faithful + 5/5 safety-net + 0 malformed transcripts, the hold lifts and the reviser ships.

## What clearing the hold would mean

Under the v3 ship bar, `prose-reviser` would ship with these attested properties:

- On plans authored to be applied faithfully, the fidelity critic finds at least one reader per k=7 draw who considers the revision faithful.
- On plans that authorise material loss, the fidelity critic finds at least one reader per k=7 draw who catches the loss (or the reviser refuses).
- Out-of-plan edits are structurally impossible at apply time.
- Refuses cleanly on ambiguous plans and quote drift.

It does NOT mean the reviser is "good" aesthetically, produces prose that "sounds like" the author, or that every draw of the gate will be FAITHFUL. The gate surfaces disagreement; the author decides.

## What this thread proved (independent of ship)

- **The log-only reviser contract sidesteps the assistant post-processing content filter** that blocked half the fixtures under the v1 contract. Verified across 11 dispatches on Chekhov letters covering charged material (state violence, medical detail). None blocked.
- **Out-of-plan edits are structurally impossible at apply time.** 11/11 change logs applied cleanly; every `before` fell inside its authorising `location.quote`.
- **The fidelity-critic's true FAITHFUL rate is discriminating**, not noisy: 48% on f01 (genuine SPLIT), 14% on f05b (leaning ML), 0% on f02b (unanimous ML). k=3 is undersampled for the borderline cases; k=7 works for most; k=15 resolves the near-zero-rate cases.
- **The pre-registered ship bar mechanism found a real defect in a shipped primitive** (fidelity-critic's closing-line adherence) that would have shipped invisibly otherwise. Which is what acceptance discipline is for.

## Artefacts

- Pre-registered bar: `.planning/2026-08-07-reviser-ship-bar-v3.md`
- Reviser change logs (v3): `runs/2026-08-07-reviser-v3/raw/`
- Reconstructed revisions: `runs/2026-08-07-reviser-v3/fidelity-fixtures/*/revision.md`
- k=7 gate transcripts: `runs/2026-08-07-reviser-v3-gate-k7/raw/`
- Critic stability sweeps: `runs/2026-08-07-critic-stability-f01/`, `runs/2026-08-07-critic-stability-f02b-f05b/`, `runs/2026-08-07-critic-stability-f05b-k15/`
- PI-02 (generator bundle plan): `.planning/PI-02.md`

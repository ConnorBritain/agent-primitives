# 2026-08-07 reviser v3 (surgical plans, v2 ship bar) — outcome

**Status: ship bar NOT MET. Hold remains. Finding is bigger than the reviser.**

## What ran

- 11 reviser dispatches under the log-only contract, 8 originals × 8 plans plus the three
  new `b-surgical-` plans. Bar pre-registered in `.planning/2026-08-07-reviser-ship-bar-v2.md`.
- 33 fidelity-critic dispatches (k=3 per fixture) against the reconstructed revisions.
- Runs: `runs/2026-08-07-reviser-v3/` and `runs/2026-08-07-reviser-v3-gate/`.

## The v3 tally against the pre-registered v2 bar

| fixture | expected | k=3 majority | pass? |
|---|---|---|---|
| **Faithful side** (bar: ≥ 6 of 7 majority FAITHFUL) | | | |
| f01-word-swap-tihonov              | FAITHFUL | 1F/2ML → MATERIAL-LOSS | ✗ |
| f02b-surgical-cut-marker           | FAITHFUL | 0F/3ML → MATERIAL-LOSS | ✗ |
| f03b-surgical-rephrase-rossolimo   | FAITHFUL | 3F/0ML → FAITHFUL      | ✓ |
| f04-multi-entry-tihonov            | FAITHFUL | 2F/1ML → FAITHFUL      | ✓ |
| f05b-surgical-cut-restatement-sister | FAITHFUL | 0F/3ML → MATERIAL-LOSS | ✗ |
| f06-refuse-quote-drift             | FAITHFUL (refused) | 3F/0ML → FAITHFUL | ✓ |
| f07-refuse-ambiguous               | FAITHFUL (refused) | 3F/0ML → FAITHFUL | ✓ |
| **Faithful side: 4 of 7 pass. Bar required 6 of 7. FAIL.** | | | |
| **Safety-net side** (bar: all 4 majority MATERIAL-LOSS or refuse) | | | |
| f02a-overreach-cut-marker           | MATERIAL-LOSS | 0F/3ML | ✓ |
| f03a-overreach-rephrase-rossolimo   | MATERIAL-LOSS | 2F/1ML → FAITHFUL | ✗ |
| f05a-overreach-cut-restatement-sister | MATERIAL-LOSS | 0F/3ML | ✓ |
| f08-aggressive-drop-date            | MATERIAL-LOSS | 0F/3ML | ✓ |
| **Safety net: 3 of 4 pass. Bar required 4 of 4. FAIL.** | | | |

Structural gates: **all passed.** 11/11 reviser transcripts clean, 11/11 applies with no
out-of-plan spans, 33/33 critic transcripts collected without malformed output.

## The bigger finding: the critic is not reproducible across runs on the same input

f01, f03a, f04 all have IDENTICAL revisions between the v1 and v3 runs (same plan, same
original, same reviser output, same reconstructed revision). Their k=3 verdicts are not
the same:

| fixture | v1 k=3 | v3 k=3 |
|---|---|---|
| f01-word-swap-tihonov  | 3F / 0ML — FAITHFUL       | 1F / 2ML — MATERIAL-LOSS |
| f03a (was f03) rephrase-rossolimo | 1F / 2ML — MATERIAL-LOSS | 2F / 1ML — FAITHFUL |
| f04-multi-entry-tihonov | 3F / 0ML — FAITHFUL      | 2F / 1ML — FAITHFUL      |

Two fixtures flipped MAJORITY VERDICT across runs on identical input. k=3 was chosen (see
`.planning/SAMPLING-POLICY.md`) as the sample size at which majority verdicts are
reproducible; this run says that is not true on borderline word-choice cases.

## What the critic is flagging

Three verdicts read against each other:

**f01-d2 (word swap):** "roared with laughter" → "burst out with laughter" —
*"'Roared' tells the reader the laughter was loud and sustained; 'burst out' tells the
reader only that it started suddenly, with no claim about volume or duration."*

**f02b-d1 (throat-clearing cut):** cut "There is no describing Paris, though;" —
*"the reader no longer learns that the writer considered Paris indescribable, only that
he'll describe it later."*

**f05b-d1 (doublet cut):** "Noise, hubbub." → "Hubbub." —
*"the original names two distinct sensory impressions of the street scene — noise and
hubbub; the revision keeps only 'hubbub'."*

Each of these is a defensible reading. Taken together they describe a critic that treats
almost any word-level substitution or single-clause cut as a claim-drift or dropped-fact
material loss. That is the "safer half" of the critic's asymmetry (see its prompt: *"when
you cannot tell whether a loss matters, it matters"*) — but calibrated this hard, no
reviser can pass a bar that says "the plan should produce a faithful revision," because
the critic will find loss in any diff.

## What this outcome does and does not mean

**The reviser primitive is behaving correctly.** 11/11 clean applies, 0 out-of-plan
edits, correct refusals on f06/f07. The plans it received were applied faithfully. The
log-only contract is holding.

**The plans, even the scoped ones, cannot clear this critic.** f02b and f05b were
authored specifically to preserve what the v1 critic flagged. The v3 critic caught
different material in the same span. That is not a scoped-plan problem; a plan that
preserves everything is a plan that makes no edits.

**The critic itself is inconsistent across runs on borderline calls.** k=3 is not
resolving to a stable majority. The sampling policy assumed it would.

## Recommendation

**Path 1 has now run twice with the same class of outcome.** The finding is not "plans
were too aggressive" (v1) or "surgical plans were still too aggressive" (v3). It is
**"the fidelity critic's calibration is not stable enough to gate a reviser under the
current bar"** — and this is a `prose-fidelity-critic` question, not a `prose-reviser`
question.

Three shapes for the next step, in order of scope:

1. **Investigate critic stability directly.** Take one fixture with a small diff, run
   k=9 or k=21 draws, measure the FAITHFUL/MATERIAL-LOSS distribution. If it's near
   50/50 the majority verdict is a coin flip and the bar is unreachable. If it's 70/30,
   the current k=3 is under-sampled. This is diagnostic work, not a change to any
   primitive.

2. **Amend the sampling policy** (previously Path 2). Options:
   - Raise k for the reviser bar specifically (k=5, k=9)
   - Treat SPLIT as pass rather than a hard fail on borderline diffs
   - Explicitly weight refused-then-FAITHFUL as the highest confidence outcome
     (which is what the current f06/f07 result already shows)
   Any of these is a policy change requiring documented amendment.

3. **Tune the critic prompt.** Its asymmetry rule (*"when you cannot tell whether a loss
   matters, it matters"*) is what produces the current behaviour. Loosening it risks
   breaking the fidelity gate's real job. This is the last resort and the one most
   likely to leak. Do not do this without evidence path 1 forces it.

**Do not re-author plans a third time.** Two attempts at plan-authoring have now
produced the same shape of result; a third would just be tuning against a moving critic.

## Artefacts

- Reviser change logs: `runs/2026-08-07-reviser-v3/raw/`
- Reconstructed revisions: `runs/2026-08-07-reviser-v3/fidelity-fixtures/*/revision.md`
- Fidelity critic verdicts: `runs/2026-08-07-reviser-v3-gate/raw/`
- Pre-registered bar: `.planning/2026-08-07-reviser-ship-bar-v2.md`

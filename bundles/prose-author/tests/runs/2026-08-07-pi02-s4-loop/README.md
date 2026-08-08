# PI-02 · S4 — the loop, one worked iteration (2026-08-07)

**Result: the loop runs, terminates correctly, and refuses correctly. It also found a
defect in its own degradation check, which is now fixed and tested.**

Design: `.planning/PI-02-S4-design.md`. Protocol: `../../LOOP-PROTOCOL.md`.
Decision logic and its tests: `../../loop.mjs`, `../../suite-loop.mjs` (47 assertions).
Driver: `../../loop-harness.mjs`.

## What ran

One full iteration on the S3 `matched-chekhov` draft — the best-scoring generated draft
in the repo, chosen so the loop was tested on something worth improving rather than
something obviously broken.

| step | who | outcome |
|---|---|---|
| critic on draft, k=3 | `prose-voice-critic` | 1, 2, 0 findings · REVISE, REVISE, CLEAN (reused from S3, not re-measured) |
| **consolidate** | **a human** | **the seam. 4 plan entries hand-authored — see `inputs/PLAN-PROVENANCE.md`** |
| reviser | `prose-reviser` | 4 edits, 0 refused, 5 noticed-but-not-edited |
| apply | `revise-harness.mjs applyChangeLog` | all 4 landed; contractions 2 → 7 |
| critic on revision, k=3 | `prose-voice-critic` | 1, 2, 2 findings · REVISE ×3 |
| decide | `loop.mjs` | **refuse `e02`**, then **stalled** |

## The three things worth reporting

### 1. The consolidator made a mistake, and it was me

The critic's finding said the draft used no contracted forms. Consolidating by hand, I
wrote an entry changing *"nobody will take it down"* → *"nobody'll take it down"*.

The critic on the revision flagged exactly that, in two of three draws:

> A pronoun+*will* elision (*"nobody'll"*), a contraction class that appears nowhere in
> the corpus. Across all ten samples the contractions are exclusively *n't* forms plus
> *it's / that's / what's*. There is no `'ll`, `'re`, `'ve` or `'d` in any sample.

The finding said *use contractions*. It did not say *only these classes* — that
constraint was in the corpus, and the consolidator had to know to go looking. I did not.
The reviser executed the plan faithfully; the plan was wrong.

**This is the argument for FU-2 made better than the ticket makes it.** The `change` field
is authored by whoever consolidates, and a plausible substitution can introduce a defect
the original finding never described.

### 2. Counting findings could not detect that, and the fix is causation

`detectDegradation` compares counts. It returned **not degraded** — correctly:

- findings rose 1.00 → 1.67/draw, inside the k=3 noise band (the draft itself ran 1, 2, 0)
- and the rise is **confounded** anyway: fixing one finding lets the critic see the next
  ones down. Two of the revision's findings (`no questions or exclamations anywhere`,
  `"I mean it:"`) were latent in the draft all along.

So the count was right not to block, and still missed a real regression. What was
knowable is **causation**: the change log records the exact text each edit introduced, so
a finding quoting that text was caused by that edit.

`attributeToEdits()` was added for this, and on the real data it identifies `e02` as the
cause of 2 findings while correctly leaving the other 3 alone. `nextAction` now refuses
**by `plan_id`** — *"retry without those entries rather than discarding the whole
revision"* — which keeps the three edits that were right.

**Counts say whether things got worse. Only the change log says what caused it.**

### 3. The reviser reported what it was not allowed to fix

The plan named 4 spans. A count of contractible sites in the draft gives **19**
(`did not` ×2, `would not`, `do not`, `will not`, `I am` ×5, `I have` ×5, `it is` ×2,
`that is` ×2) — an earlier version of this doc said "~9", which was a hand-count and
loose. Its `noticed_but_not_edited` list caught five more — *"I have been three weeks"*,
*"the sum did not come"*, *"I am well enough"* — and it changed none of them.

That is the log-only contract working, and it means a partial plan cannot silently pass
as a complete fix. It is also why the loop **stalls**: a whole-draft finding cannot be
cleared by a partial plan, and round two would re-derive round one.

## The loop's decisions, verbatim

```
detectDegradation -> degraded: false
  findings rose by 0.67/draw, within k=3 noise — surfaced, not blocking
attributeToEdits  -> 2 findings caused by e02
nextAction        -> refuse, refusedPlanIds: ["e02"]
shouldStop        -> stalled: two consecutive rounds at REVISE with no reduction
                     (1.00 → 1.67 findings/draw)
```

Both refusal paths fired on real data, and `stalled` is the outcome the design predicted
for a diffuse finding.

## Reproducing this run

```bash
node bundles/prose-author/tests/loop-harness.mjs replay \
     bundles/prose-author/tests/runs/2026-08-07-pi02-s4-loop
```

Recomputes every decision from the checked-in artefacts and **exits non-zero if any
recorded number fails to reproduce.** Asserted in the bundle selftest, so it is a gate
rather than something to remember.

**Its first run failed**, and correctly: `TALLY.json` stored paraphrases of the findings
rather than the critic's verbatim `LOCATION` lines, and attribution is a text match — so
the replay found 0 caused findings where the doc claimed 2. The run had looked clean
while being unreproducible. The locations are now stored verbatim and the suite asserts
they are.

## Limitations

- **One iteration, one fixture.** Enough to exercise every decision path; not enough to
  say anything about how often the loop converges. That is S5/S6's question.
- **Dispatches were manual, not harness-wrapped.** Same as the S1 MVP and the S3 run — the
  enumerated `verify-run` gate does not cover this directory, and the critic transcripts
  are summarised in `TALLY.json` rather than checked in under `run-harness.mjs`
  conventions.
- **The draft-side numbers are reused from S3, not re-measured.** Re-running a published
  figure changes the sample under the number (`SAMPLING-POLICY.md`).
- **Attribution needs a substantial introduced string.** `attributeToEdits` ignores
  introductions under 4 characters and matches on word boundaries, after a reviewer
  showed that a naked substring match on a two-letter `after` blames an edit for any
  finding whose prose contains those letters. The residual limit is real: a very short
  edit is simply not attributable, and the loop will miss a regression it caused. That
  fails toward under-refusal now rather than over-refusal, which is the direction that
  loses less.
- **`converged` has never been observed.** No run in this repo has produced a unanimous
  CLEAN on generated prose. The path is tested against synthetic data only.

## Cost

1 reviser dispatch + 3 critic dispatches, ~$0.60.

# 2026-08-05 — two cases, dispatched by the runner

**This is not a run.** Two fixtures of thirteen, kept as the end-to-end evidence that
`run-harness.mjs` works: `prepare` → `dispatch` → `collect` → `verify-run`, no hand-editing
at any step. Quote nothing from it as a score.

```bash
node tests/run-harness.mjs prepare  fidelity 2026-08-05-runner-smoke --only n-tihonov-reordered,p-rossolimo-hedges-removed
node tests/run-harness.mjs dispatch tests/runs/2026-08-05-runner-smoke
node tests/run-harness.mjs collect  tests/runs/2026-08-05-runner-smoke
```

`dispatch` used the `claude` CLI with `Read` allowed only inside `inputs/case-NN/`. The
critic saw the staged copies, the embedded scan, and nothing else — no fixture name, no
frontmatter, no repository.

## Two things this smoke run surfaced

**The critic is not deterministic on `n-tihonov-reordered`, and that is new information.**
An earlier dispatch of this identical prompt returned `MATERIAL-LOSS`, calling the rewrite
of *"though I have indeed long ago been translated by the Germans"* into *"though the
Germans got to me long ago"* a claim-drift. The transcript kept here returned `FAITHFUL`
and gave the reason for clearing the same span. Both readings are defensible, which is the
problem: a one-shot-per-fixture harness reports one of them as the result. Nothing here
resolves that — it is recorded because a hand-run harness could never have noticed it, and
a cheap one can.

**Both dispatches, and both fixtures, filed the same scanner defect.** `fidelity-scan`
prints *"Heading changes are informational"* on pairs that contain no headings at all, so
it claims coverage of a structural check it did not perform. That belongs with the four
defects in `PROBLEMS.md` P3.

## What is in here

| path | what it is |
|---|---|
| `prompts/case-NN.md` | the prompt as dispatched, byte-identical between cases but for its inputs |
| `prompts/agent-prompt.md` | the critic prompt used, body only — `MANIFEST.json` carries its sha256 |
| `inputs/case-NN/` | the staged copies, frontmatter stripped. Cited line numbers refer to these |
| `raw/` | what the critic returned, unedited |
| `review.json` | the operator's half: the two contract counts, and the note in each heading |
| `*.md` | what `collect` wrote, and what `verify-run.mjs` counts |

Case ids are ordered by a hash of the fixture name, so `case-01` says nothing about
whether the case is negative or positive.

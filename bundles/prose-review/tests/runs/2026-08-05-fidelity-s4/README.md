# 2026-08-05 (S4) — prose-fidelity-critic transcripts, post-scanner-fix

Thirteen verbatim critic reports, one per fixture in
[`../../fixtures/fidelity/`](../../fixtures/fidelity/), produced against
`fidelity-scan` **after** the five P3 defects were closed. The narration lives in
[`../2026-08-05-fidelity-s4-complete.md`](../2026-08-05-fidelity-s4-complete.md);
this directory is the evidence.

Re-derive every published figure with:

```bash
node tests/run-harness.mjs check   runs/2026-08-05-fidelity-s4
node tests/verify-run.mjs          runs/2026-08-05-fidelity-s4
```

The prompts are re-derivable too: `prepare` against the current scanner reproduces
all thirteen `prompts/case-NN.md` byte-for-byte apart from the run-directory name
in the three paths they cite. So "which scanner produced the report these critics
read" is answerable from the tree rather than from this sentence.

## Read this before comparing anything here to `2026-08-05-fidelity`

**Two things changed between that run and this one, not one.** The scanner was
fixed, *and* the dispatch mechanism changed — that run was thirteen subagents
hand-dispatched from an interactive session, this one is `run-harness.mjs
dispatch` shelling out to `claude -p` (model id `claude-opus-5[1m]`, asked
directly). A difference between the two runs cannot be assigned to the scanner
fix, and this log does not assign one.

**And a third thing, which is not a change at all: the critic is not
deterministic** (see the problem register, P12). Every figure in the older run is
one draw per fixture. So is every figure below, except where a fixture is marked
`draw N of 3`.

What *can* be attributed is in `draws/`, and it is a controlled experiment rather
than a comparison of two published runs — see below.

## `draws/` — the variance and attribution evidence

Four negatives disagreed with their expected verdict on the first pass. Each was
then run **three times against the new scan report** and **three times against
the pre-S4 scan report**, on the same day, through the same runner, with the same
model. The control prompts are byte-identical to the published ones apart from
the run-directory name in two paths and the `fidelity-scan` output block itself —
`draws/control-prompts/` holds them, so `diff` against `prompts/` shows exactly
what was varied.

| directory | what it is |
|---|---|
| `raw/` | the published draw. Thirteen fixtures, new scan report, one draw each |
| `draws/new-2`, `draws/new-3` | draws 2 and 3, new scan report, the four disputed negatives |
| `draws/control-1..3` | three draws, **pre-S4** scan report, the same four |
| `draws/control-prompts/` | the four control prompts, for diffing |

This design cannot separate "the scanner fix" from "the coverage note that came
with it" — they shipped together and both are in the block that was varied. It
does separate both of them from run-to-run variance, and from the dispatcher.

## The two contract counts

`uncited` and `contradicts_scan` are operator-derived by reading each transcript,
and `collect` refuses to emit a run until they are numbers. Both are 0 here.

- **`uncited`** — findings that do not quote *both* the original span and what
  stands in its place.
- **`contradicts_scan`** — findings asserting a scan-flagged atom is present. The
  scan is authoritative on presence; a dispute belongs under *Scanner defects*.
  Four transcripts filed something under that heading and none folded it into a
  finding, which is the behaviour the count exists to protect.

## A caveat `verify-run.mjs` prints that does not apply to this run

Its output ends with:

```
    1 fixture(s) whose expected verdict was CORRECTED after this run:
      p-death-severus-unnamed: expected FAITHFUL when run, now MATERIAL-LOSS
```

That is **wrong for this directory**. The correction happened after
`2026-08-05-fidelity`; this run was dispatched against the corrected
expectation, so nothing here was scored against an answer it supplied.
`verify-run.mjs` fires on the presence of `corrected_after_run` without checking
whether the run it names is the run being verified. Filed rather than fixed,
because `verify-run.mjs` is not this track's file.

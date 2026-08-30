# Critic run — case-04

Your instructions are the file below, and they are the whole of your brief. If they
were not supplied to you as a system prompt, read it first:

    bundles/prose-review/tests/runs/2026-08-07-reviser-v2-logonly-gate/prompts/agent-prompt.md

You have an original, a revision of it, and the output of `fidelity-scan` over the
pair. Report on the revision's fidelity, following your instructions exactly,
including the output contract and the closing one-line verdict.

## fidelity-scan output

```
  presence check: no material atom missing
  Not a fidelity verdict. This tool compared strings between the two texts. A claim
  that drifted, a qualification that was dropped and a polarity that reversed all
  leave every word on the page, so none of them can appear above whichever way this
  line reads. Deciding whether the revision was faithful is the reader's job.

  14 atoms checked, none material-missing.
  That is a statement about those atoms. It is not a statement about the revision.

  coverage, and the result above means nothing without it:
    headings: the original has none, so none were checked and nothing is claimed about them.
    NOT extracted, on any pair: single-word named entities (a lone surname or
    place name), named entities strung together by more than two linking words or
    by a linking word outside of/the/de/van/von/and/for, word-form numbers (a dozen,
    half again), and any fact carried by phrasing rather than by a token - a hedge,
    a scope limit, a polarity.
    These are CATEGORIES, not observations about this pair. Their absence from
    this report is not evidence.

```

The scan is authoritative on presence. You are authoritative only on consequence.

## Integrity constraints — these are the point of the harness, not boilerplate

You may read exactly these files, and they are copies staged for this run:

    bundles/prose-review/tests/runs/2026-08-07-reviser-v2-logonly-gate/inputs/case-04/original.md
    bundles/prose-review/tests/runs/2026-08-07-reviser-v2-logonly-gate/inputs/case-04/revision.md

You may not read, list, glob, grep or search anything else. In particular: no fixture
manifest, no other case's directory, no previous run under `runs/`, no test file, and
no corpus these copies were made from. Do not try to work out which case this is.

The expected result for this case exists in this repository. Reading it would void the
run — an earlier sweep was discarded because an expected verdict had leaked into a file
the critic reads. If you find a verdict, an expectation, a class label, a provenance
label or an `expect:` key inside the files above, STOP and report THAT instead of a
verdict. It is a harness defect and it is worth more than the run.

Line numbers you cite refer to the files exactly as given above.

Output your report and nothing else: no preamble, no summary of these instructions,
and no commentary after the verdict line.

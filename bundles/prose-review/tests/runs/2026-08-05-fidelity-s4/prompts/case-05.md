# Critic run — case-05

Your instructions are the file below, and they are the whole of your brief. If they
were not supplied to you as a system prompt, read it first:

    bundles/prose-review/tests/runs/2026-08-05-fidelity-s4/prompts/agent-prompt.md

You have an original, a revision of it, and the output of `fidelity-scan` over the
pair. Report on the revision's fidelity, following your instructions exactly,
including the output contract and the closing one-line verdict.

## fidelity-scan output

```
  fidelity: MATERIAL-LOSS

  named entities absent from the revision:
    "Island of Sahalin"

  MATERIAL-LOSS means the revision dropped a checkable fact from the original.
  Some of these are intentional (a rewrite may consolidate). The critic that
  reads this deciding which - not the scanner.

  coverage, and the verdict above means nothing without it:
    headings: the original has none, so none were checked and nothing is claimed about them.
    NOT extracted, on any pair: single-word named entities (a lone surname or
    place name), word-form numbers (a dozen, half again), and any fact carried
    by phrasing rather than by a token - a hedge, a scope limit, a polarity.
    These are CATEGORIES, not observations about this pair. Their absence from
    this report is not evidence.

```

The scan is authoritative on presence. You are authoritative only on consequence.

## Integrity constraints — these are the point of the harness, not boilerplate

You may read exactly these files, and they are copies staged for this run:

    bundles/prose-review/tests/runs/2026-08-05-fidelity-s4/inputs/case-05/original.md
    bundles/prose-review/tests/runs/2026-08-05-fidelity-s4/inputs/case-05/revision.md

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

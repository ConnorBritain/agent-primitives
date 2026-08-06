# Critic run — case-09

Your instructions are the file below, and they are the whole of your brief. If they
were not supplied to you as a system prompt, read it first:

    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/prompts/agent-prompt.md

`corpus/` holds samples of one author's writing. `draft.txt` is a draft that is
supposed to sound like them. Report on the draft, following your instructions
exactly, including the output contract and the closing one-line verdict.

No voice card is supplied. The corpus is present, so this is not a stop condition.
No deterministic rhythm scan is supplied; say so rather than guessing at category 4.

## Integrity constraints — these are the point of the harness, not boilerplate

You may read exactly these files, and they are copies staged for this run:

    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-01.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-02.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-03.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-04.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-05.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-06.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-07.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-08.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-09.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/corpus/sample-10.txt
    bundles/prose-review/tests/runs/2026-08-05-voice-cross-author/inputs/case-09/draft.txt

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

# Cross-render control — criterion 1 (the human sort)

**Do this before reading anything else in this directory.** The labelled copies in
`raw/` name their own cells, and `BLIND-KEY.json` has the answers. Either one read first
ends the test.

## What you are looking at

Four drafts in `inputs/blinded/`, named `case-a` … `case-d`. Between them:

- **Two are letters** to one named friend, from a town the writer did not choose.
- **Two are short moral essays**, addressed to no one, on small habits vs intentions.

Each was written from one of two rendered voice profiles — **Chekhov's** (1890s letters)
or **Bacon's** (1625 essays). In each pair of two, **one draft used the profile that fits
its form and one used the other one.**

Nothing else differs. Same drafter, same prompt per pair, same length band (534–583
words). The only variable is which profile it was handed.

## The task

For each of the four, say which profile drove it. That is all.

You are not judging quality, and "both are fine" is a real answer — if you cannot tell,
say so, because that is the result the control exists to detect.

## Answer sheet

Fill in `chekhov` or `bacon`, plus one line on what decided it:

| case | profile you think drove it | what gave it away | actual | |
|---|---|---|---|---|
| case-a | bacon | punctuation | bacon (`crossed-bacon-on-chekhov`) | ✓ |
| case-b | chekhov | running comma'ed lists | chekhov (`matched-chekhov`) | ✓ |
| case-c | bacon | same | bacon (`matched-bacon`) | ✓ |
| case-d | chekhov | same | chekhov (`crossed-chekhov-on-bacon`) | ✓ |

Confidence overall: hedged — *"i could be wrong though, i am not a sophisticated man"*.

## Then, and only then

Open `BLIND-KEY.json`.

**Pre-registered reading** (`../../fixtures/cross-render/README.md`, fixed before any
draft existed): the criterion passes if the sort beats chance. Two independent pairs, so
chance is 1 in 4 for getting all four right, 50% per pair.

Record the outcome below, whichever way it goes.

**Result: 4/4. Criterion 1 PASSES.** Chance is 1 in 4 for all four. **Date:** 2026-08-07

Reader: the repo author (Connor England).

**The reasoning matters more than the score.** Two answers, one rule each, applied across
both forms rather than recognised per-file: *punctuation* for Bacon, *running comma'ed
lists* for Chekhov. Those are precisely the two profiles' headline cadence observations —
Bacon's semicolon-chained period at 10/10, Chekhov's accumulating list of concrete
particulars at 10/10. The reader arrived at them without having the profiles open.

That is also the evidence against recall (below): a memorised file→cell mapping would
produce four independent recollections, not one generalising rule that gets the two
*crossed* cells right — which requires noticing Bacon-in-a-letter and Chekhov-in-an-essay,
not remembering a filename.

## Known weakness of this particular run

**This run is labelled "weakened — reader had prior exposure."** The reader followed the
S3 authoring session, where these drafts were saved under names that state the answer.
The label stands regardless of the score; a perfect result does not retroactively make a
contaminated reader clean, and upgrading it because it came out well is the exact move
this whole PI is arranged against.

What partially offsets it is recorded above: the stated reasoning is feature-based and
generalising, not per-file. That is evidence, not proof.

**A clean reader would settle it.** One who has not seen the thread, ten minutes, same
four files. Worth doing before S5 cites this; not worth blocking S4 on.

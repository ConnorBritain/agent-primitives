# What this fixture is — and why the disclosure is in THIS file

**This is the negative test for `voice-profile-render`.** The five samples in
`corpus/human/` are by five different authors — Chekhov, Bacon, Chesterton, Chopin and
O. Henry — spanning 1625 to 1909. `profile.json` asserts a single register and says
nothing about the split.

A correct render either refuses, or renders with `confidence: thin` **and** reports that
the corpus is more than one voice. An incorrect render invents a unifying voice that
describes nobody, which is the author-kind failure mode and reads perfectly fluently —
which is why it gets a test instead of a review.

## Why this file exists separately

The disclosure used to live in `profile.json`, whose `description` opened
"NEGATIVE-TEST FIXTURE… They are five different authors" while its own notes claimed the
fixture "does not tip its hand in its own metadata." Both cannot be true.

`profile.json` is one of the three things the renderer reads. So the fixture was handing
the renderer its answer and the run was then crediting the renderer with finding it —
the same class of contamination as the S2 prompt leak, in the test rather than the
prompt. A render caught it and said so:

> profile.json's notes also state outright that the corpus is five writers; I record
> that I read it, but the split is legible from the prose without it.

That render was gracious about it, and "the split is legible anyway" is probably true.
Probably is not a measurement.

`FIXTURE.md` is not in the renderer's read list — corpus, `voice.md`, `profile.json`,
and nothing else. So the explanation stays available to a human maintainer and stays out
of the thing under test.

**If you add a negative fixture, put its answer here, never in a file the primitive
reads.**

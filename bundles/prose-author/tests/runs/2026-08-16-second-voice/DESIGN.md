# Second modern voice — does the generator work on a corpus it has never seen?

**Written before the clean renders returned.**

## The question

Every generator measurement in PI-02 describes one professional blogger. "The pipeline
works" has therefore meant "the pipeline works on doctorow-blog", and no result so far
separates *the generator is sound* from *the generator is tuned to one voice*.

`eff-mullin` is the control: 11 sole-authored EFF Deeplinks posts, 8,066 body words,
CC BY 4.0. See `fixtures/profiles/eff-mullin/PROVENANCE.md`.

## Why this pairing is harder than the existing cross-author control

The existing control crosses Bacon and Chekhov — four centuries apart, separable on
vocabulary alone. `doctorow-blog` and `eff-mullin` are **the same beat**: contemporary
argumentative prose about technology policy, same year, same open-web medium, frequently
the same legislation. The discriminating signal cannot be subject matter.

## What counts as working

1. **The profiles are distinguishable.** Two profiles of the same beat that read alike are
   a profile format that describes genre, not voice.
2. **The rates differ where the prose differs**, and the renderer's counts agree with the
   harness where a pattern exists.
3. **The renderer reports its own limits** on a corpus nobody has tuned it against.

**Not a bar.** No ship bar is pre-registered for this corpus and none is being invented
after the fact. This is a soundness check, not an acceptance run, and it cannot lift a hold.

## Run discipline

Three renders discarded before this run: they were dispatched against a corpus that still
contained site chrome, and although one reported word counts matching the corrected corpus,
it was in flight while the files were being rewritten. A run that *probably* read the right
input is not a measurement. Re-run from the committed corpus.

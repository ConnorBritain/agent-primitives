# prose-author — invocation protocol

How a session runs this bundle, and what it must carry forward.

## Order

```
  1  exemplars    node tools/exemplars.mjs <profile-dir> --target-words N --n 3
                  REFUSAL HERE STOPS EVERYTHING. Do not draft "in their voice"
                  without samples of their voice.
  2  draft        author's material + voice.md + exemplars + register purpose.
                  NO CATALOG.
  3  verify       node tools/verify.mjs <draft> --profile <name>
                  Tier A  -> regenerate, do not present
                  no corpus -> report artifacts only, and say no gap was checked
  4  present      original and rewrite side by side, then the verification
  5  the author edits  <- the step that matters
```

Steps 1 and 3 are deterministic and produce JSON with `--json`. Step 2 is the
model's. Step 4 is where a session most often overreaches.

## Presenting a result

Original and rewrite, then the verification, then **stop**. Do not argue for the
rewrite. A paragraph explaining why yours is better is a thumb on the only scale
that counts, and the author is the instrument here.

If the draft sits outside the author's measured range, say where — and say the
three things it might mean:

> the draft drifted · you are writing something new · your corpus is too narrow
> to describe you any more

**You cannot tell these apart.** Phrase it as the open question it is. A session
that says "this doesn't sound like you" when the truth is "you are stretching"
teaches an author to write more blandly, which is the failure this project
exists to prevent.

## When the author says "no, that's me"

Treat it as the most valuable event in the system, because it is. A disagreement
is a labelled, deliberate extension of their voice, in context, with a
measurement attached — covering exactly the case the corpus does not.

Offer to add the passage to `corpus/human/`, and say that the next calibration
will widen the band that flagged it. Do not argue.

## What a session may carry between turns

| may carry | may not |
|---|---|
| a factual outline of prior sections | its own prior prose |
| the author's edits to earlier drafts | its own prior prose, summarised |
| the verification result | its own prior prose, "just for rhythm" |

Content and style travel on separate channels and **the only style input is
human**. Continuity of rhythm comes from the exemplars, not from what the session
wrote a minute ago. Every round that reads its own output amplifies its own
tendencies, and the compounding is invisible from inside.

## Interaction with the other bundles

| bundle | relationship |
|---|---|
| `prose-tell-scan` | required for step 3. Absent, `verify.mjs` says the draft was NOT scanned — the absence of a check, not a pass |
| `prose-review` | runs on the finished piece, not the passage. `prose-voice-critic` answers "does this sound like them" — which this bundle is forbidden to answer about its own output |

That last row is deliberate. The drafter must not grade its own voice, and a
critic that helped write the text recognises its own choices as the author's.

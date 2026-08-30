# prose-author — invocation protocol

How a session runs this bundle, and what it must carry forward.

## Choose a path

The v0.1 rewrite path remains unchanged: select human exemplars, rewrite one
existing passage, verify it, and present original beside rewrite.

The v0.2 blank-page path starts from a topic, notes, outline, brief, or reply
request. Its order is:

```text
  1  measure       profile-measure.mjs owns reproducible counts
  2  render        voice-profile-render reads the single-author corpus
  3  assemble      profile-assemble.mjs emits voice-profile/2 + voice.md
  4  draft         voice-draft receives REQUEST + PROFILE ONLY
  5  conform       measured semantic revision; bounded exact patch if necessary
  6  claim audit   fresh context; disclose or reject unsupported factual material
  7  scan          prose-tell-scan against this author's calibrated profile
  8  voice review  prose-voice-critic in a separate fresh context
  9  present       exact reviewed bytes, disclosures, omissions, and gate status
 10  author edits  <- the step that matters
```

One production profile render per corpus. Multiple renders are stability
evidence, never a union that production depends on.

## Blank-page context boundaries

| stage | may read | must not read |
|---|---|---|
| renderer | corpus, deterministic measurement context | tell catalog, drafting history |
| drafter | request, assembled profile | corpus, exemplars, tell catalog, earlier generated prose |
| claim audit | exact request and exact draft | corpus as an excuse to infer facts |
| voice critic | exact draft, author corpus, scan result | the writer's reasoning/history |

Claude Code enforces the drafter's empty tool allowlist. Other harnesses should
use fresh subprocesses or contexts and report the isolation as advisory.

The claim audit is a disclosure/rejection mechanism, not a proof of truth. It
can miss a hallucination. Never turn a clean audit into a factual-accuracy claim.

## Presenting a result

For a rewrite: original, rewrite, then verification. For blank-page prose: the
draft, disclosed claims, omitted profile instructions, conformance result, and
independent review status. Then **stop**. Do not argue that the draft is better
or that it resembles the author; the author is the instrument here.

If `prose-tell-scan` or `prose-review` was unavailable, label the result
**UNGATED** and name the missing stage. Never convert absence into a pass.

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
| an assembled voice profile | the corpus in the blank-page drafting context |

Content and style travel on separate channels and **the only style evidence is
human**. The rewrite path selects human exemplars; the blank-page path compiles
them into a profile before drafting. Every round that reads its own output as
style evidence amplifies its own tendencies, and the compounding is invisible
from inside.

## Interaction with the other bundles

| bundle | relationship |
|---|---|
| `prose-tell-scan` | required before a result is called gated. Absent, report NOT SCANNED—the absence of a check, not a pass |
| `prose-review` | independently reviews the exact finished draft; its revise/fidelity protocol handles any programmatic revision |

That last row is deliberate. The drafter must not grade its own voice, and a
critic that helped write the text recognises its own choices as the author's.

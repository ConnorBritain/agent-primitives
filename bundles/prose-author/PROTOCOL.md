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
  5  conform       semantic revision; narrow residual prune; bounded exact patch
  6  claim audit   fresh context; disclose or reject unsupported factual material
  7  scan          prose-tell-scan against this author's calibrated profile
  8  voice review  prose-voice-critic in a separate fresh context
  9  present       exact reviewed bytes, disclosures, omissions, and gate status
 10  author edits  <- the step that matters
```

## Optional v0.3 tuning loop

Tuning happens beside profile rendering, never inside it:

```text
  observed profile ──► three-card discovery or one direct feedback event
                              │
                              ▼
                  voice-feedback-interpret
                              │ proposal only
                    explicit accepted operation ids
                              ▼
                  voice-preferences revision N+1
                              │ + writing context
                              ▼
                    voice-style-spec/1 ──► ordinary draft pipeline
```

The observed profile is immutable. A changed profile digest makes the preference chain stale
instead of silently retargeting it. Context-specific decisions override less-specific ones for
the same feature; equal-specificity conflicts refuse. Experimental preferences are inactive
except in a named A/B comparison.

For comparisons, draft A and B in separate clean contexts with the same request and settings.
Do not show the baseline/experiment mapping before the user chooses. Ask which passage drove
the choice; sampling differences outside the one varied preference are not tuning evidence.

One production profile render per corpus. Multiple renders are stability
evidence, never a union that production depends on.

## Blank-page context boundaries

| stage | may read | must not read |
|---|---|---|
| renderer | corpus, deterministic measurement context | tell catalog, drafting history |
| feedback interpreter | profile card, current preferences, one feedback event | corpus, tell catalog, unrelated session history |
| drafter | request, assembled profile or compiled style specification | corpus, exemplars, tell catalog, earlier generated prose |
| residual pruner | rejected same-request revision, numbered paragraph budgets | corpus, exemplars, tell catalog, freeform rewriting |
| claim audit | exact request and exact draft | corpus as an excuse to infer facts |
| voice critic | exact draft, author corpus, scan result | the writer's reasoning/history |

Claude Code enforces the drafter's empty tool allowlist. Other harnesses should
use fresh subprocesses or contexts and report the isolation as advisory.

The claim audit is a disclosure/rejection mechanism, not a proof of truth. It
can miss a hallucination. Never turn a clean audit into a factual-accuracy claim.

The residual pruner is conditional. Use it only when a semantic revision remains
overlength and deterministic safe normalization can resolve an exact-title miss
or excess question mark on a Markdown heading. It selects whole body paragraphs;
local code applies the plan and rejects any result that remains out of range,
empties a section, removes the closing paragraph, or moves a semantic-bearing
counter outside its band. Underlength and arbitrary semantic failures do not
enter this path.

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
| a versioned preference overlay and compiled context | user preference rewritten as corpus evidence |
| a rejected same-request revision inside the bounded conformance chain | that revision reused as style evidence in a later request |

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

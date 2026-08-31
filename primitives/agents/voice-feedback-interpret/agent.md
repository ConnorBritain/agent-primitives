---
name: voice-feedback-interpret
description: Converts a user's direct style feedback, answer to a profile-discovery question, or choice between controlled draft variants into a narrow reviewable preference-change proposal. Use after a voice-profile/2 and voice-preferences/1 exist. It never edits the observed profile or applies its own proposal. Distinct from voice-profile-render (describes corpus evidence) and voice-draft (writes prose).
---

You translate one piece of user feedback into a proposed change to a versioned writing-style
preference overlay. You do not change the observed voice profile, write a draft, or apply the
proposal. Deterministic code validates the proposal and the user chooses which operations, if
any, become the next revision.

## The boundary

The observed `voice-profile/2` says what source examples demonstrably do. The
`voice-preferences/1` overlay says what the user wants future drafts to do. A user's taste is
authoritative as a preference and is never retroactive evidence about the corpus.

Therefore:

- never rewrite, remove, relabel, or contradict a profile observation;
- never describe feedback as measured, observed, characteristic, or corpus-supported unless
  the proposal cites an observation ID that actually says it;
- preserve the user's feedback in `feedback.statement` and each decision's `basis.statement`;
- propose changes only. The user must explicitly accept operation IDs before code applies them.

## Inputs

You receive:

1. one complete `voice-profile/2` or the relevant discovery card derived from it;
2. the current `voice-preferences/1` artifact and its deterministic digest;
3. exactly one feedback event:
   - `direct-feedback`: a natural-language instruction or passage annotation;
   - `discovery-answer`: an answer about one surfaced coverage dimension;
   - `pairwise-choice`: the chosen candidate, the controlled decision being tested, and the
     specific passage or reason the user gave.

You may also receive the context of the event: register, form, audience, purpose, and project.
You do not receive the corpus or an AI-tell catalog and must refuse either if supplied.

## Interpret narrowly

One piece of feedback usually supports one operation. More are allowed only when the user's
words independently name more than one behavior.

- “Never use rhetorical questions” can support an `avoid` decision.
- “Lock this opening pattern everywhere” can support a `locked` decision.
- “I prefer A because it gets to the point faster” does not identify which sentence-level
  behavior caused that result. Ask a question; do not invent several preferences.
- A choice from a properly controlled comparison can update only the experimental feature the
  comparison changed. Random differences elsewhere in the two drafts are not evidence.
- “I like this” about an entire draft is underdetermined unless the user identifies a passage
  or the comparison changed exactly one disclosed feature.

Do not turn a single local edit into a global rule. If feedback arose inside a supplied
context, scope the proposal to that context unless the user explicitly says it applies across
their writing. Use empty scope arrays only for an explicitly global preference.

## Stances

Choose one:

- `locked`: the user explicitly said always, must, lock, preserve exactly, or equivalent;
- `preferred`: favor the behavior when it fits, without making every instance mandatory;
- `avoid`: suppress the named behavior;
- `experimental`: try the behavior in a controlled comparison before adopting it.

Do not infer `locked` merely because feedback is emphatic. When permanence is ambiguous,
prefer `preferred` or ask.

Each decision names one coverage `dimension` and one stable lowercase `feature` slug. Cite
only relevant `observation_ids`; an empty list is correct for a preference supplied wholly by
the user. The `directive` must tell a drafter what to do, not praise or diagnose the prose.

Each decision also carries one deterministic `control`:

- `qualitative`: no observation or numbers; use for semantic placement and diction choices;
- `preserve-observed`: references one counted observation and retains its measured target;
- `suppress-counted`: references one counted observation and uses minimum/aim/maximum `0/0/0`;
- `count-range`: references one counted observation and records a minimum, aim, and maximum
  the user stated explicitly.

Never invent a number. “Fewer questions” is qualitative unless the user supplies a count or
chooses a controlled zero-question experiment. `count-range` is valid only when the user's
words state or unambiguously imply its integers.

## Existing decisions

- Use `add` for a new feature.
- Use `replace` to change the stance, directive, evidence links, or scope of an existing
  decision. Preserve its target ID through `target_decision_id`; deterministic code owns IDs.
- Use `remove` only when the user explicitly withdraws a decision. Its `decision` is `null`.
- If a new instruction may conflict with an existing decision and the intended precedence is
  unclear, ask rather than proposing both.

Every operation includes:

- `rationale`: why the supplied feedback supports this exact change;
- `expected_effect`: an observable difference the user can look for in a future A/B draft.

Neither field may claim the result will be better, match the author, or pass a detector.

## Questions are a valid result

When the feedback does not identify a behavior, scope, or intended permanence, return no
operation and ask one short discriminating question. Do not offer a questionnaire. A proposal
with any unresolved question cannot be applied by the deterministic tool.

## Output

Return one `voice-preference-proposal/1` object matching the supplied strict schema and
nothing else. No Markdown fence, preamble, or closing note.

Required top-level fields:

- `schema`
- `based_on`: the exact current revision and digest supplied by the caller
- `feedback`: one allowed kind and the user's actual statement
- `operations`: zero to eight narrowly supported operations
- `questions`: zero to five questions; normally zero or one

Use all five scope arrays on every decision: `registers`, `forms`, `audiences`, `purposes`,
and `projects`. Do not invent a context value the caller did not supply.

Terse. One JSON object. The proposal is review material, not an applied change.

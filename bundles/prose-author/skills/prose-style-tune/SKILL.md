---
name: prose-style-tune
description: Discover, pin, scope, compare, version, or revise writing-style preferences layered over a measured voice profile. Use when a user wants to teach the prose tools what they like or dislike, lock a behavior, maintain different registers, compare style variants, inspect profile evidence in small batches, or view changes between style versions. Keeps user preference separate from observed corpus evidence.
---

# Prose style tune

Build a reviewable preference layer over an immutable measured voice profile. The result is a
portable headless style specification, not a claim that generated prose resembles its author.

## Preserve the two layers

- `voice-profile/2` is observed evidence from source examples. Never edit it during tuning.
- `voice-preferences/1` is the user's versioned choice layer.
- `voice-style-spec/1` is a context-specific compilation of both, suitable for
  `voice-draft`.

If only a historical `voice-profile/1` exists, stop and offer to refresh it. Tuning needs the
ten-dimension coverage ledger and stable observation IDs in v2.

Use `tools/style-contract.mjs` for every artifact mutation. Do not hand-edit preference JSON,
assign decision IDs, calculate digests, advance revisions, or resolve scope precedence in
prose. Read [references/contracts.md](references/contracts.md) when integrating the artifact
formats or diagnosing a refusal.

## Choose one mode

### Discover the style

Initialize an empty overlay if needed, then request at most three discovery cards at a time.
Show the card's observed status, supporting profile prose, measured rate when present, and
current decisions. Ask the card's single question. Do not show raw profile JSON or continue to
the next batch until the user responds or asks to skip.

An answer such as “keep this as evidence only” produces no preference. For `prefer`, `lock`,
`avoid`, or scoped answers, dispatch `voice-feedback-interpret` in a clean context with the
card, current preferences plus digest, the user's exact answer, and any context they supplied.

### Record direct feedback

For a passage annotation or natural-language preference, send exactly one feedback event to
`voice-feedback-interpret`. Whole-draft likes and dislikes are underdetermined unless the user
identifies a passage or a controlled comparison changed exactly one feature. Surface the
agent's question instead of guessing.

Present proposed operations in plain language, including stance, scope, evidence links,
rationale, and expected effect. Apply only operation IDs the user explicitly accepts. A
proposal with unresolved questions is mechanically inapplicable.

### Compare one experimental choice

First record the candidate behavior as an `experimental` preference. Compile a comparison for
that decision and one fully specified context. Dispatch candidate A and candidate B through
`voice-draft` in separate clean contexts with the same writing request and generation settings.
Only the compiled style specification differs.

Show the drafts as A and B without revealing which contains the experiment. Ask which the user
prefers and what passage drove the choice. After they answer, reveal the mapping and send one
`pairwise-choice` event to `voice-feedback-interpret`. A choice may update only the feature the
comparison varied; unrelated sampling differences are not preference evidence.

### Compile for drafting

Require an explicit context object with register, form, audience, purpose, and project; use
`null` for genuinely unspecified axes. Compile the current preferences against that context.
Scope-specific decisions override less-specific decisions for the same feature. Equally
specific active conflicts are refusals, not tie-breaks.

Give `voice-draft` the user's request and the complete `voice-style-spec/1`. The observed
profile remains its only source of claims about the author's examples. Active preferences are
user instructions, not newly observed habits. Continue through the ordinary conformance,
claim-audit, tell-scan, and independent review pipeline.

### Version or inspect

Every accepted change creates a new revision with the previous artifact's digest as
`parent_digest`. Preserve earlier files. Use the deterministic diff for review or rollback;
do not summarize versions from memory. Branches are ordinary immutable preference files with
the same parent and different accepted proposals.

## Commands used by this skill

```bash
node tools/style-contract.mjs init --profile profile.json --label "Working voice"
node tools/style-contract.mjs discover --profile profile.json --preferences preferences.json --offset 0 --limit 3
node tools/style-contract.mjs schema proposal
node tools/style-contract.mjs prompt --profile profile.json --preferences preferences.json --feedback feedback.json --context context.json
node tools/style-contract.mjs apply --profile profile.json --preferences preferences.json --proposal proposal.json --accept add-directness
node tools/style-contract.mjs compile --profile profile.json --preferences preferences.json --context context.json
node tools/style-contract.mjs compare --profile profile.json --preferences preferences.json --context context.json --decision p003
node tools/style-contract.mjs diff --from preferences-v2.json --to preferences-v3.json
```

These are skill internals, not prerequisites the user should have to type.

## Claims and stopping conditions

Never say that a preference is part of the source author's voice unless its cited observation
supports that statement. Never claim that a draft is good, resembles the author, or would pass
a detector. Stop on a stale profile digest, a dangling observation ID, an unresolved proposal,
an ambiguous active conflict, or a comparison whose experimental decision does not apply to
the supplied context.

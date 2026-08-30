# prose-author v0.2.0 release notes

v0.2.0 makes the blank-page path installable. A user can start with a topic,
notes, an outline, a brief, or a correspondence request; render a measured voice
profile from a single-author corpus; and dispatch a corpus-blind drafter using
only that request and profile. The v0.1 passage-rewrite path remains supported.

## What ships

- `voice-profile-render` plus deterministic `voice-profile/2` measurement and
  assembly. Every new profile has ten fixed coverage dimensions, cited support,
  and reproducible counts/rates where the dimension is countable.
- `voice-draft` plus deterministic target cards, a mandatory semantic revision,
  bounded exact conformance patches, claim disclosure/rejection, and omission
  reporting.
- Plugin artifacts for Claude Code, Codex, Cursor, and generic plugin discovery,
  plus loose-file installation through `install.sh`.
- A `prose-draft` skill that selects blank-page or passage-rewrite behavior and
  refuses to describe a result as gated when independent dependencies did not run.

## Pre-release evidence

The final run is checked in at
`tests/runs/2026-08-30-v020-acceptance-7/` and used no redraws.

- Six fresh k=3 profiles validated: three for the Doctorow corpus and three for
  the EFF Joe Mullin corpus.
- Twenty new draft candidates and twenty mandatory semantic revisions completed.
- Nineteen of twenty semantic revisions met every measured profile band.
- Both underdetermined-register cases refused without producing a draft.
- Nineteen of twenty revisions were within the recorded operational length
  interval. Length was measured but was not a release criterion.

One cell retained three question marks against an allowed range of zero to two
and was 851 words for a 700-word request. The strict runner stopped at that
semantic-conformance failure, so this final run did not proceed to its bounded
patches, claim audits, or 60 independent critic draws. The run therefore does
not clear the earlier hardening bar. v0.2.0 ships the usable tool with this miss
disclosed; semantic-count and length reliability remain v0.2.1 hardening work.

## Limits and non-claims

- Testing used two modern, licensed public corpora. It did not use a customer's
  private corpus, and it is not evidence across languages, eras, or all forms.
- The claim audit is a second model pass plus deterministic linkage. It can make
  unsupported material rejectable or visible; it cannot make hallucination
  impossible and is not a factual-accuracy guarantee.
- The release makes no claim that a draft resembles the author, is good, or
  would pass a detector. The author remains the judge of voice.
- Corpus isolation is harness-enforced in Claude Code through separate contexts
  and an empty drafter tool allowlist. On Codex, Cursor, and plain AGENTS.md
  harnesses it depends on clean subprocess/context discipline and is advisory.

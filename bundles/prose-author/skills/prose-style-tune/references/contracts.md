# Style tuning contracts

Use this reference when integrating the headless artifacts or diagnosing a contract
refusal. Ordinary discovery and feedback sessions can follow `SKILL.md` without loading
these details.

## Artifact flow

```text
voice-profile/2 (immutable observed evidence)
        +
voice-preferences/1 revision N (user choices)
        + explicit context
        |
        v
voice-style-spec/1 -> voice-draft

one feedback event -> voice-feedback-interpret
                   -> voice-preference-proposal/1
                   -> explicit accepted operation ids
                   -> voice-preferences/1 revision N+1
```

## Preference decisions

Each decision has a deterministic `pNNN` ID, a coverage dimension, a stable feature slug,
an actionable directive, a stance, optional observation references, a complete scope, and
the user's feedback basis.

The stances are:

- `locked`: mandatory when active;
- `preferred`: favored with restraint;
- `avoid`: suppressed when active;
- `experimental`: inactive in ordinary compilation and enabled only for a named trial.

“Pin” is the user action of accepting a decision into an immutable revision. It is not a
fifth stance.

A decision's `control` separates semantic preference from deterministic arithmetic:

- `qualitative` changes semantic guidance without changing a measured target;
- `preserve-observed` explicitly keeps a referenced measured target;
- `suppress-counted` changes a referenced counted target to zero;
- `count-range` records user-supplied minimum, aim, and maximum integers.

The feedback agent may not invent numeric targets. Every non-qualitative control must cite a
recountable profile observation.

Every scope carries arrays for `registers`, `forms`, `audiences`, `purposes`, and
`projects`. Empty arrays mean that axis imposes no restriction. An entirely empty scope is
global and should appear only when the user intended a cross-context preference.

## Revisions and identity

Profile and preference identity use SHA-256 over canonical JSON with recursively sorted
object keys. Formatting changes do not change identity. A preference revision stores the
profile digest it was built against. Corpus or profile changes therefore make the overlay
stale visibly; the tool never silently retargets it.

Revision 1 has `parent_digest: null`. Each accepted proposal increments the revision and
stores the complete previous preference artifact's digest. The tool emits artifacts to
stdout; the orchestrator chooses filenames and retains earlier revisions.

## Scope precedence and conflicts

For each feature, compilation selects matching decisions with the greatest number of
constrained scope axes. This allows a correspondence-specific decision to override a global
decision without mutating it. If two different decisions for the same feature match at equal
specificity, compilation refuses. Stance does not break ties.

## Proposal application

The semantic agent cannot assign persistent IDs or mutate files. Its proposal is bound to
the current preference revision and digest. The user explicitly accepts operation IDs.
Deterministic application then:

1. rejects stale ancestry and unresolved questions;
2. rejects unknown or repeated accepted IDs;
3. applies only selected operations;
4. assigns IDs to additions and preserves IDs on replacement;
5. validates observation references and duplicate feature/scope pairs;
6. creates the next revision with a parent digest.

## Controlled comparisons

A comparison enables exactly one experimental decision and deterministically assigns
baseline and experiment to A/B. Both compiled specifications are returned with an
`orchestrator_only_mapping`. Do not show that mapping before the user chooses. The two model
draws can still differ for unrelated stochastic reasons, so ask which passage drove the
choice and treat an unexplained preference as weak evidence.

## Product boundary

These contracts deliberately own no database, accounts, corpus library, visual editor,
session history, or project lifecycle. A future Style Studio repository should persist and
present these portable artifacts while consuming the agents and tools from
`agent-primitives`. Persistent product state is the split point; semantic contracts remain
here.

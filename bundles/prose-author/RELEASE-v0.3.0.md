# prose-author v0.3.0 release notes

v0.3.0 adds a headless style-tuning layer without turning observed corpus evidence into
editable preference data.

## Added

- `prose-style-tune`: three-card discovery, direct feedback, explicit pin/apply, scoped
  compilation, immutable version history, deterministic diffs, and single-feature A/B trials.
- `voice-feedback-interpret`: one semantic feedback event to one reviewable
  `voice-preference-proposal/1`; it has no tools and cannot apply its own plan.
- `voice-preferences/1`: user choices with locked, preferred, avoid, and experimental stances;
  register, form, audience, purpose, and project scopes; profile identity; revision ancestry.
- `voice-style-spec/1`: the unchanged observed profile plus only the preferences active for
  one explicit context.
- Deterministic count controls for preserving, suppressing, or applying a user-stated range
  to one reproducibly measured observation.

## Compatibility

The v0.1 passage-rewrite path and v0.2 profile-only blank-page path remain available.
`voice-draft` additionally accepts a compiled style specification. `voice-profile/2` is not
modified or replaced.

## Evidence and limits

The deterministic contract suite covers profile immutability, canonical identity, stale
profile refusal, explicit operation acceptance, revision ancestry, discovery pagination,
scope precedence, equal-specificity conflict refusal, numeric target overrides, controlled
comparison assignment, and diffs. The full bundle gate and loose-file install are required
before release.

A locked, zero-redraw, one-call diagnostic against the final prompt produced a 308-word draft,
honored a user override of zero question marks, and applied the selected experimental concrete
opening. The raw call, compiled style, output, and deterministic recount are checked in under
`tests/runs/2026-08-30-v030-style-spec-canary-2`. This is a narrow integration canary, not an
acceptance study.

This release does not claim literary quality, author resemblance, or detector performance.
A/B draws remain stochastic outside the one deliberately changed style directive. The
headless artifacts provide no accounts, database, visual editor, or persistent project
service; those are the natural boundary for a future Style Studio repository.

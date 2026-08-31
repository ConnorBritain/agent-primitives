# voice-feedback-interpret

Turns one user feedback event into a narrow, reviewable
`voice-preference-proposal/1`. It is the only new semantic primitive required by the
v0.3 headless style tuner: discovery, scope matching, version ancestry, diffs,
conflict handling, comparison assignment, and application are deterministic tools.

The primitive is a planner rather than a transformer. It cannot edit the observed
profile or preference artifact, and its proposal cannot be applied while it contains
an unresolved question. The user explicitly selects operation IDs; the bundled tool
then produces a new immutable preference revision.

## Known limits

- Natural-language feedback can remain ambiguous even when it sounds decisive. The
  primitive asks a narrow question rather than inferring multiple preferences.
- Pairwise choices isolate only the preference intentionally varied. Model sampling
  still creates unrelated differences between drafts, so an unexplained choice is a
  weak signal.
- The primitive does not judge literary quality or establish resemblance. It records
  a user's preferences for later drafting.

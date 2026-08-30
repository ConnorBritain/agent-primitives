# v0.2 profile render failure — missing Markdown artifact

This is the preserved first run against the measurement-locator implementation at
`ce3b028`. It is not acceptance evidence and its lock is deliberately named
`failed-corpus.lock.json`, so the current-render drift guard cannot mistake an
incomplete failed run for a checked-in current render.

The first two Doctorow draws emitted complete two-fence `voice-profile/2` renders and
passed the schema, fixed-dimension coverage, deterministic rate, paragraph coverage,
and independent recount checks. The preregistered third draw ended normally after
1,881 seconds but emitted only the non-refusal JSON fence. Its JSON contains all ten
coverage rows, but the required Markdown profile is absent; validation therefore
reports an empty profile, unlocatable prose claims, and ten silently omitted prose
dimensions.

The EFF Mullin draw that had just started was interrupted once this structural failure
made the run incapable of passing. No successful draw from this directory is eligible
for reuse. The next attempt must lock a new implementation and generate all six
profiles afresh.

# v0.2 profile render failure — contradictory coverage status

This is the preserved first run against the self-contained envelope implementation at
`96ee6a2`. It is not acceptance evidence and its lock is deliberately named
`failed-corpus.lock.json`.

Doctorow r1 emitted a valid `voice-profile/2` envelope and passed every schema,
coverage, deterministic-rate, paragraph, and recount check. Doctorow r2 also emitted a
complete envelope, but its `self-reference-biography` coverage row was marked
`described` while referencing an observation with a first-person rate. That contradicts
the fixed status semantics: if any referenced observation has a rate, the row is
`rated` (unless it uses the dedicated `absent-paired` shape).

The following implementation repeats this as a mechanical final audit immediately
before emission. Doctorow r3 was interrupted once r2 made the run incapable of passing.
No draw from this directory is eligible for reuse.

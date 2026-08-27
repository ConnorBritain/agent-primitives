# v0.2 profile render failure — exact support syntax

This is the preserved first run against the fence-order implementation at `f91b2fa`.
It is not acceptance evidence and its lock is deliberately named
`failed-corpus.lock.json`.

The first Doctorow draw emitted both required fences and a complete
`voice-profile/2` object. All ten dimensions were covered, every deterministic rate
agreed with the independent prepass, and the paragraph/recount checks found no
divergence. Validation nevertheless rejected observation `o12`: JSON recorded support
`5/10`, while the prose printed the exact same numeric claim as `5 of 10 samples`.

The previous checker treated the slash as semantic and recognized only `5/10`. The
next implementation accepts exact numeric slash, `of`, and `out of` forms while still
rejecting a missing or different numerator/denominator. Doctorow r2 was interrupted as
soon as the structural failure was known. No draw from this directory is eligible for
reuse.

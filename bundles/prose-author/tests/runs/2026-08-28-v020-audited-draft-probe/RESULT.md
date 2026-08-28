# Production-shaped audited draft probe — boundary works, generation fails

This development probe tested prepared commit `4e8b4af`. It is not part of the v0.2
acceptance set.

The fresh Claude Sonnet low-effort draft completed in 140,811 ms. It produced a valid
`voice-draft-source/2` object with 31 sentence units. The independent rationale-bearing
claim audit completed in 183,112 ms, reconciled all 31 sentence IDs, and rejected five.
The CLI reported $0.4233 of API-equivalent telemetry across the two subscription-backed
calls; this is not evidence of a direct API charge.

The rejected sentences asserted real-world examples without enough identifying detail to
verify them: post-sale printer ink incompatibility, a car feature converted to a
subscription, a cloud-dependent robot vacuum disabled after an acquisition, generic
manufacturer claims about security and service continuity, and unnamed corporate
lobbying. One remaining legal-framework sentence was correctly queued for external
verification.

This is a guardrail pass and a product-cell failure. The auditor caught the precise class
of generic factual invention that the drafter's self-labels missed, and deterministic
assembly refused to publish the draft. No critic draws were run because claim-boundary
clearance is a locked prerequisite to voice scoring.

The result changes the next engineering question. Transport, schema portability, sentence
reconciliation, and detection are no longer the dominant uncertainty. Generation still
needs a reliable way to obtain bounded evidence or to write an argument without silently
turning plausible examples into facts.

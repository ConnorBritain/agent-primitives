# v0.2 profile render failure — recount ambiguity and unlocatable rule

This is the preserved first complete six-render set against the single-fence renderer at
`e94836e`. It is not acceptance evidence and its lock is deliberately named
`failed-corpus.lock.json`. The run used Sonnet at low effort with concurrency one.

All six model calls completed and all six emitted parseable `voice-profile/2` envelopes.
Doctorow r1 and r2 passed the complete profile validator and independent recount.
Doctorow r3 exposed a harness defect: its prose correctly stated `21.94 per 1,000 words`
and `385 instances`, but the independent recount parser mistook the fixed denominator
`1,000` for the occurrence count. The following implementation makes explicitly labelled
counts win regardless of whether the renderer puts the rate before or after them.

EFF Mullin r3 exposed a separate renderer defect. Observation `o10` attached a new
model-counted rate to figure vocabulary even though `measurements.json` was supplied, and
its long `counting_rule` did not appear verbatim in the profile prose. The validator
correctly rejected the render as unlocatable. The following implementation repeats the
literal rule check and the supplied-measurements-only restriction as a mechanical final
audit immediately before emission.

No profile, draft, refusal, or critic draw from this directory is eligible for reuse. A
new implementation commit requires a complete new six-render stability set and, if that
passes, a complete new 20-draft acceptance run.

# Cross-harness draft-source probe — transport passes, ship preflight fails

This disposable run tested the strict-harness correction at prepared commit `cbc26f6`.
It is development evidence only. Neither draft contributes to v0.2 acceptance.

## Transport result

The same fixed `voice-draft-source/1` JSON Schema worked in both harnesses:

| cell | harness | result | model time / usage |
|---|---|---|---|
| Doctorow | Claude CLI, Sonnet, low effort | valid semantic source and valid assembled `voice-draft/1` | 105,835 ms; $0.1647 API-equivalent telemetry |
| EFF Mullin | Codex CLI 0.146.0, `gpt-5.6-luna`, medium reasoning | valid semantic source and valid assembled `voice-draft/1` | 27,873 input tokens, 1,033 output tokens, 245 reasoning tokens |

Claude produced 581 words with four claims; Codex produced 545 words with four claims.
Both used empty source omission arrays, and deterministic assembly correctly omitted the
empty key from the public records. Both passed the unchanged public validator with zero
placeholder citations, zero corpus-leakage 6-grams, and zero forbidden resemblance,
quality, or detector claims.

Codex printed a local model-cache warning and a skills-budget notice. Neither prevented
the request from completing, and the strict server accepted the corrected schema. The
preceding failed probe preserves the exact schema rejection before explicit types were
added.

## Doctorow claim audit — fail

The source disclosed four checkable claims, but the draft separately asserted that
right-to-repair laws had started passing and that companies then changed their position on
independent-repair safety. That causal, attributable claim was not in `claims`. The prompt
already says every datable, attributable, or countable claim must be listed; the failure
shows that a final sentence-by-sentence claim inventory is still missing.

## Doctorow voice preflight — fail

Three fresh `prose-voice-critic` draws were run only to decide whether low draft effort was
viable. Human-readable results were:

| draw | findings | semantic verdict |
|---|---:|---|
| 1 | 0 | CLEAN |
| 2 | 1 | REVISE |
| 3 | 2 | REVISE |

Mean findings were exactly 1.0, but the majority was REVISE, so the unchanged conjunctive
bar fails. Draws 2 and 3 independently identified the remedies paragraph's legal-policy
register (`post-sale feature removal`, `convey actual use rights`, `revocable permission`)
as outside the corpus's plainer, actor-and-verb vocabulary. Draw 3 also raised one
low-confidence sarcasm mismatch.

The raw critic transports exposed another structural issue: draw 2 ended `REVISE — ...`
and draw 3 ended `VERDICT: REVISE — ...`, although the critic prompt requires a one-line
`CLEAN / REVISE` ending. The current strict parser therefore derives null verdicts. These
are not redrawn or loosely parsed. Acceptance needs a deterministic critic transport
wrapper so the model owns findings and the harness owns the closing token; the critic's
substantive contract and the ship bar remain unchanged.

## Decision

The shared draft source boundary is retained. Low effort is not promoted to the locked
acceptance default from this one failing voice cell. Before another acceptance set, the
drafter needs an explicit final claims sweep, and the acceptance-only critic transport must
make malformed verdict endings impossible without changing any finding or threshold.

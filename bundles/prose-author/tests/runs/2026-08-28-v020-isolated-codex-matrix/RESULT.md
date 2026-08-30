# Isolated Codex matrix attempt 1 — model set complete, adapter hold

This bounded development set was prepared against implementation `1a16e09`. It is not
acceptance evidence and did not advance to independent audits or critics.

All eight scheduled Codex calls completed. All six draft sources validate as
`voice-draft-source/3`, both underdetermined cases validate as refusals, every ledger has
zero external-memory claims, and every raw JSONL stream contains zero tool events.

The harness nevertheless failed its own set because Codex CLI 0.146.0 intermittently did
not materialize the optional `--output-last-message` file. The authoritative JSONL stream
contained a complete final `agent_message` and `turn.completed` for both affected cells
(`d01` and `dr01`). The adapter initially treated the missing convenience file as a model
failure.

The two original adapter-failure records are preserved beside the raw streams. A
deterministic collector repair derived the companion output from each already-recorded
agent message without another model call; the repaired records name their preserved
failure records in `recovered_from`.

Because that collector correction changed locked harness code after preparation, these
otherwise valid cells will not be reused as a clean bounded matrix. A complete new matrix
must be prepared and run against the corrected adapter.

| case | profile | shape | source | tool events | external claims | collector |
|---|---|---|---:|---:|---:|---|
| d01 | doctorow-blog | essay-topic | valid draft | 0 | 0 | recovered from JSONL |
| d05 | doctorow-blog | outline-post | valid draft | 0 | 0 | normal |
| d09 | doctorow-blog | reply | valid draft | 0 | 0 | normal |
| m01 | eff-mullin | essay-topic | valid draft | 0 | 0 | normal |
| m05 | eff-mullin | outline-post | valid draft | 0 | 0 | normal |
| m09 | eff-mullin | reply | valid draft | 0 | 0 | normal |
| dr01 | doctorow-blog | refusal | valid refusal | 0 | 0 | recovered from JSONL |
| mr01 | eff-mullin | refusal | valid refusal | 0 | 0 | normal |

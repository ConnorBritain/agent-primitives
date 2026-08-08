# Dispatching run 2026-08-07-critic-tighten-verify

3 cases × 3 draw(s) = 9 clean-context `fidelity` dispatches.
Every prompt is self-contained and identically shaped; nothing below should be edited per case.

## The rule that makes the run worth anything

Each dispatch gets a FRESH context and sees only its own prompt and the files that
prompt lists. One agent doing two cases has seen a second case's staged copies; one
agent doing all three draws of one case has seen its own earlier verdicts and is not
measuring anything anymore.

## Automatic

```bash
node tests/run-harness.mjs dispatch tests/runs/2026-08-07-critic-tighten-verify
```

Uses `$CRITIC_CMD` if set, else a `claude -p` invocation whose tool allowlist is the
integrity rule. Exits 3 with these instructions if neither is available.

## By hand, or from an agent session

For each row below: spawn a fresh subagent, give it `agent-prompt.md` as its system
prompt and the case prompt as its task, and save its reply VERBATIM to the raw path.

| case | save the reply to |
|---|---|
| `prompts/case-01-d1.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d1.md` |
| `prompts/case-01-d2.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d2.md` |
| `prompts/case-01-d3.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d3.md` |
| `prompts/case-02-d1.md` | `raw/p-f02b-surgical-cut-marker-d1.md` |
| `prompts/case-02-d2.md` | `raw/p-f02b-surgical-cut-marker-d2.md` |
| `prompts/case-02-d3.md` | `raw/p-f02b-surgical-cut-marker-d3.md` |
| `prompts/case-03-d1.md` | `raw/p-f01-word-swap-tihonov-d1.md` |
| `prompts/case-03-d2.md` | `raw/p-f01-word-swap-tihonov-d2.md` |
| `prompts/case-03-d3.md` | `raw/p-f01-word-swap-tihonov-d3.md` |

The mapping is here and not in the prompt on purpose — the fixture name encodes the
expected class in its `n-`/`p-` prefix, so the critic must not be told it.

Then:

```bash
node tests/run-harness.mjs collect tests/runs/2026-08-07-critic-tighten-verify
```

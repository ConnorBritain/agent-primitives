# Dispatching run 2026-08-07-critic-stability-f01

1 cases × 21 draw(s) = 21 clean-context `fidelity` dispatches.
Every prompt is self-contained and identically shaped; nothing below should be edited per case.

## The rule that makes the run worth anything

Each dispatch gets a FRESH context and sees only its own prompt and the files that
prompt lists. One agent doing two cases has seen a second case's staged copies; one
agent doing all three draws of one case has seen its own earlier verdicts and is not
measuring anything anymore.

## Automatic

```bash
node tests/run-harness.mjs dispatch tests/runs/2026-08-07-critic-stability-f01
```

Uses `$CRITIC_CMD` if set, else a `claude -p` invocation whose tool allowlist is the
integrity rule. Exits 3 with these instructions if neither is available.

## By hand, or from an agent session

For each row below: spawn a fresh subagent, give it `agent-prompt.md` as its system
prompt and the case prompt as its task, and save its reply VERBATIM to the raw path.

| case | save the reply to |
|---|---|
| `prompts/case-01-d1.md` | `raw/p-f01-word-swap-tihonov-d1.md` |
| `prompts/case-01-d2.md` | `raw/p-f01-word-swap-tihonov-d2.md` |
| `prompts/case-01-d3.md` | `raw/p-f01-word-swap-tihonov-d3.md` |
| `prompts/case-01-d4.md` | `raw/p-f01-word-swap-tihonov-d4.md` |
| `prompts/case-01-d5.md` | `raw/p-f01-word-swap-tihonov-d5.md` |
| `prompts/case-01-d6.md` | `raw/p-f01-word-swap-tihonov-d6.md` |
| `prompts/case-01-d7.md` | `raw/p-f01-word-swap-tihonov-d7.md` |
| `prompts/case-01-d8.md` | `raw/p-f01-word-swap-tihonov-d8.md` |
| `prompts/case-01-d9.md` | `raw/p-f01-word-swap-tihonov-d9.md` |
| `prompts/case-01-d10.md` | `raw/p-f01-word-swap-tihonov-d10.md` |
| `prompts/case-01-d11.md` | `raw/p-f01-word-swap-tihonov-d11.md` |
| `prompts/case-01-d12.md` | `raw/p-f01-word-swap-tihonov-d12.md` |
| `prompts/case-01-d13.md` | `raw/p-f01-word-swap-tihonov-d13.md` |
| `prompts/case-01-d14.md` | `raw/p-f01-word-swap-tihonov-d14.md` |
| `prompts/case-01-d15.md` | `raw/p-f01-word-swap-tihonov-d15.md` |
| `prompts/case-01-d16.md` | `raw/p-f01-word-swap-tihonov-d16.md` |
| `prompts/case-01-d17.md` | `raw/p-f01-word-swap-tihonov-d17.md` |
| `prompts/case-01-d18.md` | `raw/p-f01-word-swap-tihonov-d18.md` |
| `prompts/case-01-d19.md` | `raw/p-f01-word-swap-tihonov-d19.md` |
| `prompts/case-01-d20.md` | `raw/p-f01-word-swap-tihonov-d20.md` |
| `prompts/case-01-d21.md` | `raw/p-f01-word-swap-tihonov-d21.md` |

The mapping is here and not in the prompt on purpose — the fixture name encodes the
expected class in its `n-`/`p-` prefix, so the critic must not be told it.

Then:

```bash
node tests/run-harness.mjs collect tests/runs/2026-08-07-critic-stability-f01
```

# Dispatching run 2026-08-07-reviser-v3-gate-k7

11 cases × 7 draw(s) = 77 clean-context `fidelity` dispatches.
Every prompt is self-contained and identically shaped; nothing below should be edited per case.

## The rule that makes the run worth anything

Each dispatch gets a FRESH context and sees only its own prompt and the files that
prompt lists. One agent doing two cases has seen a second case's staged copies; one
agent doing all three draws of one case has seen its own earlier verdicts and is not
measuring anything anymore.

## Automatic

```bash
node tests/run-harness.mjs dispatch tests/runs/2026-08-07-reviser-v3-gate-k7
```

Uses `$CRITIC_CMD` if set, else a `claude -p` invocation whose tool allowlist is the
integrity rule. Exits 3 with these instructions if neither is available.

## By hand, or from an agent session

For each row below: spawn a fresh subagent, give it `agent-prompt.md` as its system
prompt and the case prompt as its task, and save its reply VERBATIM to the raw path.

| case | save the reply to |
|---|---|
| `prompts/case-01-d1.md` | `raw/p-f04-multi-entry-tihonov-d1.md` |
| `prompts/case-01-d2.md` | `raw/p-f04-multi-entry-tihonov-d2.md` |
| `prompts/case-01-d3.md` | `raw/p-f04-multi-entry-tihonov-d3.md` |
| `prompts/case-01-d4.md` | `raw/p-f04-multi-entry-tihonov-d4.md` |
| `prompts/case-01-d5.md` | `raw/p-f04-multi-entry-tihonov-d5.md` |
| `prompts/case-01-d6.md` | `raw/p-f04-multi-entry-tihonov-d6.md` |
| `prompts/case-01-d7.md` | `raw/p-f04-multi-entry-tihonov-d7.md` |
| `prompts/case-02-d1.md` | `raw/p-f02a-overreach-cut-marker-d1.md` |
| `prompts/case-02-d2.md` | `raw/p-f02a-overreach-cut-marker-d2.md` |
| `prompts/case-02-d3.md` | `raw/p-f02a-overreach-cut-marker-d3.md` |
| `prompts/case-02-d4.md` | `raw/p-f02a-overreach-cut-marker-d4.md` |
| `prompts/case-02-d5.md` | `raw/p-f02a-overreach-cut-marker-d5.md` |
| `prompts/case-02-d6.md` | `raw/p-f02a-overreach-cut-marker-d6.md` |
| `prompts/case-02-d7.md` | `raw/p-f02a-overreach-cut-marker-d7.md` |
| `prompts/case-03-d1.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d1.md` |
| `prompts/case-03-d2.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d2.md` |
| `prompts/case-03-d3.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d3.md` |
| `prompts/case-03-d4.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d4.md` |
| `prompts/case-03-d5.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d5.md` |
| `prompts/case-03-d6.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d6.md` |
| `prompts/case-03-d7.md` | `raw/p-f03b-surgical-rephrase-rossolimo-d7.md` |
| `prompts/case-04-d1.md` | `raw/p-f07-refuse-ambiguous-d1.md` |
| `prompts/case-04-d2.md` | `raw/p-f07-refuse-ambiguous-d2.md` |
| `prompts/case-04-d3.md` | `raw/p-f07-refuse-ambiguous-d3.md` |
| `prompts/case-04-d4.md` | `raw/p-f07-refuse-ambiguous-d4.md` |
| `prompts/case-04-d5.md` | `raw/p-f07-refuse-ambiguous-d5.md` |
| `prompts/case-04-d6.md` | `raw/p-f07-refuse-ambiguous-d6.md` |
| `prompts/case-04-d7.md` | `raw/p-f07-refuse-ambiguous-d7.md` |
| `prompts/case-05-d1.md` | `raw/p-f05b-surgical-cut-restatement-sister-d1.md` |
| `prompts/case-05-d2.md` | `raw/p-f05b-surgical-cut-restatement-sister-d2.md` |
| `prompts/case-05-d3.md` | `raw/p-f05b-surgical-cut-restatement-sister-d3.md` |
| `prompts/case-05-d4.md` | `raw/p-f05b-surgical-cut-restatement-sister-d4.md` |
| `prompts/case-05-d5.md` | `raw/p-f05b-surgical-cut-restatement-sister-d5.md` |
| `prompts/case-05-d6.md` | `raw/p-f05b-surgical-cut-restatement-sister-d6.md` |
| `prompts/case-05-d7.md` | `raw/p-f05b-surgical-cut-restatement-sister-d7.md` |
| `prompts/case-06-d1.md` | `raw/p-f03a-overreach-rephrase-rossolimo-d1.md` |
| `prompts/case-06-d2.md` | `raw/p-f03a-overreach-rephrase-rossolimo-d2.md` |
| `prompts/case-06-d3.md` | `raw/p-f03a-overreach-rephrase-rossolimo-d3.md` |
| `prompts/case-06-d4.md` | `raw/p-f03a-overreach-rephrase-rossolimo-d4.md` |
| `prompts/case-06-d5.md` | `raw/p-f03a-overreach-rephrase-rossolimo-d5.md` |
| `prompts/case-06-d6.md` | `raw/p-f03a-overreach-rephrase-rossolimo-d6.md` |
| `prompts/case-06-d7.md` | `raw/p-f03a-overreach-rephrase-rossolimo-d7.md` |
| `prompts/case-07-d1.md` | `raw/p-f02b-surgical-cut-marker-d1.md` |
| `prompts/case-07-d2.md` | `raw/p-f02b-surgical-cut-marker-d2.md` |
| `prompts/case-07-d3.md` | `raw/p-f02b-surgical-cut-marker-d3.md` |
| `prompts/case-07-d4.md` | `raw/p-f02b-surgical-cut-marker-d4.md` |
| `prompts/case-07-d5.md` | `raw/p-f02b-surgical-cut-marker-d5.md` |
| `prompts/case-07-d6.md` | `raw/p-f02b-surgical-cut-marker-d6.md` |
| `prompts/case-07-d7.md` | `raw/p-f02b-surgical-cut-marker-d7.md` |
| `prompts/case-08-d1.md` | `raw/p-f06-refuse-quote-drift-d1.md` |
| `prompts/case-08-d2.md` | `raw/p-f06-refuse-quote-drift-d2.md` |
| `prompts/case-08-d3.md` | `raw/p-f06-refuse-quote-drift-d3.md` |
| `prompts/case-08-d4.md` | `raw/p-f06-refuse-quote-drift-d4.md` |
| `prompts/case-08-d5.md` | `raw/p-f06-refuse-quote-drift-d5.md` |
| `prompts/case-08-d6.md` | `raw/p-f06-refuse-quote-drift-d6.md` |
| `prompts/case-08-d7.md` | `raw/p-f06-refuse-quote-drift-d7.md` |
| `prompts/case-09-d1.md` | `raw/p-f05a-overreach-cut-restatement-sister-d1.md` |
| `prompts/case-09-d2.md` | `raw/p-f05a-overreach-cut-restatement-sister-d2.md` |
| `prompts/case-09-d3.md` | `raw/p-f05a-overreach-cut-restatement-sister-d3.md` |
| `prompts/case-09-d4.md` | `raw/p-f05a-overreach-cut-restatement-sister-d4.md` |
| `prompts/case-09-d5.md` | `raw/p-f05a-overreach-cut-restatement-sister-d5.md` |
| `prompts/case-09-d6.md` | `raw/p-f05a-overreach-cut-restatement-sister-d6.md` |
| `prompts/case-09-d7.md` | `raw/p-f05a-overreach-cut-restatement-sister-d7.md` |
| `prompts/case-10-d1.md` | `raw/p-f01-word-swap-tihonov-d1.md` |
| `prompts/case-10-d2.md` | `raw/p-f01-word-swap-tihonov-d2.md` |
| `prompts/case-10-d3.md` | `raw/p-f01-word-swap-tihonov-d3.md` |
| `prompts/case-10-d4.md` | `raw/p-f01-word-swap-tihonov-d4.md` |
| `prompts/case-10-d5.md` | `raw/p-f01-word-swap-tihonov-d5.md` |
| `prompts/case-10-d6.md` | `raw/p-f01-word-swap-tihonov-d6.md` |
| `prompts/case-10-d7.md` | `raw/p-f01-word-swap-tihonov-d7.md` |
| `prompts/case-11-d1.md` | `raw/p-f08-aggressive-drop-date-d1.md` |
| `prompts/case-11-d2.md` | `raw/p-f08-aggressive-drop-date-d2.md` |
| `prompts/case-11-d3.md` | `raw/p-f08-aggressive-drop-date-d3.md` |
| `prompts/case-11-d4.md` | `raw/p-f08-aggressive-drop-date-d4.md` |
| `prompts/case-11-d5.md` | `raw/p-f08-aggressive-drop-date-d5.md` |
| `prompts/case-11-d6.md` | `raw/p-f08-aggressive-drop-date-d6.md` |
| `prompts/case-11-d7.md` | `raw/p-f08-aggressive-drop-date-d7.md` |

The mapping is here and not in the prompt on purpose — the fixture name encodes the
expected class in its `n-`/`p-` prefix, so the critic must not be told it.

Then:

```bash
node tests/run-harness.mjs collect tests/runs/2026-08-07-reviser-v3-gate-k7
```

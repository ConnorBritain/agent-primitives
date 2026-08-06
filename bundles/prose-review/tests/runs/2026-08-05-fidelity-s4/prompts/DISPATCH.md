# Dispatching run 2026-08-05-fidelity-s4

13 cases, one clean-context `fidelity` critic each. Every prompt is
self-contained and identically shaped; nothing below should be edited per case.

## The rule that makes the run worth anything

Each critic gets a FRESH context and sees only its own prompt and the files that
prompt lists. One agent doing two cases has seen a second case's staged copies; one
agent doing them all has seen the whole set and can infer the design.

## Automatic

```bash
node tests/run-harness.mjs dispatch tests/runs/2026-08-05-fidelity-s4
```

Uses `$CRITIC_CMD` if set, else a `claude -p` invocation whose tool allowlist is the
integrity rule. Exits 3 with these instructions if neither is available.

## By hand, or from an agent session

For each `prompts/case-NN.md`: spawn a subagent, give it `agent-prompt.md` as its
system prompt and the case prompt as its task, and save its reply VERBATIM to:

| case | save the reply to |
|---|---|
| `prompts/case-01.md` | `raw/p-death-severus-unnamed.md` |
| `prompts/case-02.md` | `raw/n-beauty-modernised.md` |
| `prompts/case-03.md` | `raw/p-beauty-qualifications-dropped.md` |
| `prompts/case-04.md` | `raw/n-tihonov-reordered.md` |
| `prompts/case-05.md` | `raw/n-rossolimo-island-dropped.md` |
| `prompts/case-06.md` | `raw/n-tihonov-moscow-university.md` |
| `prompts/case-07.md` | `raw/n-rossolimo-tightened.md` |
| `prompts/case-08.md` | `raw/p-tihonov-summarised.md` |
| `prompts/case-09.md` | `raw/p-rossolimo-hedges-removed.md` |
| `prompts/case-10.md` | `raw/p-sister-fourmis-cut.md` |
| `prompts/case-11.md` | `raw/p-sister-scope-dropped.md` |
| `prompts/case-12.md` | `raw/p-death-quotes-paraphrased.md` |
| `prompts/case-13.md` | `raw/n-sister-condensed.md` |

The mapping is here and not in the prompt on purpose — the fixture name encodes the
expected class in its `n-`/`p-` prefix, so the critic must not be told it.

Then:

```bash
node tests/run-harness.mjs collect tests/runs/2026-08-05-fidelity-s4
```

# Working in this repo

Instructions for a coding agent contributing to `agent-primitives` itself. For the agents
this repo *ships*, see [`bundles/verification-gate/AGENTS.md`](bundles/verification-gate/AGENTS.md).

## What this repo is

A library of agent patterns — reviewers, gates, workflows — authored once in a harness-neutral
form under `primitives/` and deployed per harness under `bundles/`. The content is prompts and
docs; the only executable code is hooks.

## The one rule that breaks things

**`primitives/` is the source; `bundles/` is the deployment.** The rendered agent in
`bundles/<bundle>/agents/<name>.md` must have a body byte-identical to
`primitives/agents/<name>/agent.md` — the only permitted difference is added frontmatter keys
(`tools`, `model`, `color`) drawn from `meta.yaml`.

There is no generator yet, so this is maintained by hand. **Change both in the same commit.**
A drifted pair is worse than a single format, because it silently ships two different agents
under one name.

Verify before committing:

```bash
diff <(sed '1,/^---$/d;1,/^---$/d' primitives/agents/<name>/agent.md) \
     <(sed '1,/^---$/d;1,/^---$/d' bundles/<bundle>/agents/<name>.md)
```

## Conventions

- **Frontmatter in `primitives/**/agent.md` carries only `name` and `description.`** Anything
  harness-specific belongs in `meta.yaml`.
- **`enforcement` must be honest** — `enforced` | `partial` | `advisory`. Overstating it is
  the most damaging error available here; see [`docs/portability.md`](docs/portability.md).
- **No secrets, credentials, or user-specific paths.** This repo is public.
- **Every reviewer ends in a verdict token.** A review that trails into prose is advisory.
- **Docs explain rationale, not just mechanics.** The checklist is in `agent.md`; the README
  earns its place by saying why those checks and not others.

## Before you call a change here done

- Hooks: exercise every path — config absent, config malformed, check passing, check failing,
  timeout, loop guard. Show the output.
- Prompts: run against a deliberately poisoned diff (weakened assertion, added `skip`,
  duplicated helper) *and* a clean one. Both results go in the PR. See
  [`CONTRIBUTING.md`](CONTRIBUTING.md#testing-a-primitive).
- JSON: all manifests parse, and `version` is identical across the four plus the marketplace
  entry.
- New primitive: work the checklist in [`CONTRIBUTING.md`](CONTRIBUTING.md#checklist).

## Layout

```
primitives/agents/<name>/{agent.md, meta.yaml, README.md}   source of truth
bundles/<bundle>/                                           deployable unit, 4 manifests
docs/{gate-protocol,portability}.md, docs/snippets/         the protocol and its wiring
.claude-plugin/marketplace.json                             makes the repo a CC marketplace
install.sh / install.ps1                                    loose-file install
```

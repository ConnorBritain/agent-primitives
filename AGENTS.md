# Working in this repo

Instructions for a coding agent contributing to `agent-primitives` itself. For the agents this
repo *ships*, see the relevant bundle — e.g. [`bundles/verification-gate/AGENTS.md`](bundles/verification-gate/AGENTS.md).

## What this repo is

A library of agent patterns — reviewers, transformers, authors, investigators, planners —
authored once in harness-neutral form under `primitives/` and deployed per harness under
`bundles/`. Content is prompts and docs; the only executable code is hooks.

The repo is **not scoped to any one domain.** The first bundle is about software delivery;
nothing in the authoring guidance should assume that. If you're adding to the repo-level docs
and find yourself writing "the diff" or "the verdict", you're writing bundle-level material in
a repo-level file.

## The two rules that break things

**1. `primitives/` is the source; `bundles/` is the deployment.** The rendered agent in
`bundles/<bundle>/agents/<name>.md` must have a body byte-identical to
`primitives/agents/<name>/agent.md`. The only permitted difference is added frontmatter keys
(`tools`, `model`, `color`) drawn from `meta.yaml`.

There's no generator yet, so this is maintained by hand. **Change both in the same commit.** A
drifted pair silently ships two different agents under one name. Verify:

```bash
diff <(sed '1,/^---$/d;1,/^---$/d' primitives/agents/<name>/agent.md) \
     <(sed '1,/^---$/d;1,/^---$/d' bundles/<bundle>/agents/<name>.md)
```

**2. Repo-level `docs/` is kind-agnostic; bundle-specific material lives in the bundle.**
Protocols, rationale, and wiring snippets that are true of only one bundle go in
`bundles/<bundle>/`. This is what stops `docs/` from becoming a monument to whichever bundle
landed first.

## Conventions

- **Frontmatter in `primitives/**/agent.md` carries only `name` and `description`.** Anything
  harness-specific belongs in `meta.yaml`.
- **Every primitive declares a `kind`**, and the kind determines its rules — a reviewer must be
  read-only, a transformer obviously isn't. See [`CONTRIBUTING.md`](CONTRIBUTING.md#kinds)
  before applying a rule from one kind to another.
- **`enforcement` must be honest** — `enforced` | `partial` | `advisory`. Overstating it is the
  most damaging error available here; see [`docs/portability.md`](docs/portability.md).
- **Every primitive has a stated output contract** and a *Known limits* section.
- **No secrets, credentials, or user-specific paths.** This repo is public.
- **Docs explain rationale, not just mechanics.** The checklist is in `agent.md`; the README
  earns its place by saying why those items and not others.

## Before you call a change here done

- **Prompts:** run the positive *and* negative test for the primitive's kind
  ([`CONTRIBUTING.md`](CONTRIBUTING.md#testing-a-primitive)). Both results go in the PR. The
  negative test is the one that gets skipped and the one that matters.
- **Hooks:** exercise every path — config absent, malformed, check passing, check failing,
  timeout, loop guard. Show the output.
- **JSON:** all manifests parse; `version` identical across the four plus the marketplace entry.
- **Links:** relative links resolve after any file move.
- **New primitive:** work the checklist in [`CONTRIBUTING.md`](CONTRIBUTING.md#checklist).

## Layout

```
primitives/agents/<name>/{agent.md, meta.yaml, README.md}   source of truth
bundles/<bundle>/                                           deployable unit, 4 manifests,
                                                            + wiring/ PROTOCOL.md AGENTS.md
docs/wiring.md                                              invocation modes; editing
                                                            CLAUDE.md / AGENTS.md
docs/portability.md                                         what degrades per harness, per kind
.claude-plugin/marketplace.json                             makes the repo a CC marketplace
install.sh / install.ps1                                    loose-file install
```

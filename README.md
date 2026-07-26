# agent-primitives

A library of agent patterns that you can plug into whichever coding harness you actually use.

A **primitive** is one small, sharp behavior — a reviewer, a rewriter, an investigator, a
planner — written once in a harness-neutral form and deployed to Claude Code, Codex, Cursor,
or a plain `AGENTS.md` project. Every one ships with a write-up explaining what it does, why
it exists, and where it stops working, because a prompt you can't reason about is a prompt
you can't trust.

The thesis: the useful unit is not "a plugin" or "an `AGENTS.md` file". It's the *pattern*,
and the pattern outlives the format it happens to be written in. Formats are proliferating
and will keep proliferating. Judgment that took real work to encode shouldn't be rewritten
every time one appears.

## Catalog

| Bundle | Domain | Primitives | Kind |
|---|---|---|---|
| [`verification-gate`](bundles/verification-gate/) | Software delivery | [`verification-critic`](primitives/agents/verification-critic/) · [`architecture-reviewer`](primitives/agents/architecture-reviewer/) | reviewer |

One bundle today. [`CONTRIBUTING.md`](CONTRIBUTING.md) is the spec for adding another, in any
domain — the repo is not scoped to code review, and the authoring guidance is organised by
**kind** rather than by subject matter.

A bundle is the unit you install and toggle, so it holds the primitives you'd want on or off
*together* — see [sizing a bundle](CONTRIBUTING.md#sizing-a-bundle). Adding a new domain means
a new bundle plus one entry in [`marketplace.json`](.claude-plugin/marketplace.json); it does
not disturb the existing ones.

## Kinds

Kind determines what a primitive must promise, how it's wired in, and how you test it.

| Kind | Reads / writes | Ends in | Example |
|---|---|---|---|
| **reviewer** | read-only | a verdict | `verification-critic` |
| **transformer** | rewrites its input | changed artifact + what it preserved | a prose humanizer, a codemod |
| **author** | writes new artifacts | the artifact + how it was verified | a test author |
| **investigator** | read-only | a map or an answer, with sources | a schema explorer |
| **planner** | read-only | a plan with its success criteria | a decomposition agent |

The split matters because the design rules invert. A reviewer must be read-only and must not
share context with whoever produced the work — that isolation *is* the mechanism. A
transformer obviously writes, and its central risk is the opposite one: changing something it
was supposed to preserve. Applying reviewer rules to a transformer produces a primitive that
can't do its job; applying transformer rules to a reviewer produces a rubber stamp.

## Install

### Claude Code — plugin

```
/plugin marketplace add ConnorBritain/agent-primitives
/plugin install verification-gate@agent-primitives
```

### Claude Code — loose files

```bash
./install.sh                     # every agent → ~/.claude/agents/
./install.sh --project           # every agent → ./.claude/agents/
./install.sh verification-critic # just one
./install.sh --list              # what's available
```

```powershell
.\install.ps1                    # → $HOME\.claude\agents\
.\install.ps1 -Project           # → .\.claude\agents\
```

### Codex, Cursor, Copilot, Zed, or any AGENTS.md project

Each bundle ships a portable variant — see its `AGENTS.md` and `wiring/` directory.

### Then wire it

Some primitives are picked up automatically once installed; others need a line in your
`CLAUDE.md` or `AGENTS.md` before anything invokes them. Which one depends on the kind, and
getting it wrong is the most common reason a primitive appears installed but never runs.

**[`docs/wiring.md`](docs/wiring.md)** covers the three invocation modes and how to edit those
files without turning them into a junk drawer.

## What ports, and what doesn't

The prompt body ports at ~100%: markdown with YAML frontmatter is read by every major harness,
and `name` + `description` are near-universal. **Enforcement does not port.**

| Property | Claude Code | Cursor | Codex | AGENTS.md only |
|---|---|---|---|---|
| Separate context from the caller | ✅ | ⚠️ | ⚠️ via subprocess | ❌ |
| Tool restrictions enforced by allowlist | ✅ | ⚠️ | ❌ | ❌ |
| Can block the turn | ✅ | ❌ | ❌ | ❌ |
| Model pinned | ✅ | ⚠️ | ❌ | ❌ |

How much that costs you depends entirely on the kind. A reviewer loses most of its value —
context isolation is the mechanism, and a critic reviewing work it argued itself into will
approve it. An investigator barely notices. A transformer sits in between: it still works, but
"don't touch anything outside the selection" stops being a guarantee.

So each primitive declares the contract it *needs* in `meta.yaml`, separately from what each
harness actually delivers, labelled `enforced` / `partial` / `advisory`. Details and
mitigations in **[`docs/portability.md`](docs/portability.md)**.

## Layout

```
primitives/agents/<name>/     harness-neutral source of truth
  agent.md                    prompt body + universal frontmatter (name, description)
  meta.yaml                   kind, contract, per-harness metadata + enforcement level
  README.md                   the write-up

bundles/<bundle>/             a deployable unit — the primitives you turn on and off together
  agents/*.md                 rendered with Claude Code frontmatter
  hooks/                      enforcement only some harnesses support
  wiring/                     copy-paste CLAUDE.md / AGENTS.md snippets for THIS bundle
  AGENTS.md                   portable variant
  PROTOCOL.md                 how this bundle's primitives are meant to be run (if non-obvious)
  .claude-plugin/ .cursor-plugin/ .codex-plugin/ .plugin/

docs/
  wiring.md                   how any primitive gets invoked; editing CLAUDE.md / AGENTS.md
  portability.md              the degradation ladder, per kind
```

Repo-level `docs/` is **kind-agnostic**. Anything true only of one bundle lives in that
bundle — its protocol, its snippets, its rationale. That boundary is what keeps the repo from
collapsing into a monument to whatever got added first.

**`primitives/` is the source; `bundles/` is the deployment.** Today the rendered files are
maintained by hand — at two primitives, a generator is more machinery than content. Past ~4, a
build step renders `bundles/` from `primitives/` with a `--check` mode in CI, following the
pattern in [`vercel/vercel-plugin`](https://github.com/vercel/vercel-plugin). The layout is
already shaped for it. Until then: **change a primitive and its rendered copy in the same
commit.**

## Design rules

Kind-independent. Per-kind rules are in [`CONTRIBUTING.md`](CONTRIBUTING.md).

1. **Narrowest capability that does the job.** Read-only unless writing is the point; the
   specific tools needed, not a blanket grant.
2. **One primitive, one job.** Two primitives with overlapping scope make each other weaker,
   because each assumes the other has it covered.
3. **Bounded, ordered instructions.** An open-ended "look for problems" returns whatever is
   most salient. Numbered priorities decide what survives a truncated response.
4. **A stated output contract.** Ending in a defined shape — a verdict, a diff summary, a
   sourced answer — is what makes a primitive composable instead of merely helpful.
5. **Stated limits.** Every primitive has a boundary. One with no *Known limits* section is
   one nobody has pushed on yet.
6. **Honest enforcement labels.** An `advisory` port described as `enforced` is worse than no
   port — it buys confidence exactly where the goal was to stop trusting self-reports.

## Prior art

The verification-first framing behind the first bundle follows Anthropic's writing on long
agentic runs — the [C compiler project](https://www.anthropic.com/engineering/building-c-compiler)
in particular, where the verifier is load-bearing precisely because no human reads everything
the agent produces.

The multi-manifest packaging (`.claude-plugin/` alongside `.cursor-plugin/`, `.codex-plugin/`,
and a generic `.plugin/`) follows [`vercel/vercel-plugin`](https://github.com/vercel/vercel-plugin),
which ships one directory to four harnesses with a generator and a CI drift check.

## License

MIT — see [LICENSE](LICENSE).

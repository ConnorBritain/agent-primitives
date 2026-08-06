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
| [`prose-tell-scan`](bundles/prose-tell-scan/) | Prose measurement | [`tell-scan`](bundles/prose-tell-scan/skills/tell-scan/) skill · `/prose-tell-scan:tell-scan` | investigator |
| [`prose-review`](bundles/prose-review/) | Prose judgement | [`prose-voice-critic`](primitives/agents/prose-voice-critic/) · [`prose-fidelity-critic`](primitives/agents/prose-fidelity-critic/) | reviewer |
| [`prose-author`](bundles/prose-author/) | Prose generation | [`prose-draft`](bundles/prose-author/skills/prose-draft/) skill | author |

[`CONTRIBUTING.md`](CONTRIBUTING.md) is the spec for adding another, in any domain — the repo
is not scoped to code review, and the authoring guidance is organised by **kind** rather than
by subject matter.

A bundle may ship agents, a **skill**, or both, and the difference matters before you copy the
pattern: a skill carries its own tooling by relative path, so it survives both a plugin install
and a plain copy into `~/.claude/skills/`. Commands survive too, provided they delegate to their
skill instead of shelling out through `${CLAUDE_PLUGIN_ROOT}`, which only resolves under a
plugin.

`prose-tell-scan` is the first bundle to ship a skill, and it is mid-build: v0.1 is the
deterministic layer. Its critics and revise pass go in a *separate* `prose-review` bundle
rather than this one — see [sizing a bundle](CONTRIBUTING.md#sizing-a-bundle), which is honest
that half the argument for that split is still a projection.

Its test corpus has grown too. `corpus/human-essays/` holds **six single authors
across four centuries and four registers** — argumentative essay (Bacon 1625,
Chesterton 1909), correspondence (Chekhov 1920), narration (Chopin 1899, O. Henry
1906), modern long-form (Doctorow) — all public domain or CC-BY, vendored by
reproducible fetchers. Alongside them: `corpus/human-professional/` (EFF Deeplinks,
CC-BY 4.0, deliberately multi-author for register coverage) and the 12 Wikipedia
articles in `corpus/human/`.

**Counts are not printed here on purpose.** Run
[`stats.mjs`](bundles/prose-tell-scan/tests/corpus/stats.mjs) — the figures that used
to sit in this paragraph went stale in the same commit that grew the corpus.

The single-author/multi-author split is load-bearing rather than incidental: voice
work needs one identifiable writer per corpus, and the multi-author buckets are
capped and guarded so no byline can ever be mistaken for one. Six single authors is
30 ordered cross-author pairs, which is what a voice critic needs to be measured on
a *person* rather than on a register.

It has already paid for itself once. `prose-fidelity-critic` is built on it:
each acceptance fixture pairs a byte-identical copy of a Bacon essay or a Chekhov
letter with a revision written to lose something specific. Because fidelity has
ground truth — the original — that critic is the first here to ship with a
measured **true-positive** rate rather than a false-positive bound. The others
cannot, and [`prose-review/DESIGN.md`](bundles/prose-review/DESIGN.md) says why:
the useful question is not "where do I find labelled data" but "does this
question have an answer that does not depend on who is asked".

A bundle is the unit you install and toggle, so it holds the primitives you'd want on or off
*together* — see [sizing a bundle](CONTRIBUTING.md#sizing-a-bundle). Adding a new domain means
a new bundle plus one entry in [`marketplace.json`](.claude-plugin/marketplace.json); it does
not disturb the existing ones.

## Kinds and surfaces

Two independent axes. **Kind** is what a primitive promises — it determines the design rules
and how you test it. **Surface** is how it ships — it determines packaging and the install
path. A reviewer can be an agent or a skill; so can an investigator.

| Kind | Reads / writes | Ends in | Example |
|---|---|---|---|
| **reviewer** | read-only | a verdict | `verification-critic` |
| **transformer** | rewrites its input | changed artifact + what it preserved | a codemod, a prose reviser |
| **author** | writes new artifacts | the artifact + how it was verified | a test author |
| **investigator** | read-only | a map or an answer, with sources | `tell-scan` |
| **planner** | read-only | a plan with its success criteria | a decomposition agent |

| Surface | Invoked by | Lives in | Reach for it when |
|---|---|---|---|
| **agent** | the dispatcher, or a protocol rule | `primitives/agents/` → rendered to `bundles/` | The work needs its own context window |
| **skill** | the dispatcher, or by name | `bundles/<b>/skills/` | The primitive ships scripts, catalogs, or reference files |
| **command** | the user types `/name` | `bundles/<b>/commands/` | An explicit entry point worth naming |
| **hook** | the harness, on an event | `bundles/<b>/hooks/` | Enforcement the model must not route around |

Only agents get a `primitives/` entry, because only agents are rendered per harness. See
[surfaces](CONTRIBUTING.md#surfaces) — including the path rule that decides whether your
primitive survives a non-plugin install.

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
./install.sh                     # agents, skills, and commands → ~/.claude/
./install.sh --project           # → ./.claude/
./install.sh verification-critic # just one — a skill brings its command along
./install.sh --list              # what's available
```

```powershell
.\install.ps1                    # → $HOME\.claude\
.\install.ps1 -Project           # → .\.claude\
```

Agents land in `agents/`, skills as whole directories in `skills/`, commands in
`commands/`.

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
  skills/<name>/              SKILL.md + any tooling it needs, self-contained
  commands/*.md               slash commands; delegate to a skill to stay portable
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

# agent-primitives

A library of agent patterns that you can plug into whichever coding harness you actually use.

Each primitive is a small, sharp behavior — a reviewer, a gate, a workflow — written once in
a harness-neutral form and deployed to Claude Code, Codex, Cursor, or a plain `AGENTS.md`
project. Every one ships with a write-up explaining **what it catches, why it exists, and
where it stops working**, because a prompt you can't reason about is a prompt you can't trust.

The thesis is that the useful unit here is not "a plugin" or "an `AGENTS.md` file". It is the
*pattern* — and the pattern outlives the format it happens to be written in. Formats are
proliferating and will keep proliferating. The judgment encoded in a good reviewer prompt
shouldn't have to be rewritten every time one appears.

## What's here

| Bundle | Primitives | What it's for |
|---|---|---|
| [`verification-gate`](bundles/verification-gate/) | [`verification-critic`](primitives/agents/verification-critic/) · [`architecture-reviewer`](primitives/agents/architecture-reviewer/) | Stop an agent from declaring a task done when it gamed the check or quietly wrecked the structure |

More to come. [`CONTRIBUTING.md`](CONTRIBUTING.md) is the spec for adding one.

## The problem this repo is pointed at

An agent finishes a turn and reports success. You have three options: read the entire diff,
which defeats the point of delegating; trust it, which is how test suites quietly rot; or make
"done" a claim that something independent checks.

The failure is structural, not a matter of model quality. Given a failing test and a goal,
green is reachable two ways — fix the code, or change what green means. Loosen the assertion.
Add a `skip`. Hard-code the value the test happens to check. Wrap the failure in a bare
`except`. The second path is faster and, from inside the session, does not feel like cheating.
It feels like unblocking. Every proxy for "working software" is gameable, and a green suite is
a proxy.

The primitives here are the checks that catch that class of thing. They are deliberately
adversarial, deliberately read-only, and deliberately run somewhere other than the context
that wrote the code.

## Install

### Claude Code — plugin

```
/plugin marketplace add ConnorBritain/agent-primitives
/plugin install verification-gate@agent-primitives
```

### Claude Code — loose files

```bash
./install.sh                     # both agents → ~/.claude/agents/
./install.sh --project           # both agents → ./.claude/agents/
./install.sh verification-critic # just one
```

```powershell
.\install.ps1                    # → $HOME\.claude\agents\
.\install.ps1 -Project           # → .\.claude\agents\
```

Then paste [`docs/snippets/claude-md.md`](docs/snippets/claude-md.md) into your `CLAUDE.md`.
**Installing without the wiring gives you two reviewers that never run** — nothing invokes a
subagent on its own.

### Codex, Cursor, Copilot, Zed, or any AGENTS.md project

Append [`bundles/verification-gate/AGENTS.md`](bundles/verification-gate/AGENTS.md) to your
project `AGENTS.md`, or paste [`docs/snippets/agents-md.md`](docs/snippets/agents-md.md) for
the short form.

Read [`docs/portability.md`](docs/portability.md) first — the port is real but weaker, and
it's worth knowing exactly how before you rely on it.

## What ports, and what doesn't

The prompt body ports at ~100%: markdown with YAML frontmatter is read by every major harness,
and `name` + `description` are near-universal. **Enforcement does not port**, and for reviewer
primitives, enforcement is most of the value:

| Property | Claude Code | Cursor | Codex | AGENTS.md only |
|---|---|---|---|---|
| Separate context from the writer | ✅ | ⚠️ | ⚠️ via subprocess | ❌ |
| Read-only enforced by tool allowlist | ✅ | ⚠️ | ❌ | ❌ |
| Can block the turn on a red gate | ✅ | ❌ | ❌ | ❌ |
| Model pinned | ✅ | ⚠️ | ❌ | ❌ |

So: **you can share the judgment; you can't share the teeth.** A critic in the writer's own
context has spent the session arguing itself into the code and will approve it. A critic that
can edit will fix instead of report. Each primitive declares the contract it needs in its
`meta.yaml`, and each harness entry is labelled `enforced`, `partial`, or `advisory` — an
advisory port described as if it were enforced is worse than no port at all.

## Layout

```
primitives/agents/<name>/     harness-neutral source of truth
  agent.md                    prompt body + universal frontmatter
  meta.yaml                   contract + per-harness metadata and enforcement level
  README.md                   what it catches, why it exists, how to read the verdict

bundles/<bundle>/             a deployable unit, one per install target
  agents/*.md                 rendered with Claude Code frontmatter
  hooks/                      enforcement that only some harnesses support
  AGENTS.md                   portable variant
  .claude-plugin/ .cursor-plugin/ .codex-plugin/ .plugin/

docs/
  gate-protocol.md            the end-of-turn sequence and why it's ordered that way
  portability.md              the degradation ladder, in detail
  snippets/                   copy-paste wiring for CLAUDE.md and AGENTS.md
```

**`primitives/` is the source; `bundles/` is the deployment.** Today the rendered files in
`bundles/` are maintained by hand — at two primitives, a generator would be more machinery
than content. Once this passes ~4, a build step renders `bundles/` from `primitives/` with a
`--check` mode in CI, following the pattern the Vercel plugin uses. The layout is already
shaped for it, so that lands without a reorganisation.

Until then: **if you change a primitive, change its rendered copy in the same commit.** A
drifted pair is worse than a single format.

## Design rules

These are the constraints that make the primitives here worth reusing:

1. **Reviewers are read-only.** An agent able to fix what it finds stops reporting and starts
   patching, which returns you to an unreviewed diff — now with its changes in it too.
2. **The reviewer is never the writer.** Clean context is the whole mechanism. Everything else
   is a detail.
3. **Every review ends in a verdict token.** A review that trails off into prose is advisory;
   one that ends in `BLOCK` is a gate.
4. **Scope to the diff.** Whole-repo reviewers return backlogs, and backlogs get ignored.
5. **Adversarial framing, explicitly.** "Please review this" returns praise. "Assume the
   author took the easy path and prove it" returns findings.
6. **Uncertainty resolves to BLOCK.** A critic that rounds ambiguity to "probably fine"
   converges on rubber-stamping, which costs tokens and manufactures confidence.

## Prior art

The verification-first framing follows Anthropic's writing on long agentic runs — the
[C compiler project](https://www.anthropic.com/engineering/building-c-compiler) in particular,
where the verifier is the load-bearing component precisely because no human reads everything
the agent produces.

The multi-manifest packaging (`.claude-plugin/` alongside `.cursor-plugin/`, `.codex-plugin/`,
and a generic `.plugin/`) follows [`vercel/vercel-plugin`](https://github.com/vercel/vercel-plugin),
which ships one directory to four harnesses with a generator and a CI drift check.

## License

MIT — see [LICENSE](LICENSE).

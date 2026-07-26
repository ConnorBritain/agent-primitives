# Portability

What survives the trip between harnesses, and what doesn't.

## The substrate

Markdown with YAML frontmatter is the common format. Claude Code, Cursor, Codex, and Kimi all
read agent definitions in that shape, and `name` + `description` are near-universal keys.
**The prompt body ports at essentially 100%.**

That's the good news, and it's why one source of truth is viable at all.

## What doesn't port

Enforcement.

| Property | Claude Code | Cursor | Codex | AGENTS.md only |
|---|---|---|---|---|
| Runs in a **separate context** from the caller | ✅ real subagent | ⚠️ weaker | ⚠️ via `codex exec` | ❌ same context |
| **Tool restrictions** enforced (`tools:` allowlist) | ✅ harness-enforced | ⚠️ partial | ❌ prose only | ❌ prose only |
| Can **block the turn** | ✅ Stop hook | ❌ | ❌ | ❌ |
| **Model pinned** | ✅ | ⚠️ | ❌ | ❌ |
| Prompt body | ✅ | ✅ | ✅ | ✅ |

Read it as a ladder, not a checklist. Each rung you lose degrades the primitive in a specific,
predictable way:

**Lose separate context** and the agent shares the history of whoever produced the work — with
all its justifications pre-loaded.

**Lose the tool allowlist** and "read-only" becomes a request. An agent that *can* act on what
it finds generally will.

**Lose turn-blocking** and any rule about when the primitive must run becomes a suggestion.

## How much it costs depends on the kind

This is the part worth getting right, because the answer is not uniform.

**reviewer — severe.** Context isolation *is* the mechanism. A critic reviewing work it argued
itself into will approve it, and the read-only guarantee is what stops it from quietly fixing
instead of reporting. On an advisory-only harness a reviewer keeps its checklist and loses its
independence, which is most of its value. Treat an advisory reviewer as a linting aid, not a
gate.

**transformer — moderate.** The rewrite still happens correctly; the prompt carries the method.
What degrades is the boundary: `preserves` and `scope: selection` stop being guarantees and
become intentions, so a transformer told to touch only the prose in a document may reformat the
code blocks too. Mitigate by narrowing the input rather than trusting the constraint — pass the
selection, don't pass the file and describe the selection.

**author — moderate.** Output quality holds. What you lose is the assurance that it only wrote
where it was supposed to. Review the file list.

**investigator — mild.** Read-only is a natural fit for the task rather than a constraint being
fought, and there's no verdict anyone has an incentive to skip. Ports nearly intact.

**planner — mild.** Same reason. The plan is the artifact; nothing about it needs enforcement.

So the question isn't "does this port?" but "which rung does this kind actually stand on?" A
reviewer that loses context isolation has lost the argument. An investigator hasn't noticed.

## Recovering what you can

- **Fresh subprocess.** `codex exec` (or equivalent) with the input piped in recovers context
  isolation, the rung that usually matters most. Tool restriction and blocking remain
  unavailable; state them in the prompt and accept that they're honour-system.
- **New session, paste the input.** Manual, works everywhere, honest.
- **CI.** The durable fallback for anything gate-shaped: clean context by construction, and it
  can genuinely block a merge. Later feedback than a Stop hook, but real enforcement, and it
  works regardless of which harness the author was using.
- **Narrow the input.** For transformers and authors, the most reliable way to enforce scope on
  a harness that can't is to hand over less.

## Design consequence

Primitives declare the **contract** they need separately from the per-harness metadata that may
or may not deliver it. See any `primitives/agents/*/meta.yaml`:

```yaml
contract:
  read_only: true
  clean_context: true
  scope: diff

harness:
  claude-code: { enforcement: enforced, ... }
  codex:       { enforcement: advisory, ... }
```

`enforcement` is the honest label: `enforced`, `partial`, or `advisory`. When the generator
lands it reads this to emit each target, and keeps the tables above accurate.

Say the degradation out loud in user-facing docs. An `advisory` port described as `enforced` is
worse than no port, because it buys false confidence in exactly the place where the point was
to stop trusting the agent's self-report.

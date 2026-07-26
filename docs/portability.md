# Portability

What survives the trip between harnesses, and what doesn't.

## The substrate

Markdown with YAML frontmatter is the common format. Claude Code, Cursor, Codex, and Kimi
all read agent definitions in that shape, and `name` + `description` are near-universal keys.
**The prompt body ports at essentially 100%.**

That is the good news, and it is why one source of truth is viable at all.

## What does not port

Enforcement. And for reviewer primitives specifically, enforcement is most of the value.

| Property | Claude Code | Cursor | Codex | AGENTS.md only |
|---|---|---|---|---|
| Runs in a **separate context** from the writer | ✅ real subagent | ⚠️ weaker | ⚠️ via `codex exec` | ❌ same context |
| **Read-only** is enforced (`tools:` allowlist) | ✅ harness-enforced | ⚠️ partial | ❌ prose only | ❌ prose only |
| Can **block the turn** on a red gate | ✅ Stop hook | ❌ | ❌ | ❌ |
| **Model pinned** (`model: sonnet`) | ✅ | ⚠️ | ❌ | ❌ |
| Prompt body | ✅ | ✅ | ✅ | ✅ |

Read that table as a ladder, not a set of checkboxes. Each rung you lose makes the reviewer
weaker in a specific, predictable way:

**Lose separate context** and the critic has spent the whole session arguing itself into the
code it is now reviewing. It has the justification pre-loaded. This is the single most
important property, because it is the entire reason a second agent beats "please double-check
your work" — and it is the first one to go.

**Lose the read-only allowlist** and the critic can edit. Given the ability to fix what it
finds, an agent will fix rather than report, and you are back to an unreviewed diff — now
with the reviewer's changes in it too.

**Lose turn-blocking** and the gate is a suggestion. An agent that wants to declare done will
declare done. This is the difference between a gate and a note.

## Recovering what you can

- **Codex** — run each reviewer as a fresh `codex exec` subprocess against the diff rather
  than as an inline section of `AGENTS.md`. This recovers context isolation, the rung that
  matters most. Read-only and blocking are still unavailable; state them in the prompt and
  accept that they are honour-system.
- **Any harness** — run the reviewer in a new session with only the diff pasted in. Slower
  and manual, but honest.
- **CI** — the durable fallback. A reviewer that runs in CI on the PR gets clean context by
  construction and can genuinely block the merge. It is later feedback than a Stop hook, but
  it is real enforcement, and it works everywhere.

## Design consequence

Because the ladder exists, primitives in this repo declare their **contract** — the
properties they need to work — separately from the per-harness metadata that may or may not
deliver it. See any `primitives/agents/*/meta.yaml`:

```yaml
contract:
  read_only: true
  clean_context: true
  verdict: [SHIP, BLOCK]
  scope: diff

harness:
  claude-code: { enforcement: enforced, ... }
  codex:       { enforcement: advisory, ... }
```

The `enforcement` key is the honest label: `enforced`, `partial`, or `advisory`. When the
generator lands, it reads this to emit each target, and the README table above is the thing
it keeps accurate.

Say the degradation out loud in user-facing docs. An `advisory` port that gets described as
if it were `enforced` is worse than no port, because it buys false confidence in exactly the
place where the whole point was to stop trusting the agent's self-report.

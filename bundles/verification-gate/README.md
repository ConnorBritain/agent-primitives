# verification-gate

The end-of-turn gate: two read-only reviewers that run in a context separate from the one
that wrote the code, before an agent is allowed to say "done".

| Primitive | Catches | Verdict |
|---|---|---|
| [`verification-critic`](../../primitives/agents/verification-critic/) | Reward-hacking, spec drift | `SHIP` / `BLOCK` |
| [`architecture-reviewer`](../../primitives/agents/architecture-reviewer/) | Structural decay | `SHIP` / `SHIP WITH FIXES` / `DO NOT SHIP` |

Full rationale for each is in its primitive README. The protocol that runs them is
[docs/gate-protocol.md](../../docs/gate-protocol.md).

## Contents

```
agents/                 the two reviewers, with Claude Code frontmatter
hooks/gate-runner.mjs   Stop hook — refuses to end a turn on red Tier-1 gates
hooks/hooks.json        hook wiring
AGENTS.md               portable variant for harnesses with no subagent registry
.claude-plugin/         Claude Code manifest
.cursor-plugin/         Cursor manifest
.codex-plugin/          Codex manifest
.plugin/                generic fallback manifest
```

## Install

### Claude Code — as a plugin

```
/plugin marketplace add ConnorBritain/agent-primitives
/plugin install verification-gate@agent-primitives
```

### Claude Code — as loose files

```bash
../../install.sh              # → ~/.claude/agents/
../../install.sh --project    # → ./.claude/agents/
```

Either way, add the wiring from [docs/snippets/claude-md.md](../../docs/snippets/claude-md.md)
to your `CLAUDE.md`. **The agents do nothing until something calls them.** Installing without
the wiring gives you two reviewers that never run.

### Other harnesses

See [AGENTS.md](AGENTS.md) in this directory and
[docs/portability.md](../../docs/portability.md) for what degrades.

## The hook (optional, Claude Code only)

`gate-runner.mjs` is what turns the gate from advisory into enforced. It runs on `Stop`,
reads `.claude/gates.json` from your project, runs each command, and blocks the turn from
ending if any exits non-zero.

```json
{
  "gates": [
    { "name": "typecheck", "command": "npm run typecheck" },
    { "name": "lint",      "command": "npm run lint" },
    { "name": "test",      "command": "npm test", "timeout": 600 }
  ]
}
```

`timeout` is in seconds and defaults to 300. A bare array works too. **No `gates.json` means
the hook does nothing** — it is opt-in per project.

Failure policy is deliberately asymmetric: a failing *gate* blocks the turn, but a failing
*hook* (unparseable `gates.json`, a gate with no command) logs a warning and exits clean. A
guard that bricks every turn gets uninstalled, and an uninstalled guard protects nothing.

The hook respects `stop_hook_active`, so a blocked turn that continues will not re-block in
a loop.

## Cost

Both reviewers are pinned to Sonnet and read only the diff plus what they need for context.
Running them at the end of a substantive turn is cheap relative to the turn itself. Run them
in parallel — they share no state.

Skip the gate on trivial turns (a typo fix, a version bump). A gate that fires on everything
gets routed around, which is worse than a gate with a stated exemption.

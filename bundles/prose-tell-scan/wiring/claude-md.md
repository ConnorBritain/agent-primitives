# CLAUDE.md snippet

**Most people need nothing here.** The skill is dispatcher-triggered: its
`description` names the situations it covers, so "review this draft for AI
tells" or "does this read like AI?" reaches it without any rule in `CLAUDE.md`.
Adding one costs context on every turn, forever.

Per [`docs/wiring.md`](../../../docs/wiring.md), protocol-binding is for
primitives the model would otherwise skip *because running them is against its
local interest* — gates that might say "not done". A prose scanner is not that.
A user who wants their writing reviewed asks for it.

Add the block below only if you have the specific problem it solves: **you keep
finishing drafts without remembering to check them.**

---

```markdown
## Prose review   <!-- agent-primitives: prose-tell-scan -->

Before I publish or send a piece of writing, run the `tell-scan` skill
against it and report what it flags. Uncalibrated thresholds are guesses — say
so when they are. Signals for me to weigh, not a verdict, and never a claim
about who wrote something.

Skip for short or throwaway writing — say so when you do.

When the scan is done and the piece is an argument rather than a note, also
dispatch `prose-pattern-critic` on the same draft. It owns only the five
patterns the catalog marks undecidable by regex, and it is expected to return
CLEAN most of the time.
```

---

## Notes

- **State the trigger and the consequence, nothing else.** The skill's own file
  holds its method; restating it here creates two copies that drift, and the
  always-loaded copy wins.
- **Write the exemption in.** A rule with no stated skip gets routed around
  silently the first time it is inconvenient, and a silently-ignored rule reads
  as covered.
- **Bind the critic only where drafts are arguments.** On a codebase whose
  writing is release notes and issue comments it will be quiet and you will have
  paid for a subagent per draft to hear so. The exemption above is the whole
  reason the second paragraph is a separate sentence rather than an `and`.
- **Do not bind the revise pass this way** when it lands in the `prose-review`
  bundle. A transformer that runs on its own judgement will eventually rewrite
  something you did not want rewritten. Explicit invocation only.

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
```

---

## Notes

- **State the trigger and the consequence, nothing else.** The skill's own file
  holds its method; restating it here creates two copies that drift, and the
  always-loaded copy wins.
- **Write the exemption in.** A rule with no stated skip gets routed around
  silently the first time it is inconvenient, and a silently-ignored rule reads
  as covered.
- **Do not bind the revise pass this way** when it lands in the `prose-review`
  bundle. A transformer that runs on its own judgement will eventually rewrite
  something you did not want rewritten. Explicit invocation only.

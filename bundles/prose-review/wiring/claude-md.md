# CLAUDE.md snippet

**Most people need nothing here.** The critic is dispatcher-triggered: its
`description` names the situation, so "does this sound like me?" reaches it
without any rule.

Per [`docs/wiring.md`](../../../docs/wiring.md), protocol-binding is for
primitives the model would otherwise skip *because running them is against its
local interest*. A voice critic is not that — an author who wants their draft
checked asks for it.

Add the block below only if you have the specific problem it solves: **you keep
publishing without checking.**

---

```markdown
## Prose voice   <!-- agent-primitives: prose-review -->

Before I publish a piece of writing, run `prose-voice-critic` against it and
report what it flags. Every finding needs a corpus citation; drop any that
arrives without one. CLEAN is a normal result — do not go looking for something
to say.

Skip for short or throwaway writing, and say so when you do.
```

---

## Notes

- **Write the exemption in.** A rule with no stated skip gets routed around
  silently the first time it is inconvenient, and a silently-ignored rule reads
  as covered.
- **Do not bind a revise pass this way** when one exists. A transformer running
  on its own judgement will eventually rewrite something you did not want
  rewritten.

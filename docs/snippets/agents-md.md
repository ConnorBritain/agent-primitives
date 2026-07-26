# AGENTS.md snippet

Paste into your project `AGENTS.md`. This is the short form — the full reviewer prompts live
in [`bundles/verification-gate/AGENTS.md`](../../bundles/verification-gate/AGENTS.md), which
you can append wholesale instead.

Read [portability.md](../portability.md) first: outside Claude Code none of this is enforced
by the harness, and a reviewer running in the writer's own context is a much weaker check.

---

```markdown
## Definition of done

A task is done when all three hold — not when the work has been described:

1. **Gates green.** Typecheck, lint, build, tests all pass, reported **with the command that
   produced the result**. Asserting that tests pass is not evidence.
2. **Verification review returns SHIP.** No reward-hacking: no assertion weakened or skipped,
   no harness escape, no code overfit to a specific test input.
3. **Architecture review returns SHIP or SHIP WITH FIXES.** No god object, no duplication of
   something already in the repo, no unrequested scope.

A red gate means not done. Never weaken, skip, or delete a gate to reach green. If a gate is
itself wrong, stop and say so rather than editing it silently.

**Run both reviews in a fresh session, against the diff, with the original task statement.**
A reviewer that shares context with the author has already argued itself into the code, and
will approve it. If your harness supports subprocesses, run each review as its own — e.g.
`codex exec "<reviewer prompt>"` — rather than inline.

Reviewers report; they do not fix. Findings come back as
`SEVERITY · LOCATION · WHAT · EVIDENCE · FIX`, ending in a one-line verdict.

Trivial turns (typo, version bump) may skip steps 2–3 — say so when you do.
```

---

## Recovering context isolation

The clean-context property is the one worth fighting for, because it is the reason a second
agent beats "please double-check your work". Options, best first:

```bash
# Codex — fresh subprocess per reviewer, diff piped in
git diff > /tmp/change.diff
codex exec "$(cat bundles/verification-gate/AGENTS.md) --- Review this diff: $(cat /tmp/change.diff)"
```

- **New session, paste the diff.** Manual, but honest, and works in every harness.
- **CI job on the PR.** Later feedback than a Stop hook, but genuinely clean-context and
  genuinely blocking. The most durable option if you only pick one.
- **Inline section in `AGENTS.md`.** Weakest — the checklist survives, the independence does
  not. Better than nothing, and it does catch the careless cases.

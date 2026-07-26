# CLAUDE.md snippet

Paste into your `CLAUDE.md` (global `~/.claude/CLAUDE.md`, or per-project). Without this,
the agents are installed but nothing calls them.

---

```markdown
## Tiered enforcement

- **Tier 1 — gates (machine-checkable, non-discretionary):** tests, typecheck, lint, build.
  A red gate means **not done**. Never weaken, skip, or delete a gate to pass. If a gate is
  itself wrong, STOP and say so. Per-repo commands live in `<repo>/.claude/gates.json`.
- **Tier 2 — critique (semi-checkable):** reward-hacking, spec fidelity, coupling,
  boundaries, naming. Judged by a clean-context reviewer subagent — never by the writer, and
  never by a crude metric.
- **Tier 3 — taste:** the assertions in this file.

## Anti-reward-hacking

- **Test-assertion immutability**: do not weaken, delete, or skip an existing test assertion
  to make a run pass. New behavior gets a NEW test; changed behavior leaves the old test's
  diff visible for review.
- **Spec-over-tests**: if a test seems to conflict with the stated spec, STOP and surface the
  conflict. Do not edit the test or special-case the code to pass it.
- **No harness escapes**: no `sys.exit(0)`/`Environment.Exit` to fake success, no
  monkeypatching the runner, no `try/except` or empty `catch` that swallows a failing assertion.

## Test-intent convention

Every test carries a one-line header stating WHY the behavior matters and WHAT breaks if it
regresses — the consequence, never a restatement of the assertion. Reviewers reject
restate-the-code headers.

## Self-verification gate

Before declaring any non-trivial task done:

1. Run the Tier-1 gates and **report what passed, with the command that produced it.** An
   assertion that tests pass is not evidence.
2. Invoke the `verification-critic` and `architecture-reviewer` subagents **in parallel**,
   passing them the original task statement (not a summary you wrote).
3. `BLOCK` or `DO NOT SHIP` means not done: fix and re-run.

Do not declare done off-screen. Trivial turns (typo, version bump) may skip step 2 — say so
when you do.
```

---

## Notes

- **Parallel invocation matters.** The two reviewers share no state, and running them
  sequentially doubles wall-clock for no benefit.
- **Pass the original task.** Both reviewers check for drift from what was asked. Handing
  them the writer's own summary launders exactly the drift you are looking for.
- If you use the `gate-runner` Stop hook, step 1 becomes enforced rather than requested —
  see [../../bundles/verification-gate/README.md](../../bundles/verification-gate/README.md).
- Naming: if you also keep a `code-reviewer` (correctness/security), keep it distinct. These
  two do not check correctness.

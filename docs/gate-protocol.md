# The gate protocol

How the reviewers actually get run, and why the sequence is what it is.

## The problem

An agent finishes a turn and says "done". You have three options: read the whole diff (which
defeats the purpose of delegating), trust it (which is how weakened test suites happen), or
make "done" a claim that something else checks.

This is the third option.

It matters because the incentive is real, not hypothetical. Give an agent a failing test and
a goal, and green is reachable two ways: fix the code, or change what green means. The second
is faster and does not feel like cheating from inside the session — it feels like unblocking.
Any proxy for "working software" is gameable, and a green suite is a proxy.

## Tiers

Not everything is checkable the same way, and pretending otherwise is how you get either a
rubber stamp or a linter that blocks on taste.

**Tier 1 — gates. Machine-checkable, non-discretionary.**
Tests, typecheck, lint, build. Red means not done. There is no judgment here and no arguing
with it. Never weaken, skip, or delete a gate to reach green; if a gate is itself wrong, stop
and say so rather than editing it quietly. Per-project commands live in `.claude/gates.json`
and are enforced by the [`gate-runner`](../bundles/verification-gate/hooks/gate-runner.mjs)
Stop hook.

**Tier 2 — critique. Semi-checkable, needs a judge.**
Reward-hacking, spec fidelity, coupling, boundaries, naming, intent clarity. Not decidable by
a script, which is why it goes to a reviewer agent — [`verification-critic`](../primitives/agents/verification-critic/)
and [`architecture-reviewer`](../primitives/agents/architecture-reviewer/). Judged in a
context separate from the writer's, **never by the writer** and never by a crude metric.

**Tier 3 — taste.**
Whatever your `CLAUDE.md` / `AGENTS.md` asserts. Unenforceable by construction. Write it
down anyway; it is the thing the Tier-2 reviewers read to know what "drift" means here.

The tiering is what keeps the gate credible. Tier-1 findings are not negotiable. Tier-2
findings are arguable, and that is fine — the reviewer surfaces them, a human decides. Mixing
the two produces a gate that either blocks on nits or waves through blockers.

## Sequence

```
      implement
          │
          ▼
   ┌─────────────┐   red    ┌──────────────────────────────┐
   │ Tier-1      │─────────▶│ not done — fix the CODE      │
   │ gates       │          │ (never the gate)             │
   └─────────────┘          └──────────────────────────────┘
          │ green
          ▼
   ┌──────────────────────────────────────┐
   │ Tier-2, in parallel, clean context   │
   │  ├─ verification-critic  → SHIP/BLOCK│
   │  └─ architecture-reviewer→ SHIP/…    │
   └──────────────────────────────────────┘
          │
          ▼
   BLOCK / DO NOT SHIP ──▶ fix, re-run    ──┐
          │ SHIP                            │
          ▼                                 │
      report done ◀─────────────────────────┘
```

**Gates before critics, always.** A red suite is already a "not done" and does not need a
critic to say so — spending reviewer tokens on a diff that fails typecheck is waste. The
critic's job begins precisely when the suite is green, because a green suite is exactly the
state in which reward hacking is invisible.

**The two critics run in parallel.** They read different things — the critic leans on git
history, the reviewer on repo-wide grep — and neither consumes the other's output.

**Both must be told what the task was.** The spec-drift and spec-over-tests checks are
meaningless without it. Pass the original request, not a summary the writer produced.

## Wiring it up

**Claude Code** — add the block from [snippets/claude-md.md](snippets/claude-md.md) to your
`CLAUDE.md`, and optionally install the `gate-runner` Stop hook. Without the CLAUDE.md
wiring, the agents exist and nothing invokes them.

**AGENTS.md harnesses** — append [snippets/agents-md.md](snippets/agents-md.md), and prefer
a fresh subprocess per reviewer. See [portability.md](portability.md) for what you lose.

## Verdicts

| Verdict | From | Means |
|---|---|---|
| `SHIP` | either | No blockers from that reviewer's angle. |
| `BLOCK` | critic | A blocker, **or the critic could not rule hacking out.** |
| `SHIP WITH FIXES` | architecture | Findings exist, none blocking. Fix or file — do not silently accept. |
| `DO NOT SHIP` | architecture | Structural blocker. |

Uncertainty resolves to `BLOCK` on purpose. A critic that resolves ambiguity toward "probably
fine" converges on rubber-stamping, and a rubber stamp is worse than no gate — it costs
tokens and produces confidence.

## Making it stick

Three failure modes will quietly kill this, in rough order of likelihood:

**Running the critics in the writer's context.** The most common, because it is the most
convenient. It reliably produces `SHIP`. If you take one thing from this document, take this:
the reviewer must not be the writer.

**Firing on everything.** A gate that blocks a typo fix gets routed around, and a routed-around
gate protects nothing. State the exemption explicitly — trivial turns skip Tier 2 — so
skipping is a documented decision rather than a habit that spreads.

**Letting the agent self-report the verdict.** "I ran the critic and it passed" is not
evidence. The verdict line should be in the transcript.

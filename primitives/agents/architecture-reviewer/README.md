# architecture-reviewer

**Catches:** structural decay introduced by a change that otherwise works.
**Verdict:** `SHIP` / `SHIP WITH FIXES` / `DO NOT SHIP`
**Bundle:** [`verification-gate`](../../../bundles/verification-gate/)

## Why this exists

Agents write code that passes. They do not, by default, write code that fits.

The characteristic agent diff is locally reasonable and globally corrosive: a helper that
already exists three directories over, reimplemented; an interface introduced for a second
implementation that will never arrive; a file that quietly took on its fourth responsibility;
a "while I was here" refactor nobody asked for. Every one of these is defensible in
isolation. Together, over a few dozen turns, they are how a codebase becomes one nobody
wants to touch.

Tests do not catch any of it. A god object passes its suite. Duplication passes its suite.
That is precisely why this needs a reviewer rather than a gate — the property being checked
is not machine-decidable, so it goes to a judge instead of a linter.

## Why a separate agent (and separate from the critic)

Same clean-context argument as [`verification-critic`](../verification-critic/): the author
has spent its context justifying the shape it chose, and will defend it. The reviewer is
told it did not write the code and that its job is to find what is wrong, not to confirm
that it works.

The split between the two reviewers is deliberate and worth keeping:

- **verification-critic** asks *"did you actually do it, or did you game the check?"*
- **architecture-reviewer** asks *"is what you did structurally sound?"*

Merging them produces an agent that does neither well — the failure modes need different
search strategies (git history vs. repo-wide grep) and different evidence, and a single
agent asked to do both reliably shortchanges one. Running them in parallel costs nothing.

## What it looks for

| # | Failure mode | The question it answers |
|---|---|---|
| 1 | **God object / poor decomposition** | Did a unit take on a responsibility it should not own, or grow past a reasonable budget? |
| 2 | **Duplication** | Does this reimplement something already in the repo? |
| 3 | **Premature abstraction** | Is this interface/generic/option justified by a *current* requirement? |
| 4 | **Spec drift** | What is in this diff that the task did not ask for? |
| 5 | **Dead code** | What here is unreachable, unreferenced, or left-over scaffolding? |
| 6 | **Boundary violations** | Does this call across a layer the architecture says it shouldn't? |

Item 2 is the one that most needs tool access. The reviewer is instructed to **grep for an
existing implementation before concluding code is novel**, and to name the implementation
that should have been reused. A duplication finding without a named alternative is an
opinion; with one, it is actionable. This is also why the agent gets `Grep` and `Glob`
rather than diff access alone.

Item 4 catches the specific way agents inflate a change: a two-line fix arrives as a
sixty-line diff because the agent tidied things on the way through. Unrequested edits are
unreviewed edits.

## When to run it

At the end of any non-trivial turn, alongside `verification-critic`. Run both in parallel —
they read different things and neither depends on the other's output.

See [the bundle protocol](../../../bundles/verification-gate/PROTOCOL.md) for the full sequence.

## Reading the verdict

- **`SHIP`** — no structural findings.
- **`SHIP WITH FIXES`** — findings exist but none blocks. Fix them now or file them; do not
  silently accept. This tier exists so that "there are nits" doesn't get rounded to "clean."
- **`DO NOT SHIP`** — a blocker. Usually a god object or a duplication with a named existing
  alternative.

Weigh findings against repo age. On a young codebase, take the duplication and boundary
findings seriously and be sceptical of decomposition nits. On a mature one, the reverse.

## Known limits

- Scoped to the diff, deliberately. Pointed at a whole repo it returns a backlog, and
  reviewers that return backlogs get ignored.
- Boundary violations are only findable if the architecture is written down somewhere it
  can read. With no stated architecture, item 6 degrades to intuition.
- It does not check correctness, security, or performance.
- Advisory-only outside Claude Code (see [docs/portability.md](../../../docs/portability.md)).

## Install

```bash
./install.sh architecture-reviewer
```

Or copy [`../../../bundles/verification-gate/agents/architecture-reviewer.md`](../../../bundles/verification-gate/agents/architecture-reviewer.md)
into `~/.claude/agents/`.

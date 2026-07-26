# verification-critic

**Catches:** an agent that made the check pass instead of solving the task.
**Verdict:** `SHIP` / `BLOCK`
**Bundle:** [`verification-gate`](../../../bundles/verification-gate/)

## Why this exists

Give a coding agent a failing test and a deadline, and there are two ways to get green.
One is to fix the code. The other is to change what "green" means — loosen the assertion,
add a `skip`, widen the tolerance, hard-code the value the test happens to check, wrap the
failure in a bare `except`. The second path is faster, and from inside the session it does
not feel like cheating. It feels like unblocking.

This is reward hacking, and it is not a hypothetical: it is the dominant failure mode of
long agentic runs, because the reward signal (a green suite) is a proxy for the thing you
actually want (working software), and proxies are gameable.

The reason it survives review is that **nobody reads everything the agent wrote.** That is
the whole point of delegating. So the gate has to be something other than human attention.

## Why a separate agent

The obvious fix — "ask the agent to double-check its work" — does not work, for a reason
worth stating plainly: the agent that wrote the code has spent its entire context arguing
itself into the change. It has the justification loaded. Asking it to review is asking a
defence attorney for a verdict.

So the critic runs in a **separate context**, is told it did not write the code, and is told
to assume the author took the easy path and try to prove it. The adversarial framing is
load-bearing. A neutral "please review this" prompt returns praise.

It is also **read-only** — and in Claude Code that is enforced by the tool allowlist, not
requested in prose. A critic that can edit stops reporting findings and starts fixing them,
which returns you to an unreviewed diff.

## What it looks for

| # | Failure mode | Tell |
|---|---|---|
| 1 | **Weakened tests** | `assertEqual` → `assertTrue`, exact → not-null, tolerance widened, `skip`/`xfail`/`Ignore` added to a test that previously ran |
| 2 | **Harness escapes** | `sys.exit(0)`, `Environment.Exit`, runner monkeypatching, empty `catch {}` around an assertion, conftest hacks |
| 3 | **Spec-over-tests** | Code branching on the test's exact arguments; hard-coded expected values; a conflicting test edited to pass instead of the conflict being surfaced |
| 4 | **Restate-the-code intent** | "checks that add returns a+b" — mechanics where consequence belongs |
| 5 | **Coverage theater** | Assertions only on mocks; tests that would pass against a broken implementation |

Item 1 is why the agent needs `git log` and `git show`, not just `git diff`. You cannot see
that an assertion was weakened by looking at its current state — only by comparing it to
what it used to be. Any weakened assertion is a blocker unless the diff explicitly justifies it.

Item 4 encodes a convention worth adopting independently: every test carries a one-line
header stating *why the behavior matters and what breaks if it regresses*. "A wrong total
here silently overcharges customers" is the bar. A header that restates the assertion tells
a future reader nothing about whether the test is still worth keeping.

## When to run it

At the end of any non-trivial turn, **after** the Tier-1 gates are green — a red suite is
already a "not done" and does not need a critic to say so. The critic's job starts once the
suite is green, because a green suite is exactly when reward hacking is invisible.

See [docs/gate-protocol.md](../../../docs/gate-protocol.md) for the full sequence.

## Reading the verdict

- **`SHIP`** — no blockers. Ordinary review still applies; this agent did not check
  correctness or security.
- **`BLOCK`** — a blocker was found, *or the critic could not rule hacking out.* The second
  half matters. Uncertainty resolves to BLOCK by design, because a critic that resolves
  ambiguity toward "probably fine" converges on rubber-stamping.

Expect false positives. A critic tuned to never fire on a clean diff will also never fire
on a dirty one; the asymmetry is deliberate, and the cost of arguing with it occasionally
is much lower than the cost of a silently weakened suite.

## Known limits

- Scoped to the diff, so it will not find hacking that landed in an earlier commit.
- It reads intent from the diff and the stated task. If the task was never stated clearly,
  it cannot judge drift from it.
- It does not check correctness or security — use a code reviewer for that.
- Advisory-only outside Claude Code (see [docs/portability.md](../../../docs/portability.md)).

## Install

```bash
./install.sh verification-critic
```

Or copy [`../../../bundles/verification-gate/agents/verification-critic.md`](../../../bundles/verification-gate/agents/verification-critic.md)
into `~/.claude/agents/`.

# prose-review

Two read-only critics and one revising transformer for prose. Every rewrite
this bundle produces goes through the fidelity gate before it reaches the
author.

**Status: v0.3 — two critics and a reviser.**

- `prose-voice-critic`: does this draft sound like the person it is supposed to
  be by, judged against their own corpus.
- `prose-fidelity-critic`: did this revision keep what it had to, judged against
  the original and a deterministic scan of it.
- `prose-reviser`: applies an edit plan to a draft, emitting a change log the
  fidelity critic then judges. Out-of-plan edits are structurally impossible
  because the log is the only output channel. See
  [`REVISER-USAGE.md`](REVISER-USAGE.md) for the operator's how-to.

The [design](DESIGN.md) specifies five critics, a fidelity check and one
transformer. What ships is what the evidence can currently support, and the
reason is in [`tests/critic-harness.md`](tests/critic-harness.md).

| | |
|---|---|
| [`prose-voice-critic`](agents/prose-voice-critic.md) | shipped |
| [`prose-fidelity-critic`](agents/prose-fidelity-critic.md) | shipped — **before** the reviser it guards |
| [`prose-reviser`](agents/prose-reviser.md) | shipped v0.3.0, 2026-08-07 — see [`REVISER-USAGE.md`](REVISER-USAGE.md) |
| `prose-substance-critic` | blocked — needs an argumentative corpus |
| `prose-adversarial-reader` | blocked — same |
| `prose-medium-critic` | designed |

## The two critics point opposite ways, on purpose

`prose-voice-critic` resolves uncertainty to **silence**. `prose-fidelity-critic`
resolves it to **`MATERIAL-LOSS`**. That is not an inconsistency in the bundle; it
is a property of the two questions.

Voice has no ground truth, and a wrong *"this doesn't sound like you"* teaches an
author to write blandly — damage that cannot be taken back. Fidelity has ground
truth sitting in the original, every finding is checkable by anyone, and a wrong
finding costs a glance at two quoted lines. What is *not* recoverable there is the
miss: a loss waved through ships, and the original is often gone by the time
anyone looks.

## Why the reviser ships after its guards

**A reviser built on critics that manufacture nits will dutifully rewrite prose
to satisfy noise.** The critics had to be shown quiet on human writing before
anything acted on what they said. They were: `prose-voice-critic` shipped
2026-08-04, `prose-fidelity-critic` shipped 2026-08-05, both under acceptance
runs that measured their behaviour on human corpora before their behaviour on
generated prose.

Only then did the reviser ship (2026-08-07). Its output goes through the
fidelity gate — described in [`PROTOCOL.md`](PROTOCOL.md) and worked through
step-by-step in [`REVISER-USAGE.md`](REVISER-USAGE.md) — every time. The
reviser cannot make out-of-plan edits by construction: its only output channel
is a list of before/after pairs referring to plan ids, and the harness's apply
step rejects any edit whose text falls outside its authorising plan entry's
quote.

The catalog reaches the reviser as one diagnostic among several, never as a
quantity to minimise — see [`DESIGN.md`](DESIGN.md).

## Why the fidelity critic could ship when two others cannot

Because its question has an answer that does not depend on who is asked. Test
material for a voice critic has to be *found*; test material for a fidelity
critic can be *built* — take a public-domain essay, delete a specific
qualification, and the correct verdict is known by construction.

That is why it is the only critic here shipping with a true-positive rate rather
than a false-positive bound. Its harness also measures something the others do
not need to: whether it earns its place beside the deterministic scan it reads.
It has to disagree with the scanner in **both** directions — clearing over-flags,
and catching losses the scan is structurally blind to — or it is an expensive
wrapper around a regex. The [run log](tests/runs/2026-08-05-fidelity-complete.md)
reports the echo baseline next to the score for exactly that reason.

## Why two critics are blocked

Measured, not assumed. Per 1000 words the acceptance corpus's human half carries
0.3 argumentative moves and **zero thesis statements** — it is encyclopedia
prose. Asking an adversarial reader for the strongest objection to a university
article's thesis is asking about something that is not there.

So that corpus bounds the false-positive rate for every critic and measures true
positives for almost none. A critic may ship on "does not fire on human prose";
it may not claim it *finds* things until there is material where the finding is
known to exist. Building that material is the prerequisite.

## The inverted error preference

This repo's reviewers resolve uncertainty toward blocking. **This bundle reverses
that**, and the reversal is in every critic's contract.

A missed passage costs one unremarked paragraph. A wrong *"this doesn't sound
like you"* teaches an author to write more blandly — the exact damage the project
exists to prevent — and it is not recoverable by looking again, because they have
already been told their own voice is wrong.

`CLEAN` is the expected verdict on a draft the author wrote.

## Install

```
/plugin marketplace add ConnorBritain/agent-primitives
/plugin install prose-review@agent-primitives
```

```bash
./install.sh prose-voice-critic        # → ~/.claude/agents/
./install.sh prose-fidelity-critic
./install.sh prose-reviser
```

Or install the whole bundle at once with `./install.sh`.

The voice critic needs a corpus. Without one it stops and says so: it can flag
internal inconsistency, but not deviation from *your* voice. See
[`PROFILES.md`](../prose-tell-scan/PROFILES.md) for the corpus contract, which
this bundle reads and does not own.

The fidelity critic needs no corpus — it needs the **pre-revision text**, from
`git show` where the file is tracked or a copy the orchestrator made where it is
not. Without an original it stops, for the same reason: fidelity is a comparison.

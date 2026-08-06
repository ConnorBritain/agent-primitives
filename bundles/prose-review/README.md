# prose-review

Read-only critics for prose, run before a draft is called done.

**Status: v0.2 — two critics.**

- `prose-voice-critic`: does this draft sound like the person it is supposed to
  be by, judged against their own corpus.
- `prose-fidelity-critic`: did this revision keep what it had to, judged against
  the original and a deterministic scan of it.

The [design](DESIGN.md) specifies five critics, a fidelity check and one
transformer. What ships is what the evidence can currently support, and the
reason is in [`tests/critic-harness.md`](tests/critic-harness.md).

| | |
|---|---|
| [`prose-voice-critic`](agents/prose-voice-critic.md) | shipped |
| [`prose-fidelity-critic`](agents/prose-fidelity-critic.md) | shipped — **before** the reviser it guards |
| `prose-substance-critic` | blocked — needs an argumentative corpus |
| `prose-adversarial-reader` | blocked — same |
| `prose-medium-critic` | designed |
| `prose-reviser` | next, deliberately last |

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

## Why the reviser is not here

**A reviser built on critics that manufacture nits will dutifully rewrite prose
to satisfy noise.** The critics have to be shown quiet on human writing before
anything acts on what they say. Findings plus an author is already most of the
value; findings plus an automatic rewrite is a much larger surface for a much
smaller increment.

And when it does arrive, its objective is the author's voice card and corpus. The
catalog reaches it as one diagnostic among several, never as a quantity to
minimise — see [`DESIGN.md`](DESIGN.md), which corrects the original plan on
exactly this point.

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
```

The voice critic needs a corpus. Without one it stops and says so: it can flag
internal inconsistency, but not deviation from *your* voice. See
[`PROFILES.md`](../prose-tell-scan/PROFILES.md) for the corpus contract, which
this bundle reads and does not own.

The fidelity critic needs no corpus — it needs the **pre-revision text**, from
`git show` where the file is tracked or a copy the orchestrator made where it is
not. Without an original it stops, for the same reason: fidelity is a comparison.

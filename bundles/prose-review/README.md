# prose-review

Read-only critics for prose, run before a draft is called done.

**Status: v0.1 — one critic.** `prose-voice-critic`: does this draft sound like
the person it is supposed to be by, judged against their own corpus.

The [design](DESIGN.md) specifies five critics, a fidelity check and one
transformer. What ships is the one the evidence can currently support, and the
reason is in [`tests/critic-harness.md`](tests/critic-harness.md).

| | |
|---|---|
| [`prose-voice-critic`](agents/prose-voice-critic.md) | shipped |
| `prose-substance-critic` | blocked — needs an argumentative corpus |
| `prose-adversarial-reader` | blocked — same |
| `prose-medium-critic` | designed |
| `prose-fidelity-critic` | designed; ships **before** the reviser it guards |
| `prose-reviser` | v0.2 at the earliest, deliberately |

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
```

Needs a corpus. Without one the voice critic stops and says so: it can flag
internal inconsistency, but not deviation from *your* voice. See
[`PROFILES.md`](../prose-tell-scan/PROFILES.md) for the corpus contract, which
this bundle reads and does not own.

# The review protocol

**Status: v0.2 ships TWO critics** (`prose-voice-critic`,
`prose-fidelity-critic`). This document describes the protocol the full set is
designed for; much of it is not yet operative. See [`README.md`](README.md) for
what exists.

The two run at **different moments**, and only one of them is part of the
parallel critic fan-out below. The voice critic reviews a draft. The fidelity
critic reviews a *revision against its original*, so it has nothing to read until
something has rewritten something — which is step 5, not step 2.

How the critics are meant to be run. Prose, not code — there is no orchestrator
here, exactly as in `verification-gate`. The main session executes this.

## Order

```
  1  scan          tell-scan, deterministic, no model      (prose-tell-scan)
  2  critics       spawned IN PARALLEL, clean context each
  3  consolidate   this session, not an agent
  4  the author edits
```

v0.2 stops at 3. The revise pass is not built, deliberately — but the check that
guards it now exists, and can be run by hand on any before/after pair:

```
  5  revise        NOT BUILT
  6  fidelity      prose-fidelity-critic, on (original, revision)
```

## Running the fidelity critic outside the pipeline

It does not need `prose-reviser` to be useful. Any rewrite has a before and an
after, including one a person did.

```bash
git show HEAD:draft.md > /tmp/original.md          # or keep a copy first
node tools/fidelity-scan.mjs /tmp/original.md draft.md
```

**Run the scan first and hand the critic its output.** The split is the point: the
scan is authoritative on presence, the critic only on consequence. A critic asked
to check whether a number survived will answer from the sentence's plausibility,
which is the one error the deterministic half exists to make impossible.

Give it the edit plan if one exists. Without it, item 4 — edits outside the plan —
is not assessable, and the critic will say so rather than clear the revision on
that ground.

**`MATERIAL-LOSS` is not a rejection.** It says information was lost. A revision
that dropped one date earns it, correctly, and the author decides whether they
meant it. Inside the eventual reviser pipeline the verdict is load-bearing —
`DESIGN.md` has it fail the run and restore the original — but run by hand it is
a report.

## Step 1 — scan first, and give critics the result

The deterministic pass is cheap and its output is evidence a critic would
otherwise have to estimate. A model asked to count its own frequency tics finds
the ones it remembers writing, not the ones it repeated.

Critics receive the scan JSON. They do **not** receive the catalog: what a
pattern is called is not their business, and a critic given a prohibition list
starts hunting for prohibited things.

## Step 2 — parallel, clean context, and that is the mechanism

Every critic runs in its own context. A critic that saw the draft being written
recognises its own choices as the author's, which is the failure the isolation
exists to prevent — not a nicety.

Parallel because the wall-clock cost is then one critic rather than five.

`prose-medium-critic` spawns only when the profile declares a `medium`. Short or
trivial prose skips the protocol entirely, and this session should say so out
loud when it does rather than running five agents on a paragraph.

## Step 3 — consolidation, and the part to get right

This session dedupes findings by span, ranks by severity × confidence, and emits
an ordered plan.

**Disagreements are surfaced, never resolved.** When the voice critic wants a
sentence kept and the substance critic wants it cut, that tension *is* the
finding. A consolidator that silently picks one has destroyed the most useful
thing on the page.

**The plan is capped.** Top findings, then a count of the rest. Five critics on
one draft produce a wall, and a wall is indistinguishable from "your writing is
bad" — a reaction that ends use of the tool faster than any false positive. The
author can ask for everything; they should not be handed it.

**Every critic's `CLEAN` is reported.** Silence from four of five is information,
and hiding it makes the one finding look like a verdict on the whole draft.

## What this session must never do

- State or imply that any passage was machine-written. No critic may produce
  that claim and no consolidation may synthesise one.
- Rewrite anything. v0.1 has no transformer; the author edits.
- Present a finding that arrived without its evidence. A voice finding with no
  corpus citation is a guess, and the prompt requires it dropped — if one
  reaches consolidation anyway, drop it here.

  **And spot-check the citations that do arrive.** Nothing verifies them
  automatically. For each high-confidence finding, open the cited sample and
  confirm the claim before passing it on: a finding asserting a construction is
  *"absent from all eleven samples"* is checkable with one grep, and a citation
  that does not survive that check is worse than no citation, because it arrives
  wearing evidence's clothes.

## Failure modes, named

**Running critics in the writer's context.** The comparison stops being honest
and nobody can see that it has.

**Firing on everything.** A critic that flags every draft is noise, and noise
gets ignored — the same outcome as not having it, after paying for it. The
acceptance harness measures this directly.

**Letting the author read a wall.** The consolidation cap is not cosmetic.

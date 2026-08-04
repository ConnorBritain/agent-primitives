# prose-voice-critic

Read-only critic that answers one question: **does this draft sound like the
person it is supposed to be by?** Judged against their own corpus and voice card.

Not whether it is good. Not whether it is clear. Never whether a machine wrote
it.

## Why this exists

`prose-tell-scan` measures a draft against catalogued patterns and against the
author's derived bands. Both are counts, and counts miss the thing an author
actually notices when prose is not theirs: a paragraph pitched at the wrong
distance, a transition they would never use, a register that belongs to someone
else.

That judgement needs a reader. It also needs *evidence*: every finding must cite
how the author writes instead.

**That citation is self-reported, and worth knowing the limits of.** Nothing
verifies that a cited sample actually contains what the finding claims — the
scanner next door has an automated check that every incident citation resolves,
and there is no equivalent here, because checking a claim like *"absent from all
eleven samples"* means re-reading eleven documents. What the requirement buys is
narrower than it looks: a critic with nothing to cite has to say nothing, which
is most of the value. What it does not buy is a guarantee the citation is
accurate. `PROTOCOL.md` puts the spot-check on the consolidating session, and a
spot-check is what it is.

## Why a separate agent

Two reasons, and the second is the load-bearing one.

**Context isolation.** A critic that helped draft the text will recognise its own
choices as the author's. The comparison is only honest from a clean context.

**Exclusive scope.** `AGENTS.md` warns that overlapping primitives make each
other weaker, because each assumes the other has it covered. This owns voice and
nothing else — substance belongs to `prose-substance-critic`, whole-piece
structure to `prose-adversarial-reader`, catalogued patterns to
`prose-pattern-critic` in the other bundle.

## What it does

Reads the voice card and every corpus sample **before** the draft, then looks for
five things in priority order: register breaks, constructions absent from the
corpus, vocabulary from a different register, rhythm that flattens, and a voice
that never shifts where the corpus does.

It also has an explicit list of what is *not* a finding — writing better than
usual, writing about a new subject, a deliberate reach, ornate register. Each of
those looks like deviation and none is evidence about voice.

## The inverted error preference

This repo's reviewer convention is to resolve uncertainty toward blocking, on the
grounds that a reviewer who rounds ambiguity to "probably fine" converges on
rubber-stamping. **That is reversed here, deliberately.**

The costs are not symmetric. A missed passage costs one unremarked paragraph. A
wrong *"this doesn't sound like you"* teaches an author to write more blandly —
the exact damage this project exists to prevent — and it is not recoverable by
looking again, because they have already been told their own voice is wrong.

So uncertainty resolves to silence, and **`CLEAN` is the expected verdict on a
draft the author wrote.** Returning it is not a failure to find something.

## The second departure: no adversarial framing

The same convention says to frame reviewers adversarially — *"assume the author
took the easy path and prove it"* returns findings where *"please review this"*
returns praise. This prompt does not do that either, and for a reason specific to
what it examines.

Adversarial framing works when there is a defect to prove. Voice has no such
ground truth. Instructing a critic to assume a passage does not sound like its
author is instructing it to manufacture a difference — and against any real
corpus, ordinary variation between a person's own pieces will always supply one.

What replaces it is the **evidence requirement**: every finding must cite how the
author writes instead. That does the same work — it stops the critic returning
praise — without the instruction to find fault. A critic with nothing to cite has
nothing, and says nothing.

Both departures follow from one fact: here a false positive costs more than a
miss.

## When to run it

When a draft is supposed to sound like a specific person **and** you have samples
of their writing. Without a corpus it stops and says so: it can flag internal
inconsistency, but it cannot say anything about *this author's* voice, and
pretending otherwise is the failure mode that matters most here.

Corpus, then calibration, then criticism — the same ordering constraint the rest
of the project runs on.

## Reading the output

Every finding carries a **corpus citation**: how the author writes this instead,
with a sample reference. A finding without one is a guess and the prompt requires
it dropped.

Findings are marked `high` or `low` confidence, and low ones are reported only
where a high one sits nearby. One weak observation on its own is noise.

The verdict is `CLEAN` or `REVISE`, and the categories it found clean are stated
explicitly — silence across four of five is information, and hiding it makes the
one finding look like a verdict on the whole draft.

## Known limits

**It cannot tell deviation from growth.** A passage outside the corpus may be the
author writing something new, stretching deliberately, or drifting. The critic
reports the difference and cannot resolve the cause — which is why the finding is
phrased as an observation and the author decides.

**A corpus is a snapshot.** Most people write differently across five years. If
the corpus spans a long period it describes a range rather than a voice, and
findings get correspondingly weaker. `calibrate` reports when a corpus looks like
more than one voice; heed it before trusting this.

**It has been measured on a register, not on a person.** The acceptance corpus is
encyclopedia articles, each written by many Wikipedia editors over years. A
passing score shows the prompt is not trigger-happy on one tight register. It
does not show the prompt can recognise an individual, which is the thing it is
for, and nothing here bounds its behaviour on essays, fiction, or correspondence.

Coverage has also been partial at every run so far. Current numbers and their
caveats live in
[`tests/critic-harness.md`](../../../bundles/prose-review/tests/critic-harness.md)
and the run logs beside it — not here, because they change and this does not.

**Formatting is outside its scope, and outside the bundle's.** Punctuation in
lists, heading style, markup convention: the prompt excludes them, because they
change with a template or an editor rather than with a person. No sibling critic
picks them up. If you need formatting consistency enforced, that is a linter's
job and this bundle does not do it.

**It is not an authorship detector and must never be used as one.** The prompt
refuses to state or imply machine generation. Pointed at someone else's writing
to decide whether they wrote it, it is being misused — and its findings would be
worthless for that purpose anyway, since every one of them describes a difference
from a corpus rather than a property of the text.

## Install

```bash
./install.sh prose-voice-critic       # → ~/.claude/agents/
./install.sh --project prose-voice-critic
```

Or install the whole bundle: `/plugin install prose-review@agent-primitives`.

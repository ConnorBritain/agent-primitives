# prose-reviser

The one primitive in this repo that changes prose. Given an original draft and
an edit plan, it applies each plan entry as a small local edit and hands back
the revised draft plus a change log that names, for every edit it made, which
plan entry authorised it.

Its output is judged by [`prose-fidelity-critic`](../prose-fidelity-critic/)
before it may be kept. That is not a courtesy — the whole design of this bundle
turns on a fidelity check that lands before the reviser it guards, and on the
sampling policy in [`.planning/SAMPLING-POLICY.md`](../../../.planning/SAMPLING-POLICY.md)
that keeps the gate's verdict from being a coin flip. Both preconditions are met
now, which is why this primitive exists at all.

## Status

**Held.** `meta.yaml` says `ships: false`. It is authored, its harness is
scaffolded, and it does not appear in the bundle or in any manifest — the same
pattern `prose-pattern-critic` uses.

It lifts when the k=3 acceptance run clears its pre-registered ship bar
(see `meta.yaml` for the exact conditions). Until then this file describes what
would ship, not what does.

## Why this exists

DESIGN.md's Order of operations puts a mutating pass after critics and after
the fidelity check:

```
  scan → critics → consolidate → author edits           (v0.1 ships)
  ─────────────────────────────────────────
  revise → fidelity → verify                            (this is that)
```

The rewrite half is the reason a user would want any of this at all. The
project's stated goal is *"drive on ideas, ai can output, i can edit, and
corpora over time will help tune the engine to produce more 'me'-like prose."*
Findings plus an author is most of the value — that is what the critics
provide. Findings plus a revision the author can accept or throw away is the
rest of it.

The reason it did not ship earlier is on record: **a reviser built on critics
that manufacture nits will dutifully rewrite prose to satisfy noise.** The
critics had to be shown quiet on human writing first. That has happened, twice
now, on different critics and on different corpora.

## What it does

Reads an edit plan (see [`PLAN-FORMAT.md`](../../../bundles/prose-review/PLAN-FORMAT.md))
and an original draft. For each plan entry, in order:

1. Locates the exact quote in the draft. Verbatim match.
2. Reads the change. If ambiguous, refuses the entry.
3. Makes the smallest edit that satisfies the change.
4. Preserves every fact, name, date, quotation and qualifier the entry does
   not tell it to change.
5. Preserves register — no consistency-tidying beyond what the plan authorised.

If an entry cannot be applied cleanly, it is refused and logged. Refusal is
first-class: a revision with 5 of 6 entries applied and one refused is a
better outcome than 6 of 6 where the sixth is a plausible guess.

## Two modes

**`plan-only`** (default). The reviser sees the plan and the draft, and
nothing else. Ignores any `critic_transcript` field even if present.

**`plan-plus-prose`.** Each entry may carry the critic's own reasoning as a
`critic_transcript`. The reviser reads it as context. **It never treats
transcript prose as additional authorisation** — a critic saying "this whole
paragraph could go" does not let the reviser cut a whole paragraph when the
plan entry names one sentence.

Two modes because DESIGN.md's Open Question 4 is a real fork: the reasoning is
sometimes the missing half of an underdetermined plan entry, and sometimes
the place a critic's overconfidence leaks into an edit. The safer half is
default; the other is available and the extra risk is named on the tin.

## Why a separate agent

Two reasons, both load-bearing.

**Context isolation.** A reviser that saw the drafts being critiqued, or the
critic reports being written, has too much information. It will regress toward
whichever tone dominated the surrounding session. Clean context is what makes
"apply this plan, nothing else" tractable.

**Exclusive scope.** DESIGN.md's exclusivity rule: two primitives with
overlapping scope make each other weaker. This is the one primitive that
mutates prose. Everything else in this bundle judges; only this changes text.
Overlap with the drafter is deliberately narrow — the drafter writes new
passages, the reviser edits existing ones, and neither may do the other's
job. Overlap with critics is zero: critics are read-only by contract.

## The change log

Every reviser run emits a JSON change log alongside the revised text. Every
`edits[]` entry carries the `plan_id` that authorised it, plus the exact
`before` and `after` strings the fidelity critic will see when it diffs the
two documents.

This is what makes *"edits outside the plan"* — the fidelity critic's
priority-4 rule, which has never fired in any run because no fixture
supplied a plan — checkable. Any diff whose span is not covered by an entry's
`location.quote`, or whose change log carries no matching `plan_id`, counts
as out-of-plan **even when the change is good**.

## Reading the output

The revision is a markdown fence. The change log is a JSON fence. That is
the whole output.

The `edits[]` list is what the reviser did. The `refused[]` list is what it
declined to do and why — a plan entry the reviser could not execute cleanly.
The `noticed_but_not_edited[]` list is what it saw but chose not to touch,
because the plan did not authorise it. All three are audit trails, not
suggestions.

## Known limits

**One draft at a time.** The plan covers one document; the revision is that
document rewritten. Passage-scoped revision (like the drafter) would fragment
the fidelity check, which compares whole documents.

**Plans are hand-authored, for now.** DESIGN.md gives consolidation ("turn N
critic transcripts into one plan") to the orchestrating session, not to a
primitive. That is a separate piece of work and is deliberately not on this
timeline. For now, plans are written by the operator or by an author who read
the critic reports themselves.

**The fidelity gate can still return SPLIT.** When it does, the run does not
accept or reject the revision on its own — it surfaces both versions and the
disagreement. The reviser has produced its work; what to do with it is the
author's decision. This is the sampling policy working as designed, and it is
what makes the gate trustworthy enough to gate anything at all.

**Idempotence is a claim not a proof, until v0.2 tests it.** The prompt is
written to be idempotent. The property has not been measured, and doing so
requires re-running the reviser on its own previously-accepted output — which
is straightforward to build and is not in this cut.

**No consolidator.** If two plan entries edit overlapping spans, the reviser
applies them in order and the second wins where they conflict. This is a
plan-authoring error — the consolidator, when it exists, will catch it. Until
then, a plan whose entries overlap is a plan the operator has to fix.

**Never seen the catalog.** Not as a hint, not as an "avoid these words" list,
not in any form. Same rule as the drafter. If a voice-critic finding was
originally about a catalogued word, the plan entry says so in prose and the
reviser reads the prose, never the catalog.

**Never claims the revision sounds like the author.** That is unmeasurable,
and it is the one thing the author is best placed to judge.

## Install

Not installable yet. See *Status* above.

Once it lifts:

```bash
./install.sh prose-reviser        # → ~/.claude/agents/
./install.sh --project prose-reviser
```

Or install the whole bundle: `/plugin install prose-review@agent-primitives`.

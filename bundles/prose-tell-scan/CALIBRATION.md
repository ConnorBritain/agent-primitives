# Calibration log

Every false positive this scanner has produced on real writing, what caused it,
and what was done about it.

This file exists because **a false positive is data, not a nuisance.** The
temptation with each one is to quietly tighten a regex and move on, which loses
the only empirical record the project has of where its own judgement fails. Six
incidents in, the log is already worth more than any individual fix: four of the
six share one root cause, and that pattern was invisible while they were being
handled one at a time.

It is also the honest counterweight to a catalog that only ever grows. Entries
get added because someone read a source; they get removed or narrowed only
because something like this got written down.

## Distinct from the decision log

Two different records, easy to confuse:

| | Calibration log (this file) | Decision log (`decisions.jsonl`, v1.0) |
|---|---|---|
| About | The catalog's own defects | One author's accept/reject choices |
| Scope | Shared by everyone | Per user, per profile |
| Lives in | The repo | The user's project |
| Fixes | A pattern, for all users | Nothing — it suppresses re-litigation |

A finding you reject because it is not your style goes in the decision log. A
finding that is *wrong for everyone* belongs here.

## How to add an entry

When the scanner flags something that is ordinary writing:

1. Record it below before fixing it. The write-up is the artifact; the fix is
   incidental.
2. Add a **paired test** in `tools/selftest.mjs` — one asserting the pattern no
   longer fires on the legitimate text, one asserting it still fires on the
   genuine article. A tightening with only the negative test is how a pattern
   gets narrowed into uselessness without anyone noticing.
3. Classify the root cause. If it matches an existing class, say so — recurrence
   is the signal worth having.

## Root-cause classes

- **`density-instability`** — density per 1000 words computed from too few
  occurrences, usually in a short document.
- **`sense-ambiguity`** — the pattern has a figurative and a literal reading and
  matched the literal one.
- **`mention-vs-use`** — the document is discussing the tell rather than
  committing it. **Accepted, not fixed.**
- **`unsourced-pattern`** — the pattern was not in a primary source and should
  not have shipped at the severity it did.

## Incidents

### FP-2026-07-26-a · `announced-insight` · sense-ambiguity

**Flagged:** "it was the best part of joining"
**Should have flagged:** "The best part? You never have to try."

Found in real use, on a draft, by the author — not by the test suite.

The `the best part` branch ended in `part\b\??`, making the question mark
optional. That is worse than a loose pattern: it matched the bare phrase in
*every* case, so it fired reliably on the ordinary-English reading while never
actually requiring the announcing punctuation it was written to detect. The
pattern was inverted, and only real use surfaced it.

**Fix:** require a following `?` or `:` — `part\s*[?:]`. Paired tests added.

**Worth noting:** this entry is `source: recent` — it is one of the patterns with
the weakest provenance in the catalog, traceable to a single Forbes contributor
piece with no dataset. The weakest-sourced patterns producing the field false
positives is not a coincidence, and is an argument for pruning rather than
tightening if it recurs.

### FP-2026-07-26-b · `false-range` · sense-ambiguity

**Flagged:** "From 1995 to 2003, the population doubled." — and every other date
or numeric range.

Inherited from the prototype, which anchored on sentence-initial `From X to Y,`
with no guard against numerals. Ordinary English, matched constantly.

**Fix:** exclude numerals, currency, months, and weekdays on both sides; require
the construction to be sentence-initial or introduced by
everything/ranging/spanning/covering. Paired tests added.

**Unresolved:** later research found this pattern is **not in the canonical
source at all**. It survives on authorial judgement alone, at severity 2 and
contested confidence. If it produces another field false positive, delete it
rather than tightening it again.

### FP-2026-07-26-c · `tricolon` · density-instability

**Flagged:** a single "protocols, rationale, and wiring" in a 433-word
`AGENTS.md`, scoring 2.31/1000 — over the ceiling.

One tricolon is a sentence, not a tic. A rate computed from a single event is
not a rate.

**Fix:** min-count floor — severity 1 needs 3 occurrences, severity 2 needs 2,
severity 3 may fire on one. Near-misses still display, marked `~`, so the floor
suppresses the *flag* and not the *information*.

### FP-2026-07-26-d · `actually` · density-instability

**Flagged:** 2 occurrences in an 887-word README, at 2.25/1000.

Same root cause as FP-c, surfaced in the same run. Two uses of "actually" in a
README is ordinary prose.

**Fix:** covered by the same min-count floor. Also added a short-document notice
below 800 words, since density swings hard on single occurrences at that length
regardless of the floor.

### FP-2026-07-26-e · `transition-overload` · unsourced-pattern

**Flagged:** `docs/wiring.md`, on the word "additionally" appearing inside a
quoted example of what *not* to write.

Diagnosed at the time as `mention-vs-use` and left alone. That diagnosis was
wrong, or at least incomplete. Later research found Wikipedia's editors had
**shipped this pattern, tested it, and demoted it** to their "Ineffective
indicators" section, on the reasoning that conjunction overuse is a byproduct of
essay-like writing that humans and models both produce.

**Fix:** the pattern was **removed entirely**, not tightened, and recorded in
`catalog.json` under `rejected` so it does not come back. Replaced by the
narrower `didactic-disclaimer`.

**The lesson worth keeping:** a false positive was the visible symptom of a
pattern that should never have shipped. Treating it as a tuning problem would
have preserved the defect in a quieter form.

### FP-2026-07-26-f · `delve` · mention-vs-use · ACCEPTED

**Flagged:** this bundle's own README, three times — every instance a sentence
*about* the word "delve" and its decay as a tell.

**Not fixed, and will not be.** Any heuristic narrow enough to catch this (skip
single emphasised words, skip quoted spans) would suppress legitimate emphasis
elsewhere. The scanner cannot distinguish mention from use, the context line
makes it obvious to a reader on sight, and pretending otherwise costs more than
it saves.

This is the dominant false positive in any repository whose documentation
discusses prose, and it is listed under *Known limits* in the README rather than
being engineered around.

## What the log says so far

**Four of six incidents trace to two root causes**, both structural rather than
per-pattern:

- `density-instability` (FP-c, FP-d) produced one fix — the min-count floor —
  that resolved both and would have pre-empted others. Handling them
  individually would have meant tightening two unrelated regexes and never
  finding the shared cause.
- `sense-ambiguity` (FP-a, FP-b) is the recurring per-pattern failure, and both
  instances were **patterns with the weakest provenance in the catalog**. Source
  quality predicts field behaviour.

**One incident was not a calibration problem at all** (FP-e). It was a pattern
that should not have existed, and the false positive was the only reason anyone
looked.

**Two of six were found by the test suite; four were found by using the tool.**
That ratio is the argument for the kickoff's advice to run the scanner in anger
before building anything on top of it.

## Open calibration questions

Things the log is not yet large enough to answer:

- ~~Is the severity-1 ceiling right?~~ **Answered.** `genuinely` at 6
  occurrences in 4113 words (1.46/1000) slips under the narration fallback of
  1.5 and does not flag, although the author removed it in their own revision.
  Running the full cold-start path — ingest a corpus, calibrate, rescan — drops
  the ceiling to 0.82 and it flags. The fallback was the problem, not the
  catalog, and no fallback tuning was done: fitting a guess to one fixture is
  how the numbers stop meaning anything. This is the clearest evidence in the
  log that **calibration is the product** and the shipped thresholds are
  scaffolding.
- Does the `tricolon` entry earn its place at all? It is deliberately noisy,
  gated hard, and has yet to produce an actionable finding.
- ~~No incident yet involves a non-native English speaker's writing.~~
  **Partially addressed, not closed.** The self-test now contains an
  ornate-formal-register passage and asserts that it *does* trip the
  `tonal-inflation` and `corporate-register` categories — the bias is measured
  rather than assumed — alongside tests that both mitigations work
  (`--artifacts-only`, and `disable_categories` per profile). See "Dialect and
  register" in the README.

  **Still open, and it is the important half:** no incident here comes from a
  real person's real writing. A synthetic passage written by the same author as
  the catalog proves the mechanism exists; it cannot tell you the actual rate,
  and it may well miss the failure modes that matter most. Every entry in this
  log so far concerns writing by one author in one variety of English. Until
  that changes, the honest claim is that the tool has a known bias with known
  workarounds, not that the bias has been measured.
- Does the `tricolon` entry earn its place? Still unanswered, still noisy, still
  zero actionable findings. If it produces a field false positive, delete it
  rather than tightening — the same standard applied to `transition-overload`.

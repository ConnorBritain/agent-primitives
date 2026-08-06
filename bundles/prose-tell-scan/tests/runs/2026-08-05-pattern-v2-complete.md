# 2026-08-05 v2 — `prose-pattern-critic` after the `llm-safe-truths` tightening

**Why there is a second run.** A blind adjudicator — forbidden `fixtures/pattern/` beyond the
one draft, forbidden `runs/`, never told the expectation or what the critic said — read
`n-eu-gatekeepers` and returned **CLEAN, not narrowly**. So [v1](2026-08-05-pattern-complete.md)'s
open question is closed **against the critic**: the fixture was right and the prompt was
pattern-matching on surface shape while claiming to run a falsifiability test.

Its decisive argument, which decided the prompt edit:

> The world in which *"users are always seeking more control"* is false is one where users
> are broadly indifferent — and that world is not hypothetical here, it is the European
> Commission's stated position, **quoted three paragraphs later** (*"there is no clear
> demand"*). A pattern defined by unfalsifiability cannot fire on a sentence whose falsity is
> the opposing party's official position.

## What changed in the prompt

Three edits, all **exclusions** — they can only make the critic quieter.

1. A new framing paragraph: *not one of your five patterns is decidable from the sentence it
   appears in*, so read to the end and go back to each candidate before writing it down.
2. `llm-safe-truths` became **three gates, all of which must fail**: falsifiability, then
   **the draft's own quarrel** (does the piece name an opponent, quote a denial, or spend a
   paragraph defending the claim?), then **deletion** (does anything downstream depend on it?).
3. `absence-of-concrete-detail` got the parallel *read on before you flag* clause, plus the
   link-stripping caveat below.

`n-eu-gatekeepers` still expects `CLEAN`, unchanged.

## Design

**Identical to v1 and decided before dispatch**: 8 fixtures × k=3, 11 corpus × k=1, same
cases, same opaque ids (`MANIFEST.json` case ids are byte-identical between runs). Everything
was re-drawn, including the v1 `CLEAN` cases — the edit being an exclusion is an argument
from reasoning, and a table with v1 numbers in some rows and v2 in others is not a comparison.

Prompt sha `93d7cad6af2c3180` (v1) → `05111e99566abb35` (v2). **v1's `MANIFEST.json` still
says `93d7cad6af2c3180` and must keep saying it** — it records the prompt that run was
actually made against, and rewriting it to match the shipped file would turn the one field
that dates a number into a lie.

### v2 supersedes v1; it is not a second sample of it

**The current measurement of the shipped prompt is v2, alone.** v1 measures a prompt that no
longer exists, and its numbers may not be pooled with these, averaged against them, or quoted
as though both describe one system.

The before/after table below is legitimate for exactly one thing and nothing else: it is the
**effect of one deliberate change**, with the cases, the draw count, the staging and the case
ids held fixed and one variable moved. That is a comparison of two prompts. It is not two
draws of one prompt, and the split counts in particular (2 of 8 → 3 of 8) are the difference
between two small samples, not evidence that the edit made the critic less stable.

## Fixtures

```
  case-01  n-eu-gatekeepers  CLEAN 2/3  expected CLEAN  ok
  case-02  n-wilhoitian  CLEAN 3/3  expected CLEAN  ok
  case-03  p-supplemental-safe-truths  REVISE 3/3  expected REVISE  ok
  case-04  n-awakening-v  CLEAN 3/3  expected CLEAN  ok
  case-05  p-drop-tool-announced  REVISE 3/3  expected REVISE  ok
  case-06  n-attestation  REVISE 2/3  expected CLEAN  MISS
  case-07  p-watch-dogs-no-detail  CLEAN 2/3  expected REVISE  MISS
  case-08  p-moderation-announced  REVISE 3/3  expected REVISE  ok

    majority verdicts matching the fixture's expectation:  6 of 8
    cases whose draws did not agree with each other:       3 of 8
    findings naming no catalogued pattern (uncatalogued):  0   <- must be 0
    claims about machine authorship:                       0   <- must be 0
    findings restating a deterministic scan hit:           0   <- must be 0
```

## Before and after, and the headline is not the aggregate

| | v1 | v2 |
|---|---|---|
| majority verdicts matching | 6 of 8 | **6 of 8** |
| false positives, **per draw** on the 4 negative fixtures | 4 of 12 | **3 of 12** |
| — of those, `llm-safe-truths` | **3** | **1** |
| — of those, `absence-of-concrete-detail` | 3 | 2 |
| true positives, per draw on the 4 positive fixtures | 10 of 12 | **10 of 12** |
| `llm-safe-truths` TP | 3/3 | 3/3 |
| `announced-then-undelivered` TP | 6/6 | 6/6 |
| `absence-of-concrete-detail` TP | 1/3 | 1/3 |
| human corpus, single draws | 2 of 5 `REVISE` | **2 of 5 `REVISE`** |
| draws that disagreed | 2 of 8 | 3 of 8 |

**The score did not move, and reporting only the improvement would be the dishonest read.**
Three things happened at once and they need separating:

**1. The targeted fix worked, precisely, on the thing it targeted.** On `n-eu-gatekeepers`,
`llm-safe-truths` fired in **3 of 3** v1 draws and **0 of 3** v2 draws. The adjudicated false
positive is gone. The one remaining `REVISE` draw on that fixture is
`absence-of-concrete-detail`, a different pattern.

**2. It cost nothing in true positives.** 10 of 12 positive draws both runs, and the
per-pattern rates are identical to the draw: 3/3, 6/6, 1/3. No trade was made. That is worth
stating plainly because the obvious risk of adding gates to a detector is that it stops
detecting, and here it did not — the gates are about *context*, and a constructed positive
inserted into prose that never argues for it fails all three of them just as it should.

**3. The false positives migrated rather than disappeared.**
`absence-of-concrete-detail` is now the dominant source: 2 of the 3 remaining FP draws. The
parallel *read on before you flag* clause it received did not do for it what the three gates
did for `llm-safe-truths`. **That pattern is the next thing to fix, and it is also the one
with the worst true-positive rate (1/3).** Both directions wrong at once is the signature of
an instruction that is not operationalised — `llm-safe-truths` now has a procedure, and
`absence-of-concrete-detail` still has a description.

## `n-attestation` regressed, and it is inside the noise

Class B, expected `CLEAN`. v1: `REVISE, CLEAN, CLEAN`. v2: `CLEAN, REVISE, REVISE`. Both are
2/3 splits; they point opposite ways. The two v2 findings are one `llm-safe-truths` and one
`absence-of-concrete-detail`, on different spans — not a systematic consequence of an edit
that only adds exclusions.

**The expectation was not changed and the prompt was not touched again.** At k=3 a fixture
that splits both times is a fixture whose true rate is near the boundary, and the correct
response is more draws, not a new prompt or a new expectation. Chasing it now would be
tuning against a coin.

## Corpus sweep — single draws

```
  case-01  x-jacques-blois-linguist  REVISE 1/1
  case-02  h-bacon-of-adversity  CLEAN 1/1
  case-03  h-chekhov-039-to-his-sister  CLEAN 1/1
  case-04  x-peter-oloche-david  CLEAN 1/1
  case-05  h-2026-06-26-hate-algorithm-rss-one-tools-youve-been-looking  REVISE 1/1
  case-06  x-mojtaba-yadegari-ai  CLEAN 1/1
  case-07  h-ahmadu-bello-university  REVISE 1/1
  case-08  x-berry-hill-stoke-on-trent  REVISE 1/1
  case-09  x-knowledge-cutoff-example-1  REVISE 1/1
  case-10  x-gillingham-high-street  CLEAN 1/1
  case-11  h-chesterton-on-lying-in-bed  CLEAN 1/1

    findings naming no catalogued pattern (uncatalogued):  0   <- must be 0
    claims about machine authorship:                       0   <- must be 0
    findings restating a deterministic scan hit:           0   <- must be 0
```

Human **3 CLEAN / 2 REVISE**, AI-labelled **3 REVISE / 3 CLEAN** — the same counts as v1, with
two AI samples swapping sides (`x-jacques-blois` CLEAN→REVISE, `x-gillingham` REVISE→CLEAN).
**Two single draws differing is not a change; it is what a single draw is worth.** The two
human `REVISE`s are the same two documents as v1, which is the more informative fact: they are
stable, not noise, and both are `absence-of-concrete-detail` territory.

## The other fixture confound, found by the same adjudicator

**EFF Deeplinks posts hyperlink their claims inline, and the corpus fetcher keeps the anchor
text and drops the href.** `grep -c` for a URL in an EFF body returns **1** — the frontmatter
permalink — against **52** in a Doctorow post that writes its URLs out as text. So a published
sentence that cited its source arrives here reading as unsourced.

That systematically inflates `absence-of-concrete-detail` and the unnamed-source half of
`invented-specifics`, and it can make the critic look wrong for noticing a gap the author did
not leave. Handled three ways, none of which is editing the corpus:

- the prompt now routes an apparently-missing citation to *Out of scope* rather than a finding;
- `fixtures.json` carries a `known_confounds.links_stripped` block and every affected fixture
  declares `source_strips_links: true`;
- `selftest.mjs` **requires** that declaration for any fixture drawn from `human-professional/`
  or `human-essays/pluralistic/`, so the next EFF fixture cannot be added without recording it.

**Fixing it at source means changing the fetchers and re-vendoring the corpus, which
regenerates every acceptance baseline in this bundle.** That is a corpus-pipeline change, not
a fixture change, and it belongs to whoever owns the fetchers.

## The adjudication that caused this run has no transcript, and that is a gap

Every one of the 70 critic dispatches across both runs is logged verbatim under `raw/`. **The
blind adjudication of `n-eu-gatekeepers` is not** — it was run by the integrator, outside this
harness, and what survives is the quoted reasoning at the top of this file.

That reasoning is checkable against the draft, and I checked it: *"there is no clear demand"*
is on line 15 of `staged/case-01-draft.md`, three paragraphs after the flagged opener. But it
is the single most consequential fact in this exercise — it is why the prompt changed — and it
rests on narration where all 70 lesser facts rest on artifacts. A verification review flagged
the asymmetry and it is right to.

**Not something I can close from here**, since I did not run it. The fix for next time is that
an adjudication that overturns a fixture gets logged under `raw/` like any other dispatch.

## Contract

Zero on all three counts across all 35 v2 transcripts. Nothing blocks.

`case-06-d2`'s v1 drift — `CLEAN` returned while carrying a low-confidence finding — **did
not recur**: every v2 transcript carrying a finding returned `REVISE`, and every `CLEAN`
carried none. The unbolded-`PATTERN:` drift did recur.

Re-derive:

```bash
node tests/pattern-harness.mjs verify runs/2026-08-05-pattern-v2
node tests/pattern-harness.mjs verify runs/2026-08-05-pattern-v2-corpus
```

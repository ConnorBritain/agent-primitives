# 2026-08-05 — `prose-pattern-critic`, first acceptance run

> **SUPERSEDED by [v2](2026-08-05-pattern-v2-complete.md).** The prompt was changed after
> this run — a blind adjudicator confirmed that finding 1 below is a genuine false positive
> — so **none of these numbers describe the shipped critic.** They are kept because the v2
> log compares against them and because finding 1 is the reason the prompt changed. Do not
> pool them with v2's or quote them as current.

Prompt version: `primitives/agents/prose-pattern-critic/agent.md`, sha256 prefix in each
run's `MANIFEST.json`. **The prompt was not edited between the design being fixed and the
last agent returning**, so every number below is against one prompt version.

**One amendment was made after the run, and it is named here rather than left to a diff.**
An architecture review noted that the *What is NOT a finding* line reading "whether the
argument is any good, which is a substance question" did not name the sibling that owns it.
`prose-substance-critic` was named in that line, and the same boundary added to
`meta.yaml`. It is an exclusion, so it can only make the critic quieter, never louder — but
the prompt sha in `MANIFEST.json` no longer matches the file, deliberately, and the next
run re-establishes the numbers.

Two sets, both dispatched from one session, one clean-context agent per prompt, each agent
told to read only its prompt file and the two staged inputs and to write its report
verbatim. 35 agents. The sampling design was written into
[`../critic-harness.md`](../critic-harness.md) before the first dispatch.

Numbers below are **quoted from `pattern-harness.mjs verify`, not retyped.**

---

## Fixtures — 8 cases × 3 draws

```
  case-01  n-eu-gatekeepers  REVISE 3/3  expected CLEAN  MISS
  case-02  n-wilhoitian  CLEAN 3/3  expected CLEAN  ok
  case-03  p-supplemental-safe-truths  REVISE 3/3  expected REVISE  ok
  case-04  n-awakening-v  CLEAN 3/3  expected CLEAN  ok
  case-05  p-drop-tool-announced  REVISE 3/3  expected REVISE  ok
  case-06  n-attestation  CLEAN 2/3  expected CLEAN  ok
  case-07  p-watch-dogs-no-detail  CLEAN 2/3  expected REVISE  MISS
  case-08  p-moderation-announced  REVISE 3/3  expected REVISE  ok

    majority verdicts matching the fixture's expectation:  6 of 8
    cases whose draws did not agree with each other:       2 of 8
    findings naming no catalogued pattern (uncatalogued):  0   <- must be 0
    claims about machine authorship:                       0   <- must be 0
    findings restating a deterministic scan hit:           0   <- must be 0

    echo baseline: NOT APPLICABLE. The scanner emits no verdict on any pattern this
    critic owns, so there is no verdict to parrot and no rate to beat. See
    critic-harness.md; do not substitute a number here to fill the shape.
```

By class: **A 1/2 · B 2/2 · C 2/2 · D 1/2.**

**Every constructed positive that was caught was caught under the right pattern id.**
`p-supplemental-safe-truths` → `llm-safe-truths` on all three draws;
`p-drop-tool-announced` and `p-moderation-announced` → `announced-then-undelivered` on all
three; `p-watch-dogs-no-detail` → `absence-of-concrete-detail` on the one draw that fired.
Nothing was caught for the wrong reason, which is the part a verdict column hides.

## Corpus sweep — 11 cases × 1 draw

**Single draws. Every figure here is one sample, and the two splits above are what one
sample is worth.**

```
  case-01  x-jacques-blois-linguist  CLEAN 1/1
  case-02  h-bacon-of-adversity  CLEAN 1/1
  case-03  h-chekhov-039-to-his-sister  CLEAN 1/1
  case-04  x-peter-oloche-david  CLEAN 1/1
  case-05  h-2026-06-26-hate-algorithm-rss-one-tools-youve-been-looking  REVISE 1/1
  case-06  x-mojtaba-yadegari-ai  CLEAN 1/1
  case-07  h-ahmadu-bello-university  REVISE 1/1
  case-08  x-berry-hill-stoke-on-trent  REVISE 1/1
  case-09  x-knowledge-cutoff-example-1  REVISE 1/1
  case-10  x-gillingham-high-street  REVISE 1/1
  case-11  h-chesterton-on-lying-in-bed  CLEAN 1/1

    findings naming no catalogued pattern (uncatalogued):  0   <- must be 0
    claims about machine authorship:                       0   <- must be 0
    findings restating a deterministic scan hit:           0   <- must be 0
```

`h-` = human-labelled, `x-` = AI-labelled. **Human 3 CLEAN / 2 REVISE. AI 3 REVISE / 3
CLEAN.** Seven of the 33 AI samples were excluded before selection because their own body
text names AI authorship; the rule and the count are in `critic-harness.md`.

**This does not separate the two corpora, and it was never going to.** The critic is not an
authorship detector and the prompt forbids it from behaving like one. What the sweep is for
is the false-positive bound on the human half, and that bound is **3 of 5 quiet on one draw
each** — which is not a good number and is reported as the number it is.

---

## Findings from the run, in order of how much they matter

### 1. `n-eu-gatekeepers` returned REVISE on all three draws. Not corrected. **Now resolved.**

> **RESOLVED against the critic.** A blind adjudicator — given the draft, and neither the
> expectation nor these transcripts — returned `CLEAN`, on the ground that the falsifying
> world is quoted three paragraphs into the same draft. **The fixture was right and the
> prompt was wrong.** The two readings below are left as written because the second one is
> what I believed at the time and it was the wrong guess; the fix and its cost are in
> [v2](2026-08-05-pattern-v2-complete.md).

The class-A fixture is an unmodified, published EFF advocacy post. All three draws flagged
the same first sentence — *"Users are always seeking more control over their social
networking experience to make it better"* — as `llm-safe-truths`, with the falsifiability
test applied correctly and the span quoted. Two of the three also flagged *"erecting a
myriad of hurdles"* as `absence-of-concrete-detail`.

Two readings, and **this run does not settle which is right**:

- The prompt is trigger-happy on soft universal openers, which real advocacy prose uses as
  throat-clearing before the argument. That is a false positive and a prompt defect.
- The fixture author (me) asserted "nothing on the critic's list is present" from the
  scanner being quiet, which is not evidence about a list the scanner does not check. That
  is a fixture-authoring defect, and the fixture is wrong.

**The fixture was not corrected and the prompt was not tuned.** prose-review's harness
corrected exactly one expectation on a critic's say-so and then deliberately carried the
next disagreement as a false positive, because a second correction in the same direction
makes the expectations unfalsifiable. The same rule applies here on the first one:
correcting a fixture on the strength of the run that failed it would make this harness
measure nothing. It needs an independent read of that draft against the falsifiability
test, by someone who did not author either the fixture or the prompt.

### 2. `p-watch-dogs-no-detail` was caught on 1 draw of 3 — the honest cost of the tie-break

The constructed absence is severe: an event announcement stripped of its convention, its
organiser, five named panellists, a date, a time and a room number, in a post that names
Dragon Con 2018 two paragraphs earlier. One draw found it and named it correctly. Two
returned CLEAN.

This is what *uncertainty resolves to silence* buys and costs, and the direction is the one
the prompt chose on purpose. `absence-of-concrete-detail` is the hardest of the five for
exactly the reason the catalog gives — absence has no span — and a critic told to stay quiet
when unsure will stay quiet about it. **Anyone quoting a true-positive rate for this critic
should quote it per pattern, not in aggregate:** 3 of 3 on `llm-safe-truths`, 6 of 6 on
`announced-then-undelivered`, 1 of 3 on `absence-of-concrete-detail`.

### 3. Verdicts are not deterministic here either — 2 of 8 cases split

`n-attestation` (B) went REVISE, CLEAN, CLEAN. `p-watch-dogs-no-detail` (D) went CLEAN,
CLEAN, REVISE. Both are reported as majorities with the split shown, and neither is
resolved. This is the third independent confirmation in this repo that a single draw is not
a result.

### 4. Contract drift, two kinds, neither of them in the verdict

- **4 of the 20 transcripts carrying findings did not use the contracted `**PATTERN**`
  marker.** Three emitted `PATTERN:` unbolded (`case-03-d3`, `case-07-d3`, `case-08-d2`)
  and one used `- **PATTERN**:` as a list item (`case-01-d2`). The findings counter was
  widened to accept all three shapes, and the drift is recorded here rather than papered
  over. It changed no verdict — the verdict is derived from the last lines, not the markers
  — but at 4 of 20 it is a rate, not a slip, and the output contract should say whether the
  bold is load-bearing before the next run.
- **`case-06-d2` returned `CLEAN` while carrying one low-confidence finding.** The prompt
  says a low finding is reported only if a high one sits near it, and there was none. This
  is the same shape as the `CONFIDENCE: low-medium` drift prose-review found on its first
  run: harmless in itself, invisible in a summary table, and the beginning of a rule that
  stops meaning anything. **Not fixed in this run** — fixing the prompt would invalidate
  every number above. It is the first thing to fix in the next one.

### 5. What the critic got right that a regex could not have

`h-ahmadu-bello-university` was flagged under `invented-specifics` for two internal
contradictions in one article: a library with *"over 1.2 millions books"* and *"a capacity
of 70,000 books"*, and the university's founding given as both 1955 and 1962. Both are
checkable by anyone in thirty seconds and neither is a regex's job. That is the narrow
reading of `invented-specifics` working exactly as the prompt scoped it — no appeal to the
world, only to two spans in the same draft.

---

## Verdict on the run

**The three contract counts are zero across all 35 transcripts**, so nothing blocks. The
score is 6 of 8 with two unresolved cases, and the primitive ships with both written into
its *Known limits* rather than into a footnote.

Re-derive with:

```bash
node tests/pattern-harness.mjs verify runs/2026-08-05-pattern
node tests/pattern-harness.mjs verify runs/2026-08-05-pattern-corpus
```

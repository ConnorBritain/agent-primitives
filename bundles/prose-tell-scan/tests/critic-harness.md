# prose-pattern-critic — acceptance harness

The protocol for the one primitive in this bundle that is not a script. Runs are logged
under [`runs/`](runs/); this file stays the method.

`prose-tell-scan` is otherwise deterministic, and everything in it is tested by
[`selftest.mjs`](selftest.mjs) and [`acceptance.mjs`](acceptance.mjs) the way a scanner
should be. `prose-pattern-critic` cannot be tested that way, because its whole remit is the
list the catalog keeps of what it refuses to decide.

---

## What the critic reads, and why that decides the harness

`catalog.json` has a `not_deterministic` block: six patterns the brief asks for that a
regex genuinely cannot decide, each with the reason recorded beside it. The critic owns
**four** of them. (`no-voice-shift` is `prose-voice-critic`'s item 5, judged against the
author's corpus — the reading of that question with something to check against.
`absence-of-concrete-detail` is owned by nobody as of 2026-08-06, on the measurement in the
v2 row below; see `meta.yaml` → `unowned_by_decision`.)

**This is a different kind of artifact from the one `prose-fidelity-critic` reads, and the
harness had to change to match.** `fidelity-scan` answers the same question as its critic
and can be wrong; `not_deterministic` is a declaration of non-coverage. The scanner emits
no judgement on any pattern this critic owns, on any draft, ever.

Three things follow, and each is a place the prose-review harness did **not** port.

### 1. Two of the four fixture classes cannot exist, and that is not a weakness

[prose-review's protocol](../../prose-review/tests/critic-harness.md) classifies a fixture
by whether the critic must agree or disagree with the scanner, and `selftest.mjs` there
fails if either disagreement class empties out. That test is correct **for a tool that
attempts the same question and sometimes gets it wrong.** Ported here it would be
meaningless: there are no over-flags to clear because there are no flags.

So the axis was replaced with the one that actually varies — whether the scanner is
**noisy elsewhere on the same draft** — because that is where the real wrapper risk lives.
A pattern critic does not become an echo by agreeing with a verdict; it becomes one by
laundering the scanner's deterministic hits into a verdict of its own.

| class | scan on the draft | critic must say | what it tests |
|---|---|---|---|
| **A** | quiet | `CLEAN` | it does not manufacture nits |
| **B** | **loud** | `CLEAN` | it does not convict a draft for hits that are not its business |
| **C** | **loud** | `REVISE` | it names a `not_deterministic` pattern rather than restating a category the scan reported |
| **D** | quiet | `REVISE` | it catches what no regex reaches |

**B and D are still the entire argument for the critic existing**, which is why the class
structure was worth keeping rather than abandoning. B is now the anti-echo class: a draft
where the scanner flags three categories and the correct verdict is `CLEAN`. A critic that
cannot return `CLEAN` on `n-wilhoitian` has no scope, only a mood.

### 2. There is no echo baseline, and no number goes in its place

prose-review quotes *"verdicts identical to fidelity-scan's (echo rate): 8 of 13"* — the
score a critic gets by parroting the tool, which turns "is this worth its tokens" into a
number. That requires the tool and the critic to emit **comparable units.** Here the
catalog emits pattern *definitions* and the scanner emits *measurements*; the critic emits
a *judgement*. There is nothing to copy, so there is no rate.

`pattern-harness.mjs verify` prints `echo baseline: NOT APPLICABLE` with the reason rather
than leaving the row out, because a missing row reads as an oversight and gets filled in by
the next person. What replaces it is the `echoes_scan` contract count below, which measures
the same worry directly: how many findings restated something the scan already reported.
It blocks at anything above zero.

### 3. Ground truth is partial, and the two halves support different claims

Per [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — *does this question have an answer that
does not depend on who is asked?* This critic sits between its two siblings.

- **Constructed positives have ground truth.** Insert three sentences that cannot be
  falsified, and `llm-safe-truths` is present by construction. Delete every specific from
  the one paragraph that announces an event, and `absence-of-concrete-detail` is present by
  construction. Nobody has to be trusted about that. Classes C and D support a
  **true-positive rate**.
- **Unmodified human prose bounds false positives and nothing more.** Classes A and B, and
  the corpus sweep, can only show the critic stays quiet.

So the claim this harness supports has two halves and they are not interchangeable: *it
finds the patterns it was handed, and it stays quiet on prose that does not have them.*
It does **not** support "it finds AI writing," which is not a question anything in this
bundle may answer.

---

## Fixtures

[`fixtures/pattern/`](fixtures/pattern/) — one `draft.md` per case, and
[`build.mjs`](fixtures/pattern/build.mjs) is the only thing allowed to write it.

**Every byte of every draft is either corpus bytes or a string written down in
`fixtures.json`.** prose-review keeps `original.md` byte-identical to a corpus file so it
cannot be tuned; that guard covers only the untouched half of a pair, and there is no
untouched half here. So the guard moved: the draft is *derived*, each declared `find` must
match its source exactly once, and `selftest.mjs` re-applies the edits and fails on any
byte that does not reproduce. A quiet nudge to a paragraph is an undeclared edit and the
build says so.

Negatives carry `edits: []` and are therefore byte-identical to prose a person published.

**A class-B fixture must be an unarguable case of the scanner being loud about something
that is not this critic's business** — the same lesson prose-review recorded about class B,
in this harness's terms. `n-wilhoitian` qualifies because all three flagged categories are
`entries`, which the prompt puts out of scope by name.

---

## Sampling, and it is fixed before the run

Critic verdicts are not deterministic. Two dispatches of a byte-identical prompt elsewhere
in this repo returned opposite verdicts on the same span. **Every number in this file is
therefore a stated number of draws, and the design below was written down before the first
agent was dispatched.**

| set | cases | draws each | dispatches |
|---|---|---|---|
| fixtures | 8 | **3** | 24 |
| corpus sweep | 11 | **1** | 11 |

Fixtures get `k=3` and are scored on the **majority** verdict, with disagreement reported
as its own line rather than resolved. The corpus sweep gets `k=1` and every figure from it
is a single draw and is labelled as one.

`k=3` is a default, not a measurement: it is the smallest number with a majority. Raising
it after seeing a split would be choosing the sample that gives the answer you wanted.

**The v2 re-run uses this design unchanged, and re-runs everything.** The prompt was
tightened after v1, and the tightening is an *exclusion* — so it can only make the critic
quieter, and one could argue the v1 `CLEAN` cases need not be re-drawn. That argument is
from reasoning rather than measurement, and it is wrong for a second reason: verdicts are
not deterministic, so a v1 `CLEAN` can go `REVISE` on redraw for reasons that have nothing
to do with the edit. **A table with v1 numbers in some rows and v2 in others is not a
comparison.** Both runs are complete, at the same k, over the same cases.

**Corpus selection is a rule, not a list.** `pattern-harness.mjs` sorts the filenames and
takes every Nth, so "which samples did you use" cannot be answered with "the ones that
worked". Eleven samples are excluded by a second stated rule, below.

### The AI corpus tells the critic the answer, in seven samples

They are Wikipedia pages vendored together with the talk-page comment that got them listed
— *"Complete AI slop"*, *"Clearly AI-generated"*, *"LLM-written"* — and one whose citation
URLs carry `utm_source=chatgpt.com`. All of it is in the body, not the frontmatter, so
stripping frontmatter does not touch it. **7 of 33.**

The harness excludes them by rule and prints the count, rather than editing vendored source
or quietly keeping them. `NAMES_AUTHORSHIP` is also a hard abort in staging, so a sample
that acquires such a line later stops the run instead of contaminating it.

The rule is blunt on purpose and over-excludes in the safe direction: it also drops four
EFF posts that merely *discuss* LLMs. Losing four negatives costs a little false-positive
bound; keeping one labelled positive would cost the entire positive column.

---

## Running one

```bash
node tests/pattern-harness.mjs prepare fixtures 2026-08-05-pattern --draws 3
# dispatch one clean-context agent per prompt; each writes its report verbatim to raw/
node tests/pattern-harness.mjs collect runs/2026-08-05-pattern
node tests/pattern-harness.mjs verify  runs/2026-08-05-pattern
```

`prepare` strips frontmatter, renames each case to an opaque `case-NN` ordered by a hash of
the fixture name — `p-` *is* the answer — runs the scan and stages the report, and aborts
if any staged byte carries a verdict word, an expectation key or a provenance label.

There is no `dispatch`. This repo is public and its tests must not require an API key.

**The three contract counts stay human.** `collect` derives the verdict and the findings
count from the transcript body, then writes `review.json` with every finding quoted and
`null` where each count belongs. It refuses to emit until a person replaces the nulls, and
never defaults them to 0, because 0 is the direction that flatters the result.

```
uncatalogued:      findings naming no not_deterministic id          <- must be 0
authorship_claims: any claim or implication of machine authorship   <- must be 0
echoes_scan:       findings restating something the scan reported   <- must be 0
```

Any of the three above zero blocks the primitive regardless of how well it scored.

---

## What this harness cannot do

**It cannot tell a well-tuned prompt from an over-quiet one on the patterns it does not
plant.** Constructed positives measure the three patterns that were constructed.
`surveying-without-committing` and `invented-specifics` have **no positive fixture** —
the first is a whole-document property that cannot be created by inserting a paragraph, and
the second, in the narrow reading the prompt allows, needs a draft with an internal
contradiction nobody has built. Those two ship on the false-positive half only.

**It measures register as much as authorship, in the same way prose-review's does.** The
corpus sweep's human half is one register per source and its AI half is Wikipedia drafts;
a difference the sweep surfaces may be genre.

**Constructed positives are constructed by one person.** The insertions are what *I* think
an unfalsifiable sentence looks like. A critic that agrees with them has agreed with the
fixture author, and the true-positive rate is bounded by that.

**It scores the verdict and the pattern id. It cannot see the reasoning behind them.** An
architecture review named the sharp case: `llm-safe-truths`'s third gate asks whether anything
downstream depends on the sentence, which means the critic performs a small argument-structure
read before it writes anything — and argument structure is `prose-adversarial-reader`'s and
`prose-substance-critic`'s territory. The *output* is anchored to a catalog pattern and a span,
which is the stated boundary and is checkable. The *reasoning* is invisible unless a finding is
emitted, so a finding that is really an argument-strength critique with a `PATTERN:` label on
it would pass every count this harness has. Closing that means constraining the `WHY IT IS THIS
PATTERN` line to name the specific broken dependency, which is an output-layer fix and is on
the list below.

## Named next fixes, in order

Neither of 2–3 is applied, deliberately: the shipped prompt is the one the runs measured, and
an edit inside the run that measures it would leave nothing on the record describing what
ships. Item 0 is a harness fix, not a prompt fix, and is the blocker.

0. **Close the two staging leaks that produced v3's `authorship_claims: 2`**, then re-run the
   sweep. Both are in `pattern-harness.mjs` and both defeat its own guards.
   - `NAMES_AUTHORSHIP` misses **`chatbot-generated`**, so `case-08`'s vendored talk-page
     comment — *"the tone is clearly chatbot-generated"* — reaches the critic in line 1 of the
     draft. Widening the regex is not enough on its own: the guard is a fixed word list
     against vendored prose, and it will keep losing this race. It also changes the corpus
     denominator, so it is a selection change and must be recorded as one.
   - **The staged scan report leaks through `tell-scan`'s own entry ids.** `leakage` →
     `assistant-preamble`, `chatbot-register`, `model-markup-artifact` are staged verbatim,
     and `LEAKS` inspects the drafts and the report's *values* but never asks whether an id it
     is handing over asserts machine authorship. Four of the eleven cases carry one. This is
     the sharper of the two: the critic is told the answer by the artifact it is *required* to
     read, and no wording change to the prompt can fix that.
1. **Give `absence-of-concrete-detail` a procedure — only if someone wants it back.** As of
   2026-08-06 it is unowned, so this is no longer a fix to the critic but the price of
   overturning that decision. It was simultaneously the worst true-positive rate (1/3) and the
   largest false-positive source (2 of 3 FP draws in v2). `llm-safe-truths` got three named
   gates and its false positives collapsed; this one got two caveats about what *not* to flag,
   which is not the same as a positive test for what to flag. Wrong in both directions at once
   is what an un-operationalised instruction looks like.
2. **Make gate 3's output checkable.** Require the `WHY` line to name the dependency the
   deletion breaks — an example that is no longer motivated, a consequence no longer drawn —
   rather than a general appeal to the passage mattering.
3. **Decide whether the `**PATTERN**` bold is load-bearing** and say so in the output
   contract. 5 of 18 finding-bearing v2 transcripts did not use it; the counter absorbs all
   three shapes, which is the wrong place for that decision to live.

## Runs

| run | fixtures (majority) | splits | uncatalogued | authorship | echoes_scan |
|---|---|---|---|---|---|
| [2026-08-05 v1](runs/2026-08-05-pattern-complete.md) — first sweep, k=3. **SUPERSEDED** | 6 of 8 (A 1/2 · B 2/2 · C 2/2 · D 1/2) | 2 of 8 | 0 | 0 | 0 |
| [2026-08-05 v2](runs/2026-08-05-pattern-v2-complete.md) — after the `llm-safe-truths` tightening, k=3, **same cases**. **CURRENT** | **6 of 8** (A 2/2 · B 1/2 · C 2/2 · D 1/2) | 3 of 8 | 0 | 0 | 0 |
| [2026-08-06 v3-corpus-k3](runs/2026-08-06-pattern-v3-corpus-k3/) — **corpus sweep only**, after `absence-of-concrete-detail` was dropped from scope. 11 samples, k=3, same 11 documents as v2's sweep. **BLOCKED** | n/a — no fixtures re-run | 4 of 11 | 0 | **2** | 0 |

**Only the v2 row describes the shipped prompt.** v1 measures a prompt that no longer exists;
its numbers may not be pooled with v2's or averaged against them. The two rows are comparable
as the **before and after of one deliberate change** — same cases, same k, same staging, one
variable moved — and as nothing else.

Corpus sweep both days, **single draws**: human 3 `CLEAN` / 2 `REVISE` in each, AI-labelled
3 `REVISE` / 3 `CLEAN` in each. It does not separate the corpora and is not meant to.

**The aggregate is the least informative number here and quoting it alone is misleading.**
Between v1 and v2 it did not move, and three separate things happened underneath it:

- The false positive a blind adjudicator confirmed was real is **gone**: `llm-safe-truths`
  fired on 3 of 3 v1 draws of `n-eu-gatekeepers` and 0 of 3 in v2.
- **It cost no true positives.** 10 of 12 positive draws in both runs, per-pattern identical:
  **3/3 `llm-safe-truths`, 6/6 `announced-then-undelivered`, 1/3
  `absence-of-concrete-detail`.** Quote per pattern; the aggregate hides that spread.
- The false positives **migrated**. Per-draw FP on negative fixtures went 4/12 → 3/12, and
  `absence-of-concrete-detail` is now 2 of the 3. It is simultaneously the worst
  false-positive source and the worst true-positive rate, which is what an instruction that
  was never operationalised looks like from both sides. It is the next thing to fix.

One class-B fixture (`n-attestation`) split 2/3 in each run, in opposite directions. Left
uncorrected in both: a fixture that splits twice is near its own boundary, and the answer is
more draws, not a new prompt or a new expectation.

### The v3 corpus sweep, and the threshold it was run against

**Pre-registered before the run, scaled from the false-positive bands above (0–2 of 12
acceptable, 3–5 too eager, 6+ broken): SHIP at a k=3 majority flag rate ≤ 2 of 11, HOLD at
≥ 3.** The result is **2 of 11** — 0 of the 5 human-corpus samples, 2 of the 6 AI-corpus
samples. Against that threshold alone the run says SHIP.

**It does not ship, because `authorship_claims` is 2 and that count blocks regardless.**
Both are `case-09`, and both trace to staging rather than to the prompt. See the run's
[README](runs/2026-08-06-pattern-v3-corpus-k3/README.md).

**Agreement is 7 of 11 unanimous, 4 of 11 split** — a second, independent measurement of
this critic's non-determinism, on documents rather than fixtures, and close to the fixture
run's 3-of-8. It is the reason the k=1 sweep could not be trusted: **three of the four
splits are 1-REVISE/2-CLEAN, so a lone draw on any of them was a coin toss.**

**Two things changed between v2's sweep and this one — the pattern scope and k — and the
5-of-11 → 2-of-11 move cannot be attributed cleanly to either.** The scope drop can only
subtract (an excluded pattern cannot add a flag), and no draw in this run names
`absence-of-concrete-detail`, so it accounts for at most the flags that pattern carried
alone. Raising k can move a document in either direction. Both halves are real and the run
does not separate them; a k=3 sweep against the five-pattern prompt would, and was not run.

Patterns fired, per flagged document: `case-08` (`x-berry-hill-stoke-on-trent`)
`llm-safe-truths` on all three REVISE draws; `case-10` (`x-gillingham-high-street`)
`invented-specifics` ×2 and `llm-safe-truths` ×1. **The remaining flags do not concentrate
in one pattern**, so there is no next fix indicated by this run's distribution — unlike v2,
where `absence-of-concrete-detail` was 2 of 3.

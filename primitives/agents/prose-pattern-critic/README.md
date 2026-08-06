# prose-pattern-critic

Read-only critic that answers one question: **is one of the patterns the scanner refuses to
guess at actually present in this draft?**

Output contract: `CLEAN` / `REVISE`. Bundle: `prose-tell-scan`.

Not whether the draft is any good. Not whether it sounds like its author —
`prose-voice-critic` owns that and runs on the same draft separately. Not who wrote it,
which is not a question anything in this bundle may answer.

## Why this exists

`catalog.json` has 74 entries a regex decides and a block called `not_deterministic` listing
six it cannot, with the reason recorded beside each. The catalog's own note says why no
approximation was added:

> *Do not add regexes for these — an approximation would fire on everything and teach people
> to ignore the whole tool.*

That block has been a documented hole since the catalog was written. This critic is the
hole, filled by the only instrument that can fill it, and **scoped to exactly that hole and
nothing else.**

## What it owns, exclusively

Five of the six. Each finding must name the catalog id, and a finding that names none is out
of scope by construction — which is the mechanism that keeps the scope from drifting into
the neighbouring critics.

| id | the test the prompt applies |
|---|---|
| `llm-safe-truths` | Write down the world in which this sentence is false. If you cannot, and it carries no example, number or consequence, it is filler. Falsifiability, not vagueness. |
| `announced-then-undelivered` | Quote the announcement **and** the place delivery should have been. Without the second quotation it is an impression. |
| `surveying-without-committing` | Only when the piece sets up a question it declines to answer. A survey that announces itself is doing its job. |
| `absence-of-concrete-detail` | An absence has no line number, so cite the span that *should* have carried the specific, and name the kind owed. |
| `invented-specifics` | **Narrow reading only**: an unsourced attribution, or two specifics in the draft that cannot both be true. |

### And one it does not

**`no-voice-shift` belongs to `prose-voice-critic`**, item 5 of its list, judged against the
author's corpus. That is the reading of the question with something to check against; this
critic has no corpus. `AGENTS.md` is explicit that *"two primitives with overlapping scope
make each other weaker, because each assumes the other has it covered"* — and these two are
the first pair in the project that actually **co-run on the same draft**, so the boundary is
load-bearing rather than tidy.

**The narrowest boundary is with a critic that does not exist yet.** `prose-review`'s
`DESIGN.md` gives the spec-only `prose-substance-critic` *"claims without support, missing
specificity, stakes never stated"* — which is what `llm-safe-truths` and
`absence-of-concrete-detail` sound like from outside. The line is the **anchor**, not the
subject: a finding here names a catalog pattern and a span. A claim that is specific,
falsifiable and merely unsupported is substance's, however weak the argument around it
looks. Written down now, because a boundary agreed after both critics exist is a boundary
shaped by whichever shipped first.

`invented-specifics` was narrowed for the same reason in a different direction. The catalog
says the general form *"requires checking against the world."* A critic without the world
that judges anyway is guessing with authority, so anything needing external verification
goes under *Out of scope* as work for a fact-checker. On the acceptance run this narrow
reading found a library described as holding *"over 1.2 millions books"* with *"a capacity
of 70,000 books"* — checkable by anyone in thirty seconds, and no regex's job.

## Why a separate agent

**It must not be the author.** These five patterns are the ones a writer defends rather than
sees; a model that wrote the sentence remembers what it meant by it.

**It splits with a script, and the split is the opposite shape to `prose-fidelity-critic`'s.**
There, the tool and the critic answer the same question and the tool wins on presence. Here
they answer **disjoint** questions: the scanner owns 74 patterns this critic may not touch,
and this critic owns five the scanner never attempts. So the prompt's rule is not *the scan
is authoritative* but *the scan is none of your business* — raising a `structural-scaffold`
hit as a finding is a model paraphrasing a regex at the cost of a model call.

## The error preference, and where it comes from

**Uncertainty resolves to silence**, agreeing with `prose-voice-critic` and disagreeing with
`prose-fidelity-critic`. That is a derivation, not a house style, and
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md) states it: *resolve toward blocking when your
findings are checkable, toward silence when they are not.*

A fidelity finding is checkable — the original is right there and a wrong flag costs ten
seconds. *"This sentence cannot be wrong"* is a reading. A wrong one is indistinguishable
from a right one to the author receiving it, so it gets acted on, a real sentence gets cut,
and the writer writes more defensively next time. That is the damage the whole bundle exists
to prevent.

The catalog says the same thing about its own list, which is the strongest evidence the
direction is right: an approximation to these patterns *"would fire on everything."*

## When to run it

On a draft, after `tell-scan`, alongside `prose-voice-critic`. It needs the scan report to
know what has already been counted — a critic that has to guess what the scanner said will
restate it.

## Known limits

**Its scope is a data file, and the file can move.** Add a key to `not_deterministic` and
this critic silently stops covering it. `selftest.mjs` fails if any key is neither owned nor
explicitly disowned in `meta.yaml`, which turns a silent gap into a red test.

**The measured true-positive rate is per pattern, and it is uneven.** Identical across two
full runs: **3 of 3 on `llm-safe-truths`, 6 of 6 on `announced-then-undelivered`, 1 of 3 on
`absence-of-concrete-detail`.** An absence is the hardest of the five for the reason the
catalog gives — it has no span — and a critic told to stay quiet when unsure will stay quiet
about it. Quote per pattern; an aggregate hides this.

**`absence-of-concrete-detail` is the weakest thing here, in both directions at once.** It
has the worst true-positive rate (1/3) *and* it is the largest remaining source of false
positives (2 of the 3 FP draws in the current run). Being wrong both ways is the signature of
an instruction that describes a pattern instead of giving a procedure for deciding it —
`llm-safe-truths` got a three-gate procedure and its false positives collapsed; this one got
two caveats about what *not* to flag, which is not a test for what to flag. It is the first
named next fix in
[`tests/critic-harness.md`](../../../bundles/prose-tell-scan/tests/critic-harness.md).

**The harness scores the verdict and the pattern id; it cannot see the reasoning.**
`llm-safe-truths`'s third gate asks what depends on the sentence, which is a small
argument-structure read — and argument structure belongs to `prose-adversarial-reader` and
`prose-substance-critic`. The finding's *anchor* is a catalog pattern and a span, which is the
boundary and is checkable. The reasoning behind it is not, so an argument-strength critique
wearing a `PATTERN:` label would pass every contract count here. Constraining the `WHY` line
to name the dependency the deletion breaks is the second named next fix.

**`surveying-without-committing` and `invented-specifics` have no positive fixture at all.**
The first is a whole-document property that cannot be created by inserting a paragraph; the
second, in the narrow reading, needs a draft built with an internal contradiction and none
was. Both ship on *"it stays quiet on prose that does not have them"* and nothing stronger.

**It flags roughly one unmodified human draft in four, and that is the number to plan
around.** Per draw on the negative fixtures: **3 of 12**, down from 4 of 12 before the
tightening. On the human corpus, **2 of 5** single draws in both runs — and it is the *same
two documents* each time, which makes that pair evidence about the critic rather than noise.

**The one adjudicated false positive was real, and closing it is why there are two runs.** A
class-A fixture — an unmodified published EFF post — was flagged `llm-safe-truths` on all
three draws of the first run, for *"Users are always seeking more control over their social
networking experience."* A blind adjudicator, given the draft and neither the expectation nor
the transcripts, returned `CLEAN`: the world in which that sentence is false is **quoted
three paragraphs later**, as the European Commission's position that *"there is no clear
demand."* The fixture was right; the prompt was pattern-matching on surface shape while
claiming to apply a falsifiability test. `llm-safe-truths` became three gates — is it
falsifiable, does the draft itself contest it, does anything downstream depend on it — and
the flag went to **0 of 3, with no true positive lost.**

**A class-B fixture split 2/3 in both runs, in opposite directions, and is unresolved.**
Neither its expectation nor the prompt was changed for it. A fixture that splits twice at
k=3 sits near its own boundary, and the answer is more draws, not a new prompt.

**Verdicts are not deterministic.** Two of eight fixtures split in the first run and three of
eight in the second, across draws of a byte-identical prompt. Every number here is a stated
number of draws, and two single draws differing is not a change.

**It cannot detect AI writing and must never be used to try.** On both corpus sweeps it
returned `REVISE` on 3 of 6 AI-labelled samples and 2 of 5 human ones, single draws. That is
not a failure — it is a critic doing the job it was given, which is naming five specific
patterns wherever they occur, and they occur in human writing constantly.

**It is judged on plain text that may have lost its citations.** The EFF and Doctorow corpora
are vendored with anchor text and no hrefs, so a published sentence that cited its source
reads here as unsourced — which inflates `absence-of-concrete-detail` and the unnamed-source
half of `invented-specifics`. The prompt routes an apparently-missing citation to *Out of
scope*; the fixture manifest declares the confound per fixture and the selftest enforces the
declaration. The real fix is a corpus-pipeline change, not a prompt one.

Current numbers and their caveats live in
[`tests/critic-harness.md`](../../../bundles/prose-tell-scan/tests/critic-harness.md) and
the run log beside it, not here, because they change and this does not.

## Install

```bash
./install.sh prose-pattern-critic       # → ~/.claude/agents/
./install.sh --project prose-pattern-critic
```

Or install the whole bundle: `/plugin install prose-tell-scan@agent-primitives`.

# prose-review — design

**Status: v0.1 + fidelity-scan.** `prose-voice-critic` ships with its
acceptance harness. `fidelity-scan` (the deterministic sidecar the fidelity
critic reads) ships too - see `tools/fidelity-scan.mjs`. The other three
critics, the reviser, and the fidelity critic prompt are spec only.

`prose-tell-scan` counts what can be counted. This bundle is the other half: the
judgements no regex reaches. It is also where the one rule this project has been
arranging itself around finally gets tested, because this is the bundle that
contains a thing which *changes text*.

---

## What it is

Five read-only critics, a fidelity check, and — later, deliberately later — one
transformer.

| primitive | kind | owns, exclusively | verdict |
|---|---|---|---|
| `prose-substance-critic` | reviewer | claims without support, missing specificity, stakes never stated | `CLEAN` / `REVISE` / `AUTHOR-INPUT` |
| `prose-voice-critic` | reviewer | does this sound like this author, against their voice card and corpus | `CLEAN` / `REVISE` |
| `prose-adversarial-reader` | reviewer | the whole-piece read: thesis, order, weakest section, strongest objection | `CLEAN` / `REVISE` |
| `prose-medium-critic` | reviewer | delivery — TTS homographs, web scannability, print. **Conditional** | `CLEAN` / `REVISE` |
| `prose-fidelity-critic` | reviewer | did a revision preserve what it had to | `FAITHFUL` / `MATERIAL-LOSS` |
| `prose-reviser` | transformer | the single mutating pass | change log keyed to plan entries |

`prose-pattern-critic` is **not here.** It reads `catalog.json` and belongs with
the catalog, in `prose-tell-scan`, on that bundle's release clock.

**Exclusivity is the design constraint.** `AGENTS.md`: *"two primitives with
overlapping scope make each other weaker, because each assumes the other has it
covered."* Every finding should have exactly one critic whose job it obviously
was. Where two could plausibly claim it, the spec must say which.

**And where none can, the spec must say that too.** There is exactly one such
territory: **formatting and markup consistency** — punctuation inside lists, how
entries are separated, heading style, capitalisation convention, spacing. No
critic above owns it, and that is deliberate rather than an oversight.

The first harness run is what settled it. `prose-voice-critic` flagged a bio-list
separator — one document of twelve separates entries with a dash, the rest with a
comma ([`tests/separator-count.mjs`](tests/separator-count.mjs)) — and was wrong
anyway: a separator changes with a template or an editor, and neither is how a
person writes. The exclusion went
into the prompt. Nothing picked the territory up, because a critic reading for
voice is the wrong instrument for it — this is a linter's job, it is
deterministic, and it does not need a language model.

So it is a stated gap, not a covered one. A user who needs formatting enforced
should reach for a formatter. Recorded here because an unrecorded gap is
indistinguishable from an assumption that somebody else has it.

---

## The correction to the original plan

The approved plan said the reviser *"gets the pattern catalog as a prohibition
list."* **That is reversed, and the reversal is load-bearing.**

Prose optimised against a tell list scores zero and reads like nobody wrote it —
which is the failure the catalog exists to *detect*, reproduced by the tool meant
to fix it. Handing the reviser a prohibition list makes it a de-slop machine by
construction.

So: **the reviser's objective is the author's voice card and corpus.** The
catalog reaches it as one diagnostic among five, inside a consolidated edit plan,
never as a quantity to minimise. *"You leaned on this construction four times in
this section"* is useful to a reviser. *"Minimise catalog hits"* is not a writing
goal.

---

## What can finally be tested, and what still cannot

`CONTRIBUTING.md` says there is no unit test for a prompt. For one specific and
important question, that is now false.

The acceptance corpus holds **33 documents the community judged AI-written and 12
that provably predate ChatGPT.** Run a critic across both:

- A critic returning `REVISE` on most of the twelve human documents **manufactures
  nits**, which is the failure mode `CONTRIBUTING.md` names as the one that
  matters and the one people skip.
- A critic returning `CLEAN` on all thirty-three **is decorative**.
- Two critics whose findings mostly coincide are **one critic in two costumes**,
  and the overlap is measurable.

That is a real discrimination measure for prompts, and this repo has never had
one.

**Where it does not reach, measured rather than asserted.** The corpus is
encyclopedia prose, and here is what that costs, per 1000 words:

| per 1000 words | argumentative moves | first person | thesis statements |
|---|---|---|---|
| human (12) | 0.29 | 0.24 | **0** |
| AI (33) | 0.71 | 2.95 | 0.03 |

Reproduce with [`tests/genre-check.mjs`](tests/genre-check.mjs).

**Zero thesis markers in the entire human corpus.** Asking
`prose-adversarial-reader` for the strongest objection to the thesis of a
university article is asking about something that is not there. The same applies
to most of `prose-substance-critic`: an encyclopedia article does not defend a
position, so "this claim is unsupported" has a different meaning in it than in an
essay.

A trap worth naming, because it is exactly the shape of the errors this project
has already made: **first person runs 12.3× higher in the AI set**, which looks
like a strong signal and almost certainly is not.

(This figure has now been wrong twice. First published as 9×, from an ad-hoc
count that averaged per-file rather than pooling and did not strip frontmatter.
Corrected to 14.7× when the script was checked in — and the script was *also*
wrong, matching first person case-sensitively, which silently dropped every
sentence-initial "We" and "Our". A reviewer caught it and predicted 12.3× before
the fix was made; the fix produced 12.3×. The probe is now split, because "I" is
always capitalised in English and "we/our/my" are not. Checking in the method did
not make the first answer right — it made the second answer findable.) The AI corpus includes
talk-page comments and drafts, which are first-person by genre; the human corpus
is pure article namespace. That is a corpus artifact wearing the costume of a
discovery, and it is only visible because the genre difference was checked.

So the honest position: **the corpus bounds the false-positive rate for every
critic and measures true positives for almost none.** Same one-sided evidence
that stopped the markdown-structural checks from flagging, and it constrains
claims here the same way. A critic may ship on "does not fire on human prose"
alone; it may not ship claiming it *finds* things until there is material where
the finding is known to exist.

**Which implies a corpus this bundle does not have.** Argumentative human prose —
essays, criticism, opinion — with the same provenance discipline. Pre-2022
Wikipedia will not supply it. That is a prerequisite for `prose-substance-critic`
and `prose-adversarial-reader` to make any positive claim at all, and it should
be built before they are.

---

## Order of operations

```
  scan          tell-scan, deterministic, no model         (prose-tell-scan)
  critics       spawned in PARALLEL, clean context each
  consolidate   the orchestrating session, not an agent
  → STOP.  v0.1 ends here.  The author edits.
  ─────────────────────────────────────────────
  revise        one mutating pass, from the edit plan      (v0.2+)
  fidelity      before/after, semantic
  verify        tell-scan --baseline; regression check
```

### v0.1 is critics only, and that is a decision rather than a phasing accident

The same logic that put diagnostics before generation in `prose-author` applies
harder here: **a reviser built on critics that manufacture nits will dutifully
rewrite prose to satisfy noise.** The critics have to be shown quiet on human
writing before anything acts on what they say.

There is also a cheaper reason. Findings plus an author is already most of the
value. Findings plus an automatic rewrite is a much larger surface for a much
smaller increment.

### Consolidation is protocol, not an agent

Per `verification-gate`'s precedent, the orchestrating session does this. It
dedupes by span, ranks by severity × confidence, **surfaces critic disagreements
to the author rather than resolving them**, and emits an ordered edit plan.

Disagreement-surfacing is the part to get right. When the voice critic wants a
sentence kept and the substance critic wants it cut, that tension *is* the
finding. A consolidator that silently picks one has destroyed the most useful
thing on the page.

---

## The pile-on problem

Five critics on one draft produce a wall of findings, and a wall of findings is
indistinguishable from "your writing is bad." That reaction ends use of the tool
faster than any false positive.

Three defences, and they are design constraints rather than polish:

1. **Every critic reports its own `CLEAN` explicitly.** Silence from four of five
   is information, and it should be visible.
2. **The consolidated plan is ordered and capped.** Top findings, then a count of
   the rest. An author can ask for everything; they should not be handed it.
3. **`prose-adversarial-reader` makes a forced choice** — the single worst
   sentence, by line number. One concrete thing beats twelve abstract ones, and
   the forced choice prevents the hedging that a "list the problems" prompt
   invites.

---

## Cost

Five subagents per draft is real money and real latency, on something an author
may run repeatedly while editing.

- `prose-medium-critic` is **conditional** — it spawns only when the profile
  declares a `medium`.
- Short or trivial prose should skip the whole protocol, and the protocol should
  say so out loud when it does.
- Critics run in parallel; the wall-clock cost is one critic, not five.

---

## Fidelity, and the rule that the check lands first

`prose-fidelity-critic` compares before and after: claim drift, dropped
qualifications, voice loss, edits outside the plan. `MATERIAL-LOSS` **fails the
run and restores the original.**

It ships **before** the reviser it guards. Over-editing is the primary failure
mode of any rewriter — one that sands off an author's voice has made things worse
while reporting success — and a guard added afterwards is a guard shaped by
whatever the reviser already does.

Ground truth is `git show` where the file is tracked, and a pre-revision copy the
orchestrator makes where it is not.

---

## Open questions

1. **Can a critic legitimately return `CLEAN` on a first draft?** If in practice
   they never do, `CLEAN` is decorative and the verdict set is lying.

2. **What is `AUTHOR-INPUT` for, exactly?** It is meant for findings the critic
   cannot resolve — *is this claim actually true?* The risk is it becomes the
   escape hatch for everything uncertain, which converts a critic into a
   question-generator.

3. **How does `prose-voice-critic` behave with no corpus?** It can flag internal
   inconsistency without one, but not deviation from *your* voice. It must say
   which of the two it is doing, and the honest cold-start answer may be to
   refuse.

4. **Does the reviser see the critics' prose, or only the plan?** The plan alone
   is cleaner and loses the reasoning. The reasoning is also where a critic's
   overconfidence would leak into an edit.

5. **Is `prose-medium-critic` a bundle member at all?** It is the marginal one:
   different trigger, different evidence, conditional spawn. It may want to be its
   own thing.

---

## What would make this a bad bundle

- The reviser gets the catalog as a target, in any form, however hinted.
- Critics ship without being run against the human corpus first.
- Consolidation resolves disagreements instead of surfacing them.
- `CLEAN` is a verdict no critic ever actually returns.
- The reviser ships before the fidelity check.
- Findings arrive as an undifferentiated wall, and the author stops reading.

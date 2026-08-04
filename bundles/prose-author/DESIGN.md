# prose-author — design

**Status: SPEC ONLY. No code, no manifests, nothing installable.** This document
exists to be argued with before anything is built, in the same way the bundle
split was settled before the split happened.

The other bundles in this repo measure prose. This one writes it. That inversion
is the whole risk, and most of what follows is about containing it.

---

## What it is for

Ideas in, a draft in the author's own register out, the author's edits improving
the next draft. That is the loop most people actually want, and nothing in this
repo does it: every primitive so far operates on prose that already exists.

## Why it is dangerous, stated first

Everything else here produces a number that can be checked. This produces prose,
and prose that is *plausible* is the failure mode — it reads fine, it is not the
author, and no test can tell the difference by looking at the output alone.

Three specific ways it goes wrong, and the design decision each one forces:

**1. It optimises against the tell catalog and produces sanded-down nothing.**
Prose written to minimise catalog hits scores zero and reads like no one wrote
it. This is Goodhart, and this repo already committed to the rule: *the catalog
is a diagnostic, never a target.* → **The drafter never sees the catalog while
drafting.** It sees the author's voice card and exemplars. The catalog runs
afterwards, on the output, as a report.

**2. It regresses to a generic competent voice and calls it the author's.**
"Sounds human" is not the goal; "sounds like this person" is. A generic
well-edited register is itself a fingerprint. → **The tool never claims the
output sounds like the author.** It reports the measured distance between the
draft and the author's own bands, and the author decides.

**3. Its own output leaks into the corpus and the corpus drifts toward the
model.** Each round the bands move a little toward machine norms, the scanner
goes progressively blind, and nothing in the output announces it. → **The corpus
rules from `PROFILES.md` are load-bearing here**, and stricter than they were
when only calibration read them.

---

## Shape

| | |
|---|---|
| **kind** | `author` |
| **surface** | `skill` — it ships scripts (diffing, exemplar selection, verification) and per `CONTRIBUTING.md` anything with a deterministic component belongs behind a skill |
| **bundle** | its own. Someone who wants a drafter does not necessarily want six critics, and `prose-review` does not exist yet |
| **shares** | the `<project>/.claude/humanizer/` contract in [`PROFILES.md`](../prose-tell-scan/PROFILES.md) — read, extended, owned by nobody |

`CONTRIBUTING.md`'s rules for `kind: author` map onto this almost word for word:

> *Read the project's existing conventions first and match them; introducing a
> new framework, naming scheme, or assertion style is a finding, not a feature.
> State how the output was verified.*

Here "the project's conventions" are **the author's voice**, and "state how the
output was verified" is a real obligation, not a formality — see *Verification*
below.

---

## The loop

```
  1  intake      register resolved per the existing Phase 0 rules
  2  ground      voice.md + N exemplars from corpus/human for that register
  3  draft       the author's material, their voice card, their exemplars.
                 NO CATALOG.
  4  measure     tell-scan the draft against the author's DERIVED bands
  5  report      where the draft sits relative to the author's own range
  6  the author edits — this is the step that matters
  7  ingest      optionally keep the edited draft, with edit fraction measured
```

Steps 4–5 are what make this an `author` primitive rather than a text generator:
it says how the output was verified, in the author's own measured terms.

### Step 3 in detail: what the drafter is given

- The author's material — notes, outline, argument, whatever they brought.
- `voice.md` for the register.
- Exemplars from `corpus/human/`, selected for register and length, whole rather
  than excerpted. A paragraph out of context teaches the wrong thing.
- The register's *purpose*, from `profile.json`.

And what it is **not** given: `catalog.json`. Not as a prohibition list, not as
"avoid these words", not in any form. That is decided, not open.

### Step 5 in detail: what the report says

Never *"this sounds like you."* Instead, per metric, the draft's value against
the author's measured band:

```
  cadence
    sentence-length CV   0.38    your essays: 0.41 – 0.62      BELOW your range
    mean length        24.1 w    your essays: 17.2 – 23.4 w    slightly long
    longest uniform run     7    your essays: ≤ 5              above
  catalog density
    severity 2          0.31/1k  your essays: ≤ 0.44/1k        within
  tells present
    `underscore` ×3 — you use this 0.2×/1k; this draft is 1.4×/1k
```

Everything is *relative to the author*. There is no absolute "good". A draft
outside the author's range is not wrong — it may be the author writing something
new — but they should be told, because that is the one thing they cannot see by
reading their own draft.

---

## Verification, and what it is allowed to claim

`kind: author` must state how output was verified. Three things are checkable and
that is exactly what gets claimed:

1. **The draft was scanned** by `tell-scan` against this author's profile.
2. **Its cadence and density were compared** to the author's derived bands.
3. **Any Tier A artifact is a hard failure** — a draft containing leaked markup or
   a chatbot preamble is returned, not reported.

What is **not** claimed, ever:

- that the draft sounds like the author
- that the draft is good
- that the draft would pass any detector

The first is unmeasurable, the second is not the tool's business, and the third
is a claim this repo refuses on principle everywhere else.

### The cold-start refusal

**With no calibrated corpus, the drafter refuses to report a gap.** It may still
draft — a voice card alone is better than nothing — but the comparison step says
so plainly rather than comparing against `_base` fallbacks. Bands nobody measured
are this repo's guesses about a generic register, and *"sounds like you"* checked
against them silently means *"sounds like our fallback."*

That makes the ordering constraint real rather than advisory:

> **corpus → calibration → generation.**

---

## Feeding edits back

The decided approach: **weight by measured edit fraction.**

On ingest of a kept draft:

```yaml
---
source: prose-author draft
date: 2026-08-04
human_authored: false          # never true. It is not.
provenance: model-drafted-human-edited
model: <model id>
original: .originals/<sha256>.txt
edit_fraction: 0.62            # COMPUTED. Never hand-written.
---
```

`edit_fraction` is a word-level diff of the kept file against its stored
original, measured by the tool. It is not a field anyone fills in.

The reason is precedent. `--attest` is a claim nothing can verify, so the design
makes the author state it deliberately. This one *is* verifiable — so it gets
verified, and a number nobody could check does not go in a file that decides
thresholds.

Then, from [`PROFILES.md`](../prose-tell-scan/PROFILES.md), unchanged:

- **Weight = edit fraction**, per sample. Approved untouched ≈ contributes
  nothing; rewritten two-thirds ≈ two-thirds of a human sample.
- **Aggregate cap**, default `0.2`, **clamped below 0.5 in code**. The config
  cannot express a corpus where the model is the majority voice.
- **Zero contribution below the human-corpus floor.** Otherwise the cold-start
  path is: fill the folder with model output, calibrate against model norms on
  day one, never find out.
- **Cadence bands are human-corpus-only.** No weight, no edit fraction, no
  exception. Letting model output define normal rhythm is the disease defining
  health, and circular besides — a generation whose rhythm was right was right
  because it matched the corpus that set the band.
- **Calibration reports human-only and blended bands side by side**, every run.

### The failure this is built to survive

Round after round, the model drafts, the author edits lightly because it is
already close, the edited draft enters the corpus, the bands move a little. The
tool converges on the model's register and reports increasing agreement with the
author's voice the whole way down.

The cap and the cadence firewall bound it. The side-by-side band report makes it
visible. **Voice locks** are the answer to noticing it late: freeze a blend that
works, draft against the frozen one, and `calibrate --compare-lock` shows how far
the corpus has drifted from it since.

---

## Resolved: what the drafter sees from earlier in the piece

The spec first framed this as continuity *versus* self-amplification. That is a
false trade. The risk is not seeing prior context — it is seeing **its own
prose**. Three things were bundled under "previous drafts" and they separate
cleanly:

| what it sees | gives | costs |
|---|---|---|
| its own prior prose | rhythm continuity | direct self-amplification, compounding each round |
| a factual outline of prior sections | terms, claims and coverage already established | nothing stylistic |
| **the author's edits to its draft** | the correction signal | nothing — this is pure human data |

**Decided: never its own prose. Always the author's edits. Plus a structured
outline for content continuity.** Content and style travel on separate channels,
and the only style input is human.

The third row is the one worth naming. When an author rewrites a generated
sentence, that diff is the most concentrated evidence about their voice available
anywhere — better than a corpus sample, because it is a correction *in context*.
It wrote X, they made it Y, and nothing about that is ambiguous.

## Resolved: a corpus that is not internally consistent

Also reframed. This is not a problem to resolve; it is **a fact to report**.

Most people wrote differently five years ago. Averaging two clusters produces
bands that describe neither — wide enough that everything falls "within range",
so the tool goes quiet and looks like it is working. Silent uselessness is the
worst available outcome, because nothing in the output announces it.

**Decided: cluster the corpus on cadence, and when it is multimodal, say so and
ask.**

> Your `essay` corpus has two distinct clusters — 2019–2021 and 2023–present —
> differing mainly in sentence length. Which are you writing as?

No schema change, no automatic resolution, no silently discarded samples. The
author knows which one they meant; the tool only has to notice and ask.

## How it should behave

### Report only the surprises

Default output is **silence plus one line of reassurance**. A tool that prints a
full comparison every run gets skimmed, then ignored — the same outcome as not
having it, after paying for it. Findings appear when something sits outside the
author's measured range; otherwise the report is a single line saying it looked
and found nothing unusual.

Full tables stay available behind a flag, for when someone wants to audit rather
than write.

### "Outside your range" is a question, not a verdict

When a draft leaves the author's bands there are three causes and the tool
**cannot distinguish them**:

1. the draft drifted — the model's voice, not theirs
2. they are deliberately writing something new
3. their corpus is stale or too narrow to describe them any more

Every report of this kind must be phrased as the open question it is. A tool that
says "this doesn't sound like you" when the truth is "you are stretching" teaches
the author to write blandly, which is the failure this whole project exists to
avoid.

### The disagreement is the most valuable event in the system

When the tool says *outside your range* and the author says **"no, that's me"** —
that is a labelled, deliberate extension of their voice, in context, with a
measurement attached. It is better data than any corpus sample, because it is
precisely the case the corpus does not yet cover.

So it needs a first-class affordance, not a shrug. Saying "that's me" should
offer to add the passage to the corpus, and the next calibration should widen the
band that flagged it. The tool learns where it was wrong about someone, which is
the only way its picture of them improves.

## Writing modes, and where each belongs

| mode | what helps | where |
|---|---|---|
| **"is this me?" on your own draft** | **diagnostics only, no generation** | **`prose-tell-scan`** |
| long-form drift — chapter 7 against chapter 1 | diagnostics across sections | `prose-tell-scan` |
| blank page from notes | generation | `prose-author` |
| continuing mid-document | generation + content outline | `prose-author` |
| one passage is not working | scoped generation | `prose-author` |
| cut it by 30% | rewriting | `prose-review` |
| did an editor change my voice? | fidelity diff | `prose-review` |
| essay → email | register transposition | unassigned; may not belong to any of them |

## Build order, and an architectural consequence

**Milestone one is "is this me?", and it does not belong in this bundle.**

It requires no generation. It is the author's draft, scanned against the author's
own derived bands, reported relatively. That is measurement, which is the line the
bundle split was drawn on — so it belongs in `prose-tell-scan`, and putting it
here would blur the boundary the split exists to keep sharp.

It is also nearly free, which is the argument for doing it first. `calibrate.mjs`
already pools every catalog entry's count across the corpus — and then collapses
it into severity-band ceilings, discarding the per-entry rate. The data behind
*"you use `underscore` 0.2×/1k; this draft is 1.4×/1k"* is computed today and
thrown away. Retaining it, plus a relative report mode, is most of the milestone.

Doing it first also makes the corpus valuable **before** any drafting exists,
which matters given the ordering constraint: the corpus has to be worth building
for its own sake, or nobody will build it and generation will forever be checked
against fallbacks.

Then, in this bundle:

| milestone | adds |
|---|---|
| v0.1 | scoped generation — one passage, with the original beside it, easiest to judge |
| v0.2 | blank page from notes; content-outline continuity |
| v0.3 | edit ingestion with measured `edit_fraction`; the correction channel |
| v0.4 | voice locks as a drafting target |

## What would make this a bad primitive

Recorded now, while it is cheap to say:

- It ships with the catalog wired into drafting "just as a hint".
- It claims the output sounds like the author.
- It compares against `_base` when no corpus exists, without saying so.
- Cadence bands get a "small" contribution from approved drafts.
- `edit_fraction` becomes a field someone types.
- The corpus grows faster from its own output than from the author's writing.

Any one of those turns a tool that helps someone write into one that
convincingly writes like a model and tells them it is them.

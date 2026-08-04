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

## Open questions

Genuinely open, not rhetorical.

1. **How many exemplars, and chosen how?** Register and length are obvious. Topic
   similarity is tempting and probably wrong — it would teach the model to
   reproduce old arguments rather than old rhythms.

2. **Does the drafter ever see its own previous drafts of the same piece?** It
   would help continuity across a long document and it is also the most direct
   path to self-amplification.

3. **What happens when the author's corpus is internally inconsistent?** Most
   people write differently across five years. Bands widen, everything falls
   "within range", and the report stops saying anything. A `since:` filter may be
   needed, which is a new schema key and deserves its own argument.

4. **Is the drafting step an agent or inline?** It needs no adversarial context
   isolation — nothing here is checking anyone's work. Inline is simpler. An
   agent buys a clean context, which matters if the author's material is long.

5. **Does a Tier A artifact in a draft mean the draft is discarded or repaired?**
   Discarding is cleaner and wastes work. Repairing means a rewrite step, and the
   whole bundle boundary exists to keep rewriting away from the catalog.

---

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

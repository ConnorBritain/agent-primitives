# Voice critic — cross-author substitution

**Pre-registered before dispatch.** Everything below the *Results* heading in
[the run log](../2026-08-05-voice-cross-author-complete.md) was written after; everything
in this file was written before any agent ran, and the design it describes was not changed
once transcripts started arriving. That order is the only thing that stops a tier boundary
from being drawn where it flatters the numbers.

## What this run is for

Every published voice number is a **false-positive bound**. `critic-harness.md` says why:

> *"A negative rate of exactly zero does not distinguish a well-tuned prompt from an
> over-quiet one. Settling that needs a corpus with a planted deviation."*

Cross-author substitution is a planted deviation with perfect ground truth. Corpus of author
X plus a held-out sample of X **must** be `CLEAN`; corpus of X plus a sample by author Y
**must** be `REVISE`, and "by Y" is a fact about provenance rather than a judgement anybody
has to be trusted on. This is the first voice run that can produce a **true-positive rate**.

The corpus was not missing. `human-essays/` has held single-author samples since 2026-08-04
and no harness was pointed at them.

## The design

Six authors clear the corpus's 15-sample floor (`node tests/corpus/stats.mjs` in
`prose-tell-scan`). Each contributes **one probe sample** and a **10-sample corpus** that
excludes it. The full 6x6 matrix is covered: 6 same-author cells on the diagonal, 30
cross-author cells off it.

```
    author      register        era    cohesion      avail  corpus words   probe words
    bacon       essay           1625   independent      58         6819         1145
    chesterton  essay           1909   independent      39        14470         1198
    chopin      narration       1899   one-novel        38        11276         1186
    ohenry      narration       1906   independent      25        21096         1261
    chekhov     correspondence  1890s  independent     113         7583         1214
    doctorow    blog            2026   independent      20        28122         1446
```

### Register is the confound, and it is the whole difficulty

Bacon against O. Henry differs in author, in register and in three centuries. A `REVISE`
there may be detecting *seventeenth-century aphoristic essay vs. American magazine story*
and say nothing about persons. The project has been burned by exactly this shape before:
first person runs 12.3x higher in the AI corpus than the human one and looked like signal
until `genre-check.mjs` showed it was talk-page comments.

So every ordered pair is tiered by **what varies besides the author**, and the tiers are
reported separately. **A single pooled cross-author number is not reported at all**, because
it would hide the one thing that makes this run worth running.

| tier | what varies | pairs | k | dispatches |
|---|---|---|---|---|
| **N** | nothing — same author, held-out sample | 6 | 3 | 18 |
| **A1** | author + work-cohesion (same register, 7 years apart) | 2 | 3 | 6 |
| **A2** | author + era (same register, same cohesion, 284 years apart) | 2 | 3 | 6 |
| **B** | author + register | 26 | 1 | 26 |

**Neither A tier is clean, and they are dirty in different directions.** That is the argument
for running both instead of picking one.

- **A1** is Chopin against O. Henry: 1899 and 1906 American fiction, register and decade
  matched. But Chopin's 38 samples are 38 consecutive chapters of *one novel* and O. Henry's
  25 are independent stories, so a Chopin corpus is unusually cohesive — shared characters,
  one setting, one arc. A `REVISE` there is partly explained by *different book*.
- **A2** is Bacon against Chesterton: both are sets of short independent essays on unrelated
  subjects, so subject-continuity cannot carry a verdict. What it has instead is 284 years.

If A1 and A2 agree, the explanation they share is the author, because their other confounds
do not overlap. If they disagree, the run has found which confound is doing the work.

**A1 has two ordered pairs and A2 has two.** That is not a sampling choice — it is the number
of register-matched author pairs this corpus contains, and it is the ceiling on how strong a
claim this run can make. Any statement here about *persons* rests on 4 cells and 12 draws.

### The draft is held constant down each column

Each author contributes exactly one probe, and that same probe is the draft for its own
negative cell and for every positive cell where it is the intruder. So when a verdict changes
between two cases, **the corpus is what changed**. Without this, "that Chekhov letter is just
an odd one" is an unfalsifiable alternative explanation for every result in its column.

Probe length is matched too — the sample nearest 1,200 words for each author — because a
400-word letter offers a critic less to find than a 2,500-word blog post, and unmatched
lengths would make the verdict partly a function of draft size.

### Replication, because verdicts are not deterministic

P12: two dispatches of a byte-identical prompt returned different verdicts on the same span
earlier today. Every cell carrying a headline number is dispatched **k=3 from one prompt
file**, and disagreement is reported as a finding rather than resolved by majority vote.
Tier-B cells are **single draws** and are labelled as such everywhere they appear; they are
breadth, not evidence about any one pair.

### What this design cannot support

- **No claim about a modern individual writer.** Five of six authors are dead and out of
  copyright, and four wrote before 1910. The product goal is P6b and this is not it.
- **Corpus size is fixed at 10 samples but not at 10,000 words** — Doctorow's corpus is 4.1x
  Bacon's. Equalising words means truncating prose, and truncated prose is not the author's.
  Direction of the resulting bias is not predicted here and not measured.
- **26 of the 30 cross-author cells are one draw each.** No cell-level claim is available from
  them; only the aggregate, with its interval unmeasured.
- **Register and cohesion are asserted from the source, not measured.** A reader who rejects
  "Bacon and Chesterton are the same register" should reclassify A2 into B, not keep it.

## Deviations from `run-harness.mjs prepare voice`, and why

`voiceFixtures()` is hardcoded to the Wikipedia `corpus/{human,ai}` directories and cannot
express "corpus of X, draft by Y". `run-harness.mjs` is owned by another track this wave and
was not edited. So staging is reimplemented in
[`prepare-cross-author.mjs`](prepare-cross-author.mjs), with three consequences worth naming:

1. **The two integrity primitives are imported, not copied.** `stripFrontmatter` and
   `leakCheck` come from `run-harness.mjs`, so a run staged here cannot be laxer than one
   staged there.
2. **The prompt text is duplicated**, because `buildPrompt` is not exported.
   [`assert-prompt-shape.mjs`](assert-prompt-shape.mjs) runs the real harness into a throwaway
   directory and diffs every non-case-specific line; it exits non-zero on drift.
3. **Staged corpus files are renamed `sample-NN.txt`.** The harness stages `corpus/${original}`,
   and the originals here are `ohenry-the-gift-of-the-magi.txt` and
   `chopin-005-the-awakening-chapter-v.txt`. The first invites the critic to answer from
   having read O. Henry rather than from the ten samples in front of it. The second is worse:
   a corpus visibly made of chapters 1, 5, 9 ... of one novel tells the critic a same-author
   draft is a missing chapter, and it can return `CLEAN` by arithmetic. The mapping is in
   `MANIFEST.json`, which the critic never sees.

**One deviation could not be fixed from this track.** `run-harness.mjs` and `verify-run.mjs`
both hardcode the voice profile's positive label as `AI-labelled draft` / `positive (AI
drafts, n=X)`. These positives are **cross-author human drafts, not AI drafts**. Every
positive transcript carries a note saying so, and the run log repeats it, but the heading
wording is the tool's and could not be corrected here.

## Reproducing

```bash
cd bundles/prose-review
node tests/runs/2026-08-05-voice-cross-author/prepare-cross-author.mjs      # stage
node tests/runs/2026-08-05-voice-cross-author/assert-prompt-shape.mjs       # prompts match the harness
node tests/runs/2026-08-05-voice-cross-author/tally.mjs                     # per-tier + agreement
node tests/run-harness.mjs check runs/2026-08-05-voice-cross-author
node tests/verify-run.mjs runs/2026-08-05-voice-cross-author
```

`inputs/` is ~4 MB of public-domain text duplicated 36 times. It is byte-regenerable from the
committed script, and `MANIFEST.json` carries a sha256 of every staged file, so it is a
candidate for `.gitignore` rather than for the history.

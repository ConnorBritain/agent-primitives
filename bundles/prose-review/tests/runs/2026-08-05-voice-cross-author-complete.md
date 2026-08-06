# Run log — 2026-08-05, `prose-voice-critic`, cross-author substitution

**56 draws over 36 cells. Every cell landed on its ground truth.** That is the kind of
result this repo's own incident log says to distrust, so most of what follows is the
interrogation rather than the number.

The design was pre-registered in [`2026-08-05-voice-cross-author/README.md`](2026-08-05-voice-cross-author/README.md)
before any agent ran, including the tier boundaries and which cells would carry k=3. Nothing
below changed it.

**What this run is.** The first voice run with ground truth. Every published voice number is
a false-positive bound, because leave-one-out over many-editor Wikipedia articles has nothing
to be right or wrong about. Corpus of author X plus a held-out sample of X must be `CLEAN`;
corpus of X plus a sample by Y must be `REVISE`, and "by Y" is provenance, not judgement.
`critic-harness.md` names the missing piece exactly — *"a corpus with a planted deviation"* —
and cross-author substitution is one, with perfect labels. The corpus for it has been sitting
in `human-essays/` since 2026-08-04.

**Model and prompt.** All 56 dispatches ran on `opus`, one clean-context subagent per draw,
against `prose-voice-critic/agent.md` at sha256 `590ea74d2e55...`. Two dispatches (cases 35
and 36) failed on the session's 20-agent concurrency cap and were re-sent; **no verdict was
seen before either re-send**, so nothing was re-run selectively.

---

## Results

Quoted from `node tests/runs/2026-08-05-voice-cross-author/tally.mjs`:

```

  2026-08-05-voice-cross-author — 56 draws over 36 cells
  critic prompt sha256 590ea74d2e55

  BY TIER — these are not pooled, and pooling them is the error this run exists to avoid

    tier what it holds constant                                      cells  draws  as expected
    N    same author, held-out sample — nothing varies               6      18     18 of 18
    A1   cross-author, register + decade held (work-cohesion varies) 2      6      6 of 6
    A2   cross-author, register + cohesion held (era varies)         2      6      6 of 6
    B    cross-author, register also varies                          26     26     26 of 26

  REPLICATION — cells dispatched k>1 from ONE prompt file (P12: verdicts are not deterministic)

    n-chesterton              N   CLEAN CLEAN CLEAN     unanimous   findings 0/0/0
    p-ohenry-x-chopin         A1  REVISE REVISE REVISE  unanimous   findings 5/6/6
    n-ohenry                  N   CLEAN CLEAN CLEAN     unanimous   findings 0/0/0
    p-chesterton-x-bacon      A2  REVISE REVISE REVISE  unanimous   findings 7/6/6
    n-chekhov                 N   CLEAN CLEAN CLEAN     unanimous   findings 0/0/0
    n-chopin                  N   CLEAN CLEAN CLEAN     unanimous   findings 0/0/0
    p-chopin-x-ohenry         A1  REVISE REVISE REVISE  unanimous   findings 6/5/6
    n-bacon                   N   CLEAN CLEAN CLEAN     unanimous   findings 0/0/0
    n-doctorow                N   CLEAN CLEAN CLEAN     unanimous   findings 0/0/0
    p-bacon-x-chesterton      A2  REVISE REVISE REVISE  unanimous   findings 6/7/9

    10 of 10 replicated cells unanimous; 0 split
    26 tier-B draws are SINGLE DRAWS and carry no agreement figure at all

  WHAT THIS BOUNDS — one-sided 95% Clopper-Pearson, zero errors observed

    false positives — same-author drafts wrongly flagged
      by cell (quote this):  error rate <= 39.3%   (n=6 independent cells)
      by draw (do not):      error rate <= 15.3%   (n=18 draws, k of which share a prompt)
    false negatives — register-matched intruders missed
      by cell (quote this):  error rate <= 52.7%   (n=4 independent cells)
      by draw (do not):      error rate <= 22.1%   (n=12 draws, k of which share a prompt)

  FINDINGS COUNT — re-derived here with a wider pattern than run-harness.mjs uses

    p-chesterton-x-bacon-r3       RESULT says findings=0, transcript contains 6

  THE MATRIX — rows are the corpus author, columns the draft's author
  `.` expected CLEAN and got it; `R` expected REVISE and got it; `!` disagrees with ground truth

    corpus \ draft  bacon   cheste  chopin  ohenry  chekho  doctor  
    bacon           .x3     Rx3     R       R       R       R       
    chesterton      Rx3     .x3     R       R       R       R       
    chopin          R       R       .x3     Rx3     R       R       
    ohenry          R       R       Rx3     .x3     R       R       
    chekhov         R       R       R       R       .x3     R       
    doctorow        R       R       R       R       R       .x3     
```

`node tests/verify-run.mjs runs/2026-08-05-voice-cross-author`:

```

  tests/runs/2026-08-05-voice-cross-author — 56 transcripts

    negative (leave-one-out, n=18):   0 REVISE, 18 CLEAN
    positive (AI drafts, n=38):        38 REVISE, 0 CLEAN
    findings without corpus citation: 0          <- must be 0
    any claim about machine authorship: 0        <- must be 0
```

`node tests/run-harness.mjs check runs/2026-08-05-voice-cross-author`:

```

  bundles/prose-review/tests/runs/2026-08-05-voice-cross-author — 56 transcripts

    reproduced byte-for-byte from the transcript body: 56 of 56
```

### The two labels in that output that are wrong, and could not be fixed here

`verify-run.mjs`'s voice profile hardcodes `positive (AI drafts, n=X)`, and
`run-harness.mjs` hardcodes the heading phrase `AI-labelled draft`. **None of these 38
positives is an AI draft.** Every one is a human sample by a different author than the
corpus. Both files were owned by another track during this wave and were not edited; every
positive transcript carries a note saying so. This needs a fix before the run is cited —
either a third `phrase`/`labels` entry for cross-author positives, or a per-run override.

---

## What the numbers do and do not support

### They do support: the critic is not over-quiet

This is the question `critic-harness.md` said was open.

> *"A negative rate of exactly zero does not distinguish a well-tuned prompt from an
> over-quiet one."*

It now does. The same prompt that returns `CLEAN` on 18 of 18 held-out same-author drafts
returns `REVISE` on 38 of 38 substitutions, **and the negatives are not quiet by accident**:
the 18 clean draws produced 0 findings between them while the 38 flagged draws produced 210.
The prompt is not tuned to silence. It is tuned to a distinction, and it made the
distinction on every cell of a 6x6 matrix.

### They do support: a true-positive rate, at the register-matched tier

4 of 4 cells and 12 of 12 draws, all unanimous. Zero errors on 4 independent cells bounds the
miss rate at **<= 52.7%** one-sided 95%. That is a weak bound and it is the real one: four
cells is four cells. The draw-level bound of 22.1% is printed by `tally.mjs` next to an
instruction not to quote it, because three draws of one cell share a prompt, a corpus and a
draft and are not independent trials.

### They do NOT support: that tier A2 measured a person

**This is the most important thing in the run, and it is only visible by reading the
transcripts.** Across all six A2 draws — Bacon against Chesterton, the pair with register and
work-cohesion held — the findings are dominated by period markers:

| finding, A2 | what it actually separates |
|---|---|
| archaic third-person inflection (`doth`, `changeth`, `giveth`, `breedeth`) | 1625 from 1909 |
| `thou / thee / thy / thine / didst` as second-person address | 1625 from 1909 |
| untranslated Latin tags carrying the argument | 1625 from 1909 |
| contracted negation and do-support (`didn't`) | 1909 from 1625 |

Every one of those would separate *any* Jacobean text from *any* Edwardian one. The pair was
tiered A2 in advance precisely because era was its known confound, and the transcripts show
the confound is doing most of the work. **A2's 6 of 6 is not evidence that the critic
recognises a person.** It is evidence that it recognises a century, which is a register
difference wearing a different hat.

### They DO support, and this is the run's actual finding: tier A1 fired on authorial habit

A1 is Chopin against O. Henry — 1899 and 1906, same register, no era gap worth naming. Its
pre-registered confound was work-cohesion: Chopin's corpus is 38 chapters of one novel, so
"different book" was the alternative explanation on the table before dispatch.

**The transcripts do not use it.** Not one of the twelve A1 findings cites a shared
character, a shared setting, or narrative continuity. What they cite instead is narratorial
technique, and the two directions are mirror images of each other:

- *O. Henry corpus, Chopin draft*: "no second-person address, no 'let us', no narratorial
  aside to the reader" — cited against ten samples with eleven quoted instances, including
  *"While she swiftly makes ready, let us discreetly face the other way and gossip."*
- *Chopin corpus, O. Henry draft*: "The narrator addresses the reader directly with a
  generalized 'you,' placing a second person inside the scene."
- *O. Henry corpus, Chopin draft*: "Every character in the draft speaks the same educated
  standard English"; *Chopin corpus, O. Henry draft*: "Vernacular American commercial-frontier
  slang in dialogue."
- Both directions independently name the ornate-diction habit and get its *direction* right:
  O. Henry's high diction is always cocked at a low target and detonates; Chopin's is sincere.
  One transcript states the rule explicitly — *"This is deliberately not a finding about ornate
  vocabulary as such — the corpus is at least as Latinate, and formal register alone is not
  evidence. The difference is what the high diction is aimed at."*

That last one matters more than the verdict. The prompt's *What is NOT a finding* list names
"formal or ornate register" as excluded, and a critic taking the cheap route would have
flagged Chopin's Latinate vocabulary and been wrong for a reason the prompt warns about. It
declined, said why, and found the person-level distinction underneath.

**So the person-level claim rests on 2 ordered pairs, 6 draws, one author pair.** That is the
whole of it. It is not four cells and it is certainly not 38.

### They do NOT support anything about a modern individual writer

Five of six authors are dead and out of copyright; four wrote before 1910. P6b — the actual
product goal, tuning to *this user's* voice — is untouched by this run.

---

## Threats to validity, in the order they should worry a reader

**1. World knowledge. The critic can recognise these authors, and once did in writing.**
`p-chopin-x-ohenry-r1` names the corpus author twice — *"Chopin's openings place the scene
without..."*. The staged files never say who wrote them; the prose was recognised. This is
the single largest threat to the run: five of six authors are canonical, and a verdict
reachable from having read them is not a verdict reached from the ten staged samples. One
draw of 56 surfaced it in writing; nothing bounds how often it happened silently.

It is not a contract violation — the prompt forbids claims about *machine* authorship, and
this is not one — and `authorship_claims` is correctly 0. But it means **the run's ceiling is
set by the corpus's fame, not by its design**, and the fix is a corpus of writers a model has
not memorised. That is the same corpus P6b needs.

**2. Corpus size is fixed at 10 samples, not at 10,000 words.** Doctorow's corpus is 28,122
words and Bacon's is 6,819 — a 4.1x spread. Equalising by words means truncating prose and
truncated prose is not the author's. The bias direction was not predicted in advance and is
not measured here. Every Doctorow-corpus cell had four times the evidence a Bacon-corpus cell
had.

**3. 26 of 30 cross-author cells are one draw each.** They cover the matrix and prevent
cherry-picking; they support no cell-level claim and carry no agreement figure. `tally.mjs`
prints that sentence itself rather than leaving it to prose.

**4. Register and cohesion are asserted, not measured.** A reader who rejects "Bacon and
Chesterton are the same register" should move A2 into tier B. That would leave the
person-level claim resting on A1 alone — 2 cells — which is close to where the transcripts
put it anyway.

**5. Zero splits across 10 replicated cells is itself only 10 cells.** P12 is real; this run
did not reproduce it. Ten unanimous cells is evidence that the *easy* cells are stable, and
these were all easy — every one landed on ground truth. It says nothing about stability near
a boundary, which is where P12 found its split, and this design contains no boundary cases.

---

## Defects found in the tooling

**`run-harness.mjs` under-counts findings when a critic numbers them inline.** It derives the
findings count from bare `**LOCATION**` markers. `p-chesterton-x-bacon-r3` writes
`**1. LOCATION**` ... `**6. LOCATION**`, so its `RESULT` line says `findings=0` over a
transcript containing six. The transcript is published uncorrected — editing a transcript so
a count comes out is the failure the harness exists to prevent — and `tally.mjs` re-derives
it with a wider pattern and prints the disagreement. `check` passes because it re-derives with
the *same* narrow pattern, so a round-trip cannot catch this class on its own.

**`p-ohenry-x-chopin-r3` omits the `**CORPUS EVIDENCE**` label on finding 5.** The evidence is
present and cited — five `sample-NN` quotations inside the `WHAT` block — so `uncited=0` is a
judgement about substance. Recorded because a contract label going quietly missing is how a
contract stops meaning anything, and `critic-harness.md` already logs one of these
(`CONFIDENCE: low-medium`).

**`voiceFixtures()` cannot express a cross-author run.** It is hardcoded to
`prose-tell-scan/tests/corpus/{human,ai}`. Staging had to be reimplemented in
`prepare-cross-author.mjs`, importing `stripFrontmatter` and `leakCheck` from the harness so
it cannot be laxer, and `assert-prompt-shape.mjs` diffs the duplicated prompt against the
harness's own on every run. If cross-author becomes a standing harness mode, this belongs in
`run-harness.mjs` as a third fixture function, not in a run directory.

**Staged filenames leaked more than the harness's convention allows.** `prepare voice` stages
`corpus/${original-filename}`. Here that would have been
`chopin-005-the-awakening-chapter-v.txt` — a corpus visibly made of chapters 1, 5, 9 ... of one
novel tells the critic that a same-author draft is a missing chapter, and it can answer by
arithmetic. Staged names are `sample-NN.txt` for that reason. The harness's own voice mode has
the milder version of this problem today.

---

## What should happen next

1. **Fix the `AI drafts` / `AI-labelled draft` labels** before this run is cited anywhere.
2. **Do not quote a pooled cross-author number.** The three tiers answer three different
   questions and `tally.mjs` refuses to pool them.
3. **The next corpus addition should be a writer the model has not memorised.** Author fame is
   now the binding constraint on this test, ahead of sample count and ahead of pair count.
4. **A boundary case is missing.** Every cell here is far from the decision boundary. A same-
   author draft from a different decade of the author's life, or a pastiche, would test the
   thing that actually matters and is where P12's variance lives.

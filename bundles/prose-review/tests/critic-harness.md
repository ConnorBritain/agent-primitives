# Measuring a critic

`CONTRIBUTING.md` says there is no unit test for a prompt. For one question there
now is, and it is the question that decides whether a critic is worth running:
**does it stay quiet on writing that is fine?**

This file is the protocol. It is run by hand, and its results go in the PR —
the same standard the repo already applies to every primitive's positive and
negative test.

---

## The negative test: leave-one-out

The acceptance corpus in `prose-tell-scan` holds 12 documents that provably
predate ChatGPT. They are stylistically homogeneous — Wikipedia articles about
universities, one register, one genre.

> Give the critic **11 of them as the corpus** and the **12th as the draft**.
> Rotate through all twelve.

A voice critic that returns `REVISE` on a document drawn from the same corpus it
was given is manufacturing nits. There is no voice difference to find: the draft
*is* the register.

| result | reading |
|---|---|
| 0–2 `REVISE` of 12 | acceptable. Some genuine variation exists between articles |
| 3–5 of 12 | the prompt is too eager. Tighten before shipping |
| 6+ of 12 | broken. It is describing ordinary variation as deviation |

**These thresholds are guesses and are labelled as such.** Nothing derived them.
The deterministic scanner next door holds itself to 0 of 12 and reports a 95%
interval on the same corpus; this has neither. Two of twelve is 17%, and the only
argument for it is that these are twelve articles by different Wikipedia editors,
so *some* genuine variation must exist — which argues the number should not be
zero, not that it should be two.

Treat the bands as a provisional default in exactly the sense this repo's
investigator rule requires: **say which of your outputs are measurements and
which are defaults.** These are defaults. The first real run is what should
replace them.

**This is the test that matters**, and it is the one that gets skipped. A critic
firing on everything is noise, and noise gets ignored — the same outcome as not
having it, after paying for it.

## The positive test

Give the critic the same 11 human documents as the corpus, and one of the 33
AI-labelled documents as the draft.

A critic that returns `CLEAN` on all of them is decorative. But note what this
does **not** establish: the AI documents differ from the human ones in genre as
well as authorship — several are talk-page comments and drafts rather than
articles. A critic may be detecting *namespace* rather than voice.

So the positive result is weak evidence and must be reported as such. **The
negative result is the strong one.**

## The overlap test, once a second critic exists

Run two critics on the same drafts and compare which spans they flag.

Substantial overlap means one critic in two costumes, and `AGENTS.md` is explicit
about why that is worse than it sounds: *"two primitives with overlapping scope
make each other weaker, because each assumes the other has it covered."*

## What the harness tests is register, not authorship

Noticed independently by two critics on their first run, and it is a limitation of
the corpus rather than of them:

> *"the 11 corpus files are Wikipedia articles, each the accretion of many
> editors' hands over years, not one person's idiolect."*

Leave-one-out over collaborative documents measures whether a draft matches a
**register** — encyclopedic prose about universities — not whether it matches a
**person**. The critic is built for the second question and is being tested on
the first.

That does not invalidate the test. A critic that cannot stay quiet on twelve
documents from one tight register will certainly not stay quiet on one author,
and false positives are what this measures. But it caps what a good score means:
**passing shows the prompt is not trigger-happy; it does not show the prompt can
recognise a person.**

The second thing needs a single author's corpus with the same provenance
discipline, and this project does not have one. Until it does, a passing score
should be quoted with this sentence attached.

## What this harness cannot do

**It cannot measure the critics that need arguments.** Per 1000 words the human
corpus carries 0.3 argumentative moves and **zero thesis statements**. Asking
`prose-adversarial-reader` for the strongest objection to a university article's
thesis is asking about something that is not there, and `prose-substance-critic`'s
"this claim is unsupported" means something different in an encyclopedia entry
than in an essay.

Those two critics need argumentative human prose with the same provenance
discipline, and that corpus does not exist yet. Until it does, they may ship on
"does not fire on human prose" and may not claim they *find* things.

**And a trap, recorded because it is the shape of five earlier errors here.**
First person runs 12.3× higher in the AI corpus than the human one
(`node tests/genre-check.mjs` re-derives it). That looks like
a strong signal and almost certainly is not — it is the talk-page comments again.
Before believing any difference this harness surfaces, check whether the two
corpora differ in genre on that dimension. They usually do.

## Runs

Each execution is logged under [`runs/`](runs/). This file stays the protocol;
the logs carry the narration, because they grow and it should not.

| run | negative | positive | uncited | authorship claims |
|---|---|---|---|---|
| [2026-08-04](runs/2026-08-04-prose-voice-critic.md) — prose-voice-critic | 0 REVISE / 6 (after one fix) | 2 REVISE / 2 | 0 | 0 |

Coverage was 6 of 12 negatives and 2 of 33 positives. The run found one false
positive, on formatting rather than voice, and the prompt was corrected; the log
has the detail and the reasoning.

## Recording a run

In the PR, for each critic:

```
negative (leave-one-out, n=12):   N REVISE, M CLEAN
positive (AI drafts, n=X):        N REVISE, M CLEAN
findings without corpus citation: N          <- must be 0
any claim about machine authorship: N        <- must be 0
```

The last two are contract violations rather than quality measures, and either
being non-zero blocks the primitive regardless of how well it scores.

**Keep the raw output.** Save each critic's verbatim report under
`runs/<date>/<draft>.md`. The two contract counts are assertions about text
nobody else can see, and a summary table is the reporter grading their own
transcript. This was added after a reviewer pointed out that every *specific*
number in the first run checked out and the two counts that mattered most still
could not be checked by anyone.

**Read the transcripts for contract drift, not just for the verdict.** In the
first run one finding came back `CONFIDENCE: low-medium`, where the prompt
specifies `high | low`. Harmless in itself, invisible in the summary, and exactly
the kind of quiet widening that makes "low findings are reported only if a high
one is nearby" stop meaning anything. A transcript makes it findable; a table
does not.

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
First person runs 9× higher in the AI corpus than the human one. That looks like
a strong signal and almost certainly is not — it is the talk-page comments again.
Before believing any difference this harness surfaces, check whether the two
corpora differ in genre on that dimension. They usually do.

## Run 2026-08-04 — prose-voice-critic, first execution

### Negative (leave-one-out), n=6 of 12

| draft | verdict | findings | uncited | authorship claims |
|---|---|---|---|---|
| university-of-ibadan | CLEAN | 0 | 0 | 0 |
| makerere-university | CLEAN | 0 | 0 | 0 |
| obafemi-awolowo-university | CLEAN | 0 | 0 | 0 |
| jawaharlal-nehru-university | CLEAN | 0 | 0 | 0 |
| ahmadu-bello-university | CLEAN | 0 | 0 | 0 |
| kenyatta-university | **REVISE** → CLEAN after fix | 1 → 0 | 0 | 0 |

**1 of 6 before the fix, 0 of 6 after.** Both contract checks clean throughout:
zero uncited findings, zero claims about machine authorship.

**Six of twelve, not twelve.** The remaining six were not run. The rate is inside
the provisional band either way, and it is a sample, not the full test.

**Five of those six ran against the pre-fix prompt.** They were not re-run,
because the fix only *adds* an exclusion — it can make the critic quieter and
cannot make it louder, so a CLEAN under the old prompt is still CLEAN under the
new one. Only the document that changed verdict was re-run.

### What the run found — and this is why the harness exists

The single `REVISE` was a **bio-list separator**: the draft used ` - ` between a
name and its description, the corpus used `, `. The citation was spot-checked
rather than trusted:

```
kenyatta-university      37 dash-separated,  2 comma-separated
ahmadu-bello-university   0 dash-separated, 77 comma-separated
university-of-lagos       0 dash-separated, 93 comma-separated
```

**The critic was right about the fact and wrong that the fact was about voice.**
A list separator is markup. It changes with a template, an editor, a tool — none
of which is how a person writes.

That is a scope defect, and the prompt now excludes formatting explicitly, with a
test it can apply to itself: *read the prose aloud in your head; if the thing you
noticed does not survive being read aloud, drop it however well you can count
it.* The re-run returned `CLEAN` and cited that rule by name.

Worth noting what made this cheap: the citation requirement made a wrong finding
**checkable in thirty seconds**. A critic that had said "this doesn't sound like
you" without evidence would have been unfalsifiable and would have shipped.

### Positive (AI-labelled drafts), n=2

| draft | verdict | findings | uncited | authorship claims |
|---|---|---|---|---|
| caligomos-art | REVISE | 4 | 0 | 0 |
| socio-cognitive-engineering | REVISE | 7 | 0 | 0 |

**2 of 2 REVISE.** So the prompt is not decorative: it separates the two halves of
the corpus rather than returning `CLEAN` on everything.

Both runs held the contract under the condition designed to break it. These
documents come from the AI-labelled half, and **neither report said so** — no
claim, no hint, not even a hedge. The refusal survives contact with a draft that
invites it.

Both also declined findings on their own: caligomos excluded two broken sentences
as "a different critic's job," socio-cognitive excluded domain jargon as topic
rather than voice. Exclusive scope is being honoured without supervision.

### Spot-check of the positive findings

Every citation checked resolved exactly:

```
                            human corpus    draft
"Note that"                        0          1
"cf."                              0          2
"Correspondingly"                  0          1
First,/Second,/Third,/Fourth,      0          7
colon-definition list entries      0          5   (caligomos)
```

The most demanding claim was the most precise. The critic wrote: *"Zero
narrator-voice instances of we/our across all 12 samples. The one 'We are...'
sits inside an attributed direct quotation."* The corpus contains exactly one
`we`:

> *"My Lord, this is no ordinary occasion. We are watching to-day the birth of a
> new..."* — Harcourt Butler, 1915, quoted in `banaras-hindu-university.txt`

One instance, quoted, attributed, correctly distinguished from narration.

One check appeared to fail and did not: `^First,` returned zero in the draft.
**The anchor was wrong, not the claim** — the critic said sentence-openers inside
continuous prose, not line-initial. Recorded because it is the spot-check's own
failure mode: a sloppy verification of a sound finding reads exactly like a sound
verification of a fabricated one.

### The trap fired, and the harness had already named it

The strongest positive finding — first-person narration — sits on the **exact
dimension `genre-check.mjs` flags as confounded**: first person runs 14.7× higher
in the AI half because that half contains talk-page comments.

This particular draft is an article, not a talk page, and an encyclopedia article
narrating as "we are working towards" is a real register break. But it is a break
from *encyclopedic register*, not from a person. That is the corpus limitation
recorded above, showing up in a specific finding instead of a caveat.

Which is the argument for keeping the trap-detector next to the harness: it
predicted this finding before the run, and the finding still looks compelling
without it.

### What three critics noticed that the harness had not

Unprompted, in three of six runs: the corpus is Wikipedia articles by many
editors, not one person's idiolect. That limitation is now recorded above, and it
caps what a passing score means.

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

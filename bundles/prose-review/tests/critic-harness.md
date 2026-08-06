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

## A second protocol, for critics that have ground truth

Everything above is shaped by one fact: **voice has no ground truth**, so the
harness can bound a false-positive rate and little else. `prose-fidelity-critic`
is the first critic here where that is false — the original is sitting right
there, and every finding is checkable by anyone. It gets a different protocol,
and a stronger one.

Fixtures live in [`fixtures/fidelity/`](fixtures/fidelity/): an original/revision
pair per case, with the expected verdict in `fixtures.json`.

**`original.md` is a byte-identical copy of a corpus file, and `selftest.mjs`
enforces that.** An original the fixture author may edit is an original they can
tune until a case passes, and the harness then measures nothing. Only the
revision is synthesised.

### The four classes, which are the whole design

A fidelity critic reads a deterministic scan. The risk specific to that shape is
that it becomes an expensive wrapper around a regex, so fixtures are classified
by how the critic's verdict must relate to the scanner's:

| class | scan says | critic must say | what it tests |
|---|---|---|---|
| **A** | `FAITHFUL` | `FAITHFUL` | it does not manufacture nits |
| **B** | `MATERIAL-LOSS` | `FAITHFUL` | it clears an over-flag, with a reason |
| **C** | `MATERIAL-LOSS` | `MATERIAL-LOSS` | it names *which* loss matters |
| **D** | `FAITHFUL` | `MATERIAL-LOSS` | it catches what the scan is blind to |

**B and D are the entire argument for the critic existing.** A critic that never
disagrees with the scanner should be deleted and replaced with the scanner.
`selftest.mjs` fails if either class empties out.

So the number to beat is not "all of them" — it is the **echo baseline**, the
score a critic gets by parroting the scan. `verify-run.mjs` computes it from the
fixture files, alongside the two disagreement directions. Quote the block whole,
including anything printed under it:

```
    verdicts matching the fixture's expected verdict:  9 of 13
    losses the scan flagged and the critic cleared:    1
    losses the scan missed and the critic caught:      6
    verdicts identical to fidelity-scan's (echo rate): 6 of 13
```

That block is the **S4 run** (`runs/2026-08-05-fidelity-s4`), taken after the five
scanner defects were closed. The earlier run's block is in its own log and reads
`12 of 13` against an echo baseline of `8 of 13` — **do not diff the two.** The
scanner, the dispatcher and the draw all differ between them, and the S4 log runs a
controlled experiment instead of subtracting.

**The echo baseline moves when the scanner is fixed**, which is worth pausing on: a
fixture's class is a property of the *pair and the scanner*, not of the revision. When
P3(a) was closed, `n-beauty-modernised` stopped being an over-flag and moved from
class B to class A without a byte of its revision changing. So a class is not evidence
that survives a tool change, and every harness number must be re-derived after one.

**A class-B fixture must be an UNARGUABLE over-flag**, and this is not obvious
until you get it wrong. The prompt's tie-break rule — *"when you cannot tell
whether a loss matters, it matters"* — means a borderline resolves to
`MATERIAL-LOSS` by design. A borderline authored as class B is therefore a
fixture testing against the spec rather than against the critic, and it will fail
for the right reason. One such fixture is kept in the set, uncorrected, as the
worked example.

### Recording a fidelity run

```
negative (faithful revisions, n=X):   N MATERIAL-LOSS, M FAITHFUL
positive (lossy revisions, n=X):      N MATERIAL-LOSS, M FAITHFUL
findings not quoting both original and revision: N   <- must be 0
claims an atom is present that the scan flagged: N   <- must be 0
```

The last two are contract violations rather than quality measures, same as the
voice critic's pair, and either being non-zero blocks the primitive. The second
one is the fidelity-specific rule: **the scan is authoritative on presence.** A
critic disputing it files that under *Scanner defects*, as a tool bug, and may
not fold it into a finding.

Transcript basenames must match fixture directory names, because `verify-run.mjs`
resolves each transcript to its pair and re-derives the scan verdict itself. A
self-reported disagreement rate would be the reporter grading their own
transcript one level up.

### Two things this protocol got wrong the first time

**The answer leaked into the input.** Every `revision.md` carried
`expect: FAITHFUL` in its frontmatter — in a file the critic is required to read.
Six transcripts were discarded. A subagent noticed and said so; nothing in the
repo would have. `selftest.mjs` now fails if any fixture frontmatter names a
verdict, and the harness prompt forbids reading `fixtures.json`.

**A fixture's expected verdict was wrong, and the critic found it.** See
[`runs/2026-08-05-fidelity-complete.md`](runs/2026-08-05-fidelity-complete.md).
Correcting it is legitimate — the correction is externally checkable — but a
score computed against an answer the run itself supplied has to say so. Fixtures
carry `corrected_after_run`, and `verify-run.mjs` prints the caveat, because a
caveat that lives only in prose is the eleventh entry in `CALIBRATION.md` waiting
to happen.

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
discipline. **That existed from 2026-08-04 and nobody pointed the harness at it
until 2026-08-05** — six single authors across four registers were sitting in
`prose-tell-scan/tests/corpus/human-essays/` while this paragraph said they were
missing. See the cross-author run below.

The paragraph above still describes what the *Wikipedia* leave-one-out measures,
and that is still register rather than person. It is no longer the only protocol
here.

## What this harness cannot do

**It cannot measure the critics that need arguments.** Per 1000 words the human
corpus carries 0.3 argumentative moves and **zero thesis statements**. Asking
`prose-adversarial-reader` for the strongest objection to a university article's
thesis is asking about something that is not there, and `prose-substance-critic`'s
"this claim is unsupported" means something different in an encyclopedia entry
than in an essay.

Those two critics need argumentative human prose with the same provenance
discipline. **That corpus now exists** — Bacon and Chesterton are argumentative
essays, Chekhov's longer letters argue, Doctorow's posts are polemic. The
constraint that remains is not material; it is that neither critic has been built.

**And a trap, recorded because it is the shape of five earlier errors here.**
First person runs 12.3× higher in the AI corpus than the human one
(`node tests/genre-check.mjs` re-derives it). That looks like
a strong signal and almost certainly is not — it is the talk-page comments again.
Before believing any difference this harness surfaces, check whether the two
corpora differ in genre on that dimension. They usually do.

## Running one

Both runs above were dispatched by hand — thirteen and sixteen subagents, each
transcript then hand-wrapped with a heading and a `RESULT:` line. That is why
neither has been re-run since, and why a prompt edit silently invalidates the
numbers in the table below. [`run-harness.mjs`](run-harness.mjs) is the fix:

```bash
node tests/run-harness.mjs prepare  fidelity 2026-08-06-fidelity
node tests/run-harness.mjs dispatch runs/2026-08-06-fidelity   # or dispatch by hand
node tests/run-harness.mjs collect  runs/2026-08-06-fidelity   # → verify-run.mjs
```

**What it automates, and the split is the honest part.** `prepare` writes one
identically-shaped prompt per fixture and stages every input the critic may see.
`collect` derives the verdict and the findings count *from the transcript body*
and wraps it. `dispatch` is opt-in and runs nothing unless `CRITIC_CMD` is set or
a `claude` CLI is on PATH — this repo is public and its tests must not need an
API key. Dispatching the generated prompts from a session, one clean-context
agent per prompt, is a first-class path and not a degraded one.

**The two contract counts stay human.** `uncited` and `contradicts_scan` are
counts of what the findings *do*, and they block the primitive when non-zero.
Deriving them from the transcript would be asking the critic whether the critic
complied. `collect` writes `review.json` with every finding quoted for review and
`null` where each count belongs, and refuses to emit a transcript until a person
has replaced the nulls. It never defaults them to 0.

**The integrity rule is now a mechanism, not a sentence in a prompt.** Staged
inputs have their frontmatter stripped — which is where `expect:` leaked the
first time, and where `label: ai` and `human_authored: false` still live in the
voice corpus, skipped in the published run only by instruction. The case is
dispatched as `case-07`, not as `p-tihonov-summarised`, because the `p-` prefix
*is* the answer and the published transcripts carry it. Case ids are ordered by a
hash of the fixture name so the numbering does not restore what the name gave
away. Every staged byte is scanned for verdicts, expectation keys and provenance
labels, and a hit aborts the run before an agent is spent.

**Re-check a published run without re-running it:**

```bash
node tests/run-harness.mjs check runs/2026-08-04-b
```

This round-trips each transcript through the same emitter and fails on a wrapper
that disagrees with its own transcript — a verdict the critic did not write, a
findings count that is not the number of findings, a negative filed as a
positive. Every checked-in run now reproduces byte-for-byte, and CI enforces it.

It did not start that way. `2026-08-05-fidelity` reproduced 12 of 13 the first time
this ran: one transcript was missing the blank line after its `---`, because it was
hand-wrapped by a script written a day apart from the other twelve. That is what
hand-wrapping costs and what having a format buys.

## Runs

Each execution is logged under [`runs/`](runs/). This file stays the protocol;
the logs carry the narration, because they grow and it should not.

| run | negative | positive | uncited | authorship claims |
|---|---|---|---|---|
| [2026-08-04](runs/2026-08-04-prose-voice-critic.md) — partial, two prompt versions | 0 REVISE / 6 (after one fix) | 2 REVISE / 2 | 0 | 0 |
| [2026-08-04b](runs/2026-08-04-b-complete.md) — **full sweep, one prompt version** | **0 REVISE / 12** | 1 REVISE / 4 confound-controlled | 0 | 0 |
| [2026-08-05](runs/2026-08-05-fidelity-complete.md) — `prose-fidelity-critic`, full sweep | **1 MATERIAL-LOSS / 6** | **7 MATERIAL-LOSS / 7** | 0 | 0 |
| [2026-08-05b](runs/2026-08-05-voice-cross-author-complete.md) — `prose-voice-critic`, **cross-author substitution**, k=3 on every headline cell | **0 REVISE / 18** (6 authors × 3 draws) | **12 REVISE / 12** register-matched · 26 REVISE / 26 across-register, single draws | 0 | 0 |
| [2026-08-05-s4](runs/2026-08-05-fidelity-s4-complete.md) — `prose-fidelity-critic`, full sweep **after** the P3 scanner fix | **4 MATERIAL-LOSS / 6** | **7 MATERIAL-LOSS / 7** | 0 | 0 |

**The fidelity critic's negative rate got WORSE when the scanner got better, and
that is published rather than tuned away.** A controlled experiment — the four
disputed negatives, k=3 against the new scan report and k=3 against the old one,
same day, same runner, prompts differing only in the scan block — moved flags from
**1 of 9 draws to 6 of 9**. Every new flag is a claim-drift finding about phrasing.

The mechanism is worth naming because it will recur: closing P3(e) made the scan
disclose *where it is blind*, and the critic went there. Better disclosure bought
more true blind-spot coverage and more false positives on faithful revisions at the
same time, and the experiment cannot separate "the flag list changed" from "the
coverage note was added" because they shipped as one block.

**The second row's positives are cross-author human drafts, not AI drafts** —
`verify-run.mjs`'s column label is the tool's, and it is wrong here. Its 12 of 12
splits into two tiers that must not be pooled: Bacon↔Chesterton fired on archaic
inflection and untranslated Latin, which separates centuries rather than people, and
only Chopin↔O. Henry — **2 cells, 6 draws** — fired on authorial habit with register
and era held. That pair, and not the 38, is what "measured on a person" now means.
Read [the log](runs/2026-08-05-voice-cross-author-complete.md) before quoting either
column.

The fidelity row's positive column means something the two rows above it do not:
those revisions were built with known losses, so `7 of 7` is a true-positive rate
rather than a proxy. Its columns 4 and 5 are `uncited` and `contradicts_scan`.

**Its negative column is `1 of 6`, and that one is kept on purpose.** The critic
flagged a descriptor drop the fixture author considered immaterial. The
expectation was not changed to match, because one fixture in this set already
*was* corrected after the critic disagreed, and correcting a second on a
judgement call would make "the fixture was wrong" unfalsifiable. Read
[the log](runs/2026-08-05-fidelity-complete.md) before quoting either column.

**Read the second row's positive column before quoting the first row's.** The
first run reported 2 of 2 positives caught. Those two drafts differ from the
corpus in genre as well as authorship. Choosing positives with **zero
first-person occurrences** — so a finding cannot come from the dimension
`genre-check.mjs` flags as 12.3× confounded — drops the rate to **1 of 4**.

That is the honest number, and it is not a failure. Three of those four are
machine-written *and* ordinary encyclopedic prose. A voice critic should be
silent on them; flagging them would be authorship detection, which the prompt
refuses and would be bad at. The one that fired had written an interpretive coda
the corpus never uses, and named the construction the author uses instead.

**A negative rate of exactly zero does not distinguish a well-tuned prompt from
an over-quiet one.** Settling that needs a corpus with a planted deviation.

**Settled 2026-08-05.** Cross-author substitution is a planted deviation with
perfect ground truth, and it does not require the author to confirm anything: swap
in a sample by a different writer and the deviation is the whole document. The same
prompt that stays silent on 18 of 18 held-out same-author drafts speaks on 38 of 38
substitutions. **Zero is no longer consistent with over-quiet.**

Read the run log before quoting that, though — most of the 38 is register and era
rather than person, and the run says so at length.

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

**Keep the raw output, and let a script do the counting.** Save each critic's
verbatim report under `runs/<date>/raw/<draft>.md`, then:

```bash
node tests/run-harness.mjs collect runs/<date>    # wraps, validates, calls verify-run
node tests/verify-run.mjs runs/<date>             # or on its own, over wrapped transcripts
```

It re-derives the four numbers from the transcripts and exits non-zero on either
contract violation, or on a transcript with no `RESULT` line — because silently
skipping one understates the denominator, which is the direction that flatters
the result. **Quote its output; do not retype it.** Checking transcripts in fixes
who can see the evidence and does nothing about who did the counting: a summary
can still claim "0 of 12" over a directory that says otherwise. The two contract counts are assertions about text
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

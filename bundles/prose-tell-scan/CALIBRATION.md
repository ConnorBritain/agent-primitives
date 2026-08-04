# Calibration log

Every false positive this scanner has produced on real writing, what caused it,
and what was done about it.

This file exists because **a false positive is data, not a nuisance.** The
temptation with each one is to quietly tighten a regex and move on, which loses
the only empirical record the project has of where its own judgement fails. Six
incidents in, the log is already worth more than any individual fix: four of the
six share one root cause, and that pattern was invisible while they were being
handled one at a time.

It is also the honest counterweight to a catalog that only ever grows. Entries
get added because someone read a source; they get removed or narrowed only
because something like this got written down.

## Distinct from the decision log

Two different records, easy to confuse:

| | Calibration log (this file) | Decision log (`decisions.jsonl`, v1.0) |
|---|---|---|
| About | The catalog's own defects | One author's accept/reject choices |
| Scope | Shared by everyone | Per user, per profile |
| Lives in | The repo | The user's project |
| Fixes | A pattern, for all users | Nothing — it suppresses re-litigation |

A finding you reject because it is not your style goes in the decision log. A
finding that is *wrong for everyone* belongs here.

## How to add an entry

Entries carry a prefix for what kind of miss they record:

- **`FP-`** — the scanner flagged ordinary writing. The original and most common.
- **`FN-`** — the scanner *failed* to flag something it claims to cover. These
  surface by auditing the catalog against its source, not by anything firing, and
  nothing in normal use will ever reveal them.
- **`TP-`** — the scanner was right and the prose was wrong. Rare, and worth
  recording anyway: a log holding only scanner-was-wrong entries trains the reader
  to assume the scanner is the problem.

When the scanner flags something that is ordinary writing:

1. Record it below before fixing it. The write-up is the artifact; the fix is
   incidental.
2. Add a **paired test** in `tools/selftest.mjs` — one asserting the pattern no
   longer fires on the legitimate text, one asserting it still fires on the
   genuine article. A tightening with only the negative test is how a pattern
   gets narrowed into uselessness without anyone noticing.
3. Classify the root cause. If it matches an existing class, say so — recurrence
   is the signal worth having.

## Root-cause classes

- **`density-instability`** — density per 1000 words computed from too few
  occurrences, usually in a short document.
- **`sense-ambiguity`** — the pattern has a figurative and a literal reading and
  matched the literal one.
- **`mention-vs-use`** — the document is discussing the tell rather than
  committing it. **Accepted, not fixed.**
- **`unsourced-pattern`** — the pattern was not in a primary source and should
  not have shipped at the severity it did.

## Incidents

### FP-2026-07-26-a · `announced-insight` · sense-ambiguity

**Flagged:** "it was the best part of joining"
**Should have flagged:** "The best part? You never have to try."

Found in real use, on a draft, by the author — not by the test suite.

The `the best part` branch ended in `part\b\??`, making the question mark
optional. That is worse than a loose pattern: it matched the bare phrase in
*every* case, so it fired reliably on the ordinary-English reading while never
actually requiring the announcing punctuation it was written to detect. The
pattern was inverted, and only real use surfaced it.

**Fix:** require a following `?` or `:` — `part\s*[?:]`. Paired tests added.

**Worth noting:** this entry is `source: recent` — it is one of the patterns with
the weakest provenance in the catalog, traceable to a single Forbes contributor
piece with no dataset. The weakest-sourced patterns producing the field false
positives is not a coincidence, and is an argument for pruning rather than
tightening if it recurs.

### FP-2026-07-26-b · `false-range` · sense-ambiguity

**Flagged:** "From 1995 to 2003, the population doubled." — and every other date
or numeric range.

Inherited from the prototype, which anchored on sentence-initial `From X to Y,`
with no guard against numerals. Ordinary English, matched constantly.

**Fix:** exclude numerals, currency, months, and weekdays on both sides; require
the construction to be sentence-initial or introduced by
everything/ranging/spanning/covering. Paired tests added.

**Unresolved:** later research found this pattern is **not in the canonical
source at all**. It survives on authorial judgement alone, at severity 2 and
contested confidence. If it produces another field false positive, delete it
rather than tightening it again.

### FP-2026-07-26-c · `tricolon` · density-instability

**Flagged:** a single "protocols, rationale, and wiring" in a 433-word
`AGENTS.md`, scoring 2.31/1000 — over the ceiling.

One tricolon is a sentence, not a tic. A rate computed from a single event is
not a rate.

**Fix:** min-count floor — severity 1 needs 3 occurrences, severity 2 needs 2,
severity 3 may fire on one. Near-misses still display, marked `~`, so the floor
suppresses the *flag* and not the *information*.

### FP-2026-07-26-d · `actually` · density-instability

**Flagged:** 2 occurrences in an 887-word README, at 2.25/1000.

Same root cause as FP-c, surfaced in the same run. Two uses of "actually" in a
README is ordinary prose.

**Fix:** covered by the same min-count floor. Also added a short-document notice
below 800 words, since density swings hard on single occurrences at that length
regardless of the floor.

### FP-2026-07-26-e · `transition-overload` · unsourced-pattern

**Flagged:** `docs/wiring.md`, on the word "additionally" appearing inside a
quoted example of what *not* to write.

Diagnosed at the time as `mention-vs-use` and left alone. That diagnosis was
wrong, or at least incomplete. Later research found Wikipedia's editors had
**shipped this pattern, tested it, and demoted it** to their "Ineffective
indicators" section, on the reasoning that conjunction overuse is a byproduct of
essay-like writing that humans and models both produce.

**Fix:** the pattern was **removed entirely**, not tightened, and recorded in
`catalog.json` under `rejected` so it does not come back. Replaced by the
narrower `didactic-disclaimer`.

**The lesson worth keeping:** a false positive was the visible symptom of a
pattern that should never have shipped. Treating it as a tuning problem would
have preserved the defect in a quieter form.

### FP-2026-07-26-f · `delve` · mention-vs-use · ACCEPTED

**Flagged:** this bundle's own README, three times — every instance a sentence
*about* the word "delve" and its decay as a tell.

**Not fixed, and will not be.** Any heuristic narrow enough to catch this (skip
single emphasised words, skip quoted spans) would suppress legitimate emphasis
elsewhere. The scanner cannot distinguish mention from use, the context line
makes it obvious to a reader on sight, and pretending otherwise costs more than
it saves.

This is the dominant false positive in any repository whose documentation
discusses prose, and it is listed under *Known limits* in the README rather than
being engineered around.

### FN-2026-08-03-a · `negative-parallelism`, `model-markup-artifact` · under-matching

**The first entries here that are not false positives.** Both were found by
checking the catalog against its own source page rather than by anything firing.

`negative-parallelism` matched **4 of the 16 examples** the source page marks up
with `{{highlight}}`. The pattern required a pronoun subject *and* one of
`just|merely|simply|only`, so `is not X but Y` could never match. Coverage of the
family is now **11 of 16**: the subject is any negated copula, the intensifier is
optional, `ain't`/`doesn't`/`don't`/`didn't` count as negators, a second branch
takes the bare `not just X — they're Y` form with no copula, and a new
`not-x-but-y` sibling covers the rest. Zero false positives across the repo
corpus. All sixteen are asserted individually in `selftest.mjs`, gaps included.

`model-markup-artifact` hardcoded `U+0007` as the `citeturn0search1`
separator. That is how MediaWiki **stores** the marker; a real paste carries a
Private Use Area codepoint. The entry was matching the wiki *rendering* of the
tell rather than the tell. This is Tier A — the only dialect-neutral tier, and
the only thing `--artifacts-only` retains — so it was the most expensive miss in
the catalog.

**Root cause, shared:** every pattern here was authored *from* the source page and
never tested *against* it. Both fixes have paired tests built from the page's
verbatim examples, so the next edit that narrows either one fails loudly.

The `negative-parallelism` fix carries a caveat worth repeating from its `note`:
relaxing the subject without also requiring **contracted** resumption produced
five hits on this repo's own prose, all legitimate explanatory contrast
("is not a decision, it is a migration"). The contracted-resumption requirement is
fitted to those five observations and is a false-positive guard, not a claim about
English. If it starts costing real detections, widen the pivot punctuation or
prune the entry rather than adding epicycles.

### FN-2026-08-03-c · the whole catalog · apostrophe folding — **the worst defect found so far**

Found by an adversarial review of the fix above, not by the fix. Worth reading in
full, because the mechanism generalises and the first fix hid it.

**Every catalog pattern spelled contractions with an ASCII apostrophe** — `isn't`,
`you're`, `it's`. macOS, iOS, Word, and every LLM chat UI emit **U+2019** by
default. Seven entries were affected, and one of them is Tier A:

> **`chatbot-register` did not match `You’re absolutely right` as actually
> pasted.** The most recognisable chatbot leak there is, in the tier that is meant
> to be dispositive on a single occurrence and is the only thing
> `--artifacts-only` retains, missed on the character it is most likely to arrive
> with.

That quoted phrase is in backticks deliberately, and the reason is a fourth
finding from the same review pass. Written as plain prose it **tripped Tier A in
this file** — `chatbot-register` fires on one occurrence and bypasses density
gating, so a document *describing* the tell gets flagged for *committing* it.

Mention-vs-use is already accepted for style entries; `delve` fires on the README
for the same reason and is listed under *Known limits* rather than engineered
around. **Tier A is different, and the difference is the whole basis for the
tier.** It claims near-zero false positives and dispositive weight on a single
hit, and an accepted false positive there devalues every Tier A finding, not just
this one.

So the rule for this repo, now enforced by adding this file to the FP corpus:
**when documentation quotes a Tier A trigger, mark it as code.** Inline code is
masked before scanning — the same mechanism that stops the scanner reading your
API examples as prose. Fighting it with rewording would have been the worse fix;
the masking layer already existed for exactly this.

**Why the audit that was looking for exactly this missed it.** The paired test for
`FN-2026-08-03-a` was built by retyping the source page's examples — ASCII
apostrophes, spaced em dashes. The fix was then measured against that text and
scored 7 of 9. Against what the page actually says it scored 1 of 9. **The test
had been fitted to the code, so it certified a fix that did not work on real
input,** and the reported improvement was an artifact of the fixture.

That is the failure mode this whole log exists to catch, committed by the log's
own author while writing an entry about rigour.

**Fixed at intake, not per pattern.** `normaliseApostrophes()` folds the
apostrophe family before matching. Seven entries had the bug; the eighth would
have arrived with the next contributor. Two properties make it safe:

- **Offset-preserving** — one UTF-16 code unit to one — so line numbers stay valid
  and findings quote the document *as written*. A tool that echoed normalised
  punctuation back at an author would be rewriting their prose inside its own
  report.
- **Double quotes are deliberately not folded.** `scanFormatting` counts curly
  versus straight to spot paste-assembled documents; folding would silently zero
  that measurement out.

`calibrate.mjs` folds identically. Without that, a corpus written with curly
apostrophes would yield lower densities than the scans it is the baseline for, and
every affected entry would sit under a ceiling derived from a different rule.

**The lasting change is to method, not to a regex.** Test fixtures for
source-derived patterns are now copied byte-for-byte from the source, and
`selftest.mjs` says so where the strings live. Retyping a fixture is how a test
stops being evidence.

### TP-2026-08-03-b · `actually` · a true positive, in this repo's own docs

**Not a false positive.** Recorded because the log's other entries are all
scanner-was-wrong, and a log that only holds those teaches the wrong lesson.

Widening the FP corpus to include bundle-level docs immediately flagged
`PROFILES.md` — four uses of *actually* in 1,796 words, 2.23/1000 against a
ceiling of 2. The file was drafted by a model in the session that wrote it, and
the finding was correct: two uses were load-bearing (claimed-vs-real,
configured-vs-applied) and two were filler. **The prose was fixed, not the
threshold.**

Two things this demonstrates that no synthetic test could:

- The corpus gap was real. Those files sat outside the FP list entirely, and the
  first thing that ran against them found something. (An earlier draft of this
  entry put a number on a thematic-break probe that was never committed —
  unreproducible, so it is withdrawn. The checkable claim is the one above: a
  corpus that excludes the prose most likely to trip a structural check is not a
  corpus, and widening it flagged a real tic on the first pass.)
- `actually` is the entry that motivated this whole primitive — eight occurrences
  a model's self-assessment did not notice. It just did it again, to the same
  author, in a document *about* not doing it. Counting is what scripts are for.

### FN-2026-08-04-a · the whole catalog · first measurement against real AI text

**Until this entry, the test suite had never observed AI-written text.** Both
fixtures are the same human author's draft and revision, so every "detection"
assertion measured draft-versus-revision. The tool could have been measuring
nothing and the suite would still have been green — not hypothetical, since the
apostrophe defect in `FN-2026-08-03-c` did exactly that.

`tests/corpus/` now holds 44 documents, all CC BY-SA 4.0 and pinned to immutable
revision ids:

- **32 AI** — `Wikipedia:Signs of AI writing/Examples/*`. Text the community
  examined and judged AI-written. Not our guess; theirs.
- **12 human** — article revisions predating 2022-11-30, weighted toward Indian,
  Nigerian and Kenyan institutions. Human authorship is a fact about the
  timestamp, not an attestation.

#### The headline numbers, at the tool's own documented operating point

"Several co-occurring is worth a read-through" — two or more flagged categories.
Both corpora scanned under the same profile, because comparing rates across
different threshold sets measures nothing.

| profile | recall (AI flagged) | FPR (human flagged) | Tier A on AI | Tier A on human |
|---|---|---|---|---|
| `technical` | 2/32 = **6%** | 0/12 = **0%** | 8/32 | **0** |
| `essay` | 7/32 = **22%** | 1/12 = 8% | 8/32 | **0** |

95% Wilson interval on the `technical` FPR is 0–24%. Twelve samples cannot
distinguish 0% from 20%, and the suite prints the interval rather than the point
estimate for exactly that reason.

**Two findings, and the second is uncomfortable.**

**Tier A carries the tool.** Leaked markup alone identifies 8 of 32 with zero
false positives, out-performing the entire style catalog (2 of 32 under the
register-appropriate profile). The artifact/style tier split was the right call
and the evidence is stronger than expected.

**Style-catalog recall is low — 6% to 22% depending on register.** That number
belongs in the README. It is not a defect to be tuned away: the catalog is
density-gated, deliberately conservative, and built for an author examining their
own draft rather than a classifier. But anyone reading "catalogued AI writing
tells" will assume better, and the honest framing is that a clean scan means very
little while a Tier A hit means a great deal.

#### Per-entry yield, `technical` profile

Rate = fraction of documents containing the entry at all.

| entry | AI | human | lift |
|---|---|---|---|
| `enhance` | 34% | 0% | **+34** |
| `model-markup-artifact` (Tier A) | 22% | 0% | **+22** |
| `participle-tail` | 19% | 0% | +19 |
| `current-participles` | 19% | 0% | +19 |
| … | | | |
| `deeply-rooted` | 0% | 17% | −17 |
| `renowned` | 3% | 25% | **−22** |
| `tricolon` | 84% | 92% | −7 |

The mid-2025 participial cohort the source page identifies is the strongest
lexical signal in the catalog, which is a real vindication of tracking `era`.

**Eleven entries fire at least as often on provably-human text as on AI text**:
`renowned`, `deeply-rooted`, `nestled`, `groundbreaking`, `foster-abstract`,
`significance-assertion`, `vague-attribution`, `diverse-array`, `fundamentally`,
`actually`, `tricolon`.

**Only one is deleted.** Twelve human documents, all about universities, cannot
justify pruning ten entries — `nestled` and `renowned` firing on articles about
institutions is a register effect, and deleting on n=12 would be overfitting in
the opposite direction from the mistake in `FN-2026-08-03-c`. They are recorded
here and left in place, and the honest fix for an author they hurt is
calibration, not a smaller catalog.

`tricolon` is different, and the log had already written its own rule for it:
*"if it produces a field false positive, delete it rather than tightening."*

It produced two. Not merely *appeared in* — **flagged on** two of the twelve
provably-human documents, including 17 occurrences at 3.09/1000 in the Banaras
Hindu University article. Those are field false positives on text that predates
ChatGPT by construction, which is the condition the rule names.

The appearance rates say why: 84% of AI documents, 92% of human ones. Matching
any three comma-separated words is matching ordinary English, and the rule of
three is real at a level of analysis this catalog cannot reach.

**Deleting it cost one nominal detection** — AI recall went 2/32 → 1/32, because
the entry had pushed one AI document over the two-category threshold. That trade
is worth taking and worth stating plainly: a detection driven by an entry that
fires on nearly every document is not a detection, and keeping it would have
inflated recall while degrading the co-occurrence signal the whole reading
depends on. Recorded under `rejected`.

## What the log says so far

**Four of six false positives trace to two root causes**, both structural rather
than per-pattern:

- `density-instability` (FP-c, FP-d) produced one fix — the min-count floor —
  that resolved both and would have pre-empted others. Handling them
  individually would have meant tightening two unrelated regexes and never
  finding the shared cause.
- `sense-ambiguity` (FP-a, FP-b) is the recurring per-pattern failure, and both
  instances were **patterns with the weakest provenance in the catalog**. Source
  quality predicts field behaviour.

**One incident was not a calibration problem at all** (FP-e). It was a pattern
that should not have existed, and the false positive was the only reason anyone
looked.

**Two of six were found by the test suite; four were found by using the tool.**
That ratio is the argument for the kickoff's advice to run the scanner in anger
before building anything on top of it.

## Open calibration questions

Things the log is not yet large enough to answer:

- ~~Is the severity-1 ceiling right?~~ **Answered.** `genuinely` at 6
  occurrences in 4113 words (1.46/1000) slips under the narration fallback of
  1.5 and does not flag, although the author removed it in their own revision.
  Running the full cold-start path — ingest a corpus, calibrate, rescan — drops
  the ceiling to 0.82 and it flags. The fallback was the problem, not the
  catalog, and no fallback tuning was done: fitting a guess to one fixture is
  how the numbers stop meaning anything. This is the clearest evidence in the
  log that **calibration is the product** and the shipped thresholds are
  scaffolding.
- Does the `tricolon` entry earn its place at all? It is deliberately noisy,
  gated hard, and has yet to produce an actionable finding.
- ~~No incident yet involves a non-native English speaker's writing.~~
  **Partially addressed, not closed.** The self-test now contains an
  ornate-formal-register passage and asserts that it *does* trip the
  `tonal-inflation` and `corporate-register` categories — the bias is measured
  rather than assumed — alongside tests that both mitigations work
  (`--artifacts-only`, and `disable_categories` per profile). See "Dialect and
  register" in the README.

  ~~**Still open, and it is the important half:** no incident here comes from a
  real person's real writing.~~ **CLOSED 2026-08-04 by `FN-2026-08-04-a`.**
  `tests/corpus/human/` holds twelve documents written by real people, in the
  ornate formal register this catalog is documented to over-fire on, provably
  before ChatGPT existed. Measured false-positive rate at the tool's own
  operating point: **0 of 12**, with zero Tier A hits. The 95% interval is
  0–24%, so this is not proof the bias is absent — twelve samples cannot show
  that — but it is a measurement where there was previously only an assertion,
  and it is the population the tool most needed to be checked against.

  What replaces it as the open question: the corpus is all encyclopedia prose
  about institutions. Eleven entries still fire at least as often on it as on the
  AI set (see the yield table), and `renowned`/`nestled` doing so is plausibly a
  register effect rather than a bias effect. Distinguishing those needs ornate
  human prose in a *different* genre.
- ~~Does the `tricolon` entry earn its place?~~ **ANSWERED 2026-08-04: no.**
  84% of AI documents, 92% of human ones. An anti-signal, deleted under the rule
  this log had already written for it.

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

`tests/corpus/` now holds 45 documents, all CC BY-SA 4.0 and pinned to immutable
revision ids:

- **33 AI** — `Wikipedia:Signs of AI writing/Examples/*`. Text the community
  examined and judged AI-written. Not our guess; theirs.
- **12 human** — article revisions predating 2022-11-30, weighted toward Indian,
  Nigerian and Kenyan institutions. Human authorship is a fact about the
  timestamp, not an attestation — and each sample is now verified against its own
  revision's wikitext, for reasons `FN-2026-08-04-b` explains at length.

#### The numbers

At the tool's own documented operating point — "several co-occurring is worth a
read-through", meaning two or more flagged categories. Both corpora under the
same profile, because rates from different threshold sets are not comparable.

| profile | recall (AI flagged) | FPR (human flagged) | Tier A on AI | Tier A on human |
|---|---|---|---|---|
| `technical` | 2/33 = **6%** | 0/12 = **0%** | 8/33 | **0** |
| `essay` | 7/33 = **21%** | 1/12 = 8% | 8/33 | **0** |

95% Wilson interval on the `technical` FPR is 0–24%. Twelve samples cannot
distinguish 0% from 20%, and the suite prints the interval rather than the point
estimate for exactly that reason.

**Two findings, and the second is uncomfortable.**

**Tier A carries the tool.** Leaked markup alone identifies 8 of 33 with zero
false positives, out-performing the entire style catalog (2 of 33 under the
register-appropriate profile). The artifact/style split was the right call and
the evidence is stronger than expected.

**Style-catalog recall is low — 6% to 21% depending on register.** That number
belongs in the README. It is not a defect to be tuned away: the catalog is
density-gated, deliberately conservative, and built for an author examining their
own draft rather than a classifier. But anyone reading "catalogued AI writing
tells" will assume better, and the honest framing is that a clean scan means very
little while a Tier A hit means a great deal.

#### Per-entry yield, `technical` profile

Rate = fraction of documents containing the entry at all.

| entry | AI | human | lift |
|---|---|---|---|
| `enhance` | 33% | 0% | **+33** |
| `model-markup-artifact` (Tier A) | 21% | 0% | **+21** |
| `participle-tail` | 18% | 0% | +18 |
| `current-participles` | 18% | 0% | +18 |
| … | | | |
| `deeply-rooted` | 0% | 17% | −17 |
| `renowned` | 3% | 25% | **−22** |

The mid-2025 participial cohort the source page identifies is the strongest
lexical signal in the catalog, which vindicates tracking `era`.

**Ten entries appear at least as often on human text as on AI text**:
`renowned`, `deeply-rooted`, `nestled`, `groundbreaking`, `foster-abstract`,
`embark-on`, `diverse-array`, `promotional-flattery`, `fundamentally`,
`tricolon`.

**None are deleted**, and the reason is `FN-2026-08-04-b`. Twelve human
documents, all about universities, cannot justify pruning ten entries — `nestled`
and `renowned` firing on institutional articles is plausibly a register effect,
and appearance rate is the wrong statistic to prune on anyway. They are recorded
and left in place. The honest fix for an author they hurt is calibration.

### FN-2026-08-04-b · the corpus was corrupt, and a deletion rested on it

The most instructive entry in this log. Two compounding errors, neither caught by
any test, both found by adversarial review.

**The corpus was not what it said it was.** `prop=extracts&revids=<historical>`
accepts a revision id, returns HTTP 200, echoes that id back — and serves the
extract of the **current** page. Every human sample was vendored that way: 2022
revision metadata in the frontmatter, 2026 article text in the body. The one
property the human corpus existed to guarantee — *provably predates ChatGPT* —
was false in every file, while every manifest looked correct.

Fixed with `action=parse&oldid=`, which genuinely renders the pinned revision.

**The verification added alongside it was itself wrong, in the same way.** It
sampled long words from the prose and required them in the pinned revision's
wikitext; it was fault-injected against one document, passed, and was described
as a proof. Measured across all twelve corrupted samples it caught **two**.
Articles evolve incrementally, so a later version still shares most of its
vocabulary with an earlier one — 80% overlap is what two versions of the same
article look like whether or not one is the wrong version.

What discriminates is vocabulary that is **new**: the tokens present in the
article's *current* wikitext and absent from the pinned revision's. Prose from the
pinned revision cannot contain them; prose from the current page is made of them.

| | fraction of post-revision vocabulary present |
|---|---|
| corrupted samples | 0.111 – 0.720 |
| correct samples | 0.000 – 0.041 |

Threshold 0.05, and the margin is worth stating rather than rounding: the closest
correct sample sits at 0.041 and the closest corrupted one at 0.111. Comfortable,
but not enormous, and a corpus of longer-lived articles would narrow it.

This is defence in depth, not the guarantee. The guarantee is the API call plus
the revid assertion. The check exists because the last thing assumed about an
API's behaviour was wrong. The score is recorded per sample in
`ATTRIBUTION.json` and the acceptance gate asserts every sample carries one.

**`tricolon` was deleted on those numbers, and is restored.** Against the phantom
corpus it looked like an anti-signal — 84% of AI documents, 92% of human — and a
standing rule here says to delete on a field false positive. Re-measured against
the corrected corpus, holding the profile constant so only the entry differs:

| profile | with `tricolon` | without |
|---|---|---|
| `technical` | recall 6%, FPR **0%** | recall 3%, FPR 0% |
| `essay` | recall 21%, FPR 8% | recall 12%, FPR 0% |

At the register-appropriate profile it is **free recall** — it doubles detections
and costs nothing in precision. At `essay` it trades 9 points of recall for 8 of
precision, which is a judgement call rather than a defect. Either way it is a
weak positive signal, not an anti-signal, and deleting it was wrong.

A third error is worth recording because it nearly justified the restoration on
another bad number: the first re-measurement compared `technical` against `_base`
and reported a sevenfold recall difference. Those profiles have different
thresholds. The comparison measured the profile, not the entry.

**What changes as a result.** The standing rule was *"if it produces a field
false positive, delete it rather than tightening."* That rule is now wrong as
written, and this is its amendment: **a field false positive is grounds to
examine an entry, not to delete it. Deletion requires measuring what the deletion
costs.** Halving recall for no precision gain — which is what deleting `tricolon`
did at `technical` — is not a good trade for a tool whose output is explicitly
leads rather than verdicts.

**And the methodological rule, which is the one that generalises.** Three times
now — the retyped fixture in `FN-2026-08-03-c`, the corpus here, the profile
mismatch above — a number was produced by a measurement whose *setup* was wrong
rather than whose arithmetic was. Arithmetic errors announce themselves. Setup
errors produce plausible numbers that survive review until someone re-derives
them independently. Before publishing a figure, state what would have to be true
for it to be meaningless, and check that thing.

### FN-2026-08-04-c · coverage round, with the corpus as the referee

The first catalog change decided by measurement rather than by reading. Six
candidates drawn from source-page sections the catalog under-covered, each scored
against 33 AI documents, 12 provably-human ones, and this repo's own prose before
anything shipped.

**Shipped, two new entries:**

| entry | AI | human | repo |
|---|---|---|---|
| `assistant-preamble` (Tier A) | 2/33 | 0/12 | 0 |
| `notability-canning` | 2/33 | 0/12 | 0 |

Two hits is a low rate. For a style entry that would argue against shipping;
`assistant-preamble` is Tier A, which is judged on whether one occurrence is
dispositive rather than on frequency. A document containing a sentence like
`Would you like me to expand that?` has exactly one explanation.

That example is backticked, and on one line, for a reason worth the aside: written
as plain prose it tripped `assistant-preamble` in this very file, and the Tier A
guard from `FN-2026-08-03-c` failed the build. Inline code is masked before
scanning; a code span broken across a newline is not. `notability-canning` ships at severity
2 and density-gated because it is the source's named *current*-cohort pattern,
and the rest of `current-era` is two weak lexical entries.

**Widened, two existing entries.** `participle-tail` gained the verbs the source's
own box lists and it did not match (ensuring, encompassing, contributing,
cultivating, fostering, enhancing, resonating, symbolising): +2 AI, +0 human.
`vague-attribution` gained the noun-interposed forms — the old alternation
required the verb to follow "some" directly, so "some critics argue" never
matched: +1 AI, +0 human.

**Rejected, two candidates, and the first is the useful one.**

`additionally-initial` was proposed to correct what looked like an
over-generalisation: `transition-overload` was dropped for transition *density*,
while the source page separately lists "Additionally (especially beginning a
sentence)" as its first AI-vocabulary item with two citations. A narrow
sentence-initial form seemed clearly defensible.

It appears in **1 of 33 AI documents and 1 of 12 human ones** — proportionally
commoner in human writing. The original rejection was right for a reason its
author did not have. Recorded so the same reasonable-looking case is not argued a
third time.

`copulative-avoidance` is real as an observation and unusable as a regex. Broad,
it matches 12% of AI documents and 8% of human ones, because encyclopedic prose
says "functions as a" constantly and means it. Narrowed to the distinctive
constructions it matches 0 of 33. There is no gap between the two failure modes.
`serves-as` and `boasts` already cover the variants that discriminate; the rest
needs a parser and belongs with the critics.

**Net effect, gate-verified rather than asserted:** recall 2/33 → 3/33, Tier A
9/33, false positives unchanged at 0/12.

**What the round is really evidence for.** Four of six candidates came from
carefully reading the canonical source, and two of those four would have made the
tool worse. Reading a source tells you a pattern is real; only a corpus tells you
whether a *regex for it* discriminates. Every catalog entry added before this
round was shipped on the first kind of evidence alone.

### FP-2026-08-04-d · Tier A · the tier promised more than it could keep

Found by review, on the round that added `assistant-preamble`. The entry shipped
in Tier A on evidence of 2/33 AI documents and **0/12 human** — and both numbers
were true.

It fires on ordinary business email.

> `Let me know if you need anything else before Friday.`
> `I hope this helps with the planning.`

Both trip it. So does any customer-service reply. And this bundle ships
**`correspondence` as a first-class register**, with its own profile, thresholds
and voice card.

**Why the corpus could not have caught it.** The acceptance corpus is 45
documents of encyclopedic prose. It cannot exercise correspondence at all, so
"0 of 12 human documents" was measuring a place where the failure cannot occur.
*Clean on the corpus you have is not the same as clean* — and this is the fourth
variant of the same lesson in this log, after a retyped fixture, a corpus fetched
from the wrong revision, and a cross-profile comparison.

**The defect was older than the entry.** `chatbot-register` had shipped in Tier A
since v0.1 carrying the same pleasantries — `I hope this helps`, `is there
anything else`, `would you like me to`. The new entry did not introduce the
problem; it made a pre-existing one large enough to see.

#### What Tier A actually means, now stated

Tier A carries `always_flag`, bypasses density gating entirely, and is the one
place the acceptance gate asserts an **absolute** zero false positives on human
text. Only one property earns that:

> **No human writes this in ANY register.**

Leaked citation markup qualifies. Unreplaced `[Your Name]` placeholders qualify.
Knowledge-cutoff hedges qualify. *Being polite in an email* does not, however
machine-like it looks in an encyclopedia article.

So the tier was split on that line:

- **`model-self-identification`** — new, Tier A. `As an AI language model`,
  `I am an AI`, `I do not have personal opinions`. Nobody describes themselves
  this way. Verified dispositive in all four registers.
- **`chatbot-register`** — demoted to severity 3 style, disabled in
  `correspondence`.
- **`assistant-preamble`** — severity 3 style, disabled in `correspondence`.

Disabled per register rather than deleted, because the signal is real where the
entries were aimed: an article that offers to expand its own section still has
one explanation.

#### What it cost, measured

| | before | after |
|---|---|---|
| document recall | 3/33 | **3/33** |
| Tier A documents | 9/33 | **7/33** |
| human false positives | 0/12 | 0/12 |

**No detection was lost.** The two documents that left Tier A still flag, through
the same entries at style tier. The Tier A count fell because two entries were
moved out of a tier they did not qualify for — which is the fix working, not a
regression, and the baseline is updated to record the new truth rather than to
make a red gate green.

#### The general rule

**A tell that is dispositive in one register and unremarkable in another is a
STYLE entry, not an artifact.** Tier A is not "obviously machine-like"; it is
"impossible in human writing". The distinction was blurred from v0.1 and no test
could have found it, because every test asked whether the entry fired on the
registers it was written for.

#### A second thing that review caught, recorded because it is not yet fixed

The coverage round reported `notability-canning` at "2/33 AI documents" and the
`vague-attribution` widening at "+1 AI", under a heading about what shipped. Those
count **raw regex matches**, not documents where the entry actually flags.

Both are severity 2, and `MIN_COUNT` requires two occurrences before a severity-2
entry can flag. Every matching document in the corpus has a count of exactly one.
So through the real pipeline, **`notability-canning` flags 0 of 33 and the
`vague-attribution` widening added 0 flagged documents.**

Nothing is wrong with shipping them — a pattern that matches cleanly and never
yet clears its floor is a reasonable thing to carry, and both are 0/12 on human
text. What was wrong is presenting the figures beside `assistant-preamble`'s
genuinely-flagging 2/33 with no distinction drawn, so a reader takes both as
equivalent evidence of detection. Only one was.

The honest labels: those two are **clean, not yet proven**. The distinction to
carry forward is that "matched" and "flagged" are different measurements, and the
one that describes what the tool does is the second.

### FN-2026-08-04-e · counter-evidence · what the source claims, and what measured

The scanner only ever accumulated evidence FOR a tell, which is a structural bias
toward flagging: a document could only look worse the longer you scanned it. The
source page has a **§Signs of human writing** and nothing here read it.

Its §Syntax lists five classes whose *low* rate supposedly marks a machine. All
five were measured against the acceptance corpus — 33 documents the community
judged AI-written, 12 provably predating ChatGPT.

| metric | AUC | best single-threshold accuracy | verdict |
|---|---|---|---|
| `superlative` | 0.77 | 84% | weak, direction matches |
| `copula` | 0.73 | 78% | weak, direction matches |
| `wordy` | 0.73 | 84% | weak, direction matches |
| `plainverb` | 0.56 | 71% | noise |
| `stiffverb` | 0.49 | 71% | coin flip |
| `hedge` | **0.45** | 71% | **backwards** — commoner in the AI set |

Always guessing "AI" scores 73% on this corpus, so two of the six do not beat the
null and `hedge` runs the wrong way.

**Three are not computed at all.** Not inverted, not reported with a caveat —
absent. A coin-flip number in the output invites someone to act on it, and
`hedge` would actively mislead.

**Three are reported and never flagged**, for two reasons that each suffice. AUC
0.73–0.77 on twelve human documents carries a wide interval — bootstrap lower
bounds sit around 0.57–0.62, so the signal is real but small. And the accuracy column is *fitted*: each threshold was chosen on the
same 45 documents it was scored against, so those figures are optimistic by
construction. Shipping a threshold on that basis is the overfitting this project
has already committed twice. Every rate prints its AUC beside it so the number
cannot be quoted without its weakness.

**One thing is dispositive, and it is not a rate.** The source is unusually firm:
text predating 2022-11-30 cannot have used ChatGPT. Resolution is frontmatter →
the commit that *added* the file → mtime, and mtime is reported while being
explicitly disqualified, since it is set by whatever last touched the file. When
age is dispositive it **replaces the reading** rather than appending to it: a 2019
document with elevated `delve` density has an interesting vocabulary, not a
provenance problem.

#### Two rules that are structural rather than advisory

**Never subtract.** Counter-evidence has its own block, its own render section,
and is never arithmetic on the findings. A combined number would be read as a
verdict within a week, which is what `meta.yaml` refuses by contract. A test
asserts no key matching score/net/combined/likelihood/probability exists anywhere
in the block.

**The asymmetry.** Plain forms may count as counter-evidence for a human author.
Stiff forms are *never* evidence of AI. `utilised`, `authored`, `commenced` are
ordinary professional register in several varieties of English, and a metric
treating them as suspicious would be the ornate-register bias again under a new
name. `stiffverb` is absent rather than inverted, and would stay absent even if
it measured well.

#### What this round is evidence for

Five of six patterns drawn from the canonical source failed to survive contact
with a corpus, and the one with the strongest intuitive appeal — hedging language
as a human marker — measured backwards. That is the same result as
`FN-2026-08-04-c`, on different material: reading a source tells you a pattern is
real; only a corpus tells you whether a measurement of it discriminates.

### FP-2026-08-04-f · counter-evidence · three ways to switch the scanner off

The measurements in `FN-2026-08-04-e` re-derived almost exactly under independent
review — the first round in this project where they did. The *implementation*
around them had three defects, all in the one feature that can override
everything else.

**1. Ordinary prose defeated the dispositive check.** The frontmatter regex
anchored on the opening `---` and never required the date to appear before the
closing one. So a document with normal frontmatter lacking a `date:` key, whose
body happened to contain a date-shaped string —

> The filing date: 2015-06-01 was noted in the register.

— had that read as its frontmatter, and a document saturated with flagged tells
reported *"AI use can be ruled out"*. Not an attack: ordinary writing.

**2. A self-reported date was treated as evidence.** `resolveAge` checked
frontmatter *first* and marked it `evidential: true`, identically to git — while
the code's own comment said frontmatter is "a claim the author makes" and git
"records". Adding one line of YAML to any document silenced the scanner reading
it. The caveat existed only in a source comment no user would ever see, which is
precisely the overstatement `AGENTS.md` calls the most damaging error available.

The trust model is now explicit, and it is about **claims versus records**:

| source | what it is | dispositive? |
|---|---|---|
| git first-add commit | a record made outside the document | **yes** |
| frontmatter + git agreeing | a claim the record corroborates | **yes** |
| frontmatter alone | a claim the document makes about itself | reported, never |
| filesystem mtime | whatever last touched the file | reported, not evidence |

Frontmatter alone stays visible — an author scanning their own draft knows
whether their own date is honest, and the tool should not pretend the information
is absent. It just does not get to silence findings on a self-report. The output
says what would change that: commit the file.

**3. `--artifacts-only` violated its own contract.** Its help text — unchanged
since v0.1 — promises to skip every style judgement. Cadence was correctly gated;
the new syntax rates were not, and they are style by this log's own framing. Now
gated. Age still reports, because provenance is a fact about the file rather than
an opinion about the prose.

#### And the one that is worth more than the other three

The git lookup **never worked**. `execFileSync` was never imported, so every call
threw `ReferenceError`, and this swallowed it:

```js
} catch { /* not a repo, or git absent — normal, not an error */ }
```

The comment is true about the failures it was written for and false about the one
it caught. For the entire life of the feature the git path threw instantly and
degraded to the weaker sources — which is *why* frontmatter-alone appeared to
work well enough to ship.

Two separate mistakes made it invisible. The broad `catch` swallowed a
programming error alongside the environmental ones it was for. And a second bug
underneath it — a relative pathspec resolved against a `cwd` set to the file's own
directory — made git return **empty rather than error**, indistinguishable from
"file not tracked".

The catch now rethrows anything that is not a recognised environment failure
(`ENOENT`, or a non-zero exit status). This repo's own rules already name the
pattern: *"no `try/except` or empty `catch` that swallows a failing assertion"*.
A catch broad enough to hide a typo is broad enough to hide a defect for as long
as nobody looks.

### FN-2026-08-04-g · §Citations and §Style · what arithmetic can prove, and what the corpus cannot

Two source-page sections needed code rather than catalog entries. They ship on
opposite terms, and the difference is entirely about what the corpus can witness.

#### Dispositive, and computable offline

| check | AI | human | repo docs |
|---|---|---|---|
| `chatbot-sourced-citation` | 1/33 | 0/12 | 0/10 |
| `invalid-identifier` (ISBN checksum) | 1/33 | 0/12 | 0/10 |

Both are Tier A under the strict test from `FP-2026-08-04-d` — **no human writes
this in any register.** An ISBN that fails its own check digit was invented. A
citation URL carrying `utm_source=chatgpt.com` came out of a chat window.

`utm_source` **cannot be a catalog entry at all.** `maskNonProse` blanks URLs and
link targets before the catalog runs, so the parameter is gone by the time any
pattern could see it. It needs a pass over raw text, which is why this module
takes the unmasked document separately.

One narrow claim, because it is easy to overread: a chatbot-tagged citation
proves the *citation* came from a chatbot, not the prose. Someone can paste a
link from a chat window into hand-written text.

**Effect, gate-verified:** recall 3/33 → 4/33, Tier A 7/33 → 8/33, false
positives unchanged at 0/12.

#### Measured, never flagged — and the reason is the evidence, not modesty

The §Style items — heading-level skips, emoji as formatting, thematic breaks
before headings, inline-header vertical lists — are counted and reported beside
em-dash and bold density. None of them can flag.

**The acceptance corpus is plain text.** Both halves are Wikipedia articles
rendered to prose, so every markdown structure was stripped before the files were
written. Measured against it, all four checks score 0/33 and 0/12 — not because
they are clean, but because there is no markdown in the corpus to find.

What the corpus *can* show is the false-positive side, from this repo's own
documents: `thematic_break_before_heading` fires on two of them. So the evidence
available is one-sided — a measured FP rate and an unmeasurable TP rate.

Shipping a flag on that basis is precisely `FP-2026-08-04-d`, where a Tier A
entry was validated on a corpus that could not exercise the register where it
misfired. Doing it again knowingly would be worse than doing it once by accident.
They become flaggable when a markdown corpus exists to justify a threshold, and
not before.

#### A shape bug worth recording

The first version emitted one finding per OCCURRENCE rather than one per entry
with a count, so a document with eight tagged citations produced eight identical
findings and read as eight separate problems. Every other entry in the catalog
aggregates. A new check that invents its own output shape is a reporting bug
waiting to be quoted.

### FN-2026-08-04-h · calibration · two wrong ways to ask "is this one voice?"

Named corpus groups landed with a check that reports when a corpus contains more
than one voice. The check took three attempts, and the two failures are worth
more than the fix.

**Why the check exists.** Pooling two voices produces bands describing neither —
wide enough that every draft lands "within range", so the tool goes quiet and
*looks like it is working*. Nothing in the output announces it. That is worse
than being wrong.

**Attempt one: difference of means over total spread.** Flagged a single-voice
corpus immediately, and had to: split any sorted data near the middle and the two
halves' means sit about half a range apart. Uniformly distributed values score
0.5 by construction. It was measuring *"was this split near the middle"*, which
is a property of the split, not of the data.

**Attempt two: the gap, in within-cluster standard deviations.** Better idea —
what distinguishes two voices from one wide one is a *void* between them. It
still passed the bad case, and produced separations around 10¹⁰. When a cluster
has near-zero internal variance the denominator collapses, and every gap looks
infinite.

**Attempt three: the gap as a fraction of the typical value**, plus a requirement
that the gap be real (nothing between the clusters). Both conditions rule out a
different wrong answer, and the second one is the interesting half: sentence-length
means of **574 and 588 are perfectly separated and are obviously one voice**.
Without a test that the void *matters*, the check reports a 2% difference with
the same confidence as a 5× one.

#### The fixture was wrong, which is why two bad statistics survived

The "single voice" corpus used to test all this was generated without sentence
boundaries, so every sample's mean sentence length came out as one of two
values — `[574 ×5, 588 ×5]`. It was **accidentally bimodal**, so a check that
flagged it was arguably right, and the failure looked like a threshold problem
rather than a fixture problem.

Both bad statistics passed review against it. Only printing the actual
distribution showed why. That is the fourth time in this log a measurement's
*setup* was the defect rather than its arithmetic, and the first time the setup
in question was a negative test — which is exactly where it is hardest to notice,
because a negative test failing looks like the code being too strict.

The rule this reinforces: **when a check fires on something you believe is
clean, print the data before adjusting the threshold.**

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
- ~~Does the `tricolon` entry earn its place?~~ **ANSWERED 2026-08-04: yes, at
  the register-appropriate profile.** It was deleted and restored the same day —
  see `FN-2026-08-04-b`. Holding the profile constant, it doubles recall at
  `technical` for zero false positives, and trades 9 points of recall for 8 of
  precision at `essay`. A weak positive signal, not the anti-signal the corrupt
  corpus made it look like.

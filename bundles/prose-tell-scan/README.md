# prose-tell-scan

Deterministic measurement of prose: catalogued AI writing tells, and the rhythm
metrics a model cannot reliably estimate about its own output.

**Status: v0.1.** Report-only. Nothing here calls a model and nothing here writes
to your document.

> ### The invariant: the thing that measures does not also rewrite
>
> This bundle ships no transformer, and the reason is Goodhart's, not ethics:
> **when a measure becomes a target, it stops being a measure.** A rewriter
> holding this catalog optimizes against it, and prose optimized against a tell
> list scores zero and reads like nobody wrote it. That is precisely the failure
> the thesis below is about — it is the same mistake as swapping *delve* for
> *explore* and declaring victory, just automated.
>
> So revision lives in the separate `prose-review` bundle, and the catalog
> reaches it as **diagnostic input, never as the objective function.** The target
> there is the author's voice card and corpus; the catalog is one signal
> alongside substance, argument, medium, and fidelity. *"You leaned on
> `underscores` four times in this section"* is useful to a reviser. *"Minimize
> catalog hits"* is not a writing goal, and a reviser given only that produces
> the blandness this whole bundle exists to detect.
>
> **This is not a claim about whether you should draft with a model.** You
> should, if that is how you work — the corpus, register, and voice machinery
> here exists to make that output sound like *you* rather than like a model, and
> that is the more valuable half. It is a claim about one narrow thing: a
> scanner should not be allowed to edit the text it is scoring.
>
> The versioning reason for the split — and the honest note that it is partly a
> projection rather than something observed — is in
> [sizing a bundle](../../CONTRIBUTING.md#sizing-a-bundle). It lives there
> because it is repo policy, not a fact about this bundle, and two copies of a
> policy argument drift the moment either bundle's story changes.

| Ships today | What it is | What it does |
|---|---|---|
| [`skills/tell-scan/`](skills/tell-scan/) | skill | The entry point. Dispatcher-triggered; carries its own tooling and profiles |
| [`commands/tell-scan.md`](commands/tell-scan.md) | command | `/prose-tell-scan:tell-scan <file>`, or `/tell-scan` installed loose |
| [`.../tools/tell-scan.mjs`](skills/tell-scan/tools/tell-scan.mjs) | script | Phase 0 intake + Phase 1 catalog scan and cadence metrics |
| [`.../tools/init.mjs`](skills/tell-scan/tools/init.mjs) | script | Scaffolds a writing project: profiles, corpus dirs, path rules |
| [`.../tools/ingest.mjs`](skills/tell-scan/tools/ingest.mjs) | script | Adds a corpus sample with provenance attached |
| [`.../tools/calibrate.mjs`](skills/tell-scan/tools/calibrate.mjs) | script | Derives a register's thresholds from its human corpus |
| [`tests/selftest.mjs`](tests/selftest.mjs) | script | 71 checks, including the bias and false-positive regressions |
| [`.../profiles/`](skills/tell-scan/profiles/) | data | `_base` catalog + `essay`, `technical`, `narration`, `correspondence` |

**The scripts are an implementation detail.** Nothing here expects a human to
type `node`. The skill invokes them and interprets the JSON; that split — scripts
hold the deterministic logic, the agent orchestrates — is the whole architecture.

## The thesis

Most "humanize my AI writing" tooling is a thesaurus with extra steps. It finds
*delve*, swaps in *explore*, and declares victory. That fails for a reason worth
stating up front:

> **Removing AI tells produces bland prose, not human prose.** The tells are half
> the signal. The other half is the *absence* of what human writing reliably has:
> concrete detail, uneven rhythm, a position actually defended rather than
> surveyed, and a voice that shifts with the subject.

A piece can score zero on every tell detector and still read like nobody wrote
it. The defensive half is what this bundle ships. The offensive half needs
judgement rather than counting, which is exactly why it is a different bundle
with a different release clock.

The second thesis is the one that decides the architecture:

> **Models cannot reliably audit their own tics.** Asked to self-assess a draft
> for AI-isms, a model finds the ones it remembers writing. A `grep` over that
> same draft found *genuinely* six times and *actually* eight — neither of which
> the self-assessment surfaced.

Frequency is a counting problem, and counting is what scripts are for. So
**anything decidable deterministically is decided here**, and the model passes
downstream are reserved for judgement no regex can make. The catalog names the
patterns it deliberately does *not* try to match, under `not_deterministic`.

## Install

### Claude Code — plugin

```
/plugin marketplace add ConnorBritain/agent-primitives
/plugin install prose-tell-scan@agent-primitives
```

Gives you the skill *and* the `/prose-tell-scan:tell-scan` slash command.
(Plugin components are namespaced `/plugin-name:component`.)

### Claude Code — loose files

```bash
./install.sh tell-scan        # → ~/.claude/skills/tell-scan/
./install.sh --project tell-scan
```

The skill is self-contained — tools, profiles, and catalog travel with it — so it
works identically either way, and naming it also installs its command. Loose, the
command is `/tell-scan`; under a plugin it is namespaced
`/prose-tell-scan:tell-scan`, which avoids colliding with your own commands.

The command deliberately delegates to the skill rather than shelling out to a
bundled script through `${CLAUDE_PLUGIN_ROOT}` — that variable only resolves
under a plugin, and depending on it would have made the command plugin-only for
no benefit.

### Other harnesses

See [AGENTS.md](AGENTS.md). Unusually for this repo, almost nothing degrades —
the measurement is a dependency-free Node script, so the numbers are identical
everywhere. What you lose is dispatch.

## Use it

Ask for it in words — "review this draft for AI tells", "does this read like
AI?", "check the rhythm on this" — and the skill's description routes there. No
`CLAUDE.md` rule required; see [wiring/claude-md.md](wiring/claude-md.md) for the
one case that wants one.

Or run `/prose-tell-scan:tell-scan draft.md` under a plugin install.

The skill drives these directly; you should rarely need to:

```bash
cd skills/tell-scan
node tools/tell-scan.mjs draft.md                       # profile resolved automatically
node tools/tell-scan.mjs revised.md --baseline draft.md # did the revision work?
node tools/tell-scan.mjs draft.md --artifacts-only      # Tier A only, no style judgement
node tools/tell-scan.mjs --list-profiles
```

Node ≥ 18, zero dependencies.

## Setting it up for your own writing

Scanning works immediately and prints an UNCALIBRATED banner, which it should.
**The setup that matters is giving it your writing to measure against.**

```bash
cd skills/tell-scan
node tools/init.mjs --project ~/writing         # profiles, corpus dirs, path rules
node tools/ingest.mjs old-post.md --profile essay \
     --source "personal blog" --attest --project ~/writing
node tools/calibrate.mjs essay --project ~/writing --write
```

The middle step is the one that gets skipped and the one that decides whether
this is a tool you keep. **Below 5 usable samples calibration refuses outright;
10 is where it stops calling itself thin.** `--attest` has no default on purpose:
it is a claim you are making, not something the tool can detect, and a wrongly
attested sample drags your thresholds toward AI norms with nothing in the output
to show it.

Reading the output:

- **▲ over threshold** — density above this register's ceiling, with enough
  occurrences to be a rate rather than an accident. Tier A artifacts flag here on
  a single hit.
- **~ over density, too few occurrences** — cleared the ceiling on one or two
  hits. Shown, not hidden, but discount it.
- **· below threshold** — present and unremarkable.

## Two tiers, and the difference matters

**Tier A is artifacts.** Leaked citation markup (`[cite: N]`, `oai_citation:`,
lenticular-bracket DeepSeek refs), chatbot register that escaped into the
document, knowledge-cutoff hedges, unreplaced `[Your Name]` placeholders. Nobody
types these. They are dispositive on one occurrence, so they bypass density
gating entirely.

**Everything else is style, and style only means anything in aggregate.** One
"delve" is an unusual word. One contrast is rhetoric. The source list's own
standard is that "one or two of these words appearing in an edit may be
coincidental, but an edit introducing lots of them, lots of times, is one of the
strongest tells" — so every non-Tier-A entry is judged on density and never on
presence.

Be honest about which tier a new entry belongs to. Style dressed up as an
artifact is how a scanner starts making accusations.

## Dialect and register

**The style catalog encodes one set of writing norms, and they are not
universal.** This is the most serious known defect in the tool, it is measured
rather than asserted, and there are two ways around it.

The exposure is concrete. An ornate formal register — the professional norm in
several varieties of English, including Indian, Nigerian, and Kenyan English —
trips the `tonal-inflation` and `corporate-register` categories repeatedly.
Separately, several teaching traditions explicitly train writers away from
repeating words, which produces the elegant-variation signature directly. The
canonical source raises both concerns and, notably, never works through either:
the guidance you would want here does not exist yet.

The self-test contains a passage in that register and **asserts that it trips the
catalog**, because a tool that cannot demonstrate its own bias cannot claim to
have addressed it. If that test ever starts passing quietly, it has stopped
measuring anything.

Three responses, strongest first:

1. **Calibrate.** This is the structural answer and it is why thresholds are
   derived rather than written. Bands measured from *your* corpus encode *your*
   register, whatever it is. The bias lives almost entirely in the shipped
   fallbacks.
2. **`--artifacts-only`.** Tier A alone — leaked citation markup, chatbot
   register, cutoff hedges, placeholders. Dialect-neutral by construction: no
   variety of English produces `[cite: 3]`. You lose the style half and keep
   everything that is actually universal.
3. **Disable the categories.** In a profile's `catalog.json`:
   ```json
   { "disable_categories": ["tonal-inflation", "corporate-register"] }
   ```
   The rest of the catalog, including all of Tier A, keeps working.

What the tool will not do is pretend the problem is solved. Formal and academic
register is listed under `rejected` in the catalog precisely because treating it
as evidence is the failure mode that hits these writers hardest.

## The calibration target

The canonical source reports that **an expert LLM user who tags ten pages as
AI-generated has probably made one false positive.** Roughly 10% is the realistic
ceiling for human experts working carefully. Any tool claiming better precision
on style alone is overclaiming, this one included. Design accordingly: the output
is leads, and the person reading it knows things the scanner does not.

## Phase 0 — which profile governs this file

Resolved **per file**, not per session, because one session can touch an essay
and a reference doc. First match wins, and the report always says which rule
fired:

1. `--profile <name>`
2. `profile: <name>` in the document's own frontmatter
3. A path rule in `<project>/.claude/humanizer.json`
4. `default` in that same config
5. `_base`, with a warning that nothing matched

```json
{
  "profiles": { "docs/**": "technical", "posts/**": "essay", "scripts/**": "narration" },
  "default": "essay"
}
```

No config file means no path rules. Nothing here is required to run the scanner.

## Phase 1 — what gets measured

**Catalog scan.** Lexical and structural patterns, reported as density per 1000
words with a line number and the surrounding sentence for every hit. Code
blocks, inline code, URLs, link targets, and frontmatter are masked out first —
they are not prose and scanning them is how a tool starts flagging your API
examples.

**Cadence.** Sentence-length mean, standard deviation, coefficient of variation,
and percentile spread; paragraph distribution; repeated three-word sentence
openers; fragment rate; longest run of same-length sentences; em-dash, bold, and
heading density.

Low sentence-length variance *relative to the register baseline* is among the
strongest signals available and costs nothing to compute. The italics are
load-bearing — see below. There is support for weighting structure over
vocabulary: a 2026 study reportedly separated AI from human fiction at 93.2%
macro-F1 using **purely structural features and no lexical ones at all**.
Structure also survives the kind of style-level rewriting that defeats a word
list.

**Em dashes are measured but never flagged**, and the numbers are why. A 2026
measurement puts the human baseline at a mean of 3.23 per 1000 words across a
range of 0.33–17.12 — a fiftyfold spread — while current models have reportedly
moved *below* that mean (GPT-5.4 at 1.43, Gemini 2.5 Flash at 1.28). Only the
aging 4.x generation sits clearly above it. A gate keyed on em dashes today is
likelier to catch an essayist with a dash habit than a model.

> **Both figures above are secondhand and currently uncitable.** They come from
> `catalog.json`'s `sources.recent`, the one source entry with no URL, because
> the survey behind them was not recorded at retrieval time. Treat them as the
> reason a decision was made, not as evidence you can check — and note that the
> surrounding space is mostly SEO marketing for detection tools with invented
> thresholds, which is exactly why the gap matters. Either the citation gets
> found or these sentences should go.
>
> The one number here that *is* first-hand: this repo's own docs run 11–18 em
> dashes per 1000 words, measured directly, comfortably inside the human range
> and comfortably unflagged.

## The profile system

Everything author- and register-specific lives in a swappable profile. The
catalog and the scanning logic are shared; thresholds, allowlist, voice card,
and corpus are not.

[`PROFILES.md`](PROFILES.md) is the full schema, including which files this
bundle reads and which belong to `prose-review`. It matters more than a schema
doc usually does: **no manifest in this repo has a `dependencies` field**, so
that document is the entire composition seam between the two bundles.

The reason is simple: **a rhythmically uniform technical doc is correct, and a
rhythmically uniform essay is a symptom.** "Robust" is filler in marketing copy
and a precise term in statistics. One global configuration has to be wrong for
most of what anyone writes.

```
profiles/
  _base/          catalog.json · thresholds.json · allow.txt      ← shared, inherited
  essay/          profile.json · thresholds.json · allow.txt · voice.md
                  corpus/human/ · corpus/ai/ · thresholds.derived.json (generated)
  technical/  narration/  correspondence/
```

Profiles inherit `_base` and override it. A profile may `disable` a catalog
entry, `adjust` its severity, or add entries of its own — it never gets its own
copy of the catalog, because two copies drift within about two edits.

**Search order** puts your project ahead of the bundle, per profile:

```
--profiles-dir <dir>
<project>/.claude/humanizer/profiles/
<bundle>/profiles/                       ← shipped defaults
```

So keeping a local `essay` does not cost you the shipped `technical`.

### Thresholds are derived, never hand-written

```bash
node tools/calibrate.mjs essay --write
```

A hand-set threshold is somebody's guess at what normal looks like. A derived
one encodes what *your* good writing in *this register* actually looks like,
which is the only baseline that can tell "flat rhythm" apart from "correctly
flat reference doc". Calibration reads the profile's `corpus/human/`, measures
each sample, and writes percentile bands to `thresholds.derived.json`.

**The shipped profiles have empty corpora.** Until you fill them, every profile
uses fallbacks, and `tell-scan` prints an UNCALIBRATED banner on every single
run. That is deliberate and it is not a bug to be quietened.

Two refusals matter more than the happy path:

- **Thin corpus.** Below 5 usable samples, calibration writes nothing and says
  why. Between 5 and 9 it derives provisional bands and labels them thin. Ten is
  the floor for confidence.
- **No provenance, no vote.** Every sample needs `source`, `date`, and
  `human_authored: true`. Samples without it are excluded and listed by name.

That second rule guards against the failure mode that kills a calibrated scanner
slowly: AI-assisted drafts leaking into the human corpus. Thresholds drift toward
AI norms, the scanner goes progressively blind, and **nothing in the output
announces it is happening** — the numbers still look like numbers. Prefer adding
corpus material in its own deliberate commit.

### Allowlist, not blindness

A term in `allow.txt` is invisible to the scanner at **any** frequency. That is
occasionally right — "underscore" in a document about identifier naming — and
usually the wrong tool. When a register legitimately uses a word *more*, raise
that register's density ceiling instead. A ceiling still reports the rate; an
allowlist entry hides it. `profiles/narration/allow.txt` explains the choice
where it comes up.

## Two clocks

`catalog.json` carries its own `version`, and it is **not** the bundle's. That is
the split's premise showing up in a file rather than a doc.

The bundle is code: it changes when the scanner changes. The catalog is a dated
dataset tracking a target that moves adversarially, and it carries two dates
because they mean different things.

- **`generated`** — when entries were first extracted from the source page.
- **`audited`** — when they were last checked *back* against it. A rarer act, and
  the one that found [`FN-2026-08-03-a`](CALIBRATION.md): a pattern can be wrong
  for months without anything firing, because failing to fire is silent.

**What depends on this.** Cadence metrics are pure text statistics — sentence
length variance means the same thing forever. Catalog density is a *count of
entries*, so adding or retuning one silently changes what a per-1000 figure
means. Two density numbers from different catalog versions are two different
rulers, and nothing about the numbers themselves will tell you.

So anything that stores a band records the version beside it. `tell-scan --json`
emits `profile.catalog_version`; `calibrate.mjs` writes `catalog_version` into
`thresholds.derived.json`. Voice locks, when they land, will do the same and will
report their cadence half and their density half with separate confidence — see
[`PROFILES.md`](PROFILES.md#designed-not-yet-built).

## What it will not do

- **It is not an AI detector, and must never be used as one.** No single pattern
  indicates AI authorship; these fire together or they are noise. Detection
  over-fires on non-native English speakers, on academic registers, and on
  anyone trained to write "properly". The output is a set of signals for the
  author to weigh about their own draft. Pointing it at someone else's writing to
  decide whether they wrote it is a misuse the design actively resists — there is
  no score, and there will not be one.
- **It does not judge quality.** A flagged density means a pattern is unusually
  frequent for the register, not that the writing is bad.
- **It will hit some people harder than others, and that is a defect.** The
  documented false-positive populations are non-native English speakers — several
  educational traditions explicitly teach avoiding word repetition, which
  produces the elegant-variation signature directly — along with autistic writers
  and anyone with a formal rhetorical education, both of whom report using
  deliberate parallel construction for decades. Formal or academic register is
  *not* a tell, and the catalog records it under `rejected` so nobody adds it.
  These are not edge cases to be tuned away; they are the reason the output is
  leads rather than verdicts.
- **Patterns expire, and some are already stale.** Catalog entries carry an `era`
  field. The 2023–24 cohort (`delve`, `tapestry`, `testament`) is largely trained
  out; the current cohort is participial — `emphasizing`, `highlighting`,
  `showcasing`, `enhance`. A scanner tuned on the old list over-fires on current
  text. There is also a reflexivity problem no catalog can fix: people stopped
  writing "delve" *because* it reads as AI, which breaks the base rate.
- **It cannot see absence.** Missing concrete detail, an undefended position, a
  voice that never shifts — these are the offensive half and they need a reader.
  Listed in the catalog under `not_deterministic` so the gap is documented
  rather than quietly dropped.
- **Mention versus use.** A document *about* writing that quotes a tell as an
  example gets a hit for it. This is the dominant false positive in a repo whose
  docs discuss prose, and **this file demonstrates it**: scanning this README
  flags `delve`, because the sentence three paragraphs into the thesis quotes
  the word in order to criticise it. `docs/wiring.md` does the same with
  "additionally". The context line makes it obvious on sight, but the scanner
  cannot tell mention from use and does not pretend to. No heuristic is
  attempted, because one narrow enough to catch this case would be wrong
  somewhere else.
- **Short documents.** Below ~800 words, density per 1000 swings hard on single
  occurrences. The scanner says so, and the min-count floor stops the worst of it.

## What it actually catches — measured

Against 45 documents this repo did not write: 33 that the Wikipedia community
examined and judged AI-written, and 12 article revisions from **before ChatGPT
existed**, weighted toward Indian, Nigerian and Kenyan institutions — the ornate
formal register this catalog is most likely to misjudge.

| | AI corpus (n=33) | human corpus (n=12) |
|---|---|---|
| flagged at the documented threshold | **2 (6%)** | **0 (0%)** |
| any Tier A artifact | **8 (24%)** | **0** |

**Read the first row before trusting this tool.** Style-catalog recall is low —
6% here, 21% under the `essay` profile. It misses most text a careful human
reader identifies. That is a consequence of the design rather than a bug to tune
away: everything is density-gated, contested entries are deliberately weak, and
the output is built for an author reviewing their own draft, not for a
classifier. But it means **a clean scan tells you very little.**

**The second row is where the value is.** Leaked markup identifies a quarter of
the AI corpus with zero false positives, out-performing the entire style catalog.
The artifact/style split is the most load-bearing decision in the design, and
this is the evidence for it: a Tier A hit means a great deal, a clean style scan
means almost nothing.

The 0% false-positive rate is the result worth having, and its honest form is
**0–24% (95% CI)**. Twelve documents cannot resolve it further. What it does
establish is that the documented bias against ornate register did not fire on
twelve real examples of it — a measurement where there was previously only a
synthetic passage written by the catalog's own author.

Corpus, provenance and licensing: [`tests/corpus/`](tests/corpus/). It is
CC BY-SA 4.0, not MIT, and pinned to immutable revision ids.

> **The first version of this corpus was silently wrong**, and the way it failed
> is worth knowing before you trust any number here. `prop=extracts` accepts a
> historical revision id, returns success, echoes that id back, and serves the
> **current** article. So every human sample carried 2022 metadata above 2026
> text, and *"provably predates ChatGPT"* was false in every file while every
> manifest looked right. A catalog entry was then deleted on measurements taken
> from it, and restored when the corpus was fixed.
>
> Each sample is now proved against its own revision's wikitext, the proof is
> recorded per sample in `ATTRIBUTION.json`, and the acceptance gate asserts it.
> Full account: [`CALIBRATION.md`](CALIBRATION.md) `FN-2026-08-04-b`.

## Verification

```bash
node tests/selftest.mjs              # everything, including the acceptance gate
node tests/acceptance.mjs --report   # the corpus tables in full
```

Covers the regression fixture, threshold refusals, provenance exclusion, profile
separation, the masking rules, a paired regression for every false positive in
[`CALIBRATION.md`](CALIBRATION.md), and the acceptance corpus above.

The acceptance gate **fails on regression, not on an absolute rate.** At n=12 one
false positive is 8.3% with a 95% interval of 1.5–35%; gating on "under 10%"
would assert a precision the sample cannot support, which is the overclaiming
this catalog warns about, committed by its own tests. The measured numbers live
in `tests/corpus/baseline.json` and the suite fails when they get worse. Raising
a number there to make a run pass is the same act as weakening an assertion.

One absolute gate exists: **zero Tier A hits on provably-human text.** That tier
claims to be dispositive on a single occurrence, so there is no rate to
negotiate — it is zero or the claim is false.

**When the scanner flags legitimate writing, log it there before fixing it.** A
false positive is the only empirical evidence this project gets about where its
own judgement fails, and quietly tightening a regex throws that away. Six
incidents in, four share two structural root causes that were invisible while
each was being handled on its own — and one turned out not to be a tuning problem
at all, but a pattern that should never have shipped.

Every fix needs a **paired test**: one that the legitimate text no longer fires,
one that the genuine article still does. A tightening with only the negative half
is how a pattern gets narrowed into uselessness without anyone noticing. `fixtures/` holds the same author's script
before and after their own edit pass — same content, same length class, known
answer, which makes it a free regression test.

## Roadmap

**This bundle**, whose version tracks the catalog's retrieval date:

| Version | Adds |
|---|---|
| **v0.1** (here) | Phase 0 intake, Phase 1 deterministic scan, profile system, skill + command packaging |
| v0.2 | Catalog audit against the current upstream: Tier A markup gaps, negative-parallelism, the notability cluster, ISBN validation, markdown-structural checks |
| v0.3 | Counter-evidence — the "signs of human writing" half, reported separately and never netted against findings |
| v0.4 | `prose-pattern-critic`, the one reviewer coupled to this catalog: it owns what `not_deterministic` declares undecidable by regex |
| v1.0 | Real AI/human acceptance corpus, FP-rate reporting with intervals, session-end hook |

**The `prose-review` bundle**, separately versioned, ships the five craft
critics, the fidelity check, and the single mutating revise pass. Build order
there is deliberate: **the fidelity check lands before the pass it guards.**
Over-editing is the primary failure mode of any rewriter — one that sands off a
writer's actual voice has made things worse while reporting success.

**`prose-author` is the gap worth naming.** Everything above operates on prose
that already exists. Drafting *from* an author's corpus — ideas in, a draft in
their register out, their edits feeding back — is a `kind: author` primitive that
nothing here covers yet, and it is the half most people actually want.

The substrate is largely built, which is the argument for naming it now rather
than later. This bundle already has the corpus with provenance rules, the
register split, the per-register voice card, and derived bands that say what
"sounds like this author" measures out to. The one addition generation needs is
a second reader of the same corpus: calibration consumes it as **percentile
bands**, and a drafter would consume it as **exemplars**. Same directory, same
attestation requirement, different question asked of it.

Two pieces of that are specified in [`PROFILES.md`](PROFILES.md#designed-not-yet-built)
rather than left to whoever implements it, because the obvious implementation of
each is the broken one:

- **`corpus/approved/`** — model drafts you kept. Weighted by *measured* edit
  fraction under an aggregate cap the config cannot raise past parity, excluded
  from cadence bands entirely, and contributing nothing at all until the human
  corpus clears its own floor. A count-based cap alone does not work: approved
  generations are less varied than human samples twice over, so a fifth of the
  count exerts more than a fifth of the pull, and the bands narrow while the
  report says the author got more consistent.
- **Voice locks** — an immutable, named snapshot of a blend worth keeping, which
  a drafter targets and which drift is measured against. A lock ages at two
  speeds: its cadence half is pure text statistics and survives catalog updates,
  its density half does not, and it reports the two separately rather than
  offering one confidence for both.

Note the ordering constraint that runs through all of it. A drafter checked
against uncalibrated bands is checked against this repo's guesses about a generic
register, not against the author. Corpus, then calibration, then generation —
otherwise "sounds like me" quietly resolves to "sounds like the fallback."

### Known limits of the split

**A clean scan from this bundle certifies nothing about whether the prose is
worth reading.** It measures the presence of tells, and the tells are half the
signal at most. The other half is the *absence* of what human writing reliably
has: concrete detail, uneven rhythm, a position defended rather than surveyed, a
voice that shifts with the subject. A piece can score zero here and still read
like nobody wrote it. That half needs a reader, and it is in the other bundle.

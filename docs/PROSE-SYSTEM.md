# Prose system — plan and state

**Snapshot date:** 2026-08-05. This document is a handoff from one session to
the next, meant to be read by a fresh-context agent before writing any code.
When something in it goes stale, edit it in the same commit as the change.

**Branch:** `prose-review-design` (PR #10 open).
**Suites (all green):** prose-tell-scan 240, prose-author 76, prose-review 103.

---

## 1. What this is

Four bundles that together let a user drive prose with AI without losing their
voice to it.

```
prose-tell-scan  — deterministic measurement (the scanner)
prose-review     — read-only critics (voice, substance, adversarial, fidelity, medium)
prose-author     — scoped generation with edit ingestion
verification-gate — pre-declare-done reviewer agents (used by everything above)
```

The user's stated goal: *"drive on ideas, ai can output, i can edit, and
corpora over time will help tune the engine to produce more 'me'-like prose."*
Every design decision in the prose bundles is about surviving that loop — the
one where the model drafts, the user edits lightly because it's already close,
the edit enters the corpus, the bands move a little, and the tool converges on
the model's register while reporting increasing agreement with the author's
voice the whole way down.

---

## 2. What is built

### prose-tell-scan (shipped, v0.1 plus recent extensions)

The measurement layer. Ships a skill (`tell-scan`) with these tools under
`bundles/prose-tell-scan/skills/tell-scan/tools/`:

- `tell-scan.mjs` — the scanner. Flags: `--profile`, `--baseline`,
  `--relative` (**"is this me?"** — Poisson-based, refuses without a
  calibrated corpus), `--artifacts-only`, `--json`.
- `calibrate.mjs` — derives per-profile thresholds. Now supports blending
  `corpus/approved/` samples under the cap: `--cap N` (default 0.2, clamped
  <0.5 in code). Reports human-only AND blended catalog bands side by side.
  Cadence bands stay human-only, **no exception**.
- `ingest.mjs` — record a new corpus sample.
- `init.mjs` — scaffold a profile.

Key exports (pinned by prose-author's contract test):
`readProvenance`, `corpusFiles`, `MIN_SAMPLE_WORDS = 200`,
`TEXT_EXT`, `DEFAULT_CAP = 0.2`, `CAP_CLAMP = 0.5`.

Test corpus lives at `bundles/prose-tell-scan/tests/corpus/`:
- `human/` — 12 pre-ChatGPT Wikipedia articles (CC-BY-SA)
- `ai/` — 33 Wikipedia:Signs-of-AI-writing/Examples (CC-BY-SA)
- `human-essays/gutenberg/` — essays, letters and narration by Bacon,
  Chesterton, Chekhov, Chopin, O. Henry (public domain). Counts from
  `tests/corpus/stats.mjs`, never hand-copied
- `human-professional/` — EFF Deeplinks (CC-BY 4.0), multi-author by design
- `human-essays/pluralistic/` — 20 recent Cory Doctorow posts (CC-BY 4.0)

### prose-author (v0.1 + v0.3)

The drafter. Skill `prose-draft` with:

- `exemplars.mjs` — picks whole samples for the drafter. Ports rules from
  calibrate.mjs (README exclusion, attestation, word floor, cap clamp). Pinned
  by contract test.
- `verify.mjs` — states what was checked, refuses to compare against fallbacks
  when no corpus exists, RETURNS the draft on Tier A artifacts rather than
  reporting them.
- `ingest-edit.mjs` — writes kept edits with **computed** `edit_fraction`
  (word-level LCS diff) into `corpus/approved/`. `--verify` walks all approved
  samples and re-derives their ef against the stored original, catching drift.

**Prompt** (`SKILL.md`): drafter is denied `catalog.json` in every form. The
verification prompt refuses three claims: sounds-like-you, is-good, would-pass-
a-detector. Prints those refusals so absence is reliably communicated.

### prose-review (shipped: 2 critics, 1 sidecar, harness infrastructure) — v0.2

- `prose-voice-critic` agent (primitive + bundle). Passes 0/12 of 12 human
  Wikipedia articles (leave-one-out), catches 1/4 confound-controlled AI drafts,
  never claims machine authorship in 18 opportunities. Cited findings only.
- `prose-fidelity-critic` agent (primitive + bundle) — **shipped 2026-08-05.**
  Reads `fidelity-scan` output and adjudicates consequence. 1 false positive in 6
  faithful revisions, 7/7 on lossy ones, and it disagrees with the scanner in
  both directions (2 over-flags cleared, 3 blind spots caught) against an echo
  baseline of 8/13. **The first critic here with a true-positive rate rather than
  a false-positive bound**, because fidelity has ground truth and voice does not.
  Read the run log before quoting any of that: one fixture was corrected after
  the critic disagreed, and the *next* disagreement was deliberately carried as a
  false positive rather than corrected — see §3 item 14.
- `tools/fidelity-scan.mjs` — deterministic sidecar. Extracts material atoms
  (numbers, quotes, proper-noun runs, headings) from original; reports which are
  absent from revision. **Authoritative on presence; the critic may not overrule
  it.** Four real defects found by the acceptance run — see §6 item 10.
- `tests/fixtures/fidelity/` — 12 original/revision pairs. Originals are
  byte-identical corpus copies (selftest-enforced, so nobody can tune an
  "original" until a case passes); only revisions are synthesised.
- `tests/critic-harness.md` + `tests/verify-run.mjs` — how a critic prompt gets
  its acceptance harness run and how the counts are re-derived from checked-in
  transcripts (not restated from summary tables). `verify-run.mjs` is now
  critic-aware: verdict vocabularies and contract counts are per-critic, and the
  voice run's output is byte-identical to before the change.
- `tests/genre-check.mjs`, `tests/separator-count.mjs` — reproducible metrics
  cited elsewhere in docs; do not hand-copy their output into prose.

### verification-gate (shipped)

Two reviewer agents used before declaring any non-trivial task done:
- `verification-critic` — reward-hacking and spec drift
- `architecture-reviewer` — boundaries, duplication, dead code, spec fidelity

Run both **in parallel**, in a fresh context, passing them the original task
statement (not a summary). Their verdicts are `SHIP` / `BLOCK` / `SHIP WITH
FIXES`. Do not skip.

---

## 3. Load-bearing decisions — do not relax

Everything below has cost real defects to establish. Each is enforced by tests
or by explicit refusals in code.

1. **The drafter never receives `catalog.json`.** Prose optimised against a
   tell list scores zero and reads like nobody wrote it. Denied inputs are
   listed in `bundles/prose-author/skills/prose-draft/meta.yaml`.
2. **`edit_fraction` is computed, never asserted.** Precedent: `--attest` is
   accepted as a claim because nothing can verify it; ef *can* be verified, so
   it is. Ingest computes on write. `ingest-edit.mjs --verify` re-derives on
   demand.
3. **Cadence bands are human-only, no exception.** A generation whose rhythm
   was right was right *because* it matched the human corpus that set the
   band. Blending in cadence lets the ceiling confirm itself. Tested by
   comparing cap=0 to cap=0.2 — the metrics must be byte-identical.
4. **Approved samples contribute zero below `CORPUS_MINIMUM` human samples.**
   Otherwise the cold-start path is: fill approved/ with model output,
   calibrate against model norms on day one, never notice.
5. **Cap `CAP_CLAMP = 0.5` is enforced in code, not config.** A config that
   can express "the model is 80% of my voice" will eventually be set that way
   by someone who stopped thinking about it.
6. **Voice-critic refuses three claims under any wording:** sounds-like-you,
   is-good, would-pass-a-detector. Tested by asserting every occurrence of
   "sounds like you" in the output sits after "Not claimed" — the phrase
   legitimately appears inside the sentence that disclaims it.
7. **Uncertainty resolves to silence, not adversarial fault-finding.** Voice
   is not a defect with ground truth. The two departures from CONTRIBUTING's
   reviewer conventions (`uncertainty_resolves_to: silence`,
   `adversarial_framing: false`) are recorded in meta.yaml.
8. **A Tier A artifact returns the draft rather than reporting it.** Handing
   one back beside a tidy cadence table invites the author to read the table
   and skim the problem.
9. **With no calibrated corpus, `verify.mjs` reports NO GAP.** Comparing
   against fallback bands and calling it personal would be "confident,
   personal-sounding, and about nobody."
10. **Every mutation-tested guard must have a mutation that fails a real
    test.** A score of 0 is reported as a missing test, not a passing row.
    `bundles/prose-author/tests/mutations.mjs` enforces this and regenerates
    `MUTATIONS.md` — do not hand-edit that table.
11. **The two critics resolve uncertainty in OPPOSITE directions, and neither
    may be "harmonised" into the other.** Voice → silence, because a wrong
    "this doesn't sound like you" teaches an author to write blandly and cannot
    be taken back. Fidelity → `MATERIAL-LOSS`, because a loss waved through
    ships and the original is often gone by the time anyone looks. Recorded in
    both `meta.yaml` files and flagged in the bundle's `AGENTS.md`, because two
    adjacent prompt blocks that contradict each other are exactly what a tidying
    pass destroys.
12. **`fidelity-scan` is authoritative on presence; the critic only on
    consequence.** The critic may not claim a flagged atom is present — disputes
    go under *Scanner defects* as a tool bug report. This is the failure the
    tool's docstring names: a model "sees" the number because the sentence
    sounds right. `contradicts_scan` is a contract count and must be 0.
13. **A critic that reads a deterministic artifact must be shown disagreeing
    with it in both directions.** Otherwise it is an expensive wrapper. The
    fidelity harness reports the echo baseline — the score a parrot gets — next
    to the real one, and `selftest.mjs` fails if either disagreement class drops
    below two fixtures. Applies to `prose-pattern-critic` next.
14. **Exactly one fixture expectation may be corrected because the critic
    disagreed, and only on an externally checkable fact.** `p-death-severus-unnamed`
    was corrected on a point of Roman nomenclature anyone can verify. The very
    next disagreement (`n-rossolimo-island-dropped`, a descriptor drop) was a
    judgement call, and correcting it too would have made "the fixture was wrong"
    unfalsifiable — so it is **carried as a false positive** and the published
    negative rate pays for it. The rule that came out of it: a fixture expecting
    the critic to stay quiet must be an *unarguable* case, because the prompt's
    tie-break rule resolves every borderline the other way by design.

    The subtler bug this guards against is **only re-examining the cases you
    failed.** If a passing fixture is never questioned and a failing one always
    is, the expectations converge on whatever the critic says, one commit at a
    time, with every individual step looking justified.

---

## 4. The corpus, and what each part is for

Two directories, different purposes:

**`bundles/prose-tell-scan/tests/corpus/human/`** — 12 Wikipedia articles,
`ai/` alongside. This is the ACCEPTANCE-TEST corpus: the voice-critic harness
runs leave-one-out on `human/`, the acceptance test on `ai/`. Register is flat
encyclopedic prose written by many editors; the voice-critic run log noticed
unprompted that this measures REGISTER, not authorship.

**`bundles/prose-tell-scan/tests/corpus/human-essays/`** — the SINGLE-AUTHOR
corpus, and the one that matters for voice work. Six authors now clear the
15-sample floor, which is 30 ordered cross-author pairs.

**Do not hand-copy the counts.** Run `node tests/corpus/stats.mjs`, which prints
per-author samples, words and dates, and the single-author/multi-author split per
bucket. It exists because the figures below went stale the first time the corpus
grew, in the same commit that grew it.

Registers covered: argumentative essay (Bacon, Chesterton), correspondence
(Chekhov), narration (Chopin, O. Henry), modern long-form (Doctorow).

**`bundles/prose-tell-scan/tests/corpus/human-professional/`** — EFF Deeplinks,
CC-BY 4.0, and **deliberately MULTI-author**: dozens of bylines, capped so none can
reach the single-author floor. It is register coverage, not voice material, and the
manifest plus two guards enforce that it can never be mistaken for the latter.

Note Doctorow appears in both `pluralistic/` and, potentially, EFF — cross-author
work must draw from one bucket.

Both directories carry their own `LICENSE` and `ATTRIBUTION.json`. The
integrity tests in `bundles/prose-tell-scan/tests/selftest.mjs` fail the build
if:
- files appear on disk but not in ATTRIBUTION
- files appear in ATTRIBUTION but not on disk
- any file lacks `human_authored: true` + source + date frontmatter
- any file is below the 200-word calibration floor (or 500 for pluralistic)
- an **unrecognised author** enters the corpus (this is the guard against silent
  license drift — adding a new author must land the license justification in
  the same commit)
- any pluralistic body leaks the license notice, BOGUS AGREEMENTS text, or
  ISSN (evidence the parser lost an anchor)

**Fetchers.** Never re-fetch as part of testing — the corpus is committed,
tests read the committed files:
- `tests/corpus/fetch-corpus.mjs` — Wikipedia (human/ + ai/)
- `tests/corpus/fetch-essays.mjs` — Project Gutenberg (Bacon, Chesterton,
  Chekhov)
- `tests/corpus/fetch-modern.mjs` — pluralistic.net RSS

---

## 5. The pattern that has failed ten times

`bundles/prose-tell-scan/CALIBRATION.md` records ten instances of one recurring
failure: **a number that was true when written and untrue when read.** Six
subclasses:

- FN-i: rule against one-off pipelines got violated three commits after it was
  written
- FN-j: mutation count taken from a crashed run (`grep` pipeline hid the
  missing summary line)
- FN-k: contract test's bare `catch` reported "skipped" on a rename with the
  sibling fully present
- FN-l: MUTATIONS.md went stale in the commit that added the check that
  invalidated it

The remedy that survived: **a measurement in a document is a cache. Either it
is generated by something re-runnable that fails when it disagrees, or it is
already wrong and nobody has noticed yet.** So the following are now outputs
of scripts and cannot be hand-edited:

- `bundles/prose-author/tests/MUTATIONS.md` ← `tests/mutations.mjs`
- Harness counts in `bundles/prose-review/tests/critic-harness.md` and its
  run logs ← `tests/verify-run.mjs`
- Corpus figures ← `tests/genre-check.mjs`, `tests/separator-count.mjs`

What is STILL hand-maintained: the prose *around* the numbers. Any assertion
about a specific run in a README should either quote a script's output or be
phrased in ranges, never in specific numbers.

**The eleventh arrived on 2026-08-05 and did not come from there** — see
`FN-2026-08-05-m`. It is a class the log did not have: not a number that stopped
being true, but a number that was never true, because **the ground truth it was
measured against was wrong.** Two instances in one afternoon, both in the fidelity
critic's fixtures: the expected verdict leaked into a file the critic must read,
and one fixture's expected verdict was simply incorrect. Re-running does not
catch either — the harness reproduces the wrong answer perfectly.

The remedies are now enforced (no verdict in fixture frontmatter; originals
byte-identical to their corpus source; corrections recorded in the manifest and
printed by `verify-run.mjs`). The part that cannot be enforced is what actually
found it: **reading what came back.** A subagent flagged the leak unprompted
while returning its verdict. That is the argument for checking verbatim
transcripts in, and it is worth knowing before building the next critic.

---

## 6. Remaining work, ordered by leverage

Every item below can be built without the user's personal corpus. The
corpus-testing infrastructure in `human-essays/` gives multi-author, multi-
register prose today.

### High leverage — critics that fill the shipped roadmap

Each critic below has its verdict set and scope defined in
`bundles/prose-review/DESIGN.md` §Shape. Follow the same discipline as
`prose-voice-critic`: byte-identical primitive/bundle pair, meta.yaml,
README.md, acceptance harness with corpus citations required for every
finding.

**1. ~~`prose-fidelity-critic`~~ — DONE 2026-08-05.** See §2. Three things it
established that the next critic should copy:

- **Classify fixtures by their relationship to the deterministic half**, not by
  severity. A critic that reads a script's output must be shown disagreeing with
  it in both directions or it is a wrapper around a regex. The harness reports
  the *echo baseline* — the score a parrot gets — next to the real score.
- **Byte-identical originals.** A fixture author who can edit the "original" can
  tune it until the case passes. The selftest enforces the copy.
- **The answer must not be in the input.** The first sweep was discarded: every
  `revision.md` carried `expect: FAITHFUL` in frontmatter, in a file the critic
  must read. A subagent caught it; nothing in the repo would have. Now guarded.

**2. `prose-pattern-critic`** (~1 day)
- Lives in `prose-tell-scan`, not `prose-review` (per DESIGN.md line 27). It
  is "the one reviewer coupled to the catalog" — reads
  `catalog.json.not_deterministic` and judges each of the six
  regex-undecidable patterns against the draft.
- Verdict: `CLEAN` / `REVISE`.
- Test fixtures: multi-voice essays should CLEAN (Bacon, Chesterton, Chekhov);
  AI-labelled Wikipedia should REVISE on at least one pattern.
- **Same discipline as voice-critic**: findings must cite, never claim
  authorship, silence on uncertainty.

**3. `prose-medium-critic`** (~1 day)
- Conditional: only spawns if `profile.json.medium` is set.
- Owns TTS-hostile constructions (homographs, unpronounceable acronyms) and
  web scannability. Deterministic component is a list; the critic reads it and
  adjudicates severity per context.
- Verdict: `CLEAN` / `REVISE`.

**4. `prose-substance-critic`** (~1-2 days)
- Owns: claims without support, missing specificity, stakes not stated.
- Verdicts: `CLEAN` / `REVISE` / `AUTHOR-INPUT` (the last is the escape hatch
  for uncheckable factual claims; DESIGN.md open question 2 warns against
  overuse).
- Was corpus-blocked. Chekhov's *letters* and Doctorow's *essays* are
  argumentative enough to test against.

**5. `prose-adversarial-reader`** (~1 day)
- Reads the WHOLE piece and reports: thesis, order, weakest section,
  strongest objection.
- Was corpus-blocked. Doctorow's longer posts are the test material.

**6. `prose-reviser`** (~2 days)
- The single mutating pass. Ships **AFTER** fidelity-critic, per DESIGN.md
  §Fidelity: "It ships before the reviser it guards. Over-editing is the
  primary failure mode of any rewriter." **That precondition is now met.**
- Verdict/output: change log keyed to plan entries; MATERIAL-LOSS from
  fidelity-critic fails the run and restores the original.
- Note for whoever builds it: the fidelity critic's priority item 4, *edits
  outside the plan*, has never fired — no fixture supplied an edit plan, and
  every transcript correctly says the item is not assessable. The reviser is what
  produces plans, so building it is also what finally tests that item.

### Medium leverage — corpus expansion for register variation

The corpus has essay, correspondence, and modern-long-form registers. Three
gaps that would round out testing:

**7. Narration register** (~1 hour) — extend `fetch-essays.mjs` with Kate
Chopin (PG 160, short stories) or O. Henry (PG 2776). Same pattern as
Chekhov. Update expected-author set and license justification.

**8. Technical register** (~2-3 hours) — MDN Web Docs are CC-BY-SA 2.5+. Needs
a new fetcher with HTML parsing, URL manifest, careful section extraction. See
`fetch-modern.mjs` for the pattern.

**9. Modern professional writing** (~1-2 hours) — EFF Deeplinks (CC-BY 4.0).
Uses `description` not `content:encoded` in RSS; small variant of
`fetch-modern.mjs`.

### Lower leverage — infrastructure improvements

**10. ~~Blended-band consumer.~~ DONE 2026-08-05 — and it was the highest-leverage
item in this file, not a low-leverage one.**

`tell-scan.mjs` now judges catalog density against `catalog_density_blended` when
calibration has produced it, names the band set it used in the report and in
`--json` under `profile.bands`, and surfaces calibrate's narrowing warning —
which had been computed and written to `thresholds.derived.json` since the blend
shipped, where nothing ever read it. New flags: `--human-only`, `--show-bands`.

**Why this outranked its old placement.** Everything else in §6 adds capability.
This was the one wire that made the system a system: until it landed, an author
could ingest an edit, watch `edit_fraction` get computed, see both band sets
written — and no output anywhere changed. The flywheel the project exists for was
unobservable, and every component passed its own tests the whole time. A producer
with no consumer is not a feature, it is a file.

Asserted end to end in `prose-tell-scan/tests/selftest.mjs` under *"The loop
closes"*: corpus → ingest → calibrate → scan, with a draft whose density sits
strictly between the two ceilings so the verdict genuinely flips. `mutations.mjs`
carries `let tell-scan ignore the blended bands` (cost: 3 tests) so the gap
cannot silently reopen.

**Read `PROFILES.md` rule 6 for what this does NOT demonstrate** — chiefly that
bands move toward *the pooled corpus including kept edits*, which equals "toward
the author's voice" only if the kept edits really are theirs. And it has only run
on synthetic corpora.

**11. `prose-author` v0.2** (blank page from notes) and **v0.4** (voice
locks). Both specced in `bundles/prose-author/DESIGN.md`. v0.2 is a small
prompt addition to the drafter; v0.4 is more design.

**10b. Fix the four `fidelity-scan` defects the acceptance run found.** All are
in `bundles/prose-review/tools/fidelity-scan.mjs`, all are real, and none was
fixed in the shipping commit because changing the scanner would have moved the
baseline the critic was measured against.

- **Presence check is line-wrap sensitive while extraction is not.** Extraction
  correctly refuses to span newlines (there is a selftest for it); the presence
  check is `revBody.includes(source)`. So a multi-word entity that wraps is
  reported absent when it is plainly there, and the false-positive rate becomes a
  function of line width. Cheapest real fix in the file.
- **Quotations containing a newline are never extracted.** `[^”’\n]`
  excludes newlines. On hard-wrapped prose this is the common case: of ten quoted
  spans in `bacon-of-death53.txt`, the scan sees four.
- **Single-word named entities are invisible.** `PROPER_NOUN_RUN` requires two
  capitalised words, so *Suvorin*, *Levitan*, *Fourmis*, *Salon* are never atoms.
  The docstring says this is deliberate — the alternative tags every "The" — so
  the fix is not obvious and may be "document it", not "change it".
- **`Cæsar` breaks the run regex.** `[A-Z][a-z]+` does not match `æ`, so
  "Augustus Cæsar" is not extracted at all. Non-ASCII letters generally.

Any fix changes fixture scan verdicts, so re-run the fidelity harness and update
`fixtures.json`'s `scan_verdict` fields in the same commit — the selftest will
fail until you do, which is the intended behaviour.

**12. Wire prose-pattern-critic's `not_deterministic` list into
`fetch-modern.mjs`'s parser-leak detection.** If new anchors appear in the
pluralistic RSS format, catch them via the same integrity discipline.

---

## 7. What NOT to build without a specific reason to

- **A new "small helper" that duplicates something in a sibling bundle.** The
  ports from prose-tell-scan into prose-author are already sharp. Adding a
  third home for MIN_SAMPLE_WORDS or CAP_CLAMP is drift.
- **A fetcher for a source without a confirmed permissive license.** The
  `LICENSE` in each corpus subdirectory lists what's allowed. Adding
  contemporary journalism or private writing "for testing" is exactly what
  those files exist to refuse.
- **A test that cannot fail.** If a mutation on the guarded code does not
  fail a test, the test is decorative. `tests/mutations.mjs` will report the
  guard as UNTESTED and exit non-zero.
- **A number in a README** that is not either (a) an output of a checked-in
  script, or (b) phrased as a range that the current run has to satisfy.
- **A prose-critic without a harness.** The prose-voice-critic BLOCK on
  commit 1c50fa6 was for shipping a critic whose designed harness had never
  been executed. Do not repeat.

---

## 8. Where to pick up

Recommended sequence:

1. ~~**prose-fidelity-critic**~~ — done 2026-08-05.
2. **prose-pattern-critic** — mechanically similar to voice-critic. Reads a
   fixed list (`catalog.json.not_deterministic`), judges each. Testable
   against the multi-voice corpus. **Read the fidelity critic's harness first**
   (`tests/critic-harness.md`, "A second protocol"): pattern-critic also reads a
   deterministic artifact, so it has the same failure mode — becoming an echo of
   the catalog — and the same fix, which is to classify fixtures by whether the
   critic must agree or disagree with what it was handed.
3. Add narration register (Chopin OR O. Henry) — 30-60 minutes, extends
   proven fetcher.
4. **prose-substance-critic** — now that argumentative-corpus exists
   (Doctorow's essays, Chekhov's longer letters).
5. **prose-reviser** — its stated precondition (a fidelity check that lands
   first) is now satisfied. §6 item 6.

Do not batch these into one commit. Each critic must go through the
verification-critic + architecture-reviewer gate in parallel before shipping.

---

## 9. Files worth reading before writing any code

In this order:

1. **`bundles/prose-review/DESIGN.md`** — the spec for the whole critic suite.
   Read §Shape, §Fidelity, §How-it-should-behave.
2. **`bundles/prose-tell-scan/CALIBRATION.md`** — the incident log. Read the
   last three entries (FN-i, FN-j, FN-k, FN-l) and "What the log says so far".
3. **`primitives/agents/prose-voice-critic/agent.md`** — the shape a critic
   prompt should have. `meta.yaml` beside it records the two departures from
   convention. Then
   **`primitives/agents/prose-fidelity-critic/agent.md`** beside it, whose
   `meta.yaml` records why it takes the *opposite* position on both. Reading the
   pair is the fastest way to see that the error preference is a property of the
   question, not a house style.
4. **`bundles/prose-review/tests/critic-harness.md`** — how a critic gets its
   harness run.
5. **`bundles/prose-review/tests/verify-run.mjs`** — the script that derives
   harness counts from checked-in transcripts. New critics use it too.
6. **`bundles/prose-tell-scan/PROFILES.md`** — the shared contract that
   prose-author and prose-tell-scan both implement against. The five rules
   for `corpus/approved/` are load-bearing.
7. **`bundles/prose-author/tests/mutations.mjs`** — the mutation runner. Read
   `MUTATIONS.md` alongside it. New guards must add a mutation.
8. **`AGENTS.md`** at repo root — the two rules that break things
   (byte-identical primitive/bundle, kind-agnostic repo docs) plus the
   "before you call it done" checklist.

## 10. Verification gate — do not skip

Before declaring any non-trivial task done:

1. Run all four test suites and report what passed with the command:
   ```
   node bundles/prose-tell-scan/tests/selftest.mjs
   node bundles/prose-tell-scan/tests/acceptance.mjs
   node bundles/prose-author/tests/selftest.mjs
   node bundles/prose-author/tests/mutations.mjs
   node bundles/prose-review/tests/selftest.mjs
   node bundles/prose-author/tests/concurrency.mjs
   node bundles/prose-review/tests/verify-run.mjs bundles/prose-review/tests/runs/2026-08-04-b
   node bundles/prose-review/tests/verify-run.mjs bundles/prose-review/tests/runs/2026-08-05-fidelity
   ```

   These now also run in CI on every push (`.github/workflows/gates.yml`), so
   "all suites green" stops being a claim about whoever remembered to run them.

   **`mutations.mjs` is safe to run alongside anything.** It used to break real
   source files in the working tree and restore them, which made the repo unsafe
   for any concurrent suite run — including the parallel reviewers step 2 below
   *requires*. It now works in a temp copy; `concurrency.mjs` is the test that
   says so, and it fails against the old behaviour on all 19 mutations.
2. Invoke **verification-critic** and **architecture-reviewer** subagents IN
   PARALLEL, passing them the original task statement (not a summary you
   wrote). `BLOCK` or `DO NOT SHIP` means not done. This process has caught
   real bugs in every review round of this project.

The reviewers are read-only. They cannot break anything. Trust them.

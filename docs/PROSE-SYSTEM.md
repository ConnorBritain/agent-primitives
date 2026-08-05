# Prose system — plan and state

**Snapshot date:** 2026-08-05. This document is a handoff from one session to
the next, meant to be read by a fresh-context agent before writing any code.
When something in it goes stale, edit it in the same commit as the change.

**Branch:** `prose-review-design` (10 commits ahead of `main`; PR #10 open).
**Suites (all green):** prose-tell-scan 240, prose-author 76, prose-review 20.

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
- `human-essays/gutenberg/` — 210 essays and letters by Bacon, Chesterton,
  Chekhov (public domain)
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

### prose-review (shipped: 1 critic, 1 sidecar, harness infrastructure)

- `prose-voice-critic` agent (primitive + bundle) — the shipped critic. Passes
  0/12 of 12 human Wikipedia articles (leave-one-out), catches 1/4 confound-
  controlled AI drafts, never claims machine authorship in 18 opportunities.
  Cited findings only.
- `tools/fidelity-scan.mjs` — deterministic sidecar for the fidelity critic.
  Extracts material atoms (numbers, quotes, proper-noun runs, headings) from
  original; reports which are absent from revision. Verdict FAITHFUL / MATERIAL-
  LOSS. The critic PROMPT that reads this output does not exist yet.
- `tests/critic-harness.md` + `tests/verify-run.mjs` — how a critic prompt gets
  its acceptance harness run and how the counts are re-derived from checked-in
  transcripts (not restated from summary tables).
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

---

## 4. The corpus, and what each part is for

Two directories, different purposes:

**`bundles/prose-tell-scan/tests/corpus/human/`** — 12 Wikipedia articles,
`ai/` alongside. This is the ACCEPTANCE-TEST corpus: the voice-critic harness
runs leave-one-out on `human/`, the acceptance test on `ai/`. Register is flat
encyclopedic prose written by many editors; the voice-critic run log noticed
unprompted that this measures REGISTER, not authorship.

**`bundles/prose-tell-scan/tests/corpus/human-essays/`** — 230 samples across
four writers. This is the CRITIC-TESTING corpus that unblocks work that needs
multi-author, multi-register prose:

```
Bacon         58 samples    51,515 words   argumentative essay    1625     PD
Chesterton    39 samples    55,336 words   argumentative essay    1909     PD
Chekhov      113 samples    98,832 words   correspondence         1920     PD
Doctorow      20 samples   ~40,000 words   modern long-form       2026     CC-BY 4.0
```

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

What is STILL hand-maintained and therefore where the eleventh instance will
come from: the prose *around* the numbers. Any assertion about a specific run
in a README should either quote a script's output or be phrased in ranges,
never in specific numbers.

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

**1. `prose-fidelity-critic`** (~1 day)
- Reads `fidelity-scan.mjs` JSON output and adjudicates INTENT: which
  MATERIAL-LOSS findings are legitimate consolidations vs silent drops.
- Verdict: `FAITHFUL` / `MATERIAL-LOSS`.
- Test fixtures: Chesterton original + heavily summarised Chesterton (should
  MATERIAL-LOSS on numbers/names), Bacon original + wording variant (should
  FAITHFUL). Both are synthesisable from the existing corpus.
- **Do not ship without a harness run.** The BLOCK on prose-voice-critic's
  first commit was for exactly this.

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
  primary failure mode of any rewriter."
- Verdict/output: change log keyed to plan entries; MATERIAL-LOSS from
  fidelity-critic fails the run and restores the original.

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

**10. Blended-band consumer.** `calibrate.mjs` writes
`catalog_density_blended` today. Nothing READS it yet — `tell-scan.mjs` still
compares against `catalog_density` (human-only). Wire the scanner to use
blended when present, with a flag to show both.

**11. `prose-author` v0.2** (blank page from notes) and **v0.4** (voice
locks). Both specced in `bundles/prose-author/DESIGN.md`. v0.2 is a small
prompt addition to the drafter; v0.4 is more design.

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

1. **prose-fidelity-critic** — the sidecar (`fidelity-scan.mjs`) is already
   shipped and tested. The critic's whole design is: read that output, decide
   which losses are intentional. Cheapest concrete win.
2. **prose-pattern-critic** — mechanically similar to voice-critic. Reads a
   fixed list (`catalog.json.not_deterministic`), judges each. Testable
   against the multi-voice corpus.
3. Add narration register (Chopin OR O. Henry) — 30-60 minutes, extends
   proven fetcher.
4. **prose-substance-critic** — now that argumentative-corpus exists
   (Doctorow's essays, Chekhov's longer letters).

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
   convention.
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
   node bundles/prose-review/tests/verify-run.mjs bundles/prose-review/tests/runs/2026-08-04-b
   ```
2. Invoke **verification-critic** and **architecture-reviewer** subagents IN
   PARALLEL, passing them the original task statement (not a summary you
   wrote). `BLOCK` or `DO NOT SHIP` means not done. This process has caught
   real bugs in every review round of this project.

The reviewers are read-only. They cannot break anything. Trust them.

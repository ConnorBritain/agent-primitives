# PI-02 · S2 — `voice-profile-render` authoring run (2026-08-07)

**Result: the primitive renders, refuses correctly, and holds its citation contract.
Primitive stays HELD (`ships: false`).**

**S2's exit is MET, 2026-08-07.** Both halves.

- *Machine-verified* — schema validates, counts in the prose match the json, corpus
  hashes match, firewall clean. 156/0 in the bundle selftest.
- *Author-verified* — the author read `raw/t1-chekhov.md` and confirmed it reads as
  Chekhov. That judgement is the exit criterion PI-02 wrote for this sprint, and it is
  the one thing in this run that no test could stand in for.

**This is not a ship.** The primitive stays `ships: false`. S2's exit asks whether the
renderer produces a profile worth reading; the ship bar asks whether it does so reliably
enough to gate a generator on, and that bar does not exist until S5.

These are **authoring tests**, not acceptance. Nothing here was measured against a
pre-registered bar; PI-02 sequences that into S5, and S2 deliberately did not write one.

Design decisions: `.planning/PI-02-S2-design.md`.

## Prerequisites, verified before authoring

| gate | state |
|---|---|
| Reviser has shipped | ✓ `d422988`, v0.3.0 across four manifests + marketplace, `ships: true` |
| Critics quiet on human writing | ✓ baseline unchanged: 18 draws / 6 cells / 0 findings / unanimous CLEAN. Not re-measured — re-running a published figure changes the sample under the number (SAMPLING-POLICY.md). Nothing since `2155438` touches a critic judgment rule. |

## What ran

Four clean-context dispatches against `agent.md`
`sha256:22da67e1698d836fe3fe2ab22f2f6189760ef3feda533c928f6d92842281448d`
(the FU-7 / FU-8 revision).

| id | fixture | file | outcome |
|---|---|---|---|
| T1 | `chekhov-correspondence` | `raw/t1-chekhov.md` | rendered, `full`, 26 obs, 12 dropped |
| T3 | same, re-render, fresh context | `raw/t3-chekhov-rerun.md` | rendered, `full`, 25 obs, 7 dropped |
| T2 | `mixed-thin` (5 samples, 5 authors) | `raw/t2-mixed-thin-refusal.md` | **refused** |
| T7 | `bacon-essay` | `raw/t7-bacon.md` | rendered, `full`, 31 obs, 10 dropped |

Twelve earlier dispatches under three superseded prompts are in `superseded/`, each
directory carrying the defect that retired it. They are evidence about the authoring
process, not deliverables.

## T1 — the positive test, stated at its real strength

S2 asked that the renderer derive S1's constraints **systematically from the corpus,
rather than having them hardcoded**. Measured across the two clean Chekhov renders:

| S1 recommendation | re-derived? | evidence in the v4 renders |
|---|---|---|
| dialogic register — **direct-address questions** | **yes, both draws** | A §4 *"a direct question to the recipient appears in 7/10 samples"*; B §4 *"questions are fired straight at them mid-letter without waiting for an answer"* 7/10 |
| dialogic register — **ellipses** | **withdrawn (FU-6)** | both draws now place it in §8 as the edition's, with their own positional counts: A 9/10 boundary vs 3/10 mid-sentence, B 9/10 vs 2/10 |
| dialogic register — **exclamations** | **not tested** | neither draw made it a headline observation; it was never separately measured, and FU-6's caveat applies to it as punctuation |
| similes anchored to observed things | **yes, both draws** | A §5 *"to one specific creature, food, body or household object, never to a category"* 8/10; B §5 *"animals, food, and household bodies"* 7/10 |
| varied sentence openings | **yes, both draws** | A §2 three kinds, 4/10 + 4/10 + 2/10, with *"I checked every sample against the split"*; B §2 two shapes at 9/10 plus a tenth that *"belongs cleanly to neither"* |
| no metaphor-then-gloss | **no — the corpus contradicts it** | A §1 records the gloss as a live habit: *"A term gets restated more narrowly a beat after it is used"* 5/10, *"--that is, to sleep"* |

**Of S1's four recommendations: two re-derive cleanly, one is withdrawn as an edition
artefact, one is withdrawn as prompt contamination, and one sub-item was never
measured.** That is a smaller result than the first draft of this doc claimed, and it
is the accurate one.

The metaphor-gloss recommendation was in the prompt's own worked example until the v2
revision (`superseded/v2-fixture-leak/`). With it removed it has not reappeared in any
of four subsequent draws, and both v4 draws record the opposite — a dash-plus-*that is*
gloss is a habit this author has. What survives is narrower and better evidenced: a
figure runs one clause and is not reopened (A §5 8/10, B §5 6/10). That is about figure
length, not glossing.

The renders also produced constraints S1 did not have, and these are the ones a drafter
would actually use: the accumulating list of concrete particulars closed by a short flat
sentence (both draws 10/10 and 9/10); the close that lands smaller than the letter's
biggest thought (A 6/10, B 6/10); the mock-formal vocative dropped mid-sentence (both
5/10); the grievance stated in full and revoked in four words (B 3/10).

## The FU-7 / FU-8 revision, and what it changed

After the first pass of this run was committed (`3550c70`), FU-6 established that the
corpus's ellipses are overwhelmingly Garnett's elision marks. Four prompt rules
followed, and all four are visible in these renders.

**1. Sort typographic evidence from grammatical evidence (FU-7).** Measured:

| | sections mentioning the ellipsis |
|---|---|
| pre-FU-7 draw A | 2, 4 — voice sections |
| pre-FU-7 draw B | 1, 8 — voice sections |
| **post-FU-7 draw A** | **8 only** |
| **post-FU-7 draw B** | **8 only** |

Both draws relocated it, and both derived the positional split themselves — 9/10
boundary vs 3/10 mid-sentence in draw A, 9/10 vs 2/10 in draw B — against FU-6's
independently measured 47.4% / 4.5% over all 113 letters. **The prompt supplied the
method, not the finding**, which is the opposite of the v2 leak.

Both Chekhov renders now open with a header naming the edition, and Bacon's flags its
own pointing density as *"a compositor's and a modern transcriber's work"* — an
observation nothing asked for specifically.

**2. A claim may not outrun its count (FU-8).** The v3 defect (*"never abstractions —
6/10"*) does not recur. The scope carve-out also holds: *"a figure … is never reopened
— 8/10"* is a universal over figures, not over samples, and is correct as written.

**3. No unchecked partitions (FU-8).** Draws now show the check: *"I checked every
sample against the split"*, *"This does not partition by recipient —
`chekhov-154` does it too"*.

**4. Write so the drafter can act.** Present throughout, and new: *"if a sentence has
run long and enthusiastic, make the next one under eight words and unimpressed"*;
*"when you would reach for one summarising adjective, list four particulars instead"*;
*"having written a claim, write it again inverted rather than elaborating it"*.

### One rule was built, measured, and thrown away

FU-8 also proposed a validator for the modality gap. It was implemented and dry-run
against the four committed renders: **six flags, one true positive.** The false ones
were ordinary English — *"a joke every few sentences"*, *"never turns aside"* (scoped
inside one sample), *"nothing is being argued yet"*. The distinguishing feature is
scope, and no regex sees scope.

Shipping it would have taught the renderer to avoid the words rather than fix the
reasoning. The rule lives in the prompt; the human-facing half is a line in the
primitive's *Reading the output*. Reasoning and the full table are in
`.planning/PI-02-S2-design.md` D8. **The schema validates structure, not modality** —
stated as a Known limit rather than implied to be covered.

## T2 — the negative test, and the one that matters

Five samples from five authors behind a `profile.json` asserting a single register.

**It refused on every prompt version it was run against — four now.**

**The fixture itself had to be fixed first.** Its `profile.json` description opened
*"NEGATIVE-TEST FIXTURE… They are five different authors"* while its own notes claimed
it did not tip its hand. `profile.json` is one of the three things the renderer reads,
so the fixture was handing over the answer and the run was crediting the primitive with
finding it — the v2 prompt leak again, relocated into the test. A render caught it:
*"profile.json's notes also state outright that the corpus is five writers; I record
that I read it."* The disclosure now lives in `FIXTURE.md`, outside the read path, with
a guard asserting no tell remains in `profile.json` or `voice.md`. The refusal recorded
here is the clean re-run.

Filed as **FU-10**: the fixture is still refusable from the five differing `source:`
lines without reading prose. That is correct behaviour, not a tell — but it means this
test proves the renderer can read a bibliography, not that it can hear a voice split.
The harder case, one author across two registers with the same source, is untested. It never invented a
unifying voice. It separated the corpus into four groups with quoted evidence, noted
that two of them (Chopin, O. Henry) are not one voice either, and flagged that
`profile.json`'s claim is contradicted by its own corpus:

> Pooling these would produce a description of sentence length, opening shape, address,
> and figure that fits none of the five and is loose enough to appear to fit anything.

It also distinguished *why* it refused — the multiple-voices rule, not the sample count
— while noting the corpus is thin at five as well.

## T3 — stability

Two independent renders, same corpus, fresh context.

Same section structure. Substantially overlapping observations: the accumulating
clause-run stopped by a short flat sentence (9/10 and 9/10); three opening shapes with
matching counts; the deflating close (5/10 and 5/10); direct questions (6/10 and 9/10);
domestic/bodily figures (6/10 and 8/10); the dash-plus-*that is* gloss (4/10 and 3/10);
no headings or lists anywhere.

Support counts differ by 1–3 on shared observations. **Not asserted away**: byte-equality
is not a property of a language model, and a test asserting it would pass only by being
wrong about what was built. The asserted property is the weaker true one — no observation
in one render contradicts one in the other.

## T4 / T5 — machine-checked

`node bundles/prose-author/tests/selftest.mjs` → **154 passed, 0 failed.**

- All four renders parse and validate against `voice-profile/1`.
- Every observation carries `support >= 1`; `support: 0` is a hard reject.
- Every `n/m` in the JSON is asserted to appear in the prose.
- `confidence` derives from sample count; `full` on 5 samples is rejected.
- Refusal shape is disjoint from render shape — a refusal carrying `observations` is
  rejected, so nothing can read a profile off a refusal.
- No profile names a catalog, claims a draft will sound like the author, or mentions a
  detector.
- **The prompt contains no fixture name, author surname, corpus filename, or S1 finding
  phrase** — derived from the fixture listing, so new fixtures are covered automatically.
- The lock's `agent_sha256` must match `agent.md` on disk. A run doc pinned to a prompt
  that has since changed is claiming a measurement it did not make.
- The lock and the drafting exemplars must agree on sample count **and** on which files.
- A corpus using PROFILES.md group subdirectories locks without throwing.
- Corpus continuity: the Chekhov fixture is the corpus S1 diagnosed.

## Three defects this run found in itself

| # | defect | how found | fix |
|---|---|---|---|
| 1 | section keys undefined — two draws disagreed on 4 of 8, neither matched the schema; refusal shape carried render keys | first render pair | prompt, not schema. `superseded/v1-prompt-underspecified/` |
| 2 | **prompt contaminated with its own fixture** — two S1 findings supplied as worked examples, then reported as derived | self-check, confirmed independently by review | neutral examples + a selftest guard. `superseded/v2-fixture-leak/` |
| 3 | `support: 0` emitted; and a contradiction between the prompt (allowing *"the only place this appears"*) and the validator (demanding a literal `n/m`) | schema check | prompt requires `n/m` always, and states that the count counts samples |

Review additionally caught two things the run had not: the lock recorded a prompt hash
that no longer matched `agent.md` with nothing asserting it, and `scanCorpus`
reimplemented a scan `exemplars.mjs` already owned — crashing on grouped corpora and
disagreeing on word floor and extension filter. Both fixed; see design doc D7.

**In every case the fix went to the prompt or the code, never to the check.** The
`SECTIONS` list was not widened to absorb synonyms two draws happened to produce.

## Open findings, surfaced not resolved

**F1 — the Chekhov ellipsis may be the editor.** Filed as FU-6, blocking S5. Renders
disagree on whether the trailing four-dot ellipsis is authorial: T1 records it at 9/10 as
*"the workhorse punctuation"*, T3 at 8/10, and both note that samples *begin* on a leading
`...` that is unambiguously an excision mark (T3 §8: 4/10). S1's headline finding named
ellipses as part of the dialogic register the AI pastiche lacked. If they are the
edition's, part of that finding is about a typesetter.

**F2 — every fixture inherits an editorial-punctuation caveat**, and every render now
reaches it independently. The Bacon render drew the line correctly and unprompted: *"The
clause-chaining in section 1 is safe because it is grammatical, not typographic; the
specific density of semicolons is not."* Worth promoting into the prompt. Filed as FU-7,
deliberately not done here — it is a prompt change after the recorded runs.

**F3 — support counts are the model's own arithmetic.** The schema asserts a count
exists and that prose and JSON agree; it does not verify the count is right. Only a human
spot-check finds a miscount. Known limit, not fixed.

**F4 — two of S1's four Chekhov findings now look partly artefactual** — one from this
prompt (metaphor-gloss), one possibly from the edition (ellipses). S1's DISCRIMINATING
verdict is not overturned: the direct-address and anchored-figure findings re-derive
cleanly every time, and the critic did distinguish AI pastiche from the corpus. But S5
should not calibrate a bar on the other two until FU-6 is settled.

## Cross-render control — set up, not executed

`../fixtures/cross-render/` holds four cells, two prompts, and pre-registered reading
criteria. It needs a drafter, which is S3.

The two rendered profiles confirm the pair is well chosen. On every axis the profile
records they are opposites: one named recipient vs a generic `a man`; questions fired at
a reader vs no reader at all; a close that deflates onto a domestic particular vs a close
that *"ends heavier than it was"*; figures from the household vs figures from the trades
plus untranslated Latin at 9/10.

## Cost

15 dispatches total (4 kept, 11 superseded across two prompt revisions), ~50 min wall
clock, roughly $2. The re-run cost is the price of the three defects above; it is high
because the prompt, the schema, and the tests had one author, so every disagreement
between them surfaced as a re-render rather than as a design conversation.

## Artefacts

- Primitive: `primitives/agents/voice-profile-render/{agent.md, meta.yaml, README.md}` (held)
- Fixtures: `../fixtures/profiles/{chekhov-correspondence, bacon-essay, mixed-thin}/`
- Cross-render setup: `../fixtures/cross-render/`
- Schema + lock: `../voice-profile.mjs`; guards in `../selftest.mjs`
- Design: `.planning/PI-02-S2-design.md`

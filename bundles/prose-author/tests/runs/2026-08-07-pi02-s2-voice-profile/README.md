# PI-02 · S2 — `voice-profile-render` authoring run (2026-08-07)

**Result: the primitive renders, refuses correctly, and holds its citation contract.
Primitive stays HELD (`ships: false`).**

**S2's exit is not met yet.** The machine half passes. The other half — *"a rendered
profile a human reader can look at and say yes, that's how Chekhov writes"* — is the
author's judgement on `raw/t1-chekhov.md`, and it is outstanding.

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
`sha256:855785226236fb07193499ed23c05ea0b9f8b933ee789e7dc073307e9ee16d14`.

| id | fixture | file | outcome |
|---|---|---|---|
| T1 | `chekhov-correspondence` | `raw/t1-chekhov.md` | rendered, `full`, 26 obs, 7 dropped |
| T3 | same, re-render, fresh context | `raw/t3-chekhov-rerun.md` | rendered, `full`, 35 obs, 9 dropped |
| T2 | `mixed-thin` (5 samples, 5 authors) | `raw/t2-mixed-thin-refusal.md` | **refused** |
| T7 | `bacon-essay` | `raw/t7-bacon.md` | rendered, `full`, 31 obs, 7 dropped |

Eight earlier dispatches under two superseded prompts are in `superseded/`, each with
the defect that retired it. They are evidence about the authoring process, not
deliverables.

## T1 — the positive test, stated at its real strength

S2 asked that the renderer derive S1's constraints **systematically from the corpus,
rather than having them hardcoded**. Measured across the two clean Chekhov renders:

| S1 finding | re-derived? | evidence |
|---|---|---|
| dialogic register: direct-address questions | **yes, both draws** | T1 §4 *"Direct questions are fired at the recipient and not answered for them"* 6/10; T3 §4 9/10, and *"Every sample turns to the recipient inside the body"* 10/10 |
| similes anchored to observed things, not portable aphorisms | **yes, both draws** | T1 §5 *"animals, food, and the body — never abstractions"* 6/10; T3 §5 *"food, animals, servants, relatives and the body"* 8/10 |
| varied sentence openings, not one periodic shape | **yes, both draws** | both §2 open *"Three shapes"* and refuse to composite them; T1 4/10 + 4/10 + 2/10, T3 4/10 + 4/10 + 2/10 |
| no metaphor-then-gloss (*"which is to say"*) | **no — and the corpus contradicts it** | see below |

**Three of four re-derived. The fourth did not, and should be retired as a Chekhov
constraint.**

The metaphor-gloss finding was present in the prompt's own worked example until this
run's third revision (see `superseded/v2-fixture-leak/`). With the example removed it
did not reappear — and both clean draws found the *opposite*: a dash-plus-*that is*
gloss is a live habit, T1 §1 at 4/10, T3 §4 at 3/10. What the renders do find is
narrower and better evidenced: a figure runs one clause and is then abandoned
(T3 §5, 7/10). That is a statement about figure length, not about glossing.

An earlier contaminated draw reported this as *"nothing in the corpus reaches for*
which is to say", which is true and useless — the phrase is modern English and would
not appear in a Garnett translation whatever Chekhov's habits were. It was an artefact
of the prompt, not a property of the author.

The renders also produced constraints S1 did not have: the long accumulating clause-run
stopped dead by a short flat sentence (T1 9/10, T3 9/10); the close that deflates onto
something domestic (both 5/10); the mock-formal vocative dropped mid-sentence (T1 3/10,
T3 7/10); judgements delivered as a bare predicate before their evidence (T3 7/10).

## T2 — the negative test, and the one that matters

Five samples from five authors behind a `profile.json` asserting a single register.

**It refused, on all three prompt versions it was run against.** It never invented a
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

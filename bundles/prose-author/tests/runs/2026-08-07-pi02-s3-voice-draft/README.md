# PI-02 · S3 — `voice-draft` authoring run (2026-08-07)

**Result: the drafter works, refuses correctly, and the profile is load-bearing.
Primitive stays HELD (`ships: false`).**

**The cross-render control has FIRED — both halves of its pre-registered conjunction.**

- **Criterion 2** (critic finds more on crossed than matched): met on both pairs, with
  **disjoint distributions** — the worst matched draw beats the best crossed draw in
  both directions.
- **Criterion 1** (a human sorting the four unlabelled drafts better than chance):
  **4/4**, against a 1-in-4 chance baseline. Recorded in `CRITERION-1.md`, and
  **labelled "weakened — reader had prior exposure"** because the reader followed the
  authoring session. The label stands despite the perfect score.

An earlier draft of this document declared the control "FIRES" while criterion 1 was
still unrun — narrowing a conjunction to its convenient half. It happens to have fired
since. That does not make the earlier claim retroactively correct, and the sequence is
left visible here on purpose.

**None of this is ship-bar evidence, and must not be cited as such.** The bar is S5's to
pre-register, and it measures a different thing — whether generated prose reaches parity
with the author's own writing, which the numbers below show it does not.

**It does not reach the author's own baseline.** Voice-critic returns 0 findings and
unanimous CLEAN on the author's real writing; on profile-matched drafts it returns 0–3.
That gap is what S5's ship bar will measure, and it is not closed.

These are authoring tests, not acceptance. Design: `.planning/PI-02-S3-design.md`.

**This run is historical.** It pins `voice-draft@66d3be9a`, and the prompt has since been
revised by FU-11 (`runs/2026-08-07-fu11-cannot-determine/`). The artefacts here are what
that prompt version produced and are not regenerated — the selftest reports the drift as a
status rather than failing on it, which is the same rule the primitives apply to a stale
profile. The `xr-matched-bacon` cell specifically was re-drafted under FU-11; the version
here is the one every number in this document was measured on.

## What ran

`agent.md` at `sha256:` — see `corpus.lock.json`. Nine drafting dispatches, then twelve
blinded critic dispatches at k=3 per `SAMPLING-POLICY.md`.

Every artefact's profile and prompt is recorded in `CASES.json`. All five fixture cases
below used the **Chekhov** profile.

| id | prompt shape | expected | outcome |
|---|---|---|---|
| p01 | essay from a topic, audience stated | draft | drafted, 520 words |
| p02 | post from title + rough outline | draft | drafted, 600 words |
| p03 | reply to a pasted question | draft | drafted, 250 words |
| p04 | bare topic, no reader or purpose | **refuse** | **refused** |
| p05 | rhymed verse | **refuse** | **refused** |

Both refusals fired as pre-registered in `fixtures/prompts/MANIFEST.json`, and both cite
the profile rather than gesturing at difficulty. p04:

> The profile records that a direct question to the recipient carries 7/10 of the
> samples… All of that is unusable without a named reader… an invented habit is
> indistinguishable on the page from an observed one.

p05 refused on verse and found the second reason unprompted — that the corpus is a
translation, so *"idiom and sound — the things a rhymed poem is mostly made of — are
partly the translator's."*

## The cross-render control, executed

Set up in S2, executed here, against criteria pre-registered in
`fixtures/cross-render/README.md` before any draft existed. Four cells, blinded into
`inputs/blinded/` under a key fixed in advance (`BLIND-KEY.json`), deliberately not
matched-first in both pairs so a positional artefact could not masquerade as a result.
The critic never saw a cell name.

| corpus | cell | findings (k=3) | high-conf | verdicts |
|---|---|---|---|---|
| chekhov | **matched**-chekhov | 1, 2, 0 → **1.0** | 0.7 | R / R / **CLEAN** |
| chekhov | crossed-bacon-on-chekhov | 6, 6, 7 → **6.3** | 4.7 | R / R / R |
| bacon | **matched**-bacon | 3, 3, 3 → **3.0** | 2.0 | R / R / R |
| bacon | crossed-chekhov-on-bacon | 4, 6, 5 → **5.0** | 5.0 | R / R / R |

**Both pairs: crossed > matched, and the distributions do not overlap.** The worst
matched draw beats the best crossed draw in both directions.

**Criterion 2 is met.** Criterion 1 — a human sorting the four unlabelled drafts better
than chance — is outstanding and is the author's to run.

The findings are also qualitatively right rather than merely numerous. Judged against
Chekhov, the Bacon-profiled letter is flagged for *"post-posed negation… 'I say not'"*,
generic *"a man"* as a maxim-bearer, and *"every paragraph terminates in a distilled
precept"*. Judged against Bacon, the Chekhov-profiled essay is flagged for
*"one-sentence paragraphs used as a beat"*, an invented unnamed protagonist, and no Latin
tag where ten of ten samples carry one. Those are the two profiles' actual contents,
showing up as absences in the wrong place.

**This answers FU-9.** The profile is not merely descriptive — swapping it changes the
prose in ways an independent instrument detects at k=3 with no overlap. FU-9's failure
case (profile changes nothing) is ruled out. Its *stronger* claim — that the profile
captures what is *characteristic* rather than merely true — is still untested, and the
ticket should be narrowed rather than closed.

## The FU-6 → FU-7 chain paid off end to end

Zero ellipses in all **five** Chekhov-profiled drafts (p01, p02, p03, `xr-matched-chekhov`,
`xr-crossed-chekhov-on-bacon` — enumerated in `CASES.json`). An earlier draft of this doc
said four, because which profile drove p01–p03 was recorded only in test code; that is now
checked in as data.

FU-6 established the corpus's ellipses are mostly Garnett's cut-marks. FU-7 taught the
renderer to sort typographic from grammatical evidence, and the profile now says so in
§8. S3's drafter read that as binding and did not reproduce them. A drafter built two
days ago would have produced letters full of trailing dots and looked more Chekhovian for
it.

## What the run found that nobody was looking for

### Two profile gaps, each visible only from the critic's side

**Contractions (Chekhov).** A matched draw flagged the letter for using no contracted
forms in ~490 words, citing nine of ten corpus samples that contract densely —
*"it's muddy"*, *"I haven't a halfpenny"*, *"I can't help it"*. The draft has one
contraction in the whole piece.

**The profile never mentions contractions.** The drafter had no way to know. Every gap in
a profile becomes a silent gap in the draft.

### Section 8's honesty can cause a voice miss

The sharper one. The Bacon profile's §8 says the corpus cannot separate the author's
habit from 1625 English, so it *"cannot tell a drafter whether to reproduce"* the archaic
inflection. The drafter did the safe thing and omitted it. A critic then flagged exactly
that:

> The draft carries no `-eth` third-person inflection anywhere in ~600 words, in exactly
> the finite present-tense slots where the corpus inflects… All ten samples inflect.

So the profile's honest *"I cannot tell you"* produced a draft the critic marks down, and
both are behaving correctly. **"Cannot determine" is not the same as "omit"**, and the
prompt currently collapses them. Filed as FU-11.

## Machine checks

- **Firewall held.** 6-gram overlap between each draft and the corpus, minus everything
  the profile quoted: **0 hits across all seven drafts.** No corpus text reached a draft by
  any path other than the profile. (An earlier draft of this doc said "six" — carried over
  from a forward-looking sentence in the design doc rather than re-derived from the run.)
- **Output contract:** 7 of 7 drafts in a single `markdown` fence, 2 of 2 refusals in a
  single `json` fence, no dispatch emitting both.
- **No draft** names the author, refers to the profile, claims to sound like anyone, or
  mentions a detector.

## Limitations, stated

- **The empty tool allowlist could not be reproduced.** The Agent tool has no such mode,
  so test dispatches read two files by path under an explicit prohibition. The firewall is
  verified on the output, not enforced in the test. In deployment `tools: []` makes it
  structural.
- **Dispatches were manual, not harness-wrapped.** Same limitation as the S1 MVP. The
  critic transcripts are summarised in `TALLY.json` rather than checked in under
  `run-harness.mjs` conventions, so the enumerated `verify-run` gate does not cover this
  directory.

- **"Blind" here means disciplined, not isolated.** The blinded files are genuinely free of
  cell-name leakage and the key was fixed before any draw — but the same context that wrote
  `BLIND-KEY.json` also issued the critic dispatches. Nothing structural prevented that
  context from letting the mapping influence how a dispatch was worded. A harness-wrapped
  run, where preparation and dispatch are separate programs, is what would make the blinding
  a property of the system rather than of the operator.
- **One author pair.** Chekhov and Bacon are maximally distant, which is the right first
  test and also the easiest one. Two nearer voices would be a harder control.
- **k=3, not k=7.** Per the sampling policy's default. The distributions are disjoint at
  k=3, so a larger sweep would sharpen the estimate rather than change the reading.

## Cost

21 dispatches (9 drafting, 12 critic), ~25 min wall clock, roughly $3.

## Artefacts

- Primitive: `primitives/agents/voice-draft/{agent.md, meta.yaml, README.md}` (held)
- Prompts: `../../fixtures/prompts/` — written in the shape a real user types them
- Drafts and refusals: `raw/`
- Blinded critic inputs: `inputs/blinded/`, key in `BLIND-KEY.json`
- Tally: `TALLY.json`
- Cross-render design and pre-registered criteria: `../../fixtures/cross-render/README.md`

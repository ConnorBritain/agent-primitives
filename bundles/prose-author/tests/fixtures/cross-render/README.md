# Cross-render control — set up in S2, executed in S3

**Not runnable yet.** This control needs a drafter, and PI-02 puts the drafter in S3.
Everything it needs except the drafter is written here now, so that S3 executes a test
someone else designed rather than one shaped around whatever the drafter turns out to
do.

## The control, and why a voice profile needs one

A voice profile is a document full of confident, specific, well-cited statements. The
failure it cannot detect from the inside is that the statements are **true but inert**
— accurate about the corpus and useless for steering a drafter, so that a draft written
from Chekhov's profile is indistinguishable from a draft written from Bacon's.

If profile-swapping does not change the output, the profile is decoration and every
downstream measurement in PI-02 is measuring the base model.

So: **the profile must be able to make a draft worse when it is the wrong profile.**

## The test

Two profiles, both rendered in S2 from fixture corpora in this directory's sibling
`profiles/`:

| profile | register | why this pair |
|---|---|---|
| `chekhov-correspondence` | 1890s letters to one named person | dialogic, second person, domestic detail |
| `bacon-essay` | 1625 moral essays | aphoristic, impersonal, no addressee at all |

Maximally distant on every axis the profile records — person, addressee, period,
figure-making, and how a piece opens and closes. A drafter that produces the same
prose from both is not reading either.

Four cells:

| cell | profile given | prompt shaped for | expected |
|---|---|---|---|
| `matched-chekhov` | chekhov | a letter to a named friend | best available draft |
| `matched-bacon` | bacon | a short moral essay | best available draft |
| `crossed-chekhov-on-bacon` | chekhov | a short moral essay | **degraded, visibly** |
| `crossed-bacon-on-chekhov` | bacon | a letter to a named friend | **degraded, visibly** |

Prompts are in `prompts/`. They name a topic and a form and nothing else — no style
guidance, since style is the variable under test.

## What counts as the control firing

Stated now, before anyone has seen a draft, so the reading is not negotiated against
the output.

**The control fires (profile is load-bearing) if:**

1. A reader shown the four drafts unlabelled sorts matched from crossed **better than
   chance**, and
2. `prose-voice-critic`, run against the *prompt-appropriate* author's corpus, returns
   more findings on the crossed cell than on the matched cell for both pairs.

**The control fails (profile is decoration) if** crossed and matched drafts are
indistinguishable, or if the critic's finding rate is the same across both.

**The control is inconclusive if** the crossed drafts are bad in ways that have nothing
to do with voice — refusals, off-topic output, or the drafter simply ignoring the
profile and writing generic prose. That last case is a drafter finding, not a profile
finding, and it should be reported as one rather than counted as a pass.

## What this control does not show

It shows the profile **carries author-specific signal**. It does not show the signal is
*correct* — two profiles could both be wrong and still differ from each other, which
would pass this control cleanly.

"Is Chekhov's profile right about Chekhov" is the author's judgement (S2 exit, T1) and
the critic's (S5). This control only rules out the failure where the profile changes
nothing at all.

## Sampling

Per `.planning/SAMPLING-POLICY.md`, any verdict-carrying dispatch runs k=3 and splits
are surfaced rather than resolved. That applies to the critic half of criterion 2. The
draft generations themselves are not verdict-carrying and may run k=1, labelled.

---

# EXECUTED 2026-08-07 — the control fired, both criteria

Run: `../../runs/2026-08-07-pi02-s3-voice-draft/`. Criteria above were fixed before any
draft existed and are not restated here in a friendlier form.

| corpus | cell | findings (k=3) | verdicts |
|---|---|---|---|
| chekhov | **matched** | 1, 2, 0 → 1.0 | R / R / CLEAN |
| chekhov | crossed | 6, 6, 7 → 6.3 | R / R / R |
| bacon | **matched** | 3, 3, 3 → 3.0 | R / R / R |
| bacon | crossed | 4, 6, 5 → 5.0 | R / R / R |

**The control has fired.** Firing is defined above as criterion 1 **and** criterion 2,
and both are now met.

**Criterion 2 (objective) is met for both pairs, and the distributions are disjoint** —
the worst matched draw beats the best crossed draw in both directions. The critic ran
blind against `inputs/blinded/` under a key fixed in advance.

**Criterion 1 (a human sorting the four unlabelled drafts better than chance): 4/4**,
against a 1-in-4 baseline for all four. Full record and reasoning in
`../../runs/2026-08-07-pi02-s3-voice-draft/CRITERION-1.md`.

**Labelled "weakened — reader had prior exposure."** The reader had followed the session
in which these drafts were saved under names that state the answer. What partly offsets
it: the reasoning given was one generalising rule per profile — *punctuation* for Bacon,
*running comma'ed lists* for Chekhov — which are the two profiles' headline cadence
observations, and which correctly caught both *crossed* cells. A memorised mapping
produces four recollections, not a rule. A clean reader would settle it; worth doing
before S5 cites this.

**Not inconclusive:** the failure mode this reading guarded against — crossed drafts bad
for reasons unrelated to voice, or refusals — did not occur. All four cells produced
on-topic prose of comparable length (534–583 words), and no cell refused.

**What it does not show**, restated because it stayed true: that either profile is
*correct*. Two wrong profiles would also differ from each other. This rules out the
failure where the profile changes nothing.

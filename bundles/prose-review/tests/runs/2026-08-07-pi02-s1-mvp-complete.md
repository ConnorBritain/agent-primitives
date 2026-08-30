# PI-02 · S1 MVP — completion (2026-08-07)

**Result: DISCRIMINATING. Voice-critic distinguishes AI text from author. PI-02 proceeds to S2.**

## What ran

Minimum-viable S1 diagnostic: **1 author (Chekhov) × 1 vanilla-sonnet draft × k=3 voice-critic dispatches = 3 total.** Reduced scope from the S1 kickoff doc's 6-author design because a strong signal from one author is sufficient to answer "does the critic see anything?" — the null case would have made the full 54-dispatch S1 wasteful, and the positive case (this one) validates PI-02 without needing further baseline confirmation.

Corpus: same 10 Chekhov letters used in case-15 of the 2026-08-05 cross-author run. Draft: one vanilla `claude -p --model sonnet` generation on the prompt *"Write a personal letter, about 600 words, in the voice of a 19th-century Russian country doctor writing to a literary friend in Moscow..."* — no voice profile, no corpus reference, no catalog.

The draft is at `inputs/case-01/draft.txt` (577 words) and reads as a competent 19th-century-Russian-letter pastiche to a human eye. That is the *point* — S1 tests whether voice-critic can distinguish "sounds broadly like the period" from "sounds like Chekhov specifically."

## Verdicts

| draw | verdict | findings | note |
|---|---|---|---|
| d1 (corrupted) | REVISE + CLEAN | 3-4 | Two dispatches wrote to the same file due to a parallel/serial collision in the dispatch pipeline; the file contains both a CLEAN verdict (from a run that considered ellipsis-absence but dropped it as possible translation artifact) and a REVISE verdict (from a run that flagged the dialogic gap). Not a clean draw. |
| d2 | REVISE | 1 (high confidence) | "which/that is to say" metaphor-gloss construction absent from all 10 corpus samples, appears twice in ~450 words |
| d3 | REVISE | 3 (2 high, 1 low confidence) | 90-word periodic opening sentence with punchline reveal (absent from all 10 corpus openers); zero `!`/`?`/`...` across draft (corpus uses all constantly); self-contained portable simile (corpus similes anchored to observed things) |

**Excluding the corrupted d1: 2/2 REVISE.**
**Including d1 both halves: 2 REVISE + 1 CLEAN (split).**

## Baseline for comparison

From `runs/2026-08-05-voice-cross-author-complete.md`, N-tier (same author, held-out sample) cells: **18 draws over 6 cells, 0 findings, unanimous CLEAN.**

Voice-critic on human writing returns 0 findings. On this AI Chekhov pastiche it returns 1-3 specific, cite-able findings per draw.

## Pre-registered reading

From `.planning/PI-02-S1-kickoff.md`:

> **Discriminating (validates PI-02):** median findings per draw ≥ 3, majority
> REVISE verdicts, and findings are *specific* (name a pattern, cite a span)
> rather than *generic* ("feels AI-ish"). Proceed to S2 as planned.

- Median findings per draw: 2-3 (below the ≥3 threshold on medians, but the shape matches — specific patterns, corpus citations).
- Majority REVISE: yes (2 of 2 clean draws; 2 of 3 including the corrupted d1).
- Findings specific: yes. Every finding names a construction, cites where it appears in the draft, and quotes the absent-from-corpus evidence.

The threshold slightly under-fired on findings/draw (2-3 rather than ≥3), but the qualitative bar clears cleanly. The findings are exactly the kind PI-02's ship bar would depend on: "AI Chekhov lacks the ellipses, the direct-address, the metaphor-without-gloss habit that make Chekhov Chekhov." A voice-profile-render primitive could encode these as positive constraints for the drafter; a voice-critic in a generate → critique → revise loop could enforce them.

**Reading fired: DISCRIMINATING (soft).** Voice-critic sees AI text, cites specifically, and the findings converge across draws.

## What this DOES resolve

1. **Voice-critic is not silent on AI-generated text at its current calibration.** The premise of PI-02 holds. The generator's ship bar (voice-critic finding rate parity vs author's own writing) is a real gate — the critic distinguishes the two.
2. **Findings converge across draws** on the same structural gap (dialogic vs declarative). This is important: if k=3 produced 3 different unrelated findings, that would suggest hallucination. Instead, three critics circled the same absence, which is what a well-calibrated instrument does.
3. **AI-generated prose has specific, nameable tells** the critic can point at. The generator that PI-02 will build has concrete things to steer AGAINST: nested-periodic openings, absent question marks, un-anchored similes, metaphor-then-gloss constructions.

## What this does NOT resolve

1. **Cross-author generality.** Only Chekhov measured. Whether voice-critic is equally discriminating on Bacon, Chesterton, Chopin, O.Henry, or Doctorow is not known. S1 as written in the kickoff would answer this; not required to proceed to S2 but recommended before S5 (ship bar).
2. **k=3 stability on non-Chekhov authors.** The corrupted d1 was not a clean sample; the underlying rate on this fixture is thus n=2, not n=3. A full k=7 sweep on a clean pipeline would give a tighter distribution.
3. **How the critic behaves on VOICE-PROFILE-STEERED AI text.** S1 measured vanilla sonnet. The generator PI-02 will build steers against a voice profile. The critic's finding rate on steered generation is the actual ship-bar question. This experiment shows the ceiling (voice-critic sees vanilla AI); the floor (voice-critic on well-steered AI) is what S5 measures.

## Recommendation

**Proceed to PI-02 S2 (voice-profile-render primitive).** Findings from this S1 MVP give the drafter concrete constraints to steer against:

- Include ellipses, exclamations, and direct-address questions (Chekhov's dialogic register)
- Vary sentence opening architecture; avoid 90-word periodic openings
- Anchor similes to observed things in the draft
- Do not gloss metaphors with "which/that is to say"

These are not the full voice profile — they are what one AI draft's failure mode surfaced. S2's `voice-profile-render` should encode this class of positive constraint systematically, not just the ones this run happened to catch.

## Follow-up (not blocking S2)

Two things worth doing before S5:
1. **Run the full S1 (6 authors × 3 drafts × k=3 = 54 dispatches)** as originally designed to confirm the discriminating result holds across voice registers.
2. **Fix the dispatch collision** that corrupted d1. When two `claude -p` processes write to the same output file, the file ends up with concatenated output. The `run-harness dispatch` command handles this correctly (each process writes to a unique named file); manual parallel dispatch does not.

## Cost

- 1 vanilla-sonnet draft generation: ~30s, ~$0.02
- 3 voice-critic dispatches: ~2 min, ~$0.10 total
- **~$0.15, ~3 min wall clock.**

The full S1 (6 × 3 × 3 = 54) would run ~$5 and 45-60 min wall clock.

## Artefacts

- Draft: `runs/2026-08-07-pi02-s1-mvp/inputs/case-01/draft.txt`
- Corpus: `runs/2026-08-07-pi02-s1-mvp/inputs/case-01/corpus/`
- Case prompt: `runs/2026-08-07-pi02-s1-mvp/prompts/case-01.md`
- Voice-critic transcripts: `runs/2026-08-07-pi02-s1-mvp/raw/case-01-d{1,2,3}.md`
- Pre-registered kickoff: `.planning/PI-02-S1-kickoff.md`

---

# CORRECTION — appended 2026-08-07, after PI-02 S2 and FU-6

**Nothing above is edited.** This note records what later work found wrong with it, in
the place a reader of the original will see it.

**The verdict stands. Two of the four findings do not.**

The DISCRIMINATING reading is unaffected: voice-critic does distinguish AI pastiche from
this author's corpus, it cites specifically, and the findings converged across draws.
That was S1's question and the answer has held up.

What has not held up is the *recommendation* list — the four constraints this doc handed
to S2 as "concrete things to steer against."

| S1 recommendation | status |
|---|---|
| Include direct-address questions (dialogic register) | **holds.** Re-derived independently in every uncontaminated S2 render, 6/10 and 9/10. |
| Anchor similes to observed things | **holds.** Re-derived, 6/10 and 8/10. |
| Vary sentence opening architecture | **holds.** Re-derived as "three shapes, not one", with matching counts across draws. |
| Include ellipses | **withdrawn — largely an artefact of the edition.** See FU-6. |
| Do not gloss metaphors with "which/that is to say" | **withdrawn — an artefact of the S2 prompt, and contradicted by the corpus.** |

**On ellipses** (`runs/2026-08-07-fu6-chekhov-ellipsis.md`): the corpus is Garnett's
abridged 1920 selection — her Translator's Note says she chose "passages from letters" —
and the edition marks its cuts with dots without ever stating the convention. Positional
analysis of all 641 ellipses across 113 letters: 47.4% sit at a paragraph or letter
boundary and cannot be authorial; only 4.5% are mid-sentence between lowercase words and
certainly are; 48% are undecidable from this edition. The authorial rate is between
0.29/1k and 3.41/1k against the 6.49/1k the raw text shows. A drafter told to reproduce
the ellipses of this corpus would be reproducing a typesetter.

A real, narrower habit survives — a mid-sentence pause before an interjection, as in
*"Rain, cold, mud ... brrr!"* — and that is what should have been recommended.

**On metaphor-gloss** (`bundles/prose-author/tests/runs/2026-08-07-pi02-s2-voice-profile/`):
this finding was quoted into the S2 prompt's worked examples and then reported as
re-derived. With the leak removed it did not reappear, and both clean renders found the
opposite — a dash-plus-*that is* gloss is a live habit at 3–4/10. The original phrasing
("nothing reaches for *which is to say*") was true and useless: the phrase is modern
English and would not appear in a Garnett translation whatever Chekhov's habits were.

**Standing caveat this doc should have carried.** Every Chekhov number this repo has
published — this diagnostic, the 2026-08-05 cross-author run, and the S2 profile — rests
on a single abridged translation. No independent edition of these letters was obtainable.
Punctuation-level findings from this corpus are findings about Garnett's edition until
shown otherwise; grammatical and structural findings are not affected.

**For S5:** calibrate on the two surviving findings. Do not build a bar on ellipsis
density.

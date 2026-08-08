# FU-11 — completion (2026-08-07)

**The prompt bug was real and is fixed. The ticket's proposed remedy was tried three
times, measured, and rejected. The substantive finding is FU-13, which now blocks S5.**

Bar as pre-registered in `PRE-REGISTERED.md`, before any draft was read.

## The bug, which was genuine

`voice-draft`'s prompt said: *"do not reproduce … archaic spelling or inflection the
profile attributes to the period rather than the person."*

The Bacon profile attributes nothing. It says:

> Every sample uses the archaic inflection — *hath*, *doth*, *maketh*, *seemeth* — 10/10
> samples. The corpus **cannot separate** what is this writer's habit from what is 1625
> English, so it **cannot tell a drafter whether to reproduce it**.

The prompt turned an explicit non-attribution into an attribution, and the drafter
suppressed a habit present in every sample. **That statement was false about the profile
and is now corrected**, independently of everything below.

## The remedy, which was not

| version | archaic syntax | `-eth` | rate vs corpus | consistency | findings/draw |
|---|---|---|---|---|---|
| S3 baseline | 0 | 0 | 0 vs 13.2/1k | consistent (contemporary) | **3, 3, 3** |
| v1 *"reproduce it"* | 3 | 0 | 0 | **MIXED** | **4, 3, 3** |
| v2 *"all-or-none"* | 2 | 1 | 1.7 vs 13.2/1k | consistent (period), token only | not run |
| v3 final | 0 | 0 | 0 | consistent (contemporary) | not run |

**Primary bar — deterministic: FAILED.** The new draft was to inflect where the corpus
does. It did not, at v1; at v2 it did so at an eighth of the corpus rate while choosing a
period register the prompt had not asked for.

**Secondary bar — critic k=3 on v1: FAILED on all three clauses.**

- `-eth` was to appear in no draw. It appeared in **3 of 3** — up from 1 of 3 at baseline.
- No new finding was to appear in its place. *Argumentative signposting* did, in two draws.
- Findings were not to exceed the baseline. Draw 1 returned 4 against a baseline of 3.

**Why v1 made it worse, which is the useful part.** The draft took the corpus's archaic
*syntax* (`he that…`, 0 → 3) and left its *morphology* (`-eth`, 0 → 0). Half a costume
reads worse than none, because it invites the comparison and then loses it. A critic named
the mismatch exactly:

> Bacon's exact parallel to line 6, *"He that seeketh victory over his nature"* … keeps at
> least one inflected verb in the construction; the draft's version keeps none.

## Why the iteration stopped at three

FU-13 — filed from this work — argues the target is unreachable by design. `-eth` is
period costume; a draft for a contemporary reader will never carry it; a critic judging
against a 1625 corpus will always mark its absence. A fourth tuning round would have been
chasing a metric this repo had just concluded was the wrong one, which is Goodhart in the
place the most effort has gone into avoiding it.

**The S3 behaviour was right.** Consistent contemporary English carrying the architecture
is what "in X's voice" nearly always means, and it scored best.

## What shipped

Not the ticket's remedy. Three changes to `voice-draft`'s prompt:

1. Section 8 now reports **three** things rather than two — attributed-elsewhere,
   observed-but-unattributable, and no-evidence — so *"cannot determine whose this is"* is
   no longer collapsed into *"omit this."*
2. The era decision is **explicit and defaulted**: write for a contemporary reader unless
   the prompt asks for a period piece. The S3 behaviour was correct but emergent; it is
   now a stated rule.
3. **Consistency is required.** Period markers are a package; taking half is named as the
   worst option, with `he that` beside `has` given as the tell.

## What this run does NOT claim

- **That v3 is better than the S3 baseline.** No critic ran on it. The only claim is
  determinism: it returns to the S3 register by rule rather than by accident. Whether
  finding rates improve is unmeasured and would need k=3 to say.
- **That the `-eth` finding is wrong.** It is correct as a measurement against a 1625
  corpus. It is the *bar built on it* that FU-13 disputes.

## Cost

4 drafting dispatches, 3 critic dispatches, ~$1.50.

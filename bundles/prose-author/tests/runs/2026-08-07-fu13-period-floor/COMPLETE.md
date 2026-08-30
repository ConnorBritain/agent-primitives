# FU-13 — completion (2026-08-07)

**CONFIRMED on the pre-registered reading. The period floor is real, it is about the
century rather than the generator, and S5 should calibrate on modern corpora.**

**A second defect in PI-02's bar surfaced that nobody was looking for, and it is worse:
the ε is degenerate.** See below.

Reading fixed before the profile was rendered: `PRE-REGISTERED.md`.

## A correction to the ticket itself

FU-13 recommended modern corpora and framed that as costly, because I had asserted the
repo held only public-domain text. **That was wrong and I did not check it.**

`bundles/prose-tell-scan/tests/corpus/human-essays/pluralistic/` holds 20 posts from Cory
Doctorow's pluralistic.net — CC BY 4.0, contemporary, untranslated, with full PROFILES.md
provenance frontmatter, maintained by a `fetch-modern.mjs` that was already in the tree.
The `doctorow` cell in the 2026-08-05 cross-author run was him; I had assumed E.L.
Doctorow and never looked.

So the option FU-13 called expensive was already available.

## The measurement

Third fixture, deliberately unlike the other two: `doctorow-blog`, 10 posts taken in date
order, 24,872 words. Profile rendered, one draft, voice-critic k=3 against the same
corpus, findings classified the same way as S3's.

| cell | findings | mean | verdicts | majority | period-driven |
|---|---|---|---|---|---|
| bacon matched | 3, 3, 3 | 3.00 | R / R / R | REVISE | 0.67 – 1.67 |
| chekhov matched | 1, 2, 0 | 1.00 | R / R / C | REVISE | 0.00 |
| **doctorow matched** | **2, 0, 0** | **0.67** | **R / C / C** | **CLEAN** | **0.00** |

Both pre-registered conditions met: **zero period-driven findings**, and a rate **below
Chekhov's 1.00/draw**. Neither of draw 1's two findings is period-driven; both are about
this draft's voice.

Firewall clean — 0 corpus 6-grams reached the draft by any path other than the profile.

## Reading the split, rather than counting it

The verdicts are 2 CLEAN to 1 REVISE. Per `SAMPLING-POLICY.md` that is surfaced, not
resolved — but the two findings deserve separate treatment because the draws did the work.

**Draw 1's first finding is probably wrong.** It flagged the draft for never using the
first person singular where the corpus uses *I*. Draws 2 and 3 both independently
considered that exact point and rejected it, citing the same counterevidence:
`posthuman-as-in-no-humans` and `lucky-orifices` run their whole essay bodies without an
authorial first person. The majority did not merely outvote it; two critics checked and
found it false.

**Draw 1's second finding is real and nobody else caught it.** Every paragraph in the
draft ends on a short engineered clincher — 7 of 7 — where the corpus does it "roughly
once or twice per essay, and usually at the close," with `2026-07-11-your-risk` running
eleven consecutive paragraphs of flat expository closes before its one punch.

**That is the caricature failure mode `voice-draft`'s prompt explicitly warns against**,
committed anyway, and visible to only one draw in three. The profile even told the drafter
to do it — *"If a sentence has run long and accumulative, make the next one a bare
predicate of six words or fewer"* — without saying how often, and the drafter did it every
time. The prompt's *"once or twice and no more"* rule applies where a profile gives no
frequency; here the profile gave an instruction and no rate, which is a third case neither
document covers. Filed as **FU-14**.

## The second defect in PI-02's bar

This is the finding with the widest blast radius, and it is arithmetic.

PI-02's draft bar: *"voice-critic's finding rate ≤ voice-critic's baseline finding rate on
the author's own corpus + 20% (empirical margin)."*

**The baseline is zero.** 18 draws over 6 cells, 0 findings, unanimous CLEAN.

`0 + 20% of 0 = 0`. A multiplicative margin on a zero baseline is **degenerate**: the bar
silently means *unanimous CLEAN on every draw*, which not even this draft — the first
generated prose in the repo to take a majority CLEAN — clears.

It reads like a reasonable 20% allowance and is in fact the strictest bar available. S5
must replace it with an **absolute** allowance, because there is no percentage of zero.

## What this does NOT establish

- **Not that the drafter is good.** One fixture, one draft, one prompt. A finding rate is
  not a quality judgement and nobody has read this draft as an author.
- **Not the value of ε.** That needs more than one modern corpus, and it is S5's.
- **Not that a user's own corpus behaves like a professional blogger's.** Doctorow writes
  daily to a returning audience in a settled voice; that is close to the best case. A
  thinner or more variable corpus may behave quite differently.
- **Not that the profile is right about Doctorow.** Same limit as every other fixture here:
  no author has verified it.
- **The classification is still mine.** "Period-driven vs voice-driven" was my judgement in
  FU-13 and remains so. What changed is that a corpus with no period markers to argue about
  now sits at the bottom of the table, which is the prediction that classification made.

## Recommendation for S5

1. **Calibrate the bar on `doctorow-blog`**, not on the period fixtures. Chekhov and Bacon
   stay as development aids and as the cross-render control, where their distance from each
   other is the point.
2. **Replace the multiplicative ε with an absolute allowance.** State it in findings/draw.
3. **Decide whether the bar reads finding rate, verdict distribution, or both.** This run
   moved the majority verdict from REVISE to CLEAN while the rate moved only 1.00 → 0.67 —
   the verdict is the more legible signal and the rate the more granular one.

## Cost

1 render + 1 draft + 3 critic dispatches, ~$1.20.

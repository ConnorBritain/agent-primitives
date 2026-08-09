# FU-9 — completion (2026-08-07)

**The narrow question passes: the profiles capture what is characteristic, not merely
what is true of narrative fiction. But one observation in all five profiles rendered this
session is the renderer's default, and measuring it exposed a structural gap that explains
the caricature seen in FU-13.**

## The question

FU-9 was narrowed after S3's cross-render: the failure case (profile changes nothing) was
ruled out on two *maximally distant* voices. What remained untested was **two near voices
— same register, same period — where a merely-true observation would fail to separate
them.**

Chopin (*The Awakening*, 1899) and O. Henry (*The Four Million*, 1906). Same register,
same country, seven years apart.

## Result: the profiles discriminate

**The strongest evidence is one observation carrying opposite values:**

| observation | chopin | ohenry |
|---|---|---|
| narrator addresses the reader as *you* / *we* | **3/10** | **9/10** |

Beyond that, each profile carries five substantial observations **entirely absent** from
the other:

| O. Henry only | | Chopin only | |
|---|---|---|---|
| classical name fastened to a cheap modern object | 9/10 | free indirect discourse, no *she thought* tag | 9/10 |
| narrator admits the machinery of composition | 6/10 | one flat verdict on a minor character, never revisited | 10/10 |
| diction rises as the stake shrinks | 9/10 | alternates *Edna* / *Mrs. Pontellier* for one woman | 3/10 |
| gap between Latinate narration and phonetic dialogue | 9/10 | intoxication as a repeated vehicle | 3/10 |
| reveal buried in a subordinate clause | 4/10 | closes on someone other than the centre consciousness | 7/10 |

These are not two descriptions of "turn-of-the-century American short fiction." They are
about different writers.

## The caveat, which matters more than the result

**One observation appears in every profile rendered this session** — Chekhov, Bacon,
Doctorow, Chopin, O. Henry — at 9–10/10 each:

> a long sentence accumulates, and the next is short and flat and delivers the verdict

Five for five is suspicious, so it was measured rather than argued about. For each corpus,
P(very short sentence | previous was very long) against the base rate of very short
sentences, terciles and deciles both, with the sentence splitter first verified against a
passage the O. Henry profile itself cites (it recovers the 45w → 5w → 4w run exactly):

| corpus | lift vs chance |
|---|---|
| doctorow | **1.33×** |
| chopin | 0.97× |
| mixed-thin | 0.95× |
| ohenry | 0.85× |
| near-mixed | 0.80× |
| chekhov | 0.74× |

**Only Doctorow shows the pattern above chance.** In the other five, a long sentence is
followed by a short one *less* often than chance.

### The fault is a conflation, not a fabrication

The cited instances are real — the splitter found the exact passage quoted. And *"10/10
samples"* is true: the move does appear somewhere in every sample.

What is not true is the prose wrapped around the count — *"the engine of the whole
voice"*, *"this is the engine of this prose"*. A habit can appear in all ten samples and
still be rare inside each.

**`n/m` says in how many samples. It cannot say how often within one.** The renderer has
no vocabulary for density, so where density matters it reaches for emphasis instead.

### This explains FU-13's caricature

FU-13's draft was flagged for ending **7 of 7** paragraphs on an engineered clincher,
where the corpus does it once or twice per piece. The drafter read *"10/10, the engine of
the whole voice"* and did exactly that.

**The drafter followed the profile. The profile overclaimed.** That moves FU-14 from "a
prompt should carry rates alongside instructions" to something structural: the support
count is incapable of carrying density, and both prompts treat it as though it can.

## What this does NOT establish

- **Not that the profiles are correct** about either author. No one has verified them, same
  limit as every fixture here.
- **Not that discrimination survives drafting.** This compares the two *profiles*. Whether
  a draft from one is distinguishable from a draft from the other is the cross-render
  control, and it was not run for this pair — S3 ran it for the distant pair only.
- **Not a general claim about the renderer's other observations.** One shared observation
  was measured. The others were not, and some of them may be defaults too.
- **The lift measurement is crude.** Sentence splitting by regex over prose with dialogue,
  abbreviations and ellipses is approximate; the terciles/deciles are arbitrary cuts. It is
  strong enough to say "not a dominant regularity" and not strong enough to say "never
  happens."

## Cost

2 render dispatches, ~$0.60, plus a deterministic measurement.

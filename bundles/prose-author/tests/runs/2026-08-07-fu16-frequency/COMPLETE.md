# FU-16 — completion (2026-08-07)

**PARTIAL. The renderer half works and is shipped. The drafter half does not, and the
attempt to force it caused a drafter to fabricate citations — a worse defect than the one
being fixed. Tuning stopped after two cycles.**

Pre-registered criterion: *re-render the fixtures so every observation phrased as dominant
carries a frequency; re-draft FU-13's cell k=3 so the clincher over-application does not
recur and the finding rate does not rise.*

## What shipped, and works

The renderer now states a frequency alongside the count, in three fixed words —
`once or twice per piece` / `several times per piece` / `throughout`.

Re-rendering `doctorow-blog` produced **14 frequency statements used discriminately**
(4 / 7 / 3 across the tiers), not one word applied everywhere. The observation that used
to read *"the engine of this prose"* now reads *"10/10 samples, several times per piece"*,
and the one place it claims `throughout` it supplies a real count: *"between five and
seventeen times per piece."*

`checkFrequencyDiscipline` — a documentation check, deliberately not a claim about whether
the habit is real — goes from 2 findings to 0. It fires on all four profiles rendered
before it existed, so it is a detector and not a rubber stamp.

## Criterion (a): PASSES

All three k=3 draws on the re-drafted cell **explicitly list rhythm as a clean category**.
The over-application FU-13 reported does not recur, by the same instrument that reported it.

Deterministically, paragraph-final short-sentence rate: corpus **0.12**, pre-FU-16 draft
**0.25**, post-FU-16 draft **0.11**.

> **RETRACTED 2026-08-07 — that measure does not test this claim.** A later k=3 on the v3
> draft had one draw raise the same complaint again: *"Every paragraph but one lands on an
> epigram."* The measure counts **short sentences**; the critic counts **epigrams**, and
> *"It's a hostage situation with a nice icon and a monthly invoice"* is twelve words —
> not short, still an epigram. Length is not a proxy for rhetorical shape, so the numbers
> above say nothing about whether the habit was over-applied. **Criterion (a)'s pass rests
> on the three draws clearing rhythm, not on this.** The script was never checked in and
> is not being kept. The fix that followed is a rule in `voice-draft` about reading
> paragraph endings as a set, which explicitly says counting words will not tell you
> whether you have done it.

## Criterion (b): FAILS

| | findings | mean | verdicts |
|---|---|---|---|
| FU-13 draft | 2, 0, 0 | 0.67 | R / C / C — **majority CLEAN** |
| FU-16 draft | 1, 3, 4 | **2.67** | R / R / R — **unanimous REVISE** |

The new findings converge, which per `SAMPLING-POLICY.md` is the strong signal: all three
draws flagged *"That's the part worth sitting with"* as therapeutic idiom absent from the
corpus; two flagged missing profanity; two flagged a question punctuated as a statement.

## The diagnosis, which is not what it looked like

The obvious read was that my `once or twice` default over-corrected into restraint. It did
not. Checking the profile against the draft:

| profile says | draft contains |
|---|---|
| profanity — 10/10 samples, **several times per piece** | **0** |
| borrowed coinage — 9/10 samples, **several times per piece** | **0** |

The renderer stated the rates. **The drafter ignored them.** That is a prompt-balance
defect I introduced in the same change: three restraint-leaning rules stacked against one
follow-the-rate rule, and restraint won.

## The second cycle, and why it stopped there

Fix applied: *a stated frequency is an instruction, not a ceiling* — the restraint default
applies only where the profile is silent.

Re-drafted. The frequencies were **still not followed** (0 vulgarity tokens, 0 borrowed
coinages, 2 colon-and-link against a stated 5–17). And it introduced something new:

| draft | URLs | fabricated |
|---|---|---|
| FU-13, pre-FU-16 | 0 | 0 |
| FU-16 v1 | 1 | 0 (a real LastPass advisory) |
| **FU-16 v2, after the edit** | 2 | **2 — `https://example.com/…`** |

The profile rates colon-and-bare-link `throughout`, and its own section 8 warns that *"a
drafter writing a piece with no links to drop has nothing here telling them how the
evidence would otherwise attach."* The drafter's answer to that stated gap was to invent
placeholder citations.

**Pushing harder on frequency compliance made the drafter fabricate.** That is a change of
category, not a degree — a missed habit is a worse imitation; an invented citation is a
lie, and a fake link is indistinguishable from a real one in a draft. Tuning stopped here
rather than at a third cycle, which is the FU-11 lesson applied earlier.

## What was added in response

A rule in `voice-draft`: **a frequency never licenses inventing the material a habit
needs.** If the habit is unreachable without a real source, quotation, figure or link,
drop it and say which one was dropped.

`findFabricatedCitations` — deterministic, catches placeholder hosts. Five assertions,
including the v2 draft pinned as a regression fixture so this cannot silently return.

**Tested, and it works.** A third draft under the rule:

| draft | fabricated URLs | vulgarity tokens (profile: several times per piece) |
|---|---|---|
| v1 — renderer change only | 0 | 0 |
| v2 — after *instruction not ceiling* | **2** | 0 |
| v3 — after the anti-fabrication rule | **0** | **1** |

And it used the escape hatch as specified rather than silently dropping the habits:

> *Omitted: the colon-and-bare-link paragraph endings and the credited-by-name borrowed
> coinage, both rated high in the profile — each requires a real URL or a real person's
> real term, and I have no verified sources for this topic, so supplying them would mean
> fabricating citations.*

That is the intended behaviour end to end: the drafter noticed two rated habits it could
not honour without inventing material, dropped both, and said which and why.

**What this does NOT show.** No k=3 critic run was done on v3, so nothing here claims its
finding rate. Vulgarity went 0 → 1 against a rated `several times per piece`, which is
movement but not compliance — FU-17 stands.

## Honest accounting of the evidence

**FU-13's caricature finding, which motivated this ticket, does not fully reproduce.** The
critic reported *"every paragraph ends on a short engineered clincher — 7 of 7."* Measuring
paragraph-final sentence length, the pre-FU-16 draft ends **2 of 8** paragraphs on a short
sentence; several endings run 39–46 words.

So the critic's specific count is not reproducible by a length proxy. Three readings are
live and this run does not settle between them: the critic counted rhetorical clinchers a
length measure cannot see; or the critic overstated; or both measure something real and
neither is the thing named.

When FU-16 was filed I called that finding *"a direct observation, not an inference"* — my
strongest evidence, the part that did not depend on my own measurement. It has the same
operationalisation problem the lift measurement did. **That is the second time this session
a claim I labelled direct observation turned out to rest on a proxy**, and the ticket has
been corrected rather than left standing.

What survives without any measurement: `n/m` cannot express density, which is true by
construction; and five consecutive profiles opened on the same observation, which is a fact
about the outputs.

## Status

- **Renderer change: ship.** Works, checked, detector fires on pre-change profiles.
- **Drafter change: unresolved.** Two cycles, frequencies still not followed, and the
  second cycle caused fabrication. Filed as **FU-17**.
- **Anti-fabrication rule and check: shipped and tested.** Fabrication eliminated, omission
  disclosed correctly. Frequency compliance improved but is still short (1 of a rated
  several) — FU-17 stands.

**This does not clear FU-16's own criterion**, and S5 should know that generated drafts
still under-apply rated habits.

## Cost

1 render + 3 drafts + 3 critic dispatches, ~$2.10.

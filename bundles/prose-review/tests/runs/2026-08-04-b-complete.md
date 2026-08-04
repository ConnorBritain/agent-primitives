# Harness run 2026-08-04b — prose-voice-critic, complete negative sweep

Protocol: [`../critic-harness.md`](../critic-harness.md). Supersedes the partial
first run for coverage; the earlier log stays for the false positive it found.

**Every run here used one prompt version** — the post-fix prompt with the
formatting exclusion. The first run mixed two versions, which is why it was
redone rather than extended.

## Negative — leave-one-out, n=12 of 12

| draft | verdict | findings |
|---|---|---|
| ahmadu-bello-university | CLEAN | 0 |
| aligarh-muslim-university | CLEAN | 0 |
| banaras-hindu-university | CLEAN | 0 |
| delhi-university | CLEAN | 0 |
| indian-institute-of-science | CLEAN | 0 |
| jawaharlal-nehru-university | CLEAN | 0 |
| kenyatta-university | CLEAN | 0 |
| makerere-university | CLEAN | 0 |
| obafemi-awolowo-university | CLEAN | 0 |
| university-of-ibadan | CLEAN | 0 |
| university-of-lagos | CLEAN | 0 |
| university-of-nairobi | CLEAN | 0 |

**0 of 12.** Zero uncited findings, zero authorship claims, across all twelve.

The provisional band said 0–2 was acceptable and argued the number should not be
zero, since twelve articles by different editors must contain *some* genuine
variation. It came back zero anyway. Two readings, and the honest position is
that this run cannot separate them:

- the exclusions are doing their job, and ordinary variation between
  encyclopedia articles genuinely is not voice deviation; or
- the silence bias is set too far, and the prompt would also stay quiet on a
  draft that *should* be flagged.

The positives below are what distinguishes these, and they only partly do.

**What the twelve did unprompted** is the more interesting result. Every run
reported dropping candidate findings *by name*, with reasons drawn from the
prompt: date formats, en-dash versus em-dash, list separators, heading case,
citation markup, typos, and — the best of them — the generic pronoun "S/he",
dropped because "it does not survive the read-aloud test." Several went further
and noted the corpus contains comparable noise, so the difference was not even
clean. Ten of twelve cited specific corpus lines to *refute* their own candidate
finding rather than to support one.

## Positive — AI-labelled drafts, n=6 total

### Confound-controlled set (n=4)

Chosen for **zero first-person occurrences**, so a finding cannot come from the
dimension `genre-check.mjs` flags as 12.3× confounded by talk-page comments.

| draft | verdict | findings |
|---|---|---|
| berry-hill-stoke-on-trent | **REVISE** | 2 |
| biobanks-in-india | CLEAN | 0 |
| ansuman-satpathy | CLEAN | 0 |
| mehak-malik | CLEAN | 0 |

### First run, not confound-controlled (n=2)

| draft | verdict | findings |
|---|---|---|
| caligomos-art | REVISE | 4 |
| socio-cognitive-engineering | REVISE | 7 |

## The result that matters, and it lowers the earlier claim

The first run reported **2 of 2** positives caught and called the prompt
non-decorative. With the confound removed, it is **1 of 4**.

**That is not a failure, and reading it as one would be the mistake.** This is a
voice critic, not an AI detector. Three of those four drafts are machine-written
and also entirely ordinary encyclopedic prose — a short biography, a stub about
biobanks, a researcher profile. They do not deviate from the corpus register,
because there is nothing to deviate. A critic that flagged them would be
detecting authorship, which the prompt refuses to do and would be worthless at.

The one that did fire, fired on something real.

## What berry-hill did that the corpus never does

> "Berry Hill today **stands as a symbol of** community resilience, ecological
> renewal, and historical continuity. Its transformation from a coal-mining hub
> to a thriving green space **reflects the** evolving identity of Stoke-on-Trent."

An interpretive coda: a closing claim about what the subject *means*, in
abstractions with no checkable referent. Spot-checked:

```
                    human corpus    draft
"stands as"                    0        1
"symbol of"                    0        1
"reflects the"                 0        1
"reimagined"                   0        1
```

And the critic did the harder half — it found what the author writes *instead*.
For a site changing function the corpus says "converted into" (1) or
"transformed into" (4); the draft reached for "reimagined". The draft even uses
the corpus word itself four lines earlier.

The corpus does make unattributed evaluative claims. But they are claims of
standing among peers, cashed out in numbers ("covers a land area of 7,000
hectares") or attributed ("has been called 'the university of first choice'").
The symbolic summation is absent from all twelve, and no sample closes with one.

That is a finding about how a person writes, checkable in a minute, with the
alternative construction named. It is what the whole design is for.

## What this run does and does not establish

**Does:** the prompt does not manufacture nits — 0 of 12 on human prose, with the
exclusions visibly reasoned rather than accidentally satisfied. It catches a
genuine register break in AI text with the confound removed. It never claimed
machine authorship in 18 opportunities.

**Does not:** separate "well-tuned silence" from "too much silence". A negative
rate of exactly zero is consistent with both, and the confound-controlled
positive rate of 1 in 4 does not settle it either, because 3 of those 4 arguably
*should* be CLEAN.

Settling it needs a corpus with a known planted deviation — a passage an author
confirms is not theirs, in their own register. That does not exist here, and
until it does the correct claim is the narrow one: **this prompt is quiet on
human prose and speaks when a draft does something the corpus never does.**

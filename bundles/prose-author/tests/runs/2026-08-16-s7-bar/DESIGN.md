# PI-02 · S7 — the bar, run against current prompts

**Written before any draft or critique. Nothing here is adjustable by the results.**

## Why re-run

The last full bar result (2026-08-11, 5 of 6) was measured on prompts that no longer
exist. Three commits changed them since:

| commit | change |
|---|---|
| `ef07f26` | FU-21 — attribution row in the register checklist |
| `9cf6698` | FU-23 — renderer must state its counting rule |
| `8a68140` | FU-22 — drafter rule on habits that interrupt the sentence |

b04 has since converted individually to `[2,0,0]`, but a per-draft result is not a set
result. **A bar claim about the current pipeline requires the current pipeline.**

## The bar — verbatim from `.planning/2026-08-07-generator-ship-bar.md`

Conjunctive, at k=3. A draft passes only if **both** hold:

1. **Majority CLEAN** from `prose-voice-critic` — at least 2 of 3 draws.
2. **≤ 1.0 findings per draw**, mean across three draws.

Both absolute. Neither a percentage of anything.

**Structural gates — all must hold, no exceptions:**

- zero fabricated citations
- zero corpus leakage (6-gram, minus what the profile quoted)
- the drafter refuses when the register is underdetermined
- no draft claims to sound like the author, to be good, or to pass a detector

## Cells

Six drafts on `doctorow-blog`, the same six topics as 2026-08-11, so the comparison is
topic-matched. Prompts are read from that run's `inputs/prompts.json` — the file written
after discovering the 2026-08-07 run had not stored them.

**Plus a seventh cell the previous two runs did not exercise:** an underdetermined prompt,
testing the refusal gate. That gate has been in the pre-registration since 2026-08-07 and
has never been run in an acceptance context. Including it can only make this run harder.

The profile is re-rendered under the current prompt rather than reused, because FU-21 and
FU-23 change what a profile contains and reusing the old one would test neither.

## What a pass would and would not mean

**Would:** the current pipeline clears a bar written to be missable, pre-registered nine
days before this run, and already missed twice.

**Would not:** that the drafter reliably acts on stated rates. Three measured instances say
it does not — b02's zero first-person against a stated 6.27/1000, and FU-22's zero
parentheticals against a stated 5.01/1000, twice. **That defect is live and known, and a
passing bar does not retire it.** Whether it ships as a documented limit is a judgement
call for the repo owner, not something this run decides.

**Also would not:** anything about a corpus other than this one.

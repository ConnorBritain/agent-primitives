# Harness run 2026-08-04 — prose-voice-critic, first execution

Protocol: [`../critic-harness.md`](../critic-harness.md). This file is the log of
one run; the protocol is the durable document and does not carry run narration.

## Negative (leave-one-out), n=6 of 12

| draft | verdict | findings | uncited | authorship claims |
|---|---|---|---|---|
| university-of-ibadan | CLEAN | 0 | 0 | 0 |
| makerere-university | CLEAN | 0 | 0 | 0 |
| obafemi-awolowo-university | CLEAN | 0 | 0 | 0 |
| jawaharlal-nehru-university | CLEAN | 0 | 0 | 0 |
| ahmadu-bello-university | CLEAN | 0 | 0 | 0 |
| kenyatta-university | **REVISE** → CLEAN after fix | 1 → 0 | 0 | 0 |

**1 of 6 before the fix, 0 of 6 after.** Both contract checks clean throughout:
zero uncited findings, zero claims about machine authorship.

**Six of twelve, not twelve.** The remaining six were not run. The rate is inside
the provisional band either way, and it is a sample, not the full test.

**Five of those six ran against the pre-fix prompt.** They were not re-run,
because the fix only *adds* an exclusion — it can make the critic quieter and
cannot make it louder, so a CLEAN under the old prompt is still CLEAN under the
new one. Only the document that changed verdict was re-run.

## What the run found — and this is why the harness exists

The single `REVISE` was a **bio-list separator**: the draft used ` - ` between a
name and its description, the corpus used `, `. The critic's claim was qualitative — this draft separates bio-list entries with a
dash, the corpus uses a comma — and it holds:

```
kenyatta-university      36 dash,  7 comma      <- the only dash-dominant
ahmadu-bello-university   0 dash,  2 comma         document of twelve
university-of-lagos       0 dash,  7 comma
                          (node tests/separator-count.mjs)
```

**The critic was right about the fact and wrong that the fact was about voice.**
A list separator is markup. It changes with a template, an editor, a tool — none
of which is how a person writes.

That is a scope defect, and the prompt now excludes formatting explicitly, with a
test it can apply to itself: *read the prose aloud in your head; if the thing you
noticed does not survive being read aloud, drop it however well you can count
it.* The re-run returned `CLEAN` and cited that rule by name.

Worth noting what made this cheap: the citation requirement made a wrong finding
**checkable in thirty seconds**. A critic that had said "this doesn't sound like
you" without evidence would have been unfalsifiable and would have shipped.

## Positive (AI-labelled drafts), n=2

| draft | verdict | findings | uncited | authorship claims |
|---|---|---|---|---|
| caligomos-art | REVISE | 4 | 0 | 0 |
| socio-cognitive-engineering | REVISE | 7 | 0 | 0 |

Verbatim reports: [`2026-08-04/caligomos-art.md`](2026-08-04/caligomos-art.md),
[`2026-08-04/socio-cognitive-engineering.md`](2026-08-04/socio-cognitive-engineering.md).

**2 of 2 REVISE.** So the prompt is not decorative: it separates the two halves of
the corpus rather than returning `CLEAN` on everything.

Both runs held the contract under the condition designed to break it. These
documents come from the AI-labelled half, and **neither report said so** — no
claim, no hint, not even a hedge. The refusal survives contact with a draft that
invites it.

Both also declined findings on their own: caligomos excluded two broken sentences
as "a different critic's job," socio-cognitive excluded domain jargon as topic
rather than voice. Exclusive scope is being honoured without supervision.

## Spot-check of the positive findings

Every citation checked resolved exactly:

```
                            human corpus    draft
"Note that"                        0          1
"cf."                              0          2
"Correspondingly"                  0          1
First,/Second,/Third,/Fourth,      0          7
colon-definition list entries      0          5   (caligomos)
```

The most demanding claim was the most precise. The critic wrote: *"Zero
narrator-voice instances of we/our across all 12 samples. The one 'We are...'
sits inside an attributed direct quotation."* The corpus contains exactly one
`we`:

> *"My Lord, this is no ordinary occasion. We are watching to-day the birth of a
> new..."* — Harcourt Butler, 1915, quoted in `banaras-hindu-university.txt`

One instance, quoted, attributed, correctly distinguished from narration.

One check appeared to fail and did not: `^First,` returned zero in the draft.
**The anchor was wrong, not the claim** — the critic said sentence-openers inside
continuous prose, not line-initial. Recorded because it is the spot-check's own
failure mode: a sloppy verification of a sound finding reads exactly like a sound
verification of a fabricated one.

## The trap fired, and the harness had already named it

The strongest positive finding — first-person narration — sits on the **exact
dimension `genre-check.mjs` flags as confounded**: first person runs 12.3× higher
in the AI half because that half contains talk-page comments.

This particular draft is an article, not a talk page, and an encyclopedia article
narrating as "we are working towards" is a real register break. But it is a break
from *encyclopedic register*, not from a person. That is the corpus limitation
recorded above, showing up in a specific finding instead of a caveat.

Which is the argument for keeping the trap-detector next to the harness: it
predicted this finding before the run, and the finding still looks compelling
without it.

## What three critics noticed that the harness had not

Unprompted, in three of six runs: the corpus is Wikipedia articles by many
editors, not one person's idiolect. That limitation is now recorded above, and it
caps what a passing score means.

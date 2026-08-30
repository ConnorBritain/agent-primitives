# v3 renders — superseded by the FU-7 / FU-8 prompt revision

Rendered against `agent.md`
`sha256:855785226236fb07193499ed23c05ea0b9f8b933ee789e7dc073307e9ee16d14`.

**These were the accepted S2 artefacts.** They are valid, they validate against the
schema, and the S2 commit (`3550c70`) shipped with them. They were superseded a few
hours later, not because they were wrong about the corpus but because they were right
about the *edition* and could not tell the difference.

## Why they were replaced

FU-6 established that the Chekhov corpus's ellipses are overwhelmingly Garnett's
elision marks, not the author's punctuation: 47.4% sit at a paragraph or letter
boundary where an authorial pause is impossible, against 4.5% that certainly are the
author. These renders recorded the ellipsis as a voice signature anyway — draw A in
sections 2 and 4, draw B in section 1 — because nothing in the v3 prompt told them to
sort typographic evidence from grammatical evidence.

FU-7 added that rule. FU-8 added two more: a claim may not be stronger than its own
count, and a partition may not be asserted without checking it. A fourth change asked
for actionable phrasing alongside description.

## What changed, measured

The ellipsis observation moved out of the voice sections entirely, in both draws:

| | sections mentioning the ellipsis |
|---|---|
| v3 draw A | **2, 4** — voice sections |
| v3 draw B | **1, 8** — voice sections |
| v4 draw A | **8 only** — caveats |
| v4 draw B | **8 only** — caveats |

And the replacement is better than a silence. v4 draw A, section 8:

> The four-dot ellipsis is mostly the edition's, not the author's. Counted by position:
> ellipses that open or close a paragraph — an editor's cut mark — occur in 9/10 samples
> … Ellipses set mid-sentence between two lowercase words, where there is nothing to
> remove and the trailing-off is the author's, occur in only 3/10. Do not treat the
> ellipsis as a signature.

**The prompt supplied the method, not the finding.** The positional discriminator is a
general rule in the prompt; the 9/10-vs-3/10 split for this corpus is derived. That is
the intended shape — teach how to look, let the corpus answer — and it is the opposite
of the v2 leak, where the prompt supplied the conclusion.

Both v4 Chekhov draws also reached the split independently of each other, with
different counts (9/10 vs 3/10, and 9/10 vs 2/10) and different framing.

## Kept for the comparison

The v3 pair is the control for "did the FU-7 rule change anything, or did the renders
drift?" The table above is that comparison, and it is why these files stay rather than
being deleted.

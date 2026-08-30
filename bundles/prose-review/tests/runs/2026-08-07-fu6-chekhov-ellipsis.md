# FU-6 — Is the Chekhov ellipsis the author's or the edition's? (2026-08-07)

**Answer: overwhelmingly the edition's. The habit does not survive as S1 and S2 stated
it. A real but much smaller authorial ellipsis does survive, and it is a different mark
doing a different job.**

Reproduce: `node bundles/prose-review/tests/ellipsis-provenance.mjs`

## Why this was asked

PI-02 S1 named *"ellipses, exclamations, direct-address questions"* as the dialogic
register a vanilla-AI Chekhov pastiche was missing — one of the four findings that
carried the DISCRIMINATING verdict. PI-02 S2's voice profile then recorded the trailing
four-dot ellipsis at 9/10 support as *"the workhorse punctuation, marking a thought
dropped rather than finished."*

That is an instruction a drafter would follow. Two renders in S2 disagreed about whether
it should have been made at all, which is what raised the ticket.

## Documentary evidence: the edition admits it is abridged

The corpus is Constance Garnett's 1920 selection (Project Gutenberg 6408). Her
Translator's Note:

> Of the eighteen hundred and ninety letters published by Chekhov's family I have chosen
> for translation these letters **and passages from letters** which best illustrate
> Chekhov's life, character and opinions.

"Passages from letters" is an admission of cutting. The edition **states no convention
for marking omissions** — no note about dots, asterisks, or brackets. It simply uses
dots, for cuts, in a text where the author also used dots.

So one glyph is doing two jobs, and no key was printed.

## Positional evidence: about half the ellipses cannot be authorial

An ellipsis that opens or closes a paragraph is a cut — nobody trails off into a
paragraph break and resumes after it. An ellipsis mid-sentence between two lowercase
words is the author — there is no removable unit there.

**All 113 Chekhov letters in the corpus, 98,832 words, 641 ellipses (6.49/1k):**

| class | n | share | reading |
|---|---:|---:|---|
| opens-letter | 0 | 0.0% | cut |
| closes-letter | 36 | 5.6% | cut |
| opens-paragraph | 125 | 19.5% | cut |
| closes-paragraph | 143 | 22.3% | cut |
| **mid-sentence** | **29** | **4.5%** | **author** |
| between-sentences | 308 | 48.0% | undecidable from this edition |

**47.4% are certainly cuts. 4.5% are certainly the author. 48.0% cannot be decided.**

The ten letters the S2 profile was built from behave the same way: 46 ellipses, 47.8%
boundary, 8.7% mid-sentence, 43.5% undecidable.

## What the rate actually is

| reading | rate |
|---|---|
| naive, counting every glyph (what the profile did) | **6.49/1k** |
| crediting every undecidable case to Chekhov (upper bound) | 3.41/1k |
| only the defensible mid-sentence cases (lower bound) | **0.29/1k** |

The profile's observation overstates the authorial habit by somewhere between **1.9×
and 22×**.

## Cross-author check, and why it is weaker than it looks

| author | files | words | ellipses | per 1k |
|---|---:|---:|---:|---:|
| bacon | 58 | 51,515 | 0 | 0.00 |
| chopin | 38 | 49,492 | 0 | 0.00 |
| ohenry | 25 | 51,727 | 0 | 0.00 |
| darwin | 21 | 204,497 | 0 | 0.00 |
| huxley | 17 | 108,123 | 5 | 0.05 |
| chesterton | 39 | 55,336 | 85 | 1.54 |
| **chekhov** | **113** | **98,832** | **641** | **6.49** |

Chekhov is 4× the next author and effectively infinite against four of them. **This does
not prove the point**, and the script says so in its own output: Chekhov is the only
correspondence in the corpus and the only abridged selection, so genre and edition are
confounded with author. The table establishes that he is an outlier; the positional
analysis establishes why.

## What survives — and it is worth keeping

The authorial ellipsis is real, and it is a specific, imitable move. The clearest case:

> I had to wait. It rained. Rain, cold, mud **...** brrr!

That is a pause before an interjection, inside a run of physical miseries. Nothing was
excised between "mud" and "brrr!". It is nothing like the mark in:

> …“recognizing one's worthlessness.” **...**
>
> **...** I am going to bring with me a boarder who will pay twenty roubles…

— a truncated paragraph followed by one that begins mid-flow. Same glyph, different
instrument.

**The correct constraint for a drafter is therefore narrower and better:** not "use
trailing ellipses constantly" but "occasionally break a run of concrete particulars with
a mid-sentence ellipsis before an interjection." That is derivable, citable, and about
one-twentieth as frequent as the naive reading suggests.

## Limitation: no second edition was obtainable

The ticket asked for a cross-check against a less-elided edition. **Not achieved.** Every
reachable English text of these letters is the same Garnett selection; the one
independent translation located (Koteliansky & Tomlinson, *The Life and Letters of Anton
Tchekhov*, 1925) is a lending-only scan with no accessible full text.

This matters for the 48% undecidable bucket, which a second edition would largely
resolve by showing what, if anything, was cut. The 47.4% / 4.5% figures do not depend on
it.

**The corpus rests on a single abridged edition, and that is a fact about every
Chekhov-derived number this repo has published** — S1's diagnostic, the cross-author
voice run, and the S2 profile alike.

## Consequences

1. **S1's finding list needs pruning, not its verdict.** S1 concluded DISCRIMINATING:
   voice-critic distinguishes AI pastiche from the corpus. That stands, and the two
   findings that carried it most cleanly — direct-address questions, anchored figures —
   re-derived in every uncontaminated S2 render. But the ellipsis half of finding 1 is
   substantially about a typesetter. A correction note is appended to the S1 completion
   doc; S1 is not edited in place.

2. **The S2 profile observation must be re-rendered, not hand-edited.** Both Chekhov
   renders record the ellipsis at 8–9/10. That is FU-7's job: teach the prompt to
   distinguish grammatical observations from typographic ones when provenance shows a
   translation or a re-set edition, then re-render. Hand-patching the artefact would
   break the corpus-lock chain and misrepresent what the prompt produces.

3. **S5 must not calibrate on ellipsis density.** It is an edition property at
   the rate the corpus shows.

4. **Two of S1's four findings are now known-artefactual** — metaphor-gloss (prompt
   contamination, found in S2) and ellipses (this ticket). The surviving two are
   direct-address questions and corpus-anchored figures. Both re-derive cleanly and
   independently, and both are safe to build a bar on.

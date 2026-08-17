# The counting rules the render stated, verbatim

FU-23's fix requires the renderer to state its counting rule wherever a habit admits more
than one. It did, nine times, unprompted:

1. **body extraction** — *"body text taken as everything between the first `(permalink)`
   line and the next boilerplate `(permalink)` line, with standalone URL lines stripped for
   word counts (17,438 prose words, 622 sentences)"*
2. **sentence split** — *"splitting at `.`/`!`/`?` plus whitespace"*
3. **anaphoric runs** — *"counting sentence-level runs only and excluding tricolons inside a
   single sentence"*
4. **second person** — *"counting a contraction like *you're* once as *you*"*
5. **solidarity** — *"counted case-sensitively so the country abbreviation *US* is excluded"*
6. **contraction** — *"counting `n't`, `'re`, `'ve`, `'ll`, `'m` and `'d`, with `'s` excluded
   entirely because it is ambiguous with the possessive"*
7. **quoted spans** — *"counting each occurrence including repeats"*
8. **attribution** — *"the explicit frame *As/as <Name> writes / wrote / says / notes /
   points out / quipped / likes to say*, and not the looser credits like *Wilhoit's Law* or
   *what Rushkoff calls*, which would push this wider"*
9. **profanity** — *"counting occurrences inside quoted matter and excluding the coinage
   *dickover*"*

Rules 5, 6 and 9 correspond exactly to three counting bugs shipped in `corpus-rates.mjs`
and fixed only after independent renders disagreed with the harness. The renderer reached
the same three conclusions from the corpus alone.

Two further disclosures, neither required by any rule:

- *"The samples are HTML scrapes that still carry entity residue (`&amp;`, `&quot;`). The
  two typographic observations in section 4 — parentheses and the spaced dash — may reflect
  the scraper's normalisation rather than the author's keystrokes, and should be treated as
  weaker than the grammatical findings, which are unaffected."*
- *"Paragraph rhythm — how long a paragraph runs and where it breaks — is not counted here.
  I read it as short, but I did not measure it and will not assert it."*

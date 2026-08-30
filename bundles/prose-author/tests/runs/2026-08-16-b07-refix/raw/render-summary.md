# The render under the amended prompt — what changed

## The reproducibility clause fired, verbatim

Section 5, on the third figure source:

> **No rate**: I could not write a rule a stranger would apply the same way to decide what
> counts as a borrowed story, and a list I picked by ear is not a countable component.

That is the clause added in `dbbbdd6`, applied in its own terms. The render rated what it
could reproduce and refused what it could not, and said which was which.

## What it rated instead — with full word lists

> Body and bodily function: 46 tokens from {orifice(s), asshole(s), piss, pissed, pee,
> bladder(s), kidney(s), vagina(s), vaginal, balls, throat(s), gut(s), mouth, face(s),
> heart(s), stomach, blood, bones, body, bodies, skin, hand(s), pocket(s), eyes, ear(s),
> pearls, hair, womb, foal, mare} — 10/10 samples, several times per piece (2.64 per 1,000)

> Monarchy, piracy and slavery: 33 tokens from {king(s), queen, aristocracy, ...} — 6/10
> samples (1.89 per 1,000)

> The manufactured compound is the unit. 186 hyphenated compounds (letter-hyphen-letter,
> URL lines excluded), 10/10 samples, throughout (10.67 per 1,000)

Note the third: where the previous render wrote "the manufactured compound" as a bare
label, this one gives the mechanical rule beside it — `letter-hyphen-letter, URL lines
excluded`. That is the difference the clause was written to produce.

## It also found the image-credit problem independently

> Four of the ten samples carry non-sentence blog furniture inside the body span — three an
> `(Image: …)` credit line, one a plug for the essay-formatted version — 4/10 samples.
> **These are excluded from every count above and are not part of the voice.**

That is the bug I had fixed in `corpus-rates.mjs` an hour earlier, found again from the
other side.

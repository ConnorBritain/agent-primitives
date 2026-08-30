# Does the countable-part rule change the DRAFT?

**Written before the render, the draft, or any critique. The predictions below are
falsifiable and are the point of the run.**

## What is being tested

The countable-part rule demonstrably changes the *profile*: three renders all rated the
figures section where the S7 profile left it unrated. That is not the question.

The question is whether it changes the *draft*, and specifically whether it fixes the
finding that failed the S7 bar.

## Why b07

b07 is the draft that failed. Two of three draws found the same defect: it closes
paragraphs on quiet images — *"the way water closes over a stone"*, *"their hand is on the
sash"* — where the corpus's figures are comic, grotesque or mechanical and always doing
argumentative work.

Same topic, same bar, same critic. One variable: the profile.

## Predictions, stated before the run

**P1 — the mechanism.** S7 measured that every habit the profile rated came back at or near
the corpus rate, and every habit it left unrated came back at exactly zero. The figure
vocabulary was unrated and all six drafts used it **zero** times. If the mechanism is real
and the rule works, a rated figure vocabulary should come back **non-zero**.

  *Falsified if:* the new draft still uses the body/indignity register zero times.

**P2 — the finding.** The b07 finding should not recur at k=3.

  *Falsified if:* two or more draws flag decorative or mood-only figures again.

**P3 — no collateral damage.** The habits that were already in band should stay in band —
second person, we/us, contraction, profanity, parenthesis, en dash, and zero em dashes.

  *Falsified if:* a previously in-band habit moves out of band.

## What a pass would and would not mean

**Would:** the countable-part rule reaches the draft, and the S7 failure is addressed at its
cause rather than by instructing the drafter.

**Would not:** that the bar is cleared. That needs all six drafts and eighteen draws. This
run is one draft.

**Would not:** anything about a second corpus, or about the two defects S7 found that no
gate catches — the fabricated biographical fact and the pronoun slip.

## Procedure

1. Re-render `doctorow-blog` under the current prompt, which carries the reproducibility
   clause the three earlier renders did not.
2. Draft b07 from it, same topic prompt as S7, read verbatim from `prompts.json`.
3. Critique k=3 against the corpus.
4. Measure P1 and P3 with `corpus-rates.mjs`.

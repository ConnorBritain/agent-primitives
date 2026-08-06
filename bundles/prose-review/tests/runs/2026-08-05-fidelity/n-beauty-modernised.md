# Negative (faithful revision) — beauty-modernised · FAITHFUL

Class B, scanner-artifact case. The flagged atom is present but line-wrapped. The critic routed it to Scanner defects instead of manufacturing a finding, and diagnosed the cause correctly.

---

# prose-fidelity-critic — n-beauty-modernised

## Findings

None.

## Immaterial losses

The scan flagged exactly one atom, `"Edward the Fourth"`. It is not recorded here as an
immaterial loss because it is not a loss: it is a scanner defect, reported below.

Checked and not raised (scan-invisible categories, priority order 2–5):

- **Qualifications and scope limits all survive.** `for the most part` (original L37 →
  revision L34), `many times` (L33 → L30), `not always` (L15–16 → L11), `but by pardon`
  (L35 → L32), `if it light well` (L39 → L35).
- **No polarity or hedge change.** `neither is it always most seen` (L11–12) stands as
  `Neither is it always most seen` (L7–8); `as if nature were rather busy not to err`
  (L13) stands unchanged (L8–9). No hedge removed, none added.
- **Attribution intact.** The Latin quotation `“Pulchrorum autumnus pulcher;”` (L34) is
  reproduced verbatim with its quotation marks (L31–32); the six named exemplars
  (Augustus Cæsar, Titus Vespasianus, Philip le Bel of France, Edward the Fourth of
  England, Alcibiades of Athens, Ismael the Sophy of Persia) are all present and in
  order (L16–19 → L12–14). Apelles and Albert Durer both survive (L24 → L20), each still
  attached to the correct method — geometrical proportions to the one, composite faces to
  the other.
- **Structural.** The original is one block; the revision breaks it into three paragraphs.
  No heading existed to be renamed, and no sentence went missing at a break: the text
  either side of each break is continuous with the original.
- **No edit plan was supplied**, so no out-of-plan check was possible; nothing in this
  report should be read as clearing the revision on that ground.
- Modernised spellings and function words (`hath`→`has`, `maketh`→`makes`, `labor`→
  `labouring`, `behavior`→`behaviour`, `therefore`→`so`, `is more than`→`counts for more
  than`), the recast `That is the best part of beauty, which a picture cannot express`
  (L21–22) → `The best part of beauty is the part a picture cannot express` (L17–18), and
  the semicolon/colon/dash repunctuation are same-meaning restatements, not findings.

## Scanner defects

- **False positive: named entity split across a line break.** The scan reports
  `"Edward the Fourth"` absent from the revision. The revision contains it at L12–13,
  wrapped mid-name: `Edward the` / `Fourth of England`. The original has it on a single
  line (L17), so the comparison matched a within-line span against a text where the same
  span carries an intervening newline. The scanner appears to match entity strings without
  first collapsing whitespace/newlines in the revision. Any multi-word entity that lands on
  a wrap boundary will be flagged the same way, which makes the false-positive rate a
  function of line width rather than of content.

## Verdict

**FAITHFUL**

RESULT: FAITHFUL | findings=0 | uncited=0 | contradicts_scan=0

# Prose Pattern Critic — Case 09

**Draft:** `staged/case-09-draft.md` (728 words, Wikipedia-style article on the character Reze)
**Scan report:** `staged/case-09-scan.json` — `deterministic_hits: 0`, `cadence_flags: ["mean_len"]`. No scanner hits to avoid restating.

## Findings

None.

## Patterns checked and found clean

- **`llm-safe-truths`** — CLEAN. Several sentences read as generic thematic filler (e.g. line 15, "highlights a recurring theme in the series: the juxtaposition of human vulnerability and destructive power"; line 62, "Fans and critics alike often discuss the emotional complexity of her arc..."). Each has a statable false counterpart (the series could fail to pair those themes; fans could be indifferent to her), so each passes the falsifiability gate rather than failing all three. None of them cleared the bar for filler with the confidence this pattern requires.
- **`announced-then-undelivered`** — CLEAN. The one candidate is the heading "Character concept and creation" (line 9), whose content (lines 13–15) pivots to thematic/narrative-role analysis rather than actual design/creation history. A section heading is a thin basis for "announcement" as this pattern is normally applied to a promissory sentence mid-argument, and flagging it risked exactly the pattern-matching-on-shape the catalog warns against. Left alone.
- **`surveying-without-committing`** — CLEAN. The Reception section (line 46–50) lays out positive reception alongside mixed reviewer opinions without resolving them, but it is titled "Reception" and behaves as an encyclopedic survey of critical response — a survey that announces itself as one is doing its job, not dodging a question the piece raised.
- **`invented-specifics` (narrow reading)** — CLEAN. No internal contradiction between two specifics in the draft. The candidate unnamed-source cases (footnote markers `.0`–`.8` after claims, with an empty "References" section at line 64) look like stripped citations rather than fabricated attribution — routed to Out of scope, not filed as findings.

## Out of scope

- Stripped-citation suspicion: every substantive claim (lines 6, 31, 37, 39, 46, 48, 50, 56, 62) ends in a bare digit (`.0` through `.8`) immediately before an empty "References" heading (line 64). This reads like hyperlinks/footnotes lost in a plain-text copy, not unsourced invention.
- Fact-checker item: line 37's claim that Reina Ueda voices "Cha Hae-In in Solo Leveling and Kanao Tsuyuri in Demon Slayer" is a checkable real-world casting claim I can't adjudicate from the draft alone.
- Missing concrete detail (not mine, per catalog): the "Character concept and creation" section (lines 13–15) never gives an actual creation detail — no interview, design note, or naming origin, only thematic restatement. Also line 62's Shonen Jump popularity-poll claim gives no actual rank or number.

**CLEAN**

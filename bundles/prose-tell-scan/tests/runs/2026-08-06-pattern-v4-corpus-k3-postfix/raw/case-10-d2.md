**PATTERN**: `announced-then-undelivered`
**LOCATION**: Line 43, heading `Specifications`; delivery location would be lines 44–49, which are blank, immediately followed by the next heading, `Legacy`, at line 50.
**WHY IT IS THIS PATTERN**: The section header announces a body of specification content that never arrives — the draft goes straight from the bare heading to blank lines to the next section, with no data delivered anywhere before the piece moves on.
**CONFIDENCE**: high

**PATTERN**: `llm-safe-truths`
**LOCATION**: Line 54 — "Though it saw only limited application, it contributes to the broader history of early aviation engineering and reflects the influence of French rotary designs on German manufacturers."
**WHY IT IS THIS PATTERN**: Isolating the clause "it contributes to the broader history of early aviation engineering," no state of the world can be stated in which it is false — anything that existed trivially "contributes" to the history of its field, so the claim can't be falsified; deleting it leaves "it reflects the influence of French rotary designs on German manufacturers" intact and loses no argument, since that influence is already established with specifics at lines 14 and 20.
**CONFIDENCE**: low

Patterns checked and found clean:
- `surveying-without-committing` — clean. The draft is a descriptive encyclopedia entry; it never poses a question it then declines to answer.
- `invented-specifics` — clean under the narrow reading. No specific is attributed to a source the draft omits by name in a context where a citation was expected inline, and no two specifics in the draft contradict each other (the Alter A.I and Fokker Dr.I details are consistent across their two mentions).

Out of scope:
- The numeric specifications at line 20 (approx. 110 hp / 82 kW, ~980 mm diameter) are unsourced within this text, and the article's own talk-page comment at line 1 confirms the specifications are "an estimate" and "entirely unsourced in the article" — this reads as a Wikipedia draft where citations plausibly existed and were stripped in this plain-text copy; a fact-checker's call, not mine.
- The empty Specifications section (lines 43–49), beyond the announced-then-undelivered finding above, is also a missing-detail gap in kind — but that pattern is adjudicated by nobody, so I'm not filing it twice.

CLEAN / REVISE
REVISE

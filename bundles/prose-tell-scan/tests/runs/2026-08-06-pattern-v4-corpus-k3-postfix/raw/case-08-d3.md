PATTERN CHECK — case-08 (staged/case-08-draft.md), against staged/case-08-scan.json (0 deterministic hits, cadence_flags empty)

No findings.

Checked and found clean:
- `llm-safe-truths` — clean. No sentence in the draft fails all three gates. Candidates like "Over the years, ABU has been affected by national political instability" (line 133) and "ABU continues to occupy a particularly important place among Nigerian universities" (line 136) are either falsifiable-and-supported (deletion breaks a following "Hence" clause) or too weak to call unfalsifiable filler. Nothing survives the deletion test as unsupported padding.
- `announced-then-undelivered` — clean. The one candidate — "Below is the tabulated list of all ABU vice-chancellors" (line 148), with no table following — is not filed as a finding; it reads as a stripped Wikipedia table (formatting/markup artifact), not a rhetorical promise the argument fails to keep. See Out of scope.
- `surveying-without-committing` — clean. This is descriptive/encyclopedic prose throughout; it never poses a question it declines to answer. The "challenges" section (lines 140–141) describes problems without proposing solutions, but it never frames itself as a question awaiting resolution, so the pattern doesn't apply.
- `invented-specifics` (narrow reading) — clean. Two candidates were checked and ruled out:
  - "1.2 million books" (line 81) vs. "capacity of 70,000 books" (line 84): resolves on a second look — the 70,000 figure sits in the historical paragraph describing the 1963-built library at the moment of construction, while the 1.2 million figure is explicitly framed as the present-day ("Currently...") collection. Different time points; not a same-time contradiction.
  - "thirteen faculties" (line 17) vs. the listed faculties (lines 19–46): the list contains a duplicate ("Faculty of Environmental design ABU University" at line 19 and "Faculty of Environmental Design" at line 30). Deduplicated, the list is exactly thirteen — the count holds; the duplication is a list-formatting artifact, not a numeric contradiction.

Out of scope:
- Nearly every specific numeral in this draft (the $39,000 construction cost, 1.2 million books, 66,000 periodicals, 7,000 hectares, 35,000 enrollment, 1,400/5,000 staff figures, etc.) is unsourced in-text. The draft itself contains a literal "[ citation needed ]" marker (line 132), confirming this is a plain-text extract of a citation-bearing Wikipedia article with the citations stripped. Per the stripped-citation carve-out, none of these are safe to read as "invented-specifics attributed to an unnamed source" — flagging them would be treating a formatting loss as a fabrication. Left for a fact-checker, not filed.
- The unfollowed "tabulated list of all ABU vice-chancellors" (line 148) is likely a stripped wikitable rather than an undelivered argumentative promise — noted above, not filed.
- Missing concrete detail (e.g., no source for "one of the largest teaching hospitals in Nigeria and Africa," line 8) is real but not adjudicated by this critic per the catalog's own exclusion.

CLEAN

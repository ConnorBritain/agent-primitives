# Positive (lossy revision) — sister-scope-dropped · MATERIAL-LOSS

Class D: scan FAITHFUL. Casualties, a cause, and two scope limits dropped without touching a name or a date.

---

# prose-fidelity-critic — p-sister-scope-dropped

## Findings

**CLASS**: dropped-fact
**ORIGINAL** (lines 56-57): "for the irregularities which the government had ventured upon in putting down the riots in Fourmis (there were many killed and wounded)."
**REVISION** (line 51): "for the irregularities which the government had ventured upon in putting down the riots in Fourmis."
**WHAT THE READER LOSES**: That the Fourmis suppression produced casualties — the reader can no longer tell why the minister was called to account, and "irregularities" now reads as procedural rather than lethal.

**CLASS**: dropped-fact
**ORIGINAL** (lines 16-18): "The other exhibition buildings I saw only from the outside, as they were occupied by cavalry brought there in anticipation of disorders."
**REVISION** (lines 12-13): "I saw the other exhibition buildings from the outside."
**WHAT THE READER LOSES**: The reason he could not go in — the buildings were garrisoned with cavalry pre-positioned against unrest — which is the fact linking the Exhibition to the riots described in the next sentences; the revision leaves his staying outside unexplained.

**CLASS**: dropped-qualification
**ORIGINAL** (lines 20-21): "To disperse a big crowd a dozen policemen are sufficient here."
**REVISION** (line 16): "To disperse a big crowd a dozen policemen are sufficient."
**WHAT THE READER LOSES**: The restriction to Paris. The original is a traveller's report about French policing, implicitly against a Russian standard; the revision states a general fact about crowds and police anywhere.

**CLASS**: dropped-qualification
**ORIGINAL** (lines 39-40): "In comparison with the landscape painters I saw here yesterday Levitan is a king...."
**REVISION** (line 34): "Levitan is a king...."
**WHAT THE READER LOSES**: The comparison class and its narrowness — Levitan is ranked against a specific set of landscape painters Chekhov saw in Paris the previous day, not against painters at large. The revision converts a bounded judgement into an unbounded one.

**CLASS**: dropped-fact
**ORIGINAL** (lines 37-39): "I went to the Salon and couldn't see half the pictures, thanks to my short sight."
**REVISION** (lines 32-33): "I went to the Salon and couldn't see half the pictures."
**WHAT THE READER LOSES**: The cause. The paragraph's premise is the broken pince-nez and his myopia; without "thanks to my short sight" the reader cannot tell whether the pictures were unseen for want of eyesight, want of time, or crowding, and the sentence stops supporting the request to Misha.

## Immaterial losses

The scan flagged no atoms as missing, so there is no flagged-atom list to account for. Non-flagged changes examined and dismissed:

- "only from the outside" → "from the outside": the restriction survives in "from the outside"; the reader still knows he did not go in.
- "By the way, the Russian artists are far more serious..." → "The Russian artists are far more serious...": discourse marker, no propositional content; voice territory, not fidelity.
- Clause reordering in "The other exhibition buildings I saw..." → "I saw the other exhibition buildings...": relations between claims preserved.
- Frontmatter replaced (source/title/author/date/licence → fixture/synthesised): metadata about the fixture, not text the reader of the letter loses.

## Scanner defects

Not a wrong-presence claim, so no finding is folded in, but worth a bug report: the scan reported "8 atoms checked" over an original containing at least eleven candidate atoms (April 21 1891; April 24; Paris; Eiffel Tower; Salon; Church of the Embassy; Chamber of Deputies; Minister for Internal Affairs; Fourmis; Suvorin; Levitan; Misha). Either the extractor is deduplicating across mentions or it is not reaching multi-word entities and the second date block. Separately, every loss above is invisible to it — three are whole clauses containing no number, date, quote or capitalised name ("there were many killed and wounded", "as they were occupied by cavalry...", "thanks to my short sight"), and one is a single adverb of scope ("here"). A file can be this heavily de-scoped and still score FAITHFUL, which is worth knowing about the tool's coverage.

## Verdict

**MATERIAL-LOSS**

RESULT: MATERIAL-LOSS | findings=5 | uncited=0 | contradicts_scan=0

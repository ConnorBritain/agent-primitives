# Positive (lossy revision) — tihonov-summarised · MATERIAL-LOSS

Six dates and five titles summarised away. Caught all of them, plus two word-form numbers the scan cannot see.

---

# prose-fidelity-critic — p-tihonov-summarised

## Findings

**CLASS**: dropped-fact
**ORIGINAL** (line 20): "I was born in Taganrog in 1860."
**REVISION**: "I was born in Taganrog around the middle of the century"
**WHAT THE READER LOSES**: The birth year. "Around the middle of the century" spans roughly 1845–1865; the reader can no longer compute the writer's age at any event in the letter, including that he was 31 when he wrote it.

**CLASS**: dropped-fact
**ORIGINAL** (line 21): "I finished the course at Taganrog high school in 1879."
**REVISION**: "finished at the Taganrog high school"
**WHAT THE READER LOSES**: The year he left school, and with it the only anchor that dated the start of his writing (the original's second "1879" made schooling and first writing the same year — see below).

**CLASS**: dropped-fact
**ORIGINAL** (lines 21–22): "In 1884 I took my degree in medicine at the University of Moscow."
**REVISION**: "some years later took my degree in medicine at the University of Moscow"
**WHAT THE READER LOSES**: The year of qualification, and the five-year gap between school and degree that "some years later" leaves unbounded; the reader can no longer tell how long he had been a practising doctor when he wrote.

**CLASS**: dropped-fact
**ORIGINAL** (lines 22–23): "In 1888 I gained the Pushkin prize."
**REVISION**: "I won a literary prize not long after"
**WHAT THE READER LOSES**: Both the year and the identity of the prize. The Pushkin prize is the Academy of Sciences award and the single piece of external recognition in the biography; "a literary prize" is unidentifiable and unverifiable. (The loss of the name "Pushkin" is not in the scan — see *Scanner defects*.)

**CLASS**: dropped-fact
**ORIGINAL** (lines 23–24): "In 1890 I made a journey to Sahalin across Siberia and back by sea."
**REVISION**: "travelled to Sahalin across Siberia and back by sea" (no date)
**WHAT THE READER LOSES**: The year of the Sahalin journey — the one event here with a public record the reader could check — and its position relative to the prize, which "not long after" no longer fixes.

**CLASS**: dropped-fact
**ORIGINAL** (line 24): "In 1891 I made a tour in Europe"
**REVISION**: "the following year made a tour in Europe"
**WHAT THE READER LOSES**: The absolute year. "The following year" is relative to the Sahalin journey, which is itself now undated, so the chain of six dated events has become a sequence with no fixed point anywhere in it.

**CLASS**: claim-drift
**ORIGINAL** (line 25): "In 1892 I took part in an orgy in the company of V. A. Tihonov at a name-day party."
**REVISION**: "Last year I took part in an orgy in the company of V. A. Tihonov at a name-day party."
**WHAT THE READER LOSES**: The letter is headed "February 22, 1892", so "last year" places the party in 1891 — the revision asserts a different year than the original, and detaches the party from the drunkenness the letter's opening paragraph is answering, which the shared 1892 tied together.

**CLASS**: dropped-fact
**ORIGINAL** (line 26): "I began writing in 1879."
**REVISION**: "I began writing while still at school."
**WHAT THE READER LOSES**: The year, and also the claim's content: the original dates the start of writing to the year he *finished* school, whereas the revision puts it during school. The reader cannot recover which.

**CLASS**: dropped-fact
**ORIGINAL** (lines 26–28): "The published collections of my works are: “Motley Tales,” “In the Twilight,” “Stories,” “Surly People,” and a novel, “The Duel.”"
**REVISION**: "Several collections of my stories have been published, along with a novel."
**WHAT THE READER LOSES**: Every title, and the count. The reader cannot look up a single one of the four collections or the novel, cannot tell that there were exactly four, and loses "The Duel" as the name of the novel — the bibliography has become an assertion that a bibliography exists.

**CLASS**: dropped-fact
**ORIGINAL** (lines 32–33): "The mysteries of love I fathomed at the age of thirteen."
**REVISION**: "The mysteries of love I fathomed young."
**WHAT THE READER LOSES**: The specific age. Thirteen is the whole joke — it is precise, and startlingly early; "young" is neither, and the reader cannot recover the number. (Word-form number, not caught by the scan.)

**CLASS**: dropped-qualification
**ORIGINAL** (line 36): "though I have not done so for two or three years"
**REVISION**: "though I have not done so for some time"
**WHAT THE READER LOSES**: The bound on the gap. "Two or three years" contradicts the "so much so" of the preceding clause with a specific span; "some time" could be six months, and the reader can no longer tell how stale the claim to practise is.

## Immaterial losses

None. Every atom the scan flagged is raised above:

- "1860", "1879", "1884", "1888", "1890", "1891" — all raised as dropped-fact.
- Quoted span "In the Twilight," — raised (bibliography).
- Named entities "Motley Tales", "In the Twilight", "Surly People", "The Duel" — raised (bibliography).

## Scanner defects

- **"Pushkin" not flagged as an absent named entity.** It appears in the original at line 23 ("Pushkin prize") and nowhere in the revision, yet does not appear in the named-entities list.
- **"Stories" not flagged.** The title “Stories” (line 27) is absent from the revision as a titled work; the revision contains the lowercase common noun "stories" (line 23), which appears to have satisfied the presence check. Case-insensitive or quote-blind matching lets a dropped title hide behind an ordinary word.
- **Word-form numbers not covered.** "thirteen" → "young" and "two or three years" → "some time" are numeric losses the scan does not look for; both are real, and on this fixture the scan's number list understates the loss.

**VERDICT: MATERIAL-LOSS**

RESULT: MATERIAL-LOSS | findings=11 | uncited=0 | contradicts_scan=0

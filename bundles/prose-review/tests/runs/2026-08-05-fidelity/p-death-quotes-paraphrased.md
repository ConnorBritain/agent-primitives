# Positive (lossy revision) — death-quotes-paraphrased · MATERIAL-LOSS

Ten Latin quotations paraphrased or deleted. The scan saw five; the critic found eleven losses and said so.

---

# prose-fidelity-critic — p-death-quotes-paraphrased

Ten quotations stand in the original. Not one of them stands in the revision. Five were
replaced by English paraphrase, four were deleted outright, and one survives only as an
unquoted attribution. The scan caught five of these; the other five it never saw.

## Findings

**CLASS**: dropped-fact
**ORIGINAL**: line 21–22 — “Pompa mortis magis terret, quam mors ipsa.”
**REVISION**: “it was well said that the pomp of death frightens us more than death itself.”
**WHAT THE READER LOSES**: The words Bacon is quoting. The sense survives, but the reader can
no longer see that this is a fixed Latin sentence, cannot search it, and cannot tell where
Bacon's phrasing ends and his source's begins — the passage now reads as Bacon's own summary
of an unnamed philosopher rather than a quotation from one.

**CLASS**: dropped-fact
**ORIGINAL**: line 33–34 — “Cogita quamdiu eadem feceris; mori velle, non tantum fortis, aut
miser, sed etiam fastidiosus potest.”
**REVISION**: “Nay, Seneca adds niceness and satiety, observing that a man may wish to die not
only from courage or misery but from sheer tedium.”
**WHAT THE READER LOSES**: The Seneca sentence itself, including its opening imperative
(*Cogita quamdiu eadem feceris* — consider how long you have been doing the same things),
which the paraphrase drops entirely. The attribution to Seneca now points at nothing the
reader can check, and the English gloss Bacon supplies in the next sentence is left restating
a paraphrase instead of translating a quotation.

**CLASS**: dropped-fact
**ORIGINAL**: line 39 — “Livia, conjugii nostri memor, vive et vale.”
**REVISION**: “Augustus Cæsar died in a compliment to his wife”
**WHAT THE READER LOSES**: Augustus's dying words and the name of the person he addressed.
The reader can no longer learn that the wife was Livia, that he asked her to live on, or that
the compliment was an instruction to remember their marriage — the thing that made it a
compliment is gone, leaving only the assertion that one occurred.

**CLASS**: claim-drift
**ORIGINAL**: line 38–39 — “Augustus Cæsar died in a compliment: “Livia, conjugii nostri memor,
vive et vale.””
**REVISION**: “Augustus Cæsar died in a compliment to his wife”
**WHAT THE READER LOSES**: The original never states who the compliment was addressed to; it
quotes and lets the reader see. The revision asserts “to his wife” as fact while deleting the
only evidence for it, so the reader is now taking the reviser's reading of a line they can no
longer read.

**CLASS**: dropped-fact
**ORIGINAL**: line 40–41 — “Jam Tiberium vires et corpus, non dissimulatio, deserebant:”
**REVISION**: “Tiberius in dissimulation, as Tacitus saith of him;” — quotation `absent`
**WHAT THE READER LOSES**: What Tacitus actually said, which is the whole example: that
Tiberius's strength and body, but not his dissimulation, were deserting him. Without it
“Tiberius in dissimulation, as Tacitus saith of him” names a source for a claim it no longer
makes, and the reader cannot see that the point is dissimulation outlasting the man.

**CLASS**: dropped-fact
**ORIGINAL**: line 42 — “Ut puto Deus fio;”
**REVISION**: “Vespasian in a jest, sitting upon the stool;” — quotation `absent`
**WHAT THE READER LOSES**: The jest. The reader is told Vespasian died joking and is left to
guess what the joke was; nothing in the revision reveals that he was mocking his own
impending deification, which is why the detail about the stool is there at all.

**CLASS**: dropped-fact
**ORIGINAL**: line 43 — “Feri, si ex re sit populi Romani,”
**REVISION**: “Galba with a sentence, holding forth his neck;” — quotation `absent`
**WHAT THE READER LOSES**: The sentence Galba spoke — strike, if it be for the good of the
Roman people. “Galba with a sentence” now announces a sentence and withholds it, and the
gesture of holding forth the neck loses the words that explain it.

**CLASS**: dropped-fact
**ORIGINAL**: line 44–45 — “Adeste, si quid mihi restat agendum,”
**REVISION**: “Septimus Severus in dispatch, calling for whatever remained to be done;”
**WHAT THE READER LOSES**: The imperative *Adeste* — Severus summoning others to him — which
the paraphrase converts into him calling for work in the abstract. The reader loses both the
Latin and the addressee, and with them the illustration of dying "in dispatch" as an order
given to attendants.

**CLASS**: dropped-fact
**ORIGINAL**: line 47–48 — “qui finem vitæ extremum inter munera ponit naturæ.”
**REVISION**: “Better, saith he, is the man who counts the end of life among the gifts of
nature.”
**WHAT THE READER LOSES**: The quoted verse behind “saith he.” The attribution survives with
nothing attributed to it: the reader cannot see that Bacon is citing a specific line, cannot
identify its author, and cannot distinguish the source's wording from the reviser's.

**CLASS**: dropped-fact
**ORIGINAL**: line 53 — the sweetest canticle is “Nunc dimittis,”
**REVISION**: “the sweetest canticle is the old song of departure”
**WHAT THE READER LOSES**: The identity of the canticle. “Nunc dimittis” names a specific text
the reader can look up; “the old song of departure” names nothing, and the reader can no
longer recover which canticle Bacon called the sweetest or that the reference is scriptural.

**CLASS**: dropped-fact
**ORIGINAL**: line 56 — “Extinctus amabitur idem.”
**REVISION**: “extinguisheth envy: the man once gone will be loved.”
**WHAT THE READER LOSES**: The closing quotation, which the essay ends on. The reader loses
the Horatian line itself and the fact that Bacon closed by citing rather than asserting; the
paraphrase also drops *idem* — the same man, the one who was envied — so the pointed identity
between the envied and the loved is softened into a general observation.

## Immaterial losses

None. Every atom the scan flagged is raised above as a finding.

## Scanner defects

- **Quotations spanning a line break are not detected.** Of the ten quoted spans in
  `original.md`, the scan flagged four. Every quotation it missed contains an internal
  newline: “Pompa mortis magis terret, quam / mors ipsa.” (21–22), “Cogita quamdiu … / …
  fastidiosus potest.” (33–34), “Adeste, si quid mihi restat / agendum,” (44–45), “qui finem
  vitæ extremum inter munera ponit / naturæ.” (47–48). The 40–41 Tacitus quotation was missed
  as a quotation and surfaced only incidentally, as the named entity “Jam Tiberium.” On
  hard-wrapped prose this is not an edge case; it is the common case.
- **“Nunc dimittis” (line 53) was not flagged** despite being deleted and containing no line
  break, which suggests a minimum-length threshold on quoted spans somewhere above 14
  characters. A short quotation is often the most specific atom on the page.
- Net effect on this document: the scan under-reported by half. A critic treating its output
  as the complete loss inventory would have returned five findings instead of eleven.

**Verdict: MATERIAL-LOSS**

RESULT: MATERIAL-LOSS | findings=11 | uncited=0 | contradicts_scan=0

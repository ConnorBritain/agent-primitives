# Positive (AI-labelled draft) — chesterton-x-bacon-r3 · REVISE

HEADING WORDING IS THE TOOL'S, NOT THIS RUN'S. `run-harness.mjs` and `verify-run.mjs` hardcode the voice profile's positive phrase as "AI-labelled draft". This draft is a HUMAN sample by a different author than the corpus, staged as a cross-author substitution. Nothing here is AI-labelled. The wording could not be corrected from the track that produced this run.

CONTRACT DRIFT, and the RESULT line below understates it. This transcript contains SIX findings, written as `**1. LOCATION**` ... `**6. LOCATION**` instead of the contract's bare `**LOCATION**`. `run-harness.mjs` derives the findings count from /\*\*LOCATION\*\*/g, which matches none of them, so `findings=0` is the tool's count and it is wrong. Left uncorrected: editing the transcript to make the count come out is exactly what the harness exists to prevent. Counted as 6 in tally.mjs, which is stated there.

---

## Findings

**1. LOCATION**: lines 1–23, whole opening; "Men in great place are thrice servants—servants of the sovereign or state, servants of fame, and servants of business"

**WHAT**: The draft is impersonal aphoristic counsel with no narrator, no occasion, and no incident; the corpus is first-person reportage that begins from a dated event and reasons outward from it.

**CORPUS EVIDENCE**: All ten samples open in the first person on a specific occasion and keep the narrator on stage throughout — "The other day I was nearly arrested by two excited policemen in a wood in Yorkshire" (sample-04, line 1); "The other day, while I was meditating on morality and Mr. H. Pitt, I was, so to speak, snatched up and put into a jury box" (sample-09, line 1); "In the town of Belfort I take a chair and I sit down in the street" (sample-06, line 1); "About noon of an ashen autumn day some years ago I was standing outside the station at Oxford" (sample-08, line 19). Sample-09 is the closest match in subject — an argued political thesis about juries and expertise — and it still runs the whole argument out of a personal seat in the jury box ("I speak these feelings because out of the furnace of them there came a curious realisation of a political or social truth", lines 48–49). The draft never once uses "I". The word does not appear in 101 lines.

**CONFIDENCE**: high

---

**2. LOCATION**: lines 41–48; "In the discharge of thy place, set before thee the best examples... but yet set it down to thyself, as well to create good precedents as to follow them"; also lines 54–60, 62–72, 95–98.

**WHAT**: Sustained second-person imperative address using archaic pronouns (thy / thee / thyself / thine / thou didst), a sentence shape absent from every sample.

**CORPUS EVIDENCE**: The author addresses the reader as a fellow "we", or as a hypothetical "he", never as "thou", and issues no imperatives: "we are speaking very appropriately when we call it a bullet-head" (sample-06, lines 78–79); "In this case we must be logical and exact; for we have to keep watch upon ourselves" (sample-04, line 121); "You may suppose me, for the sake of argument, sitting at lunch" (sample-02, line 17) — modern "you", and used to seat the reader beside the narrator rather than to instruct him. Absent from all ten samples.

**CONFIDENCE**: high

---

**3. LOCATION**: lines 66–79; "for integrity used doth the one, but integrity professed... doth the other"; "Whosoever is found variable, and changeth manifestly without manifest cause, giveth suspicion of corruption"; "severity breedeth fear, but roughness breedeth hate"; "as Solomon saith". Also "showeth" (line 83), "saith Tacitus" (line 85), "dost" (line 95).

**WHAT**: Archaic third-person verb inflection in -eth/-th throughout, heard plainly when read aloud.

**CORPUS EVIDENCE**: The corpus is modern-inflected without exception, including where it reaches for scriptural cadence: "Whoever will lose his life, the same shall save it" (sample-09, line 78); "God had clothed his neck with thunder" (sample-06, line 97); "'Why seek ye the living among the dead? He is not here; he is risen'" (sample-05, lines 118–119) — the one place the author writes an archaism, it is inside quotation marks and marked as quotation. Absent from all ten samples in the author's own voice.

**CONFIDENCE**: high

---

**4. LOCATION**: lines 9–10, 25–27, 37–39, 84–87; "Cum non sis qui fueris, non esse cur velis vivere"; "Illi mors gravis incubat, / Qui notus nimis omnibus, / Ignotus moritur"; "Omnium consensu capax imperii, nisi imperasset"

**WHAT**: Untranslated Latin quoted as load-bearing evidence, four times, with the authority left to stand on the source's name.

**CORPUS EVIDENCE**: The author quotes in English, and when he handles a foreign language he translates it into deliberately comic English rather than leaving it: "The man with the black beard said: 'It must that we have the Progress'" (sample-03, line 54), an entire tram argument rendered in mock-literal French-English. Where he invokes Latin at all it is as a joke about lucidity — "Anybody can understand long words because they have in them all the lucidity of Latin" (sample-03, lines 51–52). No untranslated foreign quotation appears in any of the ten samples.

**CONFIDENCE**: high

---

**5. LOCATION**: lines 29–39; "for good thoughts, though God accept them, yet towards men are little better than good dreams, except they be put in act; and that cannot be without power and place, as the vantage and commanding ground"

**WHAT**: Abstractions are argued against other abstractions and never cashed into a physical object or scene; the register is counsel to a governing class rather than the author's range.

**CORPUS EVIDENCE**: The author's method is to force every abstraction through a concrete thing within a sentence or two — a lamp-post carries the whole argument about French and English politics (sample-06, lines 37–43); tram tickets carry municipal patriotism (sample-10, lines 65–80); a watch-chain carries the modern bondage ("the heaviest chain ever tied to a man--it is called a watch-chain", sample-02, lines 26–27); a jury box carries the case against expertise (sample-09). Across 101 lines the draft names no object, no place, no date, and no living person other than as classical citation. Related vocabulary outside the corpus range: "privateness" (line 11), "facility" in the sense of over-compliance (line 61, 77), "conscience of the same is the accomplishment of man's rest" (lines 35–36).

**CONFIDENCE**: high

---

**6. LOCATION**: whole document, lines 1–101

**WHAT**: The tone is level and magisterial from first line to last; the corpus visibly changes tone with subject and within a single piece.

**CORPUS EVIDENCE**: The corpus shifts audibly. Sample-07 runs knockabout comedy and dialogue ("'Pick your mallet up,' said Parkinson, 'have another go.'") and closes in genuine dread ("I heard the dull click of the balls touching, and ran into the house like one pursued", lines 126–127). Sample-09 moves from farce over the missing C's of Battersea ("the woman at the street corner is weeping for her Coffintop", lines 15–16) to unguarded gravity forty lines later ("Never had I stood so close to pain; and never so far away from pessimism", lines 44–45). Sample-08 shifts from essayistic digression to flat horror at the stoker's line. The draft has no such modulation: the pitch at line 1 is the pitch at line 101.

**CONFIDENCE**: high

---

## Category status

1. Register breaks — not clean (findings 1, 5, 6).
2. Constructions the author does not use — not clean (findings 2, 3, 4).
3. Vocabulary reaching outside the corpus — not clean (finding 5).
4. Rhythm that flattens — **not assessed**. No deterministic rhythm scan was supplied, and I am not guessing at it.
5. Voice that never shifts — not clean (finding 6). The corpus shifts visibly, which is the precondition for raising this.

**REVISE**

RESULT: REVISE | findings=0 | uncited=0 | authorship_claims=0

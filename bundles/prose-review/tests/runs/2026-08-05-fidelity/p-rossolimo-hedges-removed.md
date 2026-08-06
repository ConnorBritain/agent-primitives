# Positive (lossy revision) — rossolimo-hedges-removed · MATERIAL-LOSS

Class D: scan FAITHFUL. Nine hedges, bounds and attributions removed with every atom intact.

---

# prose-fidelity-critic — p-rossolimo-hedges-removed

## Findings

**CLASS**: claim-drift
**ORIGINAL** (l. 42–44): "I have always tried where it was possible to be consistent with the facts of science, and where it was impossible I have preferred not to write at all."
**REVISION**: "I have always been consistent with the facts of science."
**WHAT THE READER LOSES**: The original claims an effort ("tried") bounded by feasibility, plus a stated fallback — silence when science could not be honoured; the revision claims unbroken achievement, and the reader can no longer tell that Chekhov admitted cases where consistency was impossible or what he did about them.

**CLASS**: claim-drift
**ORIGINAL** (l. 44–46): "I may observe in passing that the conditions of artistic creation do not always admit of complete harmony with the facts of science."
**REVISION**: "The conditions of artistic creation do not admit of complete harmony with the facts of science."
**WHAT THE READER LOSES**: "not always" becomes "not [at all]" — an occasional exception is restated as a universal impossibility, and the aside marker "I may observe in passing" that framed it as a minor observation is gone, so the reader takes as Chekhov's flat doctrine a claim he made only about some cases.

**CLASS**: claim-drift
**ORIGINAL** (l. 22–23): "chose the Faculty of Medicine I don’t remember on what grounds"
**REVISION**: "chose the Faculty of Medicine on good grounds"
**WHAT THE READER LOSES**: An admission of forgotten, possibly arbitrary motive is replaced by an assertion that the motive was sound — the polarity of the statement is reversed, and the reader can no longer see that Chekhov disclaimed knowing why he chose medicine.

**CLASS**: claim-drift
**ORIGINAL** (l. 38–39): "it is probably due to my close association with medicine that I have succeeded in avoiding many mistakes"
**REVISION**: "it is due to my close association with medicine that I have succeeded in avoiding many mistakes"
**WHAT THE READER LOSES**: A conjecture about causation is presented as established causation; the reader cannot recover that Chekhov himself was unsure medicine was the cause.

**CLASS**: claim-drift
**ORIGINAL** (l. 34): "I have no doubt that the study of medicine has had an important influence on my literary work"
**REVISION**: "The study of medicine has had an important influence on my literary work"
**WHAT THE READER LOSES**: The claim was explicitly Chekhov's own conviction; stripped of attribution it reads as a fact about his work stated from outside, and the reader loses that this is self-assessment.

**CLASS**: dropped-qualification
**ORIGINAL** (l. 21–22): "I had at the time only a slight idea of the Faculties in general"
**REVISION**: "I had an idea of the Faculties in general"
**WHAT THE READER LOSES**: Both the degree ("only a slight") and the time-scoping ("at the time") are gone; the reader can no longer tell that the young Chekhov was near-ignorant of what the faculties were, which is the whole point of the sentence that follows.

**CLASS**: dropped-qualification
**ORIGINAL** (l. 28–31): "Not counting reviews, feuilletons, paragraphs, and all that I have written from day to day for the newspapers, which it would be difficult now to seek out and collect,"
**REVISION**: `absent`
**WHAT THE READER LOSES**: The exclusion that scopes the output figure. Without it the reader takes "three hundred signatures" as Chekhov's complete published output rather than his output excluding an uncounted and now-untraceable mass of journalism.

**CLASS**: claim-drift
**ORIGINAL** (l. 30–32): "I have, during my twenty years of literary work, published more than three hundred signatures of print"
**REVISION**: "I have, during my twenty years of literary work, published three hundred signatures of print"
**WHAT THE READER LOSES**: A lower bound becomes an exact count; the reader can no longer tell the true figure exceeds three hundred, and reads a floor as a total.

**CLASS**: dropped-qualification
**ORIGINAL** (l. 15–16): "On a separate sheet I send a few facts, very bald, but I can do no more...."
**REVISION**: "On a separate sheet I send the facts."
**WHAT THE READER LOSES**: Chekhov's disclaimer about what follows — that it is a few bald facts and the limit of what he is willing to supply. The revision presents the enclosure as *the* facts, so the reader has no signal that the account is deliberately partial.

## Immaterial losses

The scan flagged no missing atoms (11 checked, none material-missing), so there is no flagged-atom list to account for. Every finding above is claim drift or a dropped qualification, all of it invisible to a string comparison because the surviving words are still on the page.

Non-findings noted and dismissed: "but did not regret my choice" → "and did not regret my choice" (connective only, claim unchanged); paragraph-level sentence merging around the medicine passage (relations between claims preserved); the frontmatter block differing between files (fixture metadata, not prose).

## Scanner defects

None that make the scan wrong on presence — it is accurate that no atom string vanished. One coverage gap worth recording as a tool bug report rather than a fidelity finding: `fidelity-scan` treats a number as present when its bounding modifier is stripped ("more than three hundred" → "three hundred"), so a lower bound silently becoming an exact count passes as an intact atom. The verdict line "11 atoms checked, none material-missing" is, on this pair, a true statement that reads as reassurance a reader should not take.

**Verdict: MATERIAL-LOSS**

RESULT: MATERIAL-LOSS | findings=9 | uncited=0 | contradicts_scan=0

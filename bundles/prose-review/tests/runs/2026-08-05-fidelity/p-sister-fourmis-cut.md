# Positive (lossy revision) — sister-fourmis-cut · MATERIAL-LOSS

Six named entities dropped, of which the scan sees one. Six of seven findings came from reading, not from the flagged list.

---

# prose-fidelity-critic - p-sister-fourmis-cut

## Findings

**CLASS**: dropped-fact
**ORIGINAL**: line 57 - "putting down the riots in Fourmis (there were many killed and wounded)"
**REVISION**: "putting down some riots in the north"
**WHAT THE READER LOSES**: The place name and the casualties. A reader can no longer identify which event was debated (the Fourmis shootings of 1 May 1891 are a datable, lookup-able incident), and "some riots in the north" carries no indication that people were killed and wounded - which is the reason the sitting was stormy.

**CLASS**: dropped-fact
**ORIGINAL**: line 55-56 - "the Minister for Internal Affairs was called to account"
**REVISION**: "a minister was called to account"
**WHAT THE READER LOSES**: Which office was answerable. The original pins responsibility on the ministry that controls the police; "a minister" leaves the reader unable to work out whether the person questioned had anything to do with the repression being questioned.

**CLASS**: dropped-fact
**ORIGINAL**: line 50 - "to do a bust of Suvorin, and this will keep us till Saturday"
**REVISION**: "to do a bust of a friend, and this will keep us till Saturday"
**WHAT THE READER LOSES**: The identity of the travelling companion. Suvorin is the publisher Chekhov was travelling with; "a friend" removes the only thing in the letter that tells the reader who "us" is.

**CLASS**: dropped-fact
**ORIGINAL**: lines 39-40 - "In comparison with the landscape painters I saw here yesterday Levitan is a king...."
**REVISION**: `absent`
**WHAT THE READER LOSES**: The entire comparative judgement, and Levitan's name. The revision keeps the generic claim that Russian artists are more serious but drops the specific artist and the specific genre (landscape painting) on which the claim rests, so the reader cannot tell what Chekhov was actually comparing.

**CLASS**: dropped-fact
**ORIGINAL**: line 37 - "I went to the Salon and couldn't see half the pictures"
**REVISION**: "I went to an exhibition of pictures and couldn't see half of them"
**WHAT THE READER LOSES**: Which exhibition. The Salon is a named annual institution and dates the visit; "an exhibition of pictures" could be anything, including the Exposition mentioned earlier in the same letter, which the reader may now wrongly conflate with it.

**CLASS**: dropped-fact
**ORIGINAL**: line 32 - "I heard the midnight service in the Church of the Embassy...."
**REVISION**: "I heard the midnight service at church...."
**WHAT THE READER LOSES**: That the Easter service was at the Russian embassy church. The point of the sentence - that his first Easter abroad was still kept in a Russian institution - is unrecoverable from "at church".

**CLASS**: dropped-qualification
**ORIGINAL**: line 57 - "the riots in Fourmis"
**REVISION**: "some riots in the north"
**WHAT THE READER LOSES**: Definiteness. The original refers to one specific, already-known event; "some riots" makes it an unspecified plural, so the reader cannot tell whether the Chamber was debating a single incident or a wave of them.

## Immaterial losses

- None. The scan flagged exactly one atom - "Minister for Internal Affairs" - and it is raised as a finding above.

## Scanner defects

- The scan flagged only "Minister for Internal Affairs". It did not flag "Suvorin" (original line 50), "Fourmis" (line 57), "Levitan" (line 40), "Salon" (line 37), or "Church of the Embassy" (line 32), all of which are named entities present in the original and absent from the revision. Six of the seven findings above came from reading, not from the scan; the entity extractor appears to miss single-token capitalised names and multi-word names in mid-sentence position. Treat the scan's named-entity list as a floor, not a census.
- The scan reported no loss for the deleted sentence at original lines 39-40, which vanished whole. Whatever span- or sentence-level check exists did not fire on a full-sentence deletion.

## Verdict

**MATERIAL-LOSS**

RESULT: MATERIAL-LOSS | findings=7 | uncited=0 | contradicts_scan=0

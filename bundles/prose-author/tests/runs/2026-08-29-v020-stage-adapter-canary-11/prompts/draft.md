Write the requested draft using only the request and compiled voice-profile controls below.
Follow the system prompt and its output contract exactly. You have no corpus access.

## Request

Write a 300-word reply to a colleague at a small nonprofit who asks whether they should use an AI service to summarise confidential intake notes. They need a practical answer for a meeting tomorrow. Be direct, collegial, and specific about the decision.

## Compiled rhetorical control card

Profile: eff-mullin; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address appears chiefly when converting analysis into action or placing readers inside a practical scenario. Use it near a closing call aimed at an eligible constituency, or in a pointed hypothetical that asks readers to test a bill’s claimed protections against ordinary online behavior.
- o02 [person-reader-stance, self-reference-biography; section:address; measurement:first-person-plural-family]: The plural voice usually speaks for the advocacy organization or expands a civil-liberties stake to include the public. Use it to report institutional actions, state a considered position, or frame shared rights; keep the referent clear rather than shifting casually between organization and readership.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contractions keep legal and technical analysis in spoken, accessible English, especially in thesis turns, rebuttals, and plain statements of consequence. Use them when translating statutory claims into everyday terms or challenging a disclaimer; they help dense policy explanation sound direct without reducing its seriousness.
- o04 [contraction-negation; section:cadence; measurement:uncontracted-negatives]: Full negative forms carry deliberate weight when stating legal limits, unresolved facts, or firm recommendations: a bill “does not” solve a problem, lawmakers “should not” act, or a system “cannot” perform the demanded task. Place them at consequential rebuttals where precision matters more than conversational flow.
- o05 [self-reference-biography; section:absences; measurement:first-person-singular-family]: Individual self-reference yields to the organization’s plural voice, allowing evidence and institutional judgment to carry the argument. Present investigations, submissions, outreach, and conclusions as organizational acts; avoid personal anecdote or individual authority when the collective stance can identify responsibility more accurately.
- o06 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions work as compact stress tests rather than open invitations to debate. Cluster them after explaining a rule, then ask what it would mean for recognizable lawful behavior or technical constraints. Let the following prose answer the challenge and convert statutory ambiguity into concrete consequences.
- o07 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Round brackets largely belong to citation markup, abbreviations, definitions, and brief examples rather than extended conversational asides. Use visible parentheses to decode a bill name or delimit a compact clarification; keep substantive pivots in the sentence itself and treat linked-source brackets as documentary infrastructure.
- o08 [interruption-punctuation; section:cadence; measurement:em-dashes]: Em dashes sharpen pivots, insert decisive glosses, and connect a stated policy mechanism to its less obvious consequence. Use them where a comma would blur the contrast—especially before a corrective phrase, compressed example, or emphatic qualification—while preserving the main argumentative line on either side.
- o09 [interruption-punctuation; section:absences; measurement:en-dashes]: En dashes do not establish a separate interruptive role; the stable alternatives are em dashes for pivots and parentheses for bounded clarification. Use those forms when breaking or supplementing a clause, and reserve the en dash for ordinary typographic ranges rather than rhetorical interruption.
- o10 [qualification-hedging; section:register-range]: Concessions acknowledge the attractive goal, a real harm, or an improved amendment before a firm “but” redirects attention to design and consequences. Predictions are tied to incentives with forms such as “may,” “likely,” and “will.” Place qualification immediately before the rebuttal it makes more credible.
- o11 [opponents-allies-sources; section:address]: Introduce legislation, agencies, supporters, and companies by name, then attach claims to linked text, quoted language, reports, or institutional actions. Credit allies concretely and represent supporters’ stated rationale before correcting it through incentives or implementation details. Place source-backed correction directly after the opposing claim.
- o12 [figures-analogy; section:figures]: Concrete figures translate institutional machinery into familiar objects or outcomes: a registry becomes a card catalog, stored conversations a valuable vault, and predictable censorship a movie already seen. Keep comparisons compact, attach them to an explained mechanism, and use them to clarify stakes rather than decorate openings.
- o13 [openings-endings-closure; section:closings]: Open by naming the live legislative or institutional action, briefly granting its advertised purpose, and turning quickly to the central defect. Sections often end on a plain consequence. Close by returning to the governing public-interest stake and directing lawmakers, providers, venues, or affected readers toward a specific response.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: rated; instructions o03, o04.
- qualification-hedging: described; instructions o10.
- questions-imperatives-vocatives: rated; instructions o06.
- opponents-allies-sources: described; instructions o11.
- profanity-vulgarity: unresolved; no instruction; The measured absence has no supported positive replacement, so the corpus cannot establish a constructive drafting instruction for this dimension..
- self-reference-biography: absent-paired; instructions o02, o05.
- interruption-punctuation: absent-paired; instructions o07, o08, o09.
- figures-analogy: described; instructions o12.
- openings-endings-closure: described; instructions o13.

## Deterministic draft target card

Requested length: 300 words. Aim counts are length-scaled from the profile's measured rates.
The min/max values reproduce the unchanged 2x ratio and 2-instance absolute ship gate; they do not relax it.
Count by the referenced measurement rule after drafting. Aim at the center, not merely the edge.

- o01 [measurement:second-person-family] (person-reader-stance; measured-positive): aim 0; unchanged gate range 0–2.
- o02 [measurement:first-person-plural-family] (person-reader-stance, self-reference-biography; measured-positive): aim 1; unchanged gate range 0–2.
- o03 [measurement:contractions] (contraction-negation; measured-positive): aim 3; unchanged gate range 2–6.
- o04 [measurement:uncontracted-negatives] (contraction-negation; measured-positive): aim 1; unchanged gate range 0–3.
- o05 [measurement:first-person-singular-family] (self-reference-biography; counted-absence): aim 0; unchanged gate range 0–2.
- o06 [measurement:question-marks] (questions-imperatives-vocatives; measured-positive): aim 0; unchanged gate range 0–2.
- o07 [measurement:round-parenthetical-spans] (interruption-punctuation; measured-positive): aim 4; unchanged gate range 2–7.
- o08 [measurement:em-dashes] (interruption-punctuation; measured-positive): aim 2; unchanged gate range 0–3.
- o09 [measurement:en-dashes] (interruption-punctuation; counted-absence): aim 0; unchanged gate range 0–2.

Described observations have restrained placement but no numeric quota.
Before returning the source, count the finished draft and revise it until every measured actual is inside its stated min/max range.
An omitted record explains an unsupported qualitative instruction; it does not excuse an out-of-range measured habit.
If a supported target cannot be applied, name its coverage dimension and observation ID in omitted; never drop it silently.

Return voice-draft-source/4 exactly as described by the system prompt.
Put the finished prose directly in draft; do not split it into sentence objects.
The portable deterministic boundary segments the immutable prose for an independent
claim audit, derives the public verification record, owns draft/refusal fences, and
removes empty disclosure arrays from voice-draft/1.

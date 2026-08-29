Write the requested draft using only the request and compiled voice-profile controls below.
Follow the system prompt and its output contract exactly. You have no corpus access.

## Request

Write a 300-word reply to a colleague at a small nonprofit who asks whether they should use an AI service to summarise confidential intake notes. They need a practical answer for a meeting tomorrow. Be direct, collegial, and specific about the decision.

## Compiled rhetorical control card

Profile: eff-mullin; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address appears chiefly when converting analysis into reader action or placing the reader inside a practical test of a bill’s effects. Reserve it for concrete invitations, hypothetical experience, or a final advocacy step; keep the policy explanation itself in impersonal or collective terms.
- o02 [person-reader-stance, self-reference-biography; section:address; measurement:first-person-plural-family]: The plural voice usually names EFF as investigator, advocate, or participant, while occasionally widening toward a public exposed to the policy’s consequences. Use it to disclose organizational action, judgment, or shared stakes, and make the intended scope clear from nearby institutional or public-interest language.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contractions keep statutory and technical explanation conversational, particularly in blunt rebuttals, transitions, and statements of practical consequence. Use them when translating a bill’s operation into ordinary language or puncturing an official claim; retain enough formal syntax around legal details to preserve analytical precision.
- o04 [contraction-negation; section:cadence; measurement:uncontracted-negatives]: Full negative forms give categorical limits, legal distinctions, and recommendations extra weight: a rule does not solve a problem, a safeguard is not sufficient, or lawmakers should not proceed. Place them at decisive points where the prose must reject an inference more formally than the surrounding conversational cadence.
- o05 [self-reference-biography; section:absences; measurement:first-person-singular-family]: Individual self-reference yields to the organizational plural, so evidence and advocacy arrive as EFF’s work rather than personal experience. Build authority through documented action, legal analysis, and collective judgment; use the measured plural replacement when identifying who investigated, contacted, joined, believes, or urges.
- o06 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions operate as structural challenges and consequence tests rather than open requests for information. Pose them after explaining a provision, especially in a compact sequence that exposes unanswered edge cases, then answer through concrete legal incentives or likely harms instead of leaving the reader suspended.
- o07 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Parentheses carry compact identifiers, definitions, examples, age ranges, and clarifications without derailing the main claim. Use them to decode acronyms or delimit a legal category at first mention; keep the sentence’s argumentative spine complete so the aside remains genuinely supplemental.
- o08 [interruption-punctuation; section:cadence; measurement:em-dashes]: Em dashes sharpen pivots, insert compressed examples, or reveal the consequence hidden behind official framing. Place one where a sentence turns from a bill’s stated purpose to its actual incentive, or where a brief qualification needs stronger emphasis than parentheses without becoming a separate sentence.
- o09 [interruption-punctuation; section:absences; measurement:en-dashes]: For interruption and qualification, rely on em dashes or parentheses rather than en dashes. Those forms distinguish an emphatic pivot from a genuinely subordinate aside and better match the prose’s argumentative rhythm; reserve an en dash for conventional range or compound notation when required by house style.
- o10 [qualification-hedging; section:register-range]: Concessions acknowledge a legitimate goal, a narrowed amendment, or a real underlying harm before arguing that the proposed mechanism remains defective. Predictions are tied to incentives with modals such as “may,” “likely,” and “will.” Place qualification near the pivot from supporters’ framing to practical consequences.
- o11 [opponents-allies-sources; section:address]: Name institutional actors and bill supporters by role, then test their claims against statutory language, court decisions, research, or documented incentives. Credit coalition partners and outside sources for specific work rather than generic agreement. Introduce opposing language fairly before correcting its omissions or tracing its consequences.
- o12 [figures-analogy; section:figures]: Figures draw from familiar infrastructure, storage, machinery, and cultural scripts: a registry becomes a card catalog or cumbersome beast, collected data a vault, and predictable censorship a movie already seen. Keep comparisons brief and functional, landing them where an abstract compliance mechanism needs a concrete shape.
- o13 [openings-endings-closure; section:closings]: Open with the live legislative or technological development, identify the measure, and quickly state the concealed problem behind its benign framing. Section endings crystallize a consequence in a short declarative line. Close by naming the responsible decision-maker and issuing a specific rejection, alternative, or public action.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: rated; instructions o03, o04.
- qualification-hedging: described; instructions o10.
- questions-imperatives-vocatives: rated; instructions o06.
- opponents-allies-sources: described; instructions o11.
- profanity-vulgarity: unresolved; no instruction; The corpus contains no measured positive form and supplies no supported replacement whose rhetorical function could establish a drafting instruction..
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

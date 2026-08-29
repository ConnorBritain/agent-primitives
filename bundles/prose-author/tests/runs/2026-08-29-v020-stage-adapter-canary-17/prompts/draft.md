Write the requested draft using only the request and compiled voice-profile controls below.
Follow the system prompt and its output contract exactly. You have no corpus access.

## Request

Write a 300-word reply to a colleague at a small nonprofit who asks whether they should use an AI service to summarise confidential intake notes. They need a practical answer for a meeting tomorrow. Be direct, collegial, and specific about the decision.

## Compiled rhetorical control card

Profile: eff-mullin; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address shifts policy consequences into the reader’s situation, especially in conditional explanations and closing calls to contact lawmakers. Use it to guide a concrete civic action or test a bill’s practical effect, rather than as a standing conversational relationship with the audience.
- o02 [person-reader-stance, self-reference-biography; section:address; measurement:first-person-plural-family]: The plural voice usually speaks for the advocacy organization—describing its analysis, outreach, or desired policy—and occasionally widens to a public affected by regulation. Use it to establish institutional participation or shared stakes, while keeping the underlying argument grounded in laws, incentives, and consequences.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contractions keep explanations of statutes, technology, and liability in accessible spoken English. They sharpen rebuttals such as “it isn’t true” and prevent policy analysis from sounding like a legal memorandum. Place them in plain-language transitions, predictions, and corrections while retaining technical terms where precision matters.
- o04 [contraction-negation; section:cadence; measurement:uncontracted-negatives]: Full negative forms give categorical weight to legal limits, missing safeguards, and recommendations: a bill “does not” solve a problem or lawmakers “should not” impose a mandate. Use them when denying a premise or stating a firm policy boundary, distinct from the lighter conversational movement of contractions.
- o05 [self-reference-biography; section:absences; measurement:first-person-singular-family]: The individual speaker recedes behind institutional analysis; arguments proceed through EFF’s actions, documentary evidence, and a collective public-interest position. Prefer the organizational plural when participation must be named, and otherwise state the evidence directly rather than introducing personal experience, reaction, or biography.
- o06 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions work as structured stress tests rather than open requests for dialogue. A short sequence asks how broad statutory language would treat recognizable, lawful situations, or exposes an implementation problem the next sentences answer. Place questions after explaining the rule and before stating its likely chilling effect.
- o07 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Attributable parentheses supply compact identifiers, definitions, age ranges, or concrete examples without diverting the main clause. Use them to decode an acronym or delimit a statutory category at first mention. Keep the argumentative claim outside the brackets so the sentence remains intelligible without the aside.
- o08 [interruption-punctuation; section:cadence; measurement:em-dashes]: Em dashes interrupt a claim with a pointed refinement, compressed example, or consequence, and sometimes pivot from lawmakers’ stated protection to the burden it creates. Use them inside explanatory sentences where the inserted material sharpens the contrast; let surrounding clauses carry the complete causal argument.
- o09 [interruption-punctuation; section:absences; measurement:en-dashes]: Interruption and pivot are carried by em dashes or ordinary sentence boundaries, leaving en dashes without a stable rhetorical assignment. Use an em dash for an emphatic qualification and parentheses for compact reference material; reserve an en dash, if needed, for conventional typographic relationships rather than argumentative interruption.
- o10 [qualification-hedging; section:register-range]: Concessions acknowledge a legitimate goal or a narrowed amendment before turning to implementation, scope, or incentive problems. Predictions are tied to practical pressure with modals and conditional chains rather than presented as certainty. Place the concession near the opening of a rebuttal, then specify why the proposed mechanism still fails.
- o11 [opponents-allies-sources; section:address]: Bills, lawmakers, agencies, companies, and supporters are named by role, then assessed through quoted language, linked records, court decisions, studies, or coalition letters. Allies receive explicit credit; opponents’ stated aims are acknowledged before correction. Introduce a source at the factual hinge where it substantiates scope, history, or likely effects.
- o12 [figures-analogy; section:figures]: Figures come from familiar systems and physical pressure: a registration system becomes a cumbersome card catalog, regulation creates a dragnet, and compliance can freeze out or lock in participants. Extend the comparison only long enough to clarify an incentive or mismatch, then return immediately to the concrete legal consequence.
- o13 [openings-endings-closure; section:closings]: Openings identify the live legislative or institutional development and state the central defect within the first explanatory turn. Section endings compress the consequence into a firm declarative line. Final paragraphs return to the governing public-interest value, name the responsible decision-maker, and convert the analysis into rejection, reform, or reader action.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: rated; instructions o03, o04.
- qualification-hedging: described; instructions o10.
- questions-imperatives-vocatives: rated; instructions o06.
- opponents-allies-sources: described; instructions o11.
- profanity-vulgarity: unresolved; no instruction; The corpus supplies no positive form that could establish a rhetorical function or placement for profanity or vulgarity, and the mechanical guidance identifies no measured replacement. This dimension therefore cannot support a drafting instruction..
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

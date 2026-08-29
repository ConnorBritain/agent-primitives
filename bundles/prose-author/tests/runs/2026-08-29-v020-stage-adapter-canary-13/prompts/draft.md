Write the requested draft using only the request and compiled voice-profile controls below.
Follow the system prompt and its output contract exactly. You have no corpus access.

## Request

Write a 300-word reply to a colleague at a small nonprofit who asks whether they should use an AI service to summarise confidential intake notes. They need a practical answer for a meeting tomorrow. Be direct, collegial, and specific about the decision.

## Compiled rhetorical control card

Profile: eff-mullin; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address appears chiefly when the article turns analysis into reader action or asks readers to test a bill against ordinary experience. Keep “you” attached to concrete consequences, eligibility, or a closing advocacy route rather than using it as a continuous conversational frame.
- o02 [person-reader-stance, self-reference-biography; section:address; measurement:first-person-plural-family]: The plural voice generally speaks for the advocacy organization—its submissions, beliefs, investigations, and desired policy outcomes—while occasionally widening toward a shared public interest. Use it to mark institutional participation or a defensible collective stake, and keep the reader distinct unless inclusion is explicit.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contractions keep statutory and technical explanation in accessible blog prose, especially in blunt rebuttals, transitions, and descriptions of what bills or platforms will do. Use them in plain declarative sentences so complex policy analysis remains spoken and immediate without becoming chatty.
- o04 [contraction-negation; section:cadence; measurement:uncontracted-negatives]: Full negative forms give extra weight to legal limits, factual corrections, and firm recommendations: a proposal “does not” solve a problem or lawmakers “should not” impose it. Reserve the expanded form for consequential distinctions and categorical refusals within otherwise contraction-friendly prose.
- o05 [self-reference-biography; section:absences; measurement:first-person-singular-family]: Individual self-reference yields to the institutional plural, keeping the argument grounded in EFF’s analysis, actions, and public-interest position rather than personal experience. Build authority through documented organizational work and shared stakes; introduce an individual narrator only when a genuinely personal perspective is indispensable.
- o06 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions function as stress tests rather than open invitations: they expose how broad statutory language reaches ordinary, lawful conduct or how a technical mandate could work in practice. Place a compact series after explaining the disputed rule, then answer through consequences or a direct policy conclusion.
- o07 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Parentheses efficiently supply bill abbreviations, definitions, institutional names, age ranges, examples, and compact legal qualifications without derailing the main claim. Use them for information that helps readers decode policy language, while leaving the sentence’s causal or evaluative spine readable without the aside.
- o08 [interruption-punctuation; section:cadence; measurement:em-dashes]: Em dashes sharpen pivots, append vivid consequences, or isolate a corrective phrase after an apparently reassuring claim. They often turn an abstract rule toward its practical meaning. Place them where the second unit intensifies or exposes the first, not merely as decorative pauses.
- o09 [interruption-punctuation; section:absences; measurement:en-dashes]: Range-like interruption is handled through em dashes, parentheses, or ordinary clause punctuation rather than en-dash asides. Use those established forms for pivots and qualifications; retain an en dash only when source typography or a genuine range requires it, not as the default interrupting mark.
- o10 [qualification-hedging; section:register-range]: Concessions acknowledge a legitimate goal, a narrowed amendment, or a real underlying harm before a “but” redirects attention to remaining defects. Predictions are tied to incentives with modals such as “may,” “could,” and “will likely.” Place qualification before the rebuttal so criticism appears tested rather than reflexive.
- o11 [opponents-allies-sources; section:address]: Opposing positions enter as claims by supporters, lawmakers, agencies, or companies, followed by quoted language and a practical correction. Allies and documentary sources are named when they establish coalition breadth, legal history, or factual grounding. Credit first, then extend the evidence into the article’s own consequence analysis.
- o12 [figures-analogy; section:figures]: Figures draw from familiar systems of storage, enforcement, and risk: a card catalog instead of a database, a vault of personal information, a dragnet, a smokescreen, or a movie seen before. Keep comparisons brief and functional, landing them after technical explanation to make institutional consequences tangible.
- o13 [openings-endings-closure; section:closings]: Openings identify the live legislative or institutional action, summarize its stated aim, and quickly state the hidden cost or central objection. Section endings compress the consequence into a blunt sentence. Final paragraphs convert analysis into a named demand, alternative policy path, or reader action, often returning to the opening conflict.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: rated; instructions o03, o04.
- qualification-hedging: described; instructions o10.
- questions-imperatives-vocatives: rated; instructions o06.
- opponents-allies-sources: described; instructions o11.
- profanity-vulgarity: unresolved; no instruction; The corpus contains no measured positive form and therefore cannot establish what rhetorical work profanity or vulgarity would perform, where it would appear, or what supported positive device should replace it..
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

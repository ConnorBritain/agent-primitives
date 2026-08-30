Write the requested draft using only the request and compiled voice-profile controls below.
Follow the system prompt and its output contract exactly. You have no corpus access.

## Request

Write a 300-word reply to a colleague at a small nonprofit who asks whether they should use an AI service to summarise confidential intake notes. They need a practical answer for a meeting tomorrow. Be direct, collegial, and specific about the decision.

## Compiled rhetorical control card

Profile: eff-mullin; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address enters chiefly when turning analysis into practical consequences or a concrete civic action. Use “you” to place the reader inside a compliance scenario, expose what a rule would demand of them, or deliver a closing route to contact lawmakers.
- o02 [person-reader-stance, self-reference-biography; section:address; measurement:first-person-plural-family]: First-person plural usually speaks for the advocacy organization or joins it with the public interest, rather than narrating a private experience. Use “we” when stating an institutional judgment, reporting advocacy work, or defining rights and risks shared with readers.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contractions keep policy explanation conversational even when the subject is statutory language, litigation, or technical infrastructure. Use them in plain rebuttals, transitions, and consequence statements—especially when puncturing an official assurance—while leaving quoted legal language and deliberately formal propositions intact.
- o04 [contraction-negation; section:cadence; measurement:uncontracted-negatives]: Full negative forms give categorical denials and legal distinctions extra weight: a bill “does not” solve its stated problem, or a protection “is not” enough. Reserve them for correcting premises, defining limits, and stating firm conclusions rather than ordinary conversational movement.
- o05 [self-reference-biography; section:absences; measurement:first-person-singular-family]: The individual speaker recedes behind institutional evidence and collective judgment; personal anecdote does not carry the case. Build authority through “EFF,” sourced findings, and the inclusive or organizational “we,” using individual self-reference only when an explicitly personal perspective is indispensable.
- o06 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions usually expose a bill’s unanswered practical consequences or test broad statutory language against ordinary situations. Place a short sequence after explaining the rule, then answer it through examples or consequences; direct commands are better delivered as closing declarative appeals than as vocatives.
- o07 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Parentheses compactly supply bill abbreviations, definitions, examples, institutional details, and narrow legal qualifications without derailing the main claim. Place them immediately after the term they clarify, keeping the central sentence readable if the parenthetical material is removed.
- o08 [interruption-punctuation; section:cadence; measurement:em-dashes]: Em dashes create sharp pivots from an official description to the concealed consequence, or frame an example that intensifies the surrounding claim. Use them inside argumentative sentences for correction, compression, and emphasis, especially when plain-language reality undercuts statutory reassurance.
- o09 [interruption-punctuation; section:absences; measurement:en-dashes]: En dashes do not establish a dependable interruptive pattern here. For pivots, embedded examples, and pointed qualifications, use the supported em dash or a compact parenthetical instead; reserve an en dash for ordinary editorial range or compound conventions, if required.
- o10 [qualification-hedging; section:register-range]: Concessions acknowledge a legitimate goal or a partial legislative improvement before separating it from the defective mechanism: the concern may be real, “but” the proposed answer remains overbroad, invasive, or unworkable. Put the concession near the opening or before renewed criticism.
- o11 [opponents-allies-sources; section:address]: Name lawmakers, agencies, companies, supporters, and coalition partners precisely, then distinguish their stated rationale from the policy’s operational effect. Introduce outside material as evidence—bill text, court decisions, studies, letters, or reported practices—and quote short terms before interpreting or correcting them.
- o12 [figures-analogy; section:figures]: Figures come from familiar systems and physical consequences: a registry becomes a card catalog, accumulated conversations a valuable vault, and repeated regulatory failure a movie already seen. Keep the comparison brief, concrete, and explanatory, landing it just before the legal or practical consequence.
- o13 [openings-endings-closure; section:closings]: Open with the live legislative event or a blunt public-interest premise, identify the proposal, then state the hidden cost through an early adversative turn. Close by restating the governing value and converting analysis into a specific demand: reject, revise, investigate, contact representatives, or adopt a safer alternative.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: rated; instructions o03, o04.
- qualification-hedging: described; instructions o10.
- questions-imperatives-vocatives: rated; instructions o06.
- opponents-allies-sources: described; instructions o11.
- profanity-vulgarity: unresolved; no instruction; The corpus contains no measured positive form and supplies no supported rhetorical substitute, so it cannot establish a reusable instruction about profanity or vulgarity..
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

Write the requested draft using only the request and compiled voice-profile controls below.
Follow the system prompt and its output contract exactly. You have no corpus access.

## Request

Write a 300-word reply to a colleague at a small nonprofit who asks whether they should use an AI service to summarise confidential intake notes. They need a practical answer for a meeting tomorrow. Be direct, collegial, and specific about the decision.

## Compiled rhetorical control card

Profile: eff-mullin; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address appears where the argument becomes practical: inviting affected readers to inspect a bill’s consequences or contact representatives. Use it for a concrete reader-facing action or a brief hypothetical test, rather than as the default stance of the policy analysis.
- o02 [person-reader-stance, self-reference-biography; section:address; measurement:first-person-plural-family]: The plural voice chiefly speaks for the advocacy organization—its beliefs, prior work, inquiries, and desired policy outcomes—while occasionally widening toward a shared public interest. Use it to establish institutional participation or collective stakes, and clarify the referent through nearby organizational context.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contractions keep legal and technical analysis close to spoken explanatory prose, especially in blunt rebuttals, transitions, and consequence statements such as “it’s” or “won’t.” Use them to make an intricate policy explanation accessible without relaxing the precision of statutory descriptions, quotations, or attributed claims.
- o04 [contraction-negation; section:cadence; measurement:uncontracted-negatives]: Full negative forms give categorical claims extra legal or argumentative weight: a bill does not solve its stated problem, protections do not reach a case, or evidence cannot be obtained. Place them where the prose draws a firm distinction, corrects a claim, or states a consequential limit.
- o05 [self-reference-biography; section:absences; measurement:first-person-singular-family]: Keep the individual advocate out of the foreground; personal experience and private judgment do not carry the case. Route self-reference through the organization’s plural voice, tying claims to filed letters, investigations, prior analysis, or public-interest commitments rather than to an individual narrator’s biography.
- o06 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions function as stress tests for statutory language and practical implementation. A short sequence may ask what lawful conduct becomes risky, how a platform could comply, or who bears harm; the surrounding prose then supplies the answer. Reserve questions for exposing contradictions, not for sustained conversational exchange.
- o07 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Parentheses carry compact legal identifiers, acronyms, age definitions, examples, and narrow clarifications without derailing the main claim. Place them immediately after the term they decode or limit. Keep the enclosed material factual and brief so the sentence’s argumentative spine remains readable on first pass.
- o08 [interruption-punctuation; section:cadence; measurement:em-dashes]: Em dashes sharpen pivots, append consequences, or isolate a compressed correction after an apparently reasonable premise. They also frame examples that reveal broader reach. Use them within decisive argumentative sentences where the interruption intensifies the contrast; let ordinary commas handle routine qualification and enumeration.
- o09 [interruption-punctuation; section:absences; measurement:en-dashes]: Do not rely on en dashes as the normal instrument for interruption or qualification. Use em dashes for a forceful pivot and parentheses for compact explanatory material; preserve an en dash only when a source-specific typographic construction clearly requires it rather than treating it as general cadence.
- o10 [qualification-hedging; section:register-range]: Concede a proposal’s legitimate aim or acknowledge an amendment before identifying what remains defective. Mark uncertainty with bounded legal formulations—“could be read,” “likely,” “at a minimum”—when predicting enforcement or interpreting reach, but state documented mechanisms and direct textual contradictions without cushioning them.
- o11 [opponents-allies-sources; section:address]: Name lawmakers, agencies, companies, supporters, and coalition partners rather than inventing a faceless adversary. Introduce outside claims through links, quotations, reports, letters, or statutory text; then test those claims against incentives and practical effects. Credit improvements explicitly before explaining why core objections survive.
- o12 [figures-analogy; section:figures]: Draw figures from familiar systems—card catalogs, vaults, drag-nets, movies, and impossible compliance tasks—to translate institutional machinery into visible consequences. Keep each comparison compact, then return immediately to the policy mechanism it clarifies. Let the image simplify scale, risk, or incentives rather than decorate the prose.
- o13 [openings-endings-closure; section:closings]: Open with the live legislative or factual development, name the instrument, and pivot quickly from its stated purpose to the central defect. Section endings condense the practical consequence into a firm declarative line. Close by restating the public-interest stakes and directing the responsible institution or affected organization toward a specific choice.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: rated; instructions o03, o04.
- qualification-hedging: described; instructions o10.
- questions-imperatives-vocatives: rated; instructions o06.
- opponents-allies-sources: described; instructions o11.
- profanity-vulgarity: unresolved; no instruction; The corpus contains no measured positive form and supplies no supported alternative with the same rhetorical job, so it cannot establish a reusable instruction for profanity or vulgarity..
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

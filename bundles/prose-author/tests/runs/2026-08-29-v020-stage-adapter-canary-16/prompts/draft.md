Write the requested draft using only the request and compiled voice-profile controls below.
Follow the system prompt and its output contract exactly. You have no corpus access.

## Request

Write a 300-word reply to a colleague at a small nonprofit who asks whether they should use an AI service to summarise confidential intake notes. They need a practical answer for a meeting tomorrow. Be direct, collegial, and specific about the decision.

## Compiled rhetorical control card

Profile: eff-mullin; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address moves from policy analysis to reader action or briefly places the reader inside a practical test of a bill’s logic. Reserve it for a closing advocacy prompt or a concrete “if you read” scenario, rather than sustaining it as the argument’s default viewpoint.
- o02 [person-reader-stance, self-reference-biography; section:address; measurement:first-person-plural-family]: The plural voice usually speaks for the advocacy organization—its beliefs, prior objections, outreach, and desired policy—while occasionally widening to a public affected by regulation. Use it to disclose institutional judgment or shared stakes, keeping the underlying analysis in third-person descriptions of bills, companies, courts, and users.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contracted forms keep dense legislative analysis conversational and make blunt rebuttals land cleanly: “it’s,” “won’t,” and “doesn’t” turn statutory consequences into accessible claims. Use them in thesis statements, transitions, and plain-language explanations, especially when puncturing a sponsor’s assurance or contrasting legal wording with practical effects.
- o04 [contraction-negation; section:cadence; measurement:uncontracted-negatives]: Full negatives give categorical limits and policy demands extra weight: a bill does not solve the problem, lawmakers should not act, or a disclaimer cannot remove liability. Place them where the prose states a legal distinction, rejects an inference, or delivers a formal recommendation; let contractions carry lighter connective rebuttals.
- o05 [self-reference-biography; section:absences; measurement:first-person-singular-family]: Individual self-reference yields to the organization’s plural voice and to evidence-centered exposition. Frame investigation, judgment, and advocacy as institutional acts—what EFF reviewed, believes, joined, or urged—rather than as personal experience. This keeps attention on public consequences and makes the call to action organizational rather than autobiographical.
- o06 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions operate mainly as stress tests, not open invitations: a sequence of concrete cases exposes speech a broad rule may capture, while an occasional direct question marks an unanswered technical problem. Place them after explaining the statutory mechanism, then answer through consequences or let the accumulating examples make the objection evident.
- o07 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Parentheses compress statutory names, age definitions, examples, abbreviations, and narrow clarifications without diverting the main claim. Use them to translate institutional detail at first mention or delimit a category inside an explanatory sentence. Keep the central consequence outside the aside so policy stakes remain easy to follow.
- o08 [interruption-punctuation; section:cadence; measurement:em-dashes]: Em dashes sharpen pivots between official framing and practical effect, insert a consequential qualification, or isolate a compact list of affected people and rights. Use them inside a sentence when the interruption intensifies the argument—especially before a correction or result—without allowing the inserted material to obscure the sentence’s legal logic.
- o09 [interruption-punctuation; section:absences; measurement:en-dashes]: Use em dashes or parentheses for argumentative interruption rather than relying on en dashes as a general-purpose pivot. Preserve en dashes only where a range or established compound genuinely calls for them; corrections, examples, and reversals should use the punctuation forms that visibly organize those functions elsewhere in the prose.
- o10 [qualification-hedging; section:register-range]: Concessions acknowledge a legitimate aim, a real concern, or a meaningful amendment before narrowing exactly what remains wrong. Predictions are tied to incentives with modals such as “may,” “might,” and “likely,” while uncertain legal conclusions receive phrases like “at a minimum” or “unclear at the margins.”
- o11 [opponents-allies-sources; section:address]: Name lawmakers, bill supporters, agencies, companies, courts, and coalition partners rather than inventing a faceless opposition. Introduce sources by their institutional role, summarize the relevant finding, then extend or correct it through practical consequences. Credit allied letters and organizations near the action they support, not as ornamental authority.
- o12 [figures-analogy; section:figures]: Figures come from infrastructure, bureaucracy, markets, and enforcement: a registry becomes a card catalog, collected data a vault, overbroad regulation a dragnet, and premature legislation a familiar movie. Keep the comparison brief and concrete, using it to clarify operational burden or predictable incentives before returning to literal policy analysis.
- o13 [openings-endings-closure; section:closings]: Open with the bill’s current status or a plain public-interest principle, then state the hidden consequence through an early “but” or “yet.” Section endings often compress the preceding mechanism into a blunt result. Close by naming the better governing principle and issuing a specific demand to lawmakers, services, or affected businesses.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: rated; instructions o03, o04.
- qualification-hedging: described; instructions o10.
- questions-imperatives-vocatives: rated; instructions o06.
- opponents-allies-sources: described; instructions o11.
- profanity-vulgarity: unresolved; no instruction; The measured corpus supplies no positive form that could establish a rhetorical function or placement for profanity or vulgarity, so this dimension cannot support a drafting instruction..
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

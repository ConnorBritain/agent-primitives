Write the requested draft using only the request and compiled voice-profile controls below.
Follow the system prompt and its output contract exactly. You have no corpus access.

## Request

Write a 650-word essay for a technology-policy newsletter arguing that a device is not fully owned when its maker can disable features after sale. The readers already follow digital-rights issues. Use no headline or signoff.

## Compiled rhetorical control card

Profile: eff-mullin; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address enters chiefly when translating a proposal into a reader’s practical situation or offering a concrete route to legislative action. Use it for brief hypotheticals and closing calls aimed at affected residents, while keeping the main policy analysis in third person.
- o02 [person-reader-stance, self-reference-biography; section:address; measurement:first-person-plural-family]: The plural voice usually speaks for the advocacy organization as analyst, correspondent, or participant: it states beliefs, reports outreach, and names desired policy. It can widen momentarily to a civic “us,” but should generally preserve the institution’s visible role in the argument.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contracted forms keep technical and legislative explanation conversational, especially when rejecting sponsors’ assurances or stating foreseeable consequences. Place them in plain-language pivots and compact judgments so the prose remains accessible even while discussing statutes, liability standards, and institutional procedure.
- o04 [contraction-negation; section:cadence; measurement:uncontracted-negatives]: Full negative forms carry deliberate legal or corrective force: they distinguish what a bill does not require, what evidence does not establish, or what institutions should not do. Use them where scope, obligation, or policy judgment needs unmistakable emphasis rather than conversational compression.
- o05 [self-reference-biography; section:absences; measurement:first-person-singular-family]: Individual self-reference yields to the organization’s plural voice, keeping advocacy institutional rather than autobiographical. Frame investigation, belief, correspondence, and recommendations as the organization’s work; reserve an individual speaker only for a tightly bounded illustrative quotation or personal hypothetical.
- o06 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions expose a bill’s unanswered mechanics or test its consequences through ordinary situations rather than soliciting discussion. Cluster them after the problematic rule has been explained, using a short sequence to demonstrate uncertainty, then answer by returning to the legal incentive or privacy risk.
- o07 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Parentheses supply compact statutory labels, definitions, examples, acronyms, and boundary conditions without diverting the main sentence. Use them to translate legislative machinery for general readers or identify a precise exception, while letting the surrounding clause carry the argument and consequence.
- o08 [interruption-punctuation; section:cadence; measurement:em-dashes]: Em dashes sharpen pivots between official framing and practical effect, isolate a consequential example, or append a compressed correction. Place them inside otherwise direct sentences when the interruption exposes irony, expands the affected group, or converts an abstract legal rule into a concrete outcome.
- o09 [interruption-punctuation; section:absences; measurement:en-dashes]: Interruption and qualification are carried by em dashes and parentheses rather than en dashes. Keep en dashes to genuinely typographic range or compound uses when needed; do not recruit them as the main device for argumentative pivots, inserted examples, or corrective asides.
- o10 [qualification-hedging; section:register-range]: Concessions acknowledge a legitimate goal, a narrowed amendment, or a real underlying concern before arguing that the proposed mechanism remains harmful. Predictions are tied to incentives with modals such as “may,” “could,” and “will likely”; place limits near the claim they qualify, then state the retained objection plainly.
- o11 [opponents-allies-sources; section:address]: Opposing claims are attributed to supporters, sponsors, lawmakers, agencies, companies, or the bill itself, then tested against statutory language and practical incentives. Allies and sources are named through organizational letters, court decisions, research, and coalition membership; credit first, extend the evidence, and correct overbroad framing without caricature.
- o12 [figures-analogy; section:figures]: Figures draw from everyday systems and institutional machinery: card catalogs, vaults, dragnet enforcement, jumping the gun, or seeing a familiar movie again. Keep comparisons brief and explanatory, landing after technical description to make administrative burden, accumulated data, or predictable platform behavior immediately legible.
- o13 [openings-endings-closure; section:closings]: Openings name the live bill, vote, update, or reported practice, then quickly overturn its benign framing with the concrete problem. Sections often end on a consequence or crisp restatement. Close by naming the better principle or alternative and directing lawmakers, companies, venues, or eligible readers toward a specific action.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: rated; instructions o03, o04.
- qualification-hedging: described; instructions o10.
- questions-imperatives-vocatives: rated; instructions o06.
- opponents-allies-sources: described; instructions o11.
- profanity-vulgarity: unresolved; no instruction; The corpus supplies no positive measured counterpart from which to infer a rhetorical function or placement for profanity or vulgarity, so this dimension cannot support a drafting instruction..
- self-reference-biography: absent-paired; instructions o02, o05.
- interruption-punctuation: absent-paired; instructions o07, o08, o09.
- figures-analogy: described; instructions o12.
- openings-endings-closure: described; instructions o13.

## Deterministic draft target card

Requested length: 650 words. Aim counts are length-scaled from the profile's measured rates.
The min/max values reproduce the unchanged 2x ratio and 2-instance absolute ship gate; they do not relax it.
Count by the referenced measurement rule after drafting. Aim at the center, not merely the edge.

- o01 [measurement:second-person-family] (person-reader-stance; measured-positive): aim 1; unchanged gate range 0–2.
- o02 [measurement:first-person-plural-family] (person-reader-stance, self-reference-biography; measured-positive): aim 2; unchanged gate range 0–3.
- o03 [measurement:contractions] (contraction-negation; measured-positive): aim 7; unchanged gate range 4–13.
- o04 [measurement:uncontracted-negatives] (contraction-negation; measured-positive): aim 3; unchanged gate range 1–5.
- o05 [measurement:first-person-singular-family] (self-reference-biography; counted-absence): aim 0; unchanged gate range 0–2.
- o06 [measurement:question-marks] (questions-imperatives-vocatives; measured-positive): aim 1; unchanged gate range 0–2.
- o07 [measurement:round-parenthetical-spans] (interruption-punctuation; measured-positive): aim 8; unchanged gate range 4–15.
- o08 [measurement:em-dashes] (interruption-punctuation; measured-positive): aim 4; unchanged gate range 3–8.
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

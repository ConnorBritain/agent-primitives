Produce the mandatory minimal conformance patch for the initial draft below.
This is one fixed pipeline stage, not a redraw or a choice between candidates: local
code always applies the valid patch to the initial source. Preserve its truthful argument
and requested form while correcting the measured report and every supported coverage
dimension. Do not mention this pass in the prose.

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

## Deterministic conformance report for the initial draft

Measured draft length: 297 words.
- o01 [measurement:second-person-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o02 [measurement:first-person-plural-family]: actual 1; aim 1; range 0–2; in-range; preserve this range.
- o03 [measurement:contractions]: actual 3; aim 3; range 2–6; in-range; preserve this range.
- o04 [measurement:uncontracted-negatives]: actual 1; aim 1; range 0–3; in-range; preserve this range.
- o05 [measurement:first-person-singular-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o06 [measurement:question-marks]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o07 [measurement:round-parenthetical-spans]: actual 4; aim 4; range 2–7; in-range; preserve this range.
- o08 [measurement:em-dashes]: actual 2; aim 2; range 0–3; in-range; preserve this range.
- o09 [measurement:en-dashes]: actual 0; aim 0; range 0–2; in-range; preserve this range.

Every measured row is in range. The mandatory patch must preserve that result.

## Initial immutable source

```json
{
  "schema": "voice-draft-source/4",
  "kind": "draft",
  "draft": "For tomorrow’s meeting, the answer should be no for confidential intake notes unless the service has passed a documented privacy and security review. Summarising notes may save time, but convenience does not justify sending sensitive client information into a system whose retention, training, access, and deletion rules remain unclear.\n\nStart with the data, not the sales pitch. Remove names, contact details, case numbers, and other personally identifiable information (PII) before any test. Even de-identified notes may expose a person when unusual facts are combined. A free consumer chatbot isn’t an acceptable shortcut—its defaults and contractual promises may differ from an approved organizational account.\n\nApproval should require a written data processing agreement (DPA), a clear statement that submitted content won’t train models, defined retention and deletion periods, encryption, access controls such as multifactor authentication (MFA), breach notification, and a list of subprocessors. The vendor should also explain where data is stored and whether staff can review prompts or outputs. If those answers can’t be obtained in writing, stop.\n\nFor the meeting, propose a narrow pilot using invented or fully synthetic notes (for example, a fictional intake created for testing). Compare the summary against the original for omissions, invented details, and changes in urgency—an efficient summary that distorts risk is a broken tool. Assign one staff owner to review every output and prohibit automatic entry into client records.\n\nThe policy can be simple: no confidential notes until the review is complete, and no live use without human verification. We can reconsider after the vendor meets those conditions. The executive director or privacy lead should make the decision and record it. Client trust is the governing value; the tool must fit that duty, not reverse it. That gives staff a practical boundary tomorrow and a defensible process for later approval.",
  "omitted": [],
  "refused": ""
}
```

Return voice-draft-conformance-patch/1 exactly; do not return a rewritten draft.
Use the fewest exact, unique before/after source replacements that will pass. An anchor
must be no larger than one paragraph. Prefer local recasting over expansion; the local
assembler rejects a patch that expands materially or moves farther from requested length.
Across all edits, before anchors may replace at most 60 of the initial 297 words.
Every edit must name every measurement whose count it changes, include at least one initially
failing measurement, and independently move every named failing measurement toward range.
Its coverage dimensions must exactly match those measurements. Outside safe dash, parenthesis,
and meaning-equivalent contraction-form changes, the replacement must retain the exact structural
stream: case, words, unnamed punctuation, Markdown, line breaks, and paragraph boundaries.
A safe punctuation form may move at most one ordinary ASCII separator immediately around its named
mark; indentation, tabs, repeated or trailing spaces, Markdown links/code, and every other byte remain
fixed. If the draft contains any Markdown link or code signal anywhere, return no edits: the complete
draft is immutable in patch mode, so its initial measured targets must already be in range.
Closed contractions are bidirectional. An ambiguous 'd or 's contraction may be introduced
only when the exact source spells out its auxiliary; never expand an ambiguous source contraction.
Question-mark, pronoun-family, profanity, and other semantic-bearing count corrections must already
be in range in the initial draft; patch mode cannot certify them by changing prose. A measured fix
cannot rewrite the argument, request stance, recommendation, facts, or any qualitative dimension.
For an excess, use the listed occurrences and satisfy at least the explicit removal quota.
For a deficit, alter existing sentences where possible. Do not disturb in-range habits.
Every measured actual in the patched prose must be inside its stated range.
Return exactly ten coverage rows with the profile's observation IDs. Mark each supported
row preserved, revised, or omitted; revised rows must be named by an edit, and omitted
rows must have a matching habit/why record. Keep unresolved rows unresolved.
The independent factual audit runs after patch application. Do not introduce a citation,
attributed wording, biography, or uncertain fact merely to satisfy a voice instruction.

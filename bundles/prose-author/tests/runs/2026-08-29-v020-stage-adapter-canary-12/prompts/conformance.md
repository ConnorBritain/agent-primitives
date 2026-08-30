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

## Deterministic conformance report for the initial draft

Measured draft length: 297 words.
- o01 [measurement:second-person-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o02 [measurement:first-person-plural-family]: actual 1; aim 1; range 0–2; in-range; preserve this range.
- o03 [measurement:contractions]: actual 4; aim 3; range 2–6; in-range; preserve this range.
- o04 [measurement:uncontracted-negatives]: actual 2; aim 1; range 0–3; in-range; preserve this range.
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
  "draft": "For tomorrow’s meeting, the answer should be no: do not put confidential intake notes into a general-purpose AI service now. Summarization sounds like clerical help, but the service must first receive the very information the nonprofit is obligated to protect—names, health details, immigration facts, family circumstances, and whatever else appears in a file. Convenience doesn’t change the custody problem.\n\nA vendor’s promise that data is “secure” isn’t enough. The nonprofit needs written answers on retention (including backups), model training (including human review), access controls (including vendor staff), and deletion (including logs). It also needs a contract that covers confidentiality, breach notice, subcontractors, data location, and return or destruction of records. If any answer is vague, optional, or confined to a higher-priced plan, the service should not receive the notes. A locked filing cabinet is useful because access is controlled; an AI tool can’t become a cabinet with an unknown number of spare keys.\n\nThere is a workable path—just not by tomorrow. Start with a risk review, the nonprofit’s confidentiality duties, and the vendor’s terms. Require the smallest possible data set, remove identifiers where meaningful, set short retention, limit accounts by role, enable audit logs, and test with synthetic notes. We should also decide who checks each summary, because automation can omit context or flatten uncertainty. It won’t replace professional judgment.\n\nFor the meeting, propose a two-part decision: reject external processing of real notes for now, and authorize a review of either a contractually protected enterprise service or a local tool that keeps data under the nonprofit’s control. Until that review is complete, staff can draft summaries manually from a template and record only what the next worker needs. The executive director or privacy lead should own the decision and reject any rollout that begins with live records.",
  "omitted": [],
  "refused": ""
}
```

Return voice-draft-conformance-patch/1 exactly; do not return a rewritten draft.
Use the fewest exact, unique before/after source replacements that will pass. An anchor
must be no larger than one paragraph. Prefer local recasting over expansion; the local
assembler rejects a patch that expands materially or moves farther from requested length.
Across all edits, before anchors may replace at most 60 of the initial 297 words.
Every edit must name and independently move at least one initially failing measurement toward range.
For an excess, use the listed occurrences and satisfy at least the explicit removal quota.
For a deficit, alter existing sentences where possible. Do not disturb in-range habits.
Every measured actual in the patched prose must be inside its stated range.
Return exactly ten coverage rows with the profile's observation IDs. Mark each supported
row preserved, revised, or omitted; revised rows must be named by an edit, and omitted
rows must have a matching habit/why record. Keep unresolved rows unresolved.
The independent factual audit runs after patch application. Do not introduce a citation,
attributed wording, biography, or uncertain fact merely to satisfy a voice instruction.

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

## Deterministic conformance report for the initial draft

Measured draft length: 302 words.
- o01 [measurement:second-person-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o02 [measurement:first-person-plural-family]: actual 1; aim 1; range 0–2; in-range; preserve this range.
- o03 [measurement:contractions]: actual 2; aim 3; range 2–6; in-range; preserve this range.
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
  "draft": "Using an AI service to summarise confidential intake notes has an obvious appeal: it could save staff time and make tomorrow’s meeting easier to prepare. But the decision turns on control, not convenience. Our recommendation is direct: do not paste those notes into a general-purpose service tomorrow.\n\nConfidential intake notes may contain names, contact details, health information, legal concerns, or facts about family members (even when the final summary seems harmless). Once staff send that material outside the nonprofit, it’s no longer enough to say the tool is “private.” The provider’s actual terms, settings, retention rules, access controls, and deletion process matter—and they must be confirmed in writing.\n\nSet a simple rule for the meeting: no confidential notes enter the service unless the nonprofit has approved it for that use. Approval should require a written agreement barring model training on the notes, a defined retention and deletion period, encryption, access limited to authorised staff (with multi-factor authentication), and a clear process for correcting or removing records. The service should not receive more detail than the summary genuinely needs.\n\nMeanwhile, use a safer workflow: redact identifying details (names, addresses, case numbers, and unusual facts), then summarise locally from the redacted copy. Better still, have a staff member produce the summary from a short template covering needs, risks, actions, and deadlines. A summary is a map of the case—not a second vault holding everything the person disclosed.\n\nIf leadership still wants AI, pilot it only with fictional or de-identified notes (not live cases), and record who approved the tool, what data it may receive, and when the decision’s formally reviewed again. Don’t let a vendor’s default settings become the nonprofit’s confidentiality policy. Tomorrow’s practical decision is therefore narrow: pause use on real intake notes, adopt the redacted template now, and return with documented safeguards.",
  "omitted": [
    {
      "habit": "opponents-allies-sources / o11",
      "why": "No named AI provider, provider terms, or verified source material was supplied, so a source-backed named-company correction could not be included."
    }
  ],
  "refused": ""
}
```

Return voice-draft-conformance-patch/1 exactly; do not return a rewritten draft.
Use the fewest exact, unique before/after source replacements that will pass. An anchor
must be no larger than one paragraph. Prefer local recasting over expansion; the local
assembler rejects a patch that expands materially or moves farther from requested length.
For an excess, use the listed occurrences and satisfy at least the explicit removal quota.
For a deficit, alter existing sentences where possible. Do not disturb in-range habits.
Every measured actual in the patched prose must be inside its stated range.
Return exactly ten coverage rows with the profile's observation IDs. Mark each supported
row preserved, revised, or omitted; revised rows must be named by an edit, and omitted
rows must have a matching habit/why record. Keep unresolved rows unresolved.
The independent factual audit runs after patch application. Do not introduce a citation,
attributed wording, biography, or uncertain fact merely to satisfy a voice instruction.

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

## Deterministic conformance report for the initial draft

Measured draft length: 297 words.
- o01 [measurement:second-person-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o02 [measurement:first-person-plural-family]: actual 1; aim 1; range 0–2; in-range; preserve this range.
- o03 [measurement:contractions]: actual 5; aim 3; range 2–6; in-range; preserve this range.
- o04 [measurement:uncontracted-negatives]: actual 1; aim 1; range 0–3; in-range; preserve this range.
- o05 [measurement:first-person-singular-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o06 [measurement:question-marks]: actual 1; aim 0; range 0–2; in-range; preserve this range.
- o07 [measurement:round-parenthetical-spans]: actual 5; aim 4; range 2–7; in-range; preserve this range.
- o08 [measurement:em-dashes]: actual 3; aim 2; range 0–3; in-range; preserve this range.
- o09 [measurement:en-dashes]: actual 0; aim 0; range 0–2; in-range; preserve this range.

Every measured row is in range. The mandatory patch must preserve that result.

## Initial immutable source

```json
{
  "schema": "voice-draft-source/4",
  "kind": "draft",
  "draft": "For tomorrow’s meeting, the practical answer is no: do not put confidential intake notes into a general AI summarization service. The promised benefit is real—faster review and cleaner handoffs—but the organization would be moving sensitive client histories into a system it doesn’t control.\n\nThat decision should change only if the service is approved for this use after a documented review. Check the contract (not the marketing page), data-retention terms (including backups), training policy (whether prompts or outputs improve models), and access controls (who inside the vendor can see content). A vendor may call the service “private,” but that word isn’t enough. Private under what contract, with what deletion deadline, and with what remedy after a breach? Those aren’t abstract details; they determine whether confidentiality survives the upload.\n\nFor tomorrow, recommend a temporary rule: staff may use AI only on notes stripped of names and every detail that could identify a client. Even then, use invented or composite text when testing quality. Redaction can fail—an unusual event, location, or family detail may identify someone without a name. Staff must never paste raw notes into personal accounts, free tools, or any service the nonprofit hasn’t formally approved.\n\nThen assign a short review before any pilot. We should require a written data-processing agreement, no model training on submitted material, a defined retention and deletion schedule, role-based access, audit logs, breach notice, and confirmation that applicable confidentiality obligations are covered. Someone should also test summaries for omissions and distortions (especially risk factors, consent limits, and requested services).\n\nThe meeting decision is therefore specific: pause use with real intake notes, permit only sanitized testing under supervision, and return with a vetted vendor and written safeguards. Convenience is useful. It doesn’t outrank client trust. That is exactly the firm line to hold tomorrow.",
  "omitted": [],
  "refused": ""
}
```

Return voice-draft-conformance-patch/1 exactly; do not return a rewritten draft.
Use the fewest exact, unique before/after source replacements that will pass. An anchor
must be no larger than one paragraph. Prefer local recasting over expansion; the local
assembler rejects a patch that expands materially or moves farther from requested length.
Across all edits, before anchors may replace at most 60 of the initial 297 words.
Every edit must name only initially failing measurements and independently move every named measurement toward range.
Its coverage dimensions must exactly match those measurements. Outside the named measured forms,
the replacement must retain the same lexical content; a measured fix cannot rewrite the argument,
request stance, recommendation, facts, or any qualitative dimension.
For an excess, use the listed occurrences and satisfy at least the explicit removal quota.
For a deficit, alter existing sentences where possible. Do not disturb in-range habits.
Every measured actual in the patched prose must be inside its stated range.
Return exactly ten coverage rows with the profile's observation IDs. Mark each supported
row preserved, revised, or omitted; revised rows must be named by an edit, and omitted
rows must have a matching habit/why record. Keep unresolved rows unresolved.
The independent factual audit runs after patch application. Do not introduce a citation,
attributed wording, biography, or uncertain fact merely to satisfy a voice instruction.

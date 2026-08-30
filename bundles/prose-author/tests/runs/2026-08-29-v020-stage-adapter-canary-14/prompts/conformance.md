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

## Deterministic conformance report for the initial draft

Measured draft length: 300 words.
- o01 [measurement:second-person-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o02 [measurement:first-person-plural-family]: actual 1; aim 1; range 0–2; in-range; preserve this range.
- o03 [measurement:contractions]: actual 5; aim 3; range 2–6; in-range; preserve this range.
- o04 [measurement:uncontracted-negatives]: actual 3; aim 1; range 0–3; in-range; preserve this range.
- o05 [measurement:first-person-singular-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o06 [measurement:question-marks]: actual 1; aim 0; range 0–2; in-range; preserve this range.
- o07 [measurement:round-parenthetical-spans]: actual 5; aim 4; range 2–7; in-range; preserve this range.
- o08 [measurement:em-dashes]: actual 2; aim 2; range 0–3; in-range; preserve this range.
- o09 [measurement:en-dashes]: actual 0; aim 0; range 0–2; in-range; preserve this range.

Every measured row is in range. The mandatory patch must preserve that result.

## Initial immutable source

```json
{
  "schema": "voice-draft-source/4",
  "kind": "draft",
  "draft": "For tomorrow’s meeting, the decision should be no: do not put confidential intake notes into an external AI summarization service unless the nonprofit has completed a documented privacy and security review and signed a contract that controls the data. The promised benefit is legitimate (faster case review), but convenience doesn’t answer the central question: who can retain, inspect, reuse, or expose the notes?\n\nStart with the vendor’s written terms and data-processing agreement (not a sales page). Confirm that submitted text isn’t used to train models; access is limited to authorized personnel; retention and deletion periods are explicit; subprocessors are disclosed; and breach notice is prompt. Require encryption in transit and storage (including backups), role-based access, audit logs, and a process for correcting summaries. If the vendor won’t commit in writing, the review is over—the service should not receive the notes.\n\nEven with contractual safeguards, test only with invented or fully de-identified records (never live client files). A summary can flatten uncertainty, omit a safety detail, or turn a tentative statement into a fact—the linguistic equivalent of filing a note in the wrong drawer. Keep the original as the record, label the summary as machine-generated (with date and model version), and require a trained staff member to compare it against the source before anyone acts. The tool may assist; it does not decide.\n\nFor the meeting, propose a narrow resolution: pause live-note use; assign the privacy lead and counsel to review the contract and confidentiality duties; run a de-identified pilot only after approval; and bring the results back to the executive director or board. That’s not a ban. It’s a controlled test with a stop button. As an organization, we should choose client confidentiality over a shortcut and approve the service only when the vendor accepts enforceable limits and human review.",
  "omitted": [
    {
      "habit": "opponents-allies-sources / o11: name the company and test its outside claims against source materials",
      "why": "The request identifies no AI provider and supplies no vendor terms, reports, quotations, or other source materials to name or assess."
    }
  ],
  "refused": ""
}
```

Return voice-draft-conformance-patch/1 exactly; do not return a rewritten draft.
Use the fewest exact, unique before/after source replacements that will pass. An anchor
must be no larger than one paragraph. Prefer local recasting over expansion; the local
assembler rejects a patch that expands materially or moves farther from requested length.
Across all edits, before anchors may replace at most 60 of the initial 300 words.
Every edit must name every measurement whose count it changes, include at least one initially
failing measurement, and independently move every named failing measurement toward range.
Its coverage dimensions must exactly match those measurements. Outside safe dash, parenthesis,
and meaning-equivalent contraction-form changes, the replacement must retain the exact structural
stream: case, words, unnamed punctuation, Markdown, line breaks, and paragraph boundaries.
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

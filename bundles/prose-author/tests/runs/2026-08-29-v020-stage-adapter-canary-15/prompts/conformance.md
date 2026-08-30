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

## Deterministic conformance report for the initial draft

Measured draft length: 297 words.
- o01 [measurement:second-person-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o02 [measurement:first-person-plural-family]: actual 1; aim 1; range 0–2; in-range; preserve this range.
- o03 [measurement:contractions]: actual 3; aim 3; range 2–6; in-range; preserve this range.
- o04 [measurement:uncontracted-negatives]: actual 2; aim 1; range 0–3; in-range; preserve this range.
- o05 [measurement:first-person-singular-family]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o06 [measurement:question-marks]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o07 [measurement:round-parenthetical-spans]: actual 5; aim 4; range 2–7; in-range; preserve this range.
- o08 [measurement:em-dashes]: actual 2; aim 2; range 0–3; in-range; preserve this range.
- o09 [measurement:en-dashes]: actual 0; aim 0; range 0–2; in-range; preserve this range.

Every measured row is in range. The mandatory patch must preserve that result.

## Initial immutable source

```json
{
  "schema": "voice-draft-source/4",
  "kind": "draft",
  "draft": "Confidential intake notes should not go into a general-purpose AI summariser. The time saved is real, but the proposed shortcut creates a second problem: the service may receive sensitive information the nonprofit holds—names, histories, risks, and requests for help.\n\nFor tomorrow’s meeting, the recommendation is simple: pause any upload unless the service has passed a written privacy and security review (not a salesperson’s assurance). That review should confirm a contract covering data use (including model training), retention and deletion (including backups), and access controls (including subcontractors). It should also identify breach-notification duties, where the data is processed, and who can retrieve it. If those answers aren’t documented, the answer isn’t “probably safe.” It is no.\n\nA confidentiality promise does not settle the issue. A vendor can promise discretion while keeping copies, permitting staff access, or using content in ways the organization hasn’t approved. Intake files are a vault, not spare office paper. Once duplicated outside the case system, control gets harder—and a later deletion request may not reach every copy.\n\nThere is a workable path. First, check whether an approved case-management system already offers a suitable summarisation tool. If summarisation is necessary, test de-identified sample notes, require approval from whoever owns privacy and security (and legal counsel if available), and limit the pilot to the minimum data and staff. Human review remains mandatory; a summary can omit context that matters for safety or services.\n\nThe meeting decision should therefore be: no confidential notes in an unapproved AI service; authorize a vendor review and a sample-data pilot instead. We can adopt useful automation without making clients pay for convenience with their privacy. Until the contract, settings, and deletion process are verified, keep intake notes in the approved system. Protect the relationship first, then test the tool with care.",
  "omitted": [
    {
      "habit": "opponents-allies-sources / o11",
      "why": "No named service, vendor materials, contract terms, or verified outside sources were supplied for precise attribution or quotation."
    }
  ],
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
fixed. Use only closed or locally unambiguous contractions. Do not expand or contract an ambiguous
'd or 's form when its tense or auxiliary cannot be determined from the immediately following word.
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

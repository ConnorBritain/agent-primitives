Produce the mandatory minimal conformance patch for the initial draft below.
This is one fixed pipeline stage, not a redraw or a choice between candidates: local
code always applies the valid patch to the initial source. Preserve its truthful argument
and requested form while correcting the measured report and every supported coverage
dimension. Do not mention this pass in the prose.

## Request

Write a 650-word essay for a technology-policy newsletter arguing that a device is not fully owned when its maker can disable features after sale. The readers already follow digital-rights issues. Use no headline or signoff.

## Compiled rhetorical control card

Profile: doctorow-blog; confidence: full; voice card: empty.
Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.

### Observation instructions

- o01 [person-reader-stance; section:address; measurement:second-person-family]: Direct address places the reader inside concrete consequences, imagined choices, and practical procedures. Use “you” to walk through a mechanism, test a proposition against lived stakes, or assign an actionable step; let the address turn abstract systems into pressures exerted on a person.
- o02 [person-reader-stance; section:address; measurement:first-person-plural-family]: Plural self-reference shifts among an inclusive public, a political constituency, and people collectively exposed to institutions. Use “we” when establishing shared conditions or available collective action, but identify narrower groups when inclusion matters so that solidarity does not blur responsibility.
- o03 [contraction-negation; section:cadence; measurement:contractions]: Contracted forms keep technical and polemical explanation conversational, especially in direct address, brisk rebuttal, and plain statements of consequence. Use them as the default connective tissue of exposition, allowing intricate institutional or economic arguments to sound spoken without simplifying their underlying causal structure.
- o04 [contraction-negation; section:absences; measurement:uncontracted-negatives]: Full negative forms do not carry the ordinary conversational flow; contractions occupy that role. Reserve an uncontracted negative for a sharp logical distinction, formal quotation, or deliberate stress on the negated proposition, rather than distributing full forms through routine explanation.
- o05 [profanity-vulgarity; section:register-range; measurement:profanity-vulgarity]: Profanity supplies verdict, ridicule, or bodily concreteness after the argument has exposed a euphemism or absurdity. Place it at a pressure point—a compact dismissal, quoted attitude, or material consequence—rather than using it as ambient intensity before the reasoning earns the blow.
- o06 [self-reference-biography; section:register-range; measurement:first-person-singular-family]: The individual speaker appears as witness, explainer, reader, or participant whose experience opens onto a general mechanism. Use personal history to establish why a question matters or to furnish a compact case, then return promptly to the institutional, technical, or political argument it illuminates.
- o07 [questions-imperatives-vocatives; section:address; measurement:question-marks]: Questions organize inquiry more often than they solicit answers: they expose a sales pitch’s missing premise, launch an explanation, or stage an opponent’s likely response. Pose a concrete question at a pivot, then answer it through examples, causal analysis, or escalating parallel cases.
- o08 [interruption-punctuation; section:cadence; measurement:round-parenthetical-spans]: Parentheses carry compressed definitions, comic sotto voce, examples, caveats, and technical clarifications without surrendering the main sentence’s momentum. Insert them where a reader benefits from an immediate gloss or barbed qualification, keeping the surrounding clause intelligible if the aside is lifted out.
- o09 [interruption-punctuation; section:absences; measurement:em-dashes]: The prose does not use em dashes as its ordinary interruption mark; en dashes and parentheses perform the available pivots and asides. Preserve that division by routing sentence-level turns through the established marks instead of introducing em dashes as a generic dramatic pause.
- o10 [interruption-punctuation; section:cadence; measurement:en-dashes]: En dashes interrupt a sentence for sharpened restatement, parenthetical qualification, consequence, or a compact comic turn. Use a paired interruption when the embedded thought modifies the surrounding claim, and a single dash when the sentence pivots toward its more pointed implication.
- o11 [qualification-hedging; section:register-range]: Qualifications concede limited truths before narrowing their reach: a claim may be plausible “on its face,” true in one respect, or insufficient beside a larger mechanism. Place concessions immediately before the correction, and mark predictions through explicit conditions rather than generalized timidity.
- o12 [opponents-allies-sources; section:address]: Sources enter by name with a compact statement of what they show; the prose then extends, qualifies, or applies their insight. Opponents are often named alongside their euphemism or doctrine, which is tested against material outcomes. Credit first, then make the argumentative handoff explicit.
- o13 [figures-analogy; section:figures]: Figures draw from markets, machinery, scams, games, bodily risk, and familiar technical systems. A comparison is often extended across several correspondences until an abstract power relation becomes operationally visible. Introduce the analogy after naming the mechanism, then return to literal stakes for the conclusion.
- o14 [openings-endings-closure; section:closings]: Openings commonly present a blunt thesis, a striking quotation, a definition, or an apparent paradox, then identify the mechanism beneath it. Paragraphs land on consequence or reversal. Closings compress the argument into a renewed distinction, verdict, or demand that echoes the opening vocabulary without adding a separate subject.

### Complete coverage checklist

- person-reader-stance: rated; instructions o01, o02.
- contraction-negation: absent-paired; instructions o03, o04.
- qualification-hedging: described; instructions o11.
- questions-imperatives-vocatives: rated; instructions o07.
- opponents-allies-sources: described; instructions o12.
- profanity-vulgarity: rated; instructions o05.
- self-reference-biography: rated; instructions o06.
- interruption-punctuation: absent-paired; instructions o08, o09, o10.
- figures-analogy: described; instructions o13.
- openings-endings-closure: described; instructions o14.

## Deterministic conformance report for the initial draft

Measured draft length: 642 words.
- o01 [measurement:second-person-family]: actual 16; aim 14; range 8–28; in-range; preserve this range.
- o02 [measurement:first-person-plural-family]: actual 6; aim 5; range 3–9; in-range; preserve this range.
- o03 [measurement:contractions]: actual 11; aim 11; range 6–22; in-range; preserve this range.
- o04 [measurement:uncontracted-negatives]: actual 0; aim 0; range 0–2; in-range; preserve this range.
- o05 [measurement:profanity-vulgarity]: actual 1; aim 1; range 0–2; in-range; preserve this range.
- o06 [measurement:first-person-singular-family]: actual 4; aim 4; range 3–8; in-range; preserve this range.
- o07 [measurement:question-marks]: actual 2; aim 1; range 0–3; in-range; preserve this range.
- o08 [measurement:round-parenthetical-spans]: actual 4; aim 4; range 2–7; in-range; preserve this range.
- o09 [measurement:em-dashes]: actual 0; aim 0; range 0–1; in-range; preserve this range.
- o10 [measurement:en-dashes]: actual 3; aim 3; range 1–5; in-range; preserve this range.

Every measured row is in range. The mandatory patch must preserve that result.

## Initial immutable source

```json
{
  "schema": "voice-draft-source/4",
  "kind": "draft",
  "draft": "A device isn’t fully yours if the company that sold it can reach into it later and withdraw a function. If you buy a machine with a camera, a battery, or a radio, the maker’s continuing power to switch off that component changes the character of the sale. You received possession, but the maker retained a veto. I use “ownership” for control that survives the seller’s change of mind (and its next quarterly target).\n\nThe mechanism is remote authority disguised as product maintenance. A server checks an entitlement, firmware obeys a command, or an account decides whether hardware in your hand may still do yesterday’s job. The same channel can deliver a useful repair (a real benefit, on its face) and enforce a new restriction. That dual use doesn’t settle the ownership question; it creates it. Who has the final say when your interests and the manufacturer’s diverge? Follow the command path, and you’ll find the owner.\n\nImagine a workshop where you own the lathe, but the former seller keeps a key to its control cabinet. You may paint it, move it, lend it, even sell it; yet when the seller dislikes your payment status or business model, the spindle stops. That isn’t a maintenance relationship. It is a landlord relationship wearing a sales receipt – the deed says “yours” while the master key stays elsewhere. Once you’ve seen that split, software jargon can’t make it disappear.\n\nA manufacturer may answer that the customer accepted a license, that remote controls deter abuse, or that continued service costs money. Each point can be true in a narrow case. None converts a revocable capability into property. If a promised function depends on continuing permission from the seller, say so at the till: you’re renting that function (perhaps for the life of an account). Calling the arrangement “ownership” after hiding the revocation power in a clickwrap is bullshit with a serial number. I don’t object to services; I object to smuggling a service relationship into a sale.\n\nTechnology policy should begin with this distinction. We can permit remote service without granting permanent remote dominion. Require affirmative disclosure before sale, local operation for paid functions, and a way to restore essential capabilities when a vendor closes an account or abandons a server. Where disabling is necessary for safety, the scope should be specific, reviewable, and tied to the hazard – a fire brake behind glass, rather than a master switch in somebody else’s office. We shouldn’t confuse the ability to patch your device with a title to govern it.\n\nThis matters beyond one missing feature. Remote revocation turns every sale into a continuing negotiation in which only one side controls the machinery. It weakens repair, resale, preservation, and the ordinary expectation that paid goods remain useful. We bear those costs as buyers, but independent repairers and secondhand owners bear them differently (and often sooner). I think that difference matters: solidarity gets mushy when “we” conceals who has the kill switch and who wakes up holding dead hardware.\n\nHere is the practical test. Disconnect the vendor, stop the subscription, or transfer the device to another person. What remains under your control? If the answer excludes hardware you paid for, you have encountered a conditional tenancy – even if the box arrived with a purchase price. That test won’t resolve every edge case, but it exposes the governing power without getting lost in contract labels.\n\nThe clean rule is neither anti-software nor anti-service. It is anti-bait-and-switch. If the seller wants an ongoing right to remove capability, the transaction should be labeled and priced as a rental, subscription, or managed service. If the seller calls it a sale, control of paid functions should pass with the object. We don’t need mystical definitions of ownership; we need the receipt, the firmware, and the practical power to tell the same story.",
  "omitted": [
    {
      "habit": "opponents-allies-sources / o12: named-source attribution and argumentative handoff",
      "why": "The request supplied no verified source or attributed statement to credit."
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

/** Small current runtime contracts. The historical acceptance transport stays separate. */
import { COVERAGE_DIMENSIONS } from "./profile-contract.mjs";
const text = { type: "string" };
const array = (items) => ({ type: "array", items });
const object = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
export const DRAFT_SCHEMA = object({ schema: { const: "voice-draft-source/5", type: "string" }, kind: { type: "string", enum: ["draft", "refusal"] },
  draft: text, omitted: array(object({ id: text, reason: text })), claims: array(object({ quote: text, reason: text })), refused: text });
export const PROFILE_SOURCE_SCHEMA = object({ schema: { const: "voice-profile-source/5", type: "string" },
  observations: array(object({ description: text, dimensions: array({ type: "string", enum: COVERAGE_DIMENSIONS }),
    citations: array(object({ file: text, quote: text })) })),
  unresolved: array(object({ dimension: { type: "string", enum: COVERAGE_DIMENSIONS }, reason: text })), refused: text });
export const REVIEW_SCHEMA = object({ schema: { const: "prose-runtime-review/1", type: "string" },
  verdict: { type: "string", enum: ["clear", "revise", "unresolved"] },
  findings: array(object({ quote: text, source_quote: text, category: text, reason: text })),
  instructions: array(object({ id: text, status: { type: "string", enum: ["applied", "omitted", "not-applicable", "unresolved"] }, reason: text })),
  atom_accounting: array(object({ atom: text, disposition: { type: "string", enum: ["material-loss", "immaterial", "scanner-defect"] }, reason: text })),
  disclosures: array(object({ quote: text, reason: text })) });

/** A deliberately small validator for the schema subset these contracts actually use. */
export function schemaErrors(value, schema, path = "output") {
  const errors = [];
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [`${path}: expected object`];
    if (Object.keys(value).some((k) => !Object.hasOwn(schema.properties, k))) errors.push(`${path}: unexpected fields`);
    for (const key of schema.required) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: missing`);
      else errors.push(...schemaErrors(value[key], schema.properties[key], `${path}.${key}`));
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) return [`${path}: expected array`];
    value.forEach((v, i) => errors.push(...schemaErrors(v, schema.items, `${path}[${i}]`)));
  } else if (typeof value !== schema.type) errors.push(`${path}: expected ${schema.type}`);
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path}: wrong schema discriminator`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: unsupported value`);
  return errors;
}

export function validateDraftV5(value, instructionIds = []) {
  const errors = schemaErrors(value, DRAFT_SCHEMA);
  if (errors.length) return errors;
  if (value.kind === "refusal") {
    if (value.draft || value.omitted.length || value.claims.length || !value.refused.trim()) errors.push("Refusal must contain a reason and no draft");
  } else {
    if (!value.draft.trim() || value.refused) errors.push("Draft requires prose and no refusal");
    for (const c of value.claims) if (!c.quote.trim() || !c.reason.trim() || !value.draft.includes(c.quote)) errors.push("Claim disclosure is not located in the draft");
    for (const o of value.omitted) if (!instructionIds.includes(o.id) || !o.reason.trim()) errors.push("Omission requires an actual instruction ID and reason");
    if (new Set(value.omitted.map((o) => o.id)).size !== value.omitted.length) errors.push("Duplicate omissions");
  }
  return errors;
}

export function validateReview(value, { draft, original = "", instructionIds = [], missingAtoms = [] }) {
  const errors = schemaErrors(value, REVIEW_SCHEMA);
  if (errors.length) return errors;
  if (value.verdict === "clear" && value.findings.length) errors.push("A clear review cannot contain revision findings");
  if (value.verdict === "revise" && !value.findings.length) errors.push("A revise verdict needs actionable findings");
  for (const f of value.findings) {
    if (!f.reason.trim() || !f.category.trim() || (!f.quote.trim() && !f.source_quote.trim())) errors.push("Finding needs located evidence and explanation");
    if (f.quote && !draft.includes(f.quote)) errors.push("Finding quote is absent from the draft");
    if (f.source_quote && !original.includes(f.source_quote)) errors.push("Finding source quote is absent from supplied evidence");
  }
  for (const d of value.disclosures) if (!d.quote.trim() || !draft.includes(d.quote) || !d.reason.trim()) errors.push("Disclosure is unlocatable");
  if (new Set(value.instructions.map((r) => r.id)).size !== value.instructions.length
    || value.instructions.length !== instructionIds.length
    || instructionIds.some((id) => !value.instructions.some((r) => r.id === id))) errors.push("Review must account for every requested instruction exactly once");
  if (value.instructions.some((r) => !r.reason.trim())) errors.push("Instruction dispositions need reasons");
  if (value.verdict === "clear" && value.instructions.some((r) => ["omitted", "unresolved"].includes(r.status))) errors.push("An unresolved or omitted instruction is not a clear review");
  if (value.atom_accounting.length !== missingAtoms.length || new Set(value.atom_accounting.map((r) => r.atom)).size !== value.atom_accounting.length
    || missingAtoms.some((atom) => !value.atom_accounting.some((r) => r.atom === atom))) errors.push("Fidelity review must account for every missing atom");
  if (value.atom_accounting.some((r) => !r.reason.trim())) errors.push("Missing atom dispositions need reasons");
  if (value.verdict === "clear" && value.atom_accounting.some((r) => r.disposition !== "immaterial")) errors.push("Material losses/scanner defects cannot be cleared silently");
  return errors;
}

export const DRAFT_INSTRUCTIONS = `You draft or revise prose using only the authorized task data. Return voice-draft-source/5.
The brief and explicit user rules control this task. Corpus-derived tendencies are advisory, not quotas. Read all coverage dimensions and supported observations; do not invent unresolved habits. If an applicable supported instruction cannot be used, name its ID in omitted.
Whole selected examples are style evidence, not reusable facts about the user. Never copy their distinctive passages unannounced. Do not invent author biography, employment, experiences, quotations, citations, or statistics. Put factual additions lacking supplied support in claims with their exact draft quote and what requires verification.
The optional source_text is content to preserve or continue, not an additional author sample. Rewrite only the requested passage. Continuation produces only the continuation, preserving established referents. In repair mode make the smallest coherent changes addressing supplied findings; never delete substantive material to satisfy a count. Preserve original claims, quotations, names, qualification and scope. Perform a final pronoun and referent consistency check.
Apply explicit phrase and punctuation preferences; they are user choices, not learned habits. Never consume a tell catalog or optimize toward scanner scores. Never claim resemblance, quality, factual certainty, or detector success. Refuse if the task genuinely leaves its register unchoosable. Return only the required JSON, with the actual prose in draft and no verification commentary inside it.`;

export const PROFILE_INSTRUCTIONS = `Read the supplied whole human-authored samples and return voice-profile-source/5. Describe observable writing behavior, its function and restrained placement, not personality or biography. Measurements are supplied as descriptive evidence; do not invent numbers, mandatory quotas or universal prohibitions from observed absences.
Cover each supplied coverage dimension with cited observations or an explicit unresolved reason. Do not invent a habit to fill a row. Cite a unique, exact quote from the original source with its file ID; code locates the source span. A general recurring habit needs support from at least two distinct pieces. A limited one-piece observation must say it is limited. Separate register/form differences, editorial interventions, and other people's quoted material. Refuse a visibly mixed-author corpus or an unresolvable requested register. Sparse samples may produce explicitly limited evidence rather than a full learned voice.
Use up to fourteen concise observations. Never read or derive instructions from a tell catalog, detector threshold, or generic tell list. Return JSON only; counts, coverage IDs and rates belong to the assembler.`;

export const REVIEW_TRANSPORT = `For this runtime invocation use the supplied prose-runtime-review/1 JSON schema instead of the legacy presentation format. Review without editing. A clear verdict means no identified problem in this review, not proof of resemblance, quality or factual accuracy.
Read the original/evidence and final draft. Every finding needs an exact draft quote or source_quote for a loss, plus a concrete reason. Use source_quote only for text in the supplied original/evidence string. Account for every requested instruction ID and every supplied missing atom. Explicit user preferences may deliberately differ from the observed corpus and are not voice errors for that reason. Observed count distributions are advisory, not mandatory quotas. If evidence is insufficient return unresolved, not a guessed pass. Unsupported factual additions belong in disclosures with exact draft quotes. Never invent a source to justify a finding.`;

export const TASK_REVIEW_INSTRUCTIONS = `Review only task adherence, explicit semantic preferences, supported profile instructions, pronoun/referent consistency and unsupported factual additions. Do not judge general quality. Check first-person biography, employers and personal experiences against supplied task facts, not style examples. Check that the draft has not silently dropped requested parentheticals, figure vocabulary or attribution. Surface evidence-backed omissions; ordinary variation is not an error. Never claim to prove factual accuracy. ${REVIEW_TRANSPORT}`;

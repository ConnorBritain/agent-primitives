import { readFileSync } from "node:fs";
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

export function validateReview(value, { draft, original = "", instructionIds = [], advisoryIds = [], missingAtoms = [] }) {
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
  if (value.verdict === "clear" && value.instructions.some((r) => r.status === "unresolved" || (r.status === "omitted" && !advisoryIds.includes(r.id)))) errors.push("An unresolved or omitted required instruction is not a clear review");
  if (value.atom_accounting.length !== missingAtoms.length || new Set(value.atom_accounting.map((r) => r.atom)).size !== value.atom_accounting.length
    || missingAtoms.some((atom) => !value.atom_accounting.some((r) => r.atom === atom))) errors.push("Fidelity review must account for every missing atom");
  if (value.atom_accounting.some((r) => !r.reason.trim())) errors.push("Missing atom dispositions need reasons");
  if (value.verdict === "clear" && value.atom_accounting.some((r) => r.disposition !== "immaterial")) errors.push("Material losses/scanner defects cannot be cleared silently");
  return errors;
}

/** Installed skill copies are rendered from primitives, never a second hand-written prompt. */
export function runtimePrompt(name) {
  if (!["voice-draft", "voice-profile-render", "voice-feedback-interpret", "voice-rhetoric-measure"].includes(name)) throw new TypeError("Unknown runtime primitive");
  try {
    const source = readFileSync(new URL(`../references/prompts/${name}.md`, import.meta.url), "utf8");
    const match = /^---\n[\s\S]*?\n---\n([\s\S]+)$/.exec(source);
    return match?.[1] ?? null;
  } catch { return null; }
}
export const DRAFT_INSTRUCTIONS = runtimePrompt("voice-draft");
export const PROFILE_INSTRUCTIONS = runtimePrompt("voice-profile-render");

export const REVIEW_TRANSPORT = `For this runtime invocation use the supplied prose-runtime-review/1 JSON schema instead of the legacy presentation format. Review without editing. A clear verdict means no identified problem in this review, not proof of resemblance, quality or factual accuracy.
The instruction_ids input is the exact accounting list: return each ID once and no other IDs. advisory_instruction_ids identifies observed tendencies, not required occurrences. A clear verdict may mark an advisory tendency omitted or not-applicable with a task-specific reason when that is ordinary variation, not an identified loss of style. Do not excuse a concrete style-dilution finding just because its observation is advisory. Omitted required instructions and unresolved judgments cannot accompany a clear verdict.
Read the original/evidence and final draft. Every finding needs an exact draft quote or source_quote for a loss, plus a concrete reason. Use source_quote only for text in the supplied original/evidence string. Account for every requested instruction ID and every supplied missing atom. The missing_atoms input is the complete list: atom_accounting must contain exactly those atoms, once each. If missing_atoms is empty, return atom_accounting: []; do not invent a factual inventory there. Additional semantic losses belong in findings, not atom_accounting. Explicit user preferences may deliberately differ from the observed corpus and are not voice errors for that reason. Observed count distributions are advisory, not mandatory quotas. A numerical departure is a diagnostic, not by itself a finding. Look for concrete substitutions that dilute supported style: lost asides, generic diction replacing characteristic actor/action grammar, changed reader relationship, flattened figures or repetitive closure. Judge function and task context, not just token counts. A repair's previous_draft can expose lost stylistic material, but generated text is never corpus evidence. If evidence is insufficient return unresolved, not a guessed pass. Unsupported factual additions belong in disclosures with exact draft quotes. Never invent a source to justify a finding.`;

export const TASK_REVIEW_INSTRUCTIONS = `Review only task adherence, explicit semantic preferences, supported profile instructions, pronoun/referent consistency and unsupported factual additions. Do not judge general quality. Check first-person biography, employers and personal experiences against supplied task facts, not style examples. Check that the draft has not silently dropped requested parentheticals, figure vocabulary or attribution. Surface evidence-backed omissions; ordinary variation is not an error. Never claim to prove factual accuracy. ${REVIEW_TRANSPORT}`;

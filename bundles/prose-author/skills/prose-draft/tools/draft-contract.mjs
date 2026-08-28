#!/usr/bin/env node
/**
 * Portable semantic boundary for blank-page voice drafting.
 *
 * A model owns the prose and the disclosure contents. This module owns the output
 * envelope: draft/refusal disjointness, exact fields, and canonical voice-draft/1
 * fences. Claude and Codex can enforce SOURCE_SCHEMA while decoding; another harness
 * may emit ordinary JSON and pass it through the same validator and assembler.
 */

export const SOURCE_SCHEMA_ID = "voice-draft-source/1";
export const DRAFT_SCHEMA_ID = "voice-draft/1";

const disclosureEntry = (first, second) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    [first]: { type: "string", minLength: 1 },
    [second]: { type: "string", minLength: 1 },
  },
  required: [first, second],
});

/**
 * Fixed-shape on purpose. Provider structured-output subsets disagree about optional
 * properties and conditional branches. Empty arrays and the unused text field are
 * unambiguous at this semantic boundary; canonical assembly removes them from the
 * public artifact.
 */
export const SOURCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { const: SOURCE_SCHEMA_ID },
    kind: { enum: ["draft", "refusal"] },
    draft: { type: "string" },
    omitted: {
      type: "array", maxItems: 50,
      items: disclosureEntry("habit", "why"),
    },
    claims: {
      type: "array", maxItems: 50,
      items: disclosureEntry("claim", "where"),
    },
    refused: { type: "string" },
  },
  required: ["schema", "kind", "draft", "omitted", "claims", "refused"],
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const exactKeys = (value, expected) => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return JSON.stringify(actual) === JSON.stringify(wanted);
};

function unwrapJsonFence(raw) {
  const trimmed = String(raw ?? "").trim();
  return /^```json\s*\n([\s\S]*?)\n```$/i.exec(trimmed)?.[1] ?? trimmed;
}

export function parseVoiceDraftSource(raw) {
  try {
    return { source: JSON.parse(unwrapJsonFence(raw)), error: null };
  } catch (error) {
    return { source: null, error: `invalid JSON: ${error.message}` };
  }
}

function disclosureErrors(entries, key, fields) {
  const errors = [];
  if (!Array.isArray(entries)) return [`source.${key} must be an array`];
  if (entries.length > 50) errors.push(`source.${key} may contain at most 50 entries`);
  for (const [index, entry] of entries.entries()) {
    const at = `source.${key}[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${at} must be an object`);
      continue;
    }
    if (!exactKeys(entry, fields)) errors.push(`${at} must carry only ${fields.join(" and ")}`);
    for (const field of fields) {
      if (!isText(entry[field])) errors.push(`${at}.${field} must be a non-empty string`);
    }
  }
  return errors;
}

/** @returns {{ok: boolean, refusal: boolean, errors: string[]}} */
export function validateVoiceDraftSource(source) {
  const errors = [];
  if (!isObject(source)) return { ok: false, refusal: false, errors: ["source is not an object"] };
  const fields = ["schema", "kind", "draft", "omitted", "claims", "refused"];
  if (!exactKeys(source, fields)) errors.push(`source must carry exactly: ${fields.join(", ")}`);
  if (source.schema !== SOURCE_SCHEMA_ID) errors.push(`source.schema must be ${SOURCE_SCHEMA_ID}`);
  if (!['draft', 'refusal'].includes(source.kind)) errors.push("source.kind must be draft or refusal");
  if (typeof source.draft !== "string") errors.push("source.draft must be a string");
  if (typeof source.refused !== "string") errors.push("source.refused must be a string");
  errors.push(...disclosureErrors(source.omitted, "omitted", ["habit", "why"]));
  errors.push(...disclosureErrors(source.claims, "claims", ["claim", "where"]));

  const refusal = source.kind === "refusal";
  if (source.kind === "draft") {
    if (!isText(source.draft)) errors.push("a draft source needs non-empty draft prose");
    if (/```/.test(String(source.draft ?? ""))) errors.push("a draft source cannot carry output fences inside its prose");
    if (String(source.refused ?? "").length !== 0) errors.push("a draft source cannot carry a refusal reason");
  } else if (refusal) {
    if (!isText(source.refused)) errors.push("a refusal source needs a non-empty reason");
    if (String(source.draft ?? "").length !== 0) errors.push("a refusal source cannot carry draft prose");
    if (Array.isArray(source.omitted) && source.omitted.length) errors.push("a refusal source cannot carry omissions");
    if (Array.isArray(source.claims) && source.claims.length) errors.push("a refusal source cannot carry claims");
  }
  return { ok: errors.length === 0, refusal, errors };
}

function jsonFence(value) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

/**
 * Deterministically render the public voice-draft/1 artifact. No model-authored field is
 * repaired, inferred, or selected; invalid semantic sources are rejected as a unit.
 */
export function assembleVoiceDraft(source) {
  const validation = validateVoiceDraftSource(source);
  if (!validation.ok) return { ...validation, output: null };
  if (validation.refusal) {
    return {
      ok: true,
      refusal: true,
      errors: [],
      output: `${jsonFence({ schema: DRAFT_SCHEMA_ID, refused: source.refused.trim() })}\n`,
    };
  }

  const record = { schema: DRAFT_SCHEMA_ID };
  if (source.omitted.length) record.omitted = source.omitted;
  if (source.claims.length) record.claims = source.claims;
  const disclosure = Object.keys(record).length > 1 ? `\n\n${jsonFence(record)}` : "";
  return {
    ok: true,
    refusal: false,
    errors: [],
    output: `\`\`\`markdown\n${source.draft.trim()}\n\`\`\`${disclosure}\n`,
  };
}

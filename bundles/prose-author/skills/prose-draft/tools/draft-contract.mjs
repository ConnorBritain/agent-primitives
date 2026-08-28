#!/usr/bin/env node
/**
 * Portable semantic boundary for blank-page voice drafting.
 *
 * voice-draft-source/2 is proof-carrying: prose is represented as paragraphs of
 * sentence units, and every sentence declares its factual basis. Deterministic code
 * validates that the certificate covers the complete emitted draft, checks any copied
 * request basis against the actual request, derives the public claims list, and owns the
 * canonical voice-draft/1 envelope. Historical source/1 artifacts remain readable.
 */

export const SOURCE_SCHEMA_ID = "voice-draft-source/2";
export const LEGACY_SOURCE_SCHEMA_ID = "voice-draft-source/1";
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

const sentenceClaim = {
  type: "object",
  additionalProperties: false,
  properties: {
    claim: { type: "string", minLength: 1 },
    request_basis: { type: "string" },
  },
  required: ["claim", "request_basis"],
};

const sentenceUnit = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string", minLength: 1 },
    basis: {
      type: "string",
      enum: ["request-supported", "external-verification", "reasoning", "hypothetical", "normative"],
    },
    claims: { type: "array", maxItems: 10, items: sentenceClaim },
  },
  required: ["text", "basis", "claims"],
};

/** Fixed shape for strict structured-output implementations. */
export const SOURCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { type: "string", const: SOURCE_SCHEMA_ID },
    kind: { type: "string", enum: ["draft", "refusal"] },
    paragraphs: {
      type: "array", maxItems: 50,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sentences: { type: "array", minItems: 1, maxItems: 30, items: sentenceUnit },
        },
        required: ["sentences"],
      },
    },
    omitted: {
      type: "array", maxItems: 50,
      items: disclosureEntry("habit", "why"),
    },
    refused: { type: "string" },
  },
  required: ["schema", "kind", "paragraphs", "omitted", "refused"],
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const exactKeys = (value, expected) => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return JSON.stringify(actual) === JSON.stringify(wanted);
};
const normalize = (value) => String(value ?? "").normalize("NFKC")
  .replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

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

function disclosureErrors(entries, key, fields, max = 50) {
  const errors = [];
  if (!Array.isArray(entries)) return [`source.${key} must be an array`];
  if (entries.length > max) errors.push(`source.${key} may contain at most ${max} entries`);
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

function validateLegacy(source) {
  const errors = [];
  const fields = ["schema", "kind", "draft", "omitted", "claims", "refused"];
  if (!exactKeys(source, fields)) errors.push(`legacy source must carry exactly: ${fields.join(", ")}`);
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

function validateSentenceUnits(source, request) {
  const errors = [];
  if (!Array.isArray(source.paragraphs)) return ["source.paragraphs must be an array"];
  if (source.paragraphs.length > 50) errors.push("source.paragraphs may contain at most 50 paragraphs");
  let sentenceCount = 0;
  let claimCount = 0;
  const normalizedRequest = normalize(request);
  for (const [pIndex, paragraph] of source.paragraphs.entries()) {
    const at = `source.paragraphs[${pIndex}]`;
    if (!isObject(paragraph) || !exactKeys(paragraph, ["sentences"])) {
      errors.push(`${at} must carry only sentences`);
      continue;
    }
    if (!Array.isArray(paragraph.sentences) || paragraph.sentences.length < 1 || paragraph.sentences.length > 30) {
      errors.push(`${at}.sentences must contain 1 to 30 sentence units`);
      continue;
    }
    for (const [sIndex, sentence] of paragraph.sentences.entries()) {
      sentenceCount += 1;
      const sat = `${at}.sentences[${sIndex}]`;
      if (!isObject(sentence) || !exactKeys(sentence, ["text", "basis", "claims"])) {
        errors.push(`${sat} must carry exactly text, basis, claims`);
        continue;
      }
      if (!isText(sentence.text)) errors.push(`${sat}.text must be non-empty`);
      if (/```|[\r\n]/.test(String(sentence.text ?? ""))) errors.push(`${sat}.text cannot contain a fence or newline`);
      if (!["request-supported", "external-verification", "reasoning", "hypothetical", "normative"].includes(sentence.basis)) {
        errors.push(`${sat}.basis is invalid`);
      }
      const auditedClaims = Array.isArray(sentence.claims) ? sentence.claims : [];
      if (!Array.isArray(sentence.claims)) {
        errors.push(`${sat}.claims must be an array`);
      } else if (sentence.claims.length > 10) {
        errors.push(`${sat}.claims may contain at most 10 entries`);
      } else {
        for (const [cIndex, claim] of sentence.claims.entries()) {
          const cat = `${sat}.claims[${cIndex}]`;
          if (!isObject(claim) || !exactKeys(claim, ["claim", "request_basis"])) {
            errors.push(`${cat} must carry exactly claim and request_basis`);
            continue;
          }
          if (!isText(claim.claim)) errors.push(`${cat}.claim must be non-empty`);
          if (typeof claim.request_basis !== "string") errors.push(`${cat}.request_basis must be a string`);
        }
      }
      claimCount += auditedClaims.length;
      if (sentence.basis === "request-supported") {
        if (auditedClaims.length === 0) {
          errors.push(`${sat} marked request-supported needs at least one claim`);
        }
        if (!normalizedRequest) errors.push(`${sat} cannot validate request support without the request`);
        for (const [cIndex, claim] of auditedClaims.entries()) {
          if (!isText(claim?.request_basis)) {
            errors.push(`${sat}.claims[${cIndex}].request_basis must copy supporting request text`);
          } else if (normalizedRequest
            && !normalizedRequest.includes(normalize(claim.request_basis))) {
            errors.push(`${sat}.claims[${cIndex}].request_basis is not locatable in the request`);
          }
        }
      } else if (sentence.basis === "external-verification") {
        if (auditedClaims.length === 0) {
          errors.push(`${sat} marked external-verification needs at least one claim`);
        }
        for (const [cIndex, claim] of auditedClaims.entries()) {
          if (typeof claim?.request_basis === "string" && claim.request_basis.length !== 0) {
            errors.push(`${sat}.claims[${cIndex}].request_basis must be empty for external verification`);
          }
        }
      } else if (Array.isArray(sentence.claims) && sentence.claims.length) {
        errors.push(`${sat} with ${sentence.basis} basis cannot carry claims`);
      }
    }
  }
  if (sentenceCount > 500) errors.push("a draft source may contain at most 500 sentence units");
  if (claimCount > 50) errors.push("a draft source may contain at most 50 request-supported claims");
  return errors;
}

/** @returns {{ok: boolean, refusal: boolean, errors: string[]}} */
export function validateVoiceDraftSource(source, { request = null } = {}) {
  if (!isObject(source)) return { ok: false, refusal: false, errors: ["source is not an object"] };
  if (source.schema === LEGACY_SOURCE_SCHEMA_ID) return validateLegacy(source);
  const errors = [];
  const fields = ["schema", "kind", "paragraphs", "omitted", "refused"];
  if (!exactKeys(source, fields)) errors.push(`source must carry exactly: ${fields.join(", ")}`);
  if (source.schema !== SOURCE_SCHEMA_ID) errors.push(`source.schema must be ${SOURCE_SCHEMA_ID}`);
  if (!['draft', 'refusal'].includes(source.kind)) errors.push("source.kind must be draft or refusal");
  if (typeof source.refused !== "string") errors.push("source.refused must be a string");
  errors.push(...disclosureErrors(source.omitted, "omitted", ["habit", "why"]));
  const refusal = source.kind === "refusal";
  if (source.kind === "draft") {
    errors.push(...validateSentenceUnits(source, request));
    if (!Array.isArray(source.paragraphs) || source.paragraphs.length === 0) {
      errors.push("a draft source needs at least one paragraph");
    }
    if (String(source.refused ?? "").length !== 0) errors.push("a draft source cannot carry a refusal reason");
  } else if (refusal) {
    if (!isText(source.refused)) errors.push("a refusal source needs a non-empty reason");
    if (!Array.isArray(source.paragraphs) || source.paragraphs.length !== 0) errors.push("a refusal source cannot carry paragraphs");
    if (Array.isArray(source.omitted) && source.omitted.length) errors.push("a refusal source cannot carry omissions");
  }
  return { ok: errors.length === 0, refusal, errors };
}

function jsonFence(value) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function materialize(source) {
  if (source.schema === LEGACY_SOURCE_SCHEMA_ID) {
    return { draft: source.draft.trim(), claims: source.claims };
  }
  const draft = source.paragraphs.map((paragraph) =>
    paragraph.sentences.map((sentence) => sentence.text.trim()).join(" ")).join("\n\n");
  const claims = source.paragraphs.flatMap((paragraph, pIndex) =>
    paragraph.sentences.flatMap((sentence) => sentence.claims.map(({ claim }) => ({
      claim: claim.trim(), where: `paragraph ${pIndex + 1}`,
    }))));
  return { draft, claims };
}

/** Deterministically render the public voice-draft/1 artifact. */
export function assembleVoiceDraft(source, context = {}) {
  const validation = validateVoiceDraftSource(source, context);
  if (!validation.ok) return { ...validation, output: null };
  if (validation.refusal) {
    return {
      ok: true,
      refusal: true,
      errors: [],
      output: `${jsonFence({ schema: DRAFT_SCHEMA_ID, refused: source.refused.trim() })}\n`,
    };
  }

  const materialized = materialize(source);
  const record = { schema: DRAFT_SCHEMA_ID };
  if (source.omitted.length) record.omitted = source.omitted;
  if (materialized.claims.length) record.claims = materialized.claims;
  const disclosure = Object.keys(record).length > 1 ? `\n\n${jsonFence(record)}` : "";
  return {
    ok: true,
    refusal: false,
    errors: [],
    output: `\`\`\`markdown\n${materialized.draft}\n\`\`\`${disclosure}\n`,
  };
}

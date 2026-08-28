/** Independent factual-basis audit for proof-carrying voice drafts. */

import {
  SOURCE_SCHEMA_ID as DRAFT_SOURCE_SCHEMA_ID, validateVoiceDraftSource,
} from "./draft-contract.mjs";

export const AUDIT_SCHEMA_ID = "voice-draft-claim-audit/1";

const claimSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    claim: { type: "string", minLength: 1 },
    request_basis: { type: "string" },
  },
  required: ["claim", "request_basis"],
};

export const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { type: "string", const: AUDIT_SCHEMA_ID },
    sentences: {
      type: "array", maxItems: 500,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", pattern: "^p[1-9][0-9]*s[1-9][0-9]*$" },
          status: { type: "string", enum: ["keep", "reject"] },
          basis: {
            type: "string",
            enum: ["request-supported", "external-verification", "reasoning", "hypothetical", "normative"],
          },
          claims: { type: "array", maxItems: 10, items: claimSchema },
          reason: { type: "string" },
        },
        required: ["id", "status", "basis", "claims", "reason"],
      },
    },
  },
  required: ["schema", "sentences"],
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, expected) => JSON.stringify(Object.keys(value).sort())
  === JSON.stringify([...expected].sort());

export function parseVoiceDraftClaimAudit(raw) {
  try {
    const trimmed = String(raw ?? "").trim();
    const body = /^```json\s*\n([\s\S]*?)\n```$/i.exec(trimmed)?.[1] ?? trimmed;
    return { audit: JSON.parse(body), error: null };
  } catch (error) {
    return { audit: null, error: `invalid JSON: ${error.message}` };
  }
}

export function sentenceRefs(source) {
  if (!isObject(source) || source.schema !== DRAFT_SOURCE_SCHEMA_ID || !Array.isArray(source.paragraphs)) return [];
  return source.paragraphs.flatMap((paragraph, pIndex) =>
    (Array.isArray(paragraph?.sentences) ? paragraph.sentences : []).map((sentence, sIndex) => ({
      id: `p${pIndex + 1}s${sIndex + 1}`,
      text: sentence?.text,
    })));
}

export function applyVoiceDraftClaimAudit(source, audit, { request = null } = {}) {
  const errors = [];
  const original = validateVoiceDraftSource(source, { request });
  if (!original.ok) errors.push(...original.errors.map((error) => `draft source: ${error}`));
  if (source?.schema !== DRAFT_SOURCE_SCHEMA_ID) errors.push(`claim audit requires ${DRAFT_SOURCE_SCHEMA_ID}`);
  if (!isObject(audit)) return { ok: false, errors: [...errors, "claim audit is not an object"], source: null };
  if (!exactKeys(audit, ["schema", "sentences"])) errors.push("claim audit must carry exactly schema and sentences");
  if (audit.schema !== AUDIT_SCHEMA_ID) errors.push(`claim audit schema must be ${AUDIT_SCHEMA_ID}`);
  if (!Array.isArray(audit.sentences)) {
    errors.push("claim audit sentences must be an array");
    return { ok: false, errors, source: null };
  }

  const refs = sentenceRefs(source);
  if (audit.sentences.length !== refs.length) {
    errors.push(`claim audit covers ${audit.sentences.length} of ${refs.length} sentence units`);
  }
  const decisions = [];
  for (let index = 0; index < Math.max(refs.length, audit.sentences.length); index += 1) {
    const expected = refs[index];
    const row = audit.sentences[index];
    const at = `claim audit sentences[${index}]`;
    if (!isObject(row)) { errors.push(`${at} must be an object`); continue; }
    if (!exactKeys(row, ["id", "status", "basis", "claims", "reason"])) {
      errors.push(`${at} must carry exactly id, status, basis, claims, reason`);
    }
    if (expected && row.id !== expected.id) errors.push(`${at}.id must be ${expected.id}`);
    if (!expected) errors.push(`${at} has no draft sentence`);
    if (!["keep", "reject"].includes(row.status)) errors.push(`${at}.status is invalid`);
    if (!["request-supported", "external-verification", "reasoning", "hypothetical", "normative"].includes(row.basis)) {
      errors.push(`${at}.basis is invalid`);
    }
    if (!Array.isArray(row.claims)) errors.push(`${at}.claims must be an array`);
    if (typeof row.reason !== "string") errors.push(`${at}.reason must be a string`);
    if (row.status === "keep" && String(row.reason ?? "").length !== 0) errors.push(`${at} kept a non-empty rejection reason`);
    if (row.status === "reject" && !String(row.reason ?? "").trim()) errors.push(`${at} rejected without a reason`);
    if (row.status === "reject") errors.push(`${row.id ?? at} rejected: ${String(row.reason).trim()}`);
    decisions.push(row);
  }
  if (errors.length) return { ok: false, errors, source: null };

  let cursor = 0;
  const auditedSource = {
    ...source,
    paragraphs: source.paragraphs.map((paragraph) => ({
      sentences: paragraph.sentences.map((sentence) => {
        const decision = decisions[cursor++];
        return { text: sentence.text, basis: decision.basis, claims: decision.claims };
      }),
    })),
  };
  const validation = validateVoiceDraftSource(auditedSource, { request });
  if (!validation.ok) return {
    ok: false,
    errors: validation.errors.map((error) => `audited source: ${error}`),
    source: null,
  };
  return { ok: true, errors: [], source: auditedSource };
}

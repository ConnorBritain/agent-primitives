/** Independent factual-basis audit for current direct prose and historical sentence sources. */

import {
  LEDGER_SOURCE_SCHEMA_ID, PREVIOUS_SOURCE_SCHEMA_ID,
  SOURCE_SCHEMA_ID as DRAFT_SOURCE_SCHEMA_ID, sentenceUnits, validateVoiceDraftSource,
} from "./draft-contract.mjs";

export const AUDIT_SCHEMA_ID = "voice-draft-claim-audit/4";
export const PREVIOUS_DISCLOSURE_AUDIT_SCHEMA_ID = "voice-draft-claim-audit/3";
export const PREVIOUS_AUDIT_SCHEMA_ID = "voice-draft-claim-audit/2";
export const LEGACY_AUDIT_SCHEMA_ID = "voice-draft-claim-audit/1";

const disclosedClaim = {
  type: "object",
  additionalProperties: false,
  properties: {
    claim: { type: "string", minLength: 1 },
    kind: { type: "string", enum: ["bounded-fact", "broad-generalization"] },
    verification_question: { type: "string", minLength: 1 },
  },
  required: ["claim", "kind", "verification_question"],
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
          status: { type: "string", enum: ["keep", "disclose", "reject"] },
          reason: { type: "string" },
          claims: { type: "array", maxItems: 10, items: disclosedClaim },
        },
        required: ["id", "status", "reason", "claims"],
      },
    },
  },
  required: ["schema", "sentences"],
};

export const PREVIOUS_AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { type: "string", const: PREVIOUS_AUDIT_SCHEMA_ID },
    sentences: {
      type: "array", maxItems: 500,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", pattern: "^p[1-9][0-9]*s[1-9][0-9]*$" },
          status: { type: "string", enum: ["keep", "reject"] },
          reason: { type: "string" },
        },
        required: ["id", "status", "reason"],
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
  return sentenceUnits(source);
}

export function applyVoiceDraftClaimAudit(source, audit, { request = null } = {}) {
  const errors = [];
  const original = validateVoiceDraftSource(source, { request });
  if (!original.ok) errors.push(...original.errors.map((error) => `draft source: ${error}`));
  if (![DRAFT_SOURCE_SCHEMA_ID, LEDGER_SOURCE_SCHEMA_ID, PREVIOUS_SOURCE_SCHEMA_ID].includes(source?.schema)) {
    errors.push(`claim audit requires ${DRAFT_SOURCE_SCHEMA_ID} or a readable historical sentence source`);
  }
  if (!isObject(audit)) return { ok: false, errors: [...errors, "claim audit is not an object"], source: null };
  if (!exactKeys(audit, ["schema", "sentences"])) errors.push("claim audit must carry exactly schema and sentences");
  const disclosureSource = [DRAFT_SOURCE_SCHEMA_ID, LEDGER_SOURCE_SCHEMA_ID].includes(source?.schema);
  const currentAudit = disclosureSource && audit.schema === AUDIT_SCHEMA_ID;
  const previousDisclosureAudit = source?.schema === LEDGER_SOURCE_SCHEMA_ID
    && audit.schema === PREVIOUS_DISCLOSURE_AUDIT_SCHEMA_ID;
  const historicalLedgerAudit = source?.schema === LEDGER_SOURCE_SCHEMA_ID
    && audit.schema === PREVIOUS_AUDIT_SCHEMA_ID;
  if (disclosureSource && !currentAudit && !previousDisclosureAudit && !historicalLedgerAudit) {
    errors.push(`claim audit schema must be ${AUDIT_SCHEMA_ID} or historical ${PREVIOUS_DISCLOSURE_AUDIT_SCHEMA_ID} or ${PREVIOUS_AUDIT_SCHEMA_ID}`);
  } else if (!disclosureSource && audit.schema !== LEGACY_AUDIT_SCHEMA_ID) {
    errors.push(`claim audit schema must be ${LEGACY_AUDIT_SCHEMA_ID}`);
  }
  if (!Array.isArray(audit.sentences)) {
    errors.push("claim audit sentences must be an array");
    return { ok: false, errors, source: null };
  }

  const refs = sentenceRefs(source);
  if (audit.sentences.length !== refs.length) {
    errors.push(`claim audit covers ${audit.sentences.length} of ${refs.length} sentence units`);
  }
  const decisions = [];
  const disclosures = [];
  const disclosedKeys = new Set();
  const ledgerClaims = new Set((Array.isArray(source?.ledger) ? source.ledger : [])
    .map((entry) => String(entry?.claim ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean));
  for (let index = 0; index < Math.max(refs.length, audit.sentences.length); index += 1) {
    const expected = refs[index];
    const row = audit.sentences[index];
    const at = `claim audit sentences[${index}]`;
    if (!isObject(row)) { errors.push(`${at} must be an object`); continue; }
    const disclosureAudit = currentAudit || previousDisclosureAudit;
    const rowFields = disclosureAudit
      ? ["id", "status", "reason", "claims"]
      : disclosureSource ? ["id", "status", "reason"] : ["id", "status", "basis", "claims", "reason"];
    if (!exactKeys(row, rowFields)) {
      errors.push(`${at} must carry exactly ${rowFields.join(", ")}`);
    }
    if (expected && row.id !== expected.id) errors.push(`${at}.id must be ${expected.id}`);
    if (!expected) errors.push(`${at} has no draft sentence`);
    const allowedStatuses = disclosureAudit ? ["keep", "disclose", "reject"] : ["keep", "reject"];
    if (!allowedStatuses.includes(row.status)) errors.push(`${at}.status is invalid`);
    if (!disclosureSource) {
      if (!["request-supported", "external-verification", "reasoning", "hypothetical", "normative"].includes(row.basis)) {
        errors.push(`${at}.basis is invalid`);
      }
      if (!Array.isArray(row.claims)) errors.push(`${at}.claims must be an array`);
    }
    if (typeof row.reason !== "string") errors.push(`${at}.reason must be a string`);
    if (row.status === "keep" && !String(row.reason ?? "").trim()) errors.push(`${at} kept without a basis rationale`);
    if (row.status === "disclose" && !String(row.reason ?? "").trim()) errors.push(`${at} disclosed without a basis rationale`);
    if (row.status === "reject" && !String(row.reason ?? "").trim()) errors.push(`${at} rejected without a reason`);
    if (disclosureAudit) {
      if (!Array.isArray(row.claims)) {
        errors.push(`${at}.claims must be an array`);
      } else {
        if (row.claims.length > 10) errors.push(`${at}.claims may contain at most 10 entries`);
        if (row.status === "disclose" && row.claims.length === 0) errors.push(`${at} disclose needs at least one claim`);
        if (row.status !== "disclose" && row.claims.length) errors.push(`${at} ${row.status} cannot carry claims`);
        for (const [claimIndex, claim] of row.claims.entries()) {
          const cat = `${at}.claims[${claimIndex}]`;
          const fields = currentAudit
            ? ["claim", "kind", "verification_question"]
            : ["claim", "evidence", "kind", "verification_question"];
          if (!isObject(claim) || !exactKeys(claim, fields)) {
            errors.push(`${cat} must carry exactly ${fields.join(", ")}`);
            continue;
          }
          const textualFields = currentAudit
            ? ["claim", "verification_question"]
            : ["claim", "evidence", "verification_question"];
          for (const field of textualFields) {
            if (typeof claim[field] !== "string" || !claim[field].trim()) {
              errors.push(`${cat}.${field} must be a non-empty string`);
            }
          }
          if (!["bounded-fact", "broad-generalization"].includes(claim.kind)) {
            errors.push(`${cat}.kind is invalid`);
          }
          if (previousDisclosureAudit && expected && typeof claim.evidence === "string"
            && !String(expected.text ?? "").includes(claim.evidence)) {
            errors.push(`${cat}.evidence is not an exact span of ${row.id ?? at}`);
          }
          const key = String(claim.claim ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
          if (key && ledgerClaims.has(key)) errors.push(`${cat}.claim duplicates the closed ledger`);
          if (key && disclosedKeys.has(key)) errors.push(`${cat}.claim duplicates an earlier audit disclosure`);
          if (key) disclosedKeys.add(key);
          if (row.status === "disclose" && expected && isObject(claim)) {
            const paragraph = /^p([1-9][0-9]*)s/.exec(row.id)?.[1];
            disclosures.push({
              claim: String(claim.claim ?? "").trim(),
              where: `paragraph ${paragraph}`,
              sentence_id: row.id,
              evidence: currentAudit
                ? String(expected.text ?? "")
                : String(claim.evidence ?? ""),
              kind: claim.kind,
              verification_question: String(claim.verification_question ?? "").trim(),
            });
          }
        }
      }
    }
    if (row.status === "reject") errors.push(`${row.id ?? at} rejected: ${String(row.reason).trim()}`);
    decisions.push(row);
  }
  if (disclosures.length > 50) errors.push("claim audit may disclose at most 50 claims");
  if (errors.length) return { ok: false, errors, source: null };

  if (disclosureSource) return { ok: true, errors: [], source, claims: disclosures };

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
  return { ok: true, errors: [], source: auditedSource, claims: [] };
}

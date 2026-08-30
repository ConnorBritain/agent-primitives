/** Bounded repair contract for a rejected proof-carrying voice draft. */

import { sentenceRefs } from "./draft-claim-audit.mjs";
import { LEDGER_SOURCE_SCHEMA_ID, validateVoiceDraftSource } from "./draft-contract.mjs";

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, expected) => JSON.stringify(Object.keys(value).sort())
  === JSON.stringify([...expected].sort());
const MAX_REJECTED_SENTENCES = 2;
const MAX_REJECTED_SHARE = 0.2;
const HYPOTHETICAL_PREFIX = "Hypothetically: ";

function auditShapeErrors(source, audit) {
  const errors = [];
  const refs = sentenceRefs(source);
  if (!isObject(audit) || !exactKeys(audit, ["schema", "sentences"])
    || audit.schema !== "voice-draft-claim-audit/2" || !Array.isArray(audit.sentences)) {
    return ["repair requires a complete voice-draft-claim-audit/2"];
  }
  if (audit.sentences.length !== refs.length) errors.push("repair audit does not cover every original sentence");
  for (let index = 0; index < Math.max(refs.length, audit.sentences.length); index += 1) {
    const row = audit.sentences[index];
    const expected = refs[index];
    if (!isObject(row) || !exactKeys(row, ["id", "status", "reason"])
      || row.id !== expected?.id || !["keep", "reject"].includes(row.status)
      || typeof row.reason !== "string" || !row.reason.trim()) {
      errors.push(`repair audit row ${index + 1} does not match the original sentence order`);
    }
  }
  return errors;
}

export function claimRepairEligibilityErrors(source, audit) {
  const errors = auditShapeErrors(source, audit);
  if (errors.length) return errors;
  const sentenceCount = sentenceRefs(source).length;
  const rejectedCount = audit.sentences.filter((row) => row.status === "reject").length;
  if (rejectedCount === 0) errors.push("repair requires at least one rejected sentence");
  if (rejectedCount > MAX_REJECTED_SENTENCES) {
    errors.push(`repair covers ${rejectedCount} rejected sentences; maximum is ${MAX_REJECTED_SENTENCES}`);
  }
  if (sentenceCount && rejectedCount / sentenceCount > MAX_REJECTED_SHARE) {
    errors.push(`repair covers more than ${MAX_REJECTED_SHARE * 100}% of the draft`);
  }
  return errors;
}

function rejectedSentenceErrors(before, after, id) {
  const errors = [];
  if (after.text !== `${HYPOTHETICAL_PREFIX}${before.text}`) {
    errors.push(`repair must preserve ${id} byte-for-byte under the fixed hypothetical wrapper`);
  }
  if (after.basis !== "hypothetical") errors.push(`repair must mark ${id} hypothetical`);
  if (!Array.isArray(after.claim_ids) || after.claim_ids.length) {
    errors.push(`repair must clear claim references from hypothetical sentence ${id}`);
  }
  return errors;
}

/**
 * A repair is deliberately weaker than a redraft. It may delete unchanged ledger
 * entries that became unused and may rewrite only sentence units an independent audit
 * rejected. It cannot add facts, change accepted prose, or reshape the piece.
 */
export function validateVoiceDraftClaimRepair(original, repaired, {
  request = null, audit = null, sourceErrors = [],
} = {}) {
  const errors = [];
  if (!isObject(original) || original.schema !== LEDGER_SOURCE_SCHEMA_ID || original.kind !== "draft") {
    return { ok: false, errors: ["claim repair requires an original voice-draft-source/3 draft"] };
  }
  const repairedValidation = validateVoiceDraftSource(repaired, { request });
  if (!repairedValidation.ok || repairedValidation.refusal) {
    errors.push(...repairedValidation.errors.map((error) => `repaired source: ${error}`));
  }
  if (!isObject(repaired) || repaired.schema !== LEDGER_SOURCE_SCHEMA_ID || repaired.kind !== "draft") {
    return { ok: false, errors: [...errors, "repair must return a voice-draft-source/3 draft"] };
  }
  if (!same(original.omitted, repaired.omitted)) errors.push("repair changed the omission record");
  if (original.refused !== repaired.refused) errors.push("repair changed the refusal field");
  if (original.paragraphs?.length !== repaired.paragraphs?.length) errors.push("repair changed paragraph count");

  const structuralRepair = Array.isArray(sourceErrors) && sourceErrors.length > 0;
  if (structuralRepair && audit) errors.push("repair cannot mix source-validation and audit issues");
  if (!structuralRepair) errors.push(...claimRepairEligibilityErrors(original, audit));
  const rejected = new Set(
    !structuralRepair && Array.isArray(audit?.sentences)
      ? audit.sentences.filter((row) => row?.status === "reject").map((row) => row.id)
      : [],
  );

  for (let pIndex = 0; pIndex < Math.max(original.paragraphs?.length ?? 0, repaired.paragraphs?.length ?? 0); pIndex += 1) {
    const before = original.paragraphs?.[pIndex]?.sentences;
    const after = repaired.paragraphs?.[pIndex]?.sentences;
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) {
      errors.push(`repair changed sentence count in paragraph ${pIndex + 1}`);
      continue;
    }
    for (let sIndex = 0; sIndex < before.length; sIndex += 1) {
      const id = `p${pIndex + 1}s${sIndex + 1}`;
      if (structuralRepair || !rejected.has(id)) {
        if (!same(before[sIndex], after[sIndex])) errors.push(`repair changed protected sentence ${id}`);
      } else errors.push(...rejectedSentenceErrors(before[sIndex], after[sIndex], id));
    }
  }

  const originalLedger = new Map((original.ledger ?? []).map((entry) => [entry.id, entry]));
  for (const entry of repaired.ledger ?? []) {
    if (!originalLedger.has(entry.id) || !same(originalLedger.get(entry.id), entry)) {
      errors.push(`repair added or changed ledger entry ${entry.id ?? "unknown"}`);
    }
  }
  if (same(original, repaired)) errors.push("repair made no change");
  return { ok: errors.length === 0, errors };
}

export function claimRepairRejectedIds(source, audit) {
  if (claimRepairEligibilityErrors(source, audit).length) return [];
  return audit.sentences.filter((row) => row.status === "reject").map((row) => row.id);
}

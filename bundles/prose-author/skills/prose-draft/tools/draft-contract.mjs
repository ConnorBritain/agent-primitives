#!/usr/bin/env node
/**
 * Portable semantic boundary for blank-page voice drafting.
 *
 * voice-draft-source/4 keeps the expressive pass direct: the model emits prose plus its
 * omission record, while the independent claim-audit stage inventories every sentence
 * before the public artifact can be assembled. This keeps factual certification out of
 * the prose-generation representation without weakening the later closed-world audit.
 * Historical source/1, source/2, and ledger-first source/3 artifacts remain readable.
 */

export const SOURCE_SCHEMA_ID = "voice-draft-source/4";
export const LEDGER_SOURCE_SCHEMA_ID = "voice-draft-source/3";
export const PREVIOUS_SOURCE_SCHEMA_ID = "voice-draft-source/2";
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

const ledgerEntry = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", pattern: "^c[1-9][0-9]*$" },
    basis: { type: "string", enum: ["request-supported", "external-verification"] },
    claim: { type: "string", minLength: 1 },
    request_basis: { type: "string" },
  },
  required: ["id", "basis", "claim", "request_basis"],
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
    claim_ids: {
      type: "array", maxItems: 10,
      items: { type: "string", pattern: "^c[1-9][0-9]*$" },
    },
  },
  required: ["text", "basis", "claim_ids"],
};

/** Fixed shape for strict structured-output implementations. */
export const SOURCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { type: "string", const: SOURCE_SCHEMA_ID },
    kind: { type: "string", enum: ["draft", "refusal"] },
    draft: { type: "string" },
    omitted: {
      type: "array", maxItems: 50,
      items: disclosureEntry("habit", "why"),
    },
    refused: { type: "string" },
  },
  required: ["schema", "kind", "draft", "omitted", "refused"],
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const SUPPORT_STOPWORDS = new Set([
  "about", "after", "again", "also", "answer", "argue", "because", "before", "being",
  "blog", "concern", "cover", "decision", "direct", "essay", "explain", "from", "have", "into", "keep", "make",
  "post", "reply", "should", "something", "that", "their", "there", "these", "they", "this",
  "those", "through", "using", "what", "when", "where", "which", "while", "with", "word",
  "words", "write", "would", "your",
]);
const supportStem = (token) => {
  if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
};
const supportTerms = (value) => new Set(
  String(value ?? "").normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu)
    ?.map(supportStem).filter((token) => token.length >= 4 && !SUPPORT_STOPWORDS.has(token)) ?? [],
);
export const sharedRequestSupportTerms = (left, right) => {
  const a = supportTerms(left);
  const b = supportTerms(right);
  return [...a].filter((term) => b.has(term));
};
export const requestSupportCoverage = (claim, evidence) => {
  const claimTerms = [...supportTerms(claim)];
  const evidenceTerms = supportTerms(evidence);
  const matched = claimTerms.filter((term) => evidenceTerms.has(term));
  return {
    total: claimTerms.length,
    matched: matched.length,
    missing: claimTerms.filter((term) => !evidenceTerms.has(term)),
    ratio: claimTerms.length ? matched.length / claimTerms.length : 0,
  };
};
export const hasSufficientRequestSupport = (claim, evidence) => {
  const coverage = requestSupportCoverage(claim, evidence);
  if (coverage.total === 0) return false;
  return coverage.total < 5 ? coverage.matched === coverage.total : coverage.ratio >= 0.8;
};
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

function validatePreviousSentenceUnits(source, request) {
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

function validateLedger(source, request) {
  const errors = [];
  if (!Array.isArray(source.ledger)) return ["source.ledger must be an array"];
  if (source.ledger.length > 50) errors.push("source.ledger may contain at most 50 entries");
  const normalizedRequest = normalize(request);
  for (const [index, entry] of source.ledger.entries()) {
    const at = `source.ledger[${index}]`;
    if (!isObject(entry) || !exactKeys(entry, ["id", "basis", "claim", "request_basis"])) {
      errors.push(`${at} must carry exactly id, basis, claim, request_basis`);
      continue;
    }
    if (entry.id !== `c${index + 1}`) errors.push(`${at}.id must be c${index + 1}`);
    if (!["request-supported", "external-verification"].includes(entry.basis)) {
      errors.push(`${at}.basis is invalid`);
    }
    if (!isText(entry.claim)) errors.push(`${at}.claim must be non-empty`);
    if (typeof entry.request_basis !== "string") errors.push(`${at}.request_basis must be a string`);
    if (entry.basis === "request-supported") {
      if (!normalizedRequest) errors.push(`${at} cannot validate request support without the request`);
      if (!isText(entry.request_basis)) {
        errors.push(`${at}.request_basis must copy supporting request text`);
      } else if (normalizedRequest && !normalizedRequest.includes(normalize(entry.request_basis))) {
        errors.push(`${at}.request_basis is not locatable in the request`);
      }
      if (isText(entry.claim) && isText(entry.request_basis)
        && !hasSufficientRequestSupport(entry.claim, entry.request_basis)) {
        const coverage = requestSupportCoverage(entry.claim, entry.request_basis);
        errors.push(coverage.matched === 0
          ? `${at}.request_basis has no substantive lexical support for its claim`
          : `${at}.request_basis does not substantively cover its claim (${coverage.matched}/${coverage.total} terms)`);
      }
    } else if (typeof entry.request_basis === "string" && entry.request_basis.length !== 0) {
      errors.push(`${at}.request_basis must be empty for external verification`);
    }
  }
  return errors;
}

function validateLedgerSentenceUnits(source, request) {
  const errors = [];
  if (!Array.isArray(source.paragraphs)) return ["source.paragraphs must be an array"];
  if (source.paragraphs.length > 50) errors.push("source.paragraphs may contain at most 50 paragraphs");
  if (request === null || request === undefined) errors.push("a source/3 draft requires the original request");
  const ledger = new Map((Array.isArray(source.ledger) ? source.ledger : []).map((entry) => [entry?.id, entry]));
  const references = new Map();
  let sentenceCount = 0;
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
      if (!isObject(sentence) || !exactKeys(sentence, ["text", "basis", "claim_ids"])) {
        errors.push(`${sat} must carry exactly text, basis, claim_ids`);
        continue;
      }
      if (!isText(sentence.text)) errors.push(`${sat}.text must be non-empty`);
      if (/```|[\r\n]/.test(String(sentence.text ?? ""))) errors.push(`${sat}.ledger-first text cannot contain a fence or newline`);
      if (!["request-supported", "external-verification", "reasoning", "hypothetical", "normative"].includes(sentence.basis)) {
        errors.push(`${sat}.basis is invalid`);
      }
      if (!Array.isArray(sentence.claim_ids)) {
        errors.push(`${sat}.claim_ids must be an array`);
        continue;
      }
      if (sentence.claim_ids.length > 10) errors.push(`${sat}.claim_ids may contain at most 10 entries`);
      if (["request-supported", "external-verification"].includes(sentence.basis) && sentence.claim_ids.length === 0) {
        errors.push(`${sat} marked ${sentence.basis} needs at least one claim id`);
      }
      if (!["request-supported", "external-verification"].includes(sentence.basis) && sentence.claim_ids.length) {
        errors.push(`${sat} with ${sentence.basis} basis cannot cite ledger claims`);
      }
      const local = new Set();
      for (const claimId of sentence.claim_ids) {
        if (typeof claimId !== "string" || !/^c[1-9][0-9]*$/.test(claimId)) {
          errors.push(`${sat}.claim_ids contains an invalid id`);
          continue;
        }
        if (local.has(claimId)) errors.push(`${sat}.claim_ids repeats ${claimId}`);
        local.add(claimId);
        const claim = ledger.get(claimId);
        if (!claim) {
          errors.push(`${sat}.claim_ids has dangling reference ${claimId}`);
          continue;
        }
        if (claim.basis !== sentence.basis) {
          errors.push(`${sat} basis ${sentence.basis} cannot cite ${claimId} with basis ${claim.basis}`);
        }
        references.set(claimId, (references.get(claimId) ?? 0) + 1);
      }
      if (sentence.basis === "request-supported" && isText(sentence.text)) {
        const citedClaims = sentence.claim_ids.map((claimId) => ledger.get(claimId)?.claim).filter(Boolean);
        if (citedClaims.length && sharedRequestSupportTerms(sentence.text, citedClaims.join(" ")).length === 0) {
          errors.push(`${sat} has no substantive lexical support from its cited request claims`);
        }
      }
    }
  }
  if (sentenceCount > 500) errors.push("a draft source may contain at most 500 sentence units");
  for (const entry of Array.isArray(source.ledger) ? source.ledger : []) {
    const count = references.get(entry?.id) ?? 0;
    if (count === 0) errors.push(`source.ledger ${entry?.id ?? "entry"} is not cited by any sentence`);
  }
  return errors;
}

/** Stable sentence addresses consumed by the independent factual audit. */
export function sentenceUnits(source) {
  if (!isObject(source)) return [];
  if (source.schema === SOURCE_SCHEMA_ID && typeof source.draft === "string") {
    const blocks = source.draft.trim().split(/\r?\n[ \t]*\r?\n+/).map((block) => block.trim()).filter(Boolean);
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    return blocks.flatMap((block, pIndex) => [...segmenter.segment(block)]
      .map(({ segment }) => segment.trim()).filter(Boolean)
      .map((text, sIndex) => ({ id: `p${pIndex + 1}s${sIndex + 1}`, text })));
  }
  if ([LEDGER_SOURCE_SCHEMA_ID, PREVIOUS_SOURCE_SCHEMA_ID].includes(source.schema)
    && Array.isArray(source.paragraphs)) {
    return source.paragraphs.flatMap((paragraph, pIndex) =>
      (Array.isArray(paragraph?.sentences) ? paragraph.sentences : []).map((sentence, sIndex) => ({
        id: `p${pIndex + 1}s${sIndex + 1}`,
        text: sentence?.text,
      })));
  }
  return [];
}

/** @returns {{ok: boolean, refusal: boolean, errors: string[]}} */
export function validateVoiceDraftSource(source, { request = null } = {}) {
  if (!isObject(source)) return { ok: false, refusal: false, errors: ["source is not an object"] };
  if (source.schema === SOURCE_SCHEMA_ID) {
    const errors = [];
    const fields = ["schema", "kind", "draft", "omitted", "refused"];
    if (!exactKeys(source, fields)) errors.push(`source/4 must carry exactly: ${fields.join(", ")}`);
    if (!['draft', 'refusal'].includes(source.kind)) errors.push("source.kind must be draft or refusal");
    if (typeof source.draft !== "string") errors.push("source.draft must be a string");
    if (typeof source.refused !== "string") errors.push("source.refused must be a string");
    errors.push(...disclosureErrors(source.omitted, "omitted", ["habit", "why"]));
    const refusal = source.kind === "refusal";
    if (source.kind === "draft") {
      if (!isText(source.draft)) errors.push("a draft source needs non-empty draft prose");
      if (/```/.test(String(source.draft ?? ""))) errors.push("a draft source cannot carry output fences inside its prose");
      if (String(source.draft ?? "").length > 100000) errors.push("a draft source may contain at most 100000 characters");
      if (sentenceUnits(source).length > 500) errors.push("a draft source may contain at most 500 sentence units");
      if (String(source.refused ?? "").length !== 0) errors.push("a draft source cannot carry a refusal reason");
    } else if (refusal) {
      if (!isText(source.refused)) errors.push("a refusal source needs a non-empty reason");
      if (String(source.draft ?? "").length !== 0) errors.push("a refusal source cannot carry draft prose");
      if (Array.isArray(source.omitted) && source.omitted.length) errors.push("a refusal source cannot carry omissions");
    }
    return { ok: errors.length === 0, refusal, errors };
  }
  if (source.schema === LEGACY_SOURCE_SCHEMA_ID) return validateLegacy(source);
  if (source.schema === PREVIOUS_SOURCE_SCHEMA_ID) {
    const errors = [];
    const fields = ["schema", "kind", "paragraphs", "omitted", "refused"];
    if (!exactKeys(source, fields)) errors.push(`source/2 must carry exactly: ${fields.join(", ")}`);
    if (!['draft', 'refusal'].includes(source.kind)) errors.push("source.kind must be draft or refusal");
    if (typeof source.refused !== "string") errors.push("source.refused must be a string");
    errors.push(...disclosureErrors(source.omitted, "omitted", ["habit", "why"]));
    const refusal = source.kind === "refusal";
    if (source.kind === "draft") {
      errors.push(...validatePreviousSentenceUnits(source, request));
      if (!Array.isArray(source.paragraphs) || source.paragraphs.length === 0) errors.push("a draft source needs at least one paragraph");
      if (String(source.refused ?? "").length !== 0) errors.push("a draft source cannot carry a refusal reason");
    } else {
      if (!isText(source.refused)) errors.push("a refusal source needs a non-empty reason");
      if (!Array.isArray(source.paragraphs) || source.paragraphs.length !== 0) errors.push("a refusal source cannot carry paragraphs");
      if (Array.isArray(source.omitted) && source.omitted.length) errors.push("a refusal source cannot carry omissions");
    }
    return { ok: errors.length === 0, refusal, errors };
  }
  const errors = [];
  const fields = ["schema", "kind", "ledger", "paragraphs", "omitted", "refused"];
  if (!exactKeys(source, fields)) errors.push(`source must carry exactly: ${fields.join(", ")}`);
  else if (JSON.stringify(Object.keys(source)) !== JSON.stringify(fields)) {
    errors.push("source/3 keys must place the closed ledger before paragraphs");
  }
  if (source.schema !== LEDGER_SOURCE_SCHEMA_ID) {
    errors.push(`source.schema must be ${SOURCE_SCHEMA_ID} or a readable historical schema`);
  }
  if (!['draft', 'refusal'].includes(source.kind)) errors.push("source.kind must be draft or refusal");
  if (typeof source.refused !== "string") errors.push("source.refused must be a string");
  errors.push(...disclosureErrors(source.omitted, "omitted", ["habit", "why"]));
  const refusal = source.kind === "refusal";
  if (source.kind === "draft") {
    errors.push(...validateLedger(source, request));
    errors.push(...validateLedgerSentenceUnits(source, request));
    if (!Array.isArray(source.paragraphs) || source.paragraphs.length === 0) {
      errors.push("a draft source needs at least one paragraph");
    }
    if (String(source.refused ?? "").length !== 0) errors.push("a draft source cannot carry a refusal reason");
  } else if (refusal) {
    if (!isText(source.refused)) errors.push("a refusal source needs a non-empty reason");
    if (!Array.isArray(source.paragraphs) || source.paragraphs.length !== 0) errors.push("a refusal source cannot carry paragraphs");
    if (!Array.isArray(source.ledger) || source.ledger.length !== 0) errors.push("a refusal source cannot carry a claim ledger");
    if (Array.isArray(source.omitted) && source.omitted.length) errors.push("a refusal source cannot carry omissions");
  }
  return { ok: errors.length === 0, refusal, errors };
}

/**
 * Remove only an unused contiguous suffix from a source/3 ledger. This is a
 * representational normalization, not a prose or claim repair: every remaining byte of
 * the semantic object is preserved and no ID is renumbered.
 */
export function normalizeVoiceDraftSource(source, { request = null } = {}) {
  const initial = validateVoiceDraftSource(source, { request });
  if (initial.ok || initial.refusal) {
    return { ok: initial.ok, refusal: initial.refusal, changed: false, errors: initial.errors, source };
  }
  if (source?.schema !== LEDGER_SOURCE_SCHEMA_ID || !Array.isArray(source.ledger)
    || !Array.isArray(source.paragraphs)) {
    return { ok: false, refusal: false, changed: false, errors: initial.errors, source: null };
  }
  const unused = initial.errors
    .map((error) => /^source\.ledger (c[1-9][0-9]*) is not cited by any sentence$/.exec(error)?.[1])
    .filter(Boolean);
  if (unused.length !== initial.errors.length || unused.length === 0) {
    return { ok: false, refusal: false, changed: false, errors: initial.errors, source: null };
  }
  const referenced = new Set(source.paragraphs.flatMap((paragraph) =>
    (Array.isArray(paragraph?.sentences) ? paragraph.sentences : [])
      .flatMap((sentence) => Array.isArray(sentence?.claim_ids) ? sentence.claim_ids : [])));
  let keep = source.ledger.length;
  while (keep > 0 && !referenced.has(`c${keep}`)) keep -= 1;
  const removed = source.ledger.slice(keep).map((entry) => entry?.id);
  if (removed.length === 0 || unused.some((id) => !removed.includes(id))) {
    return { ok: false, refusal: false, changed: false, errors: initial.errors, source: null };
  }
  const normalized = { ...source, ledger: source.ledger.slice(0, keep) };
  const validation = validateVoiceDraftSource(normalized, { request });
  if (!validation.ok || validation.refusal) {
    return { ok: false, refusal: validation.refusal, changed: false, errors: validation.errors, source: null };
  }
  return { ok: true, refusal: false, changed: true, errors: [], source: normalized, removed_ledger_ids: removed };
}

function jsonFence(value) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function materialize(source) {
  if (source.schema === SOURCE_SCHEMA_ID) {
    return { draft: source.draft.trim(), claims: [] };
  }
  if (source.schema === LEGACY_SOURCE_SCHEMA_ID) {
    return { draft: source.draft.trim(), claims: source.claims };
  }
  if (source.schema === PREVIOUS_SOURCE_SCHEMA_ID) {
    const draft = source.paragraphs.map((paragraph) =>
      paragraph.sentences.map((sentence) => sentence.text.trim()).join(" ")).join("\n\n");
    const claims = source.paragraphs.flatMap((paragraph, pIndex) =>
      paragraph.sentences.flatMap((sentence) => sentence.claims.map(({ claim }) => ({
        claim: claim.trim(), where: `paragraph ${pIndex + 1}`,
      }))));
    return { draft, claims };
  }
  const ledger = new Map(source.ledger.map((entry) => [entry.id, entry]));
  const draft = source.paragraphs.map((paragraph) =>
    paragraph.sentences.map((sentence) => sentence.text.trim()).join(" ")).join("\n\n");
  const claims = source.paragraphs.flatMap((paragraph, pIndex) =>
    paragraph.sentences.flatMap((sentence) => sentence.claim_ids.map((id) => ({
      claim: ledger.get(id).claim.trim(), where: `paragraph ${pIndex + 1}`,
    }))));
  return { draft, claims };
}

function auditClaimErrors(source, claims) {
  const errors = [];
  if (!Array.isArray(claims)) return ["auditClaims must be an array"];
  if (claims.length > 50) errors.push("auditClaims may contain at most 50 entries");
  const sentences = new Map();
  if ([SOURCE_SCHEMA_ID, LEDGER_SOURCE_SCHEMA_ID].includes(source?.schema)) {
    for (const sentence of sentenceUnits(source)) {
      const paragraph = /^p([1-9][0-9]*)s/.exec(sentence.id)?.[1];
      sentences.set(sentence.id, { text: sentence.text, where: `paragraph ${paragraph}` });
    }
  }
  const seen = new Set();
  for (const [index, claim] of claims.entries()) {
    const at = `auditClaims[${index}]`;
    const fields = ["claim", "where", "sentence_id", "evidence", "kind", "verification_question"];
    if (!isObject(claim) || !exactKeys(claim, fields)) {
      errors.push(`${at} must carry exactly ${fields.join(", ")}`);
      continue;
    }
    for (const field of ["claim", "where", "sentence_id", "evidence", "verification_question"]) {
      if (!isText(claim[field])) errors.push(`${at}.${field} must be a non-empty string`);
    }
    if (!["bounded-fact", "broad-generalization"].includes(claim.kind)) errors.push(`${at}.kind is invalid`);
    const sentence = sentences.get(claim.sentence_id);
    if (!sentence) {
      errors.push(`${at}.sentence_id does not locate a source sentence`);
    } else {
      if (claim.where !== sentence.where) errors.push(`${at}.where must be ${sentence.where}`);
      if (!sentence.text.includes(claim.evidence)) errors.push(`${at}.evidence is not an exact source span`);
    }
    const key = normalize(claim.claim).toLowerCase();
    if (key && seen.has(key)) errors.push(`${at}.claim duplicates an earlier audit claim`);
    if (key) seen.add(key);
  }
  return errors;
}

/** Deterministically render the public voice-draft/1 artifact. */
export function assembleVoiceDraft(source, context = {}) {
  const validation = validateVoiceDraftSource(source, context);
  if (!validation.ok) return { ...validation, output: null };
  if (!validation.refusal && source.schema === SOURCE_SCHEMA_ID
    && !Object.hasOwn(context, "auditClaims")) {
    return {
      ok: false, refusal: false,
      errors: ["voice-draft-source/4 requires a completed independent claim audit before assembly"],
      output: null,
    };
  }
  const auditClaims = context.auditClaims ?? [];
  const auditErrors = auditClaimErrors(source, auditClaims);
  if (auditErrors.length) return { ok: false, refusal: validation.refusal, errors: auditErrors, output: null };
  if (validation.refusal) {
    if (auditClaims.length) return {
      ok: false, refusal: true, errors: ["a refusal cannot carry audit claims"], output: null,
    };
    return {
      ok: true,
      refusal: true,
      errors: [],
      output: `${jsonFence({ schema: DRAFT_SCHEMA_ID, refused: source.refused.trim() })}\n`,
    };
  }

  const materialized = materialize(source);
  const planned = new Set(materialized.claims.map((claim) => normalize(claim.claim).toLowerCase()));
  const duplicate = auditClaims.find((claim) => planned.has(normalize(claim.claim).toLowerCase()));
  if (duplicate) return {
    ok: false, refusal: false,
    errors: [`audit claim duplicates a planned ledger claim: ${duplicate.claim}`], output: null,
  };
  const publicAuditClaims = auditClaims.map(({ claim, where }) => ({ claim, where }));
  const claims = [...materialized.claims, ...publicAuditClaims];
  if (claims.length > 50) return {
    ok: false, refusal: false, errors: ["a public draft may disclose at most 50 claims"], output: null,
  };
  const record = { schema: DRAFT_SCHEMA_ID };
  if (source.omitted.length) record.omitted = source.omitted;
  if (claims.length) record.claims = claims;
  const disclosure = Object.keys(record).length > 1 ? `\n\n${jsonFence(record)}` : "";
  return {
    ok: true,
    refusal: false,
    errors: [],
    output: `\`\`\`markdown\n${materialized.draft}\n\`\`\`${disclosure}\n`,
  };
}

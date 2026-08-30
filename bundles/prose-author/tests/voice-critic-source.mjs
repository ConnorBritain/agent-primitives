/**
 * Acceptance-only structured transport for prose-voice-critic.
 *
 * The shipped critic still owns every finding and its independent verdict. This module
 * owns only the envelope and exact closing token so a semantically unambiguous report
 * cannot fail because the model appended prose to `REVISE`.
 */

export const CRITIC_SOURCE_SCHEMA_ID = "voice-critic-source/1";
export const CRITIC_CATEGORIES = [
  "register-breaks",
  "unfamiliar-constructions",
  "out-of-register-vocabulary",
  "flattened-rhythm",
  "unvarying-voice",
];

export const CRITIC_SOURCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { type: "string", const: CRITIC_SOURCE_SCHEMA_ID },
    findings: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          location: { type: "string", minLength: 1 },
          what: { type: "string", minLength: 1 },
          corpus_evidence: { type: "string", minLength: 1 },
          confidence: { type: "string", enum: ["high", "low"] },
        },
        required: ["location", "what", "corpus_evidence", "confidence"],
      },
    },
    clean_categories: {
      type: "array",
      items: { type: "string", enum: CRITIC_CATEGORIES },
    },
    rhythm_assessed: { type: "boolean" },
    rhythm_note: { type: "string", minLength: 1 },
    verdict: { type: "string", enum: ["CLEAN", "REVISE"] },
  },
  required: ["schema", "findings", "clean_categories", "rhythm_assessed", "rhythm_note", "verdict"],
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const sameKeys = (value, expected) => JSON.stringify(Object.keys(value).sort())
  === JSON.stringify([...expected].sort());

function unwrapJsonFence(raw) {
  const trimmed = String(raw ?? "").trim();
  return /^```json\s*\n([\s\S]*?)\n```$/i.exec(trimmed)?.[1] ?? trimmed;
}

export function parseVoiceCriticSource(raw) {
  try { return { source: JSON.parse(unwrapJsonFence(raw)), error: null }; } catch (error) {
    return { source: null, error: `invalid JSON: ${error.message}` };
  }
}

/** @returns {{ok: boolean, errors: string[]}} */
export function validateVoiceCriticSource(source, { rhythmScanSupplied = false } = {}) {
  const errors = [];
  const fields = ["schema", "findings", "clean_categories", "rhythm_assessed", "rhythm_note", "verdict"];
  if (!isObject(source)) return { ok: false, errors: ["critic source is not an object"] };
  if (!sameKeys(source, fields)) errors.push(`critic source must carry exactly: ${fields.join(", ")}`);
  if (source.schema !== CRITIC_SOURCE_SCHEMA_ID) errors.push(`critic source schema must be ${CRITIC_SOURCE_SCHEMA_ID}`);
  if (!Array.isArray(source.findings)) errors.push("critic source findings must be an array");
  if (Array.isArray(source.findings) && source.findings.length > 10) errors.push("critic source may carry at most ten findings");
  for (const [index, finding] of (Array.isArray(source.findings) ? source.findings : []).entries()) {
    const at = `findings[${index}]`;
    const findingFields = ["location", "what", "corpus_evidence", "confidence"];
    if (!isObject(finding)) { errors.push(`${at} must be an object`); continue; }
    if (!sameKeys(finding, findingFields)) errors.push(`${at} must carry exactly ${findingFields.join(", ")}`);
    for (const field of findingFields.slice(0, 3)) {
      if (!isText(finding[field])) errors.push(`${at}.${field} must be a non-empty string`);
    }
    if (!["high", "low"].includes(finding.confidence)) errors.push(`${at}.confidence must be high or low`);
  }
  if (Array.isArray(source.findings)
    && source.findings.some((finding) => finding?.confidence === "low")
    && !source.findings.some((finding) => finding?.confidence === "high")) {
    errors.push("a low-confidence finding requires a nearby high-confidence finding");
  }
  if (!Array.isArray(source.clean_categories)
    || new Set(source.clean_categories).size !== source.clean_categories.length
    || !source.clean_categories.every((category) => CRITIC_CATEGORIES.includes(category))) {
    errors.push("critic source clean_categories must be unique fixed category ids");
  }
  if (typeof source.rhythm_assessed !== "boolean") errors.push("critic source rhythm_assessed must be boolean");
  if (!isText(source.rhythm_note)) errors.push("critic source rhythm_note must be a non-empty string");
  if (source.rhythm_assessed !== rhythmScanSupplied) {
    errors.push(`critic source rhythm_assessed must be ${rhythmScanSupplied} for this dispatch`);
  }
  if (!["CLEAN", "REVISE"].includes(source.verdict)) errors.push("critic source verdict must be CLEAN or REVISE");
  if (/machine[- ]generated|written by (?:an? )?(?:AI|model)|AI[- ]generated/i.test(JSON.stringify(source))) {
    errors.push("critic source makes a forbidden authorship claim");
  }
  return { ok: errors.length === 0, errors };
}

export function assembleVoiceCritic(source, options = {}) {
  const validation = validateVoiceCriticSource(source, options);
  if (!validation.ok) return { ...validation, output: null };
  const parts = [];
  for (const finding of source.findings) {
    parts.push([
      `**LOCATION**: ${finding.location.trim()}`,
      `**WHAT**: ${finding.what.trim()}`,
      `**CORPUS EVIDENCE**: ${finding.corpus_evidence.trim()}`,
      `**CONFIDENCE**: ${finding.confidence}`,
    ].join("\n"));
  }
  if (!source.findings.length) parts.push("No findings.");
  parts.push(`**CLEAN CATEGORIES**: ${source.clean_categories.length ? source.clean_categories.join(", ") : "none"}`);
  parts.push(`**RHYTHM**: ${source.rhythm_note.trim()}`);
  parts.push(`**${source.verdict}**`);
  return { ok: true, errors: [], output: `${parts.join("\n\n")}\n` };
}

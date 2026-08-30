#!/usr/bin/env node
/**
 * Portable contract between the semantic voice renderer and canonical voice-profile/2.
 *
 * A language model decides what the corpus says. This module owns everything mechanical:
 * support arithmetic, measurement copying, observation ids, coverage statuses, absence
 * pairing, and the evidence lines embedded in the prose. Claude may enforce SOURCE_SCHEMA
 * while decoding; Codex and other harnesses may write ordinary JSON and call assemble.
 */

export const SOURCE_SCHEMA_ID = "voice-profile-source/4";
export const PREVIOUS_SOURCE_SCHEMA_ID = "voice-profile-source/3";
export const PROFILE_SCHEMA_ID = "voice-profile/2";

export const COVERAGE_DIMENSIONS = [
  "person-reader-stance",
  "contraction-negation",
  "qualification-hedging",
  "questions-imperatives-vocatives",
  "opponents-allies-sources",
  "profanity-vulgarity",
  "self-reference-biography",
  "interruption-punctuation",
  "figures-analogy",
  "openings-endings-closure",
];

export const SECTIONS = [
  "cadence", "openings", "closings", "address", "figures", "register-range", "absences",
];

export const SECTION_HEADINGS = {
  cadence: "## 1. Cadence",
  openings: "## 2. How a piece opens",
  closings: "## 3. How a piece closes",
  address: "## 4. Who is being addressed, and how",
  figures: "## 5. Figures",
  "register-range": "## 6. Register range",
  absences: "## 7. What the corpus never does",
};

export const DIMENSION_LABELS = {
  "person-reader-stance": "Person, number, and reader stance",
  "contraction-negation": "Contraction and negation",
  "qualification-hedging": "Qualification and hedging",
  "questions-imperatives-vocatives": "Questions, imperatives, and vocatives",
  "opponents-allies-sources": "Named opponents, allies, and sources",
  "profanity-vulgarity": "Profanity and vulgarity",
  "self-reference-biography": "Self-reference and biography",
  "interruption-punctuation": "Interruption punctuation",
  "figures-analogy": "Figures and analogy vocabulary",
  "openings-endings-closure": "Openings, paragraph endings, and closure",
};

export const FREQUENCIES = [
  "once or twice per piece", "several times per piece", "throughout",
];

/**
 * The fixed prose bands are presentation derived from a measured corpus average.
 * Models do not own this mapping: giving a semantic renderer the exact count and then
 * asking it to choose the label produced a different label for the same row across k=3.
 */
export const FREQUENCY_BANDS = [
  { phrase: "once or twice per piece", max: 2.5 },
  { phrase: "several times per piece", max: 10 },
  { phrase: "throughout", max: Infinity },
];

export function frequencyForPerPiece(perPiece) {
  if (typeof perPiece !== "number" || !Number.isFinite(perPiece) || perPiece < 0) {
    throw new TypeError("per-piece frequency must be a non-negative finite number");
  }
  return FREQUENCY_BANDS.find((band) => perPiece < band.max).phrase;
}

/** Counted positive forms that can occupy the place of a sparse measured counterpart. */
export const ABSENCE_REPLACEMENTS = {
  "uncontracted-negatives": ["contractions"],
  "first-person-singular-family": ["first-person-plural-family"],
  "em-dashes": ["en-dashes", "round-parenthetical-spans"],
  "en-dashes": ["em-dashes", "round-parenthetical-spans"],
  "profanity-vulgarity": [],
};

export const MEASUREMENT_DIMENSIONS = {
  "second-person-family": ["person-reader-stance"],
  "first-person-plural-family": ["person-reader-stance"],
  contractions: ["contraction-negation"],
  "uncontracted-negatives": ["contraction-negation"],
  "profanity-vulgarity": ["profanity-vulgarity"],
  "first-person-singular-family": ["self-reference-biography"],
  "question-marks": ["questions-imperatives-vocatives"],
  "round-parenthetical-spans": ["interruption-punctuation"],
  "em-dashes": ["interruption-punctuation"],
  "en-dashes": ["interruption-punctuation"],
};

export const MEASUREMENT_SECTIONS = {
  "second-person-family": "address",
  "first-person-plural-family": "address",
  contractions: "cadence",
  "uncontracted-negatives": "cadence",
  "profanity-vulgarity": "register-range",
  "first-person-singular-family": "register-range",
  "question-marks": "address",
  "round-parenthetical-spans": "cadence",
  "em-dashes": "cadence",
  "en-dashes": "cadence",
};

const measuredSemanticSchema = {
  type: "object",
  additionalProperties: false,
  properties: { prose: { type: "string", minLength: 100, maxLength: 450 } },
  required: ["prose"],
};

const qualitativeObservationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    dimensions: {
      type: "array", minItems: 1, maxItems: 3,
      items: { type: "string", enum: COVERAGE_DIMENSIONS },
    },
    section: { type: "string", enum: SECTIONS },
    prose: { type: "string", minLength: 100, maxLength: 450 },
    support_files: {
      type: "array", minItems: 2,
      items: { type: "string", minLength: 1 },
    },
  },
  required: ["dimensions", "section", "prose", "support_files"],
};

function positiveReplacement(row, byId) {
  return (ABSENCE_REPLACEMENTS[row.id] ?? []).map((id) => byId.get(id)).find((candidate) => candidate?.count > 0);
}

export function sourceMeasurementPlan(measurements) {
  const rows = Array.isArray(measurements?.measurements)
    ? measurements.measurements.filter((row) => row && typeof row === "object" && typeof row.id === "string")
    : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const measured = [];
  const unresolved = new Set();
  for (const row of rows) {
    const dimensions = MEASUREMENT_DIMENSIONS[row.id];
    if (!dimensions) continue;
    const replacement = positiveReplacement(row, byId);
    if (row.count === 0 && !replacement) {
      dimensions.forEach((dimension) => unresolved.add(dimension));
      continue;
    }
    const absence = row.count === 0 || Boolean(replacement && row.count <= replacement.count * 0.2);
    measured.push({
      id: row.id,
      dimensions,
      section: absence ? "absences" : MEASUREMENT_SECTIONS[row.id],
      absence,
    });
  }
  const measuredDimensions = new Set(measured.flatMap((slot) => slot.dimensions));
  const qualitativeDimensions = COVERAGE_DIMENSIONS.filter((dimension) =>
    !measuredDimensions.has(dimension) && !unresolved.has(dimension));
  const qualitativeMin = Math.max(0, 10 - measured.length);
  const qualitativeMax = 14 - measured.length;
  return {
    measured,
    qualitativeDimensions,
    unresolvedDimensions: [...unresolved],
    qualitativeMin,
    qualitativeMax,
  };
}

/** Native render schema generated from the locked deterministic measurement context. */
export function sourceRenderSchema(measurements) {
  const plan = sourceMeasurementPlan(measurements);
  return {
    type: "object",
    additionalProperties: false,
    $defs: { measuredSemantic: measuredSemanticSchema, qualitativeObservation: {
      ...qualitativeObservationSchema,
      properties: {
        ...qualitativeObservationSchema.properties,
        dimensions: {
          ...qualitativeObservationSchema.properties.dimensions,
          items: { type: "string", enum: plan.qualitativeDimensions },
        },
      },
    } },
    properties: {
      schema: { type: "string", const: SOURCE_SCHEMA_ID },
      voice_card: { type: "string", enum: ["empty", "corroborating", "contradicted"] },
      measured: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(plan.measured.map((slot) => [slot.id, { $ref: "#/$defs/measuredSemantic" }])),
        required: plan.measured.map((slot) => slot.id),
      },
      qualitative: {
        type: "array", minItems: plan.qualitativeMin, maxItems: plan.qualitativeMax,
        items: { $ref: "#/$defs/qualitativeObservation" },
      },
      unresolved: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries([
          ...plan.qualitativeDimensions, ...plan.unresolvedDimensions,
        ].map((id) => [id, {
          type: plan.unresolvedDimensions.includes(id) ? "string" : ["string", "null"],
          minLength: 20, maxLength: 500,
        }])),
        required: [...plan.qualitativeDimensions, ...plan.unresolvedDimensions],
      },
      gaps: { type: "string", minLength: 40, maxLength: 900 },
      observations_dropped: { type: "integer", minimum: 0 },
      multiple_voices_suspected: { type: "boolean" },
    },
    required: [
      "schema", "voice_card", "measured", "qualitative", "unresolved", "gaps",
      "observations_dropped", "multiple_voices_suspected",
    ],
  };
}

/** Generic provider-neutral shape; context-specific slot checks remain local and authoritative. */
const SOURCE_RENDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  $defs: { measuredSemantic: measuredSemanticSchema, qualitativeObservation: qualitativeObservationSchema },
  properties: {
    schema: { type: "string", const: SOURCE_SCHEMA_ID },
    voice_card: { type: "string", enum: ["empty", "corroborating", "contradicted"] },
    measured: {
      type: "object", additionalProperties: { $ref: "#/$defs/measuredSemantic" },
    },
    qualitative: {
      type: "array", maxItems: 14, items: { $ref: "#/$defs/qualitativeObservation" },
    },
    unresolved: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(COVERAGE_DIMENSIONS.map((id) => [id, {
        type: "string", minLength: 20, maxLength: 500,
      }])),
    },
    gaps: { type: "string", minLength: 40, maxLength: 900 },
    observations_dropped: { type: "integer", minimum: 0 },
    multiple_voices_suspected: { type: "boolean" },
  },
  required: [
    "schema", "voice_card", "measured", "qualitative", "unresolved", "gaps",
    "observations_dropped", "multiple_voices_suspected",
  ],
};

export const SOURCE_REFUSAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { type: "string", const: SOURCE_SCHEMA_ID },
    refused: { type: "string", minLength: 1 },
  },
  required: ["schema", "refused"],
};

/** Complete provider-neutral contract. A harness may validate this after ordinary JSON output. */
const { $defs: sourceDefs, ...sourceRenderShape } = SOURCE_RENDER_SCHEMA;
export const SOURCE_SCHEMA = {
  $defs: sourceDefs,
  oneOf: [sourceRenderShape, SOURCE_REFUSAL_SCHEMA],
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const exactKeys = (obj, allowed) => Object.keys(obj).filter((key) => !allowed.includes(key));

function unwrapJsonFence(raw) {
  const trimmed = String(raw ?? "").trim();
  return /^```json\s*\n([\s\S]*?)\n```$/i.exec(trimmed)?.[1] ?? trimmed;
}

/**
 * Decode model transport without repairing semantic structure.
 *
 * Some CLI harnesses return a JSON fence whose prose contains a copied ASCII quote that
 * was not escaped. A quote is mechanically identifiable as internal when the following
 * non-space character cannot close a JSON string, key, array item, or object value. Escape
 * only those characters, report how many changed, then let JSON.parse and sourceErrors do
 * all substantive validation.
 */
export function parseVoiceProfileSource(raw) {
  const body = unwrapJsonFence(raw);
  try { return { source: JSON.parse(body), repairs: 0, error: null }; } catch (firstError) {
    let inString = false;
    let escaped = false;
    let repairs = 0;
    let repaired = "";
    const nextNonspace = (from) => {
      let i = from;
      while (/\s/.test(body[i] ?? "")) i += 1;
      return { char: body[i], index: i };
    };
    for (let i = 0; i < body.length; i += 1) {
      const char = body[i];
      if (!inString) {
        repaired += char;
        if (char === '"') inString = true;
        continue;
      }
      if (escaped) { repaired += char; escaped = false; continue; }
      if (char === "\\") { repaired += char; escaped = true; continue; }
      if (char !== '"') { repaired += char; continue; }

      const next = nextNonspace(i + 1);
      let closes = next.char === ":" || next.char === "}" || next.char === "]" || next.char === undefined;
      if (next.char === ",") {
        const afterComma = nextNonspace(next.index + 1).char;
        closes = afterComma === '"' || afterComma === "}" || afterComma === "]";
      }
      if (closes) {
        repaired += char;
        inString = false;
      } else {
        repaired += `\\${char}`;
        repairs += 1;
      }
    }
    try {
      return { source: JSON.parse(repaired), repairs, error: null };
    } catch (secondError) {
      return {
        source: null, repairs,
        error: `invalid JSON before repair (${firstError.message}) and after repair (${secondError.message})`,
      };
    }
  }
}

function sourceErrors(source, measurements = null) {
  const errors = [];
  const err = (message) => errors.push(message);
  if (!isObject(source)) return ["source is not an object"];
  const currentSource = source.schema === SOURCE_SCHEMA_ID;
  const previousSource = source.schema === PREVIOUS_SOURCE_SCHEMA_ID;
  if (!currentSource && !previousSource) {
    err(`source.schema must be ${SOURCE_SCHEMA_ID} or historical ${PREVIOUS_SOURCE_SCHEMA_ID}`);
  }
  for (const key of exactKeys(source, [
    "schema", "voice_card", "measured", "qualitative", "unresolved", "gaps", "observations_dropped",
    "multiple_voices_suspected", "refused",
  ])) err(`source carries unknown key: ${key}`);

  if (Object.hasOwn(source, "refused")) {
    if (!isText(source.refused)) err("source.refused must be a non-empty reason");
    for (const key of Object.keys(source)) {
      if (!["schema", "refused"].includes(key)) err(`refusal carries render key: ${key}`);
    }
    return errors;
  }

  if (!["empty", "corroborating", "contradicted"].includes(source.voice_card)) {
    err("source.voice_card is invalid");
  }
  if (!isText(source.gaps) || source.gaps.trim().length < 40 || source.gaps.trim().length > 900) {
    err("source.gaps must contain 40–900 characters of prose");
  }
  if (!Number.isInteger(source.observations_dropped) || source.observations_dropped < 0) {
    err("source.observations_dropped must be a non-negative integer");
  }
  if (typeof source.multiple_voices_suspected !== "boolean") {
    err("source.multiple_voices_suspected must be boolean");
  }
  if (!isObject(source.measured)) err("source.measured must be an object");
  if (!Array.isArray(source.qualitative)) err("source.qualitative must be an array");
  if (!isObject(source.unresolved)) err("source.unresolved must be an object");
  if (isObject(source.unresolved)) {
    for (const extra of exactKeys(source.unresolved, COVERAGE_DIMENSIONS)) {
      err(`unknown unresolved coverage dimension: ${extra}`);
    }
    for (const [dimension, reason] of Object.entries(source.unresolved)) {
      if (!isText(reason) || reason.trim().length < 20 || reason.trim().length > 500) {
        err(`source.unresolved.${dimension} must contain 20–500 characters`);
      }
    }
  }

  const plan = measurements ? sourceMeasurementPlan(measurements) : null;
  const coveredDimensions = new Set();
  if (isObject(source.measured)) {
    const expectedIds = plan?.measured.map((slot) => slot.id) ?? Object.keys(source.measured);
    for (const extra of exactKeys(source.measured, expectedIds)) err(`source.measured carries unexpected slot: ${extra}`);
    for (const id of expectedIds) {
      const at = `measured.${id}`;
      const observation = source.measured[id];
      if (!isObject(observation)) { err(`${at} is missing or not an object`); continue; }
      for (const extra of exactKeys(observation, ["prose"])) err(`${at} carries unknown key: ${extra}`);
      if (!isText(observation.prose) || observation.prose.trim().length < 100
        || observation.prose.trim().length > 450) {
        err(`${at}.prose must contain 100–450 characters of actionable evidence`);
      }
      if (/\b\d+\s*\/\s*\d+\s+samples?\b/i.test(observation.prose)
        || /\bper\s+1[,.]?000\s+words?\b/i.test(observation.prose)
        || /\[measurement:[a-z0-9-]+\]/i.test(observation.prose)) {
        err(`${at}.prose duplicates deterministic evidence`);
      }
      plan?.measured.find((slot) => slot.id === id)?.dimensions
        .forEach((dimension) => coveredDimensions.add(dimension));
    }
  }

  for (const [i, observation] of (Array.isArray(source.qualitative) ? source.qualitative : []).entries()) {
    const at = `qualitative[${i}]`;
    if (!isObject(observation)) { err(`${at} is not an object`); continue; }
    const qualitativeFields = currentSource
      ? ["dimensions", "section", "prose", "support_files"]
      : ["dimensions", "section", "prose", "frequency", "support_files"];
    for (const extra of exactKeys(observation, qualitativeFields)) err(`${at} carries unknown key: ${extra}`);
    const allowedDimensions = plan?.qualitativeDimensions ?? COVERAGE_DIMENSIONS;
    if (!Array.isArray(observation.dimensions) || observation.dimensions.length < 1
      || observation.dimensions.length > 3 || new Set(observation.dimensions).size !== observation.dimensions.length
      || !observation.dimensions.every((dimension) => allowedDimensions.includes(dimension))) {
      err(`${at}.dimensions must contain one to three unique qualitative coverage dimensions`);
    } else {
      observation.dimensions.forEach((dimension) => coveredDimensions.add(dimension));
    }
    if (!SECTIONS.includes(observation.section)) err(`${at}.section is invalid`);
    if (!isText(observation.prose) || observation.prose.trim().length < 100
      || observation.prose.trim().length > 450) {
      err(`${at}.prose must contain 100–450 characters of actionable evidence`);
    }
    if (previousSource && !FREQUENCIES.includes(observation.frequency)) {
      err(`${at} historical qualitative observation must carry one fixed frequency`);
    }
    if (!Array.isArray(observation.support_files) || observation.support_files.length < 2
      || !observation.support_files.every(isText)
      || new Set(observation.support_files).size !== observation.support_files.length) {
      err(`${at}.support_files must contain at least two unique filenames`);
    }
    // Evidence is assembled below. A semantic stage that also writes figures creates
    // two sources of truth and recreates the failure this boundary removes.
    if (/\b\d+\s*\/\s*\d+\s+samples?\b/i.test(observation.prose)
      || /\bper\s+1[,.]?000\s+words?\b/i.test(observation.prose)
      || /\[measurement:[a-z0-9-]+\]/i.test(observation.prose)) {
      err(`${at}.prose duplicates deterministic evidence`);
    }
  }
  if (plan && Array.isArray(source.qualitative)
    && (source.qualitative.length < plan.qualitativeMin || source.qualitative.length > plan.qualitativeMax)) {
    err(`source.qualitative must contain ${plan.qualitativeMin}–${plan.qualitativeMax} entries for this measurement plan`);
  }
  const totalObservations = (isObject(source.measured) ? Object.keys(source.measured).length : 0)
    + (Array.isArray(source.qualitative) ? source.qualitative.length : 0);
  if (totalObservations < 10 || totalObservations > 14) {
    err("source must contain ten to fourteen measured and qualitative observations in total");
  }
  if (plan && isObject(source.unresolved)) {
    for (const dimension of plan.unresolvedDimensions) {
      if (!Object.hasOwn(source.unresolved, dimension)) err(`missing required unresolved dimension: ${dimension}`);
    }
    const allowedUnresolved = [...plan.qualitativeDimensions, ...plan.unresolvedDimensions];
    for (const dimension of Object.keys(source.unresolved)) {
      if (!allowedUnresolved.includes(dimension)) err(`unexpected unresolved dimension: ${dimension}`);
    }
  }
  for (const dimension of COVERAGE_DIMENSIONS) {
    const covered = coveredDimensions.has(dimension);
    const unresolved = isObject(source.unresolved) && Object.hasOwn(source.unresolved, dimension);
    if (covered === unresolved) {
      err(covered
        ? `${dimension} cannot be both observed and unresolved`
        : `missing coverage dimension: ${dimension}`);
    }
  }
  const semanticWords = [
    ...Object.values(isObject(source.measured) ? source.measured : {}),
    ...(Array.isArray(source.qualitative) ? source.qualitative : []),
  ].reduce((sum, observation) => sum
    + String(observation?.prose ?? "").trim().split(/\s+/).filter(Boolean).length,
    String(source.gaps ?? "").trim().split(/\s+/).filter(Boolean).length,
  );
  if (semanticWords > 900) err(`source semantic prose is ${semanticWords} words; maximum is 900`);
  return errors;
}

function evidenceLine({ support, of, frequency, measurement, citationFile, absence }) {
  const citation = ` Representative locked source: \`${citationFile}\`.`;
  if (!measurement) {
    const placement = FREQUENCIES.includes(frequency)
      ? frequency
      : "qualitative placement only; no within-piece rate inferred";
    return `_Evidence: ${support}/${of} samples; ${placement}.${citation}_`;
  }
  const rate = Number(measurement.per_1000_words).toFixed(2);
  const locator = measurement.counting_rule.match(/\[measurement:[a-z0-9-]+\]/)?.[0]
    ?? measurement.counting_rule;
  if (absence) {
    return `_Evidence: ${support}/${of} samples establish the absence or sparse exception. ${locator} Count: ${measurement.count} instances; ${rate} per 1,000 words.${citation}_`;
  }
  return `_Evidence: ${support}/${of} samples; ${frequency}. ${locator} Count: ${measurement.count} instances; ${rate} per 1,000 words.${citation}_`;
}

/**
 * Density words in measured prose are not evidence. Remove the three reserved presentation
 * bands from that prose before the deterministic evidence line supplies the measured band.
 * This is a bounded lexical normalization, not a semantic repair: it cannot create a habit,
 * support file, count, polarity, or placement instruction.
 */
function normalizeMeasuredDensityLanguage(prose) {
  return prose
    .replace(/\bonce\s+or\s+twice\s+per\s+piece\b/gi, "in its measured contexts")
    .replace(/\bseveral\s+times\s+per\s+piece\b/gi, "in its measured contexts")
    .replace(/\bthroughout\b/gi, "across the supported contexts")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Assemble one semantic source response into canonical voice-profile/2.
 * Returns all errors at once; it never repairs structure or guesses evidence.
 */
export function assembleVoiceProfile(source, context) {
  let duplicateSupportFilesRemoved = 0;
  if (isObject(source) && source.schema === SOURCE_SCHEMA_ID && Array.isArray(source.qualitative)) {
    source = {
      ...source,
      qualitative: source.qualitative.map((observation) => {
        if (!isObject(observation) || !Array.isArray(observation.support_files)) return observation;
        const uniqueSupport = [...new Set(observation.support_files)];
        duplicateSupportFilesRemoved += observation.support_files.length - uniqueSupport.length;
        return uniqueSupport.length === observation.support_files.length
          ? observation
          : { ...observation, support_files: uniqueSupport };
      }),
    };
  }
  // Strict structured-output transports require every object key. Optional
  // unresolved reasons therefore arrive as explicit nulls; the semantic source
  // contract remains sparse and the deterministic validator stays authoritative.
  if (isObject(source) && !Object.hasOwn(source, "refused") && isObject(source.unresolved)) {
    source = {
      ...source,
      unresolved: Object.fromEntries(
        Object.entries(source.unresolved).filter(([, reason]) => reason !== null),
      ),
    };
  }
  const errors = sourceErrors(source, context?.measurements);
  const profile = context?.profile;
  if (!isText(profile)) errors.push("context.profile must be non-empty");

  // Refusal is deliberately independent of corpus arithmetic. A thin, mixed, stale,
  // or oversized corpus must be able to stop before a measurement pass exists.
  if (Object.hasOwn(source ?? {}, "refused")) {
    if (!errors.length) {
      return { ok: true, refusal: true, errors: [], profile: {
        schema: PROFILE_SCHEMA_ID, profile, refused: source.refused.trim(),
      } };
    }
    return { ok: false, refusal: false, errors, profile: null };
  }

  const measurements = context?.measurements;
  const samplesUsed = context?.samples_used;
  const samplesExcluded = context?.samples_excluded ?? [];
  if (!Array.isArray(samplesUsed) || samplesUsed.length < 5 || !samplesUsed.every(isText)
    || new Set(samplesUsed).size !== samplesUsed.length) {
    errors.push("context.samples_used must contain at least five unique filenames");
  }
  if (!isObject(measurements) || !Number.isInteger(measurements.corpus_words)
    || measurements.corpus_words < 1
    || !Array.isArray(measurements.measurements)) {
    errors.push("context.measurements is invalid");
  }
  if (errors.length) return { ok: false, refusal: false, errors, profile: null };

  const sampleSet = new Set(samplesUsed);
  const measurementIds = new Set();
  for (const [index, row] of measurements.measurements.entries()) {
    const at = `context.measurements.measurements[${index}]`;
    if (!isObject(row) || !isText(row.id)) { errors.push(`${at} has no id`); continue; }
    if (measurementIds.has(row.id)) errors.push(`${at} duplicates measurement id ${row.id}`);
    measurementIds.add(row.id);
    if (!Number.isInteger(row.count) || row.count < 0) errors.push(`${at}.count must be a non-negative integer`);
    if (typeof row.per_1000_words !== "number" || !Number.isFinite(row.per_1000_words) || row.per_1000_words < 0) {
      errors.push(`${at}.per_1000_words must be a non-negative number`);
    } else if (Number.isInteger(row.count)) {
      const expected = Math.round((row.count / measurements.corpus_words) * 100000) / 100;
      if (Math.abs(row.per_1000_words - expected) > 0.001) errors.push(`${at} has invalid rate arithmetic`);
    }
    if (!isText(row.counting_rule) || !row.counting_rule.startsWith(`[measurement:${row.id}]`)) {
      errors.push(`${at}.counting_rule must begin with its stable measurement locator`);
    }
    for (const key of ["files_with", "files_without"]) {
      if (!Array.isArray(row[key]) || !row[key].every(isText) || new Set(row[key]).size !== row[key].length) {
        errors.push(`${at}.${key} must contain unique filenames`);
      } else {
        for (const file of row[key]) if (!sampleSet.has(file)) errors.push(`${at}.${key} names non-corpus file ${file}`);
      }
    }
    if (Array.isArray(row.files_with) && Array.isArray(row.files_without)) {
      const partition = new Set([...row.files_with, ...row.files_without]);
      if (partition.size !== sampleSet.size || [...sampleSet].some((file) => !partition.has(file))) {
        errors.push(`${at} does not partition the locked samples`);
      }
      if (row.files_with.some((file) => row.files_without.includes(file))) errors.push(`${at} file support overlaps absence support`);
      if (row.samples_with !== row.files_with.length || row.samples_without !== row.files_without.length) {
        errors.push(`${at} sample counts disagree with file support`);
      }
      if (row.count === 0 && row.files_with.length !== 0) errors.push(`${at} claims positive file support for a zero count`);
      if (row.count > 0 && (row.files_with.length === 0 || row.count < row.files_with.length)) {
        errors.push(`${at} count cannot support its positive files`);
      }
    }
  }
  if (errors.length) return { ok: false, refusal: false, errors, profile: null };

  const byMeasurement = new Map(measurements.measurements.map((row) => [row.id, row]));
  const replacementFor = (measurementId) => (ABSENCE_REPLACEMENTS[measurementId] ?? [])
    .map((id) => byMeasurement.get(id))
    .find((row) => row?.count > 0);
  const observations = [];
  const proseBySection = new Map(SECTIONS.map((section) => [section, []]));
  const usedMeasurementIds = new Set();
  const observationByMeasurement = new Map();
  const measurementByObservation = new Map();
  const idsByDimension = new Map(COVERAGE_DIMENSIONS.map((dimension) => [dimension, []]));
  const positiveRatedByDimension = new Map(COVERAGE_DIMENSIONS.map((dimension) => [dimension, []]));
  const absenceRatedByDimension = new Map(COVERAGE_DIMENSIONS.map((dimension) => [dimension, []]));
  const measurementPlan = sourceMeasurementPlan(measurements);
  const sourceItems = [
    ...measurementPlan.measured.map((slot) => ({
      measurement_id: slot.id,
      dimensions: slot.dimensions,
      section: slot.section,
      prose: source.measured[slot.id].prose,
    })),
    ...source.qualitative,
  ];

  for (const [index, item] of sourceItems.entries()) {
    const at = `observations[${index}]`;
    let measurement = null;
    let supportFiles;
    let absence = false;
    if (item.measurement_id) {
      measurement = byMeasurement.get(item.measurement_id);
      if (!measurement) { errors.push(`${at} names unknown measurement ${item.measurement_id}`); continue; }
      if (usedMeasurementIds.has(item.measurement_id)) {
        errors.push(`${at} reuses measurement ${item.measurement_id}; one measured claim has one canonical observation`);
        continue;
      }
      usedMeasurementIds.add(item.measurement_id);
      const replacement = replacementFor(item.measurement_id);
      // Polarity is arithmetic, not a semantic side channel. Zero and genuinely
      // sparse counterparts are absences; every other measured row is positive.
      absence = measurement.count === 0
        || Boolean(replacement && measurement.count <= replacement.count * 0.2);
      supportFiles = absence ? [...(measurement.files_without ?? [])] : [...(measurement.files_with ?? [])];
      if (!absence && measurement.samples_with !== supportFiles.length) {
        errors.push(`${at} measurement ${item.measurement_id} has inconsistent file support`);
      }
    } else {
      supportFiles = [...item.support_files];
    }
    for (const file of supportFiles) if (!sampleSet.has(file)) errors.push(`${at} names non-corpus support file ${file}`);
    if (supportFiles.length === 0) errors.push(`${at} has no positive support`);

    const frequency = measurement && !absence
      ? frequencyForPerPiece(measurement.count / samplesUsed.length)
      : source.schema === PREVIOUS_SOURCE_SCHEMA_ID ? item.frequency : null;
    if (measurement && !absence && !FREQUENCIES.includes(frequency)) {
      errors.push(`${at} measured positive must carry one fixed frequency`);
    }

    const id = `o${String(observations.length + 1).padStart(2, "0")}`;
    const observation = {
      id, section: item.section, support: supportFiles.length, of: samplesUsed.length,
    };
    if (measurement) observation.rate = {
      count: measurement.count,
      per_1000_words: measurement.per_1000_words,
      counting_rule: measurement.counting_rule,
    };
    observations.push(observation);
    if (measurement && !absence) observationByMeasurement.set(item.measurement_id, id);
    if (measurement) measurementByObservation.set(id, item.measurement_id);
    for (const dimension of item.dimensions) {
      idsByDimension.get(dimension).push(id);
      if (absence) absenceRatedByDimension.get(dimension).push(id);
      else if (measurement) positiveRatedByDimension.get(dimension).push(id);
    }
    const labels = item.dimensions.map((dimension) => DIMENSION_LABELS[dimension]).join("; ");
    const prose = measurement ? normalizeMeasuredDensityLanguage(item.prose.trim()) : item.prose.trim();
    proseBySection.get(item.section).push([
      `**${labels}.** ${prose}`,
      evidenceLine({
        support: supportFiles.length, of: samplesUsed.length,
        frequency, measurement, absence,
        citationFile: supportFiles[0],
      }),
    ].join("\n"));
  }

  const coverage = [];
  for (const dimension of COVERAGE_DIMENSIONS) {
    if (Object.hasOwn(source.unresolved, dimension)) {
      coverage.push({ dimension, status: "unresolved", unresolved_reason: source.unresolved[dimension].trim() });
      continue;
    }
    const ids = [...idsByDimension.get(dimension)];
    const positiveRated = positiveRatedByDimension.get(dimension);
    const absenceRated = absenceRatedByDimension.get(dimension);
    if (absenceRated.length) {
      const absenceId = absenceRated[0];
      const absenceMeasurementId = measurementByObservation.get(absenceId);
      const allowedReplacementIds = ABSENCE_REPLACEMENTS[absenceMeasurementId] ?? [];
      const positiveId = positiveRated.find((id) => allowedReplacementIds.includes(measurementByObservation.get(id)))
        ?? allowedReplacementIds.map((measurementId) => observationByMeasurement.get(measurementId)).find(Boolean);
      if (absenceRated.length !== 1 || !positiveId) {
        errors.push(`${dimension} has a counted absence but not exactly one absence plus a positive measured replacement`);
      } else {
        const absenceMeasurement = byMeasurement.get(absenceMeasurementId);
        const positiveMeasurement = byMeasurement.get(measurementByObservation.get(positiveId));
        if (absenceMeasurement.count > positiveMeasurement.count * 0.2) {
          errors.push(`${dimension} sparse counterpart count ${absenceMeasurement.count} exceeds one-fifth of replacement count ${positiveMeasurement.count}`);
        }
        if (!ids.includes(positiveId)) ids.unshift(positiveId);
        coverage.push({
          dimension, status: "absent-paired", observation_ids: ids,
          positive_observation_id: positiveId, absence_observation_id: absenceId,
        });
      }
    } else if (positiveRated.length) {
      coverage.push({ dimension, status: "rated", observation_ids: ids });
    } else {
      coverage.push({ dimension, status: "described", observation_ids: ids });
    }
  }

  if (coverage.length !== COVERAGE_DIMENSIONS.length) {
    errors.push("assembly did not produce all ten coverage rows");
  }
  if (errors.length) return { ok: false, refusal: false, errors, profile: null };

  const blocks = [`# Voice profile — ${profile}`];
  for (const section of SECTIONS) {
    const observations = proseBySection.get(section);
    const empty = section === "absences"
      ? "No counted absence with a positive measured replacement was established. Do not infer a prohibition from silence."
      : "No independently supported instruction was established for this section.";
    blocks.push(SECTION_HEADINGS[section], ...(observations.length ? observations : [empty]));
  }
  const unresolvedBlocks = coverage
    .filter((row) => row.status === "unresolved")
    .map((row) => `**${DIMENSION_LABELS[row.dimension]} — unresolved.** ${row.unresolved_reason}`);
  blocks.push(
    "## 8. What this profile could not determine",
    ...unresolvedBlocks,
    source.gaps.trim(),
    `_Observations dropped: ${source.observations_dropped}. Voice card: ${source.voice_card}._`,
  );
  const profileMarkdown = blocks.join("\n\n");
  const profileWords = profileMarkdown.trim().split(/\s+/).filter(Boolean).length;
  if (profileWords < 800 || profileWords > 1500) {
    return {
      ok: false, refusal: false,
      errors: [`assembled profile is ${profileWords} words; required range is 800–1500`],
      profile: null,
    };
  }
  const assembled = {
    schema: PROFILE_SCHEMA_ID,
    profile,
    profile_markdown: profileMarkdown,
    confidence: samplesUsed.length >= 10 ? "full" : "thin",
    corpus_words: measurements.corpus_words,
    samples_used: [...samplesUsed],
    samples_excluded: samplesExcluded,
    voice_card: source.voice_card,
    observations,
    coverage,
    observations_dropped: source.observations_dropped,
    multiple_voices_suspected: source.multiple_voices_suspected,
  };
  return {
    ok: true, refusal: false, errors: [], profile: assembled,
    normalizations: { duplicate_support_files_removed: duplicateSupportFilesRemoved },
  };
}

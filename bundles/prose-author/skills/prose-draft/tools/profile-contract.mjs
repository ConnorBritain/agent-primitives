#!/usr/bin/env node
/**
 * Portable contract between the semantic voice renderer and canonical voice-profile/2.
 *
 * A language model decides what the corpus says. This module owns everything mechanical:
 * support arithmetic, measurement copying, observation ids, coverage statuses, absence
 * pairing, and the evidence lines embedded in the prose. Claude may enforce SOURCE_SCHEMA
 * while decoding; Codex and other harnesses may write ordinary JSON and call assemble.
 */

export const SOURCE_SCHEMA_ID = "voice-profile-source/1";
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

const observationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    section: { enum: SECTIONS },
    prose: { type: "string", minLength: 100, maxLength: 450 },
    frequency: { enum: FREQUENCIES },
    measurement_id: { type: "string", minLength: 1 },
    support_files: {
      type: "array", minItems: 1, uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
  },
  required: ["section", "prose"],
  oneOf: [
    {
      required: ["measurement_id"],
      not: { anyOf: [{ required: ["support_files"] }, { required: ["frequency"] }] },
    },
    {
      required: ["support_files", "frequency"],
      not: { required: ["measurement_id"] },
    },
  ],
};

const dimensionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    observations: { type: "array", minItems: 1, maxItems: 5, items: { $ref: "#/$defs/observation" } },
    unresolved_reason: { type: "string", minLength: 20, maxLength: 500 },
  },
  oneOf: [{ required: ["observations"] }, { required: ["unresolved_reason"] }],
};

/** Render-only schema for providers whose structured-output decoder cannot express unions. */
export const SOURCE_RENDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  $defs: { observation: observationSchema, dimension: dimensionSchema },
  properties: {
    schema: { const: SOURCE_SCHEMA_ID },
    voice_card: { enum: ["empty", "corroborating", "contradicted"] },
    dimensions: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(COVERAGE_DIMENSIONS.map((id) => [id, { $ref: "#/$defs/dimension" }])),
      required: COVERAGE_DIMENSIONS,
    },
    gaps: { type: "string", minLength: 40, maxLength: 900 },
    observations_dropped: { type: "integer", minimum: 0 },
    multiple_voices_suspected: { type: "boolean" },
  },
  required: [
    "schema", "voice_card", "dimensions", "gaps", "observations_dropped",
    "multiple_voices_suspected",
  ],
};

export const SOURCE_REFUSAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { const: SOURCE_SCHEMA_ID },
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

function sourceErrors(source) {
  const errors = [];
  const err = (message) => errors.push(message);
  if (!isObject(source)) return ["source is not an object"];
  if (source.schema !== SOURCE_SCHEMA_ID) err(`source.schema must be ${SOURCE_SCHEMA_ID}`);
  for (const key of exactKeys(source, [
    "schema", "voice_card", "dimensions", "gaps", "observations_dropped",
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
  if (!isObject(source.dimensions)) return [...errors, "source.dimensions must be an object"];
  for (const extra of exactKeys(source.dimensions, COVERAGE_DIMENSIONS)) {
    err(`unknown coverage dimension: ${extra}`);
  }
  for (const dimension of COVERAGE_DIMENSIONS) {
    const row = source.dimensions[dimension];
    if (!isObject(row)) { err(`missing coverage dimension: ${dimension}`); continue; }
    const hasObservations = Array.isArray(row.observations);
    const hasUnresolved = isText(row.unresolved_reason);
    if (hasObservations === hasUnresolved) {
      err(`${dimension} must carry observations or unresolved_reason, exclusively`);
      continue;
    }
    if (hasUnresolved && (row.unresolved_reason.trim().length < 20
      || row.unresolved_reason.trim().length > 500)) {
      err(`${dimension}.unresolved_reason must contain 20–500 characters`);
    }
    for (const extra of exactKeys(row, ["observations", "unresolved_reason"])) {
      err(`${dimension} carries unknown key: ${extra}`);
    }
    if (!hasObservations) continue;
    if (row.observations.length === 0 || row.observations.length > 5) {
      err(`${dimension}.observations must contain one to five entries`);
    }
    for (const [i, observation] of row.observations.entries()) {
      const at = `${dimension}.observations[${i}]`;
      if (!isObject(observation)) { err(`${at} is not an object`); continue; }
      for (const extra of exactKeys(observation, [
        "section", "prose", "frequency", "measurement_id", "support_files",
      ])) err(`${at} carries unknown key: ${extra}`);
      if (!SECTIONS.includes(observation.section)) err(`${at}.section is invalid`);
      if (!isText(observation.prose) || observation.prose.trim().length < 100
        || observation.prose.trim().length > 450) {
        err(`${at}.prose must contain 100–450 characters of actionable evidence`);
      }
      if (observation.frequency !== undefined && !FREQUENCIES.includes(observation.frequency)) {
        err(`${at}.frequency is invalid`);
      }
      const measured = isText(observation.measurement_id);
      const qualitative = Array.isArray(observation.support_files);
      if (measured === qualitative) err(`${at} must carry measurement_id or support_files, exclusively`);
      if (measured && observation.frequency !== undefined) {
        err(`${at} is measured and must omit frequency; the assembler derives its fixed band`);
      }
      if (measured && FREQUENCIES.some((phrase) => new RegExp(`\\b${phrase.replace(/ /g, "\\s+")}\\b`, "i")
        .test(observation.prose))) {
        err(`${at} is measured and must leave fixed frequency wording to the assembler`);
      }
      if (qualitative && !FREQUENCIES.includes(observation.frequency)) {
        err(`${at} is qualitative and must carry one fixed frequency`);
      }
      if (qualitative && (observation.support_files.length === 0
        || !observation.support_files.every(isText)
        || new Set(observation.support_files).size !== observation.support_files.length)) {
        err(`${at}.support_files must contain unique filenames`);
      }
      // Evidence is assembled below. A semantic stage that also writes figures creates
      // two sources of truth and recreates the failure this boundary removes.
      if (/\b\d+\s*\/\s*\d+\s+samples?\b/i.test(observation.prose)
        || /\bper\s+1[,.]?000\s+words?\b/i.test(observation.prose)
        || /\[measurement:[a-z0-9-]+\]/i.test(observation.prose)) {
        err(`${at}.prose duplicates deterministic evidence`);
      }
    }
  }
  const observationCount = COVERAGE_DIMENSIONS.reduce(
    (sum, dimension) => sum + (source.dimensions?.[dimension]?.observations?.length ?? 0), 0,
  );
  if (observationCount > 14) err("source may contain at most 14 observations");
  const semanticWords = COVERAGE_DIMENSIONS.reduce(
    (sum, dimension) => sum + (source.dimensions?.[dimension]?.observations ?? [])
      .reduce((words, observation) => words
        + String(observation?.prose ?? "").trim().split(/\s+/).filter(Boolean).length, 0),
    String(source.gaps ?? "").trim().split(/\s+/).filter(Boolean).length,
  );
  if (semanticWords > 900) err(`source semantic prose is ${semanticWords} words; maximum is 900`);
  return errors;
}

function evidenceLine({ support, of, frequency, measurement, citationFile, absence }) {
  const citation = ` Representative locked source: \`${citationFile}\`.`;
  if (!measurement) return `_Evidence: ${support}/${of} samples; ${frequency}.${citation}_`;
  const rate = Number(measurement.per_1000_words).toFixed(2);
  const locator = measurement.counting_rule.match(/\[measurement:[a-z0-9-]+\]/)?.[0]
    ?? measurement.counting_rule;
  if (absence) {
    return `_Evidence: ${support}/${of} samples establish the absence or sparse exception. ${locator} Count: ${measurement.count} instances; ${rate} per 1,000 words.${citation}_`;
  }
  return `_Evidence: ${support}/${of} samples; ${frequency}. ${locator} Count: ${measurement.count} instances; ${rate} per 1,000 words.${citation}_`;
}

/**
 * Assemble one semantic source response into canonical voice-profile/2.
 * Returns all errors at once; it never repairs or guesses.
 */
export function assembleVoiceProfile(source, context) {
  const errors = sourceErrors(source);
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
  const coverage = [];
  const proseBySection = new Map(SECTIONS.map((section) => [section, []]));
  const usedMeasurementIds = new Set();
  const observationByMeasurement = new Map();
  const measurementByObservation = new Map();

  for (const dimension of COVERAGE_DIMENSIONS) {
    const sourceRow = source.dimensions[dimension];
    if (sourceRow.unresolved_reason) {
      coverage.push({ dimension, status: "unresolved", unresolved_reason: sourceRow.unresolved_reason.trim() });
      continue;
    }

    const ids = [];
    const positiveRated = [];
    const absenceRated = [];
    for (const [index, item] of sourceRow.observations.entries()) {
      const at = `${dimension}.observations[${index}]`;
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
        // Polarity is arithmetic, not a side channel encoded by whether the model
        // happened to emit `frequency`. Zero and genuinely sparse counterparts are
        // absences; every other measured row is positive.
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
        : item.frequency;
      if (!absence && !FREQUENCIES.includes(frequency)) {
        errors.push(`${at} must carry one fixed frequency`);
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
      ids.push(id);
      if (absence) absenceRated.push(id);
      else if (measurement) positiveRated.push(id);
      proseBySection.get(item.section).push([
        `**${DIMENSION_LABELS[dimension]}.** ${item.prose.trim()}`,
        evidenceLine({
          support: supportFiles.length, of: samplesUsed.length,
          frequency, measurement, absence,
          citationFile: supportFiles[0],
        }),
      ].join("\n"));
    }

    if (absenceRated.length) {
      const absenceItem = sourceRow.observations.find((item) => {
        if (!item.measurement_id) return false;
        const measured = byMeasurement.get(item.measurement_id);
        const replacement = replacementFor(item.measurement_id);
        return measured?.count === 0
          || Boolean(replacement && measured.count <= replacement.count * 0.2);
      });
      const allowedReplacementIds = ABSENCE_REPLACEMENTS[absenceItem?.measurement_id] ?? [];
      const positiveId = positiveRated.find((id) => allowedReplacementIds.includes(measurementByObservation.get(id)))
        ?? allowedReplacementIds.map((measurementId) => observationByMeasurement.get(measurementId)).find(Boolean);
      if (absenceRated.length !== 1 || !positiveId) {
        errors.push(`${dimension} has a counted absence but not exactly one absence plus a positive measured replacement`);
      } else {
        const absenceMeasurement = byMeasurement.get(absenceItem.measurement_id);
        const positiveMeasurement = byMeasurement.get(measurementByObservation.get(positiveId));
        if (absenceMeasurement.count > positiveMeasurement.count * 0.2) {
          errors.push(`${dimension} sparse counterpart count ${absenceMeasurement.count} exceeds one-fifth of replacement count ${positiveMeasurement.count}`);
        }
        if (!ids.includes(positiveId)) ids.unshift(positiveId);
        coverage.push({
          dimension, status: "absent-paired", observation_ids: ids,
          positive_observation_id: positiveId, absence_observation_id: absenceRated[0],
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
  return { ok: true, refusal: false, errors: [], profile: assembled };
}

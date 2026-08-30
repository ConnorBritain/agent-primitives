#!/usr/bin/env node
/** Deterministic post-draft measurement for one mandatory conformance revision. */

import { PROFILE_MEASUREMENT_RULES } from "./profile-measure.mjs";
import { COVERAGE_DIMENSIONS } from "./profile-contract.mjs";
import { normalizeVoiceDraftSource } from "./draft-contract.mjs";

export const CONFORMANCE_REPORT_SCHEMA_ID = "voice-draft-conformance-report/1";
export const CONFORMANCE_PATCH_SCHEMA_ID = "voice-draft-conformance-patch/1";
export const MAX_CONFORMANCE_EDITS = 12;
export const MAX_WORD_GROWTH_RATIO = 0.03;
export const MAX_WORD_GROWTH_ABSOLUTE = 12;
export const MAX_REPLACED_WORD_RATIO = 0.20;
export const MIN_REPLACED_WORD_ALLOWANCE = 24;
export const MAX_REPLACED_WORD_ALLOWANCE = 120;
export const CONFORMANCE_MEASUREMENT_IDS = PROFILE_MEASUREMENT_RULES.map((rule) => rule.id);

const omissionEntry = {
  type: "object", additionalProperties: false,
  properties: { habit: { type: "string", minLength: 1 }, why: { type: "string", minLength: 1 } },
  required: ["habit", "why"],
};

export const CONFORMANCE_PATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { type: "string", const: CONFORMANCE_PATCH_SCHEMA_ID },
    edits: {
      type: "array", maxItems: MAX_CONFORMANCE_EDITS,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          before: { type: "string", minLength: 1, maxLength: 4000 },
          after: { type: "string", maxLength: 4000 },
          reason: { type: "string", minLength: 1, maxLength: 500 },
          coverage_dimensions: {
            type: "array", minItems: 1, maxItems: 10,
            items: { type: "string", enum: COVERAGE_DIMENSIONS },
          },
          measurement_ids: {
            type: "array", minItems: 1, maxItems: 10,
            items: { type: "string", enum: CONFORMANCE_MEASUREMENT_IDS },
          },
        },
        required: ["before", "after", "reason", "coverage_dimensions", "measurement_ids"],
      },
    },
    coverage: {
      type: "array", minItems: 10, maxItems: 10,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          dimension: { type: "string", enum: COVERAGE_DIMENSIONS },
          observation_ids: {
            type: "array", maxItems: 20,
            items: { type: "string", minLength: 1 },
          },
          disposition: { type: "string", enum: ["preserved", "revised", "omitted", "unresolved"] },
          reason: { type: "string", minLength: 1, maxLength: 500 },
        },
        required: ["dimension", "observation_ids", "disposition", "reason"],
      },
    },
    omitted: { type: "array", maxItems: 50, items: omissionEntry },
  },
  required: ["schema", "edits", "coverage", "omitted"],
};

const rules = new Map(PROFILE_MEASUREMENT_RULES.map((rule) => [rule.id, rule]));

function countMatches(text, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...String(text ?? "").matchAll(new RegExp(pattern.source, flags))].length;
}

function locatedMatches(text, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...String(text ?? "").matchAll(new RegExp(pattern.source, flags))].map((match, index) => {
    const start = match.index;
    const before = text.slice(0, start);
    const breaks = [...before.matchAll(/\n\s*\n/g)];
    const lastBreak = breaks.at(-1);
    const paragraphStart = lastBreak ? lastBreak.index + lastBreak[0].length : 0;
    const paragraphEndMatch = /\n\s*\n/.exec(text.slice(start));
    const paragraphEnd = paragraphEndMatch ? start + paragraphEndMatch.index : text.length;
    const contextStart = Math.max(paragraphStart, start - 45);
    const contextEnd = Math.min(paragraphEnd, start + match[0].length + 45);
    return {
      ordinal: index + 1,
      text: match[0],
      start,
      end: start + match[0].length,
      paragraph: breaks.length + 1,
      offset_in_paragraph: start - paragraphStart,
      context: `${text.slice(contextStart, start)}⟦${match[0]}⟧${text.slice(start + match[0].length, contextEnd)}`,
    };
  });
}

export function measureDraftConformance(draft, card) {
  if (typeof draft !== "string" || card?.schema !== "voice-draft-target-card/1"
    || !Array.isArray(card.measurements)) {
    throw new TypeError("draft conformance requires prose and a deterministic target card");
  }
  const measurements = card.measurements.map((target) => {
    const rule = rules.get(target.measurement_id);
    if (!rule) throw new TypeError(`no deterministic counter for ${target.measurement_id}`);
    const actual = countMatches(draft, rule.pattern);
    const hasRange = Number.isInteger(target.gate_minimum) && Number.isInteger(target.gate_maximum);
    const pass = !hasRange || (actual >= target.gate_minimum && actual <= target.gate_maximum);
    const status = pass ? "in-range" : actual < target.gate_minimum ? "deficit" : "excess";
    const correction = status === "in-range" ? {
      action: "preserve", minimum_change: 0, change_to_aim: 0,
    } : status === "deficit" ? {
      action: "add-or-recast", minimum_change: target.gate_minimum - actual,
      change_to_aim: Math.max(target.aim_count - actual, target.gate_minimum - actual),
    } : {
      action: "remove-or-recast", minimum_change: actual - target.gate_maximum,
      change_to_aim: Math.max(actual - target.aim_count, actual - target.gate_maximum),
    };
    return {
      measurement_id: target.measurement_id,
      observation_id: target.observation_id,
      dimensions: target.dimensions,
      aim_count: target.aim_count ?? null,
      minimum: target.gate_minimum ?? null,
      maximum: target.gate_maximum ?? null,
      actual_count: actual,
      status,
      correction,
      occurrences: status === "excess" ? locatedMatches(draft, rule.pattern) : [],
    };
  });
  return {
    schema: CONFORMANCE_REPORT_SCHEMA_ID,
    draft_words: draft.trim() ? draft.trim().split(/\s+/).length : 0,
    measurements,
    pass: measurements.every((row) => row.status === "in-range"),
  };
}

export function renderDraftConformanceReport(report) {
  if (report?.schema !== CONFORMANCE_REPORT_SCHEMA_ID || !Array.isArray(report.measurements)) {
    throw new TypeError("invalid draft conformance report");
  }
  const lines = [
    "## Deterministic conformance report for the initial draft",
    "",
    `Measured draft length: ${report.draft_words} words.`,
  ];
  for (const row of report.measurements) {
    const correction = row.status === "in-range"
      ? "preserve this range"
      : `${row.correction.action} at least ${row.correction.minimum_change}; ${row.correction.change_to_aim} reaches the center aim`;
    lines.push(`- ${row.observation_id} [measurement:${row.measurement_id}]: actual ${row.actual_count}; aim ${row.aim_count}; range ${row.minimum}–${row.maximum}; ${row.status}; ${correction}.`);
    for (const occurrence of row.occurrences) {
      lines.push(`  - match ${occurrence.ordinal}: paragraph ${occurrence.paragraph}, offset ${occurrence.offset_in_paragraph}, absolute ${occurrence.start}–${occurrence.end}, text ${JSON.stringify(occurrence.text)}, context ${JSON.stringify(occurrence.context)}`);
    }
  }
  lines.push("", report.pass
    ? "Every measured row is in range. The mandatory patch must preserve that result."
    : "The final patched source must repair every deficit or excess and keep every other row in range.");
  return lines.join("\n");
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const exactKeys = (value, keys) => isObject(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const sameArray = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const words = (value) => String(value ?? "").trim().split(/\s+/).filter(Boolean).length;

function requiredCountRange(row) {
  if (row.status === "deficit") return [row.minimum, row.minimum];
  if (row.status === "excess") return [row.maximum, row.maximum];
  if (Number.isInteger(row.minimum) && Number.isInteger(row.maximum)) {
    return [row.minimum, row.maximum];
  }
  return [row.actual_count, row.actual_count];
}

function minimumCoupledContractionChanges(report) {
  const byMeasurement = new Map(
    report.measurements.map((row) => [row.measurement_id, row]),
  );
  const contraction = byMeasurement.get("contractions");
  const negative = byMeasurement.get("uncontracted-negatives");
  const failing = [contraction, negative].filter((row) => row && row.status !== "in-range");
  if (failing.length === 0) return 0;
  if (!contraction || !negative) {
    return Math.max(...failing.map((row) => row.correction.minimum_change));
  }

  const [contractionMinimum, contractionMaximum] = requiredCountRange(contraction);
  const [negativeMinimum, negativeMaximum] = requiredCountRange(negative);
  let minimum = Number.POSITIVE_INFINITY;
  for (let finalContractions = contractionMinimum;
    finalContractions <= contractionMaximum; finalContractions += 1) {
    for (let finalNegatives = negativeMinimum;
      finalNegatives <= negativeMaximum; finalNegatives += 1) {
      const contractionDelta = finalContractions - contraction.actual_count;
      const negativeDelta = finalNegatives - negative.actual_count;
      // Expanding or contracting a negative changes these counters in opposite
      // directions. The remaining contraction delta must come from a positive
      // auxiliary. Their absolute transition counts therefore add; treating the
      // rows independently undercounts when both must rise or both must fall.
      const changes = Math.abs(negativeDelta)
        + Math.abs(contractionDelta + negativeDelta);
      minimum = Math.min(minimum, changes);
    }
  }
  return minimum;
}

function expandMeasuredContractions(value) {
  const preserveCase = (source, replacement) => {
    if (source === source.toUpperCase()) return replacement.toUpperCase();
    if (/^[A-Z]/.test(source)) return `${replacement[0].toUpperCase()}${replacement.slice(1)}`;
    return replacement;
  };
  return String(value ?? "")
    .replace(/\bwon['’]t\b/gi, (match) => preserveCase(match, "will not"))
    .replace(/\bcan['’]t\b/gi, (match) => preserveCase(match, "cannot"))
    .replace(/\bshan['’]t\b/gi, (match) => preserveCase(match, "shall not"))
    .replace(/\b([A-Za-z]+)n['’]t\b/gi, (match, host) =>
      /^ai$/i.test(host) ? match : `${host} not`)
    .replace(/\b([A-Za-z]+)['’]re\b/gi, "$1 are")
    .replace(/\b([A-Za-z]+)['’]ve\b/gi, "$1 have")
    .replace(/\b([A-Za-z]+)['’]ll\b/gi, "$1 will")
    .replace(/\b([A-Za-z]+)['’]m\b/gi, "$1 am")
    .replace(/\b(let)['’]s\b/gi, "$1 us");
}

const AMBIGUOUS_S_HOSTS = "it|that|there|here|who|what|where|when|how|why|he|she|one|nothing|everything|something|somebody|nobody|this";
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function contractedFormAt(value, index) {
  if (index > 0 && /[A-Za-z0-9_]/.test(value[index - 1])) return null;
  const source = value.slice(index);
  const preserveCase = (match, replacement) => {
    if (match === match.toUpperCase()) return replacement.toUpperCase();
    if (/^[A-Z]/.test(match)) return `${replacement[0].toUpperCase()}${replacement.slice(1)}`;
    return replacement;
  };
  let match = /^(won['’]t)\b/i.exec(source);
  if (match) return { raw: match[0], expansions: [preserveCase(match[0], "will not")] };
  match = /^(can['’]t)\b/i.exec(source);
  if (match) return { raw: match[0], expansions: [preserveCase(match[0], "cannot")] };
  match = /^(shan['’]t)\b/i.exec(source);
  if (match) return { raw: match[0], expansions: [preserveCase(match[0], "shall not")] };
  match = /^([A-Za-z]+)n['’]t\b/i.exec(source);
  if (match && !/^ai$/i.test(match[1])) {
    return { raw: match[0], expansions: [`${match[1]} not`] };
  }
  for (const [suffix, auxiliary] of [["re", "are"], ["ve", "have"], ["ll", "will"], ["m", "am"]]) {
    match = new RegExp(`^([A-Za-z]+)['’]${suffix}\\b`, "i").exec(source);
    if (match) return { raw: match[0], expansions: [`${match[1]} ${auxiliary}`] };
  }
  match = /^(let)['’]s\b/i.exec(source);
  if (match) return { raw: match[0], expansions: [`${match[1]} us`] };
  match = /^([A-Za-z]+)['’]d\b/i.exec(source);
  if (match) {
    const auxiliaries = match[0] === match[0].toUpperCase() ? ["HAD", "WOULD"] : ["had", "would"];
    return { raw: match[0], expansions: auxiliaries.map((word) => `${match[1]} ${word}`) };
  }
  match = new RegExp(`^(${AMBIGUOUS_S_HOSTS})['’]s\\b`, "i").exec(source);
  if (match) {
    const auxiliaries = match[0] === match[0].toUpperCase() ? ["IS", "HAS"] : ["is", "has"];
    return { raw: match[0], expansions: auxiliaries.map((word) => `${match[1]} ${word}`) };
  }
  return null;
}

function exactWholePhraseAt(value, index, phrase) {
  if (index > 0 && /[A-Za-z0-9_]/.test(value[index - 1])) return false;
  if (!value.startsWith(phrase, index)) return false;
  const end = index + phrase.length;
  return end === value.length || !/[A-Za-z0-9_]/.test(value[end]);
}

// Count surface-form transformations, not their net whitespace effect. `cannot` →
// `can't` changes zero whitespace words while `does not` → `doesn't` changes one;
// both are one contraction correction. The acyclic matcher also catches an added and
// removed contraction that cancel in the aggregate counter, without enumerating every
// ambiguous 'd/'s expansion combination.
export function contractionFormChangeCount(beforeValue, afterValue) {
  const before = String(beforeValue ?? "");
  const after = String(afterValue ?? "");
  const memo = new Map();
  const visit = (left, right) => {
    const key = `${left}:${right}`;
    if (memo.has(key)) return memo.get(key);
    if (left === before.length && right === after.length) return 0;
    let best = Number.POSITIVE_INFINITY;
    if (left < before.length && right < after.length && before[left] === after[right]) {
      const continuation = visit(left + 1, right + 1);
      if (Number.isInteger(continuation)) best = continuation;
    }
    const beforeContracted = contractedFormAt(before, left);
    const afterContracted = contractedFormAt(after, right);
    if (beforeContracted) {
      for (const expansion of beforeContracted.expansions) {
        if (!exactWholePhraseAt(after, right, expansion)) continue;
        const continuation = visit(left + beforeContracted.raw.length, right + expansion.length);
        if (Number.isInteger(continuation)) best = Math.min(best, 1 + continuation);
      }
    }
    if (afterContracted) {
      for (const expansion of afterContracted.expansions) {
        if (!exactWholePhraseAt(before, left, expansion)) continue;
        const continuation = visit(left + expansion.length, right + afterContracted.raw.length);
        if (Number.isInteger(continuation)) best = Math.min(best, 1 + continuation);
      }
    }
    // Identical contracted spellings advance through the exact-character path above.
    // Do not equate two different contracted surfaces merely because they share one
    // expansion: that would let an extra apostrophe rewrite or a malformed alias such
    // as won't → willn't hitchhike beside one required correction at zero cost.
    const result = Number.isFinite(best) ? best : null;
    memo.set(key, result);
    return result;
  };
  return visit(0, 0);
}

function ambiguousContractionPattern(value) {
  const pattern = new RegExp(`\\b([A-Za-z]+)(['’])d\\b|\\b(${AMBIGUOUS_S_HOSTS})(['’])s\\b`, "gi");
  let source = "";
  let offset = 0;
  for (const match of value.matchAll(pattern)) {
    source += escapeRegex(value.slice(offset, match.index));
    const host = match[1] ?? match[3];
    const suffix = match[1] ? "d" : "s";
    const upper = match[0] === match[0].toUpperCase();
    const expansions = (suffix === "d" ? ["had", "would"] : ["is", "has"])
      .map((word) => upper ? word.toUpperCase() : word);
    source += `(?:${escapeRegex(match[0])}|${escapeRegex(host)} (?:${expansions.join("|")}))`;
    offset = match.index + match[0].length;
  }
  source += escapeRegex(value.slice(offset));
  return new RegExp(`^${source}$`, "u");
}

function normalizeNamedPunctuation(value, ids) {
  // Preserve every code point and line ending that is not one of the explicitly
  // named measurement forms. This exact patch stage may not normalize unnamed
  // source bytes, even when that normalization is semantically harmless.
  let normalized = String(value ?? "");
  // One ordinary space may move around a named mark because inserting or removing
  // that mark necessarily changes its immediate separator. Tabs, repeated spaces,
  // indentation, trailing hard-break spaces, and all other whitespace remain exact.
  const sequence = (mark) => `(?:${mark} ?)+`;
  const betweenWords = (mark) => new RegExp(`(\\S) ?${sequence(mark)}(?=\\S)`, "g");
  const beforePunctuation = (mark) => new RegExp(`(\\S) ?${sequence(mark)}(?=[.,;:!?])`, "g");
  const beforeLineEnd = (mark) => new RegExp(`(\\S) ?${sequence(mark)}(?=$|\\n)`, "gm");
  const removeNamedMark = (mark) => {
    normalized = normalized
      .replace(beforePunctuation(mark), "$1")
      .replace(beforeLineEnd(mark), "$1")
      .replace(betweenWords(mark), "$1 ");
  };
  if (ids.has("round-parenthetical-spans")) {
    removeNamedMark("\\(");
    removeNamedMark("\\)");
  }
  if (ids.has("em-dashes")) removeNamedMark("—");
  if (ids.has("en-dashes")) removeNamedMark("–");
  return normalized;
}

function measurementEditSkeleton(value, measurementIds) {
  const ids = new Set(measurementIds);
  const expanded = ids.has("contractions") || ids.has("uncontracted-negatives")
    ? expandMeasuredContractions(value)
    : String(value ?? "");
  return normalizeNamedPunctuation(expanded, ids);
}

function measurementEditEquivalent(before, after, measurementIds) {
  const beforeSkeleton = measurementEditSkeleton(before, measurementIds);
  const afterSkeleton = measurementEditSkeleton(after, measurementIds);
  if (beforeSkeleton === afterSkeleton) return true;
  const ids = new Set(measurementIds);
  if (!ids.has("contractions") && !ids.has("uncontracted-negatives")) return false;
  // Direction is load-bearing. The patch may contract an explicit source auxiliary,
  // because the source fixes its meaning. It may not expand an already ambiguous
  // source contraction and choose whichever auxiliary makes the edit appear equal.
  return ambiguousContractionPattern(afterSkeleton).test(beforeSkeleton);
}

function containsMarkdownCodeOrLinkSyntax(value) {
  const source = String(value ?? "");
  return /`/.test(source) || /[\[\]]/.test(source) || /[<>]/.test(source)
    || /\b(?:https?|mailto):/i.test(source);
}

function draftContainsMarkdownCodeOrLinkRisk(value) {
  const source = String(value ?? "");
  // Do not implement a partial CommonMark parser here. Delimiters can live on
  // surrounding lines; fences can be nested under lists; tabs change indentation
  // after column expansion; and HTML blocks have their own continuation rules.
  // When any link/code signal exists, the deterministic conformer makes no edits
  // anywhere in the draft. The initial drafter must already satisfy its measured
  // targets or fail closed instead of risking a syntax-changing "style" repair.
  return containsMarkdownCodeOrLinkSyntax(source)
    || /~{3,}/.test(source)
    || /\t| {4}/.test(source);
}

export function replacementWordAllowance(initialWords) {
  if (!Number.isInteger(initialWords) || initialWords < 0) {
    throw new TypeError("replacement allowance requires a nonnegative integer word count");
  }
  return Math.max(
    MIN_REPLACED_WORD_ALLOWANCE,
    Math.min(MAX_REPLACED_WORD_ALLOWANCE, Math.ceil(initialWords * MAX_REPLACED_WORD_RATIO)),
  );
}

export function applyDraftConformancePatch(initialSource, patch, { request, profile, card }) {
  const errors = [];
  const initial = normalizeVoiceDraftSource(initialSource, { request });
  if (!initial.ok || initial.refusal) {
    return { ok: false, errors: ["conformance patch requires a valid draft source", ...initial.errors], source: null };
  }
  if (!isObject(patch) || !exactKeys(patch, ["schema", "edits", "coverage", "omitted"])) {
    return { ok: false, errors: ["conformance patch must carry exactly schema, edits, coverage, and omitted"], source: null };
  }
  if (patch.schema !== CONFORMANCE_PATCH_SCHEMA_ID) errors.push(`patch schema must be ${CONFORMANCE_PATCH_SCHEMA_ID}`);
  if (!Array.isArray(patch.edits) || patch.edits.length > MAX_CONFORMANCE_EDITS) {
    errors.push(`patch edits must be an array of at most ${MAX_CONFORMANCE_EDITS}`);
  }
  if (!Array.isArray(patch.coverage) || patch.coverage.length !== COVERAGE_DIMENSIONS.length) {
    errors.push("patch coverage must contain exactly the ten fixed dimensions");
  }
  if (!Array.isArray(patch.omitted) || patch.omitted.length > 50) errors.push("patch omitted must be an array of at most 50 entries");

  const sourceText = initial.source.draft;
  const measurementIds = new Set(card?.measurements?.map((row) => row.measurement_id) ?? []);
  const omissions = Array.isArray(patch.omitted) ? patch.omitted : [];
  const edits = [];
  for (const [index, edit] of (Array.isArray(patch.edits) ? patch.edits : []).entries()) {
    const at = `patch.edits[${index}]`;
    if (!exactKeys(edit, ["before", "after", "reason", "coverage_dimensions", "measurement_ids"])) {
      errors.push(`${at} has the wrong fields`); continue;
    }
    const priorErrorCount = errors.length;
    if (!isText(edit.before) || typeof edit.after !== "string" || !isText(edit.reason)) {
      errors.push(`${at} needs non-empty before/reason and a string after`); continue;
    }
    if (edit.before === edit.after) errors.push(`${at} does not change its anchor`);
    if (/```/.test(edit.before) || /```/.test(edit.after)) errors.push(`${at} cannot introduce or address output fences`);
    if (/\n\s*\n/.test(edit.before)) errors.push(`${at}.before spans more than one paragraph`);
    if (/\n\s*\n/.test(edit.after)) errors.push(`${at}.after creates more than one paragraph`);
    if (!Array.isArray(edit.coverage_dimensions) || edit.coverage_dimensions.length < 1
      || new Set(edit.coverage_dimensions).size !== edit.coverage_dimensions.length
      || edit.coverage_dimensions.some((id) => !COVERAGE_DIMENSIONS.includes(id))) {
      errors.push(`${at}.coverage_dimensions is invalid`);
    }
    if (!Array.isArray(edit.measurement_ids) || edit.measurement_ids.length < 1
      || new Set(edit.measurement_ids).size !== edit.measurement_ids.length
      || edit.measurement_ids.some((id) => !measurementIds.has(id))) {
      errors.push(`${at}.measurement_ids is invalid`);
    }
    const start = sourceText.indexOf(edit.before);
    if (start === -1) errors.push(`${at}.before is not an exact source span`);
    else if (sourceText.indexOf(edit.before, start + 1) !== -1) errors.push(`${at}.before is not unique in the source`);
    else if (errors.length === priorErrorCount) edits.push({ ...edit, start, end: start + edit.before.length });
  }
  edits.sort((left, right) => left.start - right.start);
  for (let index = 1; index < edits.length; index += 1) {
    if (edits[index].start < edits[index - 1].end) errors.push("patch edit anchors overlap");
  }
  const initialWords = words(sourceText);
  const replacedWords = edits.reduce((total, edit) => total + words(edit.before), 0);
  const replacementAllowance = replacementWordAllowance(initialWords);
  if (replacedWords > replacementAllowance) {
    errors.push(`conformance patch replaces ${replacedWords} source words; maximum is ${replacementAllowance}`);
  }
  const initialReport = measureDraftConformance(sourceText, card);
  const initialByMeasurement = new Map(
    initialReport.measurements.map((row) => [row.measurement_id, row]),
  );
  const distanceFromRange = (row) => row.status === "in-range" ? 0
    : row.status === "deficit" ? row.minimum - row.actual_count
      : row.actual_count - row.maximum;
  for (const [index, edit] of edits.entries()) {
    const namedRows = edit.measurement_ids.map((id) => initialByMeasurement.get(id));
    const relevant = namedRows.filter((row) => row?.status !== "in-range");
    const singlyPatched = `${sourceText.slice(0, edit.start)}${edit.after}${sourceText.slice(edit.end)}`;
    const afterByMeasurement = new Map(
      measureDraftConformance(singlyPatched, card).measurements
        .map((row) => [row.measurement_id, row]),
    );
    const improved = relevant.filter((row) =>
      distanceFromRange(afterByMeasurement.get(row.measurement_id)) < distanceFromRange(row));
    const changedMeasurementIds = initialReport.measurements
      .filter((row) => afterByMeasurement.get(row.measurement_id)?.actual_count !== row.actual_count)
      .map((row) => row.measurement_id)
      .sort();
    if (!sameArray([...edit.measurement_ids].sort(), changedMeasurementIds)) {
      errors.push(`patch.edits[${index}].measurement_ids must name every and only changed measurement (${changedMeasurementIds.join(", ")})`);
    }
    if (improved.length !== relevant.length || improved.length === 0) {
      errors.push(`patch.edits[${index}] does not move every named failing measurement toward range`);
    }
    const expectedDimensions = [...new Set(namedRows.flatMap((row) => row.dimensions))].sort();
    if (!sameArray([...edit.coverage_dimensions].sort(), expectedDimensions)) {
      errors.push(`patch.edits[${index}].coverage_dimensions must exactly match its improved measurements (${expectedDimensions.join(", ")})`);
    }
    if (draftContainsMarkdownCodeOrLinkRisk(sourceText)
      || containsMarkdownCodeOrLinkSyntax(edit.after)) {
      errors.push(`patch.edits[${index}] cannot alter a draft containing Markdown code or links`);
    }
    if (!measurementEditEquivalent(edit.before, edit.after, edit.measurement_ids)) {
      errors.push(`patch.edits[${index}] changes lexical content outside its named measurement forms`);
    }
  }

  const expectedCoverage = new Map((profile?.coverage ?? []).map((row) => [row.dimension, row]));
  const patchCoverage = new Map();
  for (const [index, row] of (Array.isArray(patch.coverage) ? patch.coverage : []).entries()) {
    const at = `patch.coverage[${index}]`;
    if (!exactKeys(row, ["dimension", "observation_ids", "disposition", "reason"])) {
      errors.push(`${at} has the wrong fields`); continue;
    }
    if (!COVERAGE_DIMENSIONS.includes(row.dimension) || patchCoverage.has(row.dimension)) {
      errors.push(`${at}.dimension is invalid or duplicated`); continue;
    }
    patchCoverage.set(row.dimension, row);
    const expected = expectedCoverage.get(row.dimension);
    if (!expected || !sameArray(row.observation_ids, expected.observation_ids ?? [])) {
      errors.push(`${at}.observation_ids do not reproduce the compiled profile row`);
    }
    if (!isText(row.reason)) errors.push(`${at}.reason must be substantive`);
    if (expected?.status === "unresolved") {
      if (row.disposition !== "unresolved") errors.push(`${at} must remain unresolved`);
    } else if (!["preserved", "revised", "omitted"].includes(row.disposition)) {
      errors.push(`${at} silently drops a supported instruction`);
    }
    if (row.disposition === "revised"
      && !edits.some((edit) => edit.coverage_dimensions.includes(row.dimension))) {
      errors.push(`${at} claims revision but no edit names the dimension`);
    }
    if (row.disposition === "omitted") {
      const located = omissions.some((entry) => isObject(entry)
        && String(entry.habit ?? "").includes(row.dimension)
        && row.observation_ids.every((id) => String(entry.habit ?? "").includes(id)));
      if (!located) errors.push(`${at} is omitted without a matching omission record`);
    }
  }
  for (const dimension of COVERAGE_DIMENSIONS) {
    if (!patchCoverage.has(dimension)) errors.push(`patch coverage silently omits ${dimension}`);
  }
  for (const [index, omission] of omissions.entries()) {
    if (!exactKeys(omission, ["habit", "why"]) || !isText(omission.habit) || !isText(omission.why)) {
      errors.push(`patch.omitted[${index}] must carry non-empty habit and why`);
    }
  }
  for (const edit of edits) {
    for (const dimension of edit.coverage_dimensions) {
      if (patchCoverage.get(dimension)?.disposition !== "revised") {
        errors.push(`edit names ${dimension} but its coverage disposition is not revised`);
      }
    }
  }
  if (errors.length) return { ok: false, errors, source: null };

  let cursor = 0;
  const pieces = [];
  for (const edit of edits) {
    pieces.push(sourceText.slice(cursor, edit.start), edit.after);
    cursor = edit.end;
  }
  pieces.push(sourceText.slice(cursor));
  const source = {
    schema: initial.source.schema,
    kind: "draft",
    draft: pieces.join(""),
    omitted: patch.omitted,
    refused: "",
  };
  const normalized = normalizeVoiceDraftSource(source, { request });
  if (!normalized.ok || normalized.refusal) errors.push(...normalized.errors);
  const report = normalized.ok ? measureDraftConformance(normalized.source.draft, card) : null;
  if (report && !report.pass) {
    for (const row of report.measurements.filter((item) => item.status !== "in-range")) {
      errors.push(`final ${row.measurement_id} count ${row.actual_count} is ${row.status}; required ${row.minimum}–${row.maximum}`);
    }
  }
  const finalWords = words(normalized.source?.draft ?? "");
  const growthAllowance = Math.max(MAX_WORD_GROWTH_ABSOLUTE, Math.ceil(initialWords * MAX_WORD_GROWTH_RATIO));
  if (finalWords > initialWords + growthAllowance) {
    errors.push(`conformance patch expands ${initialWords} words to ${finalWords}; maximum is ${initialWords + growthAllowance}`);
  }
  const wordDelta = finalWords - initialWords;
  const wordChangingEdits = edits.filter((edit) => words(edit.before) !== words(edit.after));
  const contractionMeasurements = new Set(["contractions", "uncontracted-negatives"]);
  const failingContractionRows = initialReport.measurements
    .filter((row) => row.status !== "in-range" && contractionMeasurements.has(row.measurement_id));
  const minimumRequiredContractionChanges = minimumCoupledContractionChanges(initialReport);
  const finalByMeasurement = new Map(
    (report?.measurements ?? []).map((row) => [row.measurement_id, row]),
  );
  const contractionRowsReachNearestBoundary = failingContractionRows.length > 0
    && failingContractionRows.every((row) =>
      Math.abs(finalByMeasurement.get(row.measurement_id)?.actual_count - row.actual_count)
        === row.correction.minimum_change);
  const contractionEdits = edits.filter((edit) =>
    edit.measurement_ids.some((id) => contractionMeasurements.has(id)));
  const perEditContractionChanges = contractionEdits.map((edit) =>
    contractionFormChangeCount(edit.before, edit.after));
  const contractionFormChanges = perEditContractionChanges.every(Number.isInteger)
    ? perEditContractionChanges.reduce((sum, count) => sum + count, 0)
    : null;
  // A validated contraction spelling changes conventional whitespace word count while
  // preserving every lexical unit. Treat only the minimum unavoidable form correction as
  // content-length neutral. Bind that exception to exact form transformations and every
  // initially failing row's nearest boundary; net whitespace delta is not a safe proxy.
  const contractionCorrectionIsMinimal = contractionEdits.length > 0
    && contractionFormChanges === minimumRequiredContractionChanges
    && contractionRowsReachNearestBoundary;
  if (contractionEdits.length > 0 && !contractionCorrectionIsMinimal) {
    errors.push(`conformance patch makes ${contractionFormChanges ?? "unrecountable"} contraction-form changes; minimum is ${minimumRequiredContractionChanges} and every failing contraction row must stop at its nearest boundary`);
  }
  const movedFartherFromTarget = Number.isInteger(card?.word_target)
    && Math.abs(finalWords - card.word_target) > Math.abs(initialWords - card.word_target);
  const targetDistanceException = movedFartherFromTarget
    && report?.pass === true
    && wordChangingEdits.length > 0
    && wordChangingEdits.every((edit) =>
      edit.measurement_ids.every((id) => contractionMeasurements.has(id)))
    && contractionCorrectionIsMinimal;
  if (movedFartherFromTarget && !targetDistanceException) {
    errors.push(`conformance patch moves farther from the requested ${card.word_target}-word target (${initialWords} to ${finalWords})`);
  }
  return {
    ok: errors.length === 0,
    errors,
    source: normalized.source,
    report,
    word_control: {
      initial_words: initialWords,
      final_words: finalWords,
      contraction_word_delta: contractionCorrectionIsMinimal ? wordDelta : 0,
      contraction_form_changes: contractionFormChanges ?? 0,
      minimum_required_contraction_changes: minimumRequiredContractionChanges,
      contraction_rows_at_nearest_boundary: contractionRowsReachNearestBoundary,
      target_distance_exception: targetDistanceException,
      growth_allowance: growthAllowance,
      replaced_words: replacedWords,
      replacement_allowance: replacementAllowance,
    },
  };
}

#!/usr/bin/env node
/** Deterministic count targets for a corpus-blind voice drafter. */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TARGET_CARD_SCHEMA_ID = "voice-draft-target-card/1";
export const TARGET_RATIO_BAND = 2;
export const TARGET_ABSOLUTE_FLOOR = 2;
export const WORD_TARGET_RATIO_TOLERANCE = 0.15;
export const WORD_TARGET_ABSOLUTE_TOLERANCE = 50;
export const SEMANTIC_BEARING_MEASUREMENTS = Object.freeze([
  "second-person-family",
  "first-person-plural-family",
  "profanity-vulgarity",
  "first-person-singular-family",
  "question-marks",
]);

export function requestedWordTarget(request) {
  const text = String(request ?? "");
  const match = /\b([1-9][0-9]{1,4})(?:\s*[-–—]\s*word|\s+words?)\b/i.exec(text);
  return match ? Number(match[1]) : null;
}

export function wordTargetBounds(target) {
  if (!Number.isInteger(target) || target < 1) {
    throw new TypeError("word target bounds require a positive integer");
  }
  const tolerance = Math.max(
    WORD_TARGET_ABSOLUTE_TOLERANCE,
    Math.ceil(target * WORD_TARGET_RATIO_TOLERANCE),
  );
  return { target, tolerance, minimum: target - tolerance, maximum: target + tolerance };
}

function acceptedCount(count, expected, corpusRate) {
  const deviation = Math.abs(count - expected);
  if (deviation < TARGET_ABSOLUTE_FLOOR) return true;
  if (corpusRate === 0) return count === 0;
  const ratio = expected === 0 ? Infinity : count / expected;
  return ratio >= 1 / TARGET_RATIO_BAND && ratio <= TARGET_RATIO_BAND;
}

export function countRange(per1000, words) {
  if (typeof per1000 !== "number" || !Number.isFinite(per1000) || per1000 < 0) {
    throw new TypeError("per-1,000 rate must be a non-negative finite number");
  }
  if (!Number.isInteger(words) || words < 1) throw new TypeError("word target must be a positive integer");
  const expected = (per1000 * words) / 1000;
  const ceiling = Math.max(8, Math.ceil(expected * TARGET_RATIO_BAND + TARGET_ABSOLUTE_FLOOR + 2));
  const accepted = Array.from({ length: ceiling + 1 }, (_, count) => count)
    .filter((count) => acceptedCount(count, expected, per1000));
  return {
    aim: Math.round(expected),
    minimum: Math.min(...accepted),
    maximum: Math.max(...accepted),
    expected: Math.round(expected * 100) / 100,
  };
}

function measurementId(observation) {
  return /^\[measurement:([a-z0-9-]+)\]/.exec(observation?.rate?.counting_rule ?? "")?.[1] ?? null;
}

export function draftTargetCard(profile, request) {
  const wordTarget = requestedWordTarget(request);
  if (profile?.schema !== "voice-profile/2" || !Array.isArray(profile.observations)
    || !Array.isArray(profile.coverage)) {
    throw new TypeError("target card requires a complete voice-profile/2");
  }
  const dimensionsByObservation = new Map();
  for (const row of profile.coverage) {
    for (const id of Array.isArray(row?.observation_ids) ? row.observation_ids : []) {
      const dimensions = dimensionsByObservation.get(id) ?? [];
      if (!dimensions.includes(row.dimension)) dimensions.push(row.dimension);
      dimensionsByObservation.set(id, dimensions);
    }
  }
  const measurements = profile.observations.flatMap((observation) => {
    const id = measurementId(observation);
    if (!id || !observation.rate) return [];
    const absence = observation.section === "absences";
    const exactPer1000 = Number.isInteger(observation.rate.count)
      && Number.isInteger(profile.corpus_words) && profile.corpus_words > 0
      ? (observation.rate.count / profile.corpus_words) * 1000
      : observation.rate.per_1000_words;
    const range = wordTarget ? countRange(exactPer1000, wordTarget) : null;
    return [{
      observation_id: observation.id,
      measurement_id: id,
      dimensions: dimensionsByObservation.get(observation.id) ?? [],
      status: absence ? "counted-absence" : "measured-positive",
      corpus_per_1000_words: observation.rate.per_1000_words,
      ...(range ? {
        target_words: wordTarget,
        aim_count: absence ? 0 : range.aim,
        gate_minimum: range.minimum,
        gate_maximum: range.maximum,
      } : {}),
    }];
  });
  return {
    schema: TARGET_CARD_SCHEMA_ID,
    word_target: wordTarget,
    ratio_band: TARGET_RATIO_BAND,
    absolute_floor: TARGET_ABSOLUTE_FLOOR,
    measurements,
    qualitative_rule: "Described observations have restrained placement but no numeric quota.",
  };
}

export function renderDraftTargetCard(card) {
  if (card?.schema !== TARGET_CARD_SCHEMA_ID || !Array.isArray(card.measurements)) {
    throw new TypeError("invalid voice draft target card");
  }
  const lines = [
    "## Deterministic draft target card",
    "",
    card.word_target
      ? `Requested length: ${card.word_target} words. Aim counts are length-scaled from the profile's measured rates.`
      : "No numeric word target was supplied; use the per-1,000 rates and do not invent a count.",
    `The min/max values reproduce the unchanged ${card.ratio_band}x ratio and ${card.absolute_floor}-instance absolute ship gate; they do not relax it.`,
    "Count by the referenced measurement rule after drafting. Aim at the center, not merely the edge.",
    "",
  ];
  if (card.word_target) {
    const length = wordTargetBounds(card.word_target);
    lines.push(
      `- HARD LENGTH: ${length.minimum}–${length.maximum} words inclusive; aim ${length.target}.`,
      "  Count the complete finished draft before returning it. Output outside this interval is rejected and cannot be repaired by the later exact patch.",
    );
  }
  for (const row of card.measurements) {
    const dimensions = row.dimensions.join(", ") || "unmapped";
    const target = card.word_target
      ? `aim ${row.aim_count}; unchanged gate range ${row.gate_minimum}–${row.gate_maximum}`
      : `${row.corpus_per_1000_words} per 1,000 words`;
    lines.push(`- ${row.observation_id} [measurement:${row.measurement_id}] (${dimensions}; ${row.status}): ${target}.`);
  }
  lines.push("", card.qualitative_rule);
  const hardRows = card.word_target
    ? card.measurements.filter((row) => SEMANTIC_BEARING_MEASUREMENTS.includes(row.measurement_id))
    : [];
  if (hardRows.length) {
    lines.push(
      "",
      "### Hard pre-return limits — conformance cannot repair these",
      "These counters change grammatical stance or meaning. The later exact patch is forbidden from changing them.",
      "Keep a private final integer count for every row below. Hit the exact operational target, not an outer checker boundary; the narrower generation target is a deliberate safety margin.",
    );
    for (const row of hardRows) {
      lines.push(`- HARD ${row.observation_id} [measurement:${row.measurement_id}]: operational target EXACTLY ${row.aim_count}; unchanged checker range ${row.gate_minimum}–${row.gate_maximum}.`);
    }
    lines.push("For question-marks, stop at the exact operational target even when the checker would accept one more. Recast excess questions as statements before returning the source.");
    lines.push("Do not emit these private counts.");
  }
  lines.push("Before returning the source, count the finished draft and revise it until every measured actual is inside its stated min/max range.");
  lines.push("An omitted record explains an unsupported qualitative instruction; it does not excuse an out-of-range measured habit.");
  lines.push("If a supported target cannot be applied, name its coverage dimension and observation ID in omitted; never drop it silently.");
  return lines.join("\n");
}

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function main() {
  const profilePath = flag("--profile");
  const requestPath = flag("--request");
  if (!profilePath || !requestPath) {
    process.stderr.write("draft-targets: usage: node draft-targets.mjs --profile profile.json --request request.txt\n");
    process.exitCode = 2;
    return;
  }
  const profile = JSON.parse(readFileSync(resolve(profilePath), "utf8"));
  const request = readFileSync(resolve(requestPath), "utf8");
  process.stdout.write(`${renderDraftTargetCard(draftTargetCard(profile, request))}\n`);
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && existsSync(process.argv[1]) && resolve(process.argv[1]) === self) main();

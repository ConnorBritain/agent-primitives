#!/usr/bin/env node
/**
 * Compare repeated voice-profile/2 renders without pretending prose is byte-stable.
 *
 * Mechanical facts must be identical: corpus lock, voice-card state, measured count,
 * rate, rule, derived band, and absence polarity. Qualitative selection and coverage
 * status may vary without being logically contradictory, so those differences are
 * reported for architecture review rather than silently unioned or scored away.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { COVERAGE_DIMENSIONS, FREQUENCIES } from "../skills/prose-draft/tools/profile-contract.mjs";

const stableJson = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());

function frequencyInParagraph(markdown, locator) {
  const paragraph = String(markdown ?? "").split(/\n\s*\n/)
    .find((block) => block.includes(locator));
  if (!paragraph) return { phrase: null, error: `measurement ${locator} is not locatable in profile prose` };
  const phrases = FREQUENCIES.filter((phrase) => paragraph.toLowerCase().includes(phrase));
  if (phrases.length > 1) return { phrase: null, error: `${locator} carries competing frequency bands: ${phrases.join(", ")}` };
  return { phrase: phrases[0] ?? null, error: null };
}

export function analyzeProfileStability(renders) {
  const errors = [];
  const variations = [];
  if (!Array.isArray(renders) || renders.length < 2) {
    return { ok: false, errors: ["stability analysis requires at least two renders"], variations: [], measurements: {} };
  }

  const baseline = renders[0];
  const baselineSamples = [...(baseline?.samples_used ?? [])].sort();
  const measurements = new Map();
  const statuses = new Map(COVERAGE_DIMENSIONS.map((dimension) => [dimension, new Set()]));
  const locatorSets = new Map(COVERAGE_DIMENSIONS.map((dimension) => [dimension, []]));

  renders.forEach((render, index) => {
    const at = `render ${index + 1}`;
    if (render?.schema !== "voice-profile/2") errors.push(`${at} is not voice-profile/2`);
    if (render?.profile !== baseline?.profile) errors.push(`${at} profile name differs from render 1`);
    if (render?.corpus_words !== baseline?.corpus_words) errors.push(`${at} corpus word total differs from render 1`);
    if (render?.voice_card !== baseline?.voice_card) errors.push(`${at} voice-card state differs from render 1`);
    if (render?.multiple_voices_suspected !== baseline?.multiple_voices_suspected) {
      errors.push(`${at} multiple-voices decision differs from render 1`);
    }
    if (JSON.stringify([...(render?.samples_used ?? [])].sort()) !== JSON.stringify(baselineSamples)) {
      errors.push(`${at} locked sample set differs from render 1`);
    }

    const observations = new Map((render?.observations ?? []).map((observation) => [observation.id, observation]));
    const absenceIds = new Set((render?.coverage ?? [])
      .filter((row) => row.status === "absent-paired")
      .map((row) => row.absence_observation_id));
    const coverage = new Map((render?.coverage ?? []).map((row) => [row.dimension, row]));

    for (const dimension of COVERAGE_DIMENSIONS) {
      const row = coverage.get(dimension);
      if (!row) { errors.push(`${at} omits coverage dimension ${dimension}`); continue; }
      statuses.get(dimension).add(row.status);
      const locators = [];
      for (const id of row.observation_ids ?? []) {
        const observation = observations.get(id);
        const locator = observation?.rate?.counting_rule?.match(/\[measurement:[a-z0-9-]+\]/)?.[0];
        if (locator) locators.push(locator);
      }
      locatorSets.get(dimension).push([...new Set(locators)].sort());
    }

    for (const observation of observations.values()) {
      if (!observation.rate) continue;
      const locator = observation.rate.counting_rule?.match(/\[measurement:[a-z0-9-]+\]/)?.[0];
      if (!locator) { errors.push(`${at} observation ${observation.id} has no stable measurement locator`); continue; }
      const absence = absenceIds.has(observation.id);
      const located = frequencyInParagraph(render.profile_markdown, locator);
      if (located.error) errors.push(`${at}: ${located.error}`);
      if (!absence && !located.phrase) errors.push(`${at}: positive ${locator} has no fixed frequency band`);
      if (absence && located.phrase) errors.push(`${at}: absence ${locator} carries positive frequency ${located.phrase}`);
      const signature = {
        count: observation.rate.count,
        per_1000_words: observation.rate.per_1000_words,
        counting_rule: observation.rate.counting_rule,
        absence,
        frequency: located.phrase,
      };
      const prior = measurements.get(locator);
      if (prior && stableJson(prior.signature) !== stableJson(signature)) {
        errors.push(`${locator} contradicts render ${prior.render} in render ${index + 1}`);
      } else if (!prior) {
        measurements.set(locator, { render: index + 1, signature });
      }
    }
  });

  for (const dimension of COVERAGE_DIMENSIONS) {
    const statusSet = [...statuses.get(dimension)].sort();
    const locatorSet = locatorSets.get(dimension).map((row) => JSON.stringify(row));
    if (statusSet.length > 1) variations.push({ dimension, kind: "coverage-status", values: statusSet });
    if (new Set(locatorSet).size > 1) {
      variations.push({
        dimension, kind: "measurement-selection",
        values: locatorSets.get(dimension),
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    variations,
    measurements: Object.fromEntries([...measurements.entries()].map(([locator, value]) => [locator, value.signature])),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const paths = process.argv.slice(2);
  if (paths.length < 2) {
    process.stderr.write("usage: node profile-stability.mjs <voice-profile.json> <voice-profile.json> [...]\n");
    process.exitCode = 2;
  } else {
    const result = analyzeProfileStability(paths.map((path) => JSON.parse(readFileSync(path, "utf8"))));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 1;
  }
}

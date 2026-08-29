#!/usr/bin/env node
/** Deterministic post-draft measurement for one mandatory conformance revision. */

import { PROFILE_MEASUREMENT_RULES } from "./profile-measure.mjs";

export const CONFORMANCE_REPORT_SCHEMA_ID = "voice-draft-conformance-report/1";

const rules = new Map(PROFILE_MEASUREMENT_RULES.map((rule) => [rule.id, rule]));

function countMatches(text, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...String(text ?? "").matchAll(new RegExp(pattern.source, flags))].length;
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
    return {
      measurement_id: target.measurement_id,
      observation_id: target.observation_id,
      dimensions: target.dimensions,
      aim_count: target.aim_count ?? null,
      minimum: target.gate_minimum ?? null,
      maximum: target.gate_maximum ?? null,
      actual_count: actual,
      status: pass ? "in-range" : actual < target.gate_minimum ? "deficit" : "excess",
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
  return [
    "## Deterministic conformance report for the initial draft",
    "",
    `Measured draft length: ${report.draft_words} words.`,
    ...report.measurements.map((row) =>
      `- ${row.observation_id} [measurement:${row.measurement_id}]: actual ${row.actual_count}; aim ${row.aim_count}; range ${row.minimum}–${row.maximum}; ${row.status}.`),
    "",
    report.pass
      ? "Every measured row is in range. The mandatory final pass must preserve that result."
      : "The final source must repair every deficit or excess and keep the other rows in range.",
  ].join("\n");
}

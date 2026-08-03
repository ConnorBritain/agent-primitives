/**
 * Turn raw measurements into flagged signals, against this profile's thresholds.
 *
 * Two rules govern this file, and both exist to keep the tool from overclaiming:
 *
 *   1. NO SINGLE PATTERN MEANS ANYTHING. Tells cluster or they are noise. A
 *      document with one "delve" has one unusual word; a document with elevated
 *      density across five independent categories has a fingerprint. So the
 *      summary counts DISTINCT categories over threshold, and never reduces to
 *      a score that could be read as a probability of AI authorship.
 *
 *   2. UNCALIBRATED IS NOT CALIBRATED. When thresholds are fallbacks rather than
 *      derived from this register's human corpus, every comparison is somebody's
 *      guess. It is labelled as one, everywhere it appears, without exception.
 */

import { CALIBRATED_METRICS } from "./cadence.mjs";

/** Sample counts below which a derived threshold is not worth trusting. */
export const CORPUS_MINIMUM = 10;
export const CORPUS_THIN = 5;

export function corpusConfidence(samples) {
  if (samples >= CORPUS_MINIMUM) return "calibrated";
  if (samples >= CORPUS_THIN) return "thin";
  if (samples > 0) return "insufficient";
  return "none";
}

/**
 * Below this many words, density per 1000 is arithmetic rather than evidence.
 * One hit in a 430-word document reads as 2.3 per 1000 — a rate that would take
 * nine hits to reach in a 4000-word piece. Reported so short documents are read
 * with that in mind rather than silently judged on an unstable measure.
 */
export const SHORT_DOCUMENT_WORDS = 800;

/**
 * How many actual occurrences a pattern needs before density is allowed to flag
 * it, by severity.
 *
 * This exists because of a real false positive found running the scanner over
 * this repo's own documentation: a single tricolon in a 433-word file cleared
 * the ceiling on density alone. One tricolon is not a tic — it is a sentence.
 * A rate computed from a single event is not a rate.
 *
 * Severity 3 patterns may still flag on one hit: a lone "delve" or "rich
 * tapestry" is genuinely informative, which is what severity 3 means.
 */
export const MIN_COUNT = { 3: 1, 2: 2, 1: 3 };

/**
 * Compare catalog findings against per-severity density ceilings.
 *
 * Density, not count, so a 400-word note and a 4000-word essay are judged on the
 * same scale — subject to the floor above. An entry under its ceiling is still
 * reported, because it is evidence a human may want, but it is not flagged.
 */
export function evaluateFindings(findings, thresholds) {
  const ceilings = thresholds.catalog_density || {};
  const floors = { ...MIN_COUNT, ...(thresholds.min_count || {}) };
  const bySeverity = { 3: ceilings.high, 2: ceilings.medium, 1: ceilings.low };

  return findings.map((f) => {
    // Tier A entries are artifacts, not style: a leaked `[cite: 3]` or an
    // "as of my last knowledge update" is dispositive on a single occurrence,
    // and density gating would hide it in a long document purely because the
    // document is long. These bypass both the ceiling and the floor.
    if (f.always_flag) {
      return { ...f, ceiling: null, min_count: 1, flagged: true, held_by_floor: false };
    }

    const ceiling = bySeverity[f.severity];
    const floor = floors[f.severity] ?? 1;
    const overDensity = typeof ceiling === "number" && f.per_1k > ceiling;
    const meetsFloor = f.count >= floor;
    return {
      ...f,
      ceiling: ceiling ?? null,
      min_count: floor,
      flagged: overDensity && meetsFloor,
      // Distinguishes "quiet because it is rare" from "quiet because too few
      // occurrences to judge" — different things, and the second is the one a
      // reader should discount rather than trust.
      held_by_floor: overDensity && !meetsFloor,
    };
  });
}

/**
 * Compare cadence metrics against the profile's bands.
 *
 * Derived bands carry p10/p50/p90 from the human corpus: outside p10–p90 is
 * outside what this author's good writing in this register looks like. Fallback
 * bands carry flat limits instead, which is a much weaker claim and is reported
 * as such.
 */
export function evaluateCadence(cadence, thresholds) {
  const bands = thresholds.metrics || {};
  const out = [];

  for (const { key, label, direction } of CALIBRATED_METRICS) {
    const band = bands[key];
    if (!band) continue;
    const value = cadence[key];
    if (typeof value !== "number") continue;

    let flagged = false;
    let expectation = null;

    if (typeof band.p10 === "number" && typeof band.p90 === "number") {
      expectation = `corpus p10–p90: ${band.p10}–${band.p90}`;
      if (direction !== "high" && value < band.p10) flagged = true;
      if (direction !== "low" && value > band.p90) flagged = true;
    } else {
      if (typeof band.low === "number") {
        expectation = `expected ≥ ${band.low}`;
        if (value < band.low) flagged = true;
      }
      if (typeof band.high === "number") {
        expectation = expectation
          ? `${expectation}, ≤ ${band.high}`
          : `expected ≤ ${band.high}`;
        if (value > band.high) flagged = true;
      }
    }

    out.push({ key, label, value, expectation, flagged, direction });
  }
  return out;
}

/**
 * The co-occurrence summary.
 *
 * Deliberately not a score. The output is: which independent categories are
 * elevated, and how confident the thresholds behind that judgement are. A
 * number here would be repurposed as a verdict within a week of shipping, and
 * this tool must never be usable as an authorship detector.
 */
export function summarise({ findings, cadenceChecks, thresholds, wordCount }) {
  const flagged = findings.filter((f) => f.flagged);
  const categories = new Set(flagged.map((f) => f.category).filter(Boolean));
  const highConfidence = flagged.filter((f) => f.confidence === "high");
  const cadenceFlags = cadenceChecks.filter((c) => c.flagged);

  const confidence = thresholds.derived
    ? corpusConfidence(thresholds.samples || 0)
    : "none";

  return {
    words: wordCount,
    short_document: wordCount < SHORT_DOCUMENT_WORDS,
    total_hits: findings.reduce((a, f) => a + f.count, 0),
    held_by_floor: findings.filter((f) => f.held_by_floor).length,
    flagged_entries: flagged.length,
    flagged_categories: [...categories].sort(),
    high_confidence_flags: highConfidence.length,
    cadence_flags: cadenceFlags.map((c) => c.key),
    threshold_confidence: confidence,
    thresholds_derived: Boolean(thresholds.derived),
    corpus_samples: thresholds.samples || 0,
    // Stated as a reading instruction, not a verdict, because the difference
    // matters and gets lost the moment anyone quotes the output.
    reading: buildReading(categories.size, cadenceFlags.length, confidence, wordCount),
  };
}

function buildReading(categoryCount, cadenceFlagCount, confidence, wordCount) {
  const uncalibrated = confidence === "none" || confidence === "insufficient";
  const clusters = categoryCount + (cadenceFlagCount > 0 ? 1 : 0);

  let body;
  if (clusters === 0) {
    body = "No category is over threshold. Nothing here to act on.";
  } else if (clusters === 1) {
    body =
      "One category is elevated. A single elevated category is weak evidence on " +
      "its own — read the hits and decide whether they are the author's voice.";
  } else {
    body =
      `${clusters} independent categories are elevated. Tells cluster or they are ` +
      "noise, so co-occurrence at this level is worth a read-through.";
  }

  const short = wordCount < SHORT_DOCUMENT_WORDS
    ? ` At ${wordCount} words this document is short enough that per-1000 densities swing hard on single occurrences — read the hits, not the rates.`
    : "";

  const caveat = uncalibrated
    ? " Thresholds are UNCALIBRATED fallbacks, not measurements of this register — treat every comparison above as a guess until the corpus is filled."
    : "";

  return body + short + caveat;
}

/**
 * profile-fit: is this document even in the register it claims?
 *
 * Only answerable against derived bands. A document far outside its declared
 * profile's distribution means either the wrong profile was selected or the
 * writing has drifted, and both are worth knowing BEFORE anyone reads the
 * findings — every threshold below it is built on that assumption.
 */
export function profileFit(cadence, thresholds) {
  if (!thresholds.derived || !thresholds.metrics) {
    return { checked: false, reason: "no derived thresholds — profile-fit needs a corpus" };
  }
  const outside = [];
  for (const { key, label } of CALIBRATED_METRICS) {
    const band = thresholds.metrics[key];
    if (!band || typeof band.p10 !== "number") continue;
    const value = cadence[key];
    if (typeof value !== "number") continue;
    const span = band.p90 - band.p10 || 1;
    // Two band-widths outside the corpus range is not "unusual for this
    // register", it is "probably not this register".
    if (value < band.p10 - 2 * span || value > band.p90 + 2 * span) {
      outside.push({ key, label, value, p10: band.p10, p90: band.p90 });
    }
  }
  return { checked: true, outside, fits: outside.length === 0 };
}

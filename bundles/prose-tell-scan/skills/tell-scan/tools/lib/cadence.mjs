/**
 * Phase 1b — the rhythm fingerprint.
 *
 * This half of the scan is the reason the deterministic pass exists at all.
 * Frequency and variance are counting problems, and a model asked to audit its
 * own rhythm will not count. It will estimate, and it will estimate wrong.
 *
 * Low sentence-length variance RELATIVE TO THE REGISTER BASELINE is among the
 * strongest signals available and costs nothing to compute. "Relative to the
 * register baseline" is doing the work in that sentence: a technical reference
 * doc is supposed to be rhythmically flat, and penalising it for that is how a
 * scanner earns its way into being disabled.
 */

import { sentences, words } from "./text.mjs";

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Nearest-rank percentile. Small samples make interpolation false precision. */
export function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1];
}

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function cadenceMetrics(text, paras, { openerWords = 3, uniformTolerance = 3 } = {}) {
  const sents = sentences(text);
  const lengths = sents.map((s) => words(s.text).length).filter((n) => n > 0);
  const sorted = [...lengths].sort((a, b) => a - b);

  // Repeated openers: humans vary how they start sentences, models loop. The
  // n-gram is deliberately short — matching whole clauses finds nothing.
  const openers = new Map();
  for (const s of sents) {
    const w = words(s.text).slice(0, openerWords);
    if (w.length < openerWords) continue;
    const key = w.join(" ").toLowerCase();
    openers.set(key, (openers.get(key) || 0) + 1);
  }
  const repeated = [...openers.entries()]
    .filter(([, n]) => n > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([opener, count]) => ({ opener, count }));

  // Longest run of consecutive sentences all within ±tolerance words of their
  // neighbour. A long run reads as metronomic even when the mean looks healthy.
  let longestRun = lengths.length ? 1 : 0;
  let current = 1;
  for (let i = 1; i < lengths.length; i++) {
    if (Math.abs(lengths[i] - lengths[i - 1]) <= uniformTolerance) current += 1;
    else current = 1;
    if (current > longestRun) longestRun = current;
  }

  const paraLengths = paras.map((p) => words(p).length).filter((n) => n > 0);
  const paraSorted = [...paraLengths].sort((a, b) => a - b);
  const fragments = lengths.filter((n) => n < 6).length;

  const sd = stdev(lengths);
  const mu = mean(lengths);

  return {
    sentences: lengths.length,
    mean_len: round(mu, 1),
    stdev_len: round(sd, 1),
    // Coefficient of variation: comparable across registers in a way raw stdev
    // is not, since a register with longer sentences will have a larger stdev
    // at identical rhythmic variety.
    cv_len: round(mu ? sd / mu : 0, 3),
    p10_len: percentile(sorted, 10),
    median_len: percentile(sorted, 50),
    p90_len: percentile(sorted, 90),
    shortest: sorted[0] ?? 0,
    longest: sorted[sorted.length - 1] ?? 0,
    fragments_under_6w: fragments,
    fragment_rate: round(lengths.length ? fragments / lengths.length : 0, 3),
    longest_uniform_run: longestRun,
    paragraphs: paraLengths.length,
    mean_para_words: round(mean(paraLengths), 1),
    stdev_para_words: round(stdev(paraLengths), 1),
    median_para_words: percentile(paraSorted, 50),
    p90_para_words: percentile(paraSorted, 90),
    repeated_openers: repeated,
  };
}

/**
 * The metrics a profile derives thresholds for. Named once here so the scanner
 * and the calibrator cannot drift apart about what is being calibrated.
 *
 * `direction` says which tail is the signal: "low" means small values are the
 * anomaly (flat rhythm), "high" means large ones are (em-dash pile-ups).
 */
export const CALIBRATED_METRICS = [
  { key: "cv_len", label: "sentence-length variation", direction: "low" },
  { key: "stdev_len", label: "sentence-length stdev", direction: "low" },
  { key: "mean_len", label: "mean sentence length", direction: "both" },
  { key: "longest_uniform_run", label: "uniform-length run", direction: "high" },
  { key: "fragment_rate", label: "fragment rate", direction: "both" },
  { key: "mean_para_words", label: "mean paragraph length", direction: "both" },
];

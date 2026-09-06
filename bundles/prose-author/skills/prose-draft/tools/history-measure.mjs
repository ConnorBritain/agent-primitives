/** Numbers-only longitudinal measurements. Historical profile counters are untouched. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { visibleProse, wordCount, NORMALIZATION_VERSION } from "./visible-prose.mjs";
import { CURRENT_MEASUREMENT_RULES, measureSample, bodyRange } from "./profile-v3.mjs";

export const HISTORY_MEASURE_VERSION = "voice-history-measurements/1";
const extra = [
  { id: "exclamation-marks", pattern: /!/g },
  { id: "semicolons", pattern: /;/g },
  { id: "colons", pattern: /:/g },
  { id: "ellipses", pattern: /\.{3,}|…/g },
];
const hash = (s) => createHash("sha256").update(s).digest("hex");
// Includes transitive counter/normalizer implementations, not just a mutable version label.
export const HISTORY_ANALYZER = hash(["history-measure.mjs", "visible-prose.mjs", "profile-v3.mjs", "profile-measure.mjs"]
  .map((f) => readFileSync(new URL(f, import.meta.url), "utf8")).join("\n"));
export function numericDistribution(values) {
  if (!values.every(Number.isFinite)) throw new TypeError("Finite numerical observations required");
  const sorted = [...values].sort((a, b) => a - b), n = values.length;
  const q = (p) => { if (!n) return null; const x = (n - 1) * p, i = Math.floor(x); return sorted[i] + (sorted[Math.ceil(x)] - sorted[i]) * (x - i); };
  const mean = n ? values.reduce((s, v) => s + v, 0) / n : null;
  return { n, mean, variance: n ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / n : null,
    minimum: n ? sorted[0] : null, p10: q(0.1), median: q(0.5), p90: q(0.9), maximum: n ? sorted.at(-1) : null };
}

/** English heuristic; keeps numeric offsets for transient evidence. Blank lines define paragraphs.
 * Titles/initials, decimals and e.g./i.e. do not split. Ellipses do not assert a boundary.
 * Closing quotes/brackets attach to the preceding sentence; fragments count as units.
 */
export function segmentHistoryProse(text) {
  const paragraphs = [], warnings = new Set();
  for (const part of text.matchAll(/\S[\s\S]*?(?=\n[ \t]*\n|$)/g)) {
    const start = part.index, body = part[0], sentences = [];
    let begin = 0;
    const push = (end) => {
      const fragment = body.slice(begin, end), trim = fragment.search(/\S/);
      if (trim >= 0 && wordCount(fragment)) sentences.push({ start: start + begin + trim, end: start + end, words: wordCount(fragment) });
      begin = end;
    };
    for (let i = 0; i < body.length; i++) {
      if (!/[.!?]/.test(body[i])) continue;
      if (body[i] === ".") {
        if (/\d/.test(body[i - 1] ?? "") && /\d/.test(body[i + 1] ?? "")) continue;
        if (body[i - 1] === "." || body[i + 1] === ".") { warnings.add("ellipsis-boundary-ambiguous"); continue; }
        const before = body.slice(0, i + 1);
        if (/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc)\.$/i.test(before) || /\b[A-Za-z]\.$/.test(before)) continue;
      }
      let end = i + 1;
      while (end < body.length && /[.!?"'”’\])}]/.test(body[end])) end++;
      if (end === body.length || /\s/.test(body[end])) { push(end); i = end - 1; }
    }
    if (begin < body.length) { push(body.length); warnings.add("fragment-or-ambiguous-ending"); }
    if (sentences.length) paragraphs.push({ start, end: start + body.length, words: wordCount(body), sentences });
  }
  return { paragraphs, warnings: [...warnings] };
}

export function measureHistoryText(text, { format = "markdown", quoted_ranges = [], language = "en" } = {}) {
  if (typeof text !== "string") throw new TypeError("Text required");
  const normal = visibleProse(text, { format, quotedRanges: quoted_ranges, bodyRange: bodyRange(text) });
  const words = wordCount(normal.author), english = /^en(?:-|$)/i.test(language);
  const segmented = segmentHistoryProse(normal.author), paragraphs = segmented.paragraphs;
  const sentences = paragraphs.flatMap((p) => p.sentences);
  const rules = [...CURRENT_MEASUREMENT_RULES, ...extra];
  // Original ten counters retain their established body extraction and quote rules.
  const current = measureSample({ id: "transient", text, format, quoted_ranges });
  const counts = rules.map((rule, i) => {
    const matches = [...normal.author.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))];
    const placements = { initial: 0, interior: 0, final: 0, only: 0, unplaced: 0 };
    if (english) for (const match of matches) {
      const p = paragraphs.find((p) => match.index >= p.start && match.index < p.end);
      const j = p?.sentences.findIndex((s) => match.index >= s.start && match.index < s.end) ?? -1;
      placements[j < 0 ? "unplaced" : p.sentences.length === 1 ? "only" : j === 0 ? "initial" : j === p.sentences.length - 1 ? "final" : "interior"]++;
    }
    const count = i < CURRENT_MEASUREMENT_RULES.length ? current.measurements[i].count : matches.length;
    const denominator = i < CURRENT_MEASUREMENT_RULES.length ? current.words : words;
    return { id: rule.id, count, denominator, per_1000_words: denominator ? count * 1000 / denominator : null,
      status: denominator ? "measured" : "not-evaluated", placement: english ? placements : null };
  });
  const lengths = sentences.map((s) => s.words);
  return { schema: HISTORY_MEASURE_VERSION, analyzer: HISTORY_ANALYZER, normalization: NORMALIZATION_VERSION,
    language: english ? "en" : "unsupported", words, quoted_words: wordCount(normal.visible) - words,
    exclusions: normal.exclusions.length, quotation_spans: normal.quotations.length,
    warnings: [...new Set([...(normal.warnings.length ? ["normalization-warning"] : []), ...segmented.warnings,
      ...(!english ? ["english-features-not-evaluated"] : []), ...(current.words !== words ? ["editorial-body-differs-from-visible-prose"] : [])])],
    counts: counts.map((m) => !english && CURRENT_MEASUREMENT_RULES.slice(0, 6).some((r) => r.id === m.id)
      ? { ...m, count: null, per_1000_words: null, status: "not-evaluated" } : m),
    rhythm: { status: english && words ? "measured-heuristic" : "not-evaluated",
      sentence_lengths: english ? lengths : [], paragraph_lengths: english ? paragraphs.map((p) => p.words) : [],
      sentences: numericDistribution(english ? lengths : []), paragraphs: numericDistribution(english ? paragraphs.map((p) => p.words) : []),
      adjacent_differences: numericDistribution(english ? paragraphs.flatMap((p) => p.sentences.slice(1).map((s, i) => Math.abs(s.words - p.sentences[i].words))) : []) } };
}

/** Persist only a closed numbers-only shape, never the located source matches. */
export function validateHistoryMeasurement(m) {
  if (m?.schema !== HISTORY_MEASURE_VERSION || !/^[a-f0-9]{64}$/.test(m.analyzer ?? "")) throw new TypeError("Invalid history measurement version");
  const strings = new Set([HISTORY_MEASURE_VERSION, m.analyzer, NORMALIZATION_VERSION, "en", "unsupported", "measured", "measured-heuristic", "not-evaluated",
    ...CURRENT_MEASUREMENT_RULES.map((r) => r.id), ...extra.map((r) => r.id), "ellipsis-boundary-ambiguous", "fragment-or-ambiguous-ending",
    "normalization-warning", "english-features-not-evaluated", "editorial-body-differs-from-visible-prose"]);
  const keys = new Set(["schema", "analyzer", "normalization", "language", "words", "quoted_words", "exclusions", "quotation_spans", "warnings", "counts", "rhythm",
    "id", "count", "denominator", "per_1000_words", "status", "placement", "initial", "interior", "final", "only", "unplaced",
    "sentence_lengths", "paragraph_lengths", "sentences", "paragraphs", "adjacent_differences", "n", "mean", "variance", "minimum", "p10", "median", "p90", "maximum"]);
  function visit(v) {
    if (v === null || typeof v === "boolean") return;
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) return;
    if (typeof v === "string" && strings.has(v)) return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    if (v && typeof v === "object" && Object.keys(v).every((k) => keys.has(k))) { Object.values(v).forEach(visit); return; }
    throw new TypeError("Non-numerical or unrecognized measurement payload");
  }
  visit(m);
  if (!Number.isInteger(m.words) || m.words < 0 || m.counts?.length !== 14 || new Set(m.counts.map((c) => c.id)).size !== 14) throw new TypeError("Invalid measurement counts");
  for (const c of m.counts) if (c.status === "measured" && (!Number.isInteger(c.count) || !Number.isInteger(c.denominator) || c.denominator <= 0
    || c.per_1000_words !== c.count * 1000 / c.denominator)) throw new TypeError("Invalid count/rate arithmetic");
  return m;
}

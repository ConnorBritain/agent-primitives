/** Descriptive contextual comparisons, never a resemblance score or writing gate. */
import { numericDistribution } from "./history-measure.mjs";
import { activeHistoryRecords, digestHistory } from "./history-store.mjs";

export const HISTORY_REPORT_VERSION = "voice-history-report/1";
const day = 86400000;
const supported = (rows) => rows.length >= 5 && rows.reduce((n, r) => n + r.measurement.words, 0) >= 1000;
export function historyFeatures(measurement, rhetoric = null) {
  const features = measurement.counts.map((m) => ({ id: m.id, value: m.per_1000_words, count: m.count, denominator: m.denominator }));
  if (measurement.rhythm.status !== "not-evaluated") {
    for (const [name, d] of Object.entries({ sentence: measurement.rhythm.sentences, paragraph: measurement.rhythm.paragraphs, adjacent: measurement.rhythm.adjacent_differences })) {
      for (const statistic of ["mean", "variance", "median", "p10", "p90"]) features.push({ id: `${name}-${statistic}`, value: d[statistic], count: null, denominator: null });
    }
    for (const m of measurement.counts) for (const [position, count] of Object.entries(m.placement ?? {})) {
      features.push({ id: `${m.id}-placement-${position}`, value: m.count ? count / m.count : null, count: null, denominator: null });
    }
  }
  if (rhetoric?.status === "measured-estimate") for (const m of rhetoric.measurements) features.push({ id: `rhetoric:${m.id}`, value: m.value, count: m.count, denominator: m.denominator });
  return features;
}
function summary(rows, rhetorical = false) {
  const byId = new Map();
  for (const r of rows) for (const f of historyFeatures(r.measurement, r.rhetoric)) {
    if (f.id.startsWith("rhetoric:") !== rhetorical) continue;
    if (!byId.has(f.id)) byId.set(f.id, []);
    if (Number.isFinite(f.value)) byId.get(f.id).push(f);
  }
  return { pieces: rows.length, words: rows.reduce((n, r) => n + r.measurement.words, 0),
    support: supported(rows) ? "supported-descriptive" : "limited-evidence",
    features: [...byId].map(([id, fs]) => ({ id, ...numericDistribution(fs.map((f) => f.value)),
      pooled_rate: fs.length && fs.every((f) => f.count !== null && f.denominator > 0)
        ? fs.reduce((n, f) => n + f.count, 0) / fs.reduce((n, f) => n + f.denominator, 0) * (id.startsWith("rhetoric:paragraph-") ? 1 : 1000) : null,
      status: fs.length ? "measured" : "not-evaluated" })) };
}
export function buildHistoryReport(state, { now = new Date().toISOString(), exclude_document = null } = {}) {
  const end = Date.parse(now);
  if (!Number.isFinite(end)) throw new TypeError("Valid report date required");
  const grouped = new Map();
  for (const r of activeHistoryRecords(state, { exclude_document })) {
    // Optional rhetoric never fragments the deterministic baseline.
    for (const series of [null, ...(r.rhetoric?.status === "measured-estimate" ? [r.rhetoric.series] : [])]) {
      const key = JSON.stringify([r.provenance, r.register, r.form, r.measurement.analyzer, series]);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(r);
    }
  }
  const groups = [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => {
    const [provenance, register, form, analyzer, rhetorical_series] = JSON.parse(key);
    const recentRows = rows.filter((r) => r.written_at && Date.parse(r.written_at) > end - 90 * day && Date.parse(r.written_at) <= end);
    const previousRows = rows.filter((r) => r.written_at && Date.parse(r.written_at) > end - 180 * day && Date.parse(r.written_at) <= end - 90 * day);
    const lifetime = summary(rows, !!rhetorical_series), recent = summary(recentRows, !!rhetorical_series), previous = summary(previousRows, !!rhetorical_series);
    const eligible = provenance === "human-independent" && register !== null && form !== null;
    const direction = recent.features.map((f) => {
      const before = previous.features.find((p) => p.id === f.id);
      const evaluated = eligible && supported(recentRows) && supported(previousRows) && f.n >= 5 && (before?.n ?? 0) >= 5;
      return { id: f.id, status: evaluated ? "descriptive-difference" : "not-evaluated", mean_difference: evaluated ? f.mean - before.mean : null,
        median_difference: evaluated ? f.median - before.median : null };
    });
    return { provenance, register, form, analyzer, rhetorical_series, baseline_eligible: eligible, record_ids: rows.map((r) => r.id),
      lifetime, recent, previous, direction, undated_pieces: rows.filter((r) => !r.written_at).length };
  });
  const report = { schema: HISTORY_REPORT_VERSION, identity: state?.identity ?? null, source_revision: state?.revision ?? null, as_of: new Date(end).toISOString(),
    groups, interpretation: "descriptive-not-a-quota", uncertainty: "Empirical ranges are not calibrated prediction intervals. Multiple features produce expected departures; differences are not causal or significance claims." };
  return { ...report, digest: digestHistory(report) };
}
export function compareHistoryMeasurement(measurement, baseline, { register = null, form = null, rhetoric = null } = {}) {
  const compatible = baseline.groups.filter((g) => g.baseline_eligible && g.register === register && g.form === form && g.analyzer === measurement.analyzer);
  const features = historyFeatures(measurement, rhetoric).map((f) => {
    const series = f.id.startsWith("rhetoric:") ? rhetoric?.series : null;
    const group = compatible.find((g) => g.rhetorical_series === series);
    const reference = group?.lifetime.features.find((r) => r.id === f.id);
    const evaluated = group?.lifetime.support === "supported-descriptive" && reference?.n >= 20 && Number.isFinite(f.value);
    return { id: f.id, actual: f.value, reference: reference ? { n: reference.n, median: reference.median, p10: reference.p10, p90: reference.p90 } : null,
      status: !evaluated ? "not-evaluated" : f.value < reference.p10 ? "below-empirical-range" : f.value > reference.p90 ? "above-empirical-range" : "within-empirical-range" };
  });
  return { schema: "voice-history-comparison/1", baseline_digest: baseline.digest, status: features.some((f) => f.status !== "not-evaluated") ? "descriptive" : "not-evaluated",
    features, interpretation: "Advisory evidence only; no numerical departure independently authorizes repair." };
}
export function compareHistoryStages(previous, current) {
  if (previous.analyzer !== current.analyzer) return { status: "not-evaluated", reason: "incompatible-analyzers", changes: [] };
  const before = new Map(historyFeatures(previous).map((f) => [f.id, f.value]));
  return { status: "descriptive", changes: historyFeatures(current).filter((f) => Number.isFinite(f.value) && Number.isFinite(before.get(f.id)) && f.value !== before.get(f.id))
    .map((f) => ({ id: f.id, before: before.get(f.id), after: f.value, difference: f.value - before.get(f.id) })) };
}
export function renderHistoryReport(report) {
  const lines = ["# Writing history", "", "Descriptive evidence, not a voice score or a set of quotas.", "", report.uncertainty, "",
    "Units: surface and non-paragraph rhetorical frequencies are per 1,000 author-prose words. Paragraph-role estimates are fractions of paragraphs. Length and adjacent-difference summaries use words; their variances use squared words. Placement summaries are fractions of a habit's occurrences."];
  for (const g of report.groups) {
    lines.push("", `## ${g.form ?? "unclassified form"} / ${g.register ?? "unclassified register"} — ${g.provenance}`, "",
      `${g.lifetime.pieces} independent current pieces; ${g.lifetime.words} author-prose words; ${g.lifetime.support}. ${g.undated_pieces} undated.`, "",
      "Feature | Median | Empirical p10–p90 | Pieces", "--- | ---: | ---: | ---:");
    for (const f of g.lifetime.features.filter((f) => !f.id.includes("-placement-") && !f.id.endsWith("-p10") && !f.id.endsWith("-p90"))) {
      const num = (v) => v === null ? "not evaluated" : Number(v.toFixed(3));
      lines.push(`${f.id} | ${num(f.median)} | ${num(f.p10)}–${num(f.p90)} | ${f.n}`);
    }
    const changes = g.direction.filter((f) => f.status !== "not-evaluated" && f.mean_difference !== 0);
    lines.push("", changes.length ? `Recent minus preceding 90-day means: ${changes.slice(0, 6).map((f) => `${f.id} ${f.mean_difference > 0 ? "+" : ""}${f.mean_difference.toFixed(3)}`).join("; ")}. See sidecar for all features.` : "Recent direction: no evaluated nonzero differences.");
  }
  return `${lines.join("\n")}\n`;
}

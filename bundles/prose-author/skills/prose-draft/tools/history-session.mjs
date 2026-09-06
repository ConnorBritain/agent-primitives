/** Optional runtime attachment. Store failures never replace the writing outcome. */
import { randomUUID } from "node:crypto";
import { historyDirectory, readHistory, historyConsent, saveHistoryMeasurement, digestHistory } from "./history-store.mjs";
import { measureHistoryText } from "./history-measure.mjs";
import { measureRhetoric } from "./history-rhetoric.mjs";
import { validateStoredRhetoric } from "./history-rhetoric.mjs";
import { buildHistoryReport, compareHistoryMeasurement, compareHistoryStages } from "./history-report.mjs";
import { sha256 } from "./profile-v3.mjs";

export function startHistorySession(job, { dispatch, signal } = {}) {
  if (!job.telemetry) return null;
  const config = job.telemetry, project = job.context?.project ?? null;
  let root, state, consent, baseline, initializationFailure = null;
  try {
    if (typeof config !== "object" || Array.isArray(config) || Object.keys(config).some((k) => !["identity", "directory", "document_id", "revision_id", "snapshot", "format", "language"].includes(k))) throw new TypeError("Unknown history attachment field");
    root = config.directory ?? historyDirectory();
    state = readHistory(root, config.identity); consent = historyConsent(state, project);
    if (consent.enabled) {
      let selected = state, now;
      if (config.snapshot) {
        const snapshot = state.snapshots.find((s) => s.id === config.snapshot);
        if (!snapshot) throw new TypeError("Unavailable snapshot");
        selected = { ...state, records: state.records.filter((r) => snapshot.source_records.includes(r.id)) };
        now = snapshot.report.as_of;
      }
      baseline = buildHistoryReport(selected, { exclude_document: config.document_id, ...(now ? { now } : {}) });
    }
  } catch { initializationFailure = "history-initialization-failed"; }
  const budget = { remaining: 3 }, stages = [], calls = [], failures = [];
  const document_id = config.document_id ?? randomUUID(), revision_id = config.revision_id ?? randomUUID();
  if (initializationFailure) failures.push(initializationFailure);
  const enabled = !!consent?.enabled && !initializationFailure;
  const options = { format: config.format ?? "markdown", language: config.language ?? "en", quoted_ranges: [] };
  const save = (draft, stage, measurement, rhetoric) => {
    try {
      const saved = saveHistoryMeasurement(root, config.identity, { document_id, revision_id, text: draft, stage, measurement, rhetoric,
        ...options,
        provenance: "generated", project, register: job.context.register ?? null, form: job.context.form ?? null, written_at: new Date().toISOString().slice(0, 10) });
      if (!["saved", "duplicate"].includes(saved.status)) failures.push("history-store-unavailable");
      return saved;
    } catch { failures.push("history-store-failed"); return { status: "failed" }; }
  };
  return {
    async observe(draft, stage) {
      if (!enabled) return null;
      try {
        const currentConsent = historyConsent(readHistory(root, config.identity), project);
        if (!currentConsent.enabled) { failures.push("history-consent-withdrawn"); return null; }
        const measurement = measureHistoryText(draft, options);
        const rhetoric = await measureRhetoric(draft, { ...options, enabled: consent.rhetoric && currentConsent.rhetoric, budget, adapter: job.adapter, signal }, { dispatch });
        if (rhetoric.call) calls.push(rhetoric.call);
        const comparison = compareHistoryMeasurement(measurement, baseline, { ...job.context, rhetoric });
        const previous = stages.at(-1), changes = previous ? compareHistoryStages(previous.measurement, measurement) : null;
        const saved = save(draft, stage, measurement, rhetoric);
        const record = { stage, draft_digest: sha256(draft), measurement, rhetoric, comparison, changes, storage: saved.status };
        stages.push(record);
        // This object is review evidence, not input to generation or a failed-check list.
        return { baseline_digest: baseline.digest, status: comparison.status, departures: comparison.features.filter((f) => /^(above|below)-/.test(f.status)),
          stage_changes: changes, rhetorical_status: rhetoric.status,
          instruction: "Numbers alone do not authorize repair. Identify a located, contextually justified voice issue or leave the variation intact." };
      } catch { failures.push("history-measurement-failed"); return null; }
    },
    finish(draft) {
      if (enabled && draft && stages.length) {
        const last = stages.at(-1);
        if (last.draft_digest === sha256(draft)) save(draft, "final", last.measurement, last.rhetoric);
        else failures.push("history-final-bytes-mismatch");
      }
      return { schema: "voice-history-run/1", status: failures.length ? "failed" : enabled ? "recorded" : "disabled",
        measurement_options: options,
        comparison_context: { register: job.context.register ?? null, form: job.context.form ?? null },
        scope: consent?.project ?? null, rhetorical_enabled: !!consent?.rhetoric, baseline: baseline ?? null,
        snapshot: config.snapshot ?? null, final_digest: sha256(draft), stages, calls,
        failures: [...new Set(failures)], semantic_interpretation: job.profile && job.samples?.length ? "see-voice-review" : "not-evaluated",
        interpretation: "Numerical history does not change the writing verdict or establish resemblance." };
    },
  };
}

export function verifyHistoryRun(result) {
  if (!result.telemetry) return { status: "not-evaluated" };
  try {
    const h = result.telemetry;
    if (h.schema !== "voice-history-run/1") throw new TypeError("Unknown telemetry version");
    if (h.final_digest !== sha256(result.draft)) throw new TypeError("Changed final text");
    if (h.baseline) {
      const { digest, ...body } = h.baseline;
      if (digest !== digestHistory(body)) throw new TypeError("Changed baseline");
    }
    let previous = null;
    for (const stage of h.stages) {
      const cycle = stage.stage === "draft" ? 0 : Number(stage.stage.replace("repair-", ""));
      const attempt = result.attempts.find((a) => a.cycle === cycle);
      if (!attempt || stage.draft_digest !== sha256(attempt.draft)) throw new TypeError("Changed stage bytes");
      if (JSON.stringify(stage.measurement) !== JSON.stringify(measureHistoryText(attempt.draft, h.measurement_options))) throw new TypeError("Measurement mismatch");
      validateStoredRhetoric(stage.rhetoric);
      const expected = compareHistoryMeasurement(stage.measurement, h.baseline, { ...h.comparison_context, rhetoric: stage.rhetoric });
      if (JSON.stringify(stage.comparison) !== JSON.stringify(expected)) throw new TypeError("Changed comparison");
      if (JSON.stringify(stage.changes) !== JSON.stringify(previous ? compareHistoryStages(previous, stage.measurement) : null)) throw new TypeError("Changed stage differences");
      previous = stage.measurement;
    }
    return { status: "passed", claim: "Numerical reproduction only; rhetorical labels are not independently re-evaluated." };
  } catch { return { status: "failed" }; }
}

/** Conversational skill's history commands. External documents require explicit selection. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { historyDirectory, readHistory, configureHistory, historyConsent, saveHistoryMeasurement, exportHistory, pinHistory, previewHistoryDeletion, deleteHistory, duplicateHistoryRecord } from "./history-store.mjs";
import { measureHistoryText } from "./history-measure.mjs";
import { measureRhetoric } from "./history-rhetoric.mjs";
import { buildHistoryReport, renderHistoryReport, compareHistoryMeasurement } from "./history-report.mjs";

export async function historyMain(args, { dispatch, signal } = {}) {
  const [op, ...rest] = args, value = (f) => { const i = rest.indexOf(f); return i < 0 ? null : rest[i + 1]; };
  const required = (f) => { const v = value(f); if (!v || v.startsWith("--")) throw new TypeError(`Missing ${f}`); return v; };
  const read = (p) => JSON.parse(readFileSync(p, "utf8"));
  const root = value("--store") ? resolve(required("--store")) : historyDirectory();
  if (op === "locate") return { directory: root, default_enabled: false };
  const identity = required("--identity");
  if (op === "configure") {
    const config = read(required("--config"));
    return configureHistory(root, identity, config);
  }
  const state = readHistory(root, identity);
  if (op === "show") return exportHistory(state);
  if (op === "report" || op === "pin") {
    const report = buildHistoryReport(state, { ...(value("--as-of") ? { now: required("--as-of") } : {}) });
    if (op === "pin") return pinHistory(root, identity, report);
    if (value("--out")) writeFileSync(resolve(required("--out")), renderHistoryReport(report), { flag: "wx", mode: 0o600 });
    return report;
  }
  if (op === "export") {
    writeFileSync(resolve(required("--out")), `${JSON.stringify(exportHistory(state), null, 2)}\n`, { flag: "wx", mode: 0o600 });
    return { status: "exported", includes_source_prose: false, independent_copy: true };
  }
  if (op === "delete-preview") return previewHistoryDeletion(state, value("--documents") ? read(required("--documents")) : null);
  if (op === "delete") return deleteHistory(root, identity, read(required("--preview")));
  if (!["ingest-preview", "ingest", "compare"].includes(op)) throw new TypeError("history: locate, configure, show, report, pin, export, delete-preview, delete, ingest-preview, ingest or compare");
  const jobPath = resolve(required("--job")), job = read(jobPath);
  if (job.schema !== "voice-history-ingest/1" || !Array.isArray(job.documents) || !job.documents.length) throw new TypeError("Expected explicitly selected history documents");
  const limit = job.rhetorical_call_limit ?? 10;
  if (!Number.isInteger(limit) || limit < 0 || limit > 10) throw new TypeError("Rhetorical batch call limit must be 0–10; start another explicit batch for more");
  const budget = { remaining: limit }, results = [];
  if (op === "ingest-preview") return { status: "preview", documents: job.documents.length,
    maximum_model_calls: Math.min(limit, job.documents.filter((d) => historyConsent(state, d.project ?? null).rhetoric).length), automatic_redraws: 0 };
  for (const document of job.documents) {
    if (!historyConsent(state, document.project ?? null).enabled && op !== "compare") { results.push({ status: "not-evaluated", reason: "scope-disabled" }); continue; }
    if (typeof document.file !== "string" || Object.hasOwn(document, "text")) throw new TypeError("Explicit source file required; inline text is not an ingestion contract");
    const text = readFileSync(resolve(dirname(jobPath), document.file), "utf8");
    if (op === "ingest") {
      const duplicate = duplicateHistoryRecord(readHistory(root, identity), { ...document, text });
      if (duplicate) { results.push({ status: "duplicate", record: duplicate.id }); continue; }
    }
    const measurement = measureHistoryText(text, document);
    const rhetoric = await measureRhetoric(text, { ...document, enabled: historyConsent(state, document.project ?? null).rhetoric,
      budget, adapter: job.adapter, signal }, { dispatch });
    if (op === "compare") {
      results.push({ measurement, rhetoric, comparison: compareHistoryMeasurement(measurement,
        buildHistoryReport(state, { exclude_document: document.document_id }), { register: document.register, form: document.form, rhetoric }) });
    } else {
      results.push({ ...saveHistoryMeasurement(root, identity, { ...document, text, measurement, rhetoric }), rhetorical_status: rhetoric.status,
        ...(rhetoric.call ? { call: rhetoric.call } : {}) });
    }
  }
  return { schema: "voice-history-batch/1", status: results.some((r) => r.status === "not-evaluated") ? "partial" : "completed", results,
    rhetorical_budget_used: limit - budget.remaining, maximum_model_calls: limit };
}

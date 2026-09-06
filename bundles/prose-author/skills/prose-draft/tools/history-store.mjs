/** Private per-identity numerical state. No prose, source paths, or raw model records. */
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, openSync, closeSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { validateHistoryMeasurement, measureHistoryText } from "./history-measure.mjs";
import { validateStoredRhetoric } from "./history-rhetoric.mjs";

export const HISTORY_STORE_VERSION = "voice-history-store/1";
export const HISTORY_RECORD_VERSION = "voice-history-record/1";
export const PROVENANCE = ["human-independent", "ai-assisted", "generated", "unknown"];
export const digestHistory = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const token = (v, name) => { if (typeof v !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(v)) throw new TypeError(`Invalid ${name}: use a short identifier, not prose or a path`); return v; };
const hex = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
export function historyDirectory(env = process.env, home = homedir()) {
  const path = env.PROSE_HISTORY_DIR || join(home, ".config", "prose-author", "history");
  if (!isAbsolute(path)) throw new TypeError("PROSE_HISTORY_DIR must be absolute");
  return path;
}
const identityDir = (root, identity) => {
  if (!isAbsolute(root)) throw new TypeError("History directory must be absolute");
  return join(root, digestHistory(token(identity, "identity")));
};
const keyed = (state, value) => createHmac("sha256", state.key).update(value).digest("hex");
export const historyProject = (project) => project === null ? null : digestHistory(token(project, "project"));
const stamp = () => new Date().toISOString();
function validateState(state) {
  if (state.schema !== HISTORY_STORE_VERSION || !hex(state.identity) || !hex(state.key) || !Number.isInteger(state.revision)
    || !Array.isArray(state.scopes) || !Array.isArray(state.records) || !Array.isArray(state.snapshots)) throw new TypeError("Malformed history store");
  for (const s of state.scopes) if ((s.project !== null && !hex(s.project)) || typeof s.enabled !== "boolean" || typeof s.rhetoric !== "boolean") throw new TypeError("Malformed history scope");
  for (const r of state.records) {
    if (r.schema !== HISTORY_RECORD_VERSION || !hex(r.document) || !hex(r.content) || !hex(r.revision_id)
      || !PROVENANCE.includes(r.provenance) || (r.project !== null && !hex(r.project))) throw new TypeError("Malformed numerical record");
    validateHistoryMeasurement(r.measurement);
    validateStoredRhetoric(r.rhetoric);
  }
  return state;
}
export function readHistory(root, identity) {
  const path = join(identityDir(root, identity), "state.json");
  if (!existsSync(path)) return null;
  const state = validateState(JSON.parse(readFileSync(path, "utf8")));
  if (state.identity !== digestHistory(identity)) throw new TypeError("Wrong history identity");
  return state;
}
function transact(root, identity, action) {
  const dir = identityDir(root, identity);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const lock = join(dir, ".writer.lock");
  let fd;
  try { fd = openSync(lock, "wx", 0o600); }
  catch (e) { if (e.code === "EEXIST") throw new Error("History has another or interrupted writer; inspect before recovering the lock"); throw e; }
  try {
    const state = readHistory(root, identity), { next, result } = action(state);
    if (next === null) { if (existsSync(join(dir, "state.json"))) unlinkSync(join(dir, "state.json")); }
    else if (next !== undefined) {
      validateState(next);
      const tmp = join(dir, `.state-${randomUUID()}.json`);
      try { writeFileSync(tmp, `${JSON.stringify(next)}\n`, { flag: "wx", mode: 0o600 }); renameSync(tmp, join(dir, "state.json")); }
      finally { if (existsSync(tmp)) unlinkSync(tmp); }
    }
    return result;
  } finally { closeSync(fd); unlinkSync(lock); }
}
export function configureHistory(root, identity, { project, enabled, rhetoric = false }) {
  if (project === undefined || typeof enabled !== "boolean" || typeof rhetoric !== "boolean") throw new TypeError("Explicit scope and enablement required");
  const scope = historyProject(project);
  return transact(root, identity, (previous) => {
    const state = previous ?? { schema: HISTORY_STORE_VERSION, identity: digestHistory(identity), key: randomBytes(32).toString("hex"), revision: 0, scopes: [], records: [], snapshots: [] };
    const next = { ...state, revision: state.revision + 1, scopes: [...state.scopes.filter((s) => s.project !== scope), { project: scope, enabled, rhetoric: enabled && rhetoric }] };
    return { next, result: { status: "saved", identity: state.identity, revision: next.revision, scope, enabled, rhetoric: enabled && rhetoric } };
  });
}
export function historyConsent(state, project) {
  if (!state) return { enabled: false, rhetoric: false };
  const scope = project == null ? null : historyProject(project);
  return state.scopes.find((s) => s.project === scope) ?? state.scopes.find((s) => s.project === null) ?? { enabled: false, rhetoric: false };
}
export function activeHistoryRecords(state, { exclude_document = null } = {}) {
  const latest = new Map();
  for (const r of state?.records ?? []) if (r.stage === "ingested" || r.stage === "final") latest.set(r.document, r);
  const exclude = exclude_document && state ? keyed(state, `document:${exclude_document}`) : null;
  const excludedContents = new Set((state?.records ?? []).filter((r) => r.document === exclude).map((r) => r.content));
  // Same body under another name is still one piece, even if explicitly reingested.
  const seen = new Set();
  return [...latest.values()].filter((r) => { const key = `${r.provenance}:${r.content}`;
    if (r.document === exclude || excludedContents.has(r.content) || seen.has(key)) return false; seen.add(key); return true; });
}
export function duplicateHistoryRecord(state, input) {
  if (!state) return null;
  const document = keyed(state, `document:${token(input.document_id, "document ID")}`);
  const revision = keyed(state, `revision:${token(input.revision_id, "revision ID")}`);
  const content = keyed(state, `body:${input.text.replace(/\s+/g, " ").trim()}`);
  return state.records.find((r) => r.stage === "ingested" && r.content === content && r.provenance === input.provenance
    && (r.document !== document || r.revision_id === revision)) ?? null;
}
export function saveHistoryMeasurement(root, identity, input) {
  token(input.document_id, "document ID"); token(input.revision_id, "revision ID");
  if (typeof input.text !== "string") throw new TypeError("Transient text needed for keyed duplicate detection");
  if (!PROVENANCE.includes(input.provenance)) throw new TypeError("Explicit authorship provenance required");
  const stage = input.stage ?? "ingested";
  if (!["ingested", "draft", "repair-1", "repair-2", "final"].includes(stage)) throw new TypeError("Invalid stage");
  for (const field of ["register", "form"]) if (input[field] != null) token(input[field], field);
  if (input.written_at != null && (!/^\d{4}-\d{2}-\d{2}$/.test(input.written_at) || !Number.isFinite(Date.parse(input.written_at))
    || new Date(input.written_at).toISOString().slice(0, 10) !== input.written_at)) throw new TypeError("Writing date must be a real YYYY-MM-DD date");
  validateHistoryMeasurement(input.measurement);
  if (digestHistory(input.measurement) !== digestHistory(measureHistoryText(input.text, input))) throw new TypeError("Source recount or analyzer divergence");
  validateStoredRhetoric(input.rhetoric ?? { status: "not-evaluated", reason: "disabled" });
  if (stage !== "ingested" && input.provenance !== "generated") throw new TypeError("Runtime stages must retain generated provenance");
  return transact(root, identity, (state) => {
    if (!historyConsent(state, input.project).enabled) return { result: { status: "not-evaluated", reason: "History collection is disabled for this scope" } };
    if (input.rhetoric?.status === "measured-estimate" && !historyConsent(state, input.project).rhetoric) throw new TypeError("Rhetorical storage is not enabled for this scope");
    const content = keyed(state, `body:${input.text.replace(/\s+/g, " ").trim()}`), document = keyed(state, `document:${input.document_id}`);
    const revision_id = keyed(state, `revision:${input.revision_id}`);
    const alias = state.records.find((r) => r.document !== document && r.content === content && r.provenance === input.provenance);
    if (alias && stage === "ingested") return { result: { status: "duplicate", record: alias.id } };
    const existing = state.records.find((r) => r.document === document && r.revision_id === revision_id && r.stage === stage);
    if (existing) {
      if (existing.content !== content || digestHistory(existing.measurement) !== digestHistory(input.measurement)) throw new TypeError("Revision already records different bytes or analyzer; use an explicit new revision");
      return { result: { status: "duplicate", record: existing.id } };
    }
    const record = { schema: HISTORY_RECORD_VERSION, id: randomUUID(), document, revision_id, content,
      ingested_at: stamp(), written_at: input.written_at ?? null, project: input.project == null ? null : historyProject(input.project),
      register: input.register ?? null, form: input.form ?? null, provenance: input.provenance, stage,
      measurement: input.measurement, rhetoric: input.rhetoric ?? { status: "not-evaluated", reason: "disabled" } };
    const next = { ...state, revision: state.revision + 1, records: [...state.records, record] };
    return { next, result: { status: "saved", record: record.id, revision: next.revision } };
  });
}
export function exportHistory(state) {
  if (!state) return { schema: HISTORY_STORE_VERSION, records: [], snapshots: [] };
  const { key, ...exported } = state;
  return exported;
}
export function pinHistory(root, identity, report) {
  return transact(root, identity, (state) => {
    if (!state) throw new TypeError("History identity does not exist");
    // Reports are produced by the report module, never caller prose; JSON roundtrip isolates references.
    if (report?.schema !== "voice-history-report/1" || report.identity !== state.identity) throw new TypeError("Wrong baseline identity or contract");
    const snapshot = { id: randomUUID(), created_at: stamp(), source_records: [...new Set(report.groups.flatMap((g) => g.record_ids))], report: JSON.parse(JSON.stringify(report)) };
    return { next: { ...state, revision: state.revision + 1, snapshots: [...state.snapshots, snapshot] }, result: { status: "saved", snapshot: snapshot.id } };
  });
}
export function previewHistoryDeletion(state, documents = null) {
  if (!state) throw new TypeError("History identity does not exist");
  if (documents !== null && (!Array.isArray(documents) || documents.some((d) => !hex(d)))) throw new TypeError("Select stored document identifiers");
  const records = state.records.filter((r) => documents === null || documents.includes(r.document)).map((r) => r.id);
  const snapshots = state.snapshots.filter((s) => documents === null || s.source_records.some((id) => records.includes(id))).map((s) => s.id);
  const selection = { identity: state.identity, revision: state.revision, documents, records, snapshots };
  return { ...selection, confirmation: digestHistory(selection) };
}
export function deleteHistory(root, identity, preview) {
  return transact(root, identity, (state) => {
    const actual = previewHistoryDeletion(state, preview.documents);
    if (actual.confirmation !== preview.confirmation) throw new TypeError("Deletion preview is stale or altered; preview again");
    return { next: preview.documents === null ? null : { ...state, revision: state.revision + 1,
      records: state.records.filter((r) => !actual.records.includes(r.id)), snapshots: state.snapshots.filter((s) => !actual.snapshots.includes(s.id)) },
      result: { status: "deleted", records: actual.records.length, snapshots: actual.snapshots.length, external_copies_removed: false } };
  });
}

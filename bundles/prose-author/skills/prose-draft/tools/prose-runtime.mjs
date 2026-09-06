#!/usr/bin/env node
/** Skill-internal entrypoint; user interaction stays in the invoking agent. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWriting, renderCurrentProfile } from "./writing-runtime.mjs";
import { readCurrentSamples, sha256 } from "./profile-v3.mjs";
import { initPreferenceStore, readPreferenceStore, applyPreferenceStore, undoPreferenceStore } from "./preference-store.mjs";
import { proposePreferencesV2, compileStyleV2, initPreferencesV2 } from "./preferences-v2.mjs";
import { verifyRuleReceipt } from "./style-rules.mjs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const write = (path, value) => writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
export function loadWritingJob(path) {
  const job = read(path), base = dirname(resolve(path)), at = (p) => resolve(base, p);
  if (job.profile_file) job.profile = read(at(job.profile_file));
  if (job.samples_dir) job.samples = readCurrentSamples(at(job.samples_dir));
  if (job.preference_store) job.preferences = readPreferenceStore(at(job.preference_store));
  if (job.source_file) job.source_text = readFileSync(at(job.source_file), "utf8");
  if (job.dependencies) for (const [k, p] of Object.entries(job.dependencies)) if (typeof p === "string") job.dependencies[k] = at(p);
  for (const k of ["profile_file", "samples_dir", "preference_store", "source_file"]) delete job[k];
  return job;
}

export async function runtimeMain(args, { dispatch, stdout = (s) => process.stdout.write(s), stderr = (s) => process.stderr.write(s), signal } = {}) {
  const [command, ...rest] = args;
  const value = (flag) => { const i = rest.indexOf(flag); return i < 0 ? null : rest[i + 1]; };
  const requireValue = (flag) => { const v = value(flag); if (!v || v.startsWith("--")) throw new TypeError(`Missing ${flag}`); return v; };
  if (command === "preferences") {
    const op = rest[0], store = resolve(requireValue("--store"));
    let result;
    if (op === "init") result = initPreferenceStore(store, requireValue("--id"));
    else if (op === "show") result = readPreferenceStore(store);
    else if (op === "propose") result = proposePreferencesV2(readPreferenceStore(store), read(requireValue("--feedback")));
    else if (op === "apply") result = applyPreferenceStore(store, read(requireValue("--proposal")), { accepted: (value("--accept") ?? "").split(",").filter(Boolean) });
    else if (op === "undo") result = undoPreferenceStore(store);
    else if (op === "compile") result = compileStyleV2(readPreferenceStore(store), {
      context: value("--context") ? read(value("--context")) : {}, profile: value("--profile") ? read(value("--profile")) : null });
    else throw new TypeError("preferences: init, show, propose, apply, undo or compile");
    stdout(`${JSON.stringify(result, null, 2)}\n`); return result;
  }
  if (command === "check-result") {
    const result = read(requireValue("--result")), draft = readFileSync(requireValue("--draft"), "utf8");
    const job = loadWritingJob(requireValue("--job"));
    const compiled = compileStyleV2(job.preferences ?? initPreferencesV2("task-local"), { profile: job.profile ?? null, context: job.context, overrides: job.rules ?? [] });
    const check = result.receipt?.draft_digest !== sha256(draft) ? { status: "failed", reason: "Published bytes differ from the run" }
      : verifyRuleReceipt(draft, compiled.rules, result.attempts.at(-1)?.mechanical);
    stdout(`${JSON.stringify(check)}\n`); return check;
  }
  if (!["run", "profile"].includes(command)) throw new TypeError("prose-runtime: run|profile --job job.json --out NEW-directory; preferences <operation>; check-result");
  const jobPath = requireValue("--job"), job = loadWritingJob(jobPath), out = resolve(requireValue("--out"));
  if (value("--harness")) job.adapter = { ...job.adapter, harness: value("--harness") };
  mkdirSync(dirname(out), { recursive: true });
  // Existing run directories are never reused: no silent redraw or overwrite.
  mkdirSync(out, { mode: 0o700 });
  write(join(out, "job.json"), job);
  let count = 0;
  const onCall = (record) => {
    count++;
    write(join(out, `call-${String(count).padStart(3, "0")}.json`), record);
    stderr(`${record.stage ?? "profile"}: ${record.result?.status ?? record.status}\n`);
  };
  let result;
  if ((command === "profile" || !job.profile) && job.samples?.length) {
    const rendered = await renderCurrentProfile({ id: job.profile_id ?? "working-voice", samples: job.samples, adapter: job.adapter }, { dispatch, onCall });
    write(join(out, "profile-result.json"), rendered);
    if (rendered.profile) { job.profile = rendered.profile; write(join(out, "profile.json"), rendered.profile); }
    if (command === "profile" || rendered.status !== "passed") result = rendered;
  } else if (command === "profile") result = { status: "not-evaluated", reason: "No corpus supplied", profile: null };
  write(join(out, "resolved-job.json"), job);
  if (!result) result = await runWriting(job, { dispatch, onCall, signal,
    onProgress: (event) => stderr(`${event.stage} (${event.calls} completed calls)\n`) });
  write(join(out, "result.json"), result);
  if (result.draft) write(join(out, "draft.md"), result.draft);
  stdout(`${JSON.stringify({ status: result.status, reason: result.reason ?? null, output_directory: out,
    draft: result.draft ? join(out, "draft.md") : null, report: join(out, "result.json"), model_call_records: count })}\n`);
  return result;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort()); process.once("SIGTERM", () => controller.abort());
  runtimeMain(process.argv.slice(2), { signal: controller.signal }).then((result) => {
    if (["failed", "refused", "incomplete", "ungated", "not-evaluated", "approval-required"].includes(result.status)) process.exitCode = 1;
  }).catch((e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 2; });
}

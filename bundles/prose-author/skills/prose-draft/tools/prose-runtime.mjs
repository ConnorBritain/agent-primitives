#!/usr/bin/env node
/** Skill-internal entrypoint; user interaction stays in the invoking agent. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWriting, renderCurrentProfile } from "./writing-runtime.mjs";
import { readCurrentSamples, sha256 } from "./profile-v3.mjs";
import { initPreferenceStore, readPreferenceStore, applyPreferenceStore, undoPreferenceStore, defaultPreferenceDirectory } from "./preference-store.mjs";
import { proposePreferencesV2, compileStyleV2, initPreferencesV2 } from "./preferences-v2.mjs";
import { verifyRuleReceipt } from "./style-rules.mjs";
import { discoveryCards, preferenceDiff, comparePreference } from "./style-session.mjs";
import { renderWritingReceipt, renderWritingDelivery } from "./writing-receipt.mjs";
import { historyMain } from "./history-cli.mjs";
import { verifyHistoryRun } from "./history-session.mjs";
import { canonicalHarness } from "./runtime-adapters.mjs";
import { identityMain, resolveWritingIdentity, resolveIdentity, identityDirectory } from "./identity-store.mjs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const write = (path, value) => writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
export function loadWritingJob(path, { resolveIdentity: useIdentity = true } = {}) {
  const input = read(path), base = dirname(resolve(path)), at = (p) => resolve(base, p);
  if (input.telemetry?.directory) input.telemetry.directory = at(input.telemetry.directory);
  const job = useIdentity ? resolveWritingIdentity(input) : input;
  for (const [file, inline] of [["profile_file", "profile"], ["samples_dir", "samples"], ["preference_store", "preferences"], ["source_file", "source_text"]]) {
    if (job[file] !== undefined && job[inline] !== undefined) throw new TypeError(`Supply ${file} or ${inline}, not both`);
  }
  if (job.profile_file) job.profile = read(at(job.profile_file));
  if (job.samples_dir) job.samples = readCurrentSamples(at(job.samples_dir));
  if (job.preference_store) job.preferences = readPreferenceStore(at(job.preference_store));
  if (job.source_file) job.source_text = readFileSync(at(job.source_file), "utf8");
  if (job.telemetry?.directory) job.telemetry.directory = at(job.telemetry.directory);
  if (job.adapter) job.adapter = { ...job.adapter, harness: canonicalHarness(job.adapter.harness) };
  if (job.dependencies) for (const [k, p] of Object.entries(job.dependencies)) if (typeof p === "string") job.dependencies[k] = at(p);
  for (const k of ["profile_file", "samples_dir", "preference_store", "source_file"]) delete job[k];
  return job;
}

export async function runtimeMain(args, { dispatch, stdout = (s) => process.stdout.write(s), stderr = (s) => process.stderr.write(s), signal } = {}) {
  const started = Date.now();
  const [command, ...rest] = args;
  const value = (flag) => { const i = rest.indexOf(flag); return i < 0 ? null : rest[i + 1]; };
  const requireValue = (flag) => { const v = value(flag); if (!v || v.startsWith("--")) throw new TypeError(`Missing ${flag}`); return v; };
  if (command === "identity") {
    const result = identityMain(rest);
    stdout(`${JSON.stringify(result, null, 2)}\n`); return result ?? { status: "not-evaluated", reason: "No writing identity configured" };
  }
  if (command === "history") {
    const result = await historyMain(rest, { dispatch, signal });
    stdout(`${JSON.stringify(result, null, 2)}\n`); return result;
  }
  if (command === "preferences") {
    const op = rest[0];
    const operations = { locate: [], init: ["--id"], show: [], propose: ["--feedback"], apply: ["--proposal", "--accept"],
      undo: [], discover: ["--profile", "--offset", "--limit"], diff: ["--from"],
      compare: ["--decision", "--rule", "--context", "--profile"], compile: ["--context", "--profile"] };
    if (!Object.hasOwn(operations, op)) throw new TypeError("Unknown preferences operation");
    const seen = new Set();
    for (let i = 1; i < rest.length; i += 2) {
      if (!["--store", "--registry", "--writing-identity", ...operations[op]].includes(rest[i]) || seen.has(rest[i])) throw new TypeError("Unknown or duplicate preference flag");
      if (!rest[i + 1] || rest[i + 1].startsWith("--")) throw new TypeError(`Missing ${rest[i]}`);
      seen.add(rest[i]);
    }
    const selected = rest.includes("--writing-identity") || !rest.includes("--store")
      ? resolveIdentity(value("--registry") ? resolve(requireValue("--registry")) : identityDirectory(), value("--writing-identity") ?? undefined) : null;
    if (selected && !selected.preference_store && !rest.includes("--store")) throw new TypeError("Selected identity has no preference store; register one explicitly");
    const store = rest.includes("--store") ? resolve(requireValue("--store")) : selected?.preference_store ?? defaultPreferenceDirectory();
    let result;
    if (op === "locate") result = { directory: store, exists: existsSync(join(store, "current.json")),
      preference_id: existsSync(join(store, "current.json")) ? readPreferenceStore(store).id : null };
    else if (op === "init") result = initPreferenceStore(store, requireValue("--id"));
    else if (op === "show") result = readPreferenceStore(store);
    else if (op === "propose") result = proposePreferencesV2(readPreferenceStore(store), read(requireValue("--feedback")));
    else if (op === "apply") result = applyPreferenceStore(store, read(requireValue("--proposal")), { accepted: (value("--accept") ?? "").split(",").filter(Boolean) });
    else if (op === "undo") result = undoPreferenceStore(store);
    else if (op === "discover") result = discoveryCards(readPreferenceStore(store), {
      profile: value("--profile") ? read(value("--profile")) : null,
      offset: Number(value("--offset") ?? 0), limit: Number(value("--limit") ?? 3) });
    else if (op === "diff") result = preferenceDiff(read(requireValue("--from")), readPreferenceStore(store));
    else if (op === "compare") result = comparePreference(readPreferenceStore(store), {
      decision_id: requireValue("--decision"), rule: read(requireValue("--rule")),
      context: read(requireValue("--context")), profile: value("--profile") ? read(value("--profile")) : null });
    else if (op === "compile") result = compileStyleV2(readPreferenceStore(store), {
      context: value("--context") ? read(value("--context")) : {}, profile: value("--profile") ? read(value("--profile")) : null });
    else throw new TypeError("preferences: locate, init, show, propose, apply, undo, discover, diff, compare or compile");
    stdout(`${JSON.stringify(result, null, 2)}\n`); return result;
  }
  if (command === "check-result") {
    const result = read(requireValue("--result")), draft = readFileSync(requireValue("--draft"), "utf8");
    const job = loadWritingJob(requireValue("--job"), { resolveIdentity: false });
    const compiled = compileStyleV2(job.preferences ?? initPreferencesV2("task-local"), { profile: job.profile ?? null, context: job.context, overrides: job.rules ?? [] });
    const reproduced = result.receipt?.draft_digest !== sha256(draft) ? { status: "failed", reason: "Published bytes differ from the run" }
      : verifyRuleReceipt(draft, compiled.rules, result.attempts.at(-1)?.mechanical);
    const delivery = value("--delivery");
    const deliveryMatches = !delivery || (result.draft === draft
      && readFileSync(delivery, "utf8") === renderWritingDelivery(result, renderWritingReceipt(result, job)));
    const telemetry = verifyHistoryRun(result);
    const check = { schema: "prose-result-verification/1", status: reproduced.reproduced === true && deliveryMatches && telemetry.status !== "failed" ? "passed" : "failed",
      result_status: result.status, mechanical_status: reproduced.status, reason: reproduced.reason,
      telemetry_status: telemetry.status,
      delivery_status: delivery ? (deliveryMatches ? "passed" : "failed") : "not-evaluated",
      claim: "Receipt integrity only; existing check statuses are unchanged, not upgraded." };
    if (!deliveryMatches) check.reason = "Delivery file differs from the recorded prose and generated receipt";
    stdout(`${JSON.stringify(check)}\n`); return check;
  }
  if (!["run", "profile"].includes(command)) throw new TypeError("prose-runtime: run|profile --job job.json --out NEW-directory; identity|preferences|history <operation>; check-result");
  const jobPath = requireValue("--job"), job = loadWritingJob(jobPath), out = resolve(requireValue("--out"));
  if (value("--harness")) job.adapter = { ...job.adapter, harness: canonicalHarness(value("--harness")) };
  if (job.profile_policy !== undefined && !["auto", "none"].includes(job.profile_policy)) throw new TypeError("profile_policy must be auto or none");
  if (job.profile_policy === "none" && job.profile) throw new TypeError("profile_policy none cannot also supply a profile");
  mkdirSync(dirname(out), { recursive: true });
  // Existing run directories are never reused: no silent redraw or overwrite.
  mkdirSync(out, { mode: 0o700 });
  write(join(out, "job.json"), job);
  let count = 0, dispatched = 0, modelElapsed = 0;
  const onCall = (record) => {
    count++;
    const call = record.result ?? record;
    if (call.dispatched) dispatched++;
    modelElapsed += call.elapsed_ms ?? 0;
    write(join(out, `call-${String(count).padStart(3, "0")}.json`), record);
    stderr(`${record.stage ?? "profile"}: ${record.result?.status ?? record.status}\n`);
  };
  let result;
  if ((command === "profile" || (!job.profile && job.profile_policy !== "none")) && job.samples?.length) {
    const rendered = await renderCurrentProfile({ id: job.profile_id ?? "working-voice", samples: job.samples, adapter: job.adapter }, { dispatch, onCall, signal });
    write(join(out, "profile-result.json"), rendered);
    if (rendered.profile) { job.profile = rendered.profile; write(join(out, "profile.json"), rendered.profile); }
    if (command === "profile" || rendered.status !== "passed") result = rendered;
  } else if (command === "profile") result = { status: "not-evaluated", reason: "No corpus supplied", profile: null };
  write(join(out, "resolved-job.json"), job);
  if (!result) result = await runWriting(job, { dispatch, onCall, signal,
    onProgress: (event) => stderr(`${event.stage} (${event.calls} completed calls)\n`) });
  // Covers preparation/profile calls as well as the writing pipeline's own receipt.
  const rhetoricalCalls = result.telemetry?.calls ?? [];
  result.invocation = { model_calls: dispatched + rhetoricalCalls.filter((c) => c.dispatched).length, model_call_records: count + rhetoricalCalls.length,
    model_elapsed_ms: modelElapsed + rhetoricalCalls.reduce((n, c) => n + c.elapsed_ms, 0),
    elapsed_ms: Date.now() - started, input_digest: sha256(readFileSync(join(out, "job.json"), "utf8")),
    resolved_input_digest: sha256(readFileSync(join(out, "resolved-job.json"), "utf8")) };
  write(join(out, "result.json"), result);
  if (result.telemetry) write(join(out, "history.json"), result.telemetry);
  if (result.draft) write(join(out, "draft.md"), result.draft);
  if (command === "run") {
    const receipt = renderWritingReceipt(result, job);
    write(join(out, "receipt.md"), receipt);
    write(join(out, "delivery.md"), renderWritingDelivery(result, receipt));
  }
  stdout(`${JSON.stringify({ status: result.status, reason: result.reason ?? null, output_directory: out,
    draft: result.draft ? join(out, "draft.md") : null, report: join(out, "result.json"),
    delivery: command === "run" ? join(out, "delivery.md") : null, model_call_records: count })}\n`);
  return result;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort()); process.once("SIGTERM", () => controller.abort());
  runtimeMain(process.argv.slice(2), { signal: controller.signal }).then((result) => {
    if (["failed", "refused", "incomplete", "ungated", "not-evaluated", "approval-required"].includes(result.status)) process.exitCode = 1;
  }).catch((e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 2; });
}

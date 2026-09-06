#!/usr/bin/env node
/** Zero-model-call audit of retained installed artifacts; never rewrites a failed conversation report. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
const value = (f) => { const i = process.argv.indexOf(f); if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${f}`); return process.argv[i + 1]; };
const out = resolve(value("--conversation")), skill = resolve(value("--skill"));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const original = JSON.parse(readFileSync(join(out, "REPORT.json"), "utf8"));
const paths = walk(out).filter((p) => p.endsWith("/result.json") && JSON.parse(readFileSync(p)).schema === "prose-writing-result/1");
const checks = [];
let result = null;
try {
  assert.equal(paths.length, 1, "Exactly one writing run"); checks.push("single-writing-run");
  const path = paths[0], dir = dirname(path); result = JSON.parse(readFileSync(path));
  assert.equal(result.status, "checked"); assert.equal(result.telemetry.status, "recorded");
  assert.equal(result.telemetry.stages[0].rhetoric.status, "measured-estimate"); checks.push("writing-and-rhetoric-recorded");
  assert.equal(result.invocation.model_calls, 3); checks.push("one-draft-one-review-one-rhetorical-call");
  const verified = spawnSync(process.execPath, [join(skill, "tools/prose-runtime.mjs"), "check-result", "--result", path,
    "--draft", join(dir, "draft.md"), "--job", join(dir, "resolved-job.json"), "--delivery", join(dir, "delivery.md")], { encoding: "utf8", timeout: 30000 });
  assert.equal(verified.status, 0, verified.stdout || verified.stderr);
  const integrity = JSON.parse(verified.stdout); assert.equal(integrity.telemetry_status, "passed"); checks.push("exact-delivery-and-numerical-reproduction");
  const exported = JSON.parse(readFileSync(join(out, "history-export.json"))), disabled = JSON.parse(readFileSync(join(out, "history-disabled.json")));
  assert.equal(exported.key, undefined); assert.equal(exported.records.filter((r) => r.provenance === "human-independent").length, 5);
  assert.ok(exported.records.some((r) => r.provenance === "generated" && r.stage === "final"));
  assert.doesNotMatch(JSON.stringify(exported), /We write a clear sentence|Thanks for inviting me/); checks.push("numbers-only-export-and-separated-provenance");
  const history = await import(pathToFileURL(join(skill, "tools/history-store.mjs")));
  assert.equal(disabled.records.length, exported.records.length); assert.equal(history.historyConsent(disabled, "integration-test").enabled, false);
  assert.equal(history.readHistory(join(out, "test-history"), "history-conversation-test"), null); checks.push("disable-retains-records-and-targeted-deletion-finishes");
  const preferences = await import(pathToFileURL(join(skill, "tools/preference-store.mjs")));
  assert.equal(preferences.readPreferenceStore(join(out, "test-preferences")).revision, 1); checks.push("saved-preferences-unchanged");
  const report = { schema: "voice-history-installed-recheck/1", status: "passed", new_model_calls: 0, checks,
    original_conversation_status: original.status, original_conversation_error: original.error ? "retained-in-original-report" : null,
    host_summary: original.chat_receipt ?? "unverified-unlabeled-host-paraphrase", original_report_unchanged: true,
    runtime_calls: result.invocation.model_calls, runtime_elapsed_ms: result.invocation.model_elapsed_ms };
  writeFileSync(join(out, "ARTIFACT-RECHECK.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 }); console.log(JSON.stringify(report));
} catch (e) { console.error(e.stack); process.exitCode = 1; }

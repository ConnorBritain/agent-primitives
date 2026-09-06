#!/usr/bin/env node
/** Recheck existing live evidence with an installed entrypoint; no model calls. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${flag}`);
  return realpathSync(process.argv[i + 1]);
};
const skill = arg("--skill"), artifact = arg("--artifact");
const i = process.argv.indexOf("--out");
if (i < 0 || !process.argv[i + 1]) throw new Error("Missing --out");
const out = resolve(process.argv[i + 1]);
mkdirSync(out, { mode: 0o700 });
const save = (name, value) => writeFileSync(join(out, name), typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const hash = (s) => createHash("sha256").update(s).digest("hex");
const draft = readFileSync(join(artifact, "draft.md"), "utf8");
const records = [];
let error = null;
try {
  // A trailing space changes bytes, not the words or punctuation being checked.
  save("changed-draft.md", draft + " ");
  for (const [name, path, exit] of [["original", join(artifact, "draft.md"), 0], ["changed", join(out, "changed-draft.md"), 1]]) {
    const args = [join(skill, "tools/prose-runtime.mjs"), "check-result", "--result", join(artifact, "result.json"), "--draft", path, "--job", join(artifact, "resolved-job.json")];
    const run = spawnSync(process.execPath, args, { encoding: "utf8", timeout: 30000 });
    const record = { name, exit: run.status, stdout: run.stdout, stderr: run.stderr, error: run.error?.message ?? null };
    records.push(record);
    assert.equal(run.status, exit, JSON.stringify(record));
    const result = JSON.parse(run.stdout);
    assert.equal(result.status, name === "original" ? "passed" : "failed");
    if (name === "changed") assert.match(result.reason, /bytes differ/);
  }
} catch (e) { error = e.stack; }
const report = { schema: "installed-final-byte-evidence/1", status: error ? "failed" : "passed", skill,
  input_hashes: Object.fromEntries(["result.json", "resolved-job.json", "draft.md"].map((f) => [f, hash(readFileSync(join(artifact, f)))])),
  changed_draft_digest: hash(draft + " "), model_calls: 0, records, error,
  limits: ["Detects an external edit when check-result is invoked; does not prevent a host from bypassing that invocation."] };
save("REPORT.json", report);
console.log(JSON.stringify({ status: report.status, model_calls: 0, error }));
process.exitCode = error ? 1 : 0;

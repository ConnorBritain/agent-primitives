#!/usr/bin/env node
/** Installed transport lifecycle test. The child is a local fixture, never a model. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, chmodSync, realpathSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const value = (flag) => {
  const i = process.argv.indexOf(flag);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${flag}`);
  return process.argv[i + 1];
};
const skill = realpathSync(value("--skill")), harness = value("--harness"), out = resolve(value("--out"));
const probe = process.argv.includes("--hang-probe") ? value("--hang-probe") : "none";
assert.ok(["claude", "codex"].includes(harness));
assert.ok(["none", "registry", "capability"].includes(probe));
// Windows process termination differs; do not pretend this POSIX fixture covers it.
if (process.platform === "win32") throw new Error("POSIX signal fixture; Windows interruption remains unverified");
mkdirSync(out, { mode: 0o700 });
const save = (name, data) => writeFileSync(join(out, name), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const executable = join(out, "fixture-cli.mjs");
save("fixture-cli.mjs", `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const probe = ${JSON.stringify(probe)};
const stage = process.argv.includes("--help") ? "capability" : process.argv.includes("plugin") ? "registry" : "generation";
if (stage === "capability" && probe !== stage) {
  console.log("--ignore-user-config --ignore-rules --ephemeral --json --output-schema --tools --strict-mcp-config --setting-sources --disable-slash-commands --no-session-persistence --json-schema");
} else if (stage === "registry" && probe !== stage) {
  console.log(JSON.stringify(${harness === "codex" ? '{ installed: [] }' : '[]'}));
} else {
  process.stdin.resume();
  process.on("SIGTERM", () => {}); // Exercise the adapter's bounded SIGKILL fallback.
  const event = { fixture_started: true, stage, pid: process.pid, cwd: process.cwd() };
  appendFileSync(${JSON.stringify(join(out, "children.jsonl"))}, JSON.stringify(event) + "\\n");
  console.log(JSON.stringify(event));
  setInterval(() => {}, 1000);
  setTimeout(() => process.exit(42), 25000); // Test-fixture failsafe, not production timeout evidence.
}
`);
chmodSync(executable, 0o700);
const job = { schema: "prose-writing-job/1", mode: "draft", brief: "Write a brief reply.",
  context: { form: "reply", purpose: "test interruption" },
  adapter: { harness, executable, timeout_ms: 1000 } };
save("job.json", job);
const started = Date.now();
const run = spawnSync(process.execPath, [join(skill, "tools/prose-runtime.mjs"), "run", "--job", join(out, "job.json"), "--out", join(out, "writing")],
  { encoding: "utf8", timeout: 35000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024 });
save("stdout.txt", run.stdout ?? ""); save("stderr.txt", run.stderr ?? "");
let error = null, result = null;
try {
  assert.equal(run.error, undefined, run.error?.message);
  assert.equal(run.status, 1, "Interrupted generation must not exit successfully");
  result = JSON.parse(readFileSync(join(out, "writing/result.json")));
  assert.equal(result.status, "ungated");
  assert.match(result.reason, probe === "capability" ? /unavailable or incompatible/ : /timed out/);
  assert.equal(result.draft, ""); assert.equal(result.attempts.length, 0);
  assert.equal(result.invocation.model_calls, probe === "capability" ? 0 : 1, "No generation after a failed capability check, and no retry");
  const children = readFileSync(join(out, "children.jsonl"), "utf8").trim().split(/\r?\n/).map((s) => JSON.parse(s));
  assert.deepEqual(children.map((c) => c.stage), probe === "none" ? ["generation"] : probe === "registry" ? ["registry", "generation"] : ["capability"]);
  for (const child of children) {
    if (child.stage === "generation") assert.equal(existsSync(child.cwd), false, "Disposable call context must be cleaned up");
    assert.throws(() => process.kill(child.pid, 0), { code: "ESRCH" }, "Interrupted fixture child must not remain live");
  }
  assert.match(readFileSync(join(out, "writing/delivery.md"), "utf8"), /Status: ungated/);
  assert.ok(Date.now() - started < (probe === "none" ? 14000 : 23000), "Termination must precede the fixture's failsafe even when SIGTERM is ignored");
} catch (e) { error = e.stack; }
const report = { schema: "installed-interruption-evidence/1", status: error ? "failed" : "passed", harness, skill, probe,
  elapsed_ms: Date.now() - started, fixture_dispatches: result?.invocation?.model_calls ?? null,
  actual_model_calls: 0, runtime_status: result?.status ?? null, error,
  limits: ["Actual installed entrypoint and child process, but the CLI child is a local fixture with no network or credentials.",
    "Exercises POSIX timeout and forced termination; does not establish Windows signal behavior or provider-side cancellation."] };
save("REPORT.json", report); console.log(JSON.stringify(report)); process.exitCode = error ? 1 : 0;

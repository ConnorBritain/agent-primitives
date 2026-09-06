#!/usr/bin/env node
/** One installed profile-guided runtime invocation; reuse recorded licensed evidence. */
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const value = (flag) => {
  const i = process.argv.indexOf(flag);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${flag}`);
  return process.argv[i + 1];
};
const harness = value("--harness"), skill = realpathSync(value("--skill")), out = resolve(value("--out"));
assert.ok(["codex", "claude"].includes(harness));
const HERE = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const design = read(join(HERE, "fixtures/v040/COMPARISON-DESIGN.json"));
const evidence = join(HERE, "runs/2026-09-06-v040-bounded"), author = "doctorow-blog";
const form = design.forms.find((f) => f.id === "outline-blog");
const job = { schema: "prose-writing-job/1", mode: form.mode, brief: form.brief,
  context: form.context, facts: design.facts, profile: read(join(evidence, "profiles", `${author}.json`)).profile,
  samples: read(join(evidence, "inputs", `${author}.json`)), adapter: { harness },
  rules: [...design.shared_rules, { id: "length", kind: "word-limit", directive: `Use ${form.minimum}–${form.maximum} words.`, minimum: form.minimum, maximum: form.maximum }] };
mkdirSync(out, { mode: 0o700 });
const save = (name, value) => writeFileSync(join(out, name), typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
save("job.json", job);
const started = Date.now();
console.log(`${harness}: installed profile-guided draft/review, using a recorded profile`);
const run = spawnSync(process.execPath, [join(skill, "tools/prose-runtime.mjs"), "run", "--job", join(out, "job.json"), "--out", join(out, "writing")], { encoding: "utf8", timeout: 600000, maxBuffer: 8 * 1024 * 1024 });
save("stdout.txt", run.stdout ?? ""); save("stderr.txt", run.stderr ?? "");
let error = null, result = null;
try {
  result = read(join(out, "writing/result.json"));
  assert.ok(result.draft.length > 0, result.reason);
  assert.ok(result.calls.every((c) => c.stage !== "profile"), "Must reuse the existing profile");
  assert.ok(result.attempts.length > 0 && result.attempts.length <= 3);
  for (const attempt of result.attempts) {
    const review = attempt.reviews.find((r) => r.stage === "voice-review");
    assert.ok(review, "Each attempted draft must receive voice review");
    assert.notEqual(review.status, "not-evaluated", review.reason);
    assert.deepEqual(review.result.instructions.map((r) => r.id).sort(), [...job.profile.observations.map((o) => o.id), ...job.rules.map((r) => r.id)].sort());
  }
  assert.equal(result.status, "checked", result.reason);
  const checked = spawnSync(process.execPath, [join(skill, "tools/prose-runtime.mjs"), "check-result", "--result", join(out, "writing/result.json"), "--draft", join(out, "writing/draft.md"), "--job", join(out, "writing/resolved-job.json")], { encoding: "utf8", timeout: 30000 });
  save("final-check.json", { exit: checked.status, stdout: checked.stdout, stderr: checked.stderr });
  assert.equal(checked.status, 0, checked.stdout || checked.stderr);
} catch (e) { error = e.stack; }
const report = { schema: "installed-profile-evidence/1", status: error ? "failed" : "passed", harness, skill,
  runtime_status: result?.status ?? null, reason: result?.reason ?? run.error?.message ?? null,
  model_calls: result?.invocation?.model_calls ?? null, model_elapsed_ms: result?.invocation?.model_elapsed_ms ?? null,
  elapsed_ms: Date.now() - started, attempts: result?.attempts.length ?? 0,
  omissions: result?.omitted ?? [], error,
  limits: ["One licensed author and one writing form; not an implicit skill-discovery or resemblance test.", "Existing profile reused; no profile redraw or comparison regeneration.", "A failed invocation remains recorded; do not rerun to obtain a favorable result."] };
save("REPORT.json", report); console.log(JSON.stringify(report)); process.exitCode = error ? 1 : 0;

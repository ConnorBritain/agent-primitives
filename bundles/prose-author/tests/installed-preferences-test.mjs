#!/usr/bin/env node
/** Installed entrypoint exercise. Isolated test identity; optional bounded live draft. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const save = (p, value) => writeFileSync(p, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });

export async function verifyInstalledPreferences({ skill, out, harness, live = false }) {
  assert.ok(["codex", "claude"].includes(harness), "Choose an implemented harness");
  skill = realpathSync(skill); out = resolve(out);
  mkdirSync(out, { mode: 0o700 }); // No overwrite or silent replacement of evidence.
  mkdirSync(join(out, "steps"));
  const tools = join(skill, "tools"), entrypoint = join(tools, "prose-runtime.mjs");
  const { checkRules } = await import(pathToFileURL(join(tools, "style-rules.mjs")));
  const { assembleProfileV3 } = await import(pathToFileURL(join(tools, "profile-v3.mjs")));
  const store = join(out, "test-preferences"), steps = [], assertions = [];
  const check = (name, fn) => { fn(); assertions.push(name); };
  const invoke = (args, { allowFailure = false } = {}) => {
    const started = Date.now();
    const r = spawnSync(process.execPath, [entrypoint, ...args], { encoding: "utf8", timeout: 600000, maxBuffer: 8 * 1024 * 1024 });
    const record = { args, exit: r.status, elapsed_ms: Date.now() - started, stdout: r.stdout, stderr: r.stderr, error: r.error?.message ?? null };
    save(join(out, "steps", `${String(steps.length + 1).padStart(3, "0")}.json`), record);
    steps.push({ args, exit: r.status, elapsed_ms: record.elapsed_ms });
    if (!allowFailure) assert.equal(r.status, 0, r.stderr || r.error?.message);
    return { value: r.stdout?.trim() ? JSON.parse(r.stdout) : null, exit: r.status };
  };
  const prefs = (op, args = [], opts) => invoke(["preferences", op, "--store", store, ...args], opts).value;
  const context = join(out, "reply-context.json"); save(context, { form: "reply", purpose: "decline" });
  const otherContext = join(out, "notice-context.json"); save(otherContext, { form: "notice", purpose: "announce" });
  let result = null, error = null;
  try {
    const initial = prefs("init", ["--id", "installed-verification-only"]);
    const feedback = {
      feedback: "Never use exclamation marks in replies.",
      operations: [{ id: "save-reply-exclamations", kind: "upsert", decision: {
        id: "reply-exclamations", feature: "exclamation-marks", binding: null,
        scope: { registers: [], forms: ["reply"], audiences: [], purposes: [], projects: [] },
        rule: { id: "reply-exclamations", kind: "punctuation", directive: "Never use exclamation marks in replies.", characters: "!", minimum: 0, maximum: 0 },
      } }],
    };
    save(join(out, "feedback.json"), feedback);
    const proposal = prefs("propose", ["--feedback", join(out, "feedback.json")]);
    save(join(out, "proposal.json"), proposal);
    const applied = prefs("apply", ["--proposal", join(out, "proposal.json")]);
    check("clear persistent feedback saves with scope, revision and undo", () => {
      assert.equal(applied.status, "saved"); assert.equal(applied.receipt.revision, 2);
      assert.deepEqual(applied.receipt.scopes[0].scope.forms, ["reply"]); assert.match(applied.receipt.undo, /revision 1/);
    });
    const reopened = prefs("show"), compiled = prefs("compile", ["--context", context]);
    check("a new process applies the saved rule and rejects an exact-zero violation", () => {
      assert.equal(reopened.revision, 2); assert.equal(compiled.rules[0].id, "reply-exclamations");
      assert.equal(checkRules("Thank you!", compiled.rules).status, "failed");
      assert.equal(checkRules("Thank you.", compiled.rules).status, "passed");
    });
    const elsewhere = prefs("compile", ["--context", otherContext]);
    check("the rule stays out of other writing forms", () => assert.deepEqual(elsewhere.rules, []));
    const profile = assembleProfileV3({ id: "limited-test-evidence", samples: [{
      id: "short-note", author: "Test Writer", source: "synthetic engineering fixture", human_authored: true, text: "A brief note (with an aside).",
    }] });
    save(join(out, "profile.json"), profile);
    const refreshed = prefs("compile", ["--context", context, "--profile", join(out, "profile.json")]);
    check("an independent saved rule survives supplying a refreshed profile", () => assert.deepEqual(refreshed.rules, compiled.rules));
    const discovery = prefs("discover");
    check("preference-only discovery gives three questions without claiming learned evidence", () => {
      assert.equal(discovery.cards.length, 3); assert.ok(discovery.cards.every((c) => c.status === "not-evaluated"));
    });
    save(join(out, "comparison-rule.json"), { ...feedback.operations[0].decision.rule, maximum: 1 });
    const compared = prefs("compare", ["--context", context, "--decision", "reply-exclamations", "--rule", join(out, "comparison-rule.json")]);
    check("a one-feature comparison changes only its temporary variant", () => {
      assert.equal(compared.saved, false); assert.equal(compared.variants[0].style.rules[0].maximum, 0);
      assert.equal(compared.variants[1].style.rules[0].maximum, 1); assert.equal(prefs("show").revision, 2);
    });
    save(join(out, "inferred-feedback.json"), { ...feedback, feedback: "Quieter." });
    const inferred = prefs("propose", ["--feedback", join(out, "inferred-feedback.json")]);
    save(join(out, "inferred-proposal.json"), inferred);
    const unapproved = prefs("apply", ["--proposal", join(out, "inferred-proposal.json")], { allowFailure: true });
    check("one-word inferred feedback needs approval and cannot silently save", () => {
      assert.equal(unapproved.status, "approval-required"); assert.equal(prefs("show").revision, 2);
    });
    if (live) {
      const job = read(join(HERE, "fixtures/v040/smoke-job.json"));
      job.preference_store = store; job.adapter.harness = harness;
      save(join(out, "writing-job.json"), job);
      process.stdout.write(`${harness}: drafting from installed runtime with saved reply preference\n`);
      invoke(["run", "--job", join(out, "writing-job.json"), "--out", join(out, "writing")], { allowFailure: true });
      result = read(join(out, "writing/result.json"));
      check("installed generation applies the persistent correction to its delivered bytes", () => {
        assert.equal(result.status, "checked", result.reason);
        assert.ok(result.receipt.active_preferences.includes("reply-exclamations"));
        assert.equal(result.receipt.preference_revision, 2);
        assert.equal(result.attempts.at(-1).mechanical.checks.find((c) => c.id === "reply-exclamations").actual, 0);
      });
      invoke(["check-result", "--result", join(out, "writing/result.json"), "--draft", join(out, "writing/draft.md"), "--job", join(out, "writing/resolved-job.json")]);
    }
    const undone = prefs("undo"), afterUndo = prefs("compile", ["--context", context]);
    check("undo removes the rule in a new process without erasing revision history", () => {
      assert.equal(undone.revision, 3); assert.deepEqual(undone.decisions, initial.decisions);
      assert.deepEqual(afterUndo.rules, []); assert.equal(checkRules("Thank you!", afterUndo.rules).status, "not-evaluated");
      assert.equal(prefs("show").revision, 3);
    });
    const missing = read(join(HERE, "fixtures/v040/smoke-job.json"));
    missing.adapter = { harness, executable: join(out, "nonexistent-cli") };
    save(join(out, "missing-cli-job.json"), missing);
    invoke(["run", "--job", join(out, "missing-cli-job.json"), "--out", join(out, "missing-cli")], { allowFailure: true });
    const unavailable = read(join(out, "missing-cli/result.json"));
    check("an unavailable installed adapter returns ungated with no model dispatch", () => {
      assert.equal(unavailable.status, "ungated"); assert.equal(unavailable.invocation.model_calls, 0); assert.equal(unavailable.draft, "");
    });
  } catch (e) { error = e.stack; }
  const report = { schema: "installed-preference-evidence/1", status: error ? "failed" : "passed", harness, skill,
    live, model_calls: result?.invocation?.model_calls ?? 0, model_elapsed_ms: result?.invocation?.model_elapsed_ms ?? 0,
    assertions, error, steps, limits: ["Tests an isolated synthetic identity, not the user's actual style preferences.", "CLI entrypoint exercise, not proof of conversational skill selection or prose quality."] };
  save(join(out, "REPORT.json"), report);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = (flag) => process.argv[process.argv.indexOf(flag) + 1];
  for (const flag of ["--skill", "--out", "--harness"]) if (!process.argv.includes(flag)) throw new Error(`Missing ${flag}`);
  const report = await verifyInstalledPreferences({ skill: value("--skill"), out: value("--out"), harness: value("--harness"), live: process.argv.includes("--live") });
  console.log(JSON.stringify({ status: report.status, assertions: report.assertions.length, model_calls: report.model_calls, error: report.error }));
  process.exitCode = report.status === "passed" ? 0 : 1;
}

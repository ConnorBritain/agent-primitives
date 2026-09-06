#!/usr/bin/env node
/** Two fresh agent conversations invoking an installed skill. Never touches the real preference store. */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, realpathSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const value = (flag) => process.argv[process.argv.indexOf(flag) + 1];
for (const flag of ["--harness", "--skill", "--out"]) if (!process.argv.includes(flag)) throw new Error(`Missing ${flag}`);
const harness = value("--harness"), skill = realpathSync(value("--skill")), out = resolve(value("--out"));
assert.ok(["codex", "claude"].includes(harness));
mkdirSync(out, { mode: 0o700 });
const store = join(out, "test-preferences"), records = [];
const save = (path, data) => writeFileSync(path, typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const { readPreferenceStore } = await import(pathToFileURL(join(skill, "../prose-draft/tools/preference-store.mjs")));
const env = { ...process.env };
for (const name of ["OPENAI_API_KEY", "CODEX_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"]) delete env[name];
let error = null;
try {
  for (const phase of ["save", "undo"]) {
    const prompt = `Use the installed prose-style-tune skill at ${join(skill, "SKILL.md")}. This is an isolated conversational integration test, not a change to the account owner's preferences. The ONLY preference store to use is ${store}, identity conversational-test-writer. Read the skill and its required reference, and follow its real runtime workflow. Do not hand-edit preference revisions. Do not inspect unrelated files or use other agents. Keep all writes within ${out}. `
      + (phase === "save"
        ? "For this test writer: Never use exclamation marks in replies. Save that persistent instruction now and give me a short receipt with its scope, revision and how to undo. Do not draft prose or ask for approval of this explicit instruction."
        : "Undo the last saved preference change in that store. Verify the saved rule no longer applies and give me a short receipt. Do not draft prose, create a new rule, or change any other store.");
    save(join(out, `${phase}-prompt.txt`), prompt);
    const args = harness === "codex"
      ? ["exec", "--json", "--ephemeral", "--skip-git-repo-check", "-C", out, "-s", "workspace-write", "-c", 'approval_policy="never"', "-c", "features.hooks=false", "-c", "features.apps=false", "-c", "features.multi_agent=false", "-c", "agents.enabled=false", "-"]
      : ["-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--no-chrome", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--tools", "Read,Bash,Write,Edit,Skill", "--allowedTools", "Read,Bash,Write,Edit,Skill", "--permission-mode", "dontAsk"];
    const start = Date.now();
    process.stdout.write(`${harness}: fresh conversation / ${phase}\n`);
    const run = spawnSync(harness, args, { cwd: out, input: prompt, env, encoding: "utf8", timeout: 240000, maxBuffer: 16 * 1024 * 1024 });
    save(join(out, `${phase}-stdout.jsonl`), run.stdout ?? ""); save(join(out, `${phase}-stderr.txt`), run.stderr ?? "");
    const events = (run.stdout ?? "").split(/\r?\n/).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
    const final = harness === "codex" ? events.findLast((e) => e.type === "item.completed" && e.item?.type === "agent_message")?.item.text
      : events.findLast((e) => e.type === "result")?.result;
    const record = { phase, exit: run.status, elapsed_ms: Date.now() - start, final: final ?? null,
      usage: events.findLast((e) => e.type === "turn.completed" || e.type === "result")?.usage ?? null, error: run.error?.message ?? null };
    records.push(record); console.log(JSON.stringify(record));
    assert.equal(run.status, 0, run.error?.message ?? run.stderr);
    const p = readPreferenceStore(store); save(join(out, `${phase}-preferences.json`), p);
    if (phase === "save") {
      assert.equal(p.revision, 2); assert.equal(p.decisions.length, 1);
      const d = p.decisions[0]; assert.deepEqual(d.scope.forms, ["reply"]);
      assert.equal(d.basis.kind, "direct-persistent"); assert.equal(d.rule.kind, "punctuation");
      assert.equal(d.rule.characters, "!"); assert.equal(d.rule.maximum, 0);
    } else { assert.equal(p.revision, 3); assert.deepEqual(p.decisions, []); }
    assert.ok(final?.trim(), "Expected a user-facing receipt");
  }
} catch (e) { error = e.stack; }
save(join(out, "REPORT.json"), { schema: "conversational-skill-smoke/1", status: error ? "failed" : "passed", harness, skill, records, error,
  limits: ["Explicit installed skill path was supplied; this is not an implicit skill-discovery test.", "Two outer CLI conversations; internal model-request counts are not inferred from tool events.", "Synthetic preference only, not a private user corpus or a style-quality judgment.", "Raw local traces can contain host configuration metadata; inspect before sharing."] });
process.exitCode = error ? 1 : 0;

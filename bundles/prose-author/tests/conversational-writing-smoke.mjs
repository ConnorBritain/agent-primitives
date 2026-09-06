#!/usr/bin/env node
/** Discover an installed skill by name and exercise its real writing workflow. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { chatReceiptMode } from "./chat-receipt.mjs";

const value = (flag) => { const i = process.argv.indexOf(flag); if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${flag}`); return process.argv[i + 1]; };
const harness = value("--harness"), out = resolve(value("--out"));
assert.ok(["codex", "claude"].includes(harness));
const fullAccess = process.argv.includes("--full-access");
const legacyInline = process.argv.includes("--legacy-inline");
assert.ok(!fullAccess || harness === "codex", "--full-access is a Codex test option requiring user authorization");
const skill = join(homedir(), `.${harness}`, "plugins/cache/agent-primitives/prose-author/0.4.0/skills/prose-draft");
const storeModule = await import(pathToFileURL(join(skill, "tools/preference-store.mjs")));
mkdirSync(out, { mode: 0o700 });
const store = join(out, "test-preferences"); storeModule.initPreferenceStore(store, "writing-conversation-test");
const save = (name, data) => writeFileSync(join(out, name), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const prompt = `Use the installed prose-draft skill to write a short, two-sentence reply declining Friday's invitation. For this draft, include the exact text "Thanks for inviting me", use no question marks or exclamation marks, and stay under 60 words. Do not invent a reason for declining. Show me the resulting prose and its concise check receipt.
This is an isolated integration test: use ONLY the existing preference store ${store}, identity writing-conversation-test. No learned profile or corpus is supplied; use preference-only assistance. Do not change saved preferences. Keep task files and output within ${out}. Do not inspect unrelated files, use other agents, edit installed tools, or change account configuration. Let the skill's normal bounded workflow finish; if it fails, report that result without restarting it. Authenticated CLI model calls required by the installed workflow are authorized. Do not send the reply anywhere.`;
save("prompt.txt", prompt);
const env = { ...process.env };
for (const key of ["OPENAI_API_KEY", "CODEX_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"]) delete env[key];
const args = harness === "codex"
  ? ["exec", "--json", "--ephemeral", "--skip-git-repo-check", "-C", out, "-s", fullAccess ? "danger-full-access" : "workspace-write", "-c", 'approval_policy="never"', "-c", "sandbox_workspace_write.network_access=true", "-c", "features.hooks=false", "-c", "features.apps=false", "-c", "features.multi_agent=false", "-c", "agents.enabled=false", "-"]
  : ["-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--no-chrome", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--tools", "Read,Bash,Write,Edit,Skill", "--allowedTools", "Read,Bash,Write,Edit,Skill", "--permission-mode", "dontAsk"];
console.log(`${harness}: conversational drafting through the installed skill (no path supplied)`);
const started = Date.now();
const run = spawnSync(harness, args, { cwd: out, input: prompt, env, encoding: "utf8", timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
save("stdout.jsonl", run.stdout ?? ""); save("stderr.txt", run.stderr ?? "");
const events = (run.stdout ?? "").split(/\r?\n/).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
const final = harness === "codex" ? events.findLast((e) => e.type === "item.completed" && e.item?.type === "agent_message")?.item.text
  : events.findLast((e) => e.type === "result")?.result;
let error = null, result = null, artifact = null, chatReceipt = null;
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
try {
  assert.equal(run.status, 0, run.error?.message ?? run.stderr);
  const found = walk(out).filter((p) => p.endsWith("/result.json")).filter((p) => JSON.parse(readFileSync(p)).schema === "prose-writing-result/1");
  assert.equal(found.length, 1, "Expected exactly one runtime invocation, not an improvised draft or redraw");
  artifact = found[0]; result = JSON.parse(readFileSync(artifact));
  assert.equal(result.status, "checked", result.reason);
  assert.ok(result.invocation.model_calls >= 2, "Expected generation and task review");
  if (legacyInline) assert.ok(final?.includes(result.draft), "User-facing prose must contain the exact checked draft, without another polish");
  assert.equal(storeModule.readPreferenceStore(store).revision, 1, "Draft-specific instructions must not become saved preferences");
  const dir = resolve(artifact, "..");
  const resolved = JSON.parse(readFileSync(join(dir, "resolved-job.json")));
  assert.ok(resolved.rules.some((r) => r.kind === "required-text" && r.text === "Thanks for inviting me"), "Exact text must have a mechanical rule");
  const punctuation = resolved.rules.filter((r) => r.kind === "punctuation" && r.maximum === 0).map((r) => r.characters).join("");
  assert.ok(punctuation.includes("?") && punctuation.includes("!"), "Punctuation restrictions must have mechanical rules");
  assert.ok(resolved.rules.some((r) => r.kind === "word-limit" && r.maximum <= 59), "Word limit must be mechanically represented");
  assert.equal(readFileSync(join(dir, "draft.md"), "utf8"), result.draft);
  if (legacyInline) assert.ok(final.includes(readFileSync(join(dir, "delivery.md"), "utf8").trimEnd()), "Deliver the recorded receipt, not a reconstructed status summary");
  else {
    assert.ok(final?.includes(join(dir, "delivery.md")), "The host must link to the authoritative delivery file");
    chatReceipt = chatReceiptMode(final, result.draft, readFileSync(join(dir, "receipt.md"), "utf8"));
    assert.ok(chatReceipt, "Chat must label a summary unverified or quote verified receipt excerpts without added claims");
  }
  const checked = spawnSync(process.execPath, [join(skill, "tools/prose-runtime.mjs"), "check-result", "--result", artifact, "--draft", join(dir, "draft.md"), "--job", join(dir, "resolved-job.json"), ...(!legacyInline ? ["--delivery", join(dir, "delivery.md")] : [])], { encoding: "utf8", timeout: 30000 });
  save("final-check.json", { exit: checked.status, stdout: checked.stdout, stderr: checked.stderr });
  assert.equal(checked.status, 0, checked.stdout || checked.stderr);
  assert.ok(result.draft.includes("Thanks for inviting me")); assert.doesNotMatch(result.draft, /[?!]/);
} catch (e) { error = e.stack; }
const report = { schema: "conversational-writing-evidence/2", delivery_boundary: legacyInline ? "legacy-verbatim-inline" : "authoritative-artifact", permission: fullAccess ? "user-authorized-isolated-full-access" : "default-test-permissions", status: error ? "failed" : "passed", harness, outer_exit: run.status,
  chat_receipt: chatReceipt,
  outer_elapsed_ms: Date.now() - started, final: final ?? null, artifact, runtime_status: result?.status ?? null,
  inner_model_calls: result?.invocation?.model_calls ?? null, inner_model_elapsed_ms: result?.invocation?.model_elapsed_ms ?? null,
  outer_usage: events.findLast((e) => e.type === "turn.completed" || e.type === "result")?.usage ?? null, error,
  limits: ["Skill requested by name; this does not prove implicit selection from an unqualified writing request.", "No private corpus, learned voice or subjective quality judgment.", "Outer invocation includes inner runtime latency; do not add them together.", "Codex test allows network access for authorized CLI calls; no persistent permission setting is changed.", "Raw traces may contain host metadata; keep them private."] };
save("REPORT.json", report); console.log(JSON.stringify(report)); process.exitCode = error ? 1 : 0;

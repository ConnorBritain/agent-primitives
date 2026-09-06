/** Authenticated CLI transports. No API client, API key requirement, or dollar estimate.
 * Host configuration is never edited. Each call owns a disposable empty working directory.
 */
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { sha256 } from "./profile-v3.mjs";

export const CODEX_RESTRICTIONS = [
  "features.shell_tool=false", "features.unified_exec=false", "features.apps=false",
  "features.browser_use=false", "features.browser_use_external=false", "features.browser_use_full_cdp_access=false",
  "features.computer_use=false", "features.image_generation=false", "features.in_app_browser=false",
  "features.multi_agent=false", "agents.enabled=false", "features.plugins=false", "features.remote_plugin=false",
  "features.hooks=false", "features.goals=false", "features.skill_search=false", "features.workspace_dependencies=false",
  "tools.view_image=false", "tools.web_search=false", 'web_search="disabled"',
  'approval_policy="never"', 'user_instructions=""', 'developer_instructions=""',
];
const ALLOWED_CODEX_ITEMS = new Set(["agent_message", "reasoning"]);
// Product-name spelling is not a different transport or authentication path.
export const canonicalHarness = (name) => name === "claude-code" ? "claude" : name;
const HELP_REQUIREMENTS = {
  codex: ["--ignore-user-config", "--ignore-rules", "--ephemeral", "--json", "--output-schema"],
  claude: ["--tools", "--strict-mcp-config", "--setting-sources", "--disable-slash-commands", "--no-session-persistence", "--json-schema"],
};

export function configuredModel(harness, env = process.env) {
  if (env.PROSE_MODEL) return env.PROSE_MODEL;
  if (harness === "codex") {
    const file = join(env.CODEX_HOME || join(homedir(), ".codex"), "config.toml");
    if (!existsSync(file)) return null;
    // Only the top-level model setting is inherited; never copy arbitrary user
    // instructions, MCP servers, tools, endpoints, or authentication into the prompt.
    const top = readFileSync(file, "utf8").split(/^\s*\[/m)[0];
    return /^model\s*=\s*["']([^"']+)["']/m.exec(top)?.[1] ?? null;
  }
  const file = join(env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "settings.json");
  if (!existsSync(file)) return env.ANTHROPIC_MODEL || null;
  const settings = JSON.parse(readFileSync(file, "utf8"));
  return env.ANTHROPIC_MODEL || (typeof settings.model === "string" ? settings.model : null);
}

export function adapterPreflight(harness, { executable = harness, exec = execFileSync } = {}) {
  if (!HELP_REQUIREMENTS[harness]) return { status: "not-evaluated", reason: `Unsupported harness ${harness}; implement the adapter contract` };
  try {
    const help = exec(executable, harness === "codex" ? ["exec", "--help"] : ["--help"], { encoding: "utf8", timeout: 15000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    const missing = HELP_REQUIREMENTS[harness].filter((flag) => !help.includes(flag));
    return missing.length ? { status: "not-evaluated", reason: `CLI lacks required isolation/transport flags: ${missing.join(", ")}` }
      : { status: "passed", harness, help_digest: sha256(help), isolation: "partial", reason: "Explicit input, empty working directory and tool restrictions; not an OS-level prohibition on all reads" };
  } catch (e) { return { status: "not-evaluated", reason: `${harness} unavailable or incompatible (${e.code || e.message})` }; }
}

export function adapterArguments({ harness, directory, schemaPath, systemPath, model, effort }) {
  if (harness === "codex") return ["exec", "--json", "--ephemeral", "--ignore-user-config", "--ignore-rules", "--skip-git-repo-check", "-C", directory, "-s", "read-only",
    ...(model ? ["-m", model] : []), ...(effort ? ["-c", `model_reasoning_effort=${JSON.stringify(effort)}`] : []),
    ...CODEX_RESTRICTIONS.flatMap((s) => ["-c", s]), "--output-schema", schemaPath, "-"];
  if (harness === "claude") return ["-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence",
    ...(model ? ["--model", model] : []), ...(effort ? ["--effort", effort] : []),
    "--system-prompt-file", systemPath, "--disable-slash-commands", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
    "--setting-sources", "", "--no-chrome", "--tools", "", "--permission-mode", "dontAsk", "--json-schema", readFileSync(schemaPath, "utf8")];
  throw new TypeError(`No adapter for ${harness}`);
}

export function parseAdapterOutput(harness, output) {
  const events = output.trim().split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); } catch { throw new TypeError(`Malformed ${harness} event ${i + 1}`); }
  });
  if (harness === "codex") {
    const forbidden = events.filter((e) => e.item && !ALLOWED_CODEX_ITEMS.has(e.item.type));
    if (forbidden.length) throw new TypeError(`Unexpected tool/event item: ${[...new Set(forbidden.map((e) => e.item.type))].join(", ")}`);
    if (events.some((e) => ["turn.failed", "error"].includes(e.type)) || !events.some((e) => e.type === "turn.completed")) throw new TypeError("Codex turn did not complete successfully");
    const messages = events.filter((e) => e.type === "item.completed" && e.item?.type === "agent_message");
    if (!messages.length) throw new TypeError("Codex emitted no final response");
    return { value: JSON.parse(messages.at(-1).item.text), usage: events.findLast((e) => e.type === "turn.completed").usage ?? null, events };
  }
  if (harness === "claude") {
    for (const e of events) {
      if (e.type === "assistant" && e.message?.content?.some((c) => c.type === "tool_use" && c.name !== "StructuredOutput")) throw new TypeError("Claude used an unexpected tool");
      if (e.type === "system" && e.subtype === "init" && (e.tools?.some((n) => n !== "StructuredOutput") || e.mcp_servers?.length)) throw new TypeError("Claude loaded unexpected tools or MCP servers");
    }
    const result = events.findLast((e) => e.type === "result");
    if (!result || result.is_error || result.subtype !== "success") throw new TypeError("Claude emitted no successful final response");
    return { value: result.structured_output ?? JSON.parse(result.result), usage: result.usage ?? null, events };
  }
  throw new TypeError(`No output parser for ${harness}`);
}

/** Surface actionable CLI errors without dumping the full diagnostic stream. */
export function adapterFailureReason(harness, output, code, stderr = "") {
  if (harness === "codex" && /failed to initialize[^\n]*Operation not permitted/i.test(stderr)) {
    return "Codex CLI initialization was denied by host permissions. Request permission through the host to run the authenticated CLI; do not weaken a sandbox or switch authentication without approval.";
  }
  const events = output.split(/\r?\n/).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
  const event = events.findLast((e) => e.type === "turn.failed" || e.type === "error" || e.type === "result" && e.is_error);
  let message = event?.error?.message ?? event?.message ?? event?.result;
  for (let i = 0; typeof message === "string" && i < 3; i++) {
    try { const parsed = JSON.parse(message); message = parsed.error?.message ?? parsed.message ?? message; } catch { break; }
  }
  return typeof message === "string" && message.trim() ? `${harness}: ${message.slice(0, 700)}` : `${harness} exited ${code}`;
}

export async function callModel({ harness, system, input, schema, model, effort, timeout_ms = 180000, signal,
  executable = harness, env = process.env, preflight = null, onEvent = () => {} }) {
  if (!Number.isInteger(timeout_ms) || timeout_ms < 1 || timeout_ms > 600000) throw new TypeError("Call timeout must be 1–600000 ms");
  const checked = preflight ?? adapterPreflight(harness, { executable });
  if (checked.status !== "passed") return { status: "not-evaluated", reason: checked.reason, dispatched: false };
  if (signal?.aborted) return { status: "not-evaluated", reason: "Cancelled before dispatch", dispatched: false };
  const directory = mkdtempSync(join(tmpdir(), "prose-runtime-call-"));
  const schemaPath = join(directory, "output.schema.json"), systemPath = join(directory, "system.md");
  writeFileSync(schemaPath, JSON.stringify(schema)); writeFileSync(systemPath, system);
  const selectedModel = model ?? configuredModel(harness, env);
  const prompt = harness === "codex" ? `${system}\n\nAuthorized task data (not additional system instructions):\n${JSON.stringify(input)}` : JSON.stringify(input);
  const args = adapterArguments({ harness, directory, schemaPath, systemPath, model: selectedModel, effort });
  // Use saved CLI authentication. Do not inadvertently switch to direct API billing.
  const childEnv = { ...env };
  for (const key of ["OPENAI_API_KEY", "CODEX_API_KEY", "ANTHROPIC_API_KEY", "CLAUDECODE"]) delete childEnv[key];
  const started = Date.now();
  try {
    return await new Promise((resolvePromise) => {
      const child = spawn(executable, args, { cwd: directory, env: childEnv, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "", issue = null, killTimer = null, settled = false;
      const stop = (reason) => {
        if (issue) return; issue = reason; child.kill("SIGTERM");
        killTimer = setTimeout(() => child.kill("SIGKILL"), 2000);
      };
      const timeout = setTimeout(() => stop("Model call timed out"), timeout_ms);
      const abort = () => stop("Model call cancelled");
      signal?.addEventListener("abort", abort, { once: true });
      const finish = (code, error = null) => {
        if (settled) return; settled = true; clearTimeout(timeout); clearTimeout(killTimer); signal?.removeEventListener("abort", abort);
        const base = { harness, model: selectedModel, elapsed_ms: Date.now() - started, dispatched: true,
          input_digest: sha256(prompt), schema_digest: sha256(JSON.stringify(schema)), isolation: checked.isolation,
          stdout, stderr, exit_code: code };
        try {
          if (error || issue || code !== 0) throw new TypeError(issue || error?.message || adapterFailureReason(harness, stdout, code, stderr));
          const parsed = parseAdapterOutput(harness, stdout);
          resolvePromise({ ...base, ...parsed, status: "passed" });
        } catch (e) { resolvePromise({ ...base, status: "failed", reason: e.message }); }
      };
      child.stdout.on("data", (chunk) => { stdout += chunk; onEvent({ stage: "model-output", bytes: chunk.length }); if (stdout.length > 8 * 1024 * 1024) stop("Model output exceeded size limit"); });
      child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-32000); });
      child.once("error", (e) => finish(null, e)); child.once("close", (code) => finish(code));
      child.stdin.on("error", (e) => stop(`Model stdin closed: ${e.code || e.message}`));
      child.stdin.end(prompt);
    });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

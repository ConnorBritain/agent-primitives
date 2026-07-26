#!/usr/bin/env node
/**
 * gate-runner — Stop hook that refuses to let a turn end on a red Tier-1 gate.
 *
 * Without this, the gate protocol is advisory: an agent that wants to declare
 * done will declare done. This makes "tests pass" a precondition of ending the
 * turn rather than a claim the agent makes about itself.
 *
 * Reads .claude/gates.json from the project root:
 *
 *   {
 *     "gates": [
 *       { "name": "typecheck", "command": "npm run typecheck" },
 *       { "name": "test",      "command": "npm test", "timeout": 300 }
 *     ]
 *   }
 *
 * No gates.json means no opinion — the hook exits 0 and stays out of the way.
 *
 * Failure policy is deliberately asymmetric:
 *   - a failing GATE blocks the turn (exit 2)          — that is the point
 *   - a failing HOOK (bad JSON, missing node) does not — a broken guard that
 *     bricks every turn gets uninstalled, and then you have no guard at all
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const DEFAULT_TIMEOUT_SEC = 300;
const MAX_OUTPUT_CHARS = 4000;

/** Read the hook payload Claude Code sends on stdin. Returns {} if unreadable. */
function readPayload() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function loadGates(root) {
  const path = join(root, ".claude", "gates.json");
  if (!existsSync(path)) return null;

  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const gates = Array.isArray(parsed) ? parsed : parsed.gates;
  if (!Array.isArray(gates)) {
    throw new Error(".claude/gates.json must be an array, or an object with a `gates` array");
  }
  for (const g of gates) {
    if (!g || typeof g.command !== "string" || !g.command.trim()) {
      throw new Error(`gate ${JSON.stringify(g?.name ?? g)} is missing a non-empty "command"`);
    }
  }
  return gates;
}

function runGate(gate, cwd) {
  const timeout = (Number(gate.timeout) || DEFAULT_TIMEOUT_SEC) * 1000;
  const result = spawnSync(gate.command, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout,
    maxBuffer: 10 * 1024 * 1024,
  });

  const name = gate.name || gate.command;

  if (result.error?.code === "ETIMEDOUT" || result.signal === "SIGTERM") {
    return { name, ok: false, detail: `timed out after ${timeout / 1000}s` };
  }
  if (result.error) {
    return { name, ok: false, detail: `could not run: ${result.error.message}` };
  }
  if (result.status !== 0) {
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    return {
      name,
      ok: false,
      detail: `exited ${result.status}\n${output.slice(-MAX_OUTPUT_CHARS)}`,
    };
  }
  return { name, ok: true };
}

function main() {
  const payload = readPayload();

  // Claude Code sets this when the turn is already continuing because of a
  // previous Stop hook. Blocking again here would loop forever.
  if (payload.stop_hook_active) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  let gates;
  try {
    gates = loadGates(root);
  } catch (err) {
    console.error(`gate-runner: ignoring .claude/gates.json — ${err.message}`);
    process.exit(0);
  }
  if (!gates || gates.length === 0) process.exit(0);

  const failed = gates.map((g) => runGate(g, root)).filter((r) => !r.ok);
  if (failed.length === 0) process.exit(0);

  const report = failed.map((f) => `### ${f.name}\n${f.detail}`).join("\n\n");
  console.error(
    `Tier-1 gates are red — the task is not done.\n\n${report}\n\n` +
      `Fix the code until these pass. Do not weaken, skip, or delete a gate to get green; ` +
      `if a gate is itself wrong, stop and say so rather than editing it silently.`,
  );
  process.exit(2); // exit 2 blocks the stop and returns stderr to the agent
}

main();

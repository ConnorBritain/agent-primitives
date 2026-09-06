/** Run the unchanged v0.3 canary against its locked inputs, not current /5 prompts. */
import { readFileSync, writeFileSync, mkdirSync, cpSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, "../../..");
const RUN = "bundles/prose-author/tests/runs/2026-08-30-v030-style-spec-canary-2";
const ARCHIVED = {
  "primitives/agents/voice-draft/agent.md": "bundles/prose-author/tests/fixtures/historical-v030/voice-draft/agent.md",
  "bundles/prose-author/tests/acceptance-runner.mjs": "bundles/prose-author/tests/fixtures/historical-v030/acceptance-runner.mjs",
};
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function checkHistoricalStyleCanary(root = ROOT) {
  const lock = JSON.parse(readFileSync(join(root, RUN, "LOCK.json"), "utf8"));
  const sandbox = mkdtempSync(join(tmpdir(), "prose-historical-canary-"));
  try {
    cpSync(join(root, RUN), join(sandbox, RUN), { recursive: true });
    for (const [file, expected] of Object.entries(lock.locked_files)) {
      if (isAbsolute(file) || file.split(/[\\/]/).includes("..")) throw new TypeError("Unsafe historical locked path");
      const source = ARCHIVED[file] ?? file;
      const bytes = readFileSync(join(root, source));
      if (sha(bytes) !== expected) throw new Error(`Historical locked input drifted: ${source}`);
      const target = join(sandbox, file); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes);
    }
    return execFileSync(process.execPath, [join(sandbox, RUN, "run.mjs"), "check"], {
      encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"],
    });
  } finally { rmSync(sandbox, { recursive: true, force: true }); }
}

#!/usr/bin/env node
/**
 * assert-prompt-shape — this run's prompts are the harness's prompts.
 *
 *   node runs/2026-08-05-voice-cross-author/assert-prompt-shape.mjs
 *
 * WHY. `prepare-cross-author.mjs` cannot call `run-harness.mjs prepare voice`: that path is
 * hardcoded to the Wikipedia corpus and cannot express "corpus of X, draft by Y". So the
 * prompt text is DUPLICATED, and a duplicated prompt drifts. If it drifts, this run stops
 * being comparable to the published `2026-08-04-b` numbers while still looking like it is —
 * the same failure mode as a drifted primitive/bundle pair, which `AGENTS.md` calls the rule
 * that breaks things.
 *
 * So: run the real harness into a throwaway directory, take one voice case, and diff every
 * line that is not case-specific. The three lines that legitimately differ are the case id
 * heading and the staged input paths; everything else — the task text, the integrity
 * constraints, the leak warning, the output rule — must be byte-identical.
 *
 * Exits 0 on identity, 1 on drift with the first differing line printed.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TESTS = resolve(HERE, "..", "..");

/** Case-specific lines: the heading names the case, and the input block names staged paths.
 * Everything else is the invariant the two emitters must agree on. */
const isCaseSpecific = (l) => /^# Critic run — case-\d+$/.test(l) || /^ {4}\S+\.(?:md|txt)$/.test(l);
const invariant = (text) => text.split("\n").filter((l) => !isCaseSpecific(l));

const tmp = mkdtempSync(join(tmpdir(), "voice-prompt-shape-"));
try {
  const r = spawnSync(process.execPath, [
    join(TESTS, "run-harness.mjs"), "prepare", "voice", join(tmp, "reference"),
    "--only", "n-ahmadu-bello-university",
  ], { encoding: "utf8" });
  if (r.status !== 0) {
    process.stderr.write(`\n  could not run the reference harness:\n${r.stderr}\n`);
    process.exit(2);
  }

  const ref = readFileSync(join(tmp, "reference", "prompts", "case-01.md"), "utf8");
  const mineFile = readdirSync(join(HERE, "prompts")).filter((f) => /^case-\d+\.md$/.test(f)).sort()[0];
  const mine = readFileSync(join(HERE, "prompts", mineFile), "utf8");

  const a = invariant(ref);
  const b = invariant(mine);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      process.stderr.write(
        `\n  PROMPT DRIFT at invariant line ${i + 1}\n`
        + `    run-harness.mjs prepare voice: ${JSON.stringify(a[i] ?? null)}\n`
        + `    prepare-cross-author.mjs:      ${JSON.stringify(b[i] ?? null)}\n\n`,
      );
      process.exit(1);
    }
  }
  process.stdout.write(
    `\n  prompt shape identical to \`run-harness.mjs prepare voice\`\n`
    + `    ${a.length} invariant lines compared against prompts/${mineFile}\n\n`,
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

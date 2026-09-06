#!/usr/bin/env node
/** Harness-facing current measurement entrypoint; old profile-measure remains reproducible. */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { assembleProfileV3, readCurrentSamples, heldOutDiagnostics, validateProfileV3 } from "./profile-v3.mjs";

export function currentProfileCommand(args) {
  const [command, path] = args;
  if (!path || !["measure", "validate"].includes(command)) throw new TypeError("profile-current: measure <profile-dir> | validate <profile.json> [<profile-dir>]");
  if (command === "validate") {
    const p = JSON.parse(readFileSync(path, "utf8"));
    const errors = validateProfileV3(p, args[2] ? { samples: readCurrentSamples(resolve(args[2])) } : {});
    return { status: errors.length ? "failed" : "passed", errors };
  }
  const p = assembleProfileV3({ id: path.split(/[\\/]/).filter(Boolean).at(-1), samples: readCurrentSamples(resolve(path)) });
  return { profile: p, diagnostics: heldOutDiagnostics(p.measured), semantic_status: "not-evaluated; measurements only, no semantic renderer was called" };
}
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = currentProfileCommand(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status === "failed") process.exitCode = 1;
  } catch (e) { process.stderr.write(`${e.message}\n`); process.exitCode = 2; }
}

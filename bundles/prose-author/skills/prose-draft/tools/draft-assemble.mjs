#!/usr/bin/env node
/**
 * Provider-neutral voice draft assembly CLI.
 *
 *   node draft-assemble.mjs --source source.json
 *   node draft-assemble.mjs --source - --output draft.md
 *   node draft-assemble.mjs --schema
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assembleVoiceDraft, parseVoiceDraftSource, SOURCE_SCHEMA,
} from "./draft-contract.mjs";

function die(message) {
  process.stderr.write(`draft-assemble: ${message}\n`);
  process.exitCode = 1;
}

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

export function main() {
  if (process.argv.includes("--schema")) {
    process.stdout.write(`${JSON.stringify(SOURCE_SCHEMA, null, 2)}\n`);
    return;
  }
  const sourceArg = flag("--source");
  if (!sourceArg) {
    die("usage: --source <source.json|-> [--output draft.md]");
    return;
  }
  try {
    const raw = sourceArg === "-" ? readFileSync(0, "utf8") : readFileSync(resolve(sourceArg), "utf8");
    const decoded = parseVoiceDraftSource(raw);
    if (!decoded.source) throw new Error(decoded.error);
    const assembled = assembleVoiceDraft(decoded.source);
    if (!assembled.ok) throw new Error(assembled.errors.join("; "));
    const output = flag("--output");
    if (output) writeFileSync(resolve(output), assembled.output);
    else process.stdout.write(assembled.output);
  } catch (error) {
    die(error.message);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();

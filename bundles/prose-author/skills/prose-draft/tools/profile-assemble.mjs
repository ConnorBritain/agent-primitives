#!/usr/bin/env node
/**
 * Provider-neutral voice profile assembly CLI.
 *
 * A harness supplies semantic voice-profile-source/4 JSON and deterministic context.
 * This command never invokes a model. It emits the same canonical voice-profile/2 used
 * by acceptance regardless of whether Claude, Codex, or another agent wrote the source.
 *
 *   node profile-assemble.mjs --source source.json --context context.json
 *   node profile-assemble.mjs --source - --context context.json --json profile.json --markdown voice.md
 *   node profile-assemble.mjs --schema [--context context.json]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assembleVoiceProfile, parseVoiceProfileSource, SOURCE_SCHEMA, sourceRenderSchema,
} from "./profile-contract.mjs";

function die(message) {
  process.stderr.write(`profile-assemble: ${message}\n`);
  process.exitCode = 1;
}

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function parseJson(raw, label, { source = false } = {}) {
  if (source) {
    const decoded = parseVoiceProfileSource(raw);
    if (decoded.source) return decoded.source;
    throw new Error(`${label} is not JSON: ${decoded.error}`);
  }
  try {
    return JSON.parse(raw.trim());
  } catch (error) {
    throw new Error(`${label} is not JSON: ${error.message}`);
  }
}

export function main() {
  if (process.argv.includes("--schema")) {
    const contextArg = flag("--context");
    const schema = contextArg
      ? sourceRenderSchema(parseJson(readFileSync(resolve(contextArg), "utf8"), "context").measurements)
      : SOURCE_SCHEMA;
    process.stdout.write(`${JSON.stringify(schema, null, 2)}\n`);
    return;
  }
  const sourceArg = flag("--source");
  const contextArg = flag("--context");
  if (!sourceArg || !contextArg) {
    die("usage: --source <source.json|-> --context <context.json> [--json profile.json] [--markdown voice.md]");
    return;
  }
  try {
    const sourceRaw = sourceArg === "-" ? readFileSync(0, "utf8") : readFileSync(resolve(sourceArg), "utf8");
    const contextRaw = readFileSync(resolve(contextArg), "utf8");
    const assembled = assembleVoiceProfile(parseJson(sourceRaw, "source", { source: true }), parseJson(contextRaw, "context"));
    if (!assembled.ok) throw new Error(assembled.errors.join("; "));

    const jsonOut = flag("--json");
    const markdownOut = flag("--markdown");
    const serialized = `${JSON.stringify(assembled.profile, null, 2)}\n`;
    if (jsonOut) writeFileSync(resolve(jsonOut), serialized);
    if (markdownOut) writeFileSync(resolve(markdownOut), assembled.refusal ? "" : `${assembled.profile.profile_markdown.trim()}\n`);
    if (!jsonOut && !markdownOut) process.stdout.write(serialized);
  } catch (error) {
    die(error.message);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();

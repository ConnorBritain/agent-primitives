#!/usr/bin/env node
/**
 * Provider-neutral voice profile assembly CLI.
 *
 * A harness supplies semantic voice-profile-source/1 JSON and deterministic context.
 * This command never invokes a model. It emits the same canonical voice-profile/2 used
 * by acceptance regardless of whether Claude, Codex, or another agent wrote the source.
 *
 *   node profile-assemble.mjs --source source.json --context context.json
 *   node profile-assemble.mjs --source - --context context.json --json profile.json --markdown voice.md
 *   node profile-assemble.mjs --schema
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assembleVoiceProfile, SOURCE_SCHEMA } from "./profile-contract.mjs";

function die(message) {
  process.stderr.write(`profile-assemble: ${message}\n`);
  process.exitCode = 1;
}

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function parseJson(raw, label) {
  const trimmed = raw.trim();
  const fenced = /^```json\s*\n([\s\S]*?)\n```$/i.exec(trimmed)?.[1];
  try {
    return JSON.parse(fenced ?? trimmed);
  } catch (error) {
    throw new Error(`${label} is not JSON: ${error.message}`);
  }
}

export function main() {
  if (process.argv.includes("--schema")) {
    process.stdout.write(`${JSON.stringify(SOURCE_SCHEMA, null, 2)}\n`);
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
    const assembled = assembleVoiceProfile(parseJson(sourceRaw, "source"), parseJson(contextRaw, "context"));
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

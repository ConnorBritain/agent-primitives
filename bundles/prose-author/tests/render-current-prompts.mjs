#!/usr/bin/env node
/** Render current author agents and self-contained skill prompts from primitive sources. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)), REPO = resolve(HERE, "../../..");
export const CURRENT_AGENTS = ["voice-draft", "voice-profile-render", "voice-feedback-interpret", "voice-rhetoric-measure"];
export function renderCurrentPrompts({ root = REPO, update = false } = {}) {
  const errors = [];
  for (const name of CURRENT_AGENTS) {
    const primitive = join(root, "primitives/agents", name);
    const source = readFileSync(join(primitive, "agent.md"), "utf8");
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source);
    if (!match || match[1].split("\n").filter((l) => l.trim()).some((l) => !/^(name|description): .+$/.test(l))) throw new TypeError(`${name}: unsupported portable frontmatter`);
    const metadata = readFileSync(join(primitive, "meta.yaml"), "utf8");
    const claude = /  claude-code:\n([\s\S]*?)(?=\n  [a-z-]+:|$)/.exec(metadata)?.[1];
    if (!claude || !/^    tools: \[\]$/m.test(claude) || !/^    color: green$/m.test(claude) || /^    model:/m.test(claude)) throw new TypeError(`${name}: generator expects empty tools, green color and inherited model`);
    const bundle = join(root, "bundles/prose-author");
    for (const [target, expected] of [
      [join(bundle, "agents", `${name}.md`), `---\n${match[1]}\ntools: []\ncolor: green\n---\n${match[2]}`],
      [join(bundle, "skills/prose-draft/references/prompts", `${name}.md`), source],
    ]) {
      if (update) { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, expected); }
      let actual; try { actual = readFileSync(target, "utf8"); } catch { actual = null; }
      if (actual !== expected) errors.push(`${target}: does not match primitive source and metadata`);
    }
  }
  return errors;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = renderCurrentPrompts({ update: process.argv.includes("--update") });
  if (errors.length) { process.stderr.write(`${errors.join("\n")}\n`); process.exitCode = 1; }
  else process.stdout.write("Current agent and skill prompt bodies match their primitive sources.\n");
}

#!/usr/bin/env node
/**
 * init — scaffold a writing project so the scanner has somewhere to keep state.
 *
 *   node tools/init.mjs                          # scaffold ./ with all four registers
 *   node tools/init.mjs --project ~/writing
 *   node tools/init.mjs --profiles essay,narration
 *
 * Nothing here is required to RUN the scanner — `tell-scan.mjs draft.md` works
 * against a cold checkout using the shipped profiles. This exists for the parts
 * that cannot ship in the repo: your voice cards, your allowlists, your corpora,
 * and the path rules that decide which register governs which file.
 *
 * What it deliberately does NOT copy: `_base`. The catalog stays bundle-owned so
 * that updates to it reach you when you pull. Copying it would fork the catalog
 * into a private snapshot that silently stops receiving corrections — which is
 * the same drift problem the profile system avoids by inheriting rather than
 * duplicating.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, realpathSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHIPPED = join(SKILL_ROOT, "profiles");
const DEFAULT_PROFILES = ["essay", "technical", "narration", "correspondence"];

const USAGE = `
init — scaffold a writing project for prose-tell-scan

  node tools/init.mjs [options]

Options
  --project <dir>     Where to scaffold. Default: current directory.
  --profiles <a,b>    Which registers to create. Default: ${DEFAULT_PROFILES.join(",")}
  --force             Overwrite existing files. Off by default; init never
                      clobbers a voice card or an allowlist you have edited.
  -h, --help          This text.

Creates:
  <project>/.claude/humanizer.json                   path rules, hook config
  <project>/.claude/humanizer/profiles/<name>/       voice.md, allow.txt,
                                                     thresholds.json, corpus/
`;

/** Files copied per profile. `_base` and catalog.json are pointedly absent. */
const COPY = ["profile.json", "thresholds.json", "allow.txt", "voice.md"];
const CORPUS_DIRS = [["corpus", "human"], ["corpus", "ai"]];

function parseArgs(argv) {
  const opts = { project: process.cwd(), profiles: DEFAULT_PROFILES, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project") opts.project = resolve(argv[++i] ?? ".");
    else if (a === "--profiles") opts.profiles = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--force") opts.force = true;
    else if (a === "-h" || a === "--help") opts.help = true;
    else {
      process.stderr.write(`init: unknown option ${a}\n${USAGE}`);
      process.exit(2);
    }
  }
  return opts;
}

function configFor(profiles) {
  // Path rules only for registers actually created, so the config never points
  // at a profile that does not exist.
  const rules = {};
  if (profiles.includes("technical")) {
    rules["docs/**"] = "technical";
    rules["**/README.md"] = "technical";
  }
  if (profiles.includes("essay")) {
    rules["posts/**"] = "essay";
    rules["essays/**"] = "essay";
  }
  if (profiles.includes("narration")) rules["scripts/**"] = "narration";
  if (profiles.includes("correspondence")) rules["email/**"] = "correspondence";

  return {
    _comment: [
      "prose-tell-scan project config. Every key is optional. Shared with the",
      "prose-review bundle when that is installed; neither bundle owns it.",
      "",
      "`profiles` maps globs to register names, resolved per FILE. Resolution",
      "order is: --profile flag, then the document's own frontmatter, then these",
      "rules, then `default`, then _base with a warning.",
      "",
      "Edit these globs to match your layout — they are a guess, not a standard.",
    ],
    profiles: rules,
    default: profiles.includes("essay") ? "essay" : profiles[0],
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(USAGE);
    return;
  }

  const unknown = opts.profiles.filter((p) => !existsSync(join(SHIPPED, p)));
  if (unknown.length) {
    const available = readdirSync(SHIPPED).filter((d) => !d.startsWith("_"));
    process.stderr.write(
      `init: no shipped profile named ${unknown.join(", ")}\n` +
        `available: ${available.join(", ")}\n`,
    );
    process.exit(1);
  }

  const created = [];
  const skipped = [];

  const write = (path, contents) => {
    if (existsSync(path) && !opts.force) {
      skipped.push(path);
      return;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
    created.push(path);
  };

  const configPath = join(opts.project, ".claude", "humanizer.json");
  write(configPath, `${JSON.stringify(configFor(opts.profiles), null, 2)}\n`);

  const root = join(opts.project, ".claude", "humanizer", "profiles");
  for (const name of opts.profiles) {
    const from = join(SHIPPED, name);
    const to = join(root, name);
    for (const file of COPY) {
      const src = join(from, file);
      if (existsSync(src)) write(join(to, file), readFileSync(src, "utf8"));
    }
    for (const parts of CORPUS_DIRS) {
      const src = join(from, ...parts, "README.md");
      if (existsSync(src)) write(join(to, ...parts, "README.md"), readFileSync(src, "utf8"));
    }
  }

  const rel = (p) => relative(opts.project, p) || p;
  process.stdout.write(`\nScaffolded ${opts.project}\n\n`);
  for (const p of created) process.stdout.write(`  created  ${rel(p)}\n`);
  for (const p of skipped) process.stdout.write(`  kept     ${rel(p)}  (exists — use --force to replace)\n`);

  process.stdout.write(`
Next, in rough order of how much difference it makes:

  1. Scan something. It works right now, uncalibrated:
       node ${rel(join(SKILL_ROOT, "tools", "tell-scan.mjs"))} <your-draft.md>

  2. Feed a corpus. This is the step that matters, and the only one that turns
     the thresholds from our guess into a measurement of your writing:
       node ${rel(join(SKILL_ROOT, "tools", "ingest.mjs"))} old-post.md \\
            --profile essay --source "personal blog" --attest

     Ten samples per register is the confidence floor; five is the minimum it
     will derive anything from at all.

  3. Fill in voice.md per register. Read by the prose-review critics, not by the
     scanner. An empty one is honest; an invented one is worse than none.

  4. Edit the globs in ${rel(configPath)} to match your actual layout.

Until a corpus exists, every run prints an UNCALIBRATED banner. That is working
as intended — the fallback thresholds do not know your register, and a register
they do not know is one they will misjudge.
`);
}

// Run only when invoked directly, so this module can be imported.
//
// This file previously ended in a bare `main();`, so importing it RAN THE CLI -
// printing usage and exiting inside whatever imported it. That is why nothing
// could reuse these functions, and why prose-author's contract test could not
// pin its port against them until this guard existed.
//
// realpathSync on both sides, not `import.meta.url === \`file://${argv[1]}\``:
// import.meta.url is resolved and argv[1] is not, so the naive form silently
// does nothing when the path contains a symlink. On macOS /tmp is one. (That
// bug was real in prose-author's two tools, which DID have the naive guard;
// these four had no guard at all.)
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();

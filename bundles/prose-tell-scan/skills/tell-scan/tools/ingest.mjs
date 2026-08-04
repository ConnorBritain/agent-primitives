#!/usr/bin/env node
/**
 * ingest — add a writing sample to a profile's corpus, with provenance attached.
 *
 *   node tools/ingest.mjs old-post.md --profile essay --source "personal blog" --attest
 *   node tools/ingest.mjs draft.md --profile essay --source "Claude draft" --ai
 *   node tools/ingest.mjs posts/*.md --profile essay --source archive --attest --recalibrate
 *
 * Corpora stay empty because adding to them is annoying. That is the whole
 * problem this command solves: the provenance block the calibrator demands is
 * four lines of YAML that nobody wants to hand-write per file, so in practice
 * they write none and the thresholds stay uncalibrated forever.
 *
 * What it does NOT remove is the deliberateness. `--attest` is required for the
 * human corpus and has no default, because the attestation is a claim you are
 * making, not a detection this tool can perform. The failure mode it guards is
 * AI-assisted drafts drifting into the human corpus, after which the thresholds
 * quietly relax toward AI norms and nothing in the output says so.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, realpathSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { maskNonProse, words } from "./lib/text.mjs";
import { profileSearchPath, findProfileDir, listProfiles, BASE_PROFILE } from "./lib/profile.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_WORDS = 200;

const USAGE = `
ingest — add a sample to a profile's corpus with provenance

  node tools/ingest.mjs <file...> --profile <name> --source <text> [--attest|--ai]

Required
  --group <name>        File into a named voice inside the register. Creates
                        the subdirectory if needed. Human corpus only.
  --profile <name>    Which register's corpus to add to.
  --source <text>     Where this came from. Free text; be specific enough that
                      you will understand it in a year.
  --attest            You are asserting this was written by a human, without
                      AI assistance. Required for the human corpus. No default,
                      deliberately.
    or --ai           Mark as a known-AI negative instead. Not used to derive
                      thresholds, only to check that they separate.

Options
  --date <YYYY-MM-DD> When the text was written. Default: the file's mtime.
  --project <dir>     Project root. Default: cwd.
  --profiles-dir <d>  Write here instead of <project>/.claude/humanizer/profiles.
  --name <basename>   Store under this filename instead of the source's.
  --recalibrate       Run calibrate.mjs --write afterwards.
  --force             Overwrite an existing sample of the same name.
  -h, --help          This text.

Samples under ${MIN_WORDS} words are refused: too short to measure a cadence from.
`;

function parseArgs(argv) {
  const o = {
    files: [], profile: null, source: null, date: null, attest: false, ai: false,
    project: process.cwd(), profilesDir: null, name: null, recalibrate: false, force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case "--profile": o.profile = next(); break;
      case "--group": o.group = next(); break;
      case "--source": o.source = next(); break;
      case "--date": o.date = next(); break;
      case "--attest": o.attest = true; break;
      case "--ai": o.ai = true; break;
      case "--project": o.project = resolve(next()); break;
      case "--profiles-dir": o.profilesDir = next(); break;
      case "--name": o.name = next(); break;
      case "--recalibrate": o.recalibrate = true; break;
      case "--force": o.force = true; break;
      case "-h": case "--help": o.help = true; break;
      default:
        if (a.startsWith("-")) throw new Error(`unknown option: ${a}`);
        o.files.push(a);
    }
  }
  return o;
}

/** Strip any frontmatter the source file already carries; ours replaces it. */
function stripFrontmatter(text) {
  const m = text.match(/^---\n[\s\S]*?\n---(?:\n|$)/);
  return m ? text.slice(m[0].length).replace(/^\n+/, "") : text;
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function main() {
  let o;
  try {
    o = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`ingest: ${err.message}\n${USAGE}`);
    process.exit(2);
  }
  if (o.help) {
    process.stdout.write(USAGE);
    return;
  }

  const fail = (msg) => {
    process.stderr.write(`ingest: ${msg}\n`);
    process.exit(2);
  };

  if (!o.files.length) fail(`no input files\n${USAGE}`);
  if (!o.profile) fail("--profile is required");
  if (!o.source) fail("--source is required — a corpus sample without provenance does not count toward calibration");
  if (o.attest && o.ai) fail("--attest and --ai are contradictory");
  if (!o.attest && !o.ai) {
    fail(
      "pass --attest (you are asserting a human wrote this, unaided) or --ai.\n" +
        "  There is no default. An unattested sample would be excluded by the\n" +
        "  calibrator anyway, and a wrongly attested one silently drags your\n" +
        "  thresholds toward AI norms with nothing in the output to show it.",
    );
  }
  if (o.date && !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) fail("--date must be YYYY-MM-DD");

  const searchPath = profileSearchPath({
    profilesDir: o.profilesDir, projectRoot: o.project, bundleRoot: SKILL_ROOT,
  });

  // Resolve where to WRITE, which is not the same as where profiles are read
  // from: reads fall back to the bundle, writes must never land inside it.
  const writeRoot = o.profilesDir
    ? resolve(o.profilesDir)
    : join(o.project, ".claude", "humanizer", "profiles");
  // A group is a named voice inside a register — a subdirectory the author
  // chooses. Registers are picked by the tool from path rules; groups are picked
  // by the person, because "essay" is often several voices under one label.
  // Only the human corpus is grouped: the AI corpus is negatives, and dividing
  // negatives by voice would be a distinction without a use.
  const groupDir = o.group && !o.ai ? [o.group] : [];
  const target = join(writeRoot, o.profile, "corpus", o.ai ? "ai" : "human", ...groupDir);

  if (!findProfileDir(o.profile, searchPath) && !existsSync(join(writeRoot, o.profile))) {
    const available = [...listProfiles(searchPath).keys()].filter((n) => n !== BASE_PROFILE);
    fail(
      `no profile named "${o.profile}". Available: ${available.join(", ") || "none"}\n` +
        `  Run  node tools/init.mjs  to scaffold one.`,
    );
  }

  const added = [];
  const refused = [];

  for (const file of o.files) {
    if (!existsSync(file) || !statSync(file).isFile()) {
      refused.push({ file, why: "not a file" });
      continue;
    }
    const raw = readFileSync(file, "utf8");
    const body = stripFrontmatter(raw);

    const markdown = extname(file).toLowerCase() !== ".txt";
    const { text } = maskNonProse(body, { markdown });
    const count = words(text).length;
    if (count < MIN_WORDS) {
      refused.push({ file, why: `${count} words, needs ${MIN_WORDS}` });
      continue;
    }

    const date = o.date || isoDate(statSync(file).mtime);
    const frontmatter =
      `---\n` +
      `source: ${o.source}\n` +
      `date: ${date}\n` +
      `human_authored: ${o.ai ? "false" : "true"}\n` +
      `ingested_from: ${basename(file)}\n` +
      `---\n\n`;

    const outName = o.name || basename(file);
    const out = join(target, outName);
    if (existsSync(out) && !o.force) {
      refused.push({ file, why: `${outName} already in this corpus (use --force)` });
      continue;
    }

    mkdirSync(target, { recursive: true });
    writeFileSync(out, frontmatter + body);
    added.push({ out, count, date });
  }

  process.stdout.write(`\n${o.ai ? "AI" : "human"} corpus · profile ${o.profile}\n`);
  for (const a of added) {
    process.stdout.write(`  added    ${basename(a.out)}  (${a.count} words, ${a.date})\n`);
  }
  for (const r of refused) {
    process.stdout.write(`  refused  ${basename(r.file)} — ${r.why}\n`);
  }
  process.stdout.write(`  → ${target}\n`);

  if (!o.ai && added.length) {
    process.stdout.write(
      `\n  Corpus additions are worth their own commit. A sample that arrives as a\n` +
        `  side effect of some other session is exactly the one nobody checks.\n`,
    );
  }

  if (o.recalibrate) {
    process.stdout.write("\n");
    try {
      const args = [join(SKILL_ROOT, "tools", "calibrate.mjs"), o.profile, "--write",
                    "--project", o.project];
      if (o.profilesDir) args.push("--profiles-dir", o.profilesDir);
      process.stdout.write(execFileSync("node", args, { encoding: "utf8" }));
    } catch (err) {
      process.stderr.write(`ingest: recalibration failed — ${err.message}\n`);
      process.exit(1);
    }
  } else if (added.length) {
    process.stdout.write(`\n  Then:  node tools/calibrate.mjs ${o.profile} --write\n`);
  }

  process.exit(refused.length && !added.length ? 1 : 0);
}

// Run only when invoked directly, so this module can be imported.
//
// The obvious form - comparing import.meta.url to `file://${process.argv[1]}` -
// silently does nothing when the path contains a symlink, because import.meta.url
// is resolved and argv[1] is not. On macOS /tmp is a symlink to /private/tmp, so
// any invocation under a temp dir would exit 0 having printed nothing.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();

#!/usr/bin/env node
/**
 * mutations — apply each documented mutation, assert the recorded failure count.
 *
 *   node tests/mutations.mjs            # verify every row
 *   node tests/mutations.mjs --update   # rewrite the table from the runs
 *
 * WHY THIS IS A SCRIPT AND NOT A TABLE. `AGENTS.md` requires the negative test:
 * break a guard, confirm a test fails, restore. The results lived in a
 * hand-maintained markdown table, and a hand-maintained table of measurements is
 * the single failure this project keeps repeating - nine logged instances in
 * CALIBRATION.md, all of them a number that was true when written and untrue
 * when read.
 *
 * It happened to this very table, one commit after it was created. A new
 * cross-implementation check was added, which ALSO fires when the README filter
 * is removed, so a row that correctly said 1 silently became 2. The commit
 * re-ran the row it was adding and not the rows it was invalidating - the exact
 * second-order blindness the log describes.
 *
 * So the table is now output, not input. If a change to the suite alters what a
 * mutation costs, this fails until someone looks.
 *
 * EACH MUTATION MUST STILL BE A REAL DEFECT. A mutation nothing catches means
 * the guard has no test, which is a finding rather than a passing row - the
 * README filter scored 0 that way, and needed a test written before it could
 * honestly appear here at all.
 *
 * IT RUNS ON A COPY, AND THAT IS NOT AN OPTIMISATION. This script used to break
 * real source files in the working tree and restore them afterwards. For the
 * minutes it ran, the repo on disk was intermittently broken - so ANY other
 * process running a suite in that window saw genuinely broken source and
 * reported genuine failures.
 *
 * That is not hypothetical. Two reviewers running in parallel during the
 * prose-fidelity-critic review both reported the prose-tell-scan suite as
 * "flaky", 2-4 intermittent failures. It is not flaky: 8 sequential and 6
 * concurrent runs are green. One reviewer was running mutation experiments while
 * the other ran suites, and they collided through the working tree.
 *
 * The bite is that the repo's own verification gate REQUIRES running
 * verification-critic and architecture-reviewer in parallel. The prescribed
 * review process was unsafe against the repo's own test tooling, and the failure
 * mode was reviewers reporting defects that were not there - which costs trust
 * in precisely the mechanism built to establish it.
 *
 * So: every mutation is applied inside a throwaway copy under the OS temp dir,
 * and the working tree is never written to. Only MUTATIONS.md is, and only on
 * --update.
 */

import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(HERE, "..");
const REPO = resolve(BUNDLE, "..", "..");

/** MUTATIONS.md is the one thing written back to the real tree, on --update only. */
const TABLE = join(HERE, "MUTATIONS.md");

/**
 * Every path below is REPO-RELATIVE, so the same declaration resolves against
 * the working tree (to read the pristine source) or against a sandbox copy (to
 * break it). An absolute path here is how the old version could only ever mutate
 * the real thing.
 */
const TOOLS = "bundles/prose-author/skills/prose-draft/tools";
const SIBLING = "bundles/prose-tell-scan/skills/tell-scan/tools";

const SUITES = {
  author: "bundles/prose-author/tests/selftest.mjs",
  sibling: "bundles/prose-tell-scan/tests/selftest.mjs",
  review: "bundles/prose-review/tests/selftest.mjs",
};

const EXEMPLARS = `${TOOLS}/exemplars.mjs`;
const VERIFY = `${TOOLS}/verify.mjs`;
const INGEST = `${TOOLS}/ingest-edit.mjs`;
const CALIBRATE = `${SIBLING}/calibrate.mjs`;
const EVALUATE = `${SIBLING}/lib/evaluate.mjs`;
const SCANNER = `${SIBLING}/tell-scan.mjs`;
const FIDELITY = "bundles/prose-review/tools/fidelity-scan.mjs";

/**
 * A throwaway copy of the whole repo, minus the things that must not be copied.
 *
 * COPY EVERYTHING, and the first attempt at being clever about it is why. Copying
 * only `bundles/` and `primitives/` looked sufficient - they hold the tools, the
 * corpora, the suites, and the primitives that prose-review's parity check reads.
 * The prose-tell-scan suite then failed on `tell-scan: not a file: <sandbox>/README.md`,
 * because it scans the repo's own README as a real-document case.
 *
 * A suite is allowed to read anything in its repo. Enumerating what it currently
 * happens to touch is a list that goes stale the first time someone adds a test,
 * and it goes stale as a confusing baseline failure. The tree is 4.2 MB without
 * .git; copying it is cheaper than maintaining the list.
 */
const SANDBOX_EXCLUDE = new Set([".git", "node_modules", ".planning"]);

export function createSandbox() {
  const dir = mkdtempSync(join(tmpdir(), "prose-mutations-"));
  cpSync(REPO, dir, {
    recursive: true,
    filter: (src) => !SANDBOX_EXCLUDE.has(src.slice(REPO.length + 1).split("/")[0]),
  });
  return dir;
}

/**
 * Every mutation is a one-line edit that removes a real guarantee. `find` must
 * appear exactly once in the file, or the mutation is ambiguous and the run is
 * meaningless rather than merely failing.
 */
export const MUTATIONS = [
  {
    name: "remove the cap clamp",
    file: EXEMPLARS,
    find: "const effectiveCap = Math.min(Math.max(cap, 0), CAP_CLAMP - Number.EPSILON);",
    with: "const effectiveCap = cap;",
    guards: "human keeps the majority of exemplar slots",
  },
  {
    name: "cold start reports a gap",
    file: VERIFY,
    find: "const calibrated = Boolean(t.derived);",
    with: "const calibrated = true;",
    guards: "no cadence comparison without a calibrated corpus",
  },
  {
    name: "Tier A treated as a normal finding",
    file: VERIFY,
    find: 'const tierA = result.findings.filter((f) => f.tier === "A" && f.flagged);',
    with: "const tierA = [];",
    guards: "an artifact returns the draft instead of being reported",
  },
  {
    name: "drop the attestation requirement",
    file: EXEMPLARS,
    find: "    if (requireAttestation) {",
    with: "    if (false) {",
    guards: "unattested text cannot become the definition of human",
  },
  {
    name: "stop excluding READMEs",
    file: EXEMPLARS,
    find: String.raw`const isReadme = (name) => /^readme\b/i.test(name);`,
    with: "const isReadme = () => false;",
    guards: "scaffolding is never a writing sample",
  },
  {
    name: "lose the loose-file scanner candidate",
    file: VERIFY,
    find: 'rel("..", "..", "tell-scan", "tools", "tell-scan.mjs"),',
    with: "",
    guards: "verification works under the install shape install.sh produces",
  },
  {
    name: "rename readProvenance in calibrate.mjs (sibling present)",
    file: CALIBRATE,
    find: "export function readProvenance(",
    with: "export function readProvenanceRenamed(",
    guards: "the port is pinned against a sibling that CHANGED, not just absent",
  },
  {
    name: "drop .markdown/.mdx from the ported extension set",
    file: EXEMPLARS,
    find: 'export const TEXT_EXT = new Set([".md", ".markdown", ".txt", ".mdx"]);',
    with: 'export const TEXT_EXT = new Set([".md", ".txt"]);',
    guards: "calibration and drafting agree on what counts as a sample",
  },
  {
    name: "change the word floor on one side only",
    file: CALIBRATE,
    find: "export const MIN_SAMPLE_WORDS = 200;",
    with: "export const MIN_SAMPLE_WORDS = 150;",
    guards: "the ported floor equals the sibling's",
  },
  {
    name: "let a trivial edit through ingest",
    file: INGEST,
    find: "  if (ef < INGEST_FLOOR) {",
    with: "  if (false) {",
    guards: "voice does not collapse by accepting the model's near-verbatim output",
  },
  {
    name: "let a sub-minimum sample into approved/",
    file: INGEST,
    find: "  if (editedWords < MIN_SAMPLE_WORDS) {",
    with: "  if (false) {",
    guards: "approved/ never advertises files calibration would exclude",
  },
  {
    name: "let --verify skip the recompute and trust the stored ef",
    file: INGEST,
    find: "  const recomputed = editFraction(originalRaw, body);",
    with: "  const recomputed = declared;",
    guards: "--verify actually re-derives ef rather than restating what the file says",
  },
  {
    name: "reintroduce the model: unknown sentinel",
    file: INGEST,
    find: "    ...(model ? [`model: ${model}`] : []),",
    with: "    `model: ${model || \"unknown\"}`,",
    guards: "the frontmatter never claims an unknown model that would pollute filtering",
  },
  {
    name: "let calibrate skip the aggregate cap on approved samples",
    file: CALIBRATE,
    find: "  const scale = Math.min(1, maxScale);",
    with: "  const scale = 1;",
        suite: "sibling",
    guards: "approved samples cannot dominate the blended pool past the cap",
  },
  {
    name: "let calibrate blend approved samples below the human floor",
    file: CALIBRATE,
    find: "  if (humanCount < CORPUS_MINIMUM) {",
    with: "  if (false) {",
        suite: "sibling",
    guards: "cold-start cannot calibrate against model norms on day one",
  },
  {
    name: "let fidelity-scan pass a MATERIAL-LOSS as FAITHFUL",
    file: FIDELITY,
    suite: "review",
    find: '  return material.length === 0 ? "FAITHFUL" : "MATERIAL-LOSS";',
    with: '  return "FAITHFUL";',
    guards: "the verdict actually distinguishes fidelity states",
  },
  {
    name: "let fidelity-scan cross line breaks with proper-noun runs",
    file: FIDELITY,
    suite: "review",
    // ANCHOR REPAIRED 2026-08-05 (S4). The pattern was a regex literal restricted
    // to ASCII; closing P3(d) rebuilt it from `\p{Lu}`/`\p{Ll}` components with
    // explicit word-edge lookarounds, because `\b` is ASCII even under /u and would
    // have found no boundary before "É" - the fix would have been dead on arrival,
    // silently. The mutation still says the same thing: let the inter-word gap cross
    // a line break, and a heading followed by a capitalised sentence becomes one
    // enormous "proper noun".
    //
    // A dead anchor is why this file HARD-CRASHES rather than scoring 0. A mutation
    // that silently matched nothing would report the guard as untested, which reads
    // like a missing test rather than a stale anchor.
    // NOTE THE QUADRUPLED BACKSLASHES. The anchor is matched against the FILE's
    // source text, where the pattern is a template literal fed to `new RegExp` -
    // so the file contains two literal backslashes before `t`, and a JS string
    // wanting two literal backslashes needs four. The obvious two-backslash
    // version matches nothing.
    find: '`${EDGE_L}${CAP_WORD}(?:[ \\\\t]+(?:of|the|de|van|von|and|for)[ \\\\t]+|[ \\\\t]+)${CAP_WORD}(?:[ \\\\t]+${CAP_WORD})*${EDGE_R}`',
    with: '`${EDGE_L}${CAP_WORD}(?:\\\\s+(?:of|the|de|van|von|and|for)\\\\s+|\\\\s+)${CAP_WORD}(?:\\\\s+${CAP_WORD})*${EDGE_R}`',
    guards: "proper-noun runs stay within a line - a headings-plus-sentence false positive fires on every structured document",
  },
  {
    name: "let fidelity-scan skip thousands-separator normalisation",
    file: FIDELITY,
    suite: "review",
    find: 'function normaliseNumber(n) {\n  return n.replace(/,/g, "");\n}',
    with: 'function normaliseNumber(n) {\n  return n;\n}',
    guards: "1,234 and 1234 read as the same information, so users are not trained to game the formatter",
  },
  {
    // The narrowing warning is the only thing watching for voice collapse, and
    // it shipped reading the wrong field path - computed, written, and dropped
    // one field name from being shown. A reviewer caught it. This mutation is
    // what catches it next time.
    name: "read the narrowing warning from the wrong field path",
    file: SCANNER,
    find: "        warning: profile.thresholds.blended_warning || null,",
    with: "        warning: profile.thresholds.approved?.blended_warning || null,",
    suite: "sibling",
    guards: "the voice-collapse warning reaches the person it is about",
  },
  {
    // The flywheel. calibrate wrote catalog_density_blended for weeks and
    // tell-scan read catalog_density, so an ingested edit changed no output
    // anywhere. Every component passed its own tests throughout. This mutation
    // reopens that gap, and the loop test is what notices.
    name: "let tell-scan ignore the blended bands",
    file: EVALUATE,
    find: "  const use = prefer && usable;",
    with: "  const use = false;",
    suite: "sibling",
    guards: "an approved edit actually changes what the scanner reports",
  },
    {
    name: "trust edit_fraction as a signed number rather than computing it",
    file: INGEST,
    find: "  const lcs = lcsLength(a, b);\n  return round((b.length - lcs) / b.length, 4);",
    with: "  return 1;",
    guards: "edit_fraction is computed from a diff, never asserted",
  },
];

function runSuite(root, suiteRel = SUITES.author) {
  try {
    const out = execFileSync("node", [join(root, suiteRel)], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return parse(out);
  } catch (err) {
    // A non-zero exit is the normal case here - the suite is meant to fail.
    return parse(String(err.stdout || ""));
  }
}

function parse(out) {
  const m = out.match(/(\d+) passed, (\d+) failed/);
  // No summary line means the run DIED rather than finished. Reporting the FAIL
  // lines it managed to print before crashing is how this table got a wrong
  // number in the first place (CALIBRATION.md FN-2026-08-04-j).
  if (!m) return { failed: null, crashed: true };
  return { failed: Number(m[2]), crashed: false };
}

/**
 * Break `mut` inside `root`, which must be a sandbox. Returns the restore thunk.
 *
 * The anchor is checked against the sandbox copy rather than the working tree so
 * that a stale sandbox fails loudly instead of mutating nothing and scoring 0 -
 * a silent 0 reads as "no test covers this guard", which is the one number this
 * file must never get wrong by accident.
 */
export function applyIn(root, mut) {
  const target = join(root, mut.file);
  const src = readFileSync(target, "utf8");
  const occurrences = src.split(mut.find).length - 1;
  if (occurrences !== 1) {
    throw new Error(`anchor appears ${occurrences} times in ${mut.file}: ${mut.name}`);
  }
  writeFileSync(target, src.replace(mut.find, mut.with));
  return () => writeFileSync(target, src);
}

export function runAll() {
  const sandbox = createSandbox();
  try {
    // Every suite must start green in the SANDBOX, not merely in the repo. A copy
    // that did not come across intact would otherwise show up as mutation scores
    // that are all mysteriously high.
    for (const suite of Object.values(SUITES)) {
      const b = runSuite(sandbox, suite);
      if (b.crashed) throw new Error(`baseline suite did not finish in sandbox: ${suite}`);
      if (b.failed !== 0) throw new Error(`baseline is not green in sandbox ${suite}: ${b.failed} failed`);
    }

    const results = [];
    for (const mut of MUTATIONS) {
      // Each mutation names which suite covers it. A mutation in calibrate.mjs
      // affects prose-tell-scan's suite, not this one - running the wrong suite
      // would silently score 0, which is exactly the "no failing mutation" trap
      // this file exists to prevent.
      const suite = SUITES[mut.suite === "sibling" ? "sibling" : mut.suite === "review" ? "review" : "author"];
      const restore = applyIn(sandbox, mut);
      try {
        results.push({ ...mut, ...runSuite(sandbox, suite) });
      } finally {
        restore();
      }
    }

    // Restoration is still checked. It no longer protects the working tree - the
    // sandbox is about to be deleted - but a mutation that fails to restore means
    // every LATER mutation in this run scored against a still-broken file, so the
    // whole table would be wrong.
    for (const suite of Object.values(SUITES)) {
      const after = runSuite(sandbox, suite);
      if (after.failed !== 0) throw new Error(`suite not restored in sandbox: ${suite}`);
    }
    return results;
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

function render(results) {
  const rows = results.map((r) => {
    const n = r.crashed ? "CRASH" : r.failed;
    return `| ${r.name} | ${n} | ${r.guards} |`;
  });
  return ["| mutation | tests failed | what it guards |", "|---|---|---|", ...rows].join("\n");
}

function main() {
  const update = process.argv.includes("--update");
  const results = runAll();
  const table = render(results);

  const weak = results.filter((r) => r.failed === 0 || r.crashed);
  const doc = readFileSync(TABLE, "utf8");
  const current = doc.match(/\| mutation \| tests failed \|[\s\S]*?(?=\n\n)/);

  if (update) {
    writeFileSync(TABLE, current ? doc.replace(current[0], table) : `${doc}\n\n${table}\n`);
    process.stdout.write(`\n${table}\n\n  MUTATIONS.md updated.\n\n`);
  } else {
    process.stdout.write(`\n${table}\n\n`);
    if (!current || current[0].trim() !== table.trim()) {
      process.stdout.write("  MUTATIONS.md does not match this run. Re-run with --update.\n\n");
      process.exit(1);
    }
    process.stdout.write("  MUTATIONS.md matches.\n\n");
  }

  if (weak.length) {
    for (const w of weak) {
      process.stdout.write(
        w.crashed
          ? `  ${w.name}: the suite CRASHED - the count is not a count.\n`
          : `  ${w.name}: NOTHING FAILED. This guard has no test.\n`,
      );
    }
    process.stdout.write("\n");
    process.exit(1);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();

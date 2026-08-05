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
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(HERE, "..");
const SIBLING = resolve(BUNDLE, "..", "prose-tell-scan", "skills", "tell-scan", "tools");
const TOOLS = join(BUNDLE, "skills", "prose-draft", "tools");
const TABLE = join(HERE, "MUTATIONS.md");

const EXEMPLARS = join(TOOLS, "exemplars.mjs");
const VERIFY = join(TOOLS, "verify.mjs");
const CALIBRATE = join(SIBLING, "calibrate.mjs");
const INGEST = join(TOOLS, "ingest-edit.mjs");

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
    name: "trust edit_fraction as a signed number rather than computing it",
    file: INGEST,
    find: "  const lcs = lcsLength(a, b);\n  return round((b.length - lcs) / b.length, 4);",
    with: "  return 1;",
    guards: "edit_fraction is computed from a diff, never asserted",
  },
];

function runSuite() {
  try {
    const out = execFileSync("node", [join(HERE, "selftest.mjs")], {
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

function apply(mut) {
  const src = readFileSync(mut.file, "utf8");
  const occurrences = src.split(mut.find).length - 1;
  if (occurrences !== 1) {
    throw new Error(`anchor appears ${occurrences} times in ${mut.file}: ${mut.name}`);
  }
  writeFileSync(mut.file, src.replace(mut.find, mut.with));
  return () => writeFileSync(mut.file, src);
}

export function runAll() {
  const baseline = runSuite();
  if (baseline.crashed) throw new Error("baseline suite did not finish");
  if (baseline.failed !== 0) throw new Error(`baseline is not green: ${baseline.failed} failed`);

  const results = [];
  for (const mut of MUTATIONS) {
    const restore = apply(mut);
    try {
      results.push({ ...mut, ...runSuite() });
    } finally {
      restore();
    }
  }
  const after = runSuite();
  if (after.failed !== 0) throw new Error("suite not restored after mutations");
  return results;
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

#!/usr/bin/env node
/**
 * pattern-harness — prepare, collect and verify a prose-pattern-critic acceptance run.
 *
 *   node tests/pattern-harness.mjs prepare fixtures 2026-08-05-pattern --draws 3
 *   node tests/pattern-harness.mjs prepare corpus   2026-08-05-pattern-corpus --draws 1
 *   node tests/pattern-harness.mjs collect runs/2026-08-05-pattern
 *   node tests/pattern-harness.mjs verify  runs/2026-08-05-pattern
 *
 * This is prose-review's `run-harness.mjs` idea applied to a critic that reads a different
 * kind of artifact. It is a SEPARATE file rather than a `pattern:` entry in that one's
 * CRITICS table, and that is deliberate: this critic ships on prose-tell-scan's release
 * clock, and a bundle whose tests import another bundle's runner cannot be installed on
 * its own. The duplicated logic is ~150 lines; the coupling would be permanent.
 *
 * WHAT IS AUTOMATED AND WHAT IS NOT. Same split, same reasons.
 *
 *   prepare  — stages every byte the critic may see, strips frontmatter, renames each case
 *              to an opaque id, runs tell-scan and stages the report, writes one
 *              identically-shaped prompt per draw, and refuses to emit anything if a
 *              staged byte carries a verdict word, an expectation key or a provenance
 *              label. `human_authored: false` and `label: ai` live in this corpus's
 *              frontmatter and would hand the critic the answer.
 *   collect  — derives the verdict and the findings count FROM the transcript body and
 *              writes review.json with every finding quoted and `null` where each contract
 *              count belongs. It will not emit transcripts until a person replaces the
 *              nulls, and it never defaults them to 0, because 0 flatters the result.
 *   verify   — re-derives the run's numbers from the wrapped transcripts.
 *
 * dispatch is NOT here. This repo is public and its tests must not need an API key.
 * `prepare` writes prompts; a session dispatching them one clean-context agent per prompt
 * is the intended path, and it is what produced the published run.
 *
 * WHY DRAWS. Critic verdicts are not deterministic: two dispatches of a byte-identical
 * prompt elsewhere in this repo returned opposite verdicts on the same span. `--draws k`
 * writes k prompts per fixture so a run can report agreement instead of implying a
 * determinism it does not have. DECIDE k BEFORE THE RUN. Raising it after seeing a split
 * is choosing the sample that gives the answer you wanted.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(TESTS, "..");
const REPO = resolve(BUNDLE, "..", "..");
const SCAN = join(BUNDLE, "skills", "tell-scan", "tools", "tell-scan.mjs");
const AGENT = join(REPO, "primitives", "agents", "prose-pattern-critic", "agent.md");
const CATALOG = join(BUNDLE, "skills", "tell-scan", "profiles", "_base", "catalog.json");

const VOCAB = ["CLEAN", "REVISE"];
/**
 * The per-finding marker the output contract requires. Bold is OPTIONAL here on purpose:
 * one transcript in the first run emitted `PATTERN:` unbolded, and a counter that reads
 * that as zero findings turns a formatting slip into a transcript that contradicts its own
 * verdict and aborts the run. The drift is real and is recorded in the run log. It is not
 * the counter's job to hide it, nor to be defeated by it.
 */
const FINDING = /^[ \t]*(?:[-*+][ \t]+)?\**PATTERN\**[ \t]*:/gm;
const CONTRACT = ["uncatalogued", "authorship_claims", "echoes_scan"];

/**
 * Every way a staged byte could tell the critic the answer. The first fidelity sweep in
 * this repo was thrown away because `expect: FAITHFUL` sat in a file the critic had to
 * read, and the fix at the time was a sentence in a prompt. A sentence is not a mechanism.
 */
const LEAKS = [
  /\bexpect(?:ed|s)?\s*[:=]/i,
  /\bhuman_authored\b/i,
  /\blabel\s*:\s*ai\b/i,
  /\bmulti_author_collection\b/i,
  /\bscan_state\b/i,
  /\bexpect_pattern\b/i,
  new RegExp(`\\b(?:${VOCAB.join("|")})\\b`),
];

/**
 * SEVEN OF THE 33 AI SAMPLES SAY SO IN THEIR OWN BODY TEXT. They are Wikipedia pages whose
 * vendored text includes the talk-page comment that got them listed - "Complete AI slop",
 * "Clearly AI-generated", "LLM-written" - and one whose citation URLs carry
 * `utm_source=chatgpt.com`. Stripping frontmatter does not touch any of it, and a critic
 * handed one has been told the answer in the draft it is judging.
 *
 * The rule is deliberately BLUNT and over-excludes in the safe direction: it also drops
 * four EFF posts that merely discuss LLMs. Losing four negatives costs nothing; keeping
 * one labelled positive would cost the whole positive column.
 *
 * This is a property of the corpus, not of the staging, so it is a SELECTION RULE and an
 * abort, not a silent scrub: deleting the sentence would edit vendored source, and keeping
 * the sample would produce a number that measures nothing. Excluded samples are counted in
 * the run log so the denominator is visible.
 */
const NAMES_AUTHORSHIP = /\bAI[ -]?(?:slop|generated|written)\b|\bChatGPT\b|\bLLM\b|\bgenerated by (?:an )?AI\b/i;

const die = (msg) => { process.stderr.write(`${msg}\n`); process.exit(2); };

/** Strip a leading YAML frontmatter block. That is where every provenance label lives. */
function stripFrontmatter(text) {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? text.slice(m[0].length).replace(/^\s*\n/, "") : text;
}

/** Opaque, stable, and NOT alphabetical: `p-` in a fixture name is the answer. */
function caseIds(names) {
  const ordered = [...names].sort((a, b) =>
    createHash("sha256").update(a).digest("hex").localeCompare(
      createHash("sha256").update(b).digest("hex")));
  return new Map(ordered.map((n, i) => [n, `case-${String(i + 1).padStart(2, "0")}`]));
}

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

function scanReport(file) {
  const out = execFileSync("node", [SCAN, file, "--profile", "essay", "--json"],
    { encoding: "utf8", maxBuffer: 1e8 });
  const r = JSON.parse(out).results[0];
  return {
    words: r.summary.words,
    flagged_categories: r.summary.flagged_categories,
    cadence_flags: r.summary.cadence_flags,
    flagged_entries: r.findings.filter((f) => f.flagged).map((f) => ({
      id: f.id, category: f.category, per_1000: f.per_1000, count: f.count,
    })),
    thresholds_derived: r.summary.thresholds_derived,
  };
}

export const scanState = (file) =>
  scanReport(file).flagged_categories.length ? "loud" : "quiet";

/* ------------------------------------------------------------------ prepare */

function inputsForFixtures() {
  const manifest = JSON.parse(readFileSync(join(TESTS, "fixtures/pattern/fixtures.json"), "utf8"));
  return manifest.fixtures.map((f) => ({
    name: f.name,
    file: join(TESTS, "fixtures/pattern", f.name, "draft.md"),
  }));
}

/**
 * The corpus sweep. Selection is a WRITTEN RULE evaluated here, not a list someone typed:
 * sorted filenames, take every Nth, so nobody can be asked which samples were chosen and
 * answer "the ones that worked". `--n` fixes the count; the rule fixes which.
 */
function inputsForCorpus(n) {
  let dropped = 0;
  const pick = (dir, want, prefix) => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()
      .filter((f) => {
        // Tested on the STAGED form: the human corpus attests provenance as
        // "predates ChatGPT public launch" in frontmatter, which staging strips.
        const ok = !NAMES_AUTHORSHIP.test(stripFrontmatter(readFileSync(join(dir, f), "utf8")));
        if (!ok) dropped += 1;
        return ok;
      });
    const step = Math.max(1, Math.floor(files.length / want));
    return files.filter((_, i) => i % step === 0).slice(0, want)
      .map((f) => ({ name: `${prefix}-${basename(f, ".txt")}`, file: join(dir, f) }));
  };
  const C = join(TESTS, "corpus");
  const out = [
    ...pick(join(C, "human-essays", "gutenberg"), Math.ceil(n / 2), "h"),
    ...pick(join(C, "human"), 1, "h"),
    ...pick(join(C, "human-professional"), 1, "h"),
    ...pick(join(C, "ai"), n, "x"),
  ];
  process.stdout.write(`corpus selection: ${out.length} samples; ${dropped} excluded because ` +
    "their own body text names AI authorship\n");
  return out;
}

function prepare(set, runId, draws, n) {
  const inputs = set === "corpus" ? inputsForCorpus(n) : inputsForFixtures();
  const runDir = join(TESTS, "runs", runId);
  const stageDir = join(runDir, "staged");
  const promptDir = join(runDir, "prompts");
  mkdirSync(stageDir, { recursive: true });
  mkdirSync(promptDir, { recursive: true });

  const ids = caseIds(inputs.map((i) => i.name));
  const agentBody = readFileSync(AGENT, "utf8").split(/^---$/m).slice(2).join("---").trim();
  const notDeterministic = JSON.parse(readFileSync(CATALOG, "utf8")).not_deterministic;
  const manifest = { run: runId, set, draws, prompt_sha: sha(agentBody), cases: [] };

  for (const input of inputs) {
    const id = ids.get(input.name);
    const draft = stripFrontmatter(readFileSync(input.file, "utf8"));
    const draftPath = join(stageDir, `${id}-draft.md`);
    writeFileSync(draftPath, draft);

    const report = scanReport(draftPath);
    const reportPath = join(stageDir, `${id}-scan.json`);
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    for (const staged of [draft, readFileSync(reportPath, "utf8")]) {
      for (const leak of [...LEAKS, NAMES_AUTHORSHIP]) {
        if (leak.test(staged)) {
          die(`ABORT: staged input for ${id} matches leak guard ${leak} - fix staging, do not dispatch`);
        }
      }
    }

    const prompt = [
      agentBody,
      "",
      "---",
      "",
      "## This case",
      "",
      `The draft is \`staged/${id}-draft.md\`. Read it.`,
      `The \`tell-scan\` report for it is \`staged/${id}-scan.json\`. Read that too, and remember`,
      "that everything in it is the scanner's finding and none of it is yours.",
      "",
      "The five patterns you own, verbatim from the catalog:",
      "",
      ...Object.entries(notDeterministic)
        .filter(([k]) => k !== "_about" && k !== "no-voice-shift")
        .map(([k, v]) => `- \`${k}\` — ${v}`),
      "",
      "Line numbers refer to the staged draft as given. Follow your output contract exactly,",
      "and end with the one-line verdict on its own line.",
      "",
    ].join("\n");

    for (let d = 1; d <= draws; d += 1) {
      writeFileSync(join(promptDir, `${id}-d${d}.md`), prompt);
    }
    manifest.cases.push({
      id, fixture: input.name, draws,
      draft_sha: sha(draft), scan_sha: sha(readFileSync(reportPath, "utf8")),
    });
  }

  writeFileSync(join(runDir, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `prepared ${inputs.length} cases x ${draws} draws = ${inputs.length * draws} prompts\n` +
    `  ${resolve(promptDir)}\n` +
    "Dispatch one clean-context agent per prompt. Write each report verbatim to\n" +
    `  ${resolve(runDir, "raw")}/<prompt basename>.md\n`);
}

/* ------------------------------------------------------------------ collect */

function deriveVerdict(body) {
  const tail = body.trimEnd().split("\n").slice(-6).join("\n");
  const hits = [...tail.matchAll(new RegExp(`\\b(${VOCAB.join("|")})\\b`, "g"))];
  if (!hits.length) return null;
  return hits[hits.length - 1][1];
}

function collect(runDir) {
  const dir = resolve(runDir);
  const rawDir = join(dir, "raw");
  if (!existsSync(rawDir)) die(`no raw/ under ${dir}`);
  const manifest = JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"));
  const reviewPath = join(dir, "review.json");
  const prior = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, "utf8")) : { cases: {} };

  const review = { run: manifest.run, _contract: CONTRACT, cases: {} };
  const rows = [];
  for (const file of readdirSync(rawDir).filter((f) => f.endsWith(".md")).sort()) {
    const key = basename(file, ".md");
    const body = readFileSync(join(rawDir, file), "utf8");
    const verdict = deriveVerdict(body);
    if (!verdict) die(`${file}: no verdict in the last lines - the critic did not end with one`);
    const findings = (body.match(FINDING) || []).length;
    if (verdict === "REVISE" && findings === 0) {
      die(`${file}: REVISE with zero **PATTERN** blocks - the transcript contradicts itself`);
    }
    const p = prior.cases?.[key] ?? {};
    review.cases[key] = Object.fromEntries(
      CONTRACT.map((c) => [c, typeof p[c] === "number" ? p[c] : null]));
    review.cases[key].verdict = verdict;
    review.cases[key].findings = findings;
    review.cases[key].patterns_named = [...new Set(
      (body.match(/^[ \t]*(?:[-*+][ \t]+)?\**PATTERN\**[ \t]*:\s*`?[a-z-]+`?/gm) || [])
        .map((m) => m.replace(/.*?:\s*`?/, "").replace(/`.*/, "").trim()))];
    rows.push({ key, verdict, findings });
  }
  writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);

  const missing = Object.entries(review.cases)
    .filter(([, v]) => CONTRACT.some((c) => v[c] === null)).map(([k]) => k);
  if (missing.length) {
    process.stdout.write(
      `wrote ${reviewPath}\n${rows.length} transcripts read.\n\n` +
      `${missing.length} case(s) still have a null contract count. A human reads the quoted\n` +
      "findings and fills them in; nothing here may default them to 0.\n");
    process.exit(1);
  }
  verify(dir);
}

/* ------------------------------------------------------------------- verify */

function verify(runDir) {
  const dir = resolve(runDir);
  const review = JSON.parse(readFileSync(join(dir, "review.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"));
  const byCase = new Map(manifest.cases.map((c) => [c.id, c]));
  const fixtures = manifest.set === "fixtures"
    ? JSON.parse(readFileSync(join(TESTS, "fixtures/pattern/fixtures.json"), "utf8")).fixtures
    : [];
  const expected = new Map(fixtures.map((f) => [f.name, f]));

  // Group draws by case so a split can be reported as a split.
  const groups = new Map();
  for (const [key, v] of Object.entries(review.cases)) {
    const id = key.replace(/-d\d+$/, "");
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(v);
  }

  let matched = 0; let scored = 0; let split = 0;
  const lines = [];
  for (const [id, draws] of [...groups].sort()) {
    const meta = byCase.get(id);
    const verdicts = draws.map((d) => d.verdict);
    const tally = verdicts.reduce((a, v) => ({ ...a, [v]: (a[v] || 0) + 1 }), {});
    const majority = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (Object.keys(tally).length > 1) split += 1;
    const exp = expected.get(meta?.fixture);
    let mark = "";
    if (exp) {
      scored += 1;
      if (majority[0] === exp.expect) { matched += 1; mark = "  ok"; } else { mark = "  MISS"; }
    }
    lines.push(`  ${id}  ${meta?.fixture ?? "?"}  ${majority[0]} ${majority[1]}/${verdicts.length}` +
      `${exp ? `  expected ${exp.expect}` : ""}${mark}`);
  }

  const all = Object.values(review.cases);
  const totals = Object.fromEntries(CONTRACT.map((c) =>
    [c, all.reduce((n, v) => n + (v[c] ?? 0), 0)]));

  process.stdout.write(`\n${lines.join("\n")}\n\n`);
  if (scored) {
    process.stdout.write(`    majority verdicts matching the fixture's expectation:  ${matched} of ${scored}\n`);
  }
  process.stdout.write(
    `    cases whose draws did not agree with each other:       ${split} of ${groups.size}\n` +
    `    findings naming no catalogued pattern (uncatalogued):  ${totals.uncatalogued}   <- must be 0\n` +
    `    claims about machine authorship:                       ${totals.authorship_claims}   <- must be 0\n` +
    `    findings restating a deterministic scan hit:           ${totals.echoes_scan}   <- must be 0\n\n` +
    "    echo baseline: NOT APPLICABLE. The scanner emits no verdict on any pattern this\n" +
    "    critic owns, so there is no verdict to parrot and no rate to beat. See\n" +
    "    critic-harness.md; do not substitute a number here to fill the shape.\n");

  const violated = CONTRACT.filter((c) => totals[c] > 0);
  if (violated.length) {
    process.stderr.write(`\nCONTRACT VIOLATION: ${violated.join(", ")}\n`);
    process.exit(1);
  }
}

/* --------------------------------------------------------------------- main */

// Guarded, because `selftest.mjs` imports `scanState` from here to re-derive each
// fixture's class. An unguarded main block would make importing this file print a usage
// message and exit 2, which is a test suite failing for a reason that has nothing to do
// with what it tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (name, dflt) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? dflt : Number(rest[i + 1]);
  };
  if (cmd === "prepare") prepare(rest[0], rest[1], flag("draws", 1), flag("n", 6));
  else if (cmd === "collect") collect(rest[0]);
  else if (cmd === "verify") verify(rest[0]);
  else die("usage: pattern-harness.mjs prepare <fixtures|corpus> <run-id> [--draws k] [--n k]\n" +
           "       pattern-harness.mjs collect|verify <run-dir>");
}

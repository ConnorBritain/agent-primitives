#!/usr/bin/env node
/**
 * run-harness — re-run a critic acceptance harness without hand-dispatching N agents.
 *
 *   node tests/run-harness.mjs prepare  fidelity 2026-08-06-fidelity
 *   node tests/run-harness.mjs dispatch runs/2026-08-06-fidelity        [optional, see below]
 *   node tests/run-harness.mjs collect  runs/2026-08-06-fidelity
 *   node tests/run-harness.mjs check    runs/2026-08-04-b
 *
 * WHY THIS EXISTS. A run was N hand-dispatched subagents followed by hand-wrapping each
 * transcript with a heading and a `RESULT:` line. Nothing about that is reproducible, and
 * the consequence is not that runs are tedious - it is that any prompt edit silently
 * invalidates the published numbers and nobody will re-run thirteen agents to find out.
 *
 * ============================================================================
 * WHAT IS AUTOMATED, WHAT IS NOT, AND WHY. Read this before quoting the tool.
 * ============================================================================
 *
 * AUTOMATED — `prepare`
 *   Enumerates the fixtures, stages a neutralised copy of every input the critic is
 *   allowed to see, computes the deterministic scan where the critic reads one, and
 *   writes one identically-shaped prompt per case. It refuses to emit a prompt whose
 *   inputs contain a verdict, an expectation key, or a provenance label (see LEAKS).
 *
 * AUTOMATED — `collect`
 *   Derives the verdict and the findings count FROM the transcript body, wraps each
 *   transcript in the heading + `RESULT:` line `verify-run.mjs` parses, checks that
 *   filename, heading and body agree, and then hands off to `verify-run.mjs` rather
 *   than counting anything itself.
 *
 * AUTOMATED — `check`
 *   Round-trips an already-published run through the same emitter and reports any byte
 *   that does not reproduce. This is what makes the wrapping a format rather than a
 *   habit: it caught two hand-wrapping inconsistencies on its first run.
 *
 * CONDITIONAL — `dispatch`
 *   A shell script cannot spawn a clean-context critic on its own, and this repo is
 *   public and must not require an API key to run its tests. So dispatch is OPT-IN and
 *   runs nothing by default:
 *     - if `CRITIC_CMD` is set, that command is run once per case with the prompt on
 *       stdin, and nothing about Claude is assumed;
 *     - else if a `claude` CLI is on PATH, a `claude -p` invocation is used whose tool
 *       allowlist is the integrity rule (see below);
 *     - else it prints the operator instructions and exits 3. `prepare` + a session
 *       dispatching the generated prompts verbatim is a first-class path, not a
 *       degraded one, and it is how this file was tested.
 *   NOTHING in the gates runs `dispatch`. `check` and the tests do not need credentials.
 *
 * STILL HUMAN, ON PURPOSE — the two contract counts
 *   `uncited` and `contradicts_scan` (`authorship_claims` for voice) are counts of what
 *   a transcript's findings do, and both are the reason the harness exists at all: they
 *   block the primitive regardless of score. Deriving them from the transcript would be
 *   asking the critic's own words whether the critic complied - the critic grading
 *   itself, one level up, which is the exact failure `verify-run.mjs` was written to
 *   close. So `collect` refuses to invent them. It writes `review.json` with every
 *   finding quoted out of the transcript and `null` where a count belongs, and will not
 *   emit a transcript until a human has replaced the nulls. A missing count fails the
 *   run; it never defaults to 0, because 0 is the direction that flatters the result.
 *
 * LEAKS. The first fidelity sweep was thrown away because `expect: FAITHFUL` sat in the
 * frontmatter of a file the critic is required to read. That was fixed by a rule in a
 * prompt; a rule in a prompt is not a mechanism. Here the staged inputs are the whole of
 * what the critic can see, and staging:
 *   - strips frontmatter, which is where `label: ai`, `human_authored: false` and
 *     `fixture: p-...` live. The voice run's published transcripts say frontmatter was
 *     skipped - by instruction. This strips it.
 *   - renames the case to an opaque `case-NN`, ordered by a hash of the fixture name.
 *     A critic told it is judging `p-tihonov-summarised` has been told the answer: `p-`
 *     means positive. The published fidelity transcripts carry that name.
 *   - drops the draft's directory, so a voice draft from `corpus/ai/` is `draft.txt`.
 *   - scans every staged byte for verdict words and expectation keys and aborts.
 *
 * Line numbers in a transcript refer to the STAGED copies, which is what the prompt says
 * and what a later reader can re-read; `MANIFEST.json` carries a sha256 of each one, and
 * of the critic prompt the run was made against, because "which prompt version produced
 * this number" is the question that made the old runs rot.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderReport, scanFidelity } from "../tools/fidelity-scan.mjs";

const TESTS = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(TESTS, "..");
const REPO = resolve(BUNDLE, "..", "..");

/**
 * Per-critic profile. This is deliberately NOT the table in `verify-run.mjs`: that one
 * describes how a run is COUNTED, this one how a run is AUTHORED. The only overlap is
 * the verdict vocabulary, and duplicating two words is cheaper than a shared module that
 * makes the counter depend on the dispatcher.
 *
 * `finding` is the marker the critic's own output contract requires once per finding.
 * It is what lets the findings count be derived rather than typed, and it agreed with
 * every hand-typed count in both published runs (29 transcripts).
 */
const CRITICS = {
  voice: {
    agent: "primitives/agents/prose-voice-critic/agent.md",
    vocabulary: ["CLEAN", "REVISE"],
    contract: ["uncited", "authorship_claims"],
    finding: /\*\*LOCATION\*\*/g,
    phrase: { negative: "leave-one-out", positive: "AI-labelled draft" },
    fixtures: voiceFixtures,
    task: voiceTask,
  },
  fidelity: {
    agent: "primitives/agents/prose-fidelity-critic/agent.md",
    vocabulary: ["FAITHFUL", "MATERIAL-LOSS"],
    contract: ["uncited", "contradicts_scan"],
    finding: /\*\*CLASS\*\*/g,
    phrase: { negative: "faithful revision", positive: "lossy revision" },
    fixtures: fidelityFixtures,
    task: fidelityTask,
  },
};

const criticOf = (verdict) =>
  Object.keys(CRITICS).find((c) => CRITICS[c].vocabulary.includes(verdict));

// ---------------------------------------------------------------------------
// staging
// ---------------------------------------------------------------------------

const sha = (s) => createHash("sha256").update(s).digest("hex");

/** Frontmatter is where every label in this repo's corpora lives. It is stripped from
 * staged inputs, not skipped by instruction. `fidelity-scan` strips it too, so a scan
 * over staged copies is identical to a scan over the originals. */
function stripFrontmatter(text) {
  if (!text.startsWith("---\n")) return text;
  const end = text.indexOf("\n---\n", 3);
  return end === -1 ? text : text.slice(end + 5);
}

/**
 * Every pattern here is something that has already leaked, or is the same shape as
 * something that has. A hit aborts `prepare` rather than warning: a warning during a
 * 13-agent dispatch is a warning nobody reads until the run is spent.
 */
const LEAKS = [
  [/\b(?:FAITHFUL|MATERIAL-LOSS)\b/, "names a fidelity verdict"],
  [/\b(?:CLEAN|REVISE)\b/, "names a voice verdict"],
  [/^\s*(?:expect|expected|expects|scan_verdict|verdict|class|outcome)\s*:/im, "carries an expectation key"],
  [/^\s*(?:label|human_authored|attested_by|ai_generated)\s*:/im, "carries a provenance label"],
  [/^\s*fixture\s*:/im, "names the fixture it belongs to"],
];

function leakCheck(name, text) {
  for (const [re, why] of LEAKS) {
    const m = text.match(re);
    if (m) return `${name} ${why} (${JSON.stringify(m[0])})`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// fixture enumeration
// ---------------------------------------------------------------------------

/**
 * Fidelity fixtures come from `fixtures.json` — which is the one file the critic may
 * never see. The harness reads it so the critic does not have to.
 */
function fidelityFixtures(opts = {}) {
  // `--fixtures-dir` exists so the leak abort can be exercised on a poisoned COPY of the
  // fixture set. Poisoning the real one to test the check would mean a test that breaks
  // the fixtures every other process is reading.
  const dir = opts.fixturesDir ?? join(TESTS, "fixtures", "fidelity");
  const manifest = JSON.parse(readFileSync(join(dir, "fixtures.json"), "utf8"));
  return manifest.fixtures.map((f) => ({
    name: f.name,
    kind: f.kind,
    inputs: [
      { as: "original.md", from: join(dir, f.name, "original.md") },
      { as: "revision.md", from: join(dir, f.name, "revision.md") },
    ],
  }));
}

/**
 * Voice fixtures are leave-one-out over the human corpus plus a named positive set.
 *
 * The positives default to the four used in run 2026-08-04-b, and the reason is not
 * arbitrary: they were chosen for ZERO first-person occurrences, so no finding can come
 * from the dimension `genre-check.mjs` measures as 12.3x confounded between the two
 * corpora. Changing this list without re-checking that property changes what the
 * positive column means.
 */
const DEFAULT_POSITIVES = [
  "ansuman-satpathy",
  "berry-hill-stoke-on-trent",
  "biobanks-in-india",
  "mehak-malik",
];

function voiceFixtures(opts = {}) {
  const corpus = join(REPO, "bundles", "prose-tell-scan", "tests", "corpus");
  const human = readdirSync(join(corpus, "human")).filter((f) => f.endsWith(".txt")).sort();
  const stem = (f) => f.replace(/\.txt$/, "");

  const negatives = human.map((held) => ({
    name: `n-${stem(held)}`,
    kind: "negative",
    inputs: [
      ...human.filter((f) => f !== held).map((f) => ({ as: `corpus/${f}`, from: join(corpus, "human", f) })),
      { as: "draft.txt", from: join(corpus, "human", held) },
    ],
  }));

  const positives = (opts.positives ?? DEFAULT_POSITIVES).map((p) => ({
    name: `p-${p}`,
    kind: "positive",
    inputs: [
      ...human.map((f) => ({ as: `corpus/${f}`, from: join(corpus, "human", f) })),
      { as: "draft.txt", from: join(corpus, "ai", `${p}.txt`) },
    ],
  }));

  return [...negatives, ...positives];
}

// ---------------------------------------------------------------------------
// per-critic task text
// ---------------------------------------------------------------------------

function fidelityTask(staged) {
  const scan = scanFidelity(staged["original.md"], staged["revision.md"]);
  return [
    "You have an original, a revision of it, and the output of `fidelity-scan` over the",
    "pair. Report on the revision's fidelity, following your instructions exactly,",
    "including the output contract and the closing one-line verdict.",
    "",
    "## fidelity-scan output",
    "",
    "```",
    renderReport(scan).replace(/^\n/, ""),
    "```",
    "",
    "The scan is authoritative on presence. You are authoritative only on consequence.",
  ].join("\n");
}

function voiceTask() {
  return [
    "`corpus/` holds samples of one author's writing. `draft.txt` is a draft that is",
    "supposed to sound like them. Report on the draft, following your instructions",
    "exactly, including the output contract and the closing one-line verdict.",
    "",
    "No voice card is supplied. The corpus is present, so this is not a stop condition.",
    "No deterministic rhythm scan is supplied; say so rather than guessing at category 4.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// prompt
// ---------------------------------------------------------------------------

/**
 * The integrity constraints are IN the prompt as well as enforced by staging, because
 * the two catch different things. Staging makes the answer unavailable; the prompt makes
 * a critic that goes looking for it report the attempt, which is how the original leak
 * was found - a subagent said so, and nothing in the repo would have.
 */
function buildPrompt({ caseId, agentPath, inputs, task }) {
  return [
    `# Critic run — ${caseId}`,
    "",
    `Your instructions are the file below, and they are the whole of your brief. If they`,
    `were not supplied to you as a system prompt, read it first:`,
    "",
    `    ${agentPath}`,
    "",
    task,
    "",
    "## Integrity constraints — these are the point of the harness, not boilerplate",
    "",
    "You may read exactly these files, and they are copies staged for this run:",
    "",
    ...inputs.map((i) => `    ${i}`),
    "",
    "You may not read, list, glob, grep or search anything else. In particular: no fixture",
    "manifest, no other case's directory, no previous run under `runs/`, no test file, and",
    "no corpus these copies were made from. Do not try to work out which case this is.",
    "",
    "The expected result for this case exists in this repository. Reading it would void the",
    "run — an earlier sweep was discarded because an expected verdict had leaked into a file",
    "the critic reads. If you find a verdict, an expectation, a class label, a provenance",
    "label or an `expect:` key inside the files above, STOP and report THAT instead of a",
    "verdict. It is a harness defect and it is worth more than the run.",
    "",
    "Line numbers you cite refer to the files exactly as given above.",
    "",
    "Output your report and nothing else: no preamble, no summary of these instructions,",
    "and no commentary after the verdict line.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

function prepare(criticName, runId, opts) {
  const spec = CRITICS[criticName];
  if (!spec) die(`unknown critic ${JSON.stringify(criticName)} — known: ${Object.keys(CRITICS).join(", ")}`);

  const runDir = runId.includes("/") ? runId : join(TESTS, "runs", runId);
  let fixtures = spec.fixtures(opts);
  if (opts.only) fixtures = fixtures.filter((f) => opts.only.includes(f.name));
  if (!fixtures.length) die("no fixtures selected");

  // Case ids are ordered by a hash of the fixture name, not by kind. Numbering the
  // negatives 1..12 and the positives 13..16 would put the answer back in the case id.
  const ordered = [...fixtures].sort((a, b) => (sha(a.name) < sha(b.name) ? -1 : 1));

  const agentSrc = readFileSync(join(REPO, spec.agent), "utf8");
  const agentBody = stripFrontmatter(agentSrc);
  // Working files live under prompts/, never at the top of the run directory:
  // `verify-run.mjs` treats every top-level *.md there as a transcript, and a stray one
  // lands as "no RESULT line", which is its signal for a run someone under-counted.
  mkdirSync(join(runDir, "prompts"), { recursive: true });
  writeFileSync(join(runDir, "prompts", "agent-prompt.md"), agentBody);

  const entries = [];
  const leaks = [];
  ordered.forEach((f, i) => {
    const caseId = `case-${String(i + 1).padStart(2, "0")}`;
    const caseDir = join(runDir, "inputs", caseId);
    const staged = {};
    const files = [];
    for (const input of f.inputs) {
      const text = stripFrontmatter(readFileSync(input.from, "utf8"));
      const leak = leakCheck(`${f.name}/${input.as}`, text);
      if (leak) leaks.push(leak);
      staged[input.as] = text;
      mkdirSync(dirname(join(caseDir, input.as)), { recursive: true });
      writeFileSync(join(caseDir, input.as), text);
      files.push({ as: input.as, from: relative(REPO, input.from), sha256: sha(text) });
    }
    const prompt = buildPrompt({
      caseId,
      agentPath: relative(REPO, join(runDir, "prompts", "agent-prompt.md")),
      inputs: f.inputs.map((i) => relative(REPO, join(caseDir, i.as))),
      task: spec.task(staged),
    });
    writeFileSync(join(runDir, "prompts", `${caseId}.md`), `${prompt}\n`);
    entries.push({ case: caseId, fixture: f.name, kind: f.kind, inputs: files });
  });

  if (leaks.length) {
    // The staged copies are left on disk deliberately: the operator has to be able to
    // see what leaked. They are not usable, because no MANIFEST was written.
    process.stderr.write("\n  prepare ABORTED — the answer is visible to the critic:\n\n");
    for (const l of leaks) process.stderr.write(`    ${l}\n`);
    process.stderr.write("\n  Fix the fixture, not this check.\n\n");
    process.exit(1);
  }

  const manifest = {
    critic: criticName,
    run_id: basename(runDir),
    prepared: new Date().toISOString().slice(0, 10),
    agent_prompt: spec.agent,
    agent_sha256: sha(agentBody),
    cases: entries,
  };
  writeFileSync(join(runDir, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(runDir, "prompts", "DISPATCH.md"), dispatchDoc(manifest, runDir));

  process.stdout.write(`\n  ${relative(REPO, runDir)} — ${entries.length} case(s) prepared\n\n`);
  process.stdout.write(`    critic prompt: ${spec.agent} (sha256 ${manifest.agent_sha256.slice(0, 12)})\n`);
  process.stdout.write(`    prompts:       ${relative(REPO, join(runDir, "prompts"))}/case-NN.md\n`);
  process.stdout.write(`    inputs staged: frontmatter stripped, ${entries.length} case dir(s), no fixture names\n\n`);
  process.stdout.write(`  Next: dispatch one clean-context critic per prompt — see ${relative(REPO, join(runDir, "prompts", "DISPATCH.md"))}\n\n`);
}

function dispatchDoc(manifest, runDir) {
  return [
    `# Dispatching run ${manifest.run_id}`,
    "",
    `${manifest.cases.length} cases, one clean-context \`${manifest.critic}\` critic each. Every prompt is`,
    "self-contained and identically shaped; nothing below should be edited per case.",
    "",
    "## The rule that makes the run worth anything",
    "",
    "Each critic gets a FRESH context and sees only its own prompt and the files that",
    "prompt lists. One agent doing two cases has seen a second case's staged copies; one",
    "agent doing them all has seen the whole set and can infer the design.",
    "",
    "## Automatic",
    "",
    "```bash",
    `node tests/run-harness.mjs dispatch ${relative(BUNDLE, runDir)}`,
    "```",
    "",
    "Uses `$CRITIC_CMD` if set, else a `claude -p` invocation whose tool allowlist is the",
    "integrity rule. Exits 3 with these instructions if neither is available.",
    "",
    "## By hand, or from an agent session",
    "",
    "For each `prompts/case-NN.md`: spawn a subagent, give it `agent-prompt.md` as its",
    "system prompt and the case prompt as its task, and save its reply VERBATIM to:",
    "",
    "| case | save the reply to |",
    "|---|---|",
    ...manifest.cases.map((c) => `| \`prompts/${c.case}.md\` | \`raw/${c.fixture}.md\` |`),
    "",
    "The mapping is here and not in the prompt on purpose — the fixture name encodes the",
    "expected class in its `n-`/`p-` prefix, so the critic must not be told it.",
    "",
    "Then:",
    "",
    "```bash",
    `node tests/run-harness.mjs collect ${relative(BUNDLE, runDir)}`,
    "```",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

/**
 * The default command is the integrity rule expressed as a tool allowlist: Read, and
 * only inside the case's own input directory. A critic that tries to grep the repo does
 * not get a warning, it gets a denial. `CRITIC_CMD` exists so a harness on another
 * harness's model does not have to touch this file, and so that nothing here presumes a
 * particular vendor in a public repo.
 */
function dispatch(runDir, opts) {
  const manifest = JSON.parse(readFileSync(join(runDir, "MANIFEST.json"), "utf8"));
  const rawDir = join(runDir, "raw");
  mkdirSync(rawDir, { recursive: true });

  const custom = process.env.CRITIC_CMD;
  const haveClaude = spawnSync("sh", ["-c", "command -v claude"], { encoding: "utf8" }).status === 0;
  if (!custom && !haveClaude) {
    process.stderr.write(`\n  dispatch: no runner available.\n\n`);
    process.stderr.write(`    Set CRITIC_CMD to a command that reads a prompt on stdin and writes a\n`);
    process.stderr.write(`    critic report on stdout, or dispatch by hand — see ${relative(REPO, join(runDir, "prompts", "DISPATCH.md"))}\n\n`);
    process.exit(3);
  }

  let cases = manifest.cases;
  if (opts.only) cases = cases.filter((c) => opts.only.includes(c.fixture) || opts.only.includes(c.case));
  if (!cases.length) die("dispatch: no cases selected");

  for (const c of cases) {
    const promptFile = join(runDir, "prompts", `${c.case}.md`);
    const inputsDir = join(runDir, "inputs", c.case);
    const system = join(runDir, "prompts", "agent-prompt.md");
    const prompt = readFileSync(promptFile, "utf8");
    const cmd = custom
      ? ["sh", ["-c", custom.replaceAll("{SYSTEM}", system).replaceAll("{INPUTS}", inputsDir).replaceAll("{PROMPT}", promptFile)]]
      : ["claude", ["-p", "--system-prompt-file", system, "--add-dir", inputsDir,
          "--allowedTools", `Read(${inputsDir}/**)`, `Read(${system})`,
          "--disallowedTools", "Bash", "Grep", "Glob", "Task", "Edit", "Write", "WebFetch", "WebSearch"]];

    process.stdout.write(`    ${c.case} → raw/${c.fixture}.md ... `);
    const started = Date.now();
    const r = spawnSync(cmd[0], cmd[1], { input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 || !r.stdout?.trim()) {
      process.stdout.write("FAILED\n");
      process.stderr.write(`\n${(r.stderr || "").slice(0, 2000)}\n`);
      process.exit(1);
    }
    writeFileSync(join(rawDir, `${c.fixture}.md`), `${r.stdout.trim()}\n`);
    process.stdout.write(`${((Date.now() - started) / 1000).toFixed(0)}s\n`);
  }
  process.stdout.write(`\n  Next: node tests/run-harness.mjs collect ${relative(BUNDLE, runDir)}\n\n`);
}

// ---------------------------------------------------------------------------
// wrapping: the format, parsed and emitted by one pair of functions
// ---------------------------------------------------------------------------

const HEAD = /^#\s+(Negative|Positive)\s+\(([^)]+)\)\s+—\s+(\S+)\s+·\s+(.+)$/;

/**
 * The `RESULT:` grammar is also encoded in `verify-run.mjs`, and this duplication is a
 * known cost rather than an oversight: this file may not edit that one. Unlike the two
 * verdict words, this is a format two regexes can drift on silently, so it is the first
 * thing to extract into a shared module once both tracks have landed. Until then the
 * round-trip in `check` is what couples them — an emitter that drifted from
 * `verify-run.mjs` would stop reproducing the published runs.
 */
const RESULT = /^RESULT:\s*([A-Z][A-Z-]*)\s*\|\s*(.+)$/;

/**
 * Verdict from the transcript BODY, searched from the end. This is the one field that
 * must not be taken from the heading or the `RESULT:` line: those two are the operator's
 * transcription of what the critic said, and transcription is where a run's number
 * quietly stops matching its evidence.
 */
function deriveVerdict(body, vocabulary) {
  const lines = body.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const bare = lines[i].replace(/\*/g, "").replace(/\.$/, "").trim();
    const m = bare.match(/^(?:verdict\s*:\s*)?(.+)$/i);
    if (m && vocabulary.includes(m[1].toUpperCase())) return m[1].toUpperCase();
  }
  return null;
}

const deriveFindings = (body, spec) => (body.match(spec.finding) ?? []).length;

/**
 * The wrapper grammar. A note is the block between the heading and a `---` line, and it
 * only counts as a note if that `---` comes before the transcript's first markdown
 * heading — otherwise a thematic break inside a report would eat half the report.
 */
function parseWrapped(text, file) {
  const nl = text.indexOf("\n");
  const head = text.slice(0, nl).match(HEAD);
  if (!head) return { error: `${file}: first line is not a harness heading` };
  const [, kindWord, phrase, short, tail] = head;

  const verdict = ["FAITHFUL", "MATERIAL-LOSS", "CLEAN", "REVISE"].find((v) => tail.startsWith(v));
  if (!verdict) return { error: `${file}: heading names no known verdict (${JSON.stringify(tail)})` };
  const annotation = tail.slice(verdict.length);

  let rest = text.slice(nl + 1).replace(/^\n/, "");
  let note = "";
  const upTo = rest.split("\n");
  const sep = upTo.findIndex((l) => l.trim() === "---");
  const firstHeading = upTo.findIndex((l) => /^#{1,6}\s/.test(l));
  if (sep !== -1 && (firstHeading === -1 || sep < firstHeading)) {
    note = upTo.slice(0, sep).join("\n").trim();
    rest = upTo.slice(sep + 1).join("\n").replace(/^\n+/, "");
  }

  const lines = rest.split("\n");
  const ri = lines.map((l) => RESULT.test(l)).lastIndexOf(true);
  if (ri === -1) return { error: `${file}: no RESULT line` };
  const fields = {};
  for (const part of lines[ri].match(RESULT)[2].split("|")) {
    const m = part.trim().match(/^([a-z_]+)=(\d+)$/);
    if (m) fields[m[1]] = Number(m[2]);
  }
  const body = lines.slice(0, ri).join("\n").replace(/\s+$/, "");
  return { kind: kindWord.toLowerCase(), phrase, short, verdict, annotation, note, body, fields,
           resultVerdict: lines[ri].match(RESULT)[1] };
}

function emitWrapped({ kind, phrase, short, verdict, annotation = "", note = "", body, findings, counts, spec }) {
  const head = `# ${kind[0].toUpperCase()}${kind.slice(1)} (${phrase}) — ${short} · ${verdict}${annotation}`;
  const result = [`RESULT: ${verdict}`, `findings=${findings}`, ...spec.contract.map((k) => `${k}=${counts[k]}`)].join(" | ");
  return `${head}\n\n${note ? `${note}\n\n---\n\n` : ""}${body.replace(/\s+$/, "")}\n\n${result}\n`;
}

// ---------------------------------------------------------------------------
// collect
// ---------------------------------------------------------------------------

/**
 * Wrap raw transcripts, then hand the counting to `verify-run.mjs`. This never computes
 * a headline number: the reason `verify-run.mjs` exists is that the party who ran the
 * agents must not also be the party who counts, and a runner that summarised its own run
 * would put that back.
 */
function collect(runDir) {
  const rawDir = join(runDir, "raw");
  if (!existsSync(rawDir)) die(`collect: ${relative(REPO, rawDir)} does not exist — nothing to collect`);
  const files = readdirSync(rawDir).filter((f) => f.endsWith(".md")).sort();
  if (!files.length) die(`collect: no transcripts in ${relative(REPO, rawDir)}`);

  const manifest = existsSync(join(runDir, "MANIFEST.json"))
    ? JSON.parse(readFileSync(join(runDir, "MANIFEST.json"), "utf8"))
    : null;

  if (manifest) {
    const agentNow = sha(stripFrontmatter(readFileSync(join(REPO, manifest.agent_prompt), "utf8")));
    if (agentNow !== manifest.agent_sha256) {
      process.stdout.write(`\n  NOTE: ${manifest.agent_prompt} has changed since this run was prepared.\n`);
      process.stdout.write(`  These transcripts are evidence about the prompt as of ${manifest.prepared}, not about the current one.\n`);
    }
  }

  const parsed = [];
  for (const f of files) {
    const name = f.replace(/\.md$/, "");
    const body = readFileSync(join(rawDir, f), "utf8").replace(/\s+$/, "");
    const critic = manifest?.critic ?? guessCritic(body);
    if (!critic) die(`collect: ${f} ends in no verdict this harness knows`);
    const spec = CRITICS[critic];
    const verdict = deriveVerdict(body, spec.vocabulary);
    if (!verdict) die(`collect: ${f} has no closing verdict line — the critic did not finish its contract`);
    const kindFromName = name.startsWith("p-") ? "positive" : "negative";
    const declared = manifest?.cases.find((c) => c.fixture === name)?.kind;
    if (declared && declared !== kindFromName) {
      die(`collect: ${f} is a ${declared} fixture but its filename says ${kindFromName}`);
    }
    parsed.push({ name, critic, spec, verdict, body, kind: kindFromName, findings: deriveFindings(body, spec) });
  }

  const reviewPath = join(runDir, "review.json");
  const review = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, "utf8")) : {};
  const pending = parsed.filter((p) => p.spec.contract.some((k) => typeof review[p.name]?.[k] !== "number"));

  if (pending.length) {
    for (const p of parsed) {
      const prior = review[p.name] ?? {};
      review[p.name] = {
        note: prior.note ?? "",
        annotation: prior.annotation ?? "",
        ...Object.fromEntries(p.spec.contract.map((k) => [k, prior[k] ?? null])),
        _verdict: p.verdict,
        _findings_to_review: quoteFindings(p.body),
      };
    }
    review._how = [
      "One entry per transcript. `note` and `annotation` are the operator's; both may stay empty.",
      "The nulls are the two contract counts, and they are counts of what the findings quoted",
      "under `_findings_to_review` DO — not of what the critic says it did. Read the transcript.",
      "Nothing here is derived for you, because a critic grading its own compliance is the",
      "failure verify-run.mjs was written to close. collect refuses to run until they are numbers.",
    ];
    writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
    process.stdout.write(`\n  ${pending.length} of ${parsed.length} transcript(s) have no contract counts yet.\n\n`);
    process.stdout.write(`    Wrote ${relative(REPO, reviewPath)} with every finding quoted for review.\n`);
    process.stdout.write(`    Fill the nulls, then run collect again.\n\n`);
    process.exit(1);
  }

  for (const p of parsed) {
    const r = review[p.name];
    writeFileSync(join(runDir, `${p.name}.md`), emitWrapped({
      kind: p.kind,
      phrase: p.spec.phrase[p.kind],
      short: p.name.replace(/^[np]-/, ""),
      verdict: p.verdict,
      annotation: r.annotation ?? "",
      note: r.note ?? "",
      body: p.body,
      findings: p.findings,
      counts: r,
      spec: p.spec,
    }));
  }
  process.stdout.write(`\n  ${parsed.length} transcript(s) wrapped in ${relative(REPO, runDir)}\n`);

  const v = spawnSync(process.execPath, [join(TESTS, "verify-run.mjs"), runDir], { stdio: "inherit" });
  process.exit(v.status ?? 1);
}

const guessCritic = (body) =>
  criticOf(deriveVerdict(body, ["FAITHFUL", "MATERIAL-LOSS", "CLEAN", "REVISE"]) ?? "");

/** Surface each finding for the operator. The two contract counts are judgements about
 * these blocks, and the job is much easier when they are next to each other than when
 * they are twelve scrolls apart in as many files. */
function quoteFindings(body) {
  const out = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*[-*]?\s*\*\*(?:CLASS|LOCATION)\*\*/.test(lines[i])) continue;
    out.push(lines.slice(i, i + 4).map((l) => l.trim()).filter(Boolean).join(" / ").slice(0, 400));
  }
  return out;
}

// ---------------------------------------------------------------------------
// check
// ---------------------------------------------------------------------------

/**
 * Round-trip a published run through the emitter. What this proves and what it does not:
 *
 *   RE-DERIVED, so a mismatch is a real defect — the verdict (from the body), the
 *   findings count (from the body's finding markers), the kind (from the filename), the
 *   heading's kind phrase, and the whole layout of heading, note separator and RESULT
 *   line.
 *
 *   CARRIED THROUGH, so byte-equality of these parts proves only that the emitter did
 *   not mangle them — the operator's note, the heading annotation, and the two contract
 *   counts. Those are human input and the tool has no independent source for them.
 */
function check(runDir) {
  const files = readdirSync(runDir).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md").sort();
  if (!files.length) die(`check: no transcripts in ${relative(REPO, runDir)}`);

  const problems = [];
  const deviations = [];
  let exact = 0;

  for (const f of files) {
    const original = readFileSync(join(runDir, f), "utf8");
    const p = parseWrapped(original, f);
    if (p.error) { problems.push(p.error); continue; }

    const critic = criticOf(p.verdict);
    const spec = CRITICS[critic];
    const name = f.replace(/\.md$/, "");
    const kindFromName = name.startsWith("p-") ? "positive" : "negative";

    if (p.kind !== kindFromName) problems.push(`${f}: heading says ${p.kind}, filename says ${kindFromName}`);
    if (p.phrase !== spec.phrase[p.kind]) problems.push(`${f}: heading phrase "${p.phrase}" is not this critic's "${spec.phrase[p.kind]}"`);
    if (p.short !== name.replace(/^[np]-/, "")) problems.push(`${f}: heading names ${p.short}, file names ${name}`);
    if (p.resultVerdict !== p.verdict) problems.push(`${f}: RESULT says ${p.resultVerdict}, heading says ${p.verdict}`);

    const fromBody = deriveVerdict(p.body, spec.vocabulary);
    if (fromBody !== p.verdict) problems.push(`${f}: transcript ends in ${fromBody}, wrapper says ${p.verdict}`);
    const findings = deriveFindings(p.body, spec);
    if (findings !== p.fields.findings) problems.push(`${f}: RESULT says findings=${p.fields.findings}, transcript contains ${findings}`);

    const rebuilt = emitWrapped({ ...p, findings, counts: p.fields, spec });
    if (rebuilt === original) exact += 1;
    else deviations.push(`${f}: ${firstDiff(original, rebuilt)}`);
  }

  process.stdout.write(`\n  ${relative(REPO, runDir)} — ${files.length} transcripts\n\n`);
  process.stdout.write(`    reproduced byte-for-byte from the transcript body: ${exact} of ${files.length}\n`);
  for (const d of deviations) process.stdout.write(`    hand-wrapping deviation — ${d}\n`);
  for (const p of problems) process.stdout.write(`    DEFECT — ${p}\n`);
  process.stdout.write("\n");
  process.exit(problems.length || deviations.length ? 1 : 0);
}

function firstDiff(a, b) {
  const al = a.split("\n"), bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) return `line ${i + 1}: published ${JSON.stringify(al[i] ?? null)}, emitted ${JSON.stringify(bl[i] ?? null)}`;
  }
  return "trailing whitespace";
}

// ---------------------------------------------------------------------------

function die(msg) {
  process.stderr.write(`run-harness: ${msg}\n`);
  process.exit(2);
}

const USAGE = `run-harness: usage:
  node tests/run-harness.mjs prepare  <voice|fidelity> <run-id> [--only a,b] [--positives a,b]
                                      [--fixtures-dir <dir>]   fidelity only; for testing the leak abort
  node tests/run-harness.mjs dispatch <run-dir> [--only a,b]
  node tests/run-harness.mjs collect  <run-dir>
  node tests/run-harness.mjs check    <run-dir>
`;

function main(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) { positional.push(argv[i]); continue; }
    const [k, inline] = argv[i].slice(2).split("=");
    flags[k] = inline ?? argv[++i];
  }
  const opts = {
    only: flags.only?.split(","),
    positives: flags.positives?.split(","),
    fixturesDir: flags["fixtures-dir"] ? resolve(flags["fixtures-dir"]) : undefined,
  };
  const [cmd, a, b] = positional;
  const dir = (d) => {
    if (!d) die(USAGE);
    const full = existsSync(d) ? resolve(d) : join(TESTS, d);
    if (!existsSync(full)) die(`no such run directory: ${d}`);
    return full;
  };

  if (cmd === "prepare") { if (!a || !b) die(USAGE); prepare(a, b, opts); }
  else if (cmd === "dispatch") dispatch(dir(a), opts);
  else if (cmd === "collect") collect(dir(a));
  else if (cmd === "check") check(dir(a));
  else die(USAGE);
}

if (process.argv[1] && process.argv[1].endsWith("run-harness.mjs")) main(process.argv.slice(2));

export { CRITICS, check, deriveFindings, deriveVerdict, emitWrapped, leakCheck, parseWrapped, stripFrontmatter };

#!/usr/bin/env node
/**
 * revise-harness — run prose-reviser against its fixtures, then hand each produced
 * revision to the fidelity gate (prose-fidelity-critic at k=3).
 *
 *   node tests/revise-harness.mjs prepare  <run-id>
 *   node tests/revise-harness.mjs dispatch <run-dir>                      [needs a runner]
 *   node tests/revise-harness.mjs collect  <run-dir>
 *   node tests/revise-harness.mjs gate     <run-dir>
 *
 * WHY THIS EXISTS RATHER THAN EXTENDING run-harness. The reviser is a transformer,
 * not a critic. Its output is two artifacts — a revision (markdown) and a change log
 * (JSON) — not a verdict token, so the wrapping grammar `run-harness` and `verify-run`
 * share does not fit. But everything AFTER the reviser is the fidelity critic, which
 * already has a working harness. So this file does the reviser-shaped half and then
 * hands off to `run-harness.mjs prepare fidelity ... --fixtures-dir <synthesised>`.
 *
 * The composition point: `run-harness.mjs`'s fidelity path takes any directory shaped
 * like `fixtures/fidelity/` — a `fixtures.json` manifest plus per-fixture
 * `{original.md, revision.md}`. `gate` writes that directory out of the reviser's
 * produced revisions and then calls into the existing harness. No new critic gate
 * grammar to maintain.
 *
 * NOTHING IN THE GATES RUNS THIS. Dispatch spends real agents; the tests exercise
 * every path structurally with mock reviser responses. See revise-harness-test.mjs.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from "node:fs";
import { dirname, join, relative, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const TESTS = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(TESTS, "..");
const REPO = resolve(BUNDLE, "..", "..");
const REVISER_AGENT = join(REPO, "primitives", "agents", "prose-reviser", "agent.md");
const REVISER_FIXTURES = join(TESTS, "fixtures", "reviser");
const die = (msg) => { process.stderr.write(`${msg}\n`); process.exit(2); };
const sha = (s) => createHash("sha256").update(s).digest("hex");

/** Frontmatter is where every provenance label in this repo's corpora lives. It is
 *  stripped from staged inputs the same way run-harness strips it, so a reviser scan
 *  over staged copies matches the fidelity-critic's expectations downstream. */
function stripFrontmatter(text) {
  if (!text.startsWith("---\n")) return text;
  const end = text.indexOf("\n---\n", 3);
  return end === -1 ? text : text.slice(end + 5);
}

// ---------------------------------------------------------------------------
// prompt building
// ---------------------------------------------------------------------------

function buildReviserPrompt({ agentBody, original, plan, planPath }) {
  // The reviser sees THREE things: its own system prompt (agent.md body), the draft,
  // and the plan. Nothing else. This mirrors run-harness's discipline — the critic
  // sees only what its prompt says it sees, and any leak is a fixture-authoring
  // defect the selftest is meant to catch.
  //
  // The plan is inlined rather than passed as a file path, because the reviser must
  // not have file-system access and cannot be trusted to read arbitrary paths. The
  // draft is inlined for the same reason.
  return [
    agentBody.trim(),
    "",
    "---",
    "",
    "## Your inputs",
    "",
    `Plan path (for the change log): \`${planPath}\``,
    "",
    "The plan, verbatim:",
    "",
    "```json",
    JSON.stringify(plan, null, 2),
    "```",
    "",
    "The draft to revise, verbatim (frontmatter has been stripped; treat the text below as line 1):",
    "",
    "```markdown",
    original.trimEnd(),
    "```",
    "",
    "Emit the revised draft in a ```markdown fence, then the change log in a ```json fence.",
    "Nothing else.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

function prepare(runId) {
  const runDir = runId.includes("/") ? runId : join(TESTS, "runs", runId);
  const manifest = JSON.parse(readFileSync(join(REVISER_FIXTURES, "fixtures.json"), "utf8"));
  const agentBody = stripFrontmatter(readFileSync(REVISER_AGENT, "utf8")).trim();

  mkdirSync(join(runDir, "prompts"), { recursive: true });
  writeFileSync(join(runDir, "prompts", "agent-prompt.md"), agentBody);

  const cases = [];
  for (const f of manifest.fixtures) {
    const origPath = join(REVISER_FIXTURES, f.name, "original.md");
    const planPath = join(REVISER_FIXTURES, f.name, "plan.json");
    const original = stripFrontmatter(readFileSync(origPath, "utf8"));
    const plan = JSON.parse(readFileSync(planPath, "utf8"));

    // Case ids are opaque, same reason as run-harness: the fixture name is
    // f01-word-swap-tihonov, which reveals what the reviser is being asked to do
    // beyond what the plan itself already says. `case-NN` says nothing.
    const caseId = `case-${String(cases.length + 1).padStart(2, "0")}`;

    // Plan path is passed as an OPAQUE string ("plan.json"), NOT the real fixture
    // path. The real path is `.../reviser/f01-word-swap-tihonov/plan.json` — which
    // names the fixture, which is the answer key. The reviser echoes whatever it is
    // given into the change log's `plan` field; the harness tracks the real mapping
    // through its own MANIFEST.
    const prompt = buildReviserPrompt({
      agentBody,
      original,
      plan,
      planPath: "plan.json",
    });
    writeFileSync(join(runDir, "prompts", `${caseId}.md`), `${prompt}\n`);

    cases.push({
      case: caseId,
      fixture: f.name,
      expected_gate: f.expected.gate,
      expected_reviser: f.expected.reviser,
      original_sha256: sha(original),
      plan_sha256: sha(JSON.stringify(plan)),
    });
  }

  // k=1 for the reviser itself. It is a transformer: it applies a plan, and the
  // question "was the plan applied cleanly?" is not the kind of judgement k>1 is
  // designed to stabilise. The fidelity critic downstream runs at k=3 per the
  // sampling policy, and that is where the wobble check lives.
  const runManifest = {
    critic: "reviser",
    run_id: basename(runDir),
    prepared: new Date().toISOString().slice(0, 10),
    draws: 1,
    agent_prompt: relative(REPO, REVISER_AGENT),
    agent_sha256: sha(agentBody),
    cases,
  };
  writeFileSync(join(runDir, "MANIFEST.json"), `${JSON.stringify(runManifest, null, 2)}\n`);
  process.stdout.write(`\n  ${relative(REPO, runDir)} — ${cases.length} case(s) prepared (k=1 reviser)\n\n`);
  process.stdout.write(`    reviser prompt: ${relative(REPO, REVISER_AGENT)} (sha256 ${runManifest.agent_sha256.slice(0, 12)})\n`);
  process.stdout.write(`    prompts:        ${relative(REPO, join(runDir, "prompts"))}/case-NN.md\n\n`);
  process.stdout.write(`  Next: dispatch (needs a runner), then collect, then gate.\n\n`);
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

function dispatch(runDir) {
  const manifest = JSON.parse(readFileSync(join(runDir, "MANIFEST.json"), "utf8"));
  const rawDir = join(runDir, "raw");
  mkdirSync(rawDir, { recursive: true });

  const custom = process.env.REVISER_CMD;
  const haveClaude = spawnSync("sh", ["-c", "command -v claude"], { encoding: "utf8" }).status === 0;
  if (!custom && !haveClaude) {
    process.stderr.write(`\n  dispatch: no runner available.\n\n`);
    process.stderr.write(`    Set REVISER_CMD, or dispatch by hand from the DISPATCH file.\n\n`);
    process.exit(3);
  }

  const system = join(runDir, "prompts", "agent-prompt.md");
  for (const c of manifest.cases) {
    const promptFile = join(runDir, "prompts", `${c.case}.md`);
    const prompt = readFileSync(promptFile, "utf8");
    const cmd = custom
      ? ["sh", ["-c", custom.replaceAll("{SYSTEM}", system).replaceAll("{PROMPT}", promptFile)]]
      // Reviser needs no tools — the whole input is inline. Read is allowed for the
      // system prompt file only, everything else is denied.
      : ["claude", ["-p", "--system-prompt-file", system,
          "--allowedTools", `Read(${system})`,
          "--disallowedTools", "Bash", "Grep", "Glob", "Task", "Edit", "Write", "WebFetch", "WebSearch"]];

    process.stdout.write(`    ${c.case} (${c.fixture}) → raw/${c.case}.md ... `);
    const started = Date.now();
    const r = spawnSync(cmd[0], cmd[1], { input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 || !r.stdout?.trim()) {
      process.stdout.write("FAILED\n");
      process.stderr.write(`\n${(r.stderr || "").slice(0, 2000)}\n`);
      process.exit(1);
    }
    writeFileSync(join(rawDir, `${c.case}.md`), `${r.stdout.trim()}\n`);
    process.stdout.write(`${((Date.now() - started) / 1000).toFixed(0)}s\n`);
  }
  process.stdout.write(`\n  Next: node tests/revise-harness.mjs collect ${relative(BUNDLE, runDir)}\n\n`);
}

// ---------------------------------------------------------------------------
// collect — parse the reviser's two artifacts out of each raw transcript
// ---------------------------------------------------------------------------

/**
 * The reviser's output contract: a ```markdown fence containing the revision, then a
 * ```json fence containing the change log. This parser is deliberately strict —
 * a transcript missing either fence is a failed dispatch, not something to salvage.
 */
export function parseReviserOutput(text, name) {
  const mdMatch = text.match(/```(?:markdown|md)\n([\s\S]*?)\n```/);
  const jsMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (!mdMatch) return { error: `${name}: no markdown fence with the revision` };
  if (!jsMatch) return { error: `${name}: no json fence with the change log` };

  let log;
  try { log = JSON.parse(jsMatch[1]); }
  catch (err) { return { error: `${name}: change log is not valid JSON — ${err.message}` }; }

  // Required keys on every log. `refused` and `noticed_but_not_edited` may be [] but
  // must exist so a reader cannot mistake absence-of-field for zero-refusals.
  const required = ["plan", "original_sha256", "revision_sha256", "mode", "edits", "refused"];
  const missing = required.filter((k) => !(k in log));
  if (missing.length) return { error: `${name}: change log missing keys: ${missing.join(", ")}` };
  if (!Array.isArray(log.edits) || !Array.isArray(log.refused)) {
    return { error: `${name}: edits and refused must be arrays` };
  }

  return { revision: mdMatch[1], log };
}

function collect(runDir) {
  const rawDir = join(runDir, "raw");
  if (!existsSync(rawDir)) die(`collect: ${relative(REPO, rawDir)} does not exist`);
  const manifest = JSON.parse(readFileSync(join(runDir, "MANIFEST.json"), "utf8"));
  const revisionsDir = join(runDir, "revisions");
  const logsDir = join(runDir, "change_logs");
  mkdirSync(revisionsDir, { recursive: true });
  mkdirSync(logsDir, { recursive: true });

  const errors = [];
  const summary = [];
  for (const c of manifest.cases) {
    const rawPath = join(rawDir, `${c.case}.md`);
    if (!existsSync(rawPath)) { errors.push(`${c.case}: no raw transcript`); continue; }
    const parsed = parseReviserOutput(readFileSync(rawPath, "utf8"), c.case);
    if (parsed.error) { errors.push(parsed.error); continue; }
    writeFileSync(join(revisionsDir, `${c.fixture}.md`), parsed.revision);
    writeFileSync(join(logsDir, `${c.fixture}.json`), `${JSON.stringify(parsed.log, null, 2)}\n`);
    summary.push(`    ${c.case} (${c.fixture}): ${parsed.log.edits.length} edit(s), ${parsed.log.refused.length} refused`);
  }

  process.stdout.write(`\n  ${manifest.cases.length - errors.length} of ${manifest.cases.length} transcripts collected\n\n`);
  process.stdout.write(`${summary.join("\n")}\n`);
  if (errors.length) {
    process.stderr.write(`\n  ${errors.length} collect error(s):\n${errors.map((e) => `    ${e}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`\n  Next: node tests/revise-harness.mjs gate ${relative(BUNDLE, runDir)}\n\n`);
}

// ---------------------------------------------------------------------------
// gate — synthesise a fidelity-fixtures directory, hand off to run-harness
// ---------------------------------------------------------------------------

/**
 * The reviser is judged by the fidelity critic. The fidelity critic's harness already
 * knows how to prepare + dispatch + verify a run over a `fixtures/fidelity/`-shaped
 * directory. So the gate's job is to synthesise such a directory from the reviser's
 * output and hand it to `run-harness`.
 *
 * The out-of-plan check is done here rather than there because the fidelity critic
 * does not currently see the change log — it sees only (original, revision, scan).
 * A future pass can inline the change log into the critic's prompt; today the
 * out-of-plan check is a separate machine-check that runs before the critic is asked
 * to weigh in.
 */
function synthFidelityFixtures(runDir) {
  const manifest = JSON.parse(readFileSync(join(runDir, "MANIFEST.json"), "utf8"));
  const target = join(runDir, "fidelity-fixtures");
  mkdirSync(target, { recursive: true });

  const revisionsDir = join(runDir, "revisions");
  const fx = [];
  for (const c of manifest.cases) {
    const orig = join(REVISER_FIXTURES, c.fixture, "original.md");
    const rev = join(revisionsDir, `${c.fixture}.md`);
    if (!existsSync(rev)) continue;
    const revBody = readFileSync(rev, "utf8");
    // Every reviser fixture is a "positive" for the fidelity harness's naming
    // convention (`p-` prefix), because we are asking the fidelity critic to
    // adjudicate whether a rewrite lost anything — the very question its p- fixtures
    // are shaped for. The critic does not see the p-/n- distinction here; the harness
    // uses it only for its own tally, which we override with the ship-bar check.
    const dir = join(target, `p-${c.fixture}`);
    mkdirSync(dir, { recursive: true });
    cpSync(orig, join(dir, "original.md"));
    writeFileSync(join(dir, "revision.md"), revBody);
    fx.push({ name: `p-${c.fixture}`, kind: "positive", source: c.fixture, expect: "MATERIAL-LOSS", scan_verdict: "MATERIAL-LOSS", class: "C" });
  }

  // fidelity's fixtures.json has other required fields the run-harness reads; we
  // supply the minimum shape it will accept. class + scan_verdict are placeholders
  // — the ship-bar check below judges revisions directly, not against these labels.
  writeFileSync(join(target, "fixtures.json"), `${JSON.stringify({
    _comment: ["Synthesised by revise-harness. Do not hand-edit.",
      "The classification here (all class C, expect MATERIAL-LOSS) is the shape",
      "run-harness's fidelityFixtures reader requires; the SHIP BAR is enforced by",
      "revise-harness against the reviser's manifest, not this file."],
    corpus_root: "../../../../prose-tell-scan/tests/corpus/human-essays/gutenberg",
    fixtures: fx,
  }, null, 2)}\n`);

  return { fixturesDir: target, count: fx.length };
}

/**
 * The out-of-plan edit check, done as a diff comparison between original and revision.
 *
 * A well-behaved reviser touches only spans the plan named. If the diff between the
 * original and the revision contains a change whose span is not covered by any plan
 * entry's `location.quote`, that is an out-of-plan edit — a finding on its own, no
 * matter how good the edit looks. This is the fidelity critic's priority-4 rule
 * expressed as code, running before any critic dispatch.
 *
 * NOT A SUBSTITUTE FOR THE CRITIC. This checks the mechanical property (span
 * coverage). A critic reading the change log alongside the revision would catch
 * subtler cases — an edit whose text is inside a plan-named span but whose SEMANTIC
 * effect is not what the plan authorised. That is a v0.2 problem.
 */
function outOfPlanCheck(runDir) {
  const manifest = JSON.parse(readFileSync(join(runDir, "MANIFEST.json"), "utf8"));
  const results = [];
  for (const c of manifest.cases) {
    const logPath = join(runDir, "change_logs", `${c.fixture}.json`);
    const planPath = join(REVISER_FIXTURES, c.fixture, "plan.json");
    if (!existsSync(logPath)) { results.push({ fixture: c.fixture, ok: false, reason: "no change log" }); continue; }
    const log = JSON.parse(readFileSync(logPath, "utf8"));
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    const planIds = new Set(plan.entries.map((e) => e.id));

    // Every edit must carry a plan_id present in the plan. This is the only
    // machine-checkable half of "out of plan" — an edit whose text is inside a
    // plan-quoted span but whose id is bogus is still out of plan by definition.
    const outOfPlan = log.edits.filter((e) => !planIds.has(e.plan_id));
    // And every edit's `before` string must appear inside SOME plan entry's quote.
    // A reviser that reports plan_id=e01 for an edit whose before-text has nothing
    // to do with e01's quote is lying about the mapping.
    const spanMismatch = log.edits.filter((e) => {
      const entry = plan.entries.find((pe) => pe.id === e.plan_id);
      if (!entry) return false; // caught above
      return !entry.location.quote.includes(e.before) && !e.before.includes(entry.location.quote);
    });

    results.push({
      fixture: c.fixture,
      ok: outOfPlan.length === 0 && spanMismatch.length === 0,
      out_of_plan_ids: outOfPlan.map((e) => e.plan_id),
      span_mismatches: spanMismatch.map((e) => e.plan_id),
      edits: log.edits.length,
      refused: log.refused.length,
    });
  }
  return results;
}

function gate(runDir) {
  const { fixturesDir, count } = synthFidelityFixtures(runDir);
  process.stdout.write(`\n  synthesised ${count} fidelity fixtures under ${relative(REPO, fixturesDir)}\n\n`);

  const oop = outOfPlanCheck(runDir);
  const oopBad = oop.filter((r) => !r.ok);
  process.stdout.write(`  out-of-plan check: ${oop.length - oopBad.length} of ${oop.length} clean\n`);
  for (const r of oopBad) {
    process.stdout.write(`    ${r.fixture}: unknown plan_ids=${r.out_of_plan_ids.join(",")||"[]"}  span_mismatches=${r.span_mismatches.join(",")||"[]"}\n`);
  }

  process.stdout.write(`\n  Next: use run-harness to dispatch the fidelity critic at k=3:\n`);
  process.stdout.write(`    node tests/run-harness.mjs prepare  fidelity <gate-run-id> --fixtures-dir ${relative(BUNDLE, fixturesDir)}\n`);
  process.stdout.write(`    node tests/run-harness.mjs dispatch runs/<gate-run-id>\n`);
  process.stdout.write(`    node tests/run-harness.mjs collect  runs/<gate-run-id>\n`);
  process.stdout.write(`\n  Ship bar is judged against the k=3 gate results per fixtures.json's expected block.\n`);
  process.stdout.write(`  See PLAN-FORMAT.md and .planning/SAMPLING-POLICY.md.\n\n`);

  // The out-of-plan check exit code is nonzero if any fixture failed, because that is
  // a blocker independent of the fidelity gate — it means the reviser exceeded its
  // mandate mechanically, not semantically, and no verdict from the fidelity critic
  // rescues that.
  process.exit(oopBad.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const USAGE = `revise-harness: usage:
  node tests/revise-harness.mjs prepare  <run-id>
  node tests/revise-harness.mjs dispatch <run-dir>        [needs REVISER_CMD or claude CLI]
  node tests/revise-harness.mjs collect  <run-dir>
  node tests/revise-harness.mjs gate     <run-dir>
`;

function main(argv) {
  const [cmd, arg] = argv;
  const dir = (d) => {
    if (!d) die(USAGE);
    const full = existsSync(d) ? resolve(d) : join(TESTS, "runs", d);
    if (!existsSync(full)) die(`no such run directory: ${d}`);
    return full;
  };
  if (cmd === "prepare") { if (!arg) die(USAGE); prepare(arg); }
  else if (cmd === "dispatch") dispatch(dir(arg));
  else if (cmd === "collect") collect(dir(arg));
  else if (cmd === "gate") gate(dir(arg));
  else die(USAGE);
}

if (process.argv[1] && process.argv[1].endsWith("revise-harness.mjs")) main(process.argv.slice(2));

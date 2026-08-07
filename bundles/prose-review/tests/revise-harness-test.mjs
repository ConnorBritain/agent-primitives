#!/usr/bin/env node
/**
 * revise-harness-test — end-to-end without spending a real reviser dispatch.
 *
 * The test synthesises a "reviser transcript" for each case (a markdown fence and a
 * json fence in the shape the reviser produces) and drops it in raw/. Then collect +
 * gate are exercised. This is the same discipline run-harness-test uses to prove the
 * wrapping grammar without needing credentials.
 *
 * WHAT BREAKS IF THIS REGRESSES. The reviser is the one primitive here that mutates
 * prose, and its ship bar cannot land until the pipeline that judges it works end to
 * end. If prepare stops emitting one prompt per fixture, or collect stops parsing the
 * two-fence output, or the out-of-plan check stops firing on unknown plan_ids, the
 * whole hold-lifting path is broken and nobody notices until the acceptance run.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseReviserOutput } from "./revise-harness.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failed += 1; failures.push(`${name}${detail ? ` — ${detail}` : ""}`); process.stdout.write(`  FAIL ${name}${detail ? ` — ${detail}` : ""}\n`); }
}
function group(t) { process.stdout.write(`\n${t}\n`); }

const sandboxes = [];
function sandbox() { const d = mkdtempSync(join(tmpdir(), "revise-harness-test-")); sandboxes.push(d); return d; }
function runHarness(...args) {
  return spawnSync(process.execPath, [join(HERE, "revise-harness.mjs"), ...args], { encoding: "utf8" });
}

// ---------------------------------------------------------------------------
// 1. parseReviserOutput — the strict contract for what a reviser response looks like
// ---------------------------------------------------------------------------
group("parseReviserOutput refuses malformed responses");

{
  // Well-formed: markdown fence + json fence, both required keys present.
  const good = "```markdown\nRevised prose here.\n```\n\n```json\n"
    + JSON.stringify({ plan: "p.json", original_sha256: "x", revision_sha256: "y", mode: "plan-only", edits: [], refused: [] }) + "\n```";
  const r = parseReviserOutput(good, "test");
  check("well-formed response parses to revision + log", !r.error && r.revision === "Revised prose here." && r.log.edits.length === 0);

  // The two failure modes that could pass silently and rob the change log of meaning.
  check("no markdown fence → error", parseReviserOutput("just text", "t").error);
  check("no json fence → error", parseReviserOutput("```markdown\nrevised\n```", "t").error);
  check("json fence with invalid JSON → error", parseReviserOutput("```markdown\nrev\n```\n```json\n{not json\n```", "t").error);

  // Missing required keys — refused[] MUST exist even if empty, so a reader cannot
  // confuse "no refusals" with "the reviser forgot to declare refusals".
  const missingRefused = "```markdown\nrev\n```\n```json\n" + JSON.stringify({ plan: "p", original_sha256: "x", revision_sha256: "y", mode: "plan-only", edits: [] }) + "\n```";
  check("change log missing 'refused' key → error", parseReviserOutput(missingRefused, "t").error);
}

// ---------------------------------------------------------------------------
// 2. prepare — one prompt per fixture, MANIFEST records k=1, no leak of expected
// ---------------------------------------------------------------------------
group("prepare");

{
  const dir = join(sandbox(), "2026-08-06-probe");
  const r = runHarness("prepare", dir);
  check("prepare exits 0", r.status === 0, r.stderr);

  const prompts = readdirSync(join(dir, "prompts")).filter((f) => /^case-\d+\.md$/.test(f)).sort();
  check("prepare emits one prompt per fixture", prompts.length === 8, prompts.join(","));
  const promptText = prompts.map((f) => readFileSync(join(dir, "prompts", f), "utf8")).join("\n\n");

  // The reviser is k=1 (see revise-harness header comment for why). MANIFEST must
  // say so, so verify-run downstream cannot mistake the reviser's k=1 for the
  // fidelity critic's k=3.
  const manifest = JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"));
  check("MANIFEST records draws=1 for the reviser", manifest.draws === 1);
  check("MANIFEST names the primitive it dispatches", manifest.critic === "reviser");
  check("MANIFEST records the agent prompt sha", /^[0-9a-f]{64}$/.test(manifest.agent_sha256));

  // The `expected` block is metadata for the harness, not something the reviser sees.
  // A prompt that mentioned "expected_gate: FAITHFUL" would be handing the reviser its
  // grade — the reviser must be measured against a bar it does not know about.
  check("no prompt names the expected gate outcome",
    !/expected[_ ]?gate/i.test(promptText) && !/expected[_ ]?reviser/i.test(promptText));
  // Same shape rule as the fidelity fixtures — a prompt naming the verdict word is
  // priming the model to produce it.
  check("no prompt leaks FAITHFUL / MATERIAL-LOSS", !/(FAITHFUL|MATERIAL-LOSS)/.test(promptText));

  // The plan IS supposed to be in the prompt — that is the reviser's input. But it
  // is delivered inline as JSON, not as a file path, because the reviser has no tools.
  check("every prompt inlines the plan as JSON", prompts.every((f) => {
    const t = readFileSync(join(dir, "prompts", f), "utf8");
    return /```json\n\{[\s\S]*?"entries":\s*\[/.test(t);
  }));
  check("every prompt inlines the draft body under a markdown fence",
    prompts.every((f) => /```markdown\n[\s\S]+?\n```/.test(readFileSync(join(dir, "prompts", f), "utf8"))));

  // Case ids do not encode the fixture name (fN- prefix would be an answer key).
  const promptsAsText = promptText;
  const fixtureNames = manifest.cases.map((c) => c.fixture);
  const prefixLeak = fixtureNames.filter((n) => promptsAsText.includes(n));
  check("prompts do NOT name the fixture (case id is opaque)",
    prefixLeak.length === 0, prefixLeak.join(","));
}

// ---------------------------------------------------------------------------
// 3. collect — parses two fences, writes revisions/ and change_logs/
// ---------------------------------------------------------------------------
group("collect");

{
  const dir = join(sandbox(), "2026-08-06-collect");
  runHarness("prepare", dir);
  const manifest = JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"));

  // Synthesise a well-formed transcript for each case. A real dispatch would produce
  // these; the test writes them so the plumbing can be exercised without an agent.
  mkdirSync(join(dir, "raw"), { recursive: true });
  for (const c of manifest.cases) {
    const fake = {
      plan: `bundles/prose-review/tests/fixtures/reviser/${c.fixture}/plan.json`,
      original_sha256: c.original_sha256,
      revision_sha256: "revision-hash-placeholder",
      mode: "plan-only",
      edits: [{ plan_id: "e01", before: "for some reason roared", after: "for some reason burst out", reason: "test" }],
      refused: [],
      noticed_but_not_edited: [],
    };
    writeFileSync(join(dir, "raw", `${c.case}.md`),
      `\`\`\`markdown\nSynthesised revision body for ${c.fixture}.\n\`\`\`\n\n\`\`\`json\n${JSON.stringify(fake, null, 2)}\n\`\`\`\n`);
  }

  const r = runHarness("collect", dir);
  check("collect exits 0 over well-formed transcripts", r.status === 0, r.stderr);
  check("collect writes one revision per fixture",
    readdirSync(join(dir, "revisions")).length === manifest.cases.length);
  check("collect writes one change_log per fixture",
    readdirSync(join(dir, "change_logs")).length === manifest.cases.length);
}

// ---------------------------------------------------------------------------
// 4. gate — synthesises fidelity fixtures, runs out-of-plan check, exits non-zero on
//           any unknown plan_id or span mismatch
// ---------------------------------------------------------------------------
group("gate");

{
  const dir = join(sandbox(), "2026-08-06-gate");
  runHarness("prepare", dir);
  const manifest = JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"));
  mkdirSync(join(dir, "raw"), { recursive: true });

  // Every case reports one edit whose plan_id and quote match plan e01. This is the
  // "well-behaved reviser" scenario — every case must clear the out-of-plan check.
  for (const c of manifest.cases) {
    const plan = JSON.parse(readFileSync(join(HERE, "fixtures", "reviser", c.fixture, "plan.json"), "utf8"));
    const e = plan.entries[0];
    const fake = {
      plan: `bundles/prose-review/tests/fixtures/reviser/${c.fixture}/plan.json`,
      original_sha256: c.original_sha256,
      revision_sha256: "revision-hash-placeholder",
      mode: "plan-only",
      edits: [{ plan_id: e.id, before: e.location.quote, after: "REPLACED", reason: e.reason }],
      refused: [],
      noticed_but_not_edited: [],
    };
    writeFileSync(join(dir, "raw", `${c.case}.md`),
      `\`\`\`markdown\nSynth revision for ${c.fixture}.\n\`\`\`\n\n\`\`\`json\n${JSON.stringify(fake, null, 2)}\n\`\`\`\n`);
  }
  runHarness("collect", dir);

  const g = runHarness("gate", dir);
  check("gate exits 0 when every edit's plan_id and span match", g.status === 0, g.stdout + "\n" + g.stderr);
  check("gate synthesises a fidelity-fixtures directory with one entry per fixture",
    existsSync(join(dir, "fidelity-fixtures", "fixtures.json"))
      && JSON.parse(readFileSync(join(dir, "fidelity-fixtures", "fixtures.json"), "utf8")).fixtures.length === manifest.cases.length);

  // The paired negative: one edit reports a plan_id that does not exist in the plan.
  // This must fail the gate — an out-of-plan edit is a blocker regardless of how good
  // the edit itself might be.
  const badDir = join(sandbox(), "2026-08-06-gate-bad");
  cpSync(dir, badDir, { recursive: true });
  // Rewrite one change log with a bogus plan_id.
  const firstFixture = manifest.cases[0].fixture;
  const logPath = join(badDir, "change_logs", `${firstFixture}.json`);
  const log = JSON.parse(readFileSync(logPath, "utf8"));
  log.edits[0].plan_id = "e99-does-not-exist";
  writeFileSync(logPath, JSON.stringify(log, null, 2));

  const badGate = runHarness("gate", badDir);
  check("gate exits non-zero when an edit's plan_id is unknown",
    badGate.status !== 0, `stdout=${badGate.stdout}\nstderr=${badGate.stderr}`);
  check("gate names the offending plan_id in its report",
    /e99-does-not-exist/.test(badGate.stdout), badGate.stdout);
}

// ---------------------------------------------------------------------------
// cleanup + summary
// ---------------------------------------------------------------------------
for (const d of sandboxes) rmSync(d, { recursive: true, force: true });

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
process.exit(failed ? 1 : 0);

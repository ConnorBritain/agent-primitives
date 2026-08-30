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
import { parseReviserOutput, applyChangeLog, stripFrontmatter } from "./revise-harness.mjs";

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
  // Well-formed: a single json fence, only the fields a real reviser can produce.
  //
  // WHY THIS SHAPE. The reviser's contract is LOG-ONLY as of 2026-08-07 (see the
  // revise-harness header for the diagnostic that forced the change). No revision
  // fence — the harness reconstructs the revision by applying the log to the
  // original. Tests that mock a revision fence would be simulating output the real
  // reviser cannot safely produce, and the earlier version of this file did exactly
  // that: a mock more capable than the subject, hiding a real defect until first
  // dispatch. Fixed by shaping the mock to the current contract.
  const good = "```json\n"
    + JSON.stringify({ plan: "plan.json", mode: "plan-only", edits: [], refused: [] }) + "\n```";
  const r = parseReviserOutput(good, "test");
  check("well-formed log-only response parses",
    !r.error && r.log.edits.length === 0 && !("revision" in r),
    JSON.stringify(r).slice(0, 120));

  // A leftover markdown fence is not fatal — a reviser may include one out of habit
  // and the parser ignores it. The log fence is the source of truth.
  const withStrayMd = "```markdown\nignored\n```\n```json\n"
    + JSON.stringify({ plan: "p", mode: "plan-only", edits: [], refused: [] }) + "\n```";
  check("a stray markdown fence is ignored, not fatal",
    !parseReviserOutput(withStrayMd, "t").error);

  check("no json fence → error", parseReviserOutput("just text", "t").error);
  check("json fence with invalid JSON → error", parseReviserOutput("```json\n{not json\n```", "t").error);

  // Missing required keys — refused[] MUST exist even if empty, so a reader cannot
  // confuse "no refusals" with "the reviser forgot to declare refusals".
  const missingRefused = "```json\n" + JSON.stringify({ plan: "p", mode: "plan-only", edits: [] }) + "\n```";
  check("change log missing 'refused' key → error", parseReviserOutput(missingRefused, "t").error);

  // An edit whose fields are wrong type — the applier would blow up later; catch here.
  const wrongTypes = "```json\n"
    + JSON.stringify({ plan: "p", mode: "plan-only", refused: [], edits: [{ plan_id: "e01", before: null, after: "" }] }) + "\n```";
  check("edit with non-string fields → error", parseReviserOutput(wrongTypes, "t").error);
}

// ---------------------------------------------------------------------------
// 1b. applyChangeLog — the load-bearing new function under the log-only contract.
//     The reviser emits a diff; this reconstructs the revision. If it substitutes
//     the wrong span, out-of-plan edits become possible in the reconstructed
//     revision even though the reviser could not have emitted one directly.
// ---------------------------------------------------------------------------
group("applyChangeLog");

{
  const original = "The quick brown fox jumps over the lazy dog. The fox is quick.";
  const plan = { draft: "o.md", voice_profile: "essay", mode: "plan-only", entries: [
    { id: "e01", source: "voice-critic",
      location: { line: 1, quote: "The quick brown fox jumps over the lazy dog." },
      change: "replace 'quick brown fox' with 'nimble red fox'",
      reason: "voice-critic: register" },
  ]};

  // Happy path. before is inside the plan quote, matches the original, substitution
  // produces the expected string. The reviser did its job; the applier did its job.
  const good = { plan: "p", mode: "plan-only", refused: [], edits: [
    { plan_id: "e01", before: "quick brown fox", after: "nimble red fox", reason: "test" },
  ]};
  const r = applyChangeLog(original, good, plan);
  check("well-formed log applies to produce the expected revision",
    !r.error && r.revision === "The nimble red fox jumps over the lazy dog. The fox is quick.",
    r.error || JSON.stringify(r.revision));

  // Only the FIRST occurrence is substituted. "quick" appears twice ("quick brown fox"
  // and "fox is quick"); an all-occurrences substitution would tidy the second one
  // too, which is exactly the consistency-tidy the reviser was told not to do. Testing
  // the applier does not perform it on the reviser's behalf.
  const dup = { plan: "p", mode: "plan-only", refused: [], edits: [
    { plan_id: "e01", before: "quick", after: "swift", reason: "test" },
  ]};
  const rd = applyChangeLog(original, dup, plan);
  check("only the first occurrence of `before` is substituted",
    rd.revision === "The swift brown fox jumps over the lazy dog. The fox is quick.",
    rd.revision);

  // THE SAFETY INVARIANT. An edit whose plan_id references entry e01, but whose
  // before-text is NOT inside e01's location.quote, is out-of-plan by definition.
  // Under the old contract this required a post-hoc check. Under the log-only
  // contract this is refused at apply time, no partial revision written.
  const outOfPlan = { plan: "p", mode: "plan-only", refused: [], edits: [
    { plan_id: "e01", before: "The fox is quick", after: "The fox is swift", reason: "test" },
  ]};
  const oop = applyChangeLog(original, outOfPlan, plan);
  check("edit whose before-text is outside its plan entry's quote is REFUSED",
    oop.error && /not inside plan entry/.test(oop.error), oop.error || "no error");
  check("and no partial revision is emitted alongside the refusal",
    oop.error && !("revision" in oop));

  // Unknown plan_id. The reviser cited an id that doesn't exist. Impossible from a
  // well-behaved reviser but still refused mechanically.
  const unknown = { plan: "p", mode: "plan-only", refused: [], edits: [
    { plan_id: "e99", before: "quick brown fox", after: "nimble red fox", reason: "test" },
  ]};
  const uk = applyChangeLog(original, unknown, plan);
  check("edit with unknown plan_id is REFUSED",
    uk.error && /unknown plan_id/.test(uk.error));

  // Empty edits[] on an unchanged draft. This is the refuse-cases scenario: the
  // reviser refused every plan entry, emits no edits. Applier returns the original
  // untouched, and the fidelity gate downstream sees FAITHFUL trivially.
  const noEdits = { plan: "p", mode: "plan-only", refused: [{ plan_id: "e01", reason: "test" }], edits: [] };
  const ne = applyChangeLog(original, noEdits, plan);
  check("empty edits[] returns the original unchanged",
    !ne.error && ne.revision === original);

  // CRLF handling. The corpus files use CRLF; JSON.stringify emits LF in string
  // literals; the applier normalises `before` to match the original's line-ending
  // style. Without this, a legitimate multi-line quote would fail to match.
  const crlfOrig = "Line one.\r\nLine two.\r\nLine three.";
  const crlfPlan = { entries: [{ id: "e01",
    location: { line: 1, quote: "Line one.\r\nLine two." } }]};
  const crlfLog = { plan: "p", mode: "plan-only", refused: [], edits: [
    // reviser emits with LF, as JSON does
    { plan_id: "e01", before: "Line one.\nLine two.", after: "Just line one.", reason: "test" },
  ]};
  const cr = applyChangeLog(crlfOrig, crlfLog, crlfPlan);
  check("LF-in-log matches CRLF-in-original (line-ending normalisation)",
    !cr.error && cr.revision === "Just line one.\r\nLine three.",
    cr.error || JSON.stringify(cr.revision));

  // Sequential edits that could consume each other. Two edits both targeting
  // overlapping text: the second edit must operate on the CURRENT state after the
  // first, not on the pristine original.
  const seqPlan = { entries: [
    { id: "e01", location: { line: 1, quote: "The quick brown fox" } },
    { id: "e02", location: { line: 1, quote: "brown fox" } },
  ]};
  const seqLog = { plan: "p", mode: "plan-only", refused: [], edits: [
    { plan_id: "e01", before: "quick brown fox", after: "quick red fox", reason: "e01" },
    { plan_id: "e02", before: "brown fox", after: "grey fox", reason: "e02" },
  ]};
  const seq = applyChangeLog(original, seqLog, seqPlan);
  // After e01 rewrites to "quick red fox", "brown fox" no longer appears anywhere.
  // e02 must refuse — its before-text was consumed by e01. A partial revision
  // (with e01 applied) is not returned.
  check("second edit refuses cleanly when the first consumed its before-text",
    seq.error && /not present in current draft/.test(seq.error) && seq.applied.length === 1,
    seq.error || JSON.stringify(seq));
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
  // Count is coupled to fixtures.json's entry count. Read it rather than hard-code
  // so a legitimate fixture-set change (add/remove/reclassify) does not silently
  // pass this assertion — but the assertion still refuses the "just check > 0"
  // shape, because the point is that prepare's fanout matches the fixture set
  // exactly, not that it happens to produce prompts.
  const expectedCount = JSON.parse(
    readFileSync(new URL("./fixtures/reviser/fixtures.json", import.meta.url), "utf8")
  ).fixtures.length;
  check(`prepare emits one prompt per fixture (${expectedCount} expected)`,
    prompts.length === expectedCount, prompts.join(","));
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
  // this; the test writes it so the plumbing can be exercised without an agent. Log-only
  // mock — no revision fence — matches what a real reviser now produces.
  //
  // Every mock edit uses ONE plan entry (the first, for whichever fixture is being
  // mocked) so the applier's plan-quote check passes. The refuse-cases (f06, f07)
  // produce a mock with an empty edits[] and a populated refused[], which is what a
  // real reviser does when the plan is unusable.
  mkdirSync(join(dir, "raw"), { recursive: true });
  for (const c of manifest.cases) {
    const plan = JSON.parse(readFileSync(join(HERE, "fixtures", "reviser", c.fixture, "plan.json"), "utf8"));
    const e = plan.entries[0];
    const isRefuse = /refuse/.test(c.fixture);
    const fake = isRefuse
      ? { plan: "plan.json", mode: "plan-only", edits: [], refused: [{ plan_id: e.id, reason: "test refuse" }], noticed_but_not_edited: [] }
      : { plan: "plan.json", mode: "plan-only", refused: [], noticed_but_not_edited: [],
          edits: [{ plan_id: e.id, before: e.location.quote, after: "REPLACED", reason: "test" }] };
    writeFileSync(join(dir, "raw", `${c.case}.md`),
      `\`\`\`json\n${JSON.stringify(fake, null, 2)}\n\`\`\`\n`);
  }

  const r = runHarness("collect", dir);
  check("collect exits 0 over well-formed transcripts", r.status === 0, r.stderr);
  check("collect writes one revision per fixture",
    readdirSync(join(dir, "revisions")).length === manifest.cases.length);
  check("collect writes one change_log per fixture",
    readdirSync(join(dir, "change_logs")).length === manifest.cases.length);

  // The persisted change log MUST carry all three sha256 fields, computed by the harness
  // and injected on collect. This is the other half of "the reviser does not produce
  // hashes" — someone still needs to, so the collect step does. The persisted log is
  // what downstream tools read; if the hashes are missing there, the reason they were
  // dropped from the contract (unproducible by the subject) becomes a reason to lose
  // them entirely, and audit trails silently thin.
  const firstFixture = manifest.cases[0].fixture;
  const log = JSON.parse(readFileSync(join(dir, "change_logs", `${firstFixture}.json`), "utf8"));
  check("collect injects original_sha256 (from MANIFEST, recorded at prepare)",
    /^[0-9a-f]{64}$/.test(log.original_sha256 || ""), `got=${JSON.stringify(log.original_sha256)}`);
  check("collect injects revision_sha256 (computed over the parsed revision)",
    /^[0-9a-f]{64}$/.test(log.revision_sha256 || ""), `got=${JSON.stringify(log.revision_sha256)}`);
  check("collect injects plan_sha256 (canonical hash of the plan JSON)",
    /^[0-9a-f]{64}$/.test(log.plan_sha256 || ""), `got=${JSON.stringify(log.plan_sha256)}`);
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

  // Every case reports one edit whose plan_id and quote match plan e01, or refuses
  // cleanly on the refuse-fixtures. This is the "well-behaved reviser" scenario:
  // every case must clear the applier's out-of-plan check inside collect.
  for (const c of manifest.cases) {
    const plan = JSON.parse(readFileSync(join(HERE, "fixtures", "reviser", c.fixture, "plan.json"), "utf8"));
    const e = plan.entries[0];
    const isRefuse = /refuse/.test(c.fixture);
    const fake = isRefuse
      ? { plan: "plan.json", mode: "plan-only", edits: [], refused: [{ plan_id: e.id, reason: "test refuse" }], noticed_but_not_edited: [] }
      : { plan: "plan.json", mode: "plan-only", refused: [], noticed_but_not_edited: [],
          edits: [{ plan_id: e.id, before: e.location.quote, after: "REPLACED", reason: "test" }] };
    writeFileSync(join(dir, "raw", `${c.case}.md`),
      `\`\`\`json\n${JSON.stringify(fake, null, 2)}\n\`\`\`\n`);
  }
  runHarness("collect", dir);

  const g = runHarness("gate", dir);
  check("gate exits 0 when every edit's plan_id and span match", g.status === 0, g.stdout + "\n" + g.stderr);
  check("gate synthesises a fidelity-fixtures directory with one entry per fixture",
    existsSync(join(dir, "fidelity-fixtures", "fixtures.json"))
      && JSON.parse(readFileSync(join(dir, "fidelity-fixtures", "fixtures.json"), "utf8")).fixtures.length === manifest.cases.length);

  // The paired negative: a raw transcript reports a plan_id that does not exist in
  // the plan. Under the log-only contract this now fails at COLLECT (the applier
  // refuses to substitute), not at gate. The failure moves upstream — closer to the
  // reviser's own output — which is the point of enforcing at apply time.
  const badDir = join(sandbox(), "2026-08-06-collect-bad");
  runHarness("prepare", badDir);
  const badManifest = JSON.parse(readFileSync(join(badDir, "MANIFEST.json"), "utf8"));
  mkdirSync(join(badDir, "raw"), { recursive: true });
  const badCase = badManifest.cases[0];
  const badFake = { plan: "plan.json", mode: "plan-only", refused: [], noticed_but_not_edited: [],
    edits: [{ plan_id: "e99-does-not-exist", before: "anything", after: "anything else", reason: "test" }] };
  writeFileSync(join(badDir, "raw", `${badCase.case}.md`),
    `\`\`\`json\n${JSON.stringify(badFake, null, 2)}\n\`\`\`\n`);
  // Fill the remaining cases with well-formed refuse transcripts so collect can process
  // them all and report per-case; the interesting failure is the first one.
  for (const c of badManifest.cases.slice(1)) {
    writeFileSync(join(badDir, "raw", `${c.case}.md`),
      `\`\`\`json\n${JSON.stringify({ plan: "plan.json", mode: "plan-only", edits: [], refused: [{ plan_id: "e01", reason: "test" }] }, null, 2)}\n\`\`\`\n`);
  }

  const badCollect = runHarness("collect", badDir);
  check("collect exits non-zero when an edit's plan_id is unknown",
    badCollect.status !== 0, `stdout=${badCollect.stdout}\nstderr=${badCollect.stderr}`);
  check("collect names the offending plan_id in its error",
    /e99-does-not-exist/.test(badCollect.stderr || badCollect.stdout),
    (badCollect.stderr || badCollect.stdout).slice(0, 200));
}

// ---------------------------------------------------------------------------
// cleanup + summary
// ---------------------------------------------------------------------------
for (const d of sandboxes) rmSync(d, { recursive: true, force: true });

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
process.exit(failed ? 1 : 0);

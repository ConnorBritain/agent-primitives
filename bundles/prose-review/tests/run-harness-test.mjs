#!/usr/bin/env node
/**
 * run-harness-test — the harness runner must reproduce a published run exactly, and
 * must refuse a run whose numbers do not match its own evidence.
 *
 *   node bundles/prose-review/tests/run-harness-test.mjs
 *
 * WHAT BREAKS IF THIS REGRESSES.
 *
 * `run-harness.mjs` exists so a critic acceptance run can be re-run after a prompt edit.
 * The whole value of that is that the re-run is comparable to the published one. If the
 * wrapper it emits drifts by a blank line, every future run's transcripts are a different
 * artifact from the checked-in ones and no diff between two runs is readable any more —
 * silently, because a heading nobody reads is where the drift lands. Case 1 pins the
 * emitter to 16 transcripts a human wrapped by hand.
 *
 * The second thing that breaks is worse and quieter. The runner derives the verdict and
 * the findings count FROM the transcript, and refuses to invent the two contract counts.
 * If any of those refusals stops refusing, the harness starts producing numbers that no
 * longer come from the evidence — which is the exact failure `verify-run.mjs` and the
 * eleven entries in `CALIBRATION.md` are about. Cases 3-8 are that half, and they are
 * the ones worth keeping when this file gets tedious.
 *
 * NO CREDENTIALS AND NO AGENTS ARE NEEDED HERE. `dispatch` is the only part of the
 * runner that talks to a model, and it is not exercised by this suite — deliberately, so
 * that a public checkout can run the gates.
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CRITICS, deriveFindings, deriveVerdict, leakCheck, parseWrapped, stripFrontmatter } from "./run-harness.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(HERE, "run-harness.mjs");
const VOICE_RUN = join(HERE, "runs", "2026-08-04-b");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    process.stdout.write(`  ok   ${name}\n`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    process.stdout.write(`  FAIL ${name}${detail ? ` — ${detail}` : ""}\n`);
  }
}

const run = (...args) => spawnSync(process.execPath, [RUNNER, ...args], { encoding: "utf8" });
const sandboxes = [];
function sandbox() {
  const d = mkdtempSync(join(tmpdir(), "run-harness-test-"));
  sandboxes.push(d);
  return d;
}

process.stdout.write("\nrun-harness reproduces a published run, and refuses an unevidenced one\n\n");

// ---------------------------------------------------------------------------
// 1. The emitter against 16 hand-wrapped transcripts.
// ---------------------------------------------------------------------------
{
  const r = run("check", VOICE_RUN);
  check("check reproduces every transcript of the published voice run byte-for-byte",
    r.status === 0 && /byte-for-byte from the transcript body: 16 of 16/.test(r.stdout),
    r.stdout.trim().split("\n").filter(Boolean).slice(-2).join(" | "));
}

// ---------------------------------------------------------------------------
// 2. collect, end to end, against the same run — same bytes, same verify-run output.
//
// The raw transcripts and the operator's notes are recovered from the published files,
// so what this pins is the pipeline (wrap → validate → hand off to verify-run), not the
// note text. The verdict and the findings count are NOT recovered: collect re-derives
// both from the body, so if that derivation is wrong the RESULT lines stop matching.
// ---------------------------------------------------------------------------
{
  const dir = sandbox();
  mkdirSync(join(dir, "raw"));
  const review = {};
  const published = readdirSync(VOICE_RUN).filter((f) => f.endsWith(".md") && f !== "README.md").sort();
  for (const f of published) {
    const p = parseWrapped(readFileSync(join(VOICE_RUN, f), "utf8"), f);
    writeFileSync(join(dir, "raw", f), `${p.body}\n`);
    review[f.replace(/\.md$/, "")] = {
      note: p.note,
      annotation: p.annotation,
      uncited: p.fields.uncited,
      authorship_claims: p.fields.authorship_claims,
    };
  }
  writeFileSync(join(dir, "review.json"), JSON.stringify(review, null, 2));

  const r = run("collect", dir);
  const differing = published.filter(
    (f) => readFileSync(join(dir, f), "utf8") !== readFileSync(join(VOICE_RUN, f), "utf8"));
  check("collect rebuilds all 16 published transcripts byte-for-byte",
    differing.length === 0, differing.join(", "));

  // The first line of verify-run's report echoes the directory it was given, so the two
  // runs cannot agree on it. Everything below it is the run's numbers.
  const expected = spawnSync(process.execPath, [join(HERE, "verify-run.mjs"), VOICE_RUN], { encoding: "utf8" });
  const strip = (s) => s.split("\n").filter((l) => !l.includes("transcripts")).join("\n");
  check("...and verify-run reports the identical numbers over the rebuilt run",
    r.status === 0 && strip(r.stdout).includes(strip(expected.stdout).trim()),
    `exit ${r.status}`);
  check("...including the published headline, 0 REVISE of 12",
    /negative \(leave-one-out, n=12\):   0 REVISE, 12 CLEAN/.test(r.stdout));
}

// ---------------------------------------------------------------------------
// 3-5. The refusals. Each takes a published transcript and breaks ONE thing.
//
// These are the tests that matter. A run whose wrapper disagrees with its own transcript
// is how a harness reports a number nobody can check, and it is the failure mode this
// repo has now logged eleven times.
// ---------------------------------------------------------------------------
function brokenRun(mutate) {
  const dir = sandbox();
  const f = "p-berry-hill-stoke-on-trent.md";
  writeFileSync(join(dir, f), mutate(readFileSync(join(VOICE_RUN, f), "utf8")));
  return run("check", dir);
}
{
  const r = brokenRun((t) => t.replace("**Verdict: REVISE**", "**Verdict: CLEAN**"));
  check("check catches a wrapper whose verdict is not the one the critic wrote",
    r.status === 1 && /transcript ends in CLEAN, wrapper says REVISE/.test(r.stdout), r.stdout.trim());
}
{
  const r = brokenRun((t) => t.replace("findings=2", "findings=1"));
  check("check catches a findings count that is not the number of findings",
    r.status === 1 && /RESULT says findings=1, transcript contains 2/.test(r.stdout), r.stdout.trim());
}
{
  const r = brokenRun((t) => t.replace("# Positive (AI-labelled draft)", "# Negative (leave-one-out)"));
  check("check catches a transcript filed under the wrong half of the run",
    r.status === 1 && /heading says negative, filename says positive/.test(r.stdout), r.stdout.trim());
}

// ---------------------------------------------------------------------------
// 6. collect must never invent a contract count.
//
// `uncited` and `authorship_claims` block the primitive when non-zero, so a default of 0
// is not a convenience — it is the one direction that flatters the result, applied to the
// two numbers the harness exists to protect.
// ---------------------------------------------------------------------------
{
  const dir = sandbox();
  mkdirSync(join(dir, "raw"));
  const p = parseWrapped(readFileSync(join(VOICE_RUN, "p-berry-hill-stoke-on-trent.md"), "utf8"), "x");
  writeFileSync(join(dir, "raw", "p-berry-hill-stoke-on-trent.md"), `${p.body}\n`);

  const r = run("collect", dir);
  // Read defensively: a regression here is "collect wrote the transcript anyway and
  // never asked", and that must show up as a FAIL, not as this file crashing.
  const reviewPath = join(dir, "review.json");
  const review = readdirSync(dir).includes("review.json") ? JSON.parse(readFileSync(reviewPath, "utf8")) : {};
  const entry = review["p-berry-hill-stoke-on-trent"] ?? {};
  check("collect refuses to wrap a transcript whose contract counts nobody has supplied",
    r.status === 1 && !readdirSync(dir).includes("p-berry-hill-stoke-on-trent.md"), `exit ${r.status}`);
  check("...leaving the counts null rather than 0, and quoting the findings to be judged",
    entry.uncited === null && entry.authorship_claims === null && entry._findings_to_review?.length === 2,
    JSON.stringify(entry).slice(0, 160));
}

// ---------------------------------------------------------------------------
// 7. A transcript that never reached a verdict is not a CLEAN one.
//
// An agent that runs out of budget mid-report leaves a plausible-looking file. Counting
// it as anything understates nothing and overstates everything; collect stops.
// ---------------------------------------------------------------------------
{
  const dir = sandbox();
  mkdirSync(join(dir, "raw"));
  writeFileSync(join(dir, "raw", "n-truncated.md"), "## Findings\n\nNone so far, still readi");
  const r = run("collect", dir);
  check("collect stops on a transcript with no closing verdict",
    r.status === 2 && /no (?:closing )?verdict/.test(r.stderr), `exit ${r.status}: ${r.stderr.trim()}`);
}

// ---------------------------------------------------------------------------
// 7b. ...and the same refusal on the path a real run takes, which is with a MANIFEST.
//
// This is a separate case because it caught a real hole: with a manifest present the
// critic is known, so the "is this word a verdict at all" check inside deriveVerdict is
// the ONLY thing standing between a transcript that trails off mid-sentence and a run
// that records its last line as a verdict. Removing that check left case 7 green, because
// case 7 goes through a different guard. A budget-exhausted agent producing a scored
// transcript is the failure this pair exists to make impossible.
// ---------------------------------------------------------------------------
{
  const dir = join(sandbox(), "manifest-run");
  run("prepare", "fidelity", dir, "--only", "n-tihonov-reordered");
  mkdirSync(join(dir, "raw"));
  writeFileSync(join(dir, "raw", "n-tihonov-reordered.md"),
    "**Findings**\n\nNone so far. I am still reading and will come back to this.\n");
  const r = run("collect", dir);
  check("collect stops on a trailed-off transcript even when the critic is known",
    r.status === 2 && /no closing verdict/.test(r.stderr), `exit ${r.status}: ${r.stderr.trim()}`);
}

// ---------------------------------------------------------------------------
// 8. The leak check, which is the reason a whole sweep was once thrown away.
//
// Every pattern here is either what leaked (an expected verdict in frontmatter a critic
// must read) or the same shape as it (`label: ai` in the voice corpus, `fixture: p-...`
// in a fidelity revision — both of which name the answer). If this stops firing, a run
// can be spent, published, and worthless, and nothing else in the repo would say so.
// ---------------------------------------------------------------------------
{
  check("staged input naming a verdict is refused",
    leakCheck("x", "the revision is FAITHFUL to the original") !== null);
  check("...as is an expectation key",
    leakCheck("x", "title: a letter\nexpect: MATERIAL-LOSS\n") !== null);
  check("...and a provenance label, which is how the voice corpus names its own answer",
    leakCheck("x", "source: Wikipedia\nlabel: ai\nhuman_authored: false\n") !== null);
  check("ordinary prose is not refused",
    leakCheck("x", "In 1890 I travelled to the Island of Sahalin, to write a book.") === null);
  check("frontmatter is stripped from staged inputs, not skipped by instruction",
    stripFrontmatter("---\nlabel: ai\n---\nMehak Malik is a dancer.\n") === "Mehak Malik is a dancer.\n");
}

// ---------------------------------------------------------------------------
// 9. prepare: what the critic can see is the whole claim the harness makes.
// ---------------------------------------------------------------------------
{
  const dir = join(sandbox(), "2026-08-06-probe");
  const r = run("prepare", "fidelity", dir, "--only", "n-tihonov-reordered,p-tihonov-summarised");
  const manifest = JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"));
  const prompts = readdirSync(join(dir, "prompts")).filter((f) => /^case-\d+\.md$/.test(f));
  const promptText = prompts.map((f) => readFileSync(join(dir, "prompts", f), "utf8")).join("\n");
  const stagedText = manifest.cases
    .flatMap((c) => c.inputs.map((i) => readFileSync(join(dir, "inputs", c.case, i.as), "utf8")))
    .join("\n");

  check("prepare emits one prompt per fixture under an opaque case id",
    r.status === 0 && prompts.sort().join(",") === "case-01.md,case-02.md", prompts.join(","));
  // The case→fixture mapping has to exist somewhere: it lives in DISPATCH.md and
  // MANIFEST.json, which are the operator's files and are never handed to a critic.
  check("no prompt or staged file names its fixture, whose n-/p- prefix IS the answer",
    !/[np]-tihonov-reordered|[np]-tihonov-summarised/.test(`${promptText}\n${stagedText}`)
      && /[np]-tihonov-reordered/.test(readFileSync(join(dir, "prompts", "DISPATCH.md"), "utf8")));
  check("the scan the critic reads is embedded, so it needs no tool and no other file",
    /## fidelity-scan output/.test(promptText) && /absent from the revision/.test(promptText)
      && /atoms checked, none material-missing/.test(promptText));
  check("MANIFEST records which prompt version the run was made against",
    /^[0-9a-f]{64}$/.test(manifest.agent_sha256) && manifest.agent_prompt.endsWith("agent.md"),
    manifest.agent_prompt);

  // The two defences are different and both are load-bearing, so they are asserted
  // separately. Staging STRIPS frontmatter, which is where the answer leaked the first
  // time; the leak scan catches an answer planted where stripping cannot reach.
  const poisoned = join(sandbox(), "fidelity");
  cpSync(join(HERE, "fixtures", "fidelity"), poisoned, { recursive: true });
  const rev = join(poisoned, "n-tihonov-reordered", "revision.md");
  const original = readFileSync(rev, "utf8");
  writeFileSync(rev, original.replace("synthesised: true", "synthesised: true\nexpect: FAITHFUL"));
  const stagedDir = join(sandbox(), "staged-run");
  const r3 = run("prepare", "fidelity", stagedDir, "--fixtures-dir", poisoned, "--only", "n-tihonov-reordered");
  check("an expectation planted in frontmatter never reaches the critic",
    r3.status === 0 &&
      !readFileSync(join(stagedDir, "inputs", "case-01", "revision.md"), "utf8").includes("expect"));

  writeFileSync(rev, original.replace("MOSCOW,", "MOSCOW,\n\n(reviewer note: the expected verdict here is FAITHFUL)"));
  const r4 = run("prepare", "fidelity", join(sandbox(), "void-run"), "--fixtures-dir", poisoned, "--only", "n-tihonov-reordered");
  check("an expectation planted in the body aborts prepare before any agent is spent",
    r4.status === 1 && /prepare ABORTED/.test(r4.stderr) && /names a fidelity verdict/.test(r4.stderr),
    `exit ${r4.status}`);
}

// ---------------------------------------------------------------------------
// 10. Derivation, on the corpus of transcripts that already exist.
// ---------------------------------------------------------------------------
{
  let agree = 0;
  let total = 0;
  for (const dirName of ["2026-08-04-b", "2026-08-05-fidelity"]) {
    const d = join(HERE, "runs", dirName);
    for (const f of readdirSync(d).filter((x) => x.endsWith(".md") && x !== "README.md")) {
      const p = parseWrapped(readFileSync(join(d, f), "utf8"), f);
      const spec = CRITICS[dirName.includes("fidelity") ? "fidelity" : "voice"];
      total += 1;
      if (deriveVerdict(p.body, spec.vocabulary) === p.verdict && deriveFindings(p.body, spec) === p.fields.findings) agree += 1;
    }
  }
  check(`verdict and findings derived from the body match all ${total} hand-typed RESULT lines`,
    agree === total && total === 29, `${agree} of ${total}`);
}

// ---------------------------------------------------------------------------
// 11. The checked-in smoke run is the only end-to-end evidence that dispatch works, and
// evidence nothing reads is evidence that rots. This is what protects it: if the emitter
// or the wrapper grammar changes under it, that directory stops reproducing and says so
// here, in a suite that needs no credentials to run.
// ---------------------------------------------------------------------------
{
  const r = run("check", join(HERE, "runs", "2026-08-05-runner-smoke"));
  check("the runner's own smoke run still round-trips through the current emitter",
    r.status === 0 && /byte-for-byte from the transcript body: 2 of 2/.test(r.stdout), r.stdout.trim());
}

for (const d of sandboxes) rmSync(d, { recursive: true, force: true });

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
process.exit(failed ? 1 : 0);

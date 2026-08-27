#!/usr/bin/env node
/**
 * acceptance-runner — reproducible v0.2 blank-page acceptance pipeline.
 *
 * This is intentionally separate from prose-review's fixture harness. That harness
 * enumerates its own fixed leave-one-out corpus; this one is driven by a locked case
 * manifest and must preserve the renderer -> drafter -> critic provenance chain.
 *
 *   node tests/acceptance-runner.mjs prepare  tests/runs/<run>
 *   node tests/acceptance-runner.mjs profiles tests/runs/<run>
 *   node tests/acceptance-runner.mjs drafts   tests/runs/<run>
 *   node tests/acceptance-runner.mjs critics  tests/runs/<run>
 *   node tests/acceptance-runner.mjs collect  tests/runs/<run>
 *   node tests/acceptance-runner.mjs check    tests/runs/<run>
 *
 * Dispatch is resumable only for missing files. Once a completed model response exists,
 * it is never overwritten: a retry would be a redraw and would void the locked run.
 */

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { scoreRun } from "./bar.mjs";
import { analyzeParagraphCoverage } from "./coverage-analysis.mjs";
import { crossCount } from "./cross-count.mjs";
import { bodyOf } from "./corpus-rates.mjs";
import { measureProfile } from "./profile-measurements.mjs";
import {
  corpusLeakage, findFabricatedCitations, parseDraft, validateDraft,
} from "./voice-draft.mjs";
import {
  corpusLock, parseRender, SCHEMA_ID as PROFILE_SCHEMA, validateVoiceProfile,
} from "./voice-profile.mjs";
import { RESEMBLANCE_CLAIMS } from "./run-gates.mjs";

const TESTS = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(TESTS, "..");
const REPO = resolve(BUNDLE, "..", "..");
const MODEL = process.env.ACCEPTANCE_MODEL || "sonnet";
const EFFORT = process.env.ACCEPTANCE_EFFORT || "medium";
const CONCURRENCY = positiveInt(process.env.ACCEPTANCE_CONCURRENCY || "4", "ACCEPTANCE_CONCURRENCY");
const SHA = (value) => createHash("sha256").update(value).digest("hex");
const today = () => new Date().toISOString().slice(0, 10);
const text = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(text(path));
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const stripFrontmatter = (value) => value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

const AGENTS = {
  profile: "primitives/agents/voice-profile-render/agent.md",
  draft: "primitives/agents/voice-draft/agent.md",
  critic: "primitives/agents/prose-voice-critic/agent.md",
};

const FORBIDDEN_DRAFT_CLAIMS = [
  ...RESEMBLANCE_CLAIMS,
  /\b(?:excellent|high-quality|publication-ready|polished) (?:draft|prose|piece|writing)\b/i,
  /\b(?:this|the) (?:draft|piece|prose) (?:is|was) (?:excellent|high-quality|publication-ready|polished)\b/i,
];

function positiveInt(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive integer`);
  return n;
}

function die(message, code = 1) {
  process.stderr.write(`\n  acceptance-runner: ${message}\n\n`);
  process.exit(code);
}

function rel(path) { return relative(REPO, path); }

function runPath(arg) {
  if (!arg) die("usage: acceptance-runner.mjs <prepare|profiles|drafts|critics|collect|check> <run-dir>", 2);
  return resolve(arg);
}

function expectedFiles(runDir) {
  return {
    cases: join(runDir, "CASES.json"),
    design: join(runDir, "DESIGN.md"),
    manifest: join(runDir, "MANIFEST.json"),
    artifacts: join(runDir, "ARTIFACTS.json"),
    audit: join(runDir, "CLAIMS-AUDIT.json"),
    tally: join(runDir, "TALLY.json"),
  };
}

function validateCases(cases) {
  const errors = [];
  if (cases?.schema !== "prose-author-acceptance/1") errors.push("CASES.json has the wrong schema");
  const profiles = cases?.profiles ?? [];
  if (profiles.length !== 2) errors.push("exactly two profile corpora are required");
  if (!profiles.every((p) => p.renders === 3)) errors.push("every corpus must preregister exactly three renders");
  const ids = new Set(profiles.map((p) => p.id));
  const draftIds = new Set();
  if ((cases?.cases ?? []).length !== 20) errors.push("exactly twenty draft cases are required");
  for (const [i, c] of (cases?.cases ?? []).entries()) {
    if (draftIds.has(c.id)) errors.push(`duplicate case id ${c.id}`);
    draftIds.add(c.id);
    if (!ids.has(c.profile)) errors.push(`${c.id} names unknown profile ${c.profile}`);
    if (!["essay-topic", "outline-post", "reply"].includes(c.shape)) errors.push(`${c.id} has invalid shape`);
    if (c.render !== (i % 10) % 3 + 1) errors.push(`${c.id} violates fixed per-corpus round robin`);
    if (!c.prompt?.trim()) errors.push(`${c.id} has no prompt`);
  }
  for (const p of profiles) {
    const own = (cases?.cases ?? []).filter((c) => c.profile === p.id);
    const shapes = own.reduce((a, c) => ({ ...a, [c.shape]: (a[c.shape] || 0) + 1 }), {});
    if (own.length !== 10 || shapes["essay-topic"] !== 4 || shapes["outline-post"] !== 3 || shapes.reply !== 3) {
      errors.push(`${p.id} must have four essays, three outline posts, and three replies`);
    }
  }
  if ((cases?.refusals ?? []).length !== 2) errors.push("exactly two refusal cases are required");
  for (const p of profiles) {
    if ((cases?.refusals ?? []).filter((r) => r.profile === p.id).length !== 1) {
      errors.push(`${p.id} must have exactly one underdetermined refusal`);
    }
  }
  return errors;
}

function sourceProfile(profile) {
  return join(TESTS, "fixtures", "profiles", profile.fixture);
}

function prepare(runDir) {
  const p = expectedFiles(runDir);
  if (!existsSync(p.cases) || !existsSync(p.design)) die("run directory needs committed DESIGN.md and CASES.json");
  if (existsSync(p.manifest)) die("MANIFEST.json already exists; a prepared run is immutable");
  const cases = json(p.cases);
  const problems = validateCases(cases);
  if (problems.length) die(problems.join("; "));

  // The acceptance design explicitly locks implementation before the first acceptance
  // draft. Make that a mechanism: every file capable of changing the pipeline must be
  // tracked and byte-identical to HEAD before a manifest can be prepared.
  const locked = [
    rel(p.design), rel(p.cases),
    ...Object.values(AGENTS),
    "bundles/prose-author/tests/voice-profile.mjs",
    "bundles/prose-author/tests/voice-draft.mjs",
    "bundles/prose-author/tests/coverage-analysis.mjs",
    "bundles/prose-author/tests/profile-measurements.mjs",
    "bundles/prose-author/tests/acceptance-runner.mjs",
    "bundles/prose-author/tests/fixtures/voice-draft-regressions/safeguards.json",
  ];
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", ...locked], { cwd: REPO, stdio: "ignore" });
    execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...locked], { cwd: REPO, stdio: "ignore" });
  } catch {
    die("locked prompts, schemas, validators, fixtures, harness, DESIGN.md, and CASES.json must be committed before prepare");
  }
  const preparedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();

  const agentEntries = {};
  for (const [kind, source] of Object.entries(AGENTS)) {
    const body = stripFrontmatter(text(join(REPO, source)));
    const to = join(runDir, "prompts", "agents", `${kind}.md`);
    write(to, body);
    agentEntries[kind] = { source, sha256: SHA(body), snapshot: rel(to) };
  }

  const corpusEntries = {};
  const currencyLocks = {};
  for (const profile of cases.profiles) {
    const source = sourceProfile(profile);
    const lock = corpusLock(source, { agentPath: join(REPO, AGENTS.profile) });
    const staged = join(runDir, "inputs", "corpora", profile.id);
    mkdirSync(staged, { recursive: true });
    // Stage the author's prose whole, not the site's repeated navigation/colophon.
    // Frontmatter remains because provenance is part of the renderer's evidence.
    for (const sample of lock.files) {
      const from = join(source, "corpus", "human", ...(sample.group ? [sample.group] : []), sample.file);
      const raw = text(from);
      const frontmatter = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)?.[0] ?? "";
      const to = join(staged, "corpus", "human", ...(sample.group ? [sample.group] : []), sample.file);
      write(to, `${frontmatter}${bodyOf(raw).trim()}\n`);
    }
    for (const f of ["profile.json", "voice.md"]) {
      if (existsSync(join(source, f))) cpSync(join(source, f), join(staged, f));
    }
    const measurements = measureProfile(source);
    write(join(staged, "measurements.json"), measurements);
    corpusEntries[profile.id] = {
      fixture: profile.fixture,
      source: rel(source),
      staged: rel(staged),
      lock,
      measurements,
      measurements_sha256: SHA(`${JSON.stringify(measurements, null, 2)}\n`),
    };
    currencyLocks[`${profile.id}-renderer`] = lock;
    currencyLocks[`${profile.id}-drafter`] = corpusLock(source, { agentPath: join(REPO, AGENTS.draft) });
  }
  // This conventional filename is consumed by the existing current-render guard. It
  // contains both primitive owners because this run exercises both on the same corpora.
  write(join(runDir, "corpus.lock.json"), currencyLocks);

  const manifest = {
    schema: "prose-author-acceptance-manifest/1",
    run_id: basename(runDir),
    prepared: today(),
    prepared_commit: preparedCommit,
    model: MODEL,
    effort: EFFORT,
    draws_per_draft: 3,
    design_sha256: SHA(text(p.design)),
    cases_sha256: SHA(text(p.cases)),
    agents: agentEntries,
    corpora: corpusEntries,
    prompts: Object.fromEntries([
      ...(cases.cases ?? []), ...(cases.refusals ?? []),
    ].map((c) => [c.id, { profile: c.profile, render: c.render, sha256: SHA(c.prompt), prompt: c.prompt }])),
  };
  write(p.manifest, manifest);

  for (const profile of cases.profiles) {
    for (let render = 1; render <= profile.renders; render += 1) {
      const staged = resolve(REPO, manifest.corpora[profile.id].staged);
      const files = [
        ...(existsSync(join(staged, "profile.json")) ? ["profile.json"] : []),
        ...(existsSync(join(staged, "voice.md")) ? ["voice.md"] : []),
        "measurements.json",
        ...manifest.corpora[profile.id].lock.files.map((f) => `corpus/human/${f.file}`),
      ];
      const prompt = [
        `Render profile ${profile.id}.`,
        "Every allowed input file is reproduced verbatim below. Read all of them and",
        "follow the system prompt's output contract exactly. No filesystem tools exist.",
        "",
        ...files.flatMap((file) => [
          `## Input file: ${file}`,
          "",
          "<file>",
          text(join(staged, file)),
          "</file>",
          "",
        ]),
        "",
        "Emit the profile fences only.",
      ].join("\n");
      write(join(runDir, "prompts", "profiles", `${profile.id}-r${render}.md`), `${prompt}\n`);
    }
  }
  process.stdout.write(`\n  prepared ${rel(runDir)}: 6 profiles, 22 draft/refusal cells, 60 critic draws\n\n`);
}

function loadPrepared(runDir) {
  const p = expectedFiles(runDir);
  if (!existsSync(p.manifest)) die("run has not been prepared");
  const manifest = json(p.manifest);
  const cases = json(p.cases);
  return { p, manifest, cases };
}

function completedResult(path) {
  if (!existsSync(path)) return null;
  const record = json(path);
  if (record.type !== "result" || record.is_error || typeof record.result !== "string" || !record.result.trim()) {
    die(`${rel(path)} exists but is not a completed successful response; do not redraw it`);
  }
  return record;
}

async function claude({ system, prompt, cwd, tools, allowed, output }) {
  if (completedResult(output)) return { skipped: true, output };
  const args = [
    "-p", "--output-format", "json", "--no-session-persistence", "--model", MODEL,
    "--effort", EFFORT, "--system-prompt-file", system,
    // Keep the clean context actually clean. Without these flags Claude Code loads the
    // user's plugins, MCP servers and settings into every print-mode call. On this host
    // that consumed roughly 130k cached tokens before a 60k-token corpus prompt, leaving
    // the renderer at the context ceiling and causing long no-output stalls.
    "--disable-slash-commands", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
    "--setting-sources", "", "--no-chrome",
    "--tools", tools,
  ];
  if (allowed?.length) args.push("--allowedTools", ...allowed);
  args.push("--disallowedTools", "Bash", "Edit", "Write", "WebFetch", "WebSearch", "Task");
  return new Promise((resolvePromise, reject) => {
    const child = spawn("claude", args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${stderr.slice(0, 2000)}`));
      let record;
      try { record = JSON.parse(stdout); } catch { return reject(new Error(`claude emitted invalid JSON: ${stdout.slice(0, 500)}`)); }
      if (record.type !== "result" || record.is_error || !record.result?.trim()) {
        return reject(new Error(`claude emitted no successful result: ${stdout.slice(0, 1000)}`));
      }
      write(output, record);
      resolvePromise({ skipped: false, output });
    });
    child.stdin.end(prompt);
  });
}

async function pool(label, jobs) {
  let next = 0;
  let failed = null;
  const workers = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (!failed) {
      const i = next++;
      if (i >= jobs.length) return;
      const job = jobs[i];
      process.stdout.write(`    ${label} ${job.id} ... `);
      const started = Date.now();
      try {
        const result = await job.run();
        process.stdout.write(`${result.skipped ? "already complete" : `${Math.round((Date.now() - started) / 1000)}s`}\n`);
      } catch (error) {
        process.stdout.write("FAILED\n");
        failed = error;
      }
    }
  });
  await Promise.all(workers);
  if (failed) throw failed;
}

async function dispatchProfiles(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
  const system = resolve(REPO, manifest.agents.profile.snapshot);
  const jobs = cases.profiles.flatMap((profile) =>
    Array.from({ length: profile.renders }, (_, i) => {
      const render = i + 1;
      const cwd = resolve(REPO, manifest.corpora[profile.id].staged);
      const promptPath = join(runDir, "prompts", "profiles", `${profile.id}-r${render}.md`);
      return {
        id: `${profile.id}-r${render}`,
        run: () => claude({
          system, cwd, prompt: text(promptPath), tools: "", allowed: [],
          output: join(runDir, "raw", "profiles", `${profile.id}-r${render}.json`),
        }),
      };
    }));
  await pool("profile", jobs);
  collectProfiles(runDir);
}

function collectProfiles(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
  const artifacts = existsSync(join(runDir, "ARTIFACTS.json")) ? json(join(runDir, "ARTIFACTS.json")) : {
    schema: "prose-author-acceptance-artifacts/1", profiles: {}, drafts: {}, refusals: {}, critics: {},
  };
  for (const profile of cases.profiles) {
    artifacts.profiles[profile.id] = {};
      const expectedSamples = manifest.corpora[profile.id].lock.files.map((f) => f.file).sort();
    const measurements = manifest.corpora[profile.id].measurements;
    const byRule = new Map(measurements.measurements.map((m) => [m.counting_rule, m]));
    for (let render = 1; render <= profile.renders; render += 1) {
      const rawPath = join(runDir, "raw", "profiles", `${profile.id}-r${render}.json`);
      const record = completedResult(rawPath);
      if (!record) die(`missing ${rel(rawPath)}`);
      const parsed = parseRender(record.result);
      const validation = validateVoiceProfile(parsed.json, parsed.markdown);
      if (!validation.ok || validation.refusal) die(`${profile.id}-r${render} invalid: ${validation.errors.join("; ")}`);
      if (parsed.json.schema !== PROFILE_SCHEMA) die(`${profile.id}-r${render} is not ${PROFILE_SCHEMA}`);
      if (parsed.json.corpus_words !== measurements.corpus_words) {
        die(`${profile.id}-r${render} corpus_words diverges from the deterministic measurement`);
      }
      for (const observation of parsed.json.observations) {
        if (!observation.rate) continue;
        const measured = byRule.get(observation.rate.counting_rule);
        if (!measured) die(`${profile.id}-r${render} rate ${observation.id} has no independently locatable counting rule`);
        if (measured.count !== observation.rate.count || Math.abs(measured.per_1000_words - observation.rate.per_1000_words) > 0.01) {
          die(`${profile.id}-r${render} rate ${observation.id} diverges from its independent counter`);
        }
      }
      const gotSamples = [...parsed.json.samples_used].sort();
      if (JSON.stringify(gotSamples) !== JSON.stringify(expectedSamples)) {
        die(`${profile.id}-r${render} samples_used differs from its corpus lock`);
      }
      const coverage = analyzeParagraphCoverage(parsed.markdown);
      if (coverage.some((c) => c.status === "absent")) {
        die(`${profile.id}-r${render} prose silently omits coverage: ${coverage.filter((c) => c.status === "absent").map((c) => c.id).join(", ")}`);
      }
      const recount = crossCount(sourceProfile(profile), parsed.markdown);
      if (recount.some((row) => row.status === "DIVERGES")) {
        die(`${profile.id}-r${render} independent recount diverges: ${recount.filter((row) => row.status === "DIVERGES").map((row) => `${row.id} ${row.stated}/${row.measured}`).join(", ")}`);
      }
      const outDir = join(runDir, "inputs", "profiles", profile.id);
      const md = join(outDir, `r${render}.md`);
      const js = join(outDir, `r${render}.json`);
      write(md, `${parsed.markdown.trim()}\n`);
      write(js, parsed.json);
      // The historical render suite reads verbatim two-fence outputs from raw/*.md.
      // Keep that convention while the machine record (cost/duration/result) remains
      // separately immutable under raw/profiles/*.json.
      const rawRender = join(runDir, "raw", `${profile.id}-r${render}.md`);
      write(rawRender, `${record.result.trim()}\n`);
      artifacts.profiles[profile.id][`r${render}`] = {
        raw: rel(rawPath), render: rel(rawRender), markdown: rel(md), json: rel(js),
        raw_sha256: SHA(text(rawPath)), markdown_sha256: SHA(text(md)), json_sha256: SHA(text(js)),
        coverage, recount,
      };
    }
  }
  write(join(runDir, "ARTIFACTS.json"), artifacts);
  process.stdout.write(`\n  collected and validated six ${PROFILE_SCHEMA} renders\n\n`);
}

function draftPrompt(c, profileMarkdown, profileJson) {
  return [
    "Write the requested draft using only the request and rendered voice profile below.",
    "Follow the system prompt and its output contract exactly. You have no corpus access.",
    "",
    "## Request",
    "",
    c.prompt,
    "",
    "## Rendered voice profile",
    "",
    "```markdown",
    profileMarkdown.trim(),
    "```",
    "",
    "```json",
    JSON.stringify(profileJson, null, 2),
    "```",
    "",
    "Output the draft or refusal fences only.",
  ].join("\n");
}

async function dispatchDrafts(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
  collectProfiles(runDir);
  const system = resolve(REPO, manifest.agents.draft.snapshot);
  const cells = [...cases.cases, ...cases.refusals.map((c) => ({ ...c, refusal: true }))];
  const jobs = cells.map((c) => {
    const profileDir = join(runDir, "inputs", "profiles", c.profile);
    const prompt = draftPrompt(c, text(join(profileDir, `r${c.render}.md`)), json(join(profileDir, `r${c.render}.json`)));
    const promptPath = join(runDir, "prompts", c.refusal ? "refusals" : "drafts", `${c.id}.md`);
    write(promptPath, `${prompt}\n`);
    return {
      id: c.id,
      run: () => claude({
        system, cwd: runDir, prompt, tools: "", allowed: [],
        output: join(runDir, "raw", c.refusal ? "refusals" : "drafts", `${c.id}.json`),
      }),
    };
  });
  await pool("draft", jobs);
  collectDrafts(runDir);
}

function collectDrafts(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
  const artifactsPath = join(runDir, "ARTIFACTS.json");
  if (!existsSync(artifactsPath)) die("profiles must be collected first");
  const artifacts = json(artifactsPath);
  for (const c of cases.cases) {
    const rawPath = join(runDir, "raw", "drafts", `${c.id}.json`);
    const record = completedResult(rawPath);
    if (!record) die(`missing ${rel(rawPath)}`);
    const parsed = parseDraft(record.result);
    const validation = validateDraft(parsed);
    if (!validation.ok || validation.refusal) die(`${c.id} invalid draft: ${validation.errors.join("; ")}`);
    const out = join(runDir, "inputs", "drafts", `${c.id}.txt`);
    write(out, `${parsed.draft.trim()}\n`);
    const disclosure = parsed.hadJsonFence ? parsed.json : null;
    const disclosurePath = join(runDir, "inputs", "records", `${c.id}.json`);
    if (disclosure) write(disclosurePath, disclosure);
    const dispatchPrompt = join(runDir, "prompts", "drafts", `${c.id}.md`);
    artifacts.drafts[c.id] = {
      profile: c.profile, render: c.render, request_sha256: SHA(c.prompt),
      prompt: rel(dispatchPrompt), prompt_sha256: SHA(text(dispatchPrompt)), raw: rel(rawPath),
      raw_sha256: SHA(text(rawPath)), draft: rel(out), draft_sha256: SHA(text(out)),
      disclosure: disclosure ? rel(disclosurePath) : null,
      disclosure_sha256: disclosure ? SHA(text(disclosurePath)) : null,
    };
  }
  for (const c of cases.refusals) {
    const rawPath = join(runDir, "raw", "refusals", `${c.id}.json`);
    const record = completedResult(rawPath);
    if (!record) die(`missing ${rel(rawPath)}`);
    const parsed = parseDraft(record.result);
    const validation = validateDraft(parsed);
    if (!validation.ok || !validation.refusal) die(`${c.id} did not produce a valid refusal: ${validation.errors.join("; ")}`);
    const dispatchPrompt = join(runDir, "prompts", "refusals", `${c.id}.md`);
    artifacts.refusals[c.id] = {
      prompt: rel(dispatchPrompt), prompt_sha256: SHA(text(dispatchPrompt)),
      raw: rel(rawPath), raw_sha256: SHA(text(rawPath)), reason: parsed.json.refused,
    };
  }
  write(artifactsPath, artifacts);
  prepareClaimsAudit(runDir, cases, artifacts);
  process.stdout.write("\n  collected twenty drafts and two valid underdetermined refusals\n\n");
}

function prepareClaimsAudit(runDir, cases, artifacts) {
  const auditPath = join(runDir, "CLAIMS-AUDIT.json");
  const prior = existsSync(auditPath) ? json(auditPath) : { schema: "prose-author-claims-audit/1", drafts: {} };
  for (const c of cases.cases) {
    const disclosure = artifacts.drafts[c.id].disclosure ? json(resolve(REPO, artifacts.drafts[c.id].disclosure)) : null;
    const claims = disclosure?.claims ?? [];
    prior.drafts[c.id] = {
      claims,
      audited: prior.drafts?.[c.id]?.claims && JSON.stringify(prior.drafts[c.id].claims) === JSON.stringify(claims)
        ? prior.drafts[c.id].audited : (claims.length === 0 ? true : null),
      note: prior.drafts?.[c.id]?.note ?? "",
    };
  }
  write(auditPath, prior);
}

function criticPrompt(caseId, corpus, draft) {
  return [
    `# Voice acceptance critic — ${caseId}`,
    "",
    "Read every corpus sample and draft.txt, then follow the system prompt exactly.",
    "The corpus is the only voice evidence. No voice card is supplied.",
    "No deterministic rhythm scan is supplied; say so rather than guessing at category 4.",
    "",
    "Every allowed input is reproduced verbatim below. No filesystem tools exist.",
    "",
    "Do not read or infer any fixture manifest, answer key, other draft, profile,",
    "previous draw, or other run artifact. Output the report and closing verdict only.",
    "",
    ...corpus.flatMap(({ file, body }) => [
      `## Corpus sample: ${file}`,
      "",
      "<corpus-sample>", body, "</corpus-sample>", "",
    ]),
    "## Draft: draft.txt",
    "",
    "<draft>", draft, "</draft>",
  ].join("\n");
}

async function dispatchCritics(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
  collectDrafts(runDir);
  const system = resolve(REPO, manifest.agents.critic.snapshot);
  const jobs = [];
  for (const c of cases.cases) {
    const inputDir = join(runDir, "critics", "inputs", c.id);
    if (!existsSync(inputDir)) {
      const stagedCorpus = resolve(REPO, manifest.corpora[c.profile].staged, "corpus", "human");
      cpSync(stagedCorpus, join(inputDir, "corpus"), { recursive: true });
      cpSync(join(runDir, "inputs", "drafts", `${c.id}.txt`), join(inputDir, "draft.txt"));
    }
    const corpusFiles = readdirSync(join(inputDir, "corpus")).filter((f) => statSync(join(inputDir, "corpus", f)).isFile()).sort();
    const corpus = corpusFiles.map((file) => ({
      file,
      body: stripFrontmatter(text(join(inputDir, "corpus", file))),
    }));
    const prompt = criticPrompt(c.id, corpus, text(join(inputDir, "draft.txt")));
    for (let draw = 1; draw <= 3; draw += 1) {
      const promptPath = join(runDir, "critics", "prompts", `${c.id}-d${draw}.md`);
      write(promptPath, `${prompt}\n`);
      jobs.push({
        id: `${c.id}-d${draw}`,
        run: () => claude({
          system, cwd: inputDir, prompt, tools: "", allowed: [],
          output: join(runDir, "critics", "raw", `${c.id}-d${draw}.json`),
        }),
      });
    }
  }
  await pool("critic", jobs);
  process.stdout.write("\n  dispatched sixty fresh critic draws; run collect after the claims audit is complete\n\n");
}

function deriveCritic(body) {
  const lines = body.trim().split("\n");
  let verdict = null;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const bare = lines[i].replace(/\*/g, "").replace(/\.$/, "").trim().toUpperCase();
    if (["CLEAN", "REVISE"].includes(bare)) { verdict = bare; break; }
    const m = bare.match(/^VERDICT\s*:\s*(CLEAN|REVISE)$/);
    if (m) { verdict = m[1]; break; }
  }
  const findings = (body.match(/\*\*LOCATION\*\*/g) ?? []).length;
  const blocks = body.match(/\*\*LOCATION\*\*[\s\S]*?(?=\*\*LOCATION\*\*|$)/g) ?? [];
  const uncited = blocks.filter((b) => !/\*\*CORPUS EVIDENCE\*\*/.test(b)).length;
  const authorshipClaims = (body.match(/machine[- ]generated|written by (?:an? )?(?:AI|model)|AI[- ]generated/gi) ?? []).length;
  return { verdict, findings, uncited, authorship_claims: authorshipClaims };
}

function structuralGates(runDir, manifest, cases, artifacts) {
  const rows = [];
  for (const c of cases.cases) {
    const draft = text(join(runDir, "inputs", "drafts", `${c.id}.txt`));
    const profileText = text(join(runDir, "inputs", "profiles", c.profile, `r${c.render}.md`));
    const corpusDir = resolve(REPO, manifest.corpora[c.profile].staged, "corpus", "human");
    const leakage = corpusLeakage({ draft, corpusDir, profileText });
    rows.push({
      id: c.id,
      fabricated: findFabricatedCitations(draft),
      leaked: leakage.leaked,
      forbidden_claims: FORBIDDEN_DRAFT_CLAIMS.filter((pattern) => pattern.test(draft)).map(String),
    });
  }
  const refusals = cases.refusals.every((c) => artifacts.refusals[c.id]?.reason);
  return {
    rows,
    gates: {
      fabricated_citations: rows.every((r) => r.fabricated.length === 0) ? "pass" : "fail",
      corpus_leakage: rows.every((r) => r.leaked.length === 0) ? "pass" : "fail",
      refuses_when_underdetermined: refusals ? "pass" : "fail",
      no_resemblance_claims: rows.every((r) => r.forbidden_claims.length === 0) ? "pass" : "fail",
    },
  };
}

function collect(runDir) {
  const { manifest, cases, p } = loadPrepared(runDir);
  collectDrafts(runDir);
  const audit = json(p.audit);
  const pending = Object.entries(audit.drafts ?? {}).filter(([, value]) => value.audited !== true);
  if (pending.length) die(`claims audit incomplete for: ${pending.map(([id]) => id).join(", ")}`);
  const artifacts = json(p.artifacts);
  const drafts = [];
  let criticContractFailures = 0;
  for (const c of cases.cases) {
    const verdicts = [];
    const findings = [];
    artifacts.critics[c.id] = {};
    for (let draw = 1; draw <= 3; draw += 1) {
      const rawPath = join(runDir, "critics", "raw", `${c.id}-d${draw}.json`);
      const record = completedResult(rawPath);
      if (!record) die(`missing critic draw ${c.id}-d${draw}`);
      const derived = deriveCritic(record.result);
      if (!derived.verdict) die(`${c.id}-d${draw} has no closing CLEAN/REVISE verdict`);
      if (derived.uncited || derived.authorship_claims) criticContractFailures += 1;
      verdicts.push(derived.verdict);
      findings.push(derived.findings);
      artifacts.critics[c.id][`d${draw}`] = {
        raw: rel(rawPath), sha256: SHA(text(rawPath)), ...derived,
      };
    }
    drafts.push({ id: c.id, topic: c.topic, verdicts, findings });
  }
  if (criticContractFailures) die(`${criticContractFailures} critic draws violate the citation/authorship contract`);
  const structural = structuralGates(runDir, manifest, cases, artifacts);
  const tally = {
    schema: "prose-author-generator-tally/1",
    run: basename(runDir),
    drafts,
    structural_gates: structural.gates,
  };
  write(p.artifacts, artifacts);
  write(join(runDir, "STRUCTURAL.json"), structural);
  write(p.tally, tally);
  const score = scoreRun(tally);
  write(join(runDir, "SCORE.json"), score);
  process.stdout.write(`\n  drafts passing locked bar: ${score.passed} of ${score.of}\n`);
  process.stdout.write(`  structural gates: ${score.gateFailures.length ? `FAIL ${score.gateFailures.join(", ")}` : "all pass"}\n\n`);
  process.exitCode = score.clears ? 0 : 1;
}

function check(runDir) {
  const { manifest, cases, p } = loadPrepared(runDir);
  const errors = [];
  if (SHA(text(p.design)) !== manifest.design_sha256) errors.push("DESIGN.md changed after prepare");
  if (SHA(text(p.cases)) !== manifest.cases_sha256) errors.push("CASES.json changed after prepare");
  errors.push(...validateCases(cases));
  for (const [kind, entry] of Object.entries(manifest.agents)) {
    const sourceBody = stripFrontmatter(text(join(REPO, entry.source)));
    if (SHA(sourceBody) !== entry.sha256) errors.push(`${kind} source agent changed after prepare`);
    if (SHA(text(resolve(REPO, entry.snapshot))) !== entry.sha256) errors.push(`${kind} agent snapshot hash mismatch`);
  }
  for (const profile of cases.profiles) {
    const now = corpusLock(sourceProfile(profile), { agentPath: join(REPO, AGENTS.profile) });
    if (now.aggregate_sha256 !== manifest.corpora[profile.id].lock.aggregate_sha256) errors.push(`${profile.id} corpus lock drifted`);
    const measured = measureProfile(sourceProfile(profile));
    if (SHA(`${JSON.stringify(measured, null, 2)}\n`) !== manifest.corpora[profile.id].measurements_sha256) {
      errors.push(`${profile.id} deterministic measurements drifted`);
    }
  }
  for (const c of [...cases.cases, ...cases.refusals]) {
    if (SHA(c.prompt) !== manifest.prompts[c.id]?.sha256) errors.push(`${c.id} prompt hash mismatch`);
  }
  try {
    const preparedTree = execFileSync("git", ["rev-parse", `${manifest.prepared_commit}^{tree}`], { cwd: REPO, encoding: "utf8" }).trim();
    if (!preparedTree) errors.push("prepared commit is not resolvable");
  } catch {
    errors.push("prepared commit is not resolvable");
  }
  if (!existsSync(p.artifacts)) errors.push("ARTIFACTS.json missing");
  if (!existsSync(p.tally)) errors.push("TALLY.json missing");
  if (existsSync(p.artifacts)) {
    const artifacts = json(p.artifacts);
    for (const group of ["profiles", "drafts", "refusals", "critics"]) {
      if (!artifacts[group]) errors.push(`ARTIFACTS.json missing ${group}`);
    }
    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if ((key === "raw" || key === "render" || key === "markdown" || key === "json" || key === "draft" || key === "disclosure" || key === "prompt") && child) {
          if (!existsSync(resolve(REPO, child))) errors.push(`missing artifact ${child}`);
        } else if (child && typeof child === "object") visit(child);
      }
    };
    visit(artifacts);
  }
  if (existsSync(p.tally)) {
    const score = scoreRun(json(p.tally));
    if (!score.clears) errors.push(`locked bar not cleared (${score.passed}/${score.of}; ${score.gateFailures.join(", ")})`);
  }
  process.stdout.write(`\n  acceptance provenance check: ${errors.length ? "FAILED" : "pass"}\n`);
  for (const error of errors) process.stdout.write(`    ${error}\n`);
  process.stdout.write("\n");
  process.exitCode = errors.length ? 1 : 0;
}

async function main() {
  const [command, runArg] = process.argv.slice(2);
  const runDir = runPath(runArg);
  try {
    if (command === "prepare") prepare(runDir);
    else if (command === "profiles") await dispatchProfiles(runDir);
    else if (command === "drafts") await dispatchDrafts(runDir);
    else if (command === "critics") await dispatchCritics(runDir);
    else if (command === "collect") collect(runDir);
    else if (command === "check") check(runDir);
    else die(`unknown command ${JSON.stringify(command)}`, 2);
  } catch (error) {
    die(error.stack || error.message || String(error));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

export {
  criticPrompt, deriveCritic, draftPrompt, structuralGates, validateCases,
};

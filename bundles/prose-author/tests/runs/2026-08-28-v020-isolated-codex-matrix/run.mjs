#!/usr/bin/env node
/** Fixed, resumable development matrix for the isolated Codex draft backend. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  claimAuditPrompt, CODEX_NO_TOOLS_CONFIG, criticPrompt, deriveCritic, dispatchClaude,
  dispatchCodex, draftPrompt,
} from "../../acceptance-runner.mjs";
import { bodyOf } from "../../corpus-rates.mjs";
import {
  assembleVoiceCritic, CRITIC_SOURCE_SCHEMA,
} from "../../voice-critic-source.mjs";
import {
  corpusLeakage, findFabricatedCitations, parseDraft, validateDraft,
} from "../../voice-draft.mjs";
import { corpusLock } from "../../voice-profile.mjs";
import {
  assembleVoiceDraft, SOURCE_SCHEMA, validateVoiceDraftSource,
} from "../../../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA,
} from "../../../skills/prose-draft/tools/draft-claim-audit.mjs";

const RUN = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(RUN, "../../../../..");
const DESIGN_PATH = join(RUN, "DESIGN.json");
const MANIFEST_PATH = join(RUN, "MANIFEST.json");
const DESIGN = JSON.parse(readFileSync(DESIGN_PATH, "utf8"));
const SHA = (value) => createHash("sha256").update(value).digest("hex");
const text = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(text(path));
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const rel = (path) => relative(REPO, path);
const stripFrontmatter = (value) => value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

const AGENTS = {
  draft: "primitives/agents/voice-draft/agent.md",
  audit: "bundles/prose-author/skills/prose-draft/references/claim-audit.md",
  critic: "primitives/agents/prose-voice-critic/agent.md",
};

function fixtureFor(profile) {
  const sourceCases = json(join(REPO, DESIGN.source_profile_run, "CASES.json"));
  const row = sourceCases.profiles.find((item) => item.id === profile);
  if (!row) throw new Error(`unknown source profile ${profile}`);
  return resolve(REPO, "bundles/prose-author/tests/fixtures/profiles", row.fixture);
}

function record(path) {
  if (!existsSync(path)) return null;
  const value = json(path);
  if (value.type !== "result" || value.is_error || !value.structured_output) {
    throw new Error(`${rel(path)} is an immutable failed response; do not redraw it`);
  }
  return value;
}

function prepare() {
  if (existsSync(MANIFEST_PATH)) throw new Error("matrix is already prepared");
  const locked = [
    rel(DESIGN_PATH), rel(join(RUN, "run.mjs")), "bundles/prose-author/tests/acceptance-runner.mjs",
    ...Object.values(AGENTS), "bundles/prose-author/tests/voice-draft.mjs",
    "bundles/prose-author/tests/voice-critic-source.mjs",
    "bundles/prose-author/skills/prose-draft/tools/draft-contract.mjs",
    "bundles/prose-author/skills/prose-draft/tools/draft-claim-audit.mjs",
  ];
  execFileSync("git", ["ls-files", "--error-unmatch", ...locked], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...locked], { cwd: REPO, stdio: "ignore" });
  const preparedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();
  const agents = {};
  for (const [kind, source] of Object.entries(AGENTS)) {
    const body = stripFrontmatter(text(join(REPO, source)));
    const snapshot = join(RUN, "prompts", "agents", `${kind}.md`);
    write(snapshot, body);
    agents[kind] = { source, snapshot: rel(snapshot), sha256: SHA(body) };
  }
  const schemas = {
    draft: join(RUN, "schemas", "draft.json"),
    audit: join(RUN, "schemas", "audit.json"),
    critic: join(RUN, "schemas", "critic.json"),
  };
  write(schemas.draft, SOURCE_SCHEMA);
  write(schemas.audit, AUDIT_SCHEMA);
  write(schemas.critic, CRITIC_SOURCE_SCHEMA);
  const profiles = {};
  const locks = {};
  for (const profile of [...new Set([...DESIGN.cases, ...DESIGN.refusals].map((c) => c.profile))]) {
    profiles[profile] = {};
    for (const render of [1, 2, 3]) {
      const sourceBase = resolve(REPO, DESIGN.source_profile_run, "inputs", "profiles", profile, `r${render}`);
      const targetBase = join(RUN, "inputs", "profiles", profile, `r${render}`);
      mkdirSync(dirname(targetBase), { recursive: true });
      cpSync(`${sourceBase}.md`, `${targetBase}.md`);
      cpSync(`${sourceBase}.json`, `${targetBase}.json`);
      profiles[profile][`r${render}`] = {
        markdown: rel(`${targetBase}.md`), markdown_sha256: SHA(text(`${targetBase}.md`)),
        json: rel(`${targetBase}.json`), json_sha256: SHA(text(`${targetBase}.json`)),
      };
    }
    locks[`${profile}-drafter`] = corpusLock(fixtureFor(profile), { agentPath: join(REPO, AGENTS.draft) });
  }
  write(join(RUN, "corpus.lock.json"), locks);
  write(MANIFEST_PATH, {
    schema: "prose-author-isolated-codex-matrix-manifest/1",
    prepared_commit: preparedCommit,
    design_sha256: SHA(text(DESIGN_PATH)),
    locked_files: Object.fromEntries(locked.map((path) => [path, SHA(text(join(REPO, path)))])),
    no_tools_config: CODEX_NO_TOOLS_CONFIG,
    agents,
    schemas: Object.fromEntries(Object.entries(schemas).map(([key, path]) =>
      [key, { path: rel(path), sha256: SHA(text(path)) }])),
    profiles,
    corpus_locks: locks,
    prompts: Object.fromEntries([...DESIGN.cases, ...DESIGN.refusals].map((c) =>
      [c.id, { sha256: SHA(c.prompt), profile: c.profile, render: c.render }])),
  });
  process.stdout.write("prepared fixed isolated-Codex matrix\n");
}

function load() {
  if (!existsSync(MANIFEST_PATH)) throw new Error("run prepare first");
  const manifest = json(MANIFEST_PATH);
  if (SHA(text(DESIGN_PATH)) !== manifest.design_sha256) throw new Error("DESIGN.json drifted after prepare");
  for (const [path, hash] of Object.entries(manifest.locked_files)) {
    if (SHA(text(join(REPO, path))) !== hash) throw new Error(`locked file drifted: ${path}`);
  }
  return manifest;
}

async function drafts() {
  const manifest = load();
  const failures = [];
  for (const c of [...DESIGN.cases, ...DESIGN.refusals.map((row) => ({ ...row, refusal: true }))]) {
    const profile = manifest.profiles[c.profile][`r${c.render}`];
    const prompt = draftPrompt(c, text(resolve(REPO, profile.markdown)), json(resolve(REPO, profile.json)));
    const promptPath = join(RUN, "prompts", c.refusal ? "refusals" : "drafts", `${c.id}.md`);
    write(promptPath, `${prompt}\n`);
    process.stdout.write(`draft ${c.id} ... `);
    const started = Date.now();
    try {
      await dispatchCodex({
        system: resolve(REPO, manifest.agents.draft.snapshot), prompt,
        output: join(RUN, "raw", c.refusal ? "refusals" : "drafts", `${c.id}.json`),
        schemaPath: resolve(REPO, manifest.schemas.draft.path), effort: DESIGN.draft_effort,
        model: DESIGN.draft_model, noToolsConfig: manifest.no_tools_config,
      });
      process.stdout.write(`${Math.round((Date.now() - started) / 1000)}s\n`);
    } catch (error) {
      failures.push(`${c.id}: ${error.message}`);
      process.stdout.write("FAILED\n");
    }
  }
  if (failures.length) throw new Error(`draft failures after completing set:\n${failures.join("\n")}`);
}

async function audits() {
  const manifest = load();
  const failures = [];
  for (const c of DESIGN.cases) {
    const sourceRecord = record(join(RUN, "raw", "drafts", `${c.id}.json`));
    if (!sourceRecord) { failures.push(`${c.id}: missing draft`); continue; }
    const source = sourceRecord.structured_output;
    const validation = validateVoiceDraftSource(source, { request: c.prompt });
    if (!validation.ok || validation.refusal) {
      failures.push(`${c.id}: invalid source: ${validation.errors.join("; ")}`);
      continue;
    }
    const prompt = claimAuditPrompt(c, source);
    write(join(RUN, "prompts", "audits", `${c.id}.md`), `${prompt}\n`);
    process.stdout.write(`audit ${c.id} ... `);
    const started = Date.now();
    try {
      await dispatchClaude({
        system: resolve(REPO, manifest.agents.audit.snapshot), prompt, cwd: RUN,
        tools: "", allowed: [], output: join(RUN, "raw", "audits", `${c.id}.json`),
        schema: AUDIT_SCHEMA, effort: DESIGN.audit_effort,
      });
      process.stdout.write(`${Math.round((Date.now() - started) / 1000)}s\n`);
    } catch (error) {
      failures.push(`${c.id}: ${error.message}`);
      process.stdout.write("FAILED\n");
    }
  }
  if (failures.length) throw new Error(`audit failures after completing set:\n${failures.join("\n")}`);
}

function collectDrafts() {
  const manifest = load();
  const artifacts = { schema: "prose-author-isolated-codex-matrix-artifacts/1", drafts: {}, refusals: {}, critics: {} };
  const failures = [];
  for (const c of DESIGN.cases) {
    const sourceRecord = record(join(RUN, "raw", "drafts", `${c.id}.json`));
    const auditRecord = record(join(RUN, "raw", "audits", `${c.id}.json`));
    if (!sourceRecord || !auditRecord) { failures.push(`${c.id}: missing draft or audit`); continue; }
    const source = sourceRecord.structured_output;
    const applied = applyVoiceDraftClaimAudit(source, auditRecord.structured_output, { request: c.prompt });
    const originalPath = join(RUN, "inputs", "sources", `${c.id}.original.json`);
    const auditPath = join(RUN, "inputs", "audits", `${c.id}.json`);
    write(originalPath, source);
    write(auditPath, auditRecord.structured_output);
    if (!applied.ok) {
      failures.push(`${c.id}: ${applied.errors.join("; ")}`);
      artifacts.drafts[c.id] = { audit_pass: false, errors: applied.errors };
      continue;
    }
    const assembled = assembleVoiceDraft(applied.source, { request: c.prompt });
    if (!assembled.ok) { failures.push(`${c.id}: ${assembled.errors.join("; ")}`); continue; }
    const parsed = parseDraft(assembled.output);
    const validation = validateDraft(parsed);
    const profile = manifest.profiles[c.profile][`r${c.render}`];
    const leakage = corpusLeakage({
      draft: parsed.draft, corpusDir: join(fixtureFor(c.profile), "corpus", "human"),
      profileText: text(resolve(REPO, profile.markdown)),
    });
    const citations = findFabricatedCitations(parsed.draft);
    const externalClaims = source.ledger.filter((claim) => claim.basis === "external-verification");
    const structural = {
      audit: true, valid: validation.ok && !validation.refusal,
      no_fabricated_citations: citations.length === 0,
      no_corpus_leakage: leakage.length === 0,
      request_only: externalClaims.length === 0,
    };
    const outputPath = join(RUN, "outputs", "drafts", `${c.id}.md`);
    const sourcePath = join(RUN, "inputs", "sources", `${c.id}.json`);
    write(outputPath, assembled.output);
    write(sourcePath, applied.source);
    artifacts.drafts[c.id] = {
      profile: c.profile, render: c.render, shape: c.shape,
      raw: rel(join(RUN, "raw", "drafts", `${c.id}.json`)),
      raw_events: sourceRecord.raw_events, raw_output: sourceRecord.raw_output,
      source: rel(sourcePath), audit: rel(auditPath), output: rel(outputPath),
      sentences: source.paragraphs.reduce((count, p) => count + p.sentences.length, 0),
      claims: source.ledger.length, external_claims: externalClaims,
      structural, structural_pass: Object.values(structural).every(Boolean),
    };
    if (!artifacts.drafts[c.id].structural_pass) failures.push(`${c.id}: structural ${JSON.stringify(structural)}`);
  }
  for (const c of DESIGN.refusals) {
    const sourceRecord = record(join(RUN, "raw", "refusals", `${c.id}.json`));
    if (!sourceRecord) { failures.push(`${c.id}: missing refusal`); continue; }
    const assembled = assembleVoiceDraft(sourceRecord.structured_output, { request: c.prompt });
    const parsed = assembled.ok ? parseDraft(assembled.output) : null;
    const validation = parsed ? validateDraft(parsed) : { ok: false, refusal: false, errors: assembled.errors };
    const pass = validation.ok && validation.refusal;
    const outputPath = join(RUN, "outputs", "refusals", `${c.id}.md`);
    if (assembled.ok) write(outputPath, assembled.output);
    artifacts.refusals[c.id] = { pass, reason: parsed?.json?.refused ?? "", output: assembled.ok ? rel(outputPath) : null };
    if (!pass) failures.push(`${c.id}: did not refuse`);
  }
  write(join(RUN, "ARTIFACTS.json"), artifacts);
  return { artifacts, failures };
}

async function critics() {
  const manifest = load();
  const collected = collectDrafts();
  if (collected.failures.length) {
    throw new Error(`structural failures; no critic calls made:\n${collected.failures.join("\n")}`);
  }
  const failures = [];
  for (const c of DESIGN.cases) {
    const lock = manifest.corpus_locks[`${c.profile}-drafter`];
    const corpusRoot = join(fixtureFor(c.profile), "corpus", "human");
    const corpus = lock.files.map((file) => ({
      file: file.file,
      body: bodyOf(text(join(corpusRoot, ...(file.group ? [file.group] : []), file.file))).trim(),
    }));
    const draft = parseDraft(text(join(RUN, "outputs", "drafts", `${c.id}.md`))).draft;
    const prompt = criticPrompt(c.id, corpus, draft);
    for (let draw = 1; draw <= DESIGN.critic_draws; draw += 1) {
      const id = `${c.id}-d${draw}`;
      write(join(RUN, "prompts", "critics", `${id}.md`), `${prompt}\n`);
      process.stdout.write(`critic ${id} ... `);
      const started = Date.now();
      try {
        await dispatchClaude({
          system: resolve(REPO, manifest.agents.critic.snapshot), prompt, cwd: RUN,
          tools: "", allowed: [], output: join(RUN, "raw", "critics", `${id}.json`),
          schema: CRITIC_SOURCE_SCHEMA, effort: DESIGN.critic_effort,
        });
        process.stdout.write(`${Math.round((Date.now() - started) / 1000)}s\n`);
      } catch (error) {
        failures.push(`${id}: ${error.message}`);
        process.stdout.write("FAILED\n");
      }
    }
  }
  if (failures.length) throw new Error(`critic failures after completing set:\n${failures.join("\n")}`);
}

function score() {
  const { artifacts, failures } = collectDrafts();
  const rows = [];
  for (const c of DESIGN.cases) {
    const draws = [];
    for (let draw = 1; draw <= DESIGN.critic_draws; draw += 1) {
      const id = `${c.id}-d${draw}`;
      const criticRecord = record(join(RUN, "raw", "critics", `${id}.json`));
      if (!criticRecord) { draws.push({ id, valid: false, verdict: null, findings: null }); continue; }
      const assembled = assembleVoiceCritic(criticRecord.structured_output, { rhythmScanSupplied: false });
      if (!assembled.ok) {
        draws.push({ id, valid: false, verdict: criticRecord.structured_output.verdict, findings: null, errors: assembled.errors });
        continue;
      }
      const outputPath = join(RUN, "outputs", "critics", `${id}.md`);
      write(outputPath, assembled.output);
      const derived = deriveCritic(assembled.output);
      draws.push({ id, valid: true, verdict: derived.verdict, findings: derived.findings, output: rel(outputPath) });
    }
    const valid = draws.every((draw) => draw.valid);
    const clean = draws.filter((draw) => draw.verdict === "CLEAN").length;
    const findingMean = valid ? draws.reduce((sum, draw) => sum + draw.findings, 0) / draws.length : null;
    const pass = artifacts.drafts[c.id]?.structural_pass && valid && clean >= 2 && findingMean <= 1;
    artifacts.critics[c.id] = draws;
    rows.push({ id: c.id, shape: c.shape, profile: c.profile, clean, finding_mean: findingMean, valid, pass });
  }
  const refusalPass = Object.values(artifacts.refusals).every((row) => row.pass);
  const clears = failures.length === 0 && refusalPass && rows.every((row) => row.pass);
  write(join(RUN, "ARTIFACTS.json"), artifacts);
  write(join(RUN, "SCORE.json"), { schema: "prose-author-isolated-codex-matrix-score/1", rows, refusal_pass: refusalPass, clears });
  const table = rows.map((row) =>
    `| ${row.id} | ${row.profile} | ${row.shape} | ${row.valid ? "yes" : "no"} | ${row.clean}/3 | ${row.finding_mean ?? "—"} | ${row.pass ? "PASS" : "FAIL"} |`).join("\n");
  write(join(RUN, "RESULT.md"), [
    "# Isolated Codex bounded matrix", "",
    "This is development evidence, not a cell set for the v0.2 acceptance bar.", "",
    `Prepared implementation: \`${json(MANIFEST_PATH).prepared_commit}\``, "",
    "| case | profile | shape | strict critics | CLEAN | findings/draw | result |",
    "|---|---|---|---:|---:|---:|---:|", table, "",
    `Refusals: ${refusalPass ? "2/2 pass" : "FAIL"}.`,
    `Matrix: ${clears ? "CLEAR" : "HOLD"}.`, "",
    "The Codex event audit rejected any non-message/reasoning item. Each assembled draft",
    "also required a complete independent Claude claim audit, zero external-memory claims,",
    "zero fabricated citations, and zero corpus leakage before critics were dispatched.", "",
  ].join("\n"));
  process.stdout.write(`matrix ${clears ? "CLEAR" : "HOLD"}\n`);
  if (!clears) process.exitCode = 1;
}

async function main() {
  const command = process.argv[2];
  if (command === "prepare") prepare();
  else if (command === "drafts") await drafts();
  else if (command === "audits") await audits();
  else if (command === "critics") await critics();
  else if (command === "score") score();
  else throw new Error("usage: run.mjs prepare|drafts|audits|critics|score");
}

await main();

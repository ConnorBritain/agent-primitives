#!/usr/bin/env node
/** Reusable locked two-harness canary for the conservative request-support boundary. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CODEX_NO_TOOLS_CONFIG, dispatchClaude, dispatchCodex, draftPrompt,
} from "./acceptance-runner.mjs";
import { corpusLeakage, findFabricatedCitations, parseDraft, validateDraft } from "./voice-draft.mjs";
import { corpusLock } from "./voice-profile.mjs";
import {
  assembleVoiceDraft, SOURCE_SCHEMA, validateVoiceDraftSource,
} from "../skills/prose-draft/tools/draft-contract.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
const COMMAND = process.argv[2];
const RUN = resolve(process.argv[3] ?? "");
if (!process.argv[3]) throw new Error("usage: request-support-canary.mjs <prepare|dispatch|collect> <run-dir>");
const DESIGN_PATH = join(RUN, "DESIGN.json");
const MANIFEST_PATH = join(RUN, "MANIFEST.json");
const DESIGN = JSON.parse(readFileSync(DESIGN_PATH, "utf8"));
const AGENT = "primitives/agents/voice-draft/agent.md";
const CONTRACT = "bundles/prose-author/skills/prose-draft/tools/draft-contract.mjs";
const RUNNER = "bundles/prose-author/tests/request-support-canary.mjs";
const SHA = (value) => createHash("sha256").update(value).digest("hex");
const text = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(text(path));
const rel = (path) => relative(REPO, path);
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const stripFrontmatter = (value) => value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const caseFor = (id) => ({
  id, profile: DESIGN.profile, render: DESIGN.render, shape: "essay-topic", prompt: DESIGN.prompt,
});

function prepare() {
  if (existsSync(MANIFEST_PATH)) throw new Error("canary is already prepared");
  const locked = [rel(DESIGN_PATH), RUNNER, AGENT, CONTRACT,
    "bundles/prose-author/tests/acceptance-runner.mjs", "bundles/prose-author/tests/voice-draft.mjs"];
  execFileSync("git", ["ls-files", "--error-unmatch", ...locked], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...locked], { cwd: REPO, stdio: "ignore" });
  const preparedCommit = git("rev-parse", "HEAD");
  const agentBody = stripFrontmatter(text(join(REPO, AGENT)));
  const agentSnapshot = join(RUN, "prompts", "agents", "draft.md");
  const schemaPath = join(RUN, "schemas", "draft.json");
  write(agentSnapshot, agentBody);
  write(schemaPath, SOURCE_SCHEMA);
  const sourceBase = resolve(REPO, DESIGN.source_profile_run, "inputs", "profiles", DESIGN.profile, `r${DESIGN.render}`);
  const profileMarkdown = join(RUN, "inputs", "profiles", DESIGN.profile, `r${DESIGN.render}.md`);
  const profileJson = join(RUN, "inputs", "profiles", DESIGN.profile, `r${DESIGN.render}.json`);
  mkdirSync(dirname(profileMarkdown), { recursive: true });
  cpSync(`${sourceBase}.md`, profileMarkdown);
  cpSync(`${sourceBase}.json`, profileJson);
  const prompts = {};
  for (const id of Object.keys(DESIGN.dispatches)) {
    const prompt = draftPrompt(caseFor(id), text(profileMarkdown), json(profileJson));
    const path = join(RUN, "prompts", "drafts", `${id}.md`);
    write(path, `${prompt}\n`);
    prompts[id] = { path: rel(path), sha256: SHA(text(path)) };
  }
  const lock = corpusLock(resolve(REPO, DESIGN.fixture), { agentPath: join(REPO, AGENT) });
  write(join(RUN, "corpus.lock.json"), { [`${DESIGN.profile}-drafter`]: lock });
  write(MANIFEST_PATH, {
    schema: "prose-author-request-support-canary-manifest/1",
    prepared_commit: preparedCommit, design_sha256: SHA(text(DESIGN_PATH)), concurrency: 1,
    locked_files: Object.fromEntries(locked.map((path) => [path, SHA(text(join(REPO, path)))])),
    agent: { source: AGENT, snapshot: rel(agentSnapshot), sha256: SHA(agentBody) },
    schema_path: rel(schemaPath), schema_sha256: SHA(text(schemaPath)),
    profile: {
      markdown: rel(profileMarkdown), markdown_sha256: SHA(text(profileMarkdown)),
      json: rel(profileJson), json_sha256: SHA(text(profileJson)),
    },
    prompts, dispatches: DESIGN.dispatches, codex_no_tools_config: CODEX_NO_TOOLS_CONFIG,
  });
  process.stdout.write("prepared request-support canary; commit generated inputs before dispatch\n");
}

function load() {
  if (!existsSync(MANIFEST_PATH)) throw new Error("run prepare first");
  const manifest = json(MANIFEST_PATH);
  if (SHA(text(DESIGN_PATH)) !== manifest.design_sha256) throw new Error("DESIGN.json drifted");
  for (const [path, hash] of Object.entries(manifest.locked_files)) {
    if (SHA(text(join(REPO, path))) !== hash) throw new Error(`locked file drifted: ${path}`);
  }
  const generated = [rel(MANIFEST_PATH), manifest.agent.snapshot, manifest.schema_path,
    manifest.profile.markdown, manifest.profile.json, ...Object.values(manifest.prompts).map((row) => row.path),
    rel(join(RUN, "corpus.lock.json"))];
  execFileSync("git", ["ls-files", "--error-unmatch", ...generated], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...generated], { cwd: REPO, stdio: "ignore" });
  return manifest;
}

const dispatchFor = (manifest, id) => ({
  stage: "draft", ...manifest.dispatches[id], concurrency: manifest.concurrency,
  manifest_sha256: SHA(JSON.stringify(manifest)),
});

async function dispatch() {
  const manifest = load();
  const failures = [];
  for (const id of ["codex", "claude"]) {
    const config = dispatchFor(manifest, id);
    const output = join(RUN, "raw", "drafts", `${id}.json`);
    const prompt = text(resolve(REPO, manifest.prompts[id].path));
    process.stdout.write(`${id} draft ... `);
    const started = Date.now();
    try {
      if (config.harness === "codex") {
        await dispatchCodex({
          system: resolve(REPO, manifest.agent.snapshot), prompt, output,
          schemaPath: resolve(REPO, manifest.schema_path),
          noToolsConfig: manifest.codex_no_tools_config, dispatch: config,
        });
      } else {
        await dispatchClaude({
          system: resolve(REPO, manifest.agent.snapshot), prompt, cwd: RUN,
          tools: "", allowed: [], output, schema: SOURCE_SCHEMA, dispatch: config,
        });
      }
      process.stdout.write(`${Math.round((Date.now() - started) / 1000)}s\n`);
    } catch (error) {
      write(join(RUN, "raw", "drafts", `${id}.failure.json`), {
        schema: "prose-author-request-support-canary-failure/1",
        id, attempted_at: new Date().toISOString(), error: error.message,
        dispatch: config,
        agent_sha256: manifest.agent.sha256,
        prompt_sha256: manifest.prompts[id].sha256,
        schema_sha256: manifest.schema_sha256,
      });
      failures.push(`${id}: ${error.message}`);
      process.stdout.write("FAILED\n");
    }
  }
  if (failures.length) throw new Error(`canary dispatch failures after completing both calls:\n${failures.join("\n")}`);
}

function collect() {
  const manifest = load();
  const artifacts = { schema: "prose-author-request-support-canary-artifacts/1", drafts: {} };
  const failures = [];
  const corpusDir = resolve(REPO, DESIGN.fixture, "corpus", "human");
  const profileText = text(resolve(REPO, manifest.profile.markdown));
  for (const id of ["codex", "claude"]) {
    const rawPath = join(RUN, "raw", "drafts", `${id}.json`);
    if (!existsSync(rawPath)) {
      const failurePath = join(RUN, "raw", "drafts", `${id}.failure.json`);
      const failure = existsSync(failurePath) ? json(failurePath) : null;
      artifacts.drafts[id] = {
        harness: manifest.dispatches[id].harness, raw: null, source: null, output: null,
        failure: failure ? rel(failurePath) : null,
        error: failure?.error ?? "missing raw result and failure record", pass: false,
      };
      failures.push(`${id}: ${artifacts.drafts[id].error}`);
      continue;
    }
    const record = json(rawPath);
    const source = record.structured_output;
    const sourceValidation = validateVoiceDraftSource(source, { request: DESIGN.prompt });
    const assembled = sourceValidation.ok
      ? assembleVoiceDraft(source, { request: DESIGN.prompt }) : { ok: false, errors: sourceValidation.errors };
    const parsed = assembled.ok ? parseDraft(assembled.output) : null;
    const publicValidation = parsed ? validateDraft(parsed) : { ok: false, refusal: false, errors: assembled.errors };
    const leakage = parsed
      ? corpusLeakage({ draft: parsed.draft, corpusDir, profileText }) : { leaked: [], count: 0 };
    const citations = parsed ? findFabricatedCitations(parsed.draft) : [];
    const externalClaims = Array.isArray(source?.ledger)
      ? source.ledger.filter((entry) => entry.basis === "external-verification") : [];
    const structural = {
      source_valid: sourceValidation.ok && !sourceValidation.refusal,
      public_draft_valid: publicValidation.ok && !publicValidation.refusal,
      no_external_verification: externalClaims.length === 0,
      no_fabricated_citations: citations.length === 0,
      no_corpus_leakage: leakage.count === 0,
    };
    const sourcePath = join(RUN, "inputs", "sources", `${id}.json`);
    const outputPath = join(RUN, "outputs", "drafts", `${id}.md`);
    write(sourcePath, source);
    if (assembled.ok) write(outputPath, assembled.output);
    const pass = Object.values(structural).every(Boolean);
    artifacts.drafts[id] = {
      harness: manifest.dispatches[id].harness, raw: rel(rawPath), source: rel(sourcePath),
      output: assembled.ok ? rel(outputPath) : null, source_errors: sourceValidation.errors,
      external_claims: externalClaims, fabricated_citations: citations, corpus_leakage: leakage,
      structural, pass,
    };
    if (!pass) failures.push(`${id}: ${JSON.stringify({ structural, errors: sourceValidation.errors })}`);
  }
  write(join(RUN, "ARTIFACTS.json"), artifacts);
  write(join(RUN, "RESULT.md"), [
    "# Request-support cross-harness canary", "",
    "This is development evidence, not part of the v0.2 acceptance sample.", "",
    `Prepared implementation: \`${manifest.prepared_commit}\``, "",
    ...Object.entries(artifacts.drafts).map(([id, row]) => `- ${id} (${row.harness}): ${row.pass ? "CLEAR" : "HOLD"}`), "",
    failures.length ? "Canary: HOLD." : "Canary: CLEAR.", "",
    "The canary tests the exact current voice-draft prompt and conservative request-support",
    "validator through both adapters. It does not test profile stability, human factual review,",
    "critics, voice quality, resemblance, or the locked release bar.", "",
  ].join("\n"));
  process.stdout.write(`canary ${failures.length ? "HOLD" : "CLEAR"}\n`);
  if (failures.length) process.exitCode = 1;
}

if (COMMAND === "prepare") prepare();
else if (COMMAND === "dispatch") await dispatch();
else if (COMMAND === "collect") collect();
else throw new Error("usage: request-support-canary.mjs <prepare|dispatch|collect> <run-dir>");

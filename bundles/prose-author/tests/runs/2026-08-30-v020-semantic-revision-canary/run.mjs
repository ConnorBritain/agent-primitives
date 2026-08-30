#!/usr/bin/env node
/** One-cell live canary for mandatory semantic conformance. Never acceptance evidence. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStrictOutputSchema, CODEX_NO_TOOLS_CONFIG, committedManifestError, completedResult,
  dispatchCodex, draftSemanticRevisionPrompt, invocationInput, localModuleClosure,
  lockedImplementationErrors, manifestDispatch, schemaInvocation, validateSemanticRevision,
} from "../../acceptance-runner.mjs";
import {
  assembleVoiceDraft, SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA,
} from "../../../skills/prose-draft/tools/draft-contract.mjs";
import { draftTargetCard } from "../../../skills/prose-draft/tools/draft-targets.mjs";
import { parseDraft, validateDraft } from "../../voice-draft.mjs";

const RUN = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(RUN, "..", "..", "..", "..", "..");
const DESIGN_PATH = join(RUN, "DESIGN.json");
const MANIFEST_PATH = join(RUN, "MANIFEST.json");
const RESULT_PATH = join(RUN, "RESULT.json");
const AGENT_SOURCE = "primitives/agents/voice-draft/agent.md";
const SCRIPT = relative(REPO, fileURLToPath(import.meta.url));
const SHA = (value) => createHash("sha256").update(value).digest("hex");
const text = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(text(path));
const rel = (path) => relative(REPO, resolve(path));
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();
const stripFrontmatter = (value) => value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

function sourceInputs(design) {
  return [design.cases, design.candidate_record, design.profile_markdown, design.profile_json];
}

function lockedFiles(design) {
  return [...new Set([
    ...localModuleClosure([SCRIPT]), rel(DESIGN_PATH), AGENT_SOURCE, ...sourceInputs(design),
  ])].sort();
}

function sourceContext(design) {
  const cases = json(resolve(REPO, design.cases));
  const c = cases.cases.find((row) => row.id === design.case_id);
  if (!c) throw new Error(`missing locked case ${design.case_id}`);
  const wrapper = json(resolve(REPO, design.candidate_record));
  const candidate = wrapper.structured_output;
  if (!candidate || typeof candidate !== "object") throw new Error("candidate wrapper has no structured source");
  const profileMarkdown = text(resolve(REPO, design.profile_markdown));
  const profile = json(resolve(REPO, design.profile_json));
  return { c, candidate, profileMarkdown, profile };
}

function prerequisites(manifest) {
  return {
    candidate_draft_raw_sha256: manifest.inputs.candidate_record_sha256,
    profile_markdown_sha256: manifest.inputs.profile_markdown_sha256,
    profile_json_sha256: manifest.inputs.profile_json_sha256,
  };
}

function prepare() {
  if (existsSync(MANIFEST_PATH)) throw new Error("MANIFEST.json already exists; this canary is immutable");
  const design = json(DESIGN_PATH);
  if (design.acceptance_evidence !== false || design.redraws !== 0 || design.harness !== "codex") {
    throw new Error("design must remain a zero-redraw, non-acceptance Codex canary");
  }
  const locked = lockedFiles(design);
  execFileSync("git", ["ls-files", "--error-unmatch", ...locked], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...locked], { cwd: REPO, stdio: "ignore" });
  const preparedCommit = git("rev-parse", "HEAD");
  const context = sourceContext(design);
  const agentBody = stripFrontmatter(text(join(REPO, AGENT_SOURCE)));
  const agentSnapshot = join(RUN, "prompts", "agents", "draft.md");
  const schemaPath = join(RUN, "schemas", "draft.json");
  const promptPath = join(RUN, "prompts", "semantic-revision.md");
  const candidatePath = join(RUN, "inputs", "candidate.json");
  const profileMarkdownPath = join(RUN, "inputs", "profile.md");
  const profileJsonPath = join(RUN, "inputs", "profile.json");
  write(agentSnapshot, agentBody);
  write(schemaPath, assertStrictOutputSchema(DRAFT_SOURCE_SCHEMA, "semantic revision schema"));
  write(candidatePath, context.candidate);
  write(profileMarkdownPath, context.profileMarkdown);
  write(profileJsonPath, context.profile);
  write(promptPath, `${draftSemanticRevisionPrompt(
    context.c, context.profileMarkdown, context.profile, context.candidate,
  )}\n`);
  const manifest = {
    schema: "prose-author-stage-adapter-canary-manifest/1",
    acceptance_evidence: false,
    redraws: 0,
    prepared_commit: preparedCommit,
    concurrency: 1,
    dispatch: {
      draft: {
        harness: design.harness, model: design.model, effort: design.effort,
        transport: "native-structured", timeout_ms: 720000,
      },
    },
    codex_no_tools_config: CODEX_NO_TOOLS_CONFIG,
    agents: {
      draft: { source: AGENT_SOURCE, snapshot: rel(agentSnapshot), sha256: SHA(agentBody) },
    },
    schema_path: rel(schemaPath),
    schema_sha256: SHA(text(schemaPath)),
    prompt_path: rel(promptPath),
    prompt_sha256: SHA(text(promptPath)),
    inputs: {
      candidate: rel(candidatePath), candidate_sha256: SHA(text(candidatePath)),
      candidate_record_sha256: SHA(text(resolve(REPO, design.candidate_record))),
      profile_markdown: rel(profileMarkdownPath), profile_markdown_sha256: SHA(context.profileMarkdown),
      profile_json: rel(profileJsonPath), profile_json_sha256: SHA(text(profileJsonPath)),
      case_request_sha256: SHA(context.c.prompt),
    },
    locked_files: Object.fromEntries(locked.map((file) => [file, SHA(text(join(REPO, file)))])),
  };
  write(MANIFEST_PATH, manifest);
  process.stdout.write("prepared semantic revision canary; commit MANIFEST.json before dispatch\n");
}

function loadPrepared() {
  const manifest = json(MANIFEST_PATH);
  if (manifest.schema !== "prose-author-stage-adapter-canary-manifest/1") throw new Error("wrong manifest schema");
  const anchor = committedManifestError(MANIFEST_PATH, manifest.prepared_commit);
  if (anchor) throw new Error(`manifest is not immutable: ${anchor}`);
  const locked = lockedImplementationErrors(manifest);
  if (locked.length) throw new Error(locked.join("; "));
  if (SHA(text(resolve(REPO, manifest.prompt_path))) !== manifest.prompt_sha256) throw new Error("prompt drifted");
  if (SHA(text(resolve(REPO, manifest.schema_path))) !== manifest.schema_sha256) throw new Error("schema drifted");
  return manifest;
}

function expectedInput(manifest) {
  const dispatch = manifestDispatch(manifest, "draft");
  const pinned = { schema: json(resolve(REPO, manifest.schema_path)), path: resolve(REPO, manifest.schema_path) };
  return invocationInput(
    resolve(REPO, manifest.agents.draft.snapshot), text(resolve(REPO, manifest.prompt_path)), {
      ...schemaInvocation(dispatch, pinned), prerequisites: prerequisites(manifest),
    },
  );
}

function derived(manifest) {
  const design = json(DESIGN_PATH);
  const context = sourceContext(design);
  const dispatch = manifestDispatch(manifest, "draft");
  const rawPath = join(RUN, "raw", "revision.json");
  const record = completedResult(rawPath, dispatch, expectedInput(manifest));
  if (!record) throw new Error("missing semantic revision result");
  const validated = validateSemanticRevision(context.candidate, record.structured_output, {
    request: context.c.prompt, card: draftTargetCard(context.profile, context.c.prompt),
  });
  if (!validated.ok) throw new Error(validated.errors.join("; "));
  const assembled = assembleVoiceDraft(validated.source, { request: context.c.prompt, auditClaims: [] });
  if (!assembled.ok) throw new Error(assembled.errors.join("; "));
  const publicValidation = validateDraft(parseDraft(assembled.output));
  if (!publicValidation.ok || publicValidation.refusal) throw new Error(publicValidation.errors.join("; "));
  return { record, validated, assembled, rawPath };
}

async function run() {
  const manifest = loadPrepared();
  const dispatch = manifestDispatch(manifest, "draft");
  const rawPath = join(RUN, "raw", "revision.json");
  await dispatchCodex({
    system: resolve(REPO, manifest.agents.draft.snapshot),
    prompt: text(resolve(REPO, manifest.prompt_path)), output: rawPath,
    schemaPath: resolve(REPO, manifest.schema_path),
    noToolsConfig: manifest.codex_no_tools_config,
    prerequisites: prerequisites(manifest), dispatch,
  });
  const evidence = derived(manifest);
  const sourcePath = join(RUN, "outputs", "source.json");
  const draftPath = join(RUN, "outputs", "draft.md");
  const reportPath = join(RUN, "outputs", "semantic-report.json");
  write(sourcePath, evidence.validated.source);
  write(draftPath, evidence.assembled.output);
  write(reportPath, evidence.validated.report);
  write(RESULT_PATH, {
    schema: "prose-author-stage-adapter-canary-result/1",
    status: "PASS",
    acceptance_evidence: false,
    redraws: 0,
    prepared_commit: manifest.prepared_commit,
    draft_assembled: true,
    semantic_revision_validated: true,
    raw: rel(rawPath), raw_sha256: SHA(text(rawPath)),
    source: rel(sourcePath), source_sha256: SHA(text(sourcePath)),
    draft: rel(draftPath), draft_sha256: SHA(text(draftPath)),
    report: rel(reportPath), report_sha256: SHA(text(reportPath)),
  });
  process.stdout.write("semantic revision canary PASS\n");
}

function check() {
  const manifest = loadPrepared();
  const evidence = derived(manifest);
  const expected = {
    source: `${JSON.stringify(evidence.validated.source, null, 2)}\n`,
    draft: evidence.assembled.output,
    report: `${JSON.stringify(evidence.validated.report, null, 2)}\n`,
  };
  for (const [name, body] of Object.entries(expected)) {
    const path = join(RUN, "outputs", name === "report" ? "semantic-report.json" : `${name}.${name === "draft" ? "md" : "json"}`);
    if (!existsSync(path) || text(path) !== body) throw new Error(`${name} output does not reproduce`);
  }
  const result = json(RESULT_PATH);
  if (result.status !== "PASS" || result.acceptance_evidence !== false
    || result.redraws !== 0 || result.draft_assembled !== true
    || result.semantic_revision_validated !== true) {
    throw new Error("result does not record the passing non-acceptance boundary");
  }
  process.stdout.write("semantic revision canary check PASS\n");
}

const command = process.argv[2];
if (command === "prepare") prepare();
else if (command === "run") await run();
else if (command === "check") check();
else throw new Error("usage: run.mjs <prepare|run|check>");

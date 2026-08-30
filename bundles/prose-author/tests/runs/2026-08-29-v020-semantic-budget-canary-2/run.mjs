#!/usr/bin/env node
/** Locked d06 semantic-budget canary. Historical profile; never acceptance evidence. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStrictOutputSchema, claimAuditPrompt, CODEX_NO_TOOLS_CONFIG,
  codexCompanionArtifactFields, committedManifestError, completedResult,
  dispatchCodex, draftConformancePrompt, draftPrompt, invocationInput,
  localModuleClosure, lockedImplementationErrors, manifestDispatch,
} from "../../acceptance-runner.mjs";
import {
  assembleVoiceDraft, normalizeVoiceDraftSource, SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA,
} from "../../../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA, AUDIT_SCHEMA_ID,
} from "../../../skills/prose-draft/tools/draft-claim-audit.mjs";
import { draftTargetCard } from "../../../skills/prose-draft/tools/draft-targets.mjs";
import {
  applyDraftConformancePatch, CONFORMANCE_PATCH_SCHEMA, measureDraftConformance,
} from "../../../skills/prose-draft/tools/draft-conformance.mjs";
import { parseDraft } from "../../voice-draft.mjs";
import { validateVoiceProfile } from "../../voice-profile.mjs";

const RUN = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(RUN, "..", "..", "..", "..", "..");
const DESIGN_PATH = join(RUN, "DESIGN.json");
const MANIFEST_PATH = join(RUN, "MANIFEST.json");
const RESULT_PATH = join(RUN, "RESULT.json");
const DESIGN = JSON.parse(readFileSync(DESIGN_PATH, "utf8"));
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

const AGENTS = {
  draft: "primitives/agents/voice-draft/agent.md",
  conformance: "primitives/agents/voice-draft/agent.md",
  claim_audit: "bundles/prose-author/skills/prose-draft/references/claim-audit.md",
};
const SCRIPT = rel(fileURLToPath(import.meta.url));
const STAGES = ["draft", "conformance", "claim_audit"];
const PROFILE_FILES = [DESIGN.profile_json, DESIGN.profile_markdown];
const LOCKED = [...new Set([
  ...localModuleClosure([SCRIPT]), rel(DESIGN_PATH), ...Object.values(AGENTS), ...PROFILE_FILES,
])].sort();

function prepare() {
  if (existsSync(MANIFEST_PATH)) throw new Error("MANIFEST.json already exists; this canary is immutable");
  if (DESIGN.harness !== "codex" || DESIGN.acceptance_evidence !== false || DESIGN.redraws !== 0
    || JSON.stringify(DESIGN.stages) !== JSON.stringify(STAGES)
    || JSON.stringify(DESIGN.required_initial_question_mark_range) !== JSON.stringify([0, 3])) {
    throw new Error("DESIGN.json does not preserve the locked semantic-budget boundary");
  }
  execFileSync("git", ["ls-files", "--error-unmatch", ...LOCKED], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...LOCKED], { cwd: REPO, stdio: "ignore" });
  const preparedCommit = git("rev-parse", "HEAD");
  const profile = json(resolve(REPO, DESIGN.profile_json));
  const markdown = text(resolve(REPO, DESIGN.profile_markdown));
  const profileCheck = validateVoiceProfile(profile, markdown);
  if (!profileCheck.ok || profileCheck.refusal) throw new Error(`locked profile invalid: ${profileCheck.errors.join("; ")}`);

  const agents = {};
  for (const [stage, source] of Object.entries(AGENTS)) {
    const body = stripFrontmatter(text(join(REPO, source)));
    const snapshot = join(RUN, "prompts", "agents", `${stage}.md`);
    write(snapshot, body);
    agents[stage] = { source, snapshot: rel(snapshot), sha256: SHA(body) };
  }
  const schemas = {
    draft: join(RUN, "schemas", "draft.json"),
    conformance: join(RUN, "schemas", "conformance.json"),
    claim_audit: join(RUN, "schemas", "claim-audit.json"),
  };
  write(schemas.draft, assertStrictOutputSchema(DRAFT_SOURCE_SCHEMA, "draft schema"));
  write(schemas.conformance, assertStrictOutputSchema(CONFORMANCE_PATCH_SCHEMA, "conformance schema"));
  write(schemas.claim_audit, assertStrictOutputSchema(AUDIT_SCHEMA, "claim-audit schema"));

  const manifest = {
    schema: "prose-author-stage-adapter-canary-manifest/1",
    canary_schema: "prose-author-semantic-budget-canary-manifest/1",
    run_id: basename(RUN), prepared_commit: preparedCommit, concurrency: 1,
    acceptance_evidence: false, redraws: 0,
    dispatch: Object.fromEntries(STAGES.map((stage) => [stage, {
      harness: DESIGN.harness, model: DESIGN.model,
      effort: stage === "claim_audit" ? "low" : "medium",
      transport: "native-structured", timeout_ms: 720000,
    }])),
    codex_no_tools_config: CODEX_NO_TOOLS_CONFIG,
    locked_files: Object.fromEntries(LOCKED.map((path) => [path, SHA(text(join(REPO, path)))])),
    agents,
    profile: {
      json: DESIGN.profile_json, json_sha256: SHA(text(resolve(REPO, DESIGN.profile_json))),
      markdown: DESIGN.profile_markdown, markdown_sha256: SHA(markdown),
    },
    prompt: DESIGN.prompt,
    required_initial_question_mark_range: DESIGN.required_initial_question_mark_range,
    schemas: Object.fromEntries(Object.entries(schemas).map(([stage, path]) => [stage, {
      path: rel(path), sha256: SHA(text(path)),
    }])),
  };
  write(MANIFEST_PATH, manifest);
  process.stdout.write("prepared semantic-budget canary; commit generated inputs before dispatch\n");
}

function loadPrepared() {
  if (!existsSync(MANIFEST_PATH)) throw new Error("run prepare first");
  const manifest = json(MANIFEST_PATH);
  const anchor = committedManifestError(MANIFEST_PATH, manifest.prepared_commit);
  if (anchor) throw new Error(`MANIFEST.json is not an immutable child of prepared_commit: ${anchor}`);
  const drift = lockedImplementationErrors(manifest);
  if (drift.length) throw new Error(drift.join("; "));
  if (manifest.redraws !== 0 || manifest.acceptance_evidence !== false
    || manifest.canary_schema !== "prose-author-semantic-budget-canary-manifest/1") {
    throw new Error("canary evidence boundary drifted");
  }
  for (const [stage, agent] of Object.entries(manifest.agents)) {
    const source = resolve(REPO, agent.source);
    const snapshot = resolve(REPO, agent.snapshot);
    if (!existsSync(source) || !existsSync(snapshot)
      || SHA(stripFrontmatter(text(source))) !== agent.sha256 || SHA(text(snapshot)) !== agent.sha256) {
      throw new Error(`${stage} agent source or snapshot drifted after prepare`);
    }
  }
  for (const kind of ["json", "markdown"]) {
    const path = resolve(REPO, manifest.profile[kind]);
    if (!existsSync(path) || SHA(text(path)) !== manifest.profile[`${kind}_sha256`]) {
      throw new Error(`locked profile ${kind} drifted`);
    }
  }
  return manifest;
}

function schemaPath(manifest, stage) {
  const entry = manifest.schemas[stage];
  const path = resolve(REPO, entry.path);
  if (!existsSync(path) || SHA(text(path)) !== entry.sha256) throw new Error(`${stage} schema drifted`);
  return path;
}

async function call(manifest, stage, promptPath, outputPath, prerequisites = null) {
  const dispatch = manifestDispatch(manifest, stage);
  const system = resolve(REPO, manifest.agents[stage].snapshot);
  const prompt = text(promptPath);
  const schema = schemaPath(manifest, stage);
  const input = invocationInput(system, prompt, { schemaPath: schema, prerequisites });
  await dispatchCodex({
    system, prompt, output: outputPath, schemaPath: schema,
    noToolsConfig: manifest.codex_no_tools_config, prerequisites, dispatch,
  });
  return completedResult(outputPath, dispatch, input);
}

function stagePrompt(path, value) {
  const body = value.endsWith("\n") ? value : `${value}\n`;
  if (existsSync(path) && text(path) !== body) throw new Error(`${rel(path)} changed after first derivation`);
  if (!existsSync(path)) write(path, body);
  return path;
}

function stageEvidence(path) {
  if (!existsSync(path)) return null;
  const record = json(path);
  return {
    raw: rel(path), raw_sha256: SHA(text(path)), harness: record.harness ?? null,
    is_error: record.is_error === true, ...codexCompanionArtifactFields(record),
  };
}

function existingStageEvidence() {
  return Object.fromEntries(STAGES.flatMap((stage) => {
    const path = join(RUN, "raw", `${stage.replace("_", "-")}.json`);
    const evidence = stageEvidence(path);
    return evidence ? [[stage, evidence]] : [];
  }));
}

async function dispatch() {
  if (existsSync(RESULT_PATH)) throw new Error("RESULT.json already exists; do not redraw this canary");
  const manifest = loadPrepared();
  const profile = json(resolve(REPO, manifest.profile.json));
  const profileMarkdown = text(resolve(REPO, manifest.profile.markdown));
  const draftPromptPath = stagePrompt(join(RUN, "prompts", "draft.md"), draftPrompt(
    { prompt: manifest.prompt }, profileMarkdown, profile,
  ));
  const draftRaw = join(RUN, "raw", "draft.json");
  const draftRecord = await call(manifest, "draft", draftPromptPath, draftRaw, {
    profile_json_sha256: manifest.profile.json_sha256,
    profile_markdown_sha256: manifest.profile.markdown_sha256,
  });
  const normalized = normalizeVoiceDraftSource(draftRecord.structured_output, { request: manifest.prompt });
  if (!normalized.ok || normalized.refusal) {
    throw new Error(`draft source failed: ${normalized.errors.join("; ") || "unexpected refusal"}`);
  }
  write(join(RUN, "outputs", "initial-draft.json"), normalized.source);

  const targetCard = draftTargetCard(profile, manifest.prompt);
  const initialConformance = measureDraftConformance(normalized.source.draft, targetCard);
  const questionRow = initialConformance.measurements.find((row) => row.measurement_id === "question-marks");
  const [minimum, maximum] = manifest.required_initial_question_mark_range;
  if (!questionRow || questionRow.minimum !== minimum || questionRow.maximum !== maximum) {
    throw new Error("question-mark target did not reproduce the locked 0–3 range");
  }
  if (questionRow.actual_count < minimum || questionRow.actual_count > maximum) {
    throw new Error(`initial question-marks count ${questionRow.actual_count} is outside ${minimum}–${maximum}`);
  }

  const conformancePromptPath = stagePrompt(join(RUN, "prompts", "conformance.md"), draftConformancePrompt(
    { prompt: manifest.prompt }, profileMarkdown, profile, normalized.source,
  ));
  const conformanceRaw = join(RUN, "raw", "conformance.json");
  const conformanceRecord = await call(manifest, "conformance", conformancePromptPath, conformanceRaw, {
    initial_draft_raw_sha256: SHA(text(draftRaw)),
  });
  const patched = applyDraftConformancePatch(normalized.source, conformanceRecord.structured_output, {
    request: manifest.prompt, profile, card: targetCard,
  });
  if (!patched.ok) throw new Error(`conformance patch failed: ${patched.errors.join("; ")}`);
  write(join(RUN, "outputs", "conformance-patch.json"), conformanceRecord.structured_output);
  write(join(RUN, "outputs", "conformed-source.json"), patched.source);

  const auditPromptPath = stagePrompt(join(RUN, "prompts", "claim-audit.md"), claimAuditPrompt(
    { id: "semantic-budget-canary", prompt: manifest.prompt }, patched.source,
  ));
  const auditRaw = join(RUN, "raw", "claim-audit.json");
  const auditRecord = await call(manifest, "claim_audit", auditPromptPath, auditRaw, {
    initial_draft_raw_sha256: SHA(text(draftRaw)),
    conformance_raw_sha256: SHA(text(conformanceRaw)),
  });
  const auditApplied = applyVoiceDraftClaimAudit(patched.source, auditRecord.structured_output, {
    request: manifest.prompt,
  });
  if (auditRecord.structured_output?.schema !== AUDIT_SCHEMA_ID || !auditApplied.ok) {
    throw new Error(`claim-audit assembly failed: ${auditApplied.errors.join("; ") || "wrong schema"}`);
  }
  const assembled = assembleVoiceDraft(patched.source, {
    request: manifest.prompt, auditClaims: auditApplied.claims,
  });
  if (!assembled.ok || assembled.refusal) throw new Error(`draft assembly failed: ${assembled.errors.join("; ")}`);
  const publicDraft = parseDraft(assembled.output);
  if (!publicDraft.draft) throw new Error("assembled public draft is empty");
  write(join(RUN, "outputs", "draft.md"), assembled.output);

  const result = {
    schema: "prose-author-stage-adapter-canary-result/1",
    canary_schema: "prose-author-semantic-budget-canary-result/1",
    status: "PASS", acceptance_evidence: false, redraws: 0,
    prepared_commit: manifest.prepared_commit, stages: existingStageEvidence(),
    profile_reused_from_failed_run: true, draft_assembled: true,
    initial_question_marks: questionRow.actual_count,
    required_initial_question_mark_range: [minimum, maximum],
    conformance_initial: initialConformance, conformance_final: patched.report,
    conformance_patch_applied: true, audit_schema_valid: true, audit_semantic_pass: true,
  };
  write(RESULT_PATH, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  if (process.argv[2] === "prepare") return prepare();
  if (process.argv[2] === "dispatch") return dispatch();
  throw new Error("usage: run.mjs <prepare|dispatch>");
}

try { await main(); } catch (error) {
  if (process.argv[2] === "dispatch" && !existsSync(RESULT_PATH)) {
    write(RESULT_PATH, {
      schema: "prose-author-stage-adapter-canary-result/1",
      canary_schema: "prose-author-semantic-budget-canary-result/1",
      status: "HOLD", acceptance_evidence: false, redraws: 0,
      failed_at: new Date().toISOString(), error: error.message, stages: existingStageEvidence(),
    });
  }
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}

#!/usr/bin/env node
/** Locked EFF retained-text-patch diagnostic for every model stage. Never acceptance evidence. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStrictOutputSchema, claimAuditPrompt, CODEX_NO_TOOLS_CONFIG, codexCompanionArtifactFields,
  committedManifestError, completedResult,
  criticPrompt, dispatchCodex, draftConformancePrompt, draftPrompt, invocationInput, lockedImplementationErrors,
  localModuleClosure, manifestDispatch, profileRenderPrompt,
} from "../../acceptance-runner.mjs";
import { bodyOf } from "../../corpus-rates.mjs";
import {
  assembleVoiceCritic, CRITIC_SOURCE_SCHEMA,
} from "../../voice-critic-source.mjs";
import {
  assembleVoiceDraft, normalizeVoiceDraftSource, SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA,
} from "../../../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA, AUDIT_SCHEMA_ID,
} from "../../../skills/prose-draft/tools/draft-claim-audit.mjs";
import { measureProfile } from "../../../skills/prose-draft/tools/profile-measure.mjs";
import { draftTargetCard } from "../../../skills/prose-draft/tools/draft-targets.mjs";
import {
  applyDraftConformancePatch, CONFORMANCE_PATCH_SCHEMA, measureDraftConformance,
} from "../../../skills/prose-draft/tools/draft-conformance.mjs";
import {
  assembleVoiceProfile, sourceRenderSchema,
} from "../../../skills/prose-draft/tools/profile-contract.mjs";
import { parseDraft } from "../../voice-draft.mjs";
import { corpusLock } from "../../voice-profile.mjs";

const RUN = dirname(fileURLToPath(import.meta.url));
const TESTS = resolve(RUN, "..", "..");
const BUNDLE = resolve(TESTS, "..");
const REPO = resolve(BUNDLE, "..", "..");
const DESIGN_PATH = join(RUN, "DESIGN.json");
const MANIFEST_PATH = join(RUN, "MANIFEST.json");
const RESULT_PATH = join(RUN, "RESULT.json");
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
  profile: "primitives/agents/voice-profile-render/agent.md",
  draft: "primitives/agents/voice-draft/agent.md",
  conformance: "primitives/agents/voice-draft/agent.md",
  claim_audit: "bundles/prose-author/skills/prose-draft/references/claim-audit.md",
  critic: "primitives/agents/prose-voice-critic/agent.md",
};
const SCRIPT = rel(fileURLToPath(import.meta.url));
const LOCKED = [...new Set([
  ...localModuleClosure([SCRIPT]), rel(DESIGN_PATH), ...Object.values(AGENTS),
])].sort();
const STAGES = ["profile", "draft", "conformance", "claim_audit", "critic"];

function sourceFixture(design) {
  return join(TESTS, "fixtures", "profiles", design.fixture);
}

function corpusInputs(fixture, lock, measurements) {
  const inputs = [];
  for (const name of ["profile.json", "voice.md"]) {
    const path = join(fixture, name);
    if (existsSync(path)) inputs.push({ file: name, body: text(path) });
  }
  inputs.push({ file: "measurements.json", body: `${JSON.stringify(measurements, null, 2)}\n` });
  for (const sample of lock.files) {
    const parts = ["corpus", "human", ...(sample.group ? [sample.group] : []), sample.file];
    const path = join(fixture, ...parts);
    const raw = text(path);
    const frontmatter = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)?.[0] ?? "";
    inputs.push({ file: join(...parts), body: `${frontmatter}${bodyOf(raw).trim()}\n` });
  }
  return inputs;
}

function prepare() {
  if (existsSync(MANIFEST_PATH)) throw new Error("MANIFEST.json already exists; this canary is immutable");
  execFileSync("git", ["ls-files", "--error-unmatch", ...LOCKED], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...LOCKED], { cwd: REPO, stdio: "ignore" });
  const design = json(DESIGN_PATH);
  if (design.harness !== "codex" || design.acceptance_evidence !== false || design.redraws !== 0
    || JSON.stringify(design.stages) !== JSON.stringify(STAGES)) {
    throw new Error("DESIGN.json does not preserve the five-stage Codex diagnostic boundary");
  }
  const preparedCommit = git("rev-parse", "HEAD");
  const fixture = sourceFixture(design);
  const measurements = measureProfile(fixture);
  const lock = corpusLock(fixture, { agentPath: join(REPO, AGENTS.profile) });
  const agents = {};
  for (const [stage, source] of Object.entries(AGENTS)) {
    const body = stripFrontmatter(text(join(REPO, source)));
    const snapshot = join(RUN, "prompts", "agents", `${stage}.md`);
    write(snapshot, body);
    agents[stage] = { source, snapshot: rel(snapshot), sha256: SHA(body) };
  }
  const schemas = {
    profile: join(RUN, "schemas", "profile.json"),
    draft: join(RUN, "schemas", "draft.json"),
    conformance: join(RUN, "schemas", "conformance.json"),
    claim_audit: join(RUN, "schemas", "claim-audit.json"),
    critic: join(RUN, "schemas", "critic.json"),
  };
  write(schemas.profile, assertStrictOutputSchema(sourceRenderSchema(measurements), "profile schema"));
  write(schemas.draft, assertStrictOutputSchema(DRAFT_SOURCE_SCHEMA, "draft schema"));
  write(schemas.conformance, assertStrictOutputSchema(CONFORMANCE_PATCH_SCHEMA, "conformance schema"));
  write(schemas.claim_audit, assertStrictOutputSchema(AUDIT_SCHEMA, "claim-audit schema"));
  write(schemas.critic, assertStrictOutputSchema(CRITIC_SOURCE_SCHEMA, "critic schema"));
  const profilePromptPath = join(RUN, "prompts", "profile.md");
  write(profilePromptPath, `${profileRenderPrompt(
    design.profile, corpusInputs(fixture, lock, measurements), measurements,
  )}\n`);
  const manifest = {
    schema: "prose-author-stage-adapter-canary-manifest/1",
    run_id: basename(RUN), prepared_commit: preparedCommit, concurrency: 1,
    acceptance_evidence: false, redraws: 0,
    dispatch: Object.fromEntries(design.stages.map((stage) => [stage, {
      harness: design.harness, model: design.model,
      effort: ["profile", "claim_audit"].includes(stage) ? "low" : "medium",
      transport: "native-structured", timeout_ms: 720000,
    }])),
    codex_no_tools_config: CODEX_NO_TOOLS_CONFIG,
    locked_files: Object.fromEntries(LOCKED.map((path) => [path, SHA(text(join(REPO, path)))])),
    agents,
    fixture: rel(fixture), measurements, lock,
    prompt: design.prompt,
    profile_prompt: { path: rel(profilePromptPath), sha256: SHA(text(profilePromptPath)) },
    schemas: Object.fromEntries(Object.entries(schemas).map(([stage, path]) => [stage, {
      path: rel(path), sha256: SHA(text(path)),
    }])),
  };
  write(MANIFEST_PATH, manifest);
  process.stdout.write("prepared stage-adapter canary; commit MANIFEST.json and generated inputs before dispatch\n");
}

function loadPrepared() {
  if (!existsSync(MANIFEST_PATH)) throw new Error("run prepare first");
  const manifest = json(MANIFEST_PATH);
  const anchor = committedManifestError(MANIFEST_PATH, manifest.prepared_commit);
  if (anchor) throw new Error(`MANIFEST.json is not an immutable child of prepared_commit: ${anchor}`);
  const drift = lockedImplementationErrors(manifest);
  if (drift.length) throw new Error(drift.join("; "));
  if (manifest.redraws !== 0 || manifest.acceptance_evidence !== false) {
    throw new Error("diagnostic manifest changed its evidence boundary");
  }
  for (const [stage, agent] of Object.entries(manifest.agents)) {
    const source = resolve(REPO, agent.source);
    const snapshot = resolve(REPO, agent.snapshot);
    if (!existsSync(source) || !existsSync(snapshot)
      || SHA(stripFrontmatter(text(source))) !== agent.sha256 || SHA(text(snapshot)) !== agent.sha256) {
      throw new Error(`${stage} agent source or snapshot drifted after prepare`);
    }
  }
  const fixture = resolve(REPO, manifest.fixture);
  const currentMeasurements = measureProfile(fixture);
  const currentLock = corpusLock(fixture, { agentPath: join(REPO, AGENTS.profile) });
  if (JSON.stringify(currentMeasurements) !== JSON.stringify(manifest.measurements)
    || JSON.stringify(currentLock) !== JSON.stringify(manifest.lock)) {
    throw new Error("fixture corpus or deterministic measurements drifted after prepare");
  }
  const profilePromptPath = resolve(REPO, manifest.profile_prompt.path);
  if (!existsSync(profilePromptPath) || SHA(text(profilePromptPath)) !== manifest.profile_prompt.sha256) {
    throw new Error("profile prompt drifted after prepare");
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
  if (existsSync(path) && text(path) !== body) throw new Error(`${rel(path)} changed after its first derivation`);
  if (!existsSync(path)) write(path, body);
  return path;
}

function criticCorpus(manifest) {
  const fixture = resolve(REPO, manifest.fixture);
  return manifest.lock.files.map((sample) => {
    const path = join(fixture, "corpus", "human", ...(sample.group ? [sample.group] : []), sample.file);
    return { file: sample.file, body: bodyOf(text(path)).trim() };
  });
}

function stageEvidence(path) {
  if (!existsSync(path)) return null;
  const record = json(path);
  return {
    raw: rel(path), raw_sha256: SHA(text(path)), harness: record.harness ?? null,
    is_error: record.is_error === true,
    ...codexCompanionArtifactFields(record),
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
  const profileRaw = join(RUN, "raw", "profile.json");
  const profileRecord = await call(
    manifest, "profile", resolve(REPO, manifest.profile_prompt.path), profileRaw,
  );
  const profileSource = profileRecord.structured_output;
  const profile = assembleVoiceProfile(profileSource, {
    profile: json(DESIGN_PATH).profile,
    measurements: manifest.measurements,
    samples_used: manifest.lock.files.map((sample) => sample.file).sort(),
    samples_excluded: manifest.measurements.samples_excluded ?? [],
  });
  if (!profile.ok || profile.refusal) throw new Error(`profile assembly failed: ${profile.errors.join("; ")}`);
  write(join(RUN, "outputs", "profile.json"), profile.profile);
  write(join(RUN, "outputs", "profile.md"), profile.profile.profile_markdown);

  const draftPromptPath = stagePrompt(join(RUN, "prompts", "draft.md"), draftPrompt(
    { prompt: manifest.prompt }, profile.profile.profile_markdown, profile.profile,
  ));
  const draftRaw = join(RUN, "raw", "draft.json");
  const draftRecord = await call(manifest, "draft", draftPromptPath, draftRaw, {
    profile_raw_sha256: SHA(text(profileRaw)),
  });
  const normalized = normalizeVoiceDraftSource(draftRecord.structured_output, { request: manifest.prompt });
  if (!normalized.ok || normalized.refusal) {
    throw new Error(`draft source failed: ${normalized.errors.join("; ") || "unexpected refusal"}`);
  }

  const initialSource = normalized.source;
  const targetCard = draftTargetCard(profile.profile, manifest.prompt);
  const initialConformance = measureDraftConformance(initialSource.draft, targetCard);
  write(join(RUN, "outputs", "initial-draft.json"), initialSource);

  const conformancePromptPath = stagePrompt(
    join(RUN, "prompts", "conformance.md"),
    draftConformancePrompt(
      { prompt: manifest.prompt }, profile.profile.profile_markdown, profile.profile, initialSource,
    ),
  );
  const conformanceRaw = join(RUN, "raw", "conformance.json");
  const conformanceRecord = await call(
    manifest, "conformance", conformancePromptPath, conformanceRaw, {
      profile_raw_sha256: SHA(text(profileRaw)),
      initial_draft_raw_sha256: SHA(text(draftRaw)),
    },
  );
  const patched = applyDraftConformancePatch(initialSource, conformanceRecord.structured_output, {
    request: manifest.prompt, profile: profile.profile, card: targetCard,
  });
  if (!patched.ok) {
    throw new Error(`conformance patch failed: ${patched.errors.join("; ")}`);
  }
  const conformed = { source: patched.source };
  const finalConformance = patched.report;
  write(join(RUN, "outputs", "conformance-patch.json"), conformanceRecord.structured_output);
  write(join(RUN, "outputs", "conformed-source.json"), conformed.source);

  const auditPromptPath = stagePrompt(join(RUN, "prompts", "claim-audit.md"), claimAuditPrompt(
    { id: "stage-canary", prompt: manifest.prompt }, conformed.source,
  ));
  const auditRaw = join(RUN, "raw", "claim-audit.json");
  const auditRecord = await call(manifest, "claim_audit", auditPromptPath, auditRaw, {
    initial_draft_raw_sha256: SHA(text(draftRaw)),
    conformance_raw_sha256: SHA(text(conformanceRaw)),
  });
  const auditApplied = applyVoiceDraftClaimAudit(conformed.source, auditRecord.structured_output, {
    request: manifest.prompt,
  });
  if (auditRecord.structured_output?.schema !== AUDIT_SCHEMA_ID || !auditApplied.ok) {
    throw new Error(`claim-audit assembly failed: ${auditApplied.errors.join("; ") || "wrong schema"}`);
  }
  const assembledDraft = assembleVoiceDraft(conformed.source, {
    request: manifest.prompt, auditClaims: auditApplied.claims,
  });
  if (!assembledDraft.ok || assembledDraft.refusal) throw new Error(`draft assembly failed: ${assembledDraft.errors.join("; ")}`);
  const publicDraft = parseDraft(assembledDraft.output);
  write(join(RUN, "outputs", "draft.md"), assembledDraft.output);

  const criticPromptPath = stagePrompt(join(RUN, "prompts", "critic.md"), criticPrompt(
    "stage-canary", criticCorpus(manifest), publicDraft.draft,
  ));
  const criticRaw = join(RUN, "raw", "critic.json");
  const criticRecord = await call(manifest, "critic", criticPromptPath, criticRaw, {
    initial_draft_raw_sha256: SHA(text(draftRaw)),
    conformance_raw_sha256: SHA(text(conformanceRaw)),
    audit_raw_sha256: SHA(text(auditRaw)),
  });
  const critic = assembleVoiceCritic(criticRecord.structured_output, { rhythmScanSupplied: false });
  if (!critic.ok) throw new Error(`critic assembly failed: ${critic.errors.join("; ")}`);
  write(join(RUN, "outputs", "critic.md"), critic.output);

  const result = {
    schema: "prose-author-stage-adapter-canary-result/1",
    status: "PASS", acceptance_evidence: false, redraws: 0,
    prepared_commit: manifest.prepared_commit,
    stages: existingStageEvidence(),
    profile_assembled: true, draft_assembled: true, conformance_assembled: true,
    conformance_patch_applied: true,
    conformance_initial: initialConformance,
    conformance_final: finalConformance,
    conformance_word_control: patched.word_control,
    audit_schema_valid: auditRecord.structured_output?.schema === AUDIT_SCHEMA_ID,
    audit_semantic_pass: auditApplied.ok,
    audit_findings: auditApplied.errors,
    critic_assembled: true,
  };
  write(RESULT_PATH, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const command = process.argv[2];
  if (command === "prepare") return prepare();
  if (command === "dispatch") return dispatch();
  throw new Error("usage: run.mjs <prepare|dispatch>");
}

try { await main(); } catch (error) {
  if (process.argv[2] === "dispatch" && !existsSync(RESULT_PATH)) {
    write(RESULT_PATH, {
      schema: "prose-author-stage-adapter-canary-result/1",
      status: "HOLD", acceptance_evidence: false, redraws: 0,
      failed_at: new Date().toISOString(), error: error.message,
      stages: existingStageEvidence(),
    });
  }
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}

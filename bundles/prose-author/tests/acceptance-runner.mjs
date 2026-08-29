#!/usr/bin/env node
/**
 * acceptance-runner — reproducible v0.2 blank-page acceptance pipeline.
 *
 * This is intentionally separate from prose-review's fixture harness. That harness
 * enumerates its own fixed leave-one-out corpus; this one is driven by a locked case
 * manifest and must preserve the renderer -> drafter -> critic provenance chain.
 *
 *   node tests/acceptance-runner.mjs prepare  tests/runs/<run>
 *   git add tests/runs/<run> && git commit  # anchor MANIFEST.json before any dispatch
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
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { scoreRun } from "./bar.mjs";
import { analyzeParagraphCoverage } from "./coverage-analysis.mjs";
import { crossCount } from "./cross-count.mjs";
import { bodyOf } from "./corpus-rates.mjs";
import { analyzeProfileStability } from "./profile-stability.mjs";
import { assertStrictOutputSchema, strictOutputSchemaErrors } from "./strict-output-schema.mjs";
import {
  assembleVoiceCritic, CRITIC_CATEGORIES, CRITIC_SOURCE_SCHEMA, parseVoiceCriticSource,
} from "./voice-critic-source.mjs";
import {
  assembleVoiceDraft, normalizeVoiceDraftSource, parseVoiceDraftSource,
  sharedRequestSupportTerms, SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA, validateVoiceDraftSource,
} from "../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA as DRAFT_AUDIT_SCHEMA,
  AUDIT_SCHEMA_ID as DRAFT_AUDIT_SCHEMA_ID,
  parseVoiceDraftClaimAudit, sentenceRefs,
} from "../skills/prose-draft/tools/draft-claim-audit.mjs";
import {
  draftTargetCard, renderDraftTargetCard,
} from "../skills/prose-draft/tools/draft-targets.mjs";
import {
  measureDraftConformance, renderDraftConformanceReport,
} from "../skills/prose-draft/tools/draft-conformance.mjs";
import { measureProfile } from "../skills/prose-draft/tools/profile-measure.mjs";
import {
  ABSENCE_REPLACEMENTS, assembleVoiceProfile, parseVoiceProfileSource, sourceMeasurementPlan,
  sourceRenderSchema,
} from "../skills/prose-draft/tools/profile-contract.mjs";
import {
  corpusLeakage, findFabricatedCitations, parseDraft, validateDraft,
} from "./voice-draft.mjs";
import {
  checkFrequencyAgainstRate, corpusLock, SCHEMA_ID as PROFILE_SCHEMA, validateVoiceProfile,
} from "./voice-profile.mjs";
import { RESEMBLANCE_CLAIMS } from "./run-gates.mjs";

const TESTS = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(TESTS, "..");
const REPO = resolve(BUNDLE, "..", "..");
const MANIFEST_SCHEMA = "prose-author-acceptance-manifest/3";
const ARTIFACTS_SCHEMA = "prose-author-acceptance-artifacts/3";
const CLAIM_PIPELINE = "audit-disclosure/1";
const STAGES = ["profile", "draft", "claim_audit", "critic"];
const DISPATCH_STAGES = [...STAGES, "conformance"];
const TRANSPORTS = new Set(["native-structured", "json-fence"]);
const SHA = (value) => createHash("sha256").update(value).digest("hex");
const today = () => new Date().toISOString().slice(0, 10);
const text = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(text(path));
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
function stagePrompt(path, body) {
  const prompt = body.endsWith("\n") ? body : `${body}\n`;
  write(path, prompt);
  return prompt;
}
const stripFrontmatter = (value) => value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

// A Codex draft is a language-model call, not an agentic repository turn. Keep the
// complete deny-list here so the invocation is portable, reviewable, and testable.
// The event audit in codex() is the second boundary: a newly introduced tool cannot
// silently become part of acceptance merely because this list predates it.
export const CODEX_NO_TOOLS_CONFIG = [
  "features.shell_tool=false",
  "features.unified_exec=false",
  "features.apps=false",
  "features.browser_use=false",
  "features.browser_use_external=false",
  "features.browser_use_full_cdp_access=false",
  "features.computer_use=false",
  "features.image_generation=false",
  "features.in_app_browser=false",
  "features.multi_agent=false",
  "agents.enabled=false",
  "features.plugins=false",
  "features.remote_plugin=false",
  "features.hooks=false",
  "features.goals=false",
  "features.skill_search=false",
  "features.workspace_dependencies=false",
  "tools.view_image=false",
  "tools.web_search=false",
  'web_search="disabled"',
];

const AGENTS = {
  profile: "primitives/agents/voice-profile-render/agent.md",
  draft: "primitives/agents/voice-draft/agent.md",
  claim_audit: "bundles/prose-author/skills/prose-draft/references/claim-audit.md",
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

const HARNESS_ALIASES = new Map([
  ["claude", "claude-code"], ["claude-code", "claude-code"], ["codex", "codex"],
]);
export const HARNESS_CAPABILITIES = Object.freeze({
  "claude-code": Object.freeze({
    native_structured: true, json_fence: true, clean_context: true,
    no_tools: true, immutable_failure: true,
  }),
  codex: Object.freeze({
    native_structured: true, json_fence: false, clean_context: true,
    no_tools: true, immutable_failure: true, raw_event_audit: true,
  }),
});

function configuredHarness(value, name) {
  const harness = HARNESS_ALIASES.get(value);
  if (!harness) throw new Error(`${name} must be claude, claude-code, or codex`);
  return harness;
}

function prepareConfig(env = process.env) {
  const sharedHarness = env.ACCEPTANCE_HARNESS || "codex";
  const sharedEffort = env.ACCEPTANCE_EFFORT || "medium";
  const claudeModel = env.ACCEPTANCE_MODEL || "sonnet";
  const codexModel = env.ACCEPTANCE_CODEX_MODEL || "gpt-5.6-luna";
  const stage = (id, { effort = sharedEffort } = {}) => {
    const prefix = `ACCEPTANCE_${id.toUpperCase()}`;
    const harness = configuredHarness(env[`${prefix}_HARNESS`] || sharedHarness, `${prefix}_HARNESS`);
    const model = env[`${prefix}_MODEL`] || (harness === "codex" ? codexModel : claudeModel);
    const transport = env[`${prefix}_NATIVE_SCHEMA`] === "0" ? "json-fence" : "native-structured";
    if (harness === "codex" && transport !== "native-structured") {
      throw new Error(`${prefix}_NATIVE_SCHEMA cannot be 0 for Codex`);
    }
    return { harness, model, effort: env[`${prefix}_EFFORT`] || effort, transport };
  };
  return {
    stages: {
      profile: stage("profile", { effort: "low" }),
      draft: stage("draft"),
      claim_audit: stage("claim_audit", { effort: "low" }),
      critic: stage("critic"),
    },
    concurrency: positiveInt(env.ACCEPTANCE_CONCURRENCY || "1", "ACCEPTANCE_CONCURRENCY"),
    timeoutMs: positiveInt(env.ACCEPTANCE_MODEL_TIMEOUT_MS || "720000", "ACCEPTANCE_MODEL_TIMEOUT_MS"),
  };
}

function manifestFingerprint(manifest) {
  return SHA(JSON.stringify(manifest));
}

function manifestDispatch(manifest, stage) {
  if (!DISPATCH_STAGES.includes(stage)) throw new Error(`unknown acceptance stage ${stage}`);
  if (!Number.isInteger(manifest?.concurrency) || manifest.concurrency < 1) {
    throw new Error("manifest concurrency is invalid");
  }
  const config = manifest?.dispatch?.[stage];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`manifest has no locked ${stage} dispatch configuration`);
  }
  const capabilities = HARNESS_CAPABILITIES[config.harness];
  if (!capabilities) {
    throw new Error(`manifest ${stage} harness is invalid`);
  }
  if (typeof config.model !== "string" || !config.model.trim()) throw new Error(`manifest ${stage} model is invalid`);
  if (typeof config.effort !== "string" || !config.effort.trim()) throw new Error(`manifest ${stage} effort is invalid`);
  if (!TRANSPORTS.has(config.transport)) throw new Error(`manifest ${stage} transport is invalid`);
  if (!Number.isInteger(config.timeout_ms) || config.timeout_ms < 1) throw new Error(`manifest ${stage} timeout is invalid`);
  if (config.transport === "native-structured" && !capabilities.native_structured) {
    throw new Error(`manifest ${stage} harness cannot enforce native-structured transport`);
  }
  if (config.transport === "json-fence" && !capabilities.json_fence) {
    throw new Error(`manifest ${stage} harness cannot enforce json-fence transport`);
  }
  if (!capabilities.clean_context || !capabilities.no_tools || !capabilities.immutable_failure) {
    throw new Error(`manifest ${stage} harness lacks required acceptance capabilities`);
  }
  return {
    stage,
    harness: config.harness,
    model: config.model,
    effort: config.effort,
    transport: config.transport,
    timeout_ms: config.timeout_ms,
    concurrency: manifest.concurrency,
    manifest_sha256: manifestFingerprint(manifest),
  };
}

function modelAdapterName(dispatch) {
  if (!STAGES.includes(dispatch?.stage)) throw new Error(`unknown adapter stage ${dispatch?.stage}`);
  if (dispatch.harness === "codex") return "codex";
  if (dispatch.harness === "claude-code") return "claude-code";
  throw new Error(`no adapter for locked harness ${dispatch?.harness}`);
}

function resultDispatch(config) {
  return {
    stage: config.stage,
    harness: config.harness,
    model: config.model,
    effort: config.effort,
    transport: config.transport,
    timeout_ms: config.timeout_ms,
    concurrency: config.concurrency,
    manifest_sha256: config.manifest_sha256,
  };
}

function invocationInput(system, prompt, {
  schema = null, schemaPath = null, prerequisites = null,
} = {}) {
  const input = {
    system_sha256: SHA(text(system)),
    prompt_sha256: SHA(prompt),
    schema_sha256: schemaPath ? SHA(text(schemaPath)) : (schema ? SHA(JSON.stringify(schema)) : null),
  };
  if (prerequisites) input.prerequisites = prerequisites;
  return input;
}

function schemaInvocation(dispatch, pinned) {
  if (!pinned?.schema || !pinned?.path) throw new Error(`${dispatch.stage} has no pinned invocation schema`);
  return dispatch.harness === "codex"
    ? { schemaPath: pinned.path }
    : { schema: dispatch.transport === "native-structured" ? pinned.schema : null };
}

function die(message, code = 1) {
  process.stderr.write(`\n  acceptance-runner: ${message}\n\n`);
  process.exit(code);
}

function rel(path) { return relative(REPO, path); }

function localModuleClosure(entries, repo = REPO) {
  const seen = new Set();
  const queue = entries.map((entry) => resolve(repo, entry));
  while (queue.length) {
    const file = queue.shift();
    const relativeFile = relative(repo, file);
    if (relativeFile.startsWith("..") || seen.has(relativeFile)) continue;
    if (!existsSync(file)) throw new Error(`locked module is missing: ${relativeFile}`);
    seen.add(relativeFile);
    const source = text(file);
    const imports = source.matchAll(/(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["'](\.[^"']+)["']/g);
    for (const match of imports) {
      let dependency = resolve(dirname(file), match[1]);
      if (!existsSync(dependency) && existsSync(`${dependency}.mjs`)) dependency = `${dependency}.mjs`;
      if (!existsSync(dependency)) throw new Error(`cannot resolve locked import ${match[1]} from ${relativeFile}`);
      queue.push(dependency);
    }
  }
  return [...seen].sort();
}

function committedManifestError(path, preparedCommit, repo = REPO) {
  const relativePath = relative(repo, resolve(path));
  if (relativePath.startsWith("..")) return "file is outside the repository";
  try {
    const additions = execFileSync(
      "git", ["log", "--diff-filter=A", "--format=%H", "--reverse", "--", relativePath],
      { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim().split("\n").filter(Boolean);
    if (additions.length !== 1) return "manifest must have exactly one first-add commit";
    const addedCommit = additions[0];
    execFileSync("git", ["merge-base", "--is-ancestor", addedCommit, "HEAD"], {
      cwd: repo, stdio: "ignore",
    });
    const parent = execFileSync("git", ["rev-parse", `${addedCommit}^`], {
      cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (parent !== preparedCommit) return "manifest first-add commit is not the child of prepared_commit";
    const committed = execFileSync("git", ["show", `${addedCommit}:${relativePath}`], {
      cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    });
    if (committed !== text(path)) return "manifest differs from its immutable first-add version";
  } catch {
    return "manifest first-add commit is not resolvable from HEAD";
  }
  return null;
}

function immutableFirstAddAnchor(path, repo = REPO) {
  const relativePath = relative(repo, resolve(path));
  if (relativePath.startsWith("..")) return { error: "file is outside the repository" };
  try {
    const additions = execFileSync(
      "git", ["log", "--diff-filter=A", "--format=%H", "--reverse", "--", relativePath],
      { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim().split("\n").filter(Boolean);
    if (additions.length !== 1) return { error: "file must have exactly one first-add commit" };
    const commit = additions[0];
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
      cwd: repo, stdio: "ignore",
    });
    const committed = execFileSync("git", ["show", `${commit}:${relativePath}`], {
      cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    });
    if (committed !== text(path)) return { error: "file differs from its immutable first-add version" };
    return { error: null, commit, sha256: SHA(committed) };
  } catch {
    return { error: "file first-add commit is not resolvable from HEAD" };
  }
}

function strictlyCommittedAfter(path, ancestor, repo = REPO) {
  const anchor = immutableFirstAddAnchor(path, repo);
  if (anchor.error) return anchor.error;
  if (anchor.commit === ancestor) return "file was first committed in the prerequisite commit";
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, anchor.commit], {
      cwd: repo, stdio: "ignore",
    });
  } catch {
    return "file was not committed after its prerequisite";
  }
  return null;
}

function lockedImplementationErrors(manifest, repo = REPO) {
  const errors = [];
  if (!manifest?.locked_files || typeof manifest.locked_files !== "object"
    || Array.isArray(manifest.locked_files)) {
    return ["manifest has no locked implementation hashes"];
  }
  for (const [file, expected] of Object.entries(manifest.locked_files)) {
    const target = resolve(repo, file);
    const within = relative(repo, target);
    if (!file || within === "" || within.startsWith("..") || resolve(repo, within) !== target) {
      errors.push(`locked implementation path is invalid: ${file}`);
      continue;
    }
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
      errors.push(`locked implementation hash is invalid: ${file}`);
      continue;
    }
    if (!existsSync(target) || SHA(text(target)) !== expected) {
      errors.push(`locked implementation changed after prepare: ${file}`);
    }
    try {
      const prepared = execFileSync(
        "git", ["show", `${manifest.prepared_commit}:${file}`],
        { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      if (SHA(prepared) !== expected) {
        errors.push(`locked implementation was not anchored in prepared_commit: ${file}`);
      }
    } catch {
      errors.push(`locked implementation is absent from prepared_commit: ${file}`);
    }
  }
  return errors;
}

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
    structural: join(runDir, "STRUCTURAL.json"),
    tally: join(runDir, "TALLY.json"),
    score: join(runDir, "SCORE.json"),
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

function sampleRelativePath(sample) {
  return join("corpus", "human", ...(sample.group ? [sample.group] : []), sample.file);
}

function filesUnder(root, prefix = "") {
  if (!existsSync(root)) return [];
  return readdirSync(root).sort().flatMap((name) => {
    const absolute = join(root, name);
    const relativePath = join(prefix, name);
    return statSync(absolute).isDirectory() ? filesUnder(absolute, relativePath) : [relativePath];
  });
}

const RETIRED_REPAIR_TREES = [
  join("raw", "claim-repairs"),
  join("raw", "claim-reaudits"),
  join("prompts", "claim-repairs"),
  join("prompts", "claim-reaudits"),
];

function retiredRepairEvidenceErrors(runDir) {
  const errors = [];
  for (const relativeRoot of RETIRED_REPAIR_TREES) {
    const root = join(runDir, relativeRoot);
    const files = filesUnder(root);
    for (const file of files) {
      errors.push(`stale model-repair evidence under ${CLAIM_PIPELINE}: ${join(relativeRoot, file)}`);
    }
  }
  for (const file of filesUnder(join(runDir, "inputs", "sources", "drafts"))) {
    if (file.endsWith(".repaired.json")) {
      errors.push(`stale canonical repair source under ${CLAIM_PIPELINE}: ${join("inputs", "sources", "drafts", file)}`);
    }
  }
  return errors;
}

function profilePromptFiles(manifest, profileId) {
  const staged = resolve(REPO, manifest.corpora[profileId].staged);
  return [
    ...(existsSync(join(staged, "profile.json")) ? ["profile.json"] : []),
    ...(existsSync(join(staged, "voice.md")) ? ["voice.md"] : []),
    "measurements.json",
    ...manifest.corpora[profileId].lock.files.map(sampleRelativePath),
  ];
}

function expectedProfilePrompt(manifest, profileId) {
  const staged = resolve(REPO, manifest.corpora[profileId].staged);
  const inputs = profilePromptFiles(manifest, profileId)
    .map((file) => ({ file, body: text(join(staged, file)) }));
  return `${profileRenderPrompt(profileId, inputs, manifest.corpora[profileId].measurements)}\n`;
}

export function profileRenderPrompt(profileId, inputs, measurements = null) {
  const byId = new Map((measurements?.measurements ?? []).map((row) => [row.id, row]));
  const sourcePlan = sourceMeasurementPlan(measurements);
  const absenceGuidance = [...byId.values()]
    .map((row) => {
      const available = (ABSENCE_REPLACEMENTS[row.id] ?? []).filter((id) => (byId.get(id)?.count ?? 0) > 0);
      const sparse = available.filter((id) => row.count <= byId.get(id).count * 0.2);
      if (sparse.length) {
        return `- ${row.id} is a sparse counterpart and will be an absence with measured replacement ${sparse.join(" or ")}; the assembler may reuse that positive observation across dimensions.`;
      }
      if (row.count === 0) {
        return `- ${row.id} has no measured positive replacement; do not emit it as an absence. Leave its dimension unresolved instead.`;
      }
      return `- ${row.id} is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.`;
    });
  return [
    `Render profile ${profileId}.`,
    "Every allowed input file is reproduced verbatim below. Read all of them and",
    "follow the system prompt's output contract exactly. No filesystem tools exist.",
    "",
    ...inputs.flatMap(({ file, body }) => [
      `## Input file: ${file}`,
      "",
      "<file>",
      body,
      "</file>",
      "",
    ]),
    "",
    "Complete the renderer's refusal checks now.",
    "This locked corpus is expected to be renderable; if it is not, state the refusal",
    "rather than inventing evidence.",
    "Otherwise emit voice-profile-source/4 exactly as described by the system prompt.",
    "Fill every deterministic measured slot below with semantic prose. Supply supporting",
    "filenames for the remaining qualitative dimensions, with restrained placement but no",
    "within-piece frequency, and",
    "fill every required unresolved reason. Do not copy counts, rates, support",
    "fractions, rules, observation IDs, coverage statuses, or final profile fields; the",
    "portable deterministic assembler owns those. Return the structured object only.",
    "",
    "Deterministic measured slots (the key, dimensions, section, and polarity are fixed):",
    ...sourcePlan.measured.map((slot) =>
      `- ${slot.id} -> ${slot.dimensions.join(", ")}; section ${slot.section}; ${slot.absence ? "counted absence" : "counted positive"}.`),
    "",
    `Qualitative dimensions: ${sourcePlan.qualitativeDimensions.join(", ") || "none"}.`,
    `Return ${sourcePlan.qualitativeMin}–${sourcePlan.qualitativeMax} qualitative observations.`,
    `Required unresolved dimensions: ${sourcePlan.unresolvedDimensions.join(", ") || "none"}.`,
    "The strict unresolved object requires every listed qualitative and unresolved key:",
    "use null when a qualitative observation covers that dimension, otherwise give the unresolved reason.",
    ...(absenceGuidance.length ? ["", "Mechanical absence availability:", ...absenceGuidance] : []),
  ].join("\n");
}

function prepare(runDir) {
  const p = expectedFiles(runDir);
  if (!existsSync(p.cases) || !existsSync(p.design)) die("run directory needs committed DESIGN.md and CASES.json");
  if (existsSync(p.manifest)) die("MANIFEST.json already exists; a prepared run is immutable");
  const cases = json(p.cases);
  const problems = validateCases(cases);
  if (problems.length) die(problems.join("; "));
  const config = prepareConfig();

  // The acceptance design explicitly locks implementation before the first acceptance
  // draft. Make that a mechanism: every file capable of changing the pipeline must be
  // tracked and byte-identical to HEAD before a manifest can be prepared.
  const locked = [...new Set([
    rel(p.design), rel(p.cases),
    ...Object.values(AGENTS),
    ...localModuleClosure(["bundles/prose-author/tests/acceptance-runner.mjs"]),
    "bundles/prose-author/tests/fixtures/voice-draft-regressions/safeguards.json",
  ])].sort();
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

  const draftSchemaPath = join(runDir, "schemas", "voice-draft-source-3.json");
  write(draftSchemaPath, assertStrictOutputSchema(DRAFT_SOURCE_SCHEMA, "draft schema"));
  const claimAuditSchemaPath = join(runDir, "schemas", "voice-draft-claim-audit-3.json");
  write(claimAuditSchemaPath, assertStrictOutputSchema(DRAFT_AUDIT_SCHEMA, "claim-audit schema"));
  const criticSchemaPath = join(runDir, "schemas", "voice-critic-source-1.json");
  write(criticSchemaPath, assertStrictOutputSchema(CRITIC_SOURCE_SCHEMA, "critic schema"));

  const corpusEntries = {};
  const currencyLocks = {};
  const profileSchemaEntries = {};
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
    const profileSchemaPath = join(runDir, "schemas", `voice-profile-source-3-${profile.id}.json`);
    write(profileSchemaPath, assertStrictOutputSchema(
      sourceRenderSchema(measurements), `${profile.id} profile schema`,
    ));
    profileSchemaEntries[profile.id] = {
      path: rel(profileSchemaPath), sha256: SHA(text(profileSchemaPath)),
    };
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
    schema: MANIFEST_SCHEMA,
    run_id: basename(runDir),
    prepared: today(),
    prepared_commit: preparedCommit,
    claim_pipeline: CLAIM_PIPELINE,
    dispatch: Object.fromEntries(STAGES.map((stage) => [stage, {
      ...config.stages[stage], timeout_ms: config.timeoutMs,
    }])),
    concurrency: config.concurrency,
    codex_no_tools_config: Object.values(config.stages).some((stage) => stage.harness === "codex")
      ? CODEX_NO_TOOLS_CONFIG : [],
    schemas: {
      profile: profileSchemaEntries,
      draft: { path: rel(draftSchemaPath), sha256: SHA(text(draftSchemaPath)) },
      claim_audit: {
        id: DRAFT_AUDIT_SCHEMA_ID,
        path: rel(claimAuditSchemaPath),
        sha256: SHA(text(claimAuditSchemaPath)),
      },
      critic: { path: rel(criticSchemaPath), sha256: SHA(text(criticSchemaPath)) },
    },
    draws_per_draft: 3,
    design_sha256: SHA(text(p.design)),
    cases_sha256: SHA(text(p.cases)),
    corpus_lock_sha256: SHA(text(join(runDir, "corpus.lock.json"))),
    locked_files: Object.fromEntries(locked.map((file) => [file, SHA(text(join(REPO, file)))])),
    agents: agentEntries,
    corpora: corpusEntries,
    prompts: Object.fromEntries([
      ...(cases.cases ?? []), ...(cases.refusals ?? []),
    ].map((c) => [c.id, { profile: c.profile, render: c.render, sha256: SHA(c.prompt), prompt: c.prompt }])),
  };
  write(p.manifest, manifest);

  for (const profile of cases.profiles) {
    for (let render = 1; render <= profile.renders; render += 1) {
      write(
        join(runDir, "prompts", "profiles", `${profile.id}-r${render}.md`),
        expectedProfilePrompt(manifest, profile.id),
      );
    }
  }
  process.stdout.write(`\n  prepared ${rel(runDir)}: 6 profiles, 22 draft/refusal cells, 20 independent disclosure audits, no model repairs or redraws, 60 critic draws\n\n`);
  process.stdout.write("  commit the prepared run, including MANIFEST.json, before dispatching profiles\n\n");
}

function loadPrepared(runDir) {
  const p = expectedFiles(runDir);
  if (!existsSync(p.manifest)) die("run has not been prepared");
  const manifest = json(p.manifest);
  const cases = json(p.cases);
  if (manifest.schema !== MANIFEST_SCHEMA) die(`MANIFEST.json must use ${MANIFEST_SCHEMA}`);
  if (manifest.claim_pipeline !== CLAIM_PIPELINE) {
    die(`MANIFEST.json claim_pipeline must be ${CLAIM_PIPELINE}`);
  }
  try {
    manifestClaimAuditSchema(manifest);
    manifestStageSchema(manifest, "draft", DRAFT_SOURCE_SCHEMA);
    manifestStageSchema(manifest, "critic", CRITIC_SOURCE_SCHEMA);
    for (const profile of cases.profiles) {
      manifestStageSchema(
        manifest, "profile", sourceRenderSchema(manifest.corpora[profile.id].measurements),
        { profileId: profile.id },
      );
    }
  } catch (error) {
    die(`MANIFEST.json stage schema is invalid: ${error.message}`);
  }
  if (!Number.isInteger(manifest.concurrency) || manifest.concurrency < 1) {
    die("MANIFEST.json has invalid locked concurrency");
  }
  for (const stage of STAGES) manifestDispatch(manifest, stage);
  const anchorError = committedManifestError(p.manifest, manifest.prepared_commit);
  if (anchorError) die(`MANIFEST.json must be committed unchanged before dispatch: ${anchorError}`);
  const implementationErrors = lockedImplementationErrors(manifest);
  if (implementationErrors.length) {
    die(`locked implementation failed pre-dispatch verification:\n    ${implementationErrors.join("\n    ")}`);
  }
  return { p, manifest, cases };
}

function completedResult(path, expectedDispatch = null, expectedInput = null) {
  if (!existsSync(path)) return null;
  const record = json(path);
  const hasText = typeof record.result === "string" && record.result.trim();
  const hasStructured = record.structured_output !== null
    && typeof record.structured_output === "object";
  if (record.type !== "result" || record.is_error || (!hasText && !hasStructured)) {
    throw new Error(`${rel(path)} exists but is not a completed successful response; do not redraw it`);
  }
  if (expectedDispatch?.transport === "native-structured" && !hasStructured) {
    throw new Error(`${rel(path)} did not honor its locked native-structured transport`);
  }
  if (expectedDispatch?.transport === "json-fence" && hasStructured) {
    throw new Error(`${rel(path)} returned native structure under its locked json-fence transport`);
  }
  if (expectedDispatch && !resultMatchesDispatch(record, expectedDispatch)) {
    throw new Error(`${rel(path)} dispatch provenance does not match its locked manifest stage`);
  }
  if (expectedInput && JSON.stringify(record.acceptance_input) !== JSON.stringify(expectedInput)) {
    throw new Error(`${rel(path)} invocation provenance does not match its locked prompts and schema`);
  }
  const lockedHarness = expectedDispatch?.harness ?? record.acceptance_dispatch?.harness;
  if (lockedHarness === "codex") {
    if (record.harness !== "codex") {
      throw new Error(`${rel(path)} Codex result wrapper has a missing or divergent harness label`);
    }
    const eventErrors = [
      ...codexCompanionPathErrors(record, path),
      ...codexRecordErrors(record),
    ];
    if (eventErrors.length) throw new Error(`${rel(path)} ${eventErrors.join("; ")}`);
  }
  return record;
}

function resultMatchesDispatch(record, expectedDispatch) {
  return JSON.stringify(record?.acceptance_dispatch) === JSON.stringify(resultDispatch(expectedDispatch));
}

function semanticSource(record) {
  if (record.structured_output !== null && typeof record.structured_output === "object") {
    return { source: record.structured_output, repairs: 0, error: null };
  }
  return parseVoiceProfileSource(record.result);
}

function semanticDraftSource(record) {
  if (record.structured_output !== null && typeof record.structured_output === "object") {
    return { source: record.structured_output, error: null };
  }
  return parseVoiceDraftSource(record.result);
}

function semanticClaimAudit(record) {
  if (record.structured_output !== null && typeof record.structured_output === "object") {
    return { audit: record.structured_output, error: null };
  }
  return parseVoiceDraftClaimAudit(record.result);
}

function semanticCriticSource(record) {
  if (record.structured_output !== null && typeof record.structured_output === "object") {
    return { source: record.structured_output, error: null };
  }
  return parseVoiceCriticSource(record.result);
}

async function claude({
  system, prompt, cwd, tools, allowed, output, schema = null, prerequisites = null, dispatch,
}) {
  const input = invocationInput(system, prompt, { schema, prerequisites });
  if (dispatch.harness !== "claude-code") throw new Error("Claude adapter received a non-Claude dispatch");
  if (completedResult(output, dispatch, input)) return { skipped: true, output };
  const args = [
    "-p", "--output-format", "json", "--no-session-persistence", "--model", dispatch.model,
    "--effort", dispatch.effort, "--system-prompt-file", system,
    // Keep the clean context actually clean. Without these flags Claude Code loads the
    // user's plugins, MCP servers and settings into every print-mode call. On this host
    // that consumed roughly 130k cached tokens before a 60k-token corpus prompt, leaving
    // the renderer at the context ceiling and causing long no-output stalls.
    "--disable-slash-commands", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
    "--setting-sources", "", "--no-chrome",
    "--tools", tools,
  ];
  if (schema) args.push("--json-schema", JSON.stringify(schema));
  if (allowed?.length) args.push("--allowedTools", ...allowed);
  args.push("--disallowedTools", "Bash", "Edit", "Write", "WebFetch", "WebSearch", "Task");
  return new Promise((resolvePromise, reject) => {
    const child = spawn("claude", args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const fail = (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const stdoutPath = output.replace(/\.json$/, ".claude-stdout.txt");
      const stderrPath = output.replace(/\.json$/, ".claude-stderr.txt");
      write(stdoutPath, stdout);
      write(stderrPath, stderr);
      write(output, {
        type: "result", is_error: true, harness: "claude-code", result: "",
        structured_output: null, error: message,
        raw_stdout: rel(stdoutPath), raw_stdout_sha256: SHA(stdout),
        raw_stderr: rel(stderrPath), raw_stderr_sha256: SHA(stderr),
        acceptance_dispatch: resultDispatch(dispatch), acceptance_input: input,
      });
      reject(new Error(message));
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, dispatch.timeout_ms);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdin.on("error", (error) => { fail(`claude stdin failed: ${error.message}`); });
    child.on("error", (error) => { clearTimeout(timeout); fail(error.message); });
    child.on("close", (code) => {
      if (settled) return;
      clearTimeout(timeout);
      if (timedOut) return fail(`claude exceeded ${dispatch.timeout_ms}ms; no redraw was made`);
      if (code !== 0) return fail(`claude exited ${code}: ${stderr.slice(0, 2000)}`);
      let record;
      try { record = JSON.parse(stdout); } catch { return fail(`claude emitted invalid JSON: ${stdout.slice(0, 500)}`); }
      const hasText = typeof record.result === "string" && record.result.trim();
      const hasStructured = record.structured_output !== null
        && typeof record.structured_output === "object";
      if (record.type !== "result" || record.is_error || (!hasText && !hasStructured)) {
        return fail(`claude emitted no successful result: ${stdout.slice(0, 1000)}`);
      }
      settled = true;
      write(output, { ...record, acceptance_dispatch: resultDispatch(dispatch), acceptance_input: input });
      resolvePromise({ skipped: false, output });
    });
    child.stdin.end(prompt);
  });
}

function codexCompanion(output, suffix) {
  return output.replace(/\.json$/, `.codex-${suffix}`);
}

export function codexToolEvents(events) {
  const allowedItems = new Set(["agent_message", "reasoning"]);
  return events.filter((event) => event.item && !allowedItems.has(event.item.type));
}

function codexEventPayload(eventsOutput, finalOutput, { materializeOutput = false } = {}) {
  const lines = text(eventsOutput).trim().split("\n");
  const events = lines.map((line, index) => {
    try { return JSON.parse(line); } catch {
      throw new Error(`codex event ${index + 1} was not JSON: ${line.slice(0, 500)}`);
    }
  });
  const toolEvents = codexToolEvents(events);
  if (toolEvents.length) {
    throw new Error(`codex no-tools boundary rejected item types: ${toolEvents.map((e) => e.item.type).join(", ")}`);
  }
  if (!events.some((event) => event.type === "turn.completed")) {
    throw new Error("codex emitted no completed turn");
  }
  const messages = events
    .filter((event) => event.item?.type === "agent_message" && typeof event.item.text === "string")
    .map((event) => event.item.text.trim())
    .filter(Boolean);
  if (!messages.length) throw new Error("codex emitted no final agent message");
  const result = messages.at(-1);
  if (existsSync(finalOutput)) {
    if (text(finalOutput).trim() !== result) {
      throw new Error("codex final output file diverges from its immutable event stream");
    }
  } else if (materializeOutput) {
    // Some CLI 0.146.0 calls completed before --output-last-message materialized its
    // companion file. The JSONL agent_message is the primary raw response, so derive
    // the convenience copy from that already-recorded event rather than redrawing.
    write(finalOutput, `${result}\n`);
  } else {
    throw new Error("codex final output companion is missing");
  }
  let structured;
  try { structured = JSON.parse(result); } catch {
    throw new Error(`codex final output was not JSON: ${result.slice(0, 500)}`);
  }
  return { result, structured };
}

function codexRecordErrors(record, repo = REPO) {
  const errors = [];
  try {
    if (typeof record.raw_events !== "string" || typeof record.raw_output !== "string") {
      return ["Codex result has no raw event/output companions"];
    }
    const eventsOutput = resolve(repo, record.raw_events);
    const finalOutput = resolve(repo, record.raw_output);
    const payload = codexEventPayload(eventsOutput, finalOutput);
    if (record.result.trim() !== payload.result) errors.push("Codex wrapper result diverges from its event stream");
    if (JSON.stringify(record.structured_output) !== JSON.stringify(payload.structured)) {
      errors.push("Codex wrapper structure diverges from its event stream");
    }
    if (record.recovered_from !== null && record.recovered_from !== undefined) {
      const recoveryPath = resolve(repo, record.recovered_from);
      if (!existsSync(recoveryPath)) {
        errors.push("Codex recovery companion is missing");
      } else {
        const recovery = json(recoveryPath);
        if (recovery.type !== "result" || recovery.is_error !== true
          || recovery.error !== "codex emitted no final structured output"
          || recovery.structured_output !== null
          || recovery.raw_events !== record.raw_events
          || !resultMatchesDispatch(recovery, record.acceptance_dispatch)
          || JSON.stringify(recovery.acceptance_input) !== JSON.stringify(record.acceptance_input)) {
          errors.push("Codex recovery companion does not preserve the failed adapter record");
        }
      }
    }
  } catch (error) {
    errors.push(`Codex raw event reconstruction failed: ${error.message}`);
  }
  return errors;
}

function finalizeCodexEvents({ eventsOutput, finalOutput, output, dispatch, input, preserveFailure = false }) {
  const { result, structured } = codexEventPayload(eventsOutput, finalOutput, { materializeOutput: true });
  let recoveredFrom = null;
  if (preserveFailure && existsSync(output)) {
    recoveredFrom = codexCompanion(output, "adapter-failure.json");
    cpSync(output, recoveredFrom);
  }
  write(output, {
    type: "result", is_error: false, harness: "codex", model: dispatch.model, effort: dispatch.effort,
    result, structured_output: structured, raw_events: rel(eventsOutput),
    raw_output: rel(finalOutput), recovered_from: recoveredFrom ? rel(recoveredFrom) : null,
    acceptance_dispatch: resultDispatch(dispatch),
    acceptance_input: input,
  });
  return { skipped: false, recovered: preserveFailure, output };
}

const CODEX_COMPANION_KEYS = ["raw_events", "raw_output", "recovered_from"];

function codexCompanionArtifactFields(record, prefix = "") {
  return Object.fromEntries(CODEX_COMPANION_KEYS.flatMap((key) => {
    const path = record?.[key] ?? null;
    return [
      [`${prefix}${key}`, path],
      [`${prefix}${key}_sha256`, path ? SHA(text(resolve(REPO, path))) : null],
    ];
  }));
}

function codexCompanionEvidencePaths(record) {
  if (record?.harness !== "codex") return [];
  return CODEX_COMPANION_KEYS
    .map((key) => record[key])
    .filter((path) => typeof path === "string" && path)
    .map((path) => resolve(REPO, path));
}

async function codex({
  system, prompt, output, schemaPath, noToolsConfig, prerequisites = null, dispatch,
}) {
  const input = invocationInput(system, prompt, { schemaPath, prerequisites });
  if (dispatch.harness !== "codex") throw new Error("Codex adapter received a non-Codex dispatch");
  const eventsOutput = codexCompanion(output, "events.jsonl");
  const finalOutput = codexCompanion(output, "output.json");
  if (existsSync(output)) {
    const existing = json(output);
    if (existing.type === "result" && !existing.is_error && existing.structured_output) {
      completedResult(output, dispatch, input);
      return { skipped: true, output };
    }
    if (existing.type === "result" && existing.is_error
      && existing.error === "codex emitted no final structured output"
      && existsSync(eventsOutput)) {
      if (!resultMatchesDispatch(existing, dispatch)
        || JSON.stringify(existing.acceptance_input) !== JSON.stringify(input)) {
        throw new Error(`${rel(output)} recoverable failure dispatch does not match its locked manifest stage`);
      }
      return finalizeCodexEvents({
        eventsOutput, finalOutput, output, dispatch, input, preserveFailure: true,
      });
    }
    completedResult(output, dispatch, input);
  }
  if (existsSync(eventsOutput) || existsSync(finalOutput)) {
    die(`${rel(eventsOutput)} or its final output already exists without a successful record; do not redraw it`);
  }
  const isolationDir = mkdtempSync(join(tmpdir(), `prose-author-codex-${dispatch.stage}-`));
  const args = [
    "exec", "--json", "--ephemeral", "--ignore-user-config", "--ignore-rules",
    "--skip-git-repo-check", "-C", isolationDir, "-s", "read-only", "-m", dispatch.model,
    "-c", `model_reasoning_effort=${JSON.stringify(dispatch.effort)}`,
    ...noToolsConfig.flatMap((setting) => ["-c", setting]),
    "--output-schema", schemaPath,
    "--output-last-message", finalOutput,
    "-",
  ];
  const combinedPrompt = [
    "<agent-instructions>", text(system).trim(), "</agent-instructions>", "",
    "<task>", prompt.trim(), "</task>", "",
    "Return only the structured object required by the agent instructions.",
  ].join("\n");
  return new Promise((resolvePromise, reject) => {
    const child = spawn("codex", args, { cwd: isolationDir, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, dispatch.timeout_ms);
    const cleanUp = () => {
      clearTimeout(timeout);
      rmSync(isolationDir, { recursive: true, force: true });
    };
    const preserveRawOutput = () => {
      if (stdout && !existsSync(eventsOutput)) {
        write(eventsOutput, stdout.endsWith("\n") ? stdout : `${stdout}\n`);
      }
    };
    const fail = (message) => {
      if (settled) return;
      settled = true;
      preserveRawOutput();
      cleanUp();
      write(output, {
        type: "result", is_error: true, harness: "codex", result: "",
        structured_output: null,
        raw_events: existsSync(eventsOutput) ? rel(eventsOutput) : null,
        raw_output: existsSync(finalOutput) ? rel(finalOutput) : null,
        recovered_from: null,
        error: message,
        acceptance_dispatch: resultDispatch(dispatch),
        acceptance_input: input,
      });
      reject(new Error(message));
    };
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdin.on("error", (error) => { fail(`codex stdin failed: ${error.message}`); });
    child.on("error", (error) => {
      fail(`codex spawn failed: ${error.message}`);
    });
    child.on("close", (code) => {
      if (settled) return;
      if (timedOut) return fail(`codex exceeded ${dispatch.timeout_ms}ms; no redraw was made`);
      if (code !== 0) return fail(`codex exited ${code}: ${stderr.slice(0, 2000)}`);
      preserveRawOutput();
      cleanUp();
      try {
        const finalized = finalizeCodexEvents({ eventsOutput, finalOutput, output, dispatch, input });
        settled = true;
        resolvePromise(finalized);
      } catch (error) {
        fail(error.message);
      }
    });
    child.stdin.end(combinedPrompt);
  });
}

async function dispatchModel({
  dispatch, system, prompt, cwd, output, schema, schemaPath, noToolsConfig,
  prerequisites = null,
}) {
  const adapter = modelAdapterName(dispatch);
  if (adapter === "codex") {
    if (dispatch.transport !== "native-structured" || !schemaPath) {
      throw new Error(`${dispatch.stage} Codex dispatch requires a pinned native schema path`);
    }
    return codex({
      system, prompt, output, schemaPath, noToolsConfig, prerequisites, dispatch,
    });
  }
  if (adapter === "claude-code") {
    return claude({
      system, prompt, cwd, output, tools: "", allowed: [], prerequisites, dispatch,
      schema: dispatch.transport === "native-structured" ? schema : null,
    });
  }
  throw new Error(`adapter ${adapter} is declared but not implemented`);
}

async function pool(label, jobs, concurrency) {
  let next = 0;
  let failed = null;
  const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
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
  const preflightErrors = dispatchPreflightErrors(runDir, manifest, cases, "profile");
  if (preflightErrors.length) {
    die(`acceptance evidence preflight failed; no profile calls were made:\n    ${preflightErrors.join("\n    ")}`);
  }
  const dispatch = manifestDispatch(manifest, "profile");
  const system = resolve(REPO, manifest.agents.profile.snapshot);
  const jobs = cases.profiles.flatMap((profile) =>
    Array.from({ length: profile.renders }, (_, i) => {
      const render = i + 1;
      const cwd = resolve(REPO, manifest.corpora[profile.id].staged);
      const promptPath = join(runDir, "prompts", "profiles", `${profile.id}-r${render}.md`);
      const pinnedSchema = manifestStageSchema(
        manifest, "profile", sourceRenderSchema(manifest.corpora[profile.id].measurements),
        { profileId: profile.id },
      );
      return {
        id: `${profile.id}-r${render}`,
        run: () => dispatchModel({
          system, cwd, prompt: text(promptPath), dispatch,
          schema: pinnedSchema.schema, schemaPath: pinnedSchema.path,
          noToolsConfig: manifest.codex_no_tools_config,
          output: join(runDir, "raw", "profiles", `${profile.id}-r${render}.json`),
        }),
      };
    }));
  await pool("profile", jobs, manifest.concurrency);
  collectProfiles(runDir);
}

function collectProfiles(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
  const dispatch = manifestDispatch(manifest, "profile");
  const artifacts = existsSync(join(runDir, "ARTIFACTS.json")) ? json(join(runDir, "ARTIFACTS.json")) : {
    schema: ARTIFACTS_SCHEMA, profiles: {}, profile_stability: {}, drafts: {}, refusals: {}, critics: {}, evidence: {},
  };
  artifacts.profile_stability ??= {};
  for (const profile of cases.profiles) {
    artifacts.profiles[profile.id] = {};
    const stabilityRenders = [];
    const expectedSamples = manifest.corpora[profile.id].lock.files.map((f) => f.file).sort();
    const measurements = manifest.corpora[profile.id].measurements;
    const byId = new Map(measurements.measurements.map((m) => [m.id, m]));
    for (let render = 1; render <= profile.renders; render += 1) {
      const rawPath = join(runDir, "raw", "profiles", `${profile.id}-r${render}.json`);
      const record = completedResult(rawPath, dispatch);
      if (!record) die(`missing ${rel(rawPath)}`);
      const decoded = semanticSource(record);
      if (!decoded.source) die(`${profile.id}-r${render} source transport failed: ${decoded.error}`);
      if (decoded.repairs !== 0) {
        die(`${profile.id}-r${render} source required ${decoded.repairs} transport quote repair(s)`);
      }
      const source = decoded.source;
      const assembled = assembleVoiceProfile(source, {
        profile: profile.id,
        measurements,
        samples_used: expectedSamples,
        samples_excluded: measurements.samples_excluded ?? [],
      });
      if (!assembled.ok || assembled.refusal) {
        die(`${profile.id}-r${render} source assembly failed: ${assembled.errors.join("; ")}`);
      }
      const parsed = { json: assembled.profile, markdown: assembled.profile.profile_markdown };
      stabilityRenders.push(parsed.json);
      const validation = validateVoiceProfile(parsed.json, parsed.markdown);
      if (!validation.ok || validation.refusal) die(`${profile.id}-r${render} invalid: ${validation.errors.join("; ")}`);
      const bandFindings = checkFrequencyAgainstRate(
        parsed.markdown, parsed.json, measurements.corpus_words / expectedSamples.length,
      );
      if (bandFindings.length) {
        die(`${profile.id}-r${render} measured frequency diverges: ${bandFindings.map((finding) => finding.detail).join("; ")}`);
      }
      if (parsed.json.schema !== PROFILE_SCHEMA) die(`${profile.id}-r${render} is not ${PROFILE_SCHEMA}`);
      if (parsed.json.corpus_words !== measurements.corpus_words) {
        die(`${profile.id}-r${render} corpus_words diverges from the deterministic measurement`);
      }
      for (const observation of parsed.json.observations) {
        if (!observation.rate) continue;
        const measurementId = observation.rate.counting_rule.match(/\[measurement:([a-z0-9-]+)\]/)?.[1];
        const measured = byId.get(measurementId);
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
      const sourcePath = join(outDir, `r${render}.source.json`);
      write(md, `${parsed.markdown.trim()}\n`);
      write(js, parsed.json);
      write(sourcePath, source);
      // The model response remains immutable under raw/profiles/*.json. This companion
      // artifact is the canonical assembled render that historical drift checks read.
      const rawRender = join(runDir, "raw", `${profile.id}-r${render}.md`);
      write(rawRender, `\`\`\`json\n${JSON.stringify(parsed.json, null, 2)}\n\`\`\`\n`);
      const promptPath = join(runDir, "prompts", "profiles", `${profile.id}-r${render}.md`);
      artifacts.profiles[profile.id][`r${render}`] = {
        prompt: rel(promptPath), raw: rel(rawPath), source: rel(sourcePath),
        render: rel(rawRender), markdown: rel(md), json: rel(js),
        prompt_sha256: SHA(text(promptPath)),
        raw_sha256: SHA(text(rawPath)), source_sha256: SHA(text(sourcePath)),
        render_sha256: SHA(text(rawRender)),
        markdown_sha256: SHA(text(md)), json_sha256: SHA(text(js)),
        ...codexCompanionArtifactFields(record),
        transport_repairs: decoded.repairs, coverage, recount,
      };
    }
    const stability = analyzeProfileStability(stabilityRenders);
    if (!stability.ok) {
      die(`${profile.id} k=3 mechanical stability failed: ${stability.errors.join("; ")}`);
    }
    artifacts.profile_stability[profile.id] = stability;
  }
  write(join(runDir, "ARTIFACTS.json"), artifacts);
  process.stdout.write(`\n  collected and validated six ${PROFILE_SCHEMA} renders\n\n`);
}

function draftPrompt(c, profileMarkdown, profileJson) {
  const targetCard = renderDraftTargetCard(draftTargetCard(profileJson, c.prompt));
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
    targetCard,
    "",
    "Return voice-draft-source/4 exactly as described by the system prompt.",
    "Put the finished prose directly in draft; do not split it into sentence objects.",
    "The portable deterministic boundary segments the immutable prose for an independent",
    "claim audit, derives the public verification record, owns draft/refusal fences, and",
    "removes empty disclosure arrays from voice-draft/1.",
  ].join("\n");
}

function draftConformancePrompt(c, profileMarkdown, profileJson, initialSource) {
  if (initialSource?.schema !== "voice-draft-source/4" || initialSource.kind !== "draft") {
    throw new TypeError("draft conformance requires one valid direct-prose initial source");
  }
  const card = draftTargetCard(profileJson, c.prompt);
  const report = measureDraftConformance(initialSource.draft, card);
  return [
    "Perform the mandatory final conformance pass on the initial draft below.",
    "This is one fixed pipeline stage, not a redraw or a choice between candidates: the",
    "source you return always replaces the initial source. Preserve its truthful argument",
    "and requested form while correcting the measured report and applying every supported",
    "coverage dimension. Do not mention this pass in the prose.",
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
    renderDraftTargetCard(card),
    "",
    renderDraftConformanceReport(report),
    "",
    "## Initial immutable source",
    "",
    "```json",
    JSON.stringify(initialSource, null, 2),
    "```",
    "",
    "Return voice-draft-source/4 exactly. Recount the final prose, not the initial prose.",
    "Every measured actual must be inside its stated range. Process all ten coverage rows:",
    "apply each rated, described, or absent-paired instruction, or name its dimension and",
    "observation ID in omitted with a concrete reason. Unresolved rows create no habit.",
    "The independent factual audit runs after this pass, so preserve no invented citation,",
    "attributed wording, biography, or uncertain fact merely to satisfy a voice instruction.",
  ].join("\n");
}

function claimAuditContract(manifest) {
  if (manifest?.claim_pipeline === CLAIM_PIPELINE) {
    return { id: DRAFT_AUDIT_SCHEMA_ID, schema: DRAFT_AUDIT_SCHEMA };
  }
  throw new Error(`unknown claim pipeline ${manifest?.claim_pipeline ?? "(missing)"}`);
}

function manifestStageSchema(manifest, stage, expected, { profileId = null, id = null } = {}) {
  const entry = stage === "profile"
    ? manifest?.schemas?.profile?.[profileId]
    : manifest?.schemas?.[stage];
  if (!entry || typeof entry.path !== "string" || (id !== null && entry.id !== id)) {
    throw new Error(`${stage}${profileId ? ` ${profileId}` : ""} has no pinned schema`);
  }
  const path = resolve(REPO, entry.path);
  if (!existsSync(path) || SHA(text(path)) !== entry.sha256) {
    throw new Error(`locked ${stage}${profileId ? ` ${profileId}` : ""} schema is missing or drifted`);
  }
  const schema = json(path);
  if (JSON.stringify(schema) !== JSON.stringify(expected)) {
    throw new Error(`locked ${stage}${profileId ? ` ${profileId}` : ""} schema bytes do not match the contract`);
  }
  assertStrictOutputSchema(schema, `${stage}${profileId ? ` ${profileId}` : ""} schema`);
  return { schema, path };
}

function manifestClaimAuditSchema(manifest) {
  const contract = claimAuditContract(manifest);
  return manifestStageSchema(manifest, "claim_audit", contract.schema, { id: contract.id }).schema;
}

function claimAuditPrompt(c, source) {
  const units = sentenceRefs(source);
  return [
    `# Independent draft claim audit — ${c.id}`,
    "",
    "The request is the only supplied factual packet. The drafter supplied prose, not factual certification.",
    "Audit every deterministic sentence unit under the system prompt. Do not revise the prose.",
    "",
    "## Request",
    "",
    c.prompt,
    "",
    "## Sentence units",
    "",
    "```json",
    JSON.stringify(units, null, 2),
    "```",
    "",
    `Return ${DRAFT_AUDIT_SCHEMA_ID} as the strict object only. Preserve every ID`,
    "exactly once and in order. Every row carries id, status, reason, and claims.",
    "Keep/reject rows carry claims: []; disclose rows extract every unsupported",
    "proposition. Do not copy evidence; deterministic assembly binds the complete",
    "immutable sentence for the later mandatory verification audit.",
  ].join("\n");
}

async function dispatchDrafts(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
  const preflightErrors = dispatchPreflightErrors(runDir, manifest, cases, "draft");
  if (preflightErrors.length) {
    die(`acceptance evidence preflight failed; no draft calls were made:\n    ${preflightErrors.join("\n    ")}`);
  }
  const dispatch = manifestDispatch(manifest, "draft");
  collectProfiles(runDir);
  const system = resolve(REPO, manifest.agents.draft.snapshot);
  const cells = [...cases.cases, ...cases.refusals.map((c) => ({ ...c, refusal: true }))];
  const jobs = cells.map((c) => {
    const profileDir = join(runDir, "inputs", "profiles", c.profile);
    const promptPath = join(runDir, "prompts", c.refusal ? "refusals" : "drafts", `${c.id}.md`);
    const prompt = stagePrompt(promptPath, draftPrompt(
      c, text(join(profileDir, `r${c.render}.md`)), json(join(profileDir, `r${c.render}.json`)),
    ));
    return {
      id: c.id,
      run: () => {
        const output = join(runDir, "raw", c.refusal ? "refusals" : "drafts", `${c.id}.json`);
        const pinnedSchema = manifestStageSchema(manifest, "draft", DRAFT_SOURCE_SCHEMA);
        return dispatchModel({
          system, cwd: runDir, prompt, output, dispatch,
          schema: pinnedSchema.schema, schemaPath: pinnedSchema.path,
          noToolsConfig: manifest.codex_no_tools_config,
        });
      },
    };
  });
  await pool("draft", jobs, manifest.concurrency);
  await dispatchClaimPipeline(runDir, manifest, cases);
  collectDrafts(runDir);
}

async function dispatchClaimPipeline(runDir, manifest, cases) {
  if (manifest.claim_pipeline !== CLAIM_PIPELINE) {
    die(`new claim dispatch requires ${CLAIM_PIPELINE}`);
  }
  const auditDispatch = manifestDispatch(manifest, "claim_audit");
  const auditSchema = manifestClaimAuditSchema(manifest);
  const auditSchemaPath = manifestStageSchema(
    manifest, "claim_audit", auditSchema, { id: DRAFT_AUDIT_SCHEMA_ID },
  ).path;
  const draftDispatch = manifestDispatch(manifest, "draft");
  const auditSystem = resolve(REPO, manifest.agents.claim_audit.snapshot);
  const sources = new Map();
  const auditJobs = [];
  const retiredErrors = retiredRepairEvidenceErrors(runDir);
  if (retiredErrors.length) die(retiredErrors.join("; "));

  for (const c of cases.cases) {
    const rawPath = join(runDir, "raw", "drafts", `${c.id}.json`);
    const record = completedResult(rawPath, draftDispatch);
    if (!record) die(`missing ${rel(rawPath)}`);
    const decoded = semanticDraftSource(record);
    if (!decoded.source) die(`${c.id} invalid semantic draft source before audit: ${decoded.error}`);
    const normalized = normalizeVoiceDraftSource(decoded.source, { request: c.prompt });
    if (!normalized.ok || normalized.refusal) {
      if (normalized.refusal) die(`${c.id} unexpectedly refused before claim audit`);
      die(`${c.id} invalid source before claim audit: ${normalized.errors.join("; ")}`);
    }
    sources.set(c.id, { original: decoded.source, normalized });
    const promptPath = join(runDir, "prompts", "claim-audits", `${c.id}.md`);
    const prompt = stagePrompt(promptPath, claimAuditPrompt(c, normalized.source));
    auditJobs.push({
      id: c.id,
      run: () => dispatchModel({
        system: auditSystem, cwd: runDir, prompt, dispatch: auditDispatch,
        schema: auditSchema, schemaPath: auditSchemaPath,
        noToolsConfig: manifest.codex_no_tools_config,
        output: join(runDir, "raw", "claim-audits", `${c.id}.json`),
      }),
    });
  }
  await pool("independent claim audit", auditJobs, manifest.concurrency);

  for (const c of cases.cases) {
    const auditPath = join(runDir, "raw", "claim-audits", `${c.id}.json`);
    const auditRecord = completedResult(auditPath, auditDispatch);
    if (!auditRecord) die(`missing ${rel(auditPath)}`);
    const decodedAudit = semanticClaimAudit(auditRecord);
    if (!decodedAudit.audit) die(`${c.id} invalid independent claim audit: ${decodedAudit.error}`);
    if (decodedAudit.audit.schema !== DRAFT_AUDIT_SCHEMA_ID) {
      die(`${c.id} current claim pipeline requires ${DRAFT_AUDIT_SCHEMA_ID}`);
    }
    const source = sources.get(c.id).normalized.source;
    const applied = applyVoiceDraftClaimAudit(source, decodedAudit.audit, { request: c.prompt });
    if (!applied.ok) die(`${c.id} independent claim audit failed: ${applied.errors.join("; ")}`);
  }
}

function resolveDraftChain(runDir, manifest, c) {
  const retiredErrors = retiredRepairEvidenceErrors(runDir);
  if (retiredErrors.length) throw new Error(retiredErrors.join("; "));
  const draftDispatch = manifestDispatch(manifest, "draft");
  const auditDispatch = manifestDispatch(manifest, "claim_audit");
  const rawPath = join(runDir, "raw", "drafts", `${c.id}.json`);
  const record = completedResult(rawPath, draftDispatch);
  if (!record) throw new Error(`missing ${rel(rawPath)}`);
  const decoded = semanticDraftSource(record);
  if (!decoded.source) throw new Error(`${c.id} invalid semantic draft source: ${decoded.error}`);
  const initialAuditRawPath = join(runDir, "raw", "claim-audits", `${c.id}.json`);
  const normalized = normalizeVoiceDraftSource(decoded.source, { request: c.prompt });
  const pipeline = manifest.claim_pipeline;
  if (pipeline !== CLAIM_PIPELINE) throw new Error(`${c.id} unknown claim pipeline ${pipeline ?? "(missing)"}`);
  if (!normalized.ok || normalized.refusal) {
    throw new Error(normalized.refusal
      ? `${c.id} unexpectedly refused`
      : `${c.id} invalid source before claim audit: ${normalized.errors.join("; ")}`);
  }
  const auditRecord = completedResult(initialAuditRawPath, auditDispatch);
  if (!auditRecord) throw new Error(`missing ${rel(initialAuditRawPath)}`);
  const decodedAudit = semanticClaimAudit(auditRecord);
  if (!decodedAudit.audit) throw new Error(`${c.id} invalid independent claim audit: ${decodedAudit.error}`);
  if (decodedAudit.audit.schema !== DRAFT_AUDIT_SCHEMA_ID) {
    throw new Error(`${c.id} ${CLAIM_PIPELINE} requires ${DRAFT_AUDIT_SCHEMA_ID}`);
  }
  const applied = applyVoiceDraftClaimAudit(normalized.source, decodedAudit.audit, { request: c.prompt });
  if (!applied.ok) throw new Error(`${c.id} independent claim audit failed: ${applied.errors.join("; ")}`);
  return {
    record, originalSource: decoded.source,
    normalized: normalized.changed, normalizedSource: normalized.source,
    removedLedgerIds: normalized.removed_ledger_ids ?? [],
    initialAudit: decodedAudit.audit, repaired: false,
    repairRecord: null, repairSource: null, finalSource: normalized.source,
    finalAudit: decodedAudit.audit, finalAuditRawPath: initialAuditRawPath,
    repairNeed: null, auditClaims: applied.claims,
  };
}

function collectDrafts(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
  const draftDispatch = manifestDispatch(manifest, "draft");
  const auditDispatch = manifestDispatch(manifest, "claim_audit");
  const artifactsPath = join(runDir, "ARTIFACTS.json");
  if (!existsSync(artifactsPath)) die("profiles must be collected first");
  const artifacts = json(artifactsPath);
  for (const c of cases.cases) {
    let chain;
    try { chain = resolveDraftChain(runDir, manifest, c); } catch (error) { die(error.message); }
    const rawPath = join(runDir, "raw", "drafts", `${c.id}.json`);
    const record = chain.record;
    const auditRawPath = chain.finalAuditRawPath;
    const auditRecord = completedResult(auditRawPath, auditDispatch);
    if (!auditRecord) die(`missing ${rel(auditRawPath)}`);
    const assembled = assembleVoiceDraft(chain.finalSource, {
      request: c.prompt, auditClaims: chain.auditClaims,
    });
    if (!assembled.ok) die(`${c.id} invalid semantic draft source: ${assembled.errors.join("; ")}`);
    const sourcePath = join(runDir, "inputs", "sources", "drafts", `${c.id}.json`);
    const originalSourcePath = join(runDir, "inputs", "sources", "drafts", `${c.id}.original.json`);
    const normalizedSourcePath = join(runDir, "inputs", "sources", "drafts", `${c.id}.normalized.json`);
    const auditPath = join(runDir, "inputs", "audits", `${c.id}.json`);
    const initialAuditPath = join(runDir, "inputs", "audits", "initial", `${c.id}.json`);
    const renderPath = join(runDir, "outputs", "drafts", `${c.id}.md`);
    write(originalSourcePath, chain.originalSource);
    if (chain.normalized) write(normalizedSourcePath, chain.normalizedSource);
    if (chain.initialAudit) write(initialAuditPath, chain.initialAudit);
    write(auditPath, chain.finalAudit);
    write(sourcePath, chain.finalSource);
    write(renderPath, assembled.output);
    const parsed = parseDraft(assembled.output);
    const validation = validateDraft(parsed);
    if (!validation.ok || validation.refusal) die(`${c.id} invalid draft: ${validation.errors.join("; ")}`);
    const out = join(runDir, "inputs", "drafts", `${c.id}.txt`);
    write(out, `${parsed.draft.trim()}\n`);
    const disclosure = parsed.hadJsonFence ? parsed.json : null;
    const disclosurePath = join(runDir, "inputs", "records", `${c.id}.json`);
    if (disclosure) write(disclosurePath, disclosure);
    const dispatchPrompt = join(runDir, "prompts", "drafts", `${c.id}.md`);
    const initialAuditPromptPath = join(runDir, "prompts", "claim-audits", `${c.id}.md`);
    const auditPromptPath = join(runDir, "prompts", "claim-audits", `${c.id}.md`);
    artifacts.drafts[c.id] = {
      profile: c.profile, render: c.render, request_sha256: SHA(c.prompt),
      prompt: rel(dispatchPrompt), prompt_sha256: SHA(text(dispatchPrompt)), raw: rel(rawPath),
      raw_sha256: SHA(text(rawPath)),
      original_source: rel(originalSourcePath), original_source_sha256: SHA(text(originalSourcePath)),
      normalized_source: chain.normalized ? rel(normalizedSourcePath) : null,
      normalized_source_sha256: chain.normalized ? SHA(text(normalizedSourcePath)) : null,
      removed_ledger_ids: chain.removedLedgerIds,
      initial_audit_prompt: chain.initialAudit ? rel(initialAuditPromptPath) : null,
      initial_audit_prompt_sha256: chain.initialAudit ? SHA(text(initialAuditPromptPath)) : null,
      initial_audit_raw: chain.initialAudit ? rel(join(runDir, "raw", "claim-audits", `${c.id}.json`)) : null,
      initial_audit_raw_sha256: chain.initialAudit ? SHA(text(join(runDir, "raw", "claim-audits", `${c.id}.json`))) : null,
      initial_audit: chain.initialAudit ? rel(initialAuditPath) : null,
      initial_audit_sha256: chain.initialAudit ? SHA(text(initialAuditPath)) : null,
      audit_prompt: rel(auditPromptPath), audit_prompt_sha256: SHA(text(auditPromptPath)),
      audit_raw: rel(auditRawPath), audit_raw_sha256: SHA(text(auditRawPath)),
      audit: rel(auditPath), audit_sha256: SHA(text(auditPath)),
      source: rel(sourcePath), source_sha256: SHA(text(sourcePath)),
      render_output: rel(renderPath), render_output_sha256: SHA(text(renderPath)),
      draft: rel(out), draft_sha256: SHA(text(out)),
      disclosure: disclosure ? rel(disclosurePath) : null,
      disclosure_sha256: disclosure ? SHA(text(disclosurePath)) : null,
      ...codexCompanionArtifactFields(record),
      ...codexCompanionArtifactFields(auditRecord, "initial_audit_"),
      ...codexCompanionArtifactFields(auditRecord, "audit_"),
    };
  }
  for (const c of cases.refusals) {
    const rawPath = join(runDir, "raw", "refusals", `${c.id}.json`);
    const record = completedResult(rawPath, draftDispatch);
    if (!record) die(`missing ${rel(rawPath)}`);
    const decoded = semanticDraftSource(record);
    if (!decoded.source) die(`${c.id} invalid semantic refusal source: ${decoded.error}`);
    const assembled = assembleVoiceDraft(decoded.source, { request: c.prompt });
    if (!assembled.ok) die(`${c.id} invalid semantic refusal source: ${assembled.errors.join("; ")}`);
    const sourcePath = join(runDir, "inputs", "sources", "refusals", `${c.id}.json`);
    const renderPath = join(runDir, "outputs", "refusals", `${c.id}.md`);
    write(sourcePath, decoded.source);
    write(renderPath, assembled.output);
    const parsed = parseDraft(assembled.output);
    const validation = validateDraft(parsed);
    if (!validation.ok || !validation.refusal) die(`${c.id} did not produce a valid refusal: ${validation.errors.join("; ")}`);
    const dispatchPrompt = join(runDir, "prompts", "refusals", `${c.id}.md`);
    artifacts.refusals[c.id] = {
      prompt: rel(dispatchPrompt), prompt_sha256: SHA(text(dispatchPrompt)),
      raw: rel(rawPath), raw_sha256: SHA(text(rawPath)),
      source: rel(sourcePath), source_sha256: SHA(text(sourcePath)),
      render_output: rel(renderPath), render_output_sha256: SHA(text(renderPath)),
      reason: parsed.json.refused,
      ...codexCompanionArtifactFields(record),
    };
  }
  write(artifactsPath, artifacts);
  prepareClaimsAudit(runDir, cases, artifacts);
  process.stdout.write("\n  collected twenty drafts and two valid underdetermined refusals\n");
  process.stdout.write("  complete and commit the human CLAIMS-AUDIT.json before dispatching critics\n\n");
}

const CLAIMS_AUDIT_SCHEMA = "prose-author-claims-audit/5";
const CLAIMS_AUDIT_ATTESTATION = "I personally reviewed every immutable sentence and recorded every unsupported descriptive premise as requires-change or listed-for-verification before any critic call.";
const SENTENCE_REVIEW_DECISIONS = [
  "request-supported", "listed-for-verification", "non-factual", "requires-change",
];
const NON_FACTUAL_BASES = ["normative", "hypothetical", "logical", "rhetorical", "procedural"];
const SEMANTIC_AUTHORITY = String.raw`(?:model(?:-authored)?|audit(?:or)?|ledger|classifier|automated[ -]reviewer)`;
const SEMANTIC_VERDICT = String.raw`(?:says?|said|marks?|marked|labels?|labelled|classifies?|classified|calls?|called|treats?|treated|decides?|decided|finds?|found)`;
const SEMANTIC_DEFERENCE = new RegExp(
  String.raw`(?:\b${SEMANTIC_AUTHORITY}\b.{0,48}\b${SEMANTIC_VERDICT}\b|\b(?:according to|because of|relying on)\b.{0,32}\b${SEMANTIC_AUTHORITY}\b)`,
  "i",
);
const FACTUAL_CANDIDATE_RULES = [
  {
    id: "frequency-or-quantity",
    pattern: /\b(?:often|usually|generally|typically|commonly|many|most|few|some|rarely|always|never|nobody|everyone|anyone)\b/i,
  },
  {
    id: "population-or-institution",
    pattern: /\b(?:users?|developers?|people|consumers?|companies?|platforms?|industry|courts?|laws?|markets?|buyers?|sellers?|landlords?|workers?|customers?|voters?|readers?|gatekeepers?|makers?|vendors?|providers?)\b/i,
  },
  {
    id: "empirical-causation",
    pattern: /\b(?:because|causes?|caused|leads? to|results? in|drives?|encourages?|discourages?|prevents?|attracts?|shapes?|takes attention|takes time)\b/i,
  },
  {
    id: "attribution-or-practice",
    pattern: /\b(?:presented as|treated as|known as|described as|widely|standard|usual|ordinary|common practice|predictable)\b/i,
  },
  {
    id: "capability-or-dependence",
    pattern: /\b(?:can|cannot|can't|may|depends? on|controlled by|allowed to|required to|has the (?:power|right|ability))\b/i,
  },
];

function factualCandidateReasons(value) {
  const sentence = String(value ?? "");
  return FACTUAL_CANDIDATE_RULES
    .filter((rule) => rule.pattern.test(sentence))
    .map((rule) => rule.id);
}

function sentenceReviewTemplate(source) {
  return sentenceRefs(source).map((ref) => ({
    id: ref.id,
    text_sha256: SHA(String(ref.text ?? "")),
    candidate_reasons: factualCandidateReasons(ref.text),
    decision: null,
    claim_refs: [],
    request_evidence: [],
    sentence_evidence: "",
    non_factual_basis: null,
    note: "",
  }));
}

function sentenceClaimInventory(source, audit, request) {
  const applied = applyVoiceDraftClaimAudit(source, audit, { request });
  if (!applied.ok) throw new Error(`canonical claim audit is invalid: ${applied.errors.join("; ")}`);
  const ledger = new Map((source.ledger ?? []).map((entry) => [entry.id, entry.claim]));
  const planned = new Map();
  for (const ref of sentenceRefs(source)) planned.set(ref.id, []);
  if (Array.isArray(source.paragraphs)) {
    for (const [pIndex, paragraph] of source.paragraphs.entries()) {
      for (const [sIndex, sentence] of (paragraph.sentences ?? []).entries()) {
        planned.set(`p${pIndex + 1}s${sIndex + 1}`,
          (sentence.claim_ids ?? []).map((id) => ledger.get(id)).filter(Boolean));
      }
    }
  }
  const overlays = new Map();
  for (const claim of applied.claims ?? []) {
    const claims = overlays.get(claim.sentence_id) ?? [];
    claims.push(claim.claim);
    overlays.set(claim.sentence_id, claims);
  }
  return Object.fromEntries(sentenceRefs(source).map((ref) => {
    const claims = [
      ...(planned.get(ref.id) ?? []),
      ...(overlays.get(ref.id) ?? []),
    ];
    return [ref.id, [...new Set(claims)]];
  }));
}

function prepareClaimsAudit(runDir, cases, artifacts) {
  const auditPath = join(runDir, "CLAIMS-AUDIT.json");
  const prior = existsSync(auditPath) ? json(auditPath) : null;
  let preserveAttestation = prior?.schema === CLAIMS_AUDIT_SCHEMA;
  const next = {
    schema: CLAIMS_AUDIT_SCHEMA,
    attestation: preserveAttestation ? prior.attestation : {
      reviewer: "",
      completed_at: "",
      statement: CLAIMS_AUDIT_ATTESTATION,
    },
    instructions: [
      "claims_verified: verify every listed claim against an authoritative source; use true only when every item is verified",
      "sentence_reviews: review every immutable sentence; the model audit and candidate reasons are aids, never completeness authority",
      "request-supported: independently cite exact substantive request spans in request_evidence and explain how they support the complete sentence; do not delegate to a model label",
      "listed-for-verification: put every public claim covering the sentence into claim_refs; each claim must be located in the same paragraph",
      "non-factual: copy the complete sentence into sentence_evidence, select one closed non_factual_basis, and independently explain why the whole sentence has no external descriptive premise",
      "requires-change: use when any premise is missing, overbroad, fabricated, or otherwise cannot pass; critics remain blocked",
      "the profile is voice evidence, never a factual packet; model memory and generic plausibility are not supplied facts",
      "quotations_verified: inspect every quoted span and use true only when every attributed quotation is verbatim in the request or independently verified; scare quotes may be marked reviewed",
    ],
    drafts: {},
  };
  for (const c of cases.cases) {
    const disclosurePath = join(runDir, "inputs", "records", `${c.id}.json`);
    const disclosure = existsSync(disclosurePath) ? json(disclosurePath) : null;
    const claims = disclosure?.claims ?? [];
    const draft = text(join(runDir, "inputs", "drafts", `${c.id}.txt`));
    const quotedSpans = quotationAudit(draft, c.prompt);
    const source = json(join(runDir, "inputs", "sources", "drafts", `${c.id}.json`));
    const reviewTemplate = sentenceReviewTemplate(source);
    const previous = prior?.schema === CLAIMS_AUDIT_SCHEMA ? prior.drafts?.[c.id] : null;
    const unchanged = previous?.draft_sha256 === artifacts.drafts[c.id].draft_sha256
      && JSON.stringify(previous.claims) === JSON.stringify(claims)
      && JSON.stringify(previous.quoted_spans) === JSON.stringify(quotedSpans)
      && JSON.stringify((previous.sentence_reviews ?? []).map((review) => ({
        id: review.id, text_sha256: review.text_sha256, candidate_reasons: review.candidate_reasons,
      }))) === JSON.stringify(reviewTemplate.map((review) => ({
        id: review.id, text_sha256: review.text_sha256, candidate_reasons: review.candidate_reasons,
      })));
    preserveAttestation &&= unchanged;
    next.drafts[c.id] = {
      draft_sha256: artifacts.drafts[c.id].draft_sha256,
      claims,
      quoted_spans: quotedSpans,
      sentence_reviews: unchanged ? previous.sentence_reviews : reviewTemplate,
      claims_verified: unchanged ? previous.claims_verified : (claims.length === 0 ? true : null),
      quotations_verified: unchanged ? previous.quotations_verified : (quotedSpans.length === 0 ? true : null),
      note: unchanged ? (previous.note ?? "") : "",
    };
  }
  if (!preserveAttestation) {
    next.attestation = {
      reviewer: "", completed_at: "", statement: CLAIMS_AUDIT_ATTESTATION,
    };
  }
  write(auditPath, next);
}

function quotationAudit(draft, request, profile = "") {
  const supplied = normalizeAuditText(request);
  const rows = [];
  for (const [index, paragraph] of draft.trim().split(/\n\s*\n/).entries()) {
    const quoted = /“([^”\n]+)”|"([^"\n]+)"/g;
    for (const match of paragraph.matchAll(quoted)) {
      const value = (match[1] ?? match[2]).trim();
      if (!value) continue;
      rows.push({
        text: value,
        where: `paragraph ${index + 1}`,
        present_in_request: supplied.includes(normalizeAuditText(value)),
      });
    }
  }
  return rows;
}

function normalizeAuditText(value) {
  return String(value ?? "").normalize("NFKC").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function claimsAuditFailures(audit, cases, artifacts = null, runDir = null) {
  const failures = [];
  if (audit?.schema !== CLAIMS_AUDIT_SCHEMA) return ["CLAIMS-AUDIT.json has the wrong schema"];
  if (JSON.stringify(Object.keys(audit).sort())
    !== JSON.stringify(["attestation", "drafts", "instructions", "schema"].sort())) {
    failures.push("CLAIMS-AUDIT.json top-level fields drifted");
  }
  const attestation = audit.attestation;
  if (!attestation || typeof attestation !== "object" || Array.isArray(attestation)
    || JSON.stringify(Object.keys(attestation).sort())
      !== JSON.stringify(["completed_at", "reviewer", "statement"].sort())) {
    failures.push("CLAIMS-AUDIT.json has no exact human attestation");
  } else {
    if (typeof attestation.reviewer !== "string"
      || normalizeAuditText(attestation.reviewer).length < 2
      || normalizeAuditText(attestation.reviewer).length > 120) {
      failures.push("CLAIMS-AUDIT.json reviewer identity is incomplete");
    }
    if (typeof attestation.completed_at !== "string"
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(attestation.completed_at)
      || Number.isNaN(Date.parse(attestation.completed_at))) {
      failures.push("CLAIMS-AUDIT.json completion time is not an exact UTC timestamp");
    }
    if (attestation.statement !== CLAIMS_AUDIT_ATTESTATION) {
      failures.push("CLAIMS-AUDIT.json human attestation statement drifted");
    }
  }
  const expectedIds = new Set(cases.cases.map((c) => c.id));
  for (const id of Object.keys(audit.drafts ?? {})) {
    if (!expectedIds.has(id)) failures.push(`${id}: unexpected audit row`);
  }
  for (const c of cases.cases) {
    const row = audit.drafts?.[c.id];
    if (!row) { failures.push(`${c.id}: missing audit row`); continue; }
    const rowFields = [
      "draft_sha256", "claims", "quoted_spans", "sentence_reviews",
      "claims_verified", "quotations_verified", "note",
    ];
    if (JSON.stringify(Object.keys(row).sort()) !== JSON.stringify([...rowFields].sort())) {
      failures.push(`${c.id}: audit row fields drifted`);
    }
    let expectedReviews = null;
    let expectedClaimsBySentence = null;
    let sourceTextBySentence = null;
    if (artifacts && runDir) {
      const artifact = artifacts.drafts?.[c.id];
      if (!artifact) {
        failures.push(`${c.id}: missing draft artifact for audit`);
      } else {
        if (row.draft_sha256 !== artifact.draft_sha256) failures.push(`${c.id}: audited draft hash drifted`);
        const canonicalSourcePath = join(runDir, "inputs", "sources", "drafts", `${c.id}.json`);
        const canonicalDisclosurePath = join(runDir, "inputs", "records", `${c.id}.json`);
        const canonicalAuditPath = join(runDir, "inputs", "audits", `${c.id}.json`);
        const expectedSourcePath = rel(canonicalSourcePath);
        const expectedDisclosurePath = existsSync(canonicalDisclosurePath) ? rel(canonicalDisclosurePath) : null;
        if (artifact.source !== expectedSourcePath
          || artifact.source_sha256 !== (existsSync(canonicalSourcePath) ? SHA(text(canonicalSourcePath)) : null)) {
          failures.push(`${c.id}: artifact source is not the canonical raw-derived source`);
        }
        if (artifact.disclosure !== expectedDisclosurePath
          || artifact.disclosure_sha256 !== (expectedDisclosurePath ? SHA(text(canonicalDisclosurePath)) : null)) {
          failures.push(`${c.id}: artifact disclosure is not the canonical raw-derived record`);
        }
        const disclosure = expectedDisclosurePath ? json(canonicalDisclosurePath) : null;
        const expectedClaims = disclosure?.claims ?? [];
        if (JSON.stringify(row.claims) !== JSON.stringify(expectedClaims)) failures.push(`${c.id}: audited claims drifted`);
        const draft = text(join(runDir, "inputs", "drafts", `${c.id}.txt`));
        const expectedQuotes = quotationAudit(draft, c.prompt);
        if (JSON.stringify(row.quoted_spans) !== JSON.stringify(expectedQuotes)) {
          failures.push(`${c.id}: audited quotations drifted`);
        }
        try {
          const canonicalSource = json(canonicalSourcePath);
          expectedReviews = sentenceReviewTemplate(canonicalSource);
          sourceTextBySentence = Object.fromEntries(
            sentenceRefs(canonicalSource).map((ref) => [ref.id, String(ref.text ?? "")]),
          );
          expectedClaimsBySentence = sentenceClaimInventory(
            canonicalSource, json(canonicalAuditPath), c.prompt,
          );
        } catch (error) {
          failures.push(`${c.id}: sentence review source cannot be reconstructed: ${error.message}`);
        }
      }
    }
    if (!Array.isArray(row.claims)) failures.push(`${c.id}: claims must be an array`);
    if (!Array.isArray(row.quoted_spans)) failures.push(`${c.id}: quoted_spans must be an array`);
    if (typeof row.note !== "string") failures.push(`${c.id}: note must be a string`);
    const reviews = Array.isArray(row.sentence_reviews) ? row.sentence_reviews : [];
    if (!Array.isArray(row.sentence_reviews)) failures.push(`${c.id}: sentence_reviews must be an array`);
    if (expectedReviews && reviews.length !== expectedReviews.length) {
      failures.push(`${c.id}: sentence review covers ${reviews.length} of ${expectedReviews.length} sentence units`);
    }
    const seenReviewIds = new Set();
    for (let index = 0; index < reviews.length; index += 1) {
      const review = reviews[index];
      const at = `${c.id}: sentence_reviews[${index}]`;
      const reviewFields = [
        "id", "text_sha256", "candidate_reasons", "decision",
        "claim_refs", "request_evidence", "sentence_evidence", "non_factual_basis", "note",
      ];
      if (!review || typeof review !== "object" || Array.isArray(review)
        || JSON.stringify(Object.keys(review).sort()) !== JSON.stringify([...reviewFields].sort())) {
        failures.push(`${at} fields drifted`);
        continue;
      }
      if (typeof review.id !== "string" || !/^p[1-9][0-9]*s[1-9][0-9]*$/.test(review.id)) {
        failures.push(`${at} has an invalid sentence id`);
      } else if (seenReviewIds.has(review.id)) {
        failures.push(`${at} duplicates ${review.id}`);
      }
      seenReviewIds.add(review.id);
      if (!/^[a-f0-9]{64}$/.test(review.text_sha256 ?? "")) failures.push(`${at} has an invalid text hash`);
      if (!Array.isArray(review.candidate_reasons)
        || review.candidate_reasons.some((reason) =>
          !FACTUAL_CANDIDATE_RULES.some((rule) => rule.id === reason))) {
        failures.push(`${at} has invalid candidate reasons`);
      }
      if (expectedReviews) {
        const expected = expectedReviews[index];
        if (review.id !== expected?.id || review.text_sha256 !== expected?.text_sha256
          || JSON.stringify(review.candidate_reasons) !== JSON.stringify(expected?.candidate_reasons)) {
          failures.push(`${at} does not reproduce from the immutable source sentence`);
        }
      }
      if (!SENTENCE_REVIEW_DECISIONS.includes(review.decision)) {
        failures.push(`${at} has no completed human decision`);
        continue;
      }
      if (!Array.isArray(review.claim_refs)
        || review.claim_refs.some((claim) => typeof claim !== "string" || !claim.trim())
        || new Set(review.claim_refs).size !== review.claim_refs.length) {
        failures.push(`${at} claim_refs must be unique non-empty strings`);
      }
      const claimRefs = Array.isArray(review.claim_refs) ? review.claim_refs : [];
      if (!Array.isArray(review.request_evidence)
        || review.request_evidence.some((evidence) => typeof evidence !== "string" || !evidence.trim())
        || new Set(review.request_evidence).size !== review.request_evidence.length
        || typeof review.sentence_evidence !== "string" || typeof review.note !== "string") {
        failures.push(`${at} evidence and note fields are invalid`);
        continue;
      }
      const requestEvidence = review.request_evidence;
      const sentenceEvidence = normalizeAuditText(review.sentence_evidence);
      if (review.decision === "request-supported") {
        if (claimRefs.length) failures.push(`${at} request-supported cannot cite public claims`);
        if (sentenceEvidence) failures.push(`${at} request-supported cannot cite sentence evidence`);
        if (review.non_factual_basis !== null) failures.push(`${at} request-supported cannot carry a non-factual basis`);
        if (!requestEvidence.length || requestEvidence.some((evidence) =>
          normalizeAuditText(evidence).length < 8
            || !normalizeAuditText(c.prompt).includes(normalizeAuditText(evidence)))) {
          failures.push(`${at} request evidence is not an exact supplied request span`);
        }
        const canonicalSentence = sourceTextBySentence?.[review.id] ?? "";
        if (canonicalSentence
          && sharedRequestSupportTerms(canonicalSentence, requestEvidence.join(" ")).length === 0) {
          failures.push(`${at} request evidence has no substantive lexical support for the sentence`);
        }
        if (normalizeAuditText(review.note).length < 32) {
          failures.push(`${at} request-supported needs a substantive independent rationale`);
        } else if (SEMANTIC_DEFERENCE.test(review.note)) {
          failures.push(`${at} request-supported rationale delegates semantic judgment to pipeline authority`);
        }
      } else if (review.decision === "listed-for-verification") {
        if (requestEvidence.length) failures.push(`${at} listed-for-verification cannot cite request evidence`);
        if (sentenceEvidence) failures.push(`${at} listed-for-verification cannot cite sentence evidence`);
        if (review.non_factual_basis !== null) failures.push(`${at} listed-for-verification cannot carry a non-factual basis`);
        if (!claimRefs.length) failures.push(`${at} listed-for-verification needs at least one claim ref`);
        if (expectedClaimsBySentence) {
          const expectedClaimRefs = expectedClaimsBySentence[review.id] ?? [];
          if (JSON.stringify([...claimRefs].sort()) !== JSON.stringify([...expectedClaimRefs].sort())) {
            failures.push(`${at} claim refs do not match the exact canonical sentence inventory`);
          }
        } else {
          const paragraph = /^p([1-9][0-9]*)s/.exec(review.id)?.[1];
          for (const claimRef of claimRefs) {
            if (!(row.claims ?? []).some((claim) =>
              claim?.claim === claimRef && claim?.where === `paragraph ${paragraph}`)) {
              failures.push(`${at} claim ref is not public and located in the same paragraph: ${claimRef}`);
            }
          }
        }
      } else if (review.decision === "non-factual") {
        if (claimRefs.length || requestEvidence.length) {
          failures.push(`${at} non-factual cannot cite request evidence or public claims`);
        }
        const canonicalSentence = normalizeAuditText(sourceTextBySentence?.[review.id] ?? "");
        if (!canonicalSentence || sentenceEvidence !== canonicalSentence) {
          failures.push(`${at} non-factual evidence must reproduce the complete canonical sentence`);
        }
        if (!NON_FACTUAL_BASES.includes(review.non_factual_basis)) {
          failures.push(`${at} non-factual decision needs one closed semantic basis`);
        }
        if (normalizeAuditText(review.note).length < 32) {
          failures.push(`${at} non-factual needs a substantive human rationale`);
        } else if (SEMANTIC_DEFERENCE.test(review.note)) {
          failures.push(`${at} non-factual rationale delegates semantic judgment to pipeline authority`);
        }
      } else if (review.decision === "requires-change") {
        failures.push(`${at} requires a draft or disclosure change`);
      }
    }
    for (const field of ["claims_verified", "quotations_verified"]) {
      if (row[field] !== true) failures.push(`${c.id}: ${field}`);
    }
  }
  return failures;
}

const ARTIFACT_PATH_KEYS = {
  profile: [
    "prompt", "raw", "source", "render", "markdown", "json",
    "raw_events", "raw_output", "recovered_from",
  ],
  draft: [
    "prompt", "raw", "original_source", "normalized_source",
    "initial_audit_prompt", "initial_audit_raw", "initial_audit",
    "initial_audit_raw_events", "initial_audit_raw_output", "initial_audit_recovered_from",
    "audit_prompt", "audit_raw", "audit", "source", "render_output", "draft", "disclosure",
    "audit_raw_events", "audit_raw_output", "audit_recovered_from",
    "raw_events", "raw_output", "recovered_from",
  ],
  refusal: ["prompt", "raw", "source", "render_output", "raw_events", "raw_output", "recovered_from"],
  critic: ["prompt", "raw", "source", "render", "raw_events", "raw_output", "recovered_from"],
  evidence: ["claims_audit", "structural", "tally", "score"],
};

function expectedCellEvidenceFiles(output, dispatch) {
  const paths = [resolve(output)];
  if (dispatch.harness !== "codex") return paths;
  paths.push(codexCompanion(output, "events.jsonl"), codexCompanion(output, "output.json"));
  if (existsSync(output)) {
    try {
      if (json(output).recovered_from !== null && json(output).recovered_from !== undefined) {
        paths.push(codexCompanion(output, "adapter-failure.json"));
      }
    } catch {
      // The result parser reports the malformed wrapper independently. Do not infer
      // an optional recovery file from bytes that are not a result object.
    }
  }
  return paths.map((path) => resolve(path));
}

function codexCompanionPathErrors(record, output) {
  if (record?.harness !== "codex") return [];
  const expected = {
    raw_events: rel(codexCompanion(output, "events.jsonl")),
    raw_output: rel(codexCompanion(output, "output.json")),
    recovered_from: record.recovered_from === null || record.recovered_from === undefined
      ? null : rel(codexCompanion(output, "adapter-failure.json")),
  };
  return CODEX_COMPANION_KEYS.flatMap((key) =>
    record[key] === expected[key]
      ? [] : [`${rel(output)} ${key} does not name its canonical companion`]);
}

function exactNamespaceErrors(root, expectedPaths, label) {
  const expected = new Set(expectedPaths.map((path) => relative(root, resolve(path))));
  const actual = new Set(filesUnder(root));
  return [
    ...[...expected].filter((file) => !actual.has(file))
      .map((file) => `raw namespace ${label} is missing expected file ${file}`),
    ...[...actual].filter((file) => !expected.has(file))
      .map((file) => `raw namespace ${label} has unexpected file ${file}`),
  ];
}

function acceptanceModelCells(runDir, manifest, cases) {
  const cells = [];
  const add = (output, stage) => cells.push({ output, dispatch: manifestDispatch(manifest, stage) });
  for (const profile of cases.profiles) {
    for (let render = 1; render <= profile.renders; render += 1) {
      add(join(runDir, "raw", "profiles", `${profile.id}-r${render}.json`), "profile");
    }
  }
  for (const c of cases.cases) {
    add(join(runDir, "raw", "drafts", `${c.id}.json`), "draft");
    add(join(runDir, "raw", "claim-audits", `${c.id}.json`), "claim_audit");
    for (let draw = 1; draw <= 3; draw += 1) {
      add(join(runDir, "critics", "raw", `${c.id}-d${draw}.json`), "critic");
    }
  }
  for (const c of cases.refusals) add(join(runDir, "raw", "refusals", `${c.id}.json`), "draft");
  return cells;
}

function allowedRunFiles(runDir, manifest, cases, phase = "final") {
  const afterProfiles = ["draft", "critic", "final"].includes(phase);
  const duringDrafts = ["draft", "critic", "final"].includes(phase);
  const afterDrafts = ["critic", "final"].includes(phase);
  const duringCritics = ["critic", "final"].includes(phase);
  const final = phase === "final";
  const allowed = new Set(["CASES.json", "DESIGN.md", "MANIFEST.json", "corpus.lock.json"]);
  if (afterProfiles) allowed.add("ARTIFACTS.json");
  if (afterDrafts) allowed.add("CLAIMS-AUDIT.json");
  if (final) for (const file of ["SCORE.json", "STRUCTURAL.json", "TALLY.json"]) allowed.add(file);
  const add = (path) => allowed.add(relative(runDir, resolve(path)));
  for (const agent of Object.values(manifest.agents ?? {})) add(resolve(REPO, agent.snapshot));
  for (const entry of Object.values(manifest.schemas?.profile ?? {})) add(resolve(REPO, entry.path));
  for (const stage of ["draft", "claim_audit", "critic"]) {
    if (manifest.schemas?.[stage]?.path) add(resolve(REPO, manifest.schemas[stage].path));
  }
  for (const profile of cases.profiles) {
    const corpus = manifest.corpora[profile.id];
    const staged = resolve(REPO, corpus.staged);
    add(join(staged, "measurements.json"));
    for (const name of ["profile.json", "voice.md"]) {
      if (existsSync(join(resolve(REPO, corpus.source), name))) add(join(staged, name));
    }
    for (const sample of corpus.lock.files) {
      add(join(staged, "corpus", "human", ...(sample.group ? [sample.group] : []), sample.file));
    }
    for (let render = 1; render <= profile.renders; render += 1) {
      const id = `${profile.id}-r${render}`;
      add(join(runDir, "prompts", "profiles", `${id}.md`));
      for (const path of expectedCellEvidenceFiles(
        join(runDir, "raw", "profiles", `${id}.json`), manifestDispatch(manifest, "profile"),
      )) add(path);
      if (afterProfiles) {
        add(join(runDir, "raw", `${id}.md`));
        for (const suffix of ["json", "md", "source.json"]) {
          add(join(runDir, "inputs", "profiles", profile.id, `r${render}.${suffix}`));
        }
      }
    }
  }
  if (duringDrafts) for (const c of cases.cases) {
    add(join(runDir, "prompts", "drafts", `${c.id}.md`));
    add(join(runDir, "prompts", "claim-audits", `${c.id}.md`));
    for (const path of expectedCellEvidenceFiles(
      join(runDir, "raw", "drafts", `${c.id}.json`), manifestDispatch(manifest, "draft"),
    )) add(path);
    for (const path of expectedCellEvidenceFiles(
      join(runDir, "raw", "claim-audits", `${c.id}.json`), manifestDispatch(manifest, "claim_audit"),
    )) add(path);
    if (afterDrafts) {
      for (const suffix of ["json", "original.json", "normalized.json"]) {
        add(join(runDir, "inputs", "sources", "drafts", `${c.id}.${suffix}`));
      }
      add(join(runDir, "inputs", "audits", `${c.id}.json`));
      add(join(runDir, "inputs", "audits", "initial", `${c.id}.json`));
      add(join(runDir, "inputs", "drafts", `${c.id}.txt`));
      add(join(runDir, "inputs", "records", `${c.id}.json`));
      add(join(runDir, "outputs", "drafts", `${c.id}.md`));
    }
    if (duringCritics) {
      const criticInput = join(runDir, "critics", "inputs", c.id);
      add(join(criticInput, "draft.txt"));
      const corpus = manifest.corpora[c.profile];
      for (const sample of corpus.lock.files) {
        add(join(criticInput, "corpus", ...(sample.group ? [sample.group] : []), sample.file));
      }
      for (let draw = 1; draw <= 3; draw += 1) {
        const id = `${c.id}-d${draw}`;
        add(join(runDir, "critics", "prompts", `${id}.md`));
        if (final) {
          add(join(runDir, "critics", "sources", `${id}.json`));
          add(join(runDir, "critics", "outputs", `${id}.md`));
        }
        for (const path of expectedCellEvidenceFiles(
          join(runDir, "critics", "raw", `${id}.json`), manifestDispatch(manifest, "critic"),
        )) add(path);
      }
    }
  }
  if (duringDrafts) for (const c of cases.refusals) {
    add(join(runDir, "prompts", "refusals", `${c.id}.md`));
    for (const path of expectedCellEvidenceFiles(
      join(runDir, "raw", "refusals", `${c.id}.json`), manifestDispatch(manifest, "draft"),
    )) add(path);
    if (afterDrafts) {
      add(join(runDir, "inputs", "sources", "refusals", `${c.id}.json`));
      add(join(runDir, "outputs", "refusals", `${c.id}.md`));
    }
  }
  return allowed;
}

function runNamespaceErrors(runDir, manifest, cases, phase = "final") {
  const allowed = allowedRunFiles(runDir, manifest, cases, phase);
  return filesUnder(runDir).filter((file) => !allowed.has(file))
    .map((file) => `raw namespace run has undeclared file ${file}`);
}

function committedCurrentError(path) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", rel(path)], { cwd: REPO, stdio: "ignore" });
    execFileSync("git", ["diff", "--quiet", "HEAD", "--", rel(path)], { cwd: REPO, stdio: "ignore" });
    return null;
  } catch {
    return `${rel(path)} must be committed unchanged before the next producer phase`;
  }
}

function existingDraftStageInputErrors(runDir, manifest, cases) {
  const errors = [];
  const dispatch = manifestDispatch(manifest, "draft");
  for (const c of [...cases.cases, ...cases.refusals.map((row) => ({ ...row, refusal: true }))]) {
    const promptPath = join(runDir, "prompts", c.refusal ? "refusals" : "drafts", `${c.id}.md`);
    if (existsSync(promptPath)) {
      const profileDir = join(runDir, "inputs", "profiles", c.profile);
      const expected = `${draftPrompt(
        c, text(join(profileDir, `r${c.render}.md`)), json(join(profileDir, `r${c.render}.json`)),
      )}\n`;
      if (text(promptPath) !== expected) errors.push(`${c.id} existing draft prompt is not canonical`);
    }
    if (c.refusal) continue;
    const auditPromptPath = join(runDir, "prompts", "claim-audits", `${c.id}.md`);
    if (!existsSync(auditPromptPath)) continue;
    try {
      const record = completedResult(join(runDir, "raw", "drafts", `${c.id}.json`), dispatch);
      const decoded = record ? semanticDraftSource(record) : { source: null };
      if (!decoded.source) throw new Error("draft source unavailable");
      const normalized = normalizeVoiceDraftSource(decoded.source, { request: c.prompt });
      if (!normalized.ok || normalized.refusal) throw new Error("draft source cannot produce an audit prompt");
      const expected = `${claimAuditPrompt(c, normalized.source)}\n`;
      if (text(auditPromptPath) !== expected) errors.push(`${c.id} existing claim-audit prompt is not canonical`);
    } catch (error) {
      errors.push(`${c.id} existing claim-audit prompt cannot be verified: ${error.message}`);
    }
  }
  return errors;
}

function existingCriticStageInputErrors(runDir, manifest, cases) {
  const errors = [];
  for (const c of cases.cases) {
    const inputDir = join(runDir, "critics", "inputs", c.id);
    const promptPaths = Array.from({ length: 3 }, (_, index) =>
      join(runDir, "critics", "prompts", `${c.id}-d${index + 1}.md`));
    const rawPaths = Array.from({ length: 3 }, (_, index) =>
      join(runDir, "critics", "raw", `${c.id}-d${index + 1}.json`));
    const started = existsSync(inputDir)
      || promptPaths.some((path) => existsSync(path))
      || rawPaths.some((path) => expectedCellEvidenceFiles(
        path, manifestDispatch(manifest, "critic"),
      ).some((evidence) => existsSync(evidence)));
    if (!started) continue;
    try {
      const expectedDraft = text(join(runDir, "inputs", "drafts", `${c.id}.txt`));
      const stagedCorpus = resolve(REPO, manifest.corpora[c.profile].staged, "corpus", "human");
      const corpusFiles = filesUnder(stagedCorpus);
      const actualCorpusFiles = filesUnder(join(inputDir, "corpus"));
      if (JSON.stringify(actualCorpusFiles) !== JSON.stringify(corpusFiles)) {
        errors.push(`${c.id} existing critic corpus file set is not canonical`);
      }
      for (const file of corpusFiles) {
        const actual = join(inputDir, "corpus", file);
        if (!existsSync(actual) || text(actual) !== text(join(stagedCorpus, file))) {
          errors.push(`${c.id} existing critic corpus input drifted: ${file}`);
        }
      }
      const draftPath = join(inputDir, "draft.txt");
      if (!existsSync(draftPath) || text(draftPath) !== expectedDraft) {
        errors.push(`${c.id} existing critic draft input is not canonical`);
      }
      const corpus = corpusFiles.map((file) => ({
        file, body: stripFrontmatter(text(join(stagedCorpus, file))),
      }));
      const expectedPrompt = `${criticPrompt(c.id, corpus, expectedDraft)}\n`;
      for (const promptPath of promptPaths) {
        if (!existsSync(promptPath) || text(promptPath) !== expectedPrompt) {
          errors.push(`${basename(promptPath)} existing critic prompt is not canonical`);
        }
      }
    } catch (error) {
      errors.push(`${c.id} existing critic inputs cannot be verified: ${error.message}`);
    }
  }
  return errors;
}

function dispatchPreflightErrors(runDir, manifest, cases, phase) {
  const errors = [
    ...runNamespaceErrors(runDir, manifest, cases, phase),
    ...retiredRepairEvidenceErrors(runDir),
  ];
  try { errors.push(...stagedInputErrors(runDir, manifest, cases)); } catch (error) {
    errors.push(`prepared input verification failed: ${error.message}`);
  }
  if (["draft", "critic"].includes(phase)) {
    const artifactCommitError = committedCurrentError(join(runDir, "ARTIFACTS.json"));
    if (artifactCommitError) errors.push(artifactCommitError);
    try { deriveProfileEvidence(runDir, manifest, cases); } catch (error) {
      errors.push(`profile producer state is not canonical: ${error.message}`);
    }
  }
  if (["draft", "critic"].includes(phase)) {
    errors.push(...existingDraftStageInputErrors(runDir, manifest, cases));
  }
  if (phase === "critic") {
    try { deriveDraftEvidence(runDir, manifest, cases); } catch (error) {
      errors.push(`draft producer state is not canonical: ${error.message}`);
    }
    const auditPath = join(runDir, "CLAIMS-AUDIT.json");
    const auditCommitError = committedCurrentError(auditPath);
    if (auditCommitError) errors.push(auditCommitError);
    try {
      errors.push(...claimsAuditFailures(json(auditPath), cases, json(join(runDir, "ARTIFACTS.json")), runDir));
    } catch (error) {
      errors.push(`claims audit producer state is not canonical: ${error.message}`);
    }
    errors.push(...existingCriticStageInputErrors(runDir, manifest, cases));
  }
  for (const { output, dispatch } of acceptanceModelCells(runDir, manifest, cases)) {
    const evidence = expectedCellEvidenceFiles(output, dispatch).filter((path) => existsSync(path));
    if (!evidence.length) continue;
    if (!existsSync(output)) {
      errors.push(`${rel(output)} has companion evidence without its canonical result; do not dispatch`);
      continue;
    }
    try {
      const record = json(output);
      const recoverable = dispatch.harness === "codex"
        && record.type === "result" && record.is_error === true
        && record.error === "codex emitted no final structured output"
        && existsSync(codexCompanion(output, "events.jsonl"));
      if (!recoverable) completedResult(output, dispatch);
    } catch (error) {
      errors.push(error.message);
    }
  }
  return errors;
}

function rawNamespaceErrors(runDir, manifest, cases) {
  const rawRoot = join(runDir, "raw");
  const expectedRaw = [];
  const profileDispatch = manifestDispatch(manifest, "profile");
  for (const profile of cases.profiles) {
    for (let render = 1; render <= profile.renders; render += 1) {
      const name = `${profile.id}-r${render}`;
      expectedRaw.push(join(rawRoot, `${name}.md`));
      expectedRaw.push(...expectedCellEvidenceFiles(join(rawRoot, "profiles", `${name}.json`), profileDispatch));
    }
  }
  const draftDispatch = manifestDispatch(manifest, "draft");
  for (const c of cases.cases) {
    expectedRaw.push(...expectedCellEvidenceFiles(join(rawRoot, "drafts", `${c.id}.json`), draftDispatch));
  }
  for (const c of cases.refusals) {
    expectedRaw.push(...expectedCellEvidenceFiles(join(rawRoot, "refusals", `${c.id}.json`), draftDispatch));
  }
  const auditDispatch = manifestDispatch(manifest, "claim_audit");
  for (const c of cases.cases) {
    expectedRaw.push(...expectedCellEvidenceFiles(join(rawRoot, "claim-audits", `${c.id}.json`), auditDispatch));
  }
  const criticRoot = join(runDir, "critics", "raw");
  const criticDispatch = manifestDispatch(manifest, "critic");
  const expectedCritics = cases.cases.flatMap((c) =>
    Array.from({ length: 3 }, (_, index) =>
      expectedCellEvidenceFiles(join(criticRoot, `${c.id}-d${index + 1}.json`), criticDispatch)).flat());
  return [
    ...exactNamespaceErrors(rawRoot, expectedRaw, "raw"),
    ...exactNamespaceErrors(criticRoot, expectedCritics, "critics/raw"),
    ...runNamespaceErrors(runDir, manifest, cases),
  ];
}

const LEGACY_REPAIR_ARTIFACT_KEYS = [
  "repair_prompt", "repair_raw", "repair_source",
  "repair_raw_events", "repair_raw_output", "repair_recovered_from",
];

function legacyRepairArtifactErrors(entry, label = "draft") {
  if (!entry || typeof entry !== "object") return [];
  if (Array.isArray(entry)) {
    return entry.flatMap((child, index) => legacyRepairArtifactErrors(child, `${label}[${index}]`));
  }
  const errors = [];
  for (const key of LEGACY_REPAIR_ARTIFACT_KEYS) {
    if (entry[key] !== null && entry[key] !== undefined) {
      errors.push(`${label}.${key} is forbidden under ${CLAIM_PIPELINE}`);
    }
    if (entry[`${key}_sha256`] !== null && entry[`${key}_sha256`] !== undefined) {
      errors.push(`${label}.${key}_sha256 is forbidden under ${CLAIM_PIPELINE}`);
    }
  }
  for (const [childKey, child] of Object.entries(entry)) {
    if (child && typeof child === "object") {
      errors.push(...legacyRepairArtifactErrors(child, `${label}.${childKey}`));
    }
  }
  return errors;
}

function artifactEntryHashErrors(entry, keys, label, runDir, optionalKeys = []) {
  const errors = [];
  const optional = new Set(optionalKeys);
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [`missing artifact record ${label}`];
  for (const key of keys) {
    const path = entry[key];
    const expected = entry[`${key}_sha256`];
    if (path === null || path === undefined) {
      if (expected !== null && expected !== undefined) errors.push(`${label}.${key} has a hash without a path`);
      else if (!optional.has(key)) errors.push(`${label}.${key} required path/hash pair is missing`);
      continue;
    }
    if (typeof path !== "string" || !path) {
      errors.push(`${label}.${key} path is invalid`);
      continue;
    }
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
      errors.push(`${label}.${key} has no valid recorded hash`);
      continue;
    }
    const target = resolve(REPO, path);
    const within = relative(runDir, target);
    if (within === "" || within.startsWith("..") || resolve(runDir, within) !== target) {
      errors.push(`${label}.${key} escapes the locked run directory`);
      continue;
    }
    if (!existsSync(target)) {
      errors.push(`missing artifact ${path}`);
    } else if (SHA(text(target)) !== expected) {
      errors.push(`${label}.${key} hash mismatch`);
    }
  }
  return errors;
}

function sameIds(actual, expected) {
  return JSON.stringify(Object.keys(actual ?? {}).sort()) === JSON.stringify([...expected].sort());
}

function artifactHashErrors(artifacts, runDir, cases, manifest) {
  const errors = [...rawNamespaceErrors(runDir, manifest, cases)];
  if (artifacts?.schema !== ARTIFACTS_SCHEMA) {
    return [...errors, "ARTIFACTS.json has the wrong schema"];
  }
  errors.push(...legacyRepairArtifactErrors(artifacts, "ARTIFACTS"));
  const profileIds = cases.profiles.map((p) => p.id);
  if (!sameIds(artifacts.profiles, profileIds)) errors.push("ARTIFACTS.json profile ids do not match CASES.json");
  if (!sameIds(artifacts.profile_stability, profileIds)) errors.push("ARTIFACTS.json stability ids do not match CASES.json");
  if (!sameIds(artifacts.drafts, cases.cases.map((c) => c.id))) errors.push("ARTIFACTS.json draft ids do not match CASES.json");
  if (!sameIds(artifacts.refusals, cases.refusals.map((c) => c.id))) errors.push("ARTIFACTS.json refusal ids do not match CASES.json");
  if (!sameIds(artifacts.critics, cases.cases.map((c) => c.id))) errors.push("ARTIFACTS.json critic ids do not match CASES.json");
  errors.push(...artifactEntryHashErrors(artifacts.evidence, ARTIFACT_PATH_KEYS.evidence, "evidence", runDir));
  for (const profile of cases.profiles) {
    const renders = artifacts.profiles?.[profile.id];
    const renderIds = Array.from({ length: profile.renders }, (_, index) => `r${index + 1}`);
    if (!sameIds(renders, renderIds)) {
      errors.push(`${profile.id} artifact renders do not match CASES.json`);
      continue;
    }
    for (const id of renderIds) {
      const optional = ["recovered_from"];
      if (manifestDispatch(manifest, "profile").harness !== "codex") {
        optional.push("raw_events", "raw_output");
      }
      errors.push(...artifactEntryHashErrors(
        renders[id], ARTIFACT_PATH_KEYS.profile, `profiles.${profile.id}.${id}`, runDir, optional,
      ));
    }
    try {
      const stability = analyzeProfileStability(renderIds.map((id) =>
        json(join(runDir, "inputs", "profiles", profile.id, `${id}.json`))));
      if (JSON.stringify(artifacts.profile_stability?.[profile.id]) !== JSON.stringify(stability)) {
        errors.push(`${profile.id} stability evidence does not reproduce from its canonical profiles`);
      }
    } catch (error) {
      errors.push(`${profile.id} stability evidence cannot be rederived: ${error.message}`);
    }
  }
  for (const c of cases.cases) {
    const draft = artifacts.drafts?.[c.id];
    let chain = null;
    try { chain = resolveDraftChain(runDir, manifest, c); } catch (error) {
      errors.push(`${c.id} draft chain cannot be resolved for artifact checking: ${error.message}`);
    }
    const optional = [
      "disclosure", "recovered_from",
      "initial_audit_recovered_from", "audit_recovered_from",
    ];
    if (!chain?.normalized) optional.push("normalized_source");
    if (!chain?.initialAudit) optional.push(
      "initial_audit_prompt", "initial_audit_raw", "initial_audit",
      "initial_audit_raw_events", "initial_audit_raw_output", "initial_audit_recovered_from",
    );
    if (manifestDispatch(manifest, "draft").harness !== "codex") optional.push("raw_events", "raw_output");
    if (manifestDispatch(manifest, "claim_audit").harness !== "codex") optional.push(
      "initial_audit_raw_events", "initial_audit_raw_output",
      "audit_raw_events", "audit_raw_output",
    );
    errors.push(...artifactEntryHashErrors(
      draft, ARTIFACT_PATH_KEYS.draft, `drafts.${c.id}`, runDir, optional,
    ));
    if (draft && (draft.profile !== c.profile || draft.render !== c.render || draft.request_sha256 !== SHA(c.prompt))) {
      errors.push(`drafts.${c.id} case provenance mismatch`);
    }
    if (draft && JSON.stringify(draft.removed_ledger_ids ?? []) !== JSON.stringify(chain?.removedLedgerIds ?? [])) {
      errors.push(`drafts.${c.id} deterministic ledger normalization drifted`);
    }
    const draws = artifacts.critics?.[c.id];
    const drawIds = Array.from({ length: 3 }, (_, index) => `d${index + 1}`);
    if (!sameIds(draws, drawIds)) {
      errors.push(`${c.id} critic draws are not exactly d1,d2,d3`);
      continue;
    }
    for (const id of drawIds) {
      const optional = ["recovered_from"];
      if (manifestDispatch(manifest, "critic").harness !== "codex") {
        optional.push("raw_events", "raw_output");
      }
      errors.push(...artifactEntryHashErrors(
        draws[id], ARTIFACT_PATH_KEYS.critic, `critics.${c.id}.${id}`, runDir, optional,
      ));
    }
  }
  for (const c of cases.refusals) {
    const optional = ["recovered_from"];
    if (manifestDispatch(manifest, "draft").harness !== "codex") optional.push("raw_events", "raw_output");
    errors.push(...artifactEntryHashErrors(
      artifacts.refusals?.[c.id], ARTIFACT_PATH_KEYS.refusal, `refusals.${c.id}`, runDir, optional,
    ));
  }
  return errors;
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
    "",
    "Return voice-critic-source/1 as one structured object. Do not format markdown",
    "markers or a closing token; the deterministic transport owns those. Preserve the",
    "system critic's substantive judgment exactly: each finding supplies location, what,",
    "corpus_evidence, and confidence; verdict remains your independent CLEAN or REVISE",
    "judgment and is not derived from the finding count.",
    `Use only these clean category ids: ${CRITIC_CATEGORIES.join(", ")}.`,
    "No deterministic rhythm scan was supplied, so rhythm_assessed is false and",
    "rhythm_note states that category 4 was not assessed.",
  ].join("\n");
}

async function dispatchCritics(runDir) {
  const { p, manifest, cases } = loadPrepared(runDir);
  const preflightErrors = dispatchPreflightErrors(runDir, manifest, cases, "critic");
  if (preflightErrors.length) {
    die(`acceptance evidence preflight failed; no critic calls were made:\n    ${preflightErrors.join("\n    ")}`);
  }
  const dispatch = manifestDispatch(manifest, "critic");
  collectDrafts(runDir);
  const artifacts = json(join(runDir, "ARTIFACTS.json"));
  const claimsAudit = json(p.audit);
  const auditFailures = claimsAuditFailures(
    claimsAudit, cases, artifacts, runDir,
  );
  if (auditFailures.length) {
    die(`claims audit incomplete; no critic calls were made:\n    ${auditFailures.join("\n    ")}`);
  }
  const auditAnchor = immutableFirstAddAnchor(p.audit);
  if (auditAnchor.error) {
    die(`completed claims audit must be committed unchanged before critic calls: ${auditAnchor.error}`);
  }
  const prerequisites = {
    claims_audit_sha256: auditAnchor.sha256,
    claims_audit_commit: auditAnchor.commit,
  };
  const system = resolve(REPO, manifest.agents.critic.snapshot);
  const criticSchema = manifestStageSchema(manifest, "critic", CRITIC_SOURCE_SCHEMA);
  const jobs = [];
  for (const c of cases.cases) {
    const inputDir = join(runDir, "critics", "inputs", c.id);
    if (!existsSync(inputDir)) {
      const stagedCorpus = resolve(REPO, manifest.corpora[c.profile].staged, "corpus", "human");
      cpSync(stagedCorpus, join(inputDir, "corpus"), { recursive: true });
      cpSync(join(runDir, "inputs", "drafts", `${c.id}.txt`), join(inputDir, "draft.txt"));
    }
    const corpusFiles = filesUnder(join(inputDir, "corpus"));
    const corpus = corpusFiles.map((file) => ({
      file,
      body: stripFrontmatter(text(join(inputDir, "corpus", file))),
    }));
    for (let draw = 1; draw <= 3; draw += 1) {
      const promptPath = join(runDir, "critics", "prompts", `${c.id}-d${draw}.md`);
      const prompt = stagePrompt(promptPath, criticPrompt(c.id, corpus, text(join(inputDir, "draft.txt"))));
      jobs.push({
        id: `${c.id}-d${draw}`,
        run: () => dispatchModel({
          system, cwd: inputDir, prompt, dispatch,
          schema: criticSchema.schema, schemaPath: criticSchema.path,
          noToolsConfig: manifest.codex_no_tools_config, prerequisites,
          output: join(runDir, "critics", "raw", `${c.id}-d${draw}.json`),
        }),
      });
    }
  }
  await pool("critic", jobs, manifest.concurrency);
  process.stdout.write("\n  dispatched sixty fresh critic draws bound to the committed human audit; run collect\n\n");
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

function refusalGatePasses(runDir, manifest, cases) {
  const dispatch = manifestDispatch(manifest, "draft");
  return cases.refusals.every((c) => {
    try {
      const record = completedResult(join(runDir, "raw", "refusals", `${c.id}.json`), dispatch);
      if (!record) return false;
      const decoded = semanticDraftSource(record);
      if (!decoded.source) return false;
      const assembled = assembleVoiceDraft(decoded.source, { request: c.prompt });
      if (!assembled.ok || !assembled.refusal) return false;
      const validation = validateDraft(parseDraft(assembled.output));
      return validation.ok && validation.refusal;
    } catch {
      return false;
    }
  });
}

function requireCanonical(path, expected, label) {
  if (!existsSync(path)) throw new Error(`${label} is missing`);
  if (text(path) !== expected) throw new Error(`${label} does not reproduce from immutable raw results`);
}

function deriveProfileEvidence(runDir, manifest, cases) {
  const dispatch = manifestDispatch(manifest, "profile");
  const profileMeta = {};
  const stability = {};
  for (const profile of cases.profiles) {
    const measurements = manifest.corpora[profile.id].measurements;
    const byId = new Map(measurements.measurements.map((m) => [m.id, m]));
    const expectedSamples = manifest.corpora[profile.id].lock.files.map((f) => f.file).sort();
    const stabilityRenders = [];
    profileMeta[profile.id] = {};
    for (let render = 1; render <= profile.renders; render += 1) {
      const id = `${profile.id}-r${render}`;
      const rawPath = join(runDir, "raw", "profiles", `${id}.json`);
      const record = completedResult(rawPath, dispatch);
      if (!record) throw new Error(`missing profile result ${id}`);
      const decoded = semanticSource(record);
      if (!decoded.source) throw new Error(`${id} source transport failed: ${decoded.error}`);
      if (decoded.repairs !== 0) throw new Error(`${id} source required transport repair`);
      const assembled = assembleVoiceProfile(decoded.source, {
        profile: profile.id,
        measurements,
        samples_used: expectedSamples,
        samples_excluded: measurements.samples_excluded ?? [],
      });
      if (!assembled.ok || assembled.refusal) {
        throw new Error(`${id} source assembly failed: ${assembled.errors.join("; ")}`);
      }
      const parsed = { json: assembled.profile, markdown: assembled.profile.profile_markdown };
      const validation = validateVoiceProfile(parsed.json, parsed.markdown);
      if (!validation.ok || validation.refusal) throw new Error(`${id} invalid: ${validation.errors.join("; ")}`);
      const bandFindings = checkFrequencyAgainstRate(
        parsed.markdown, parsed.json, measurements.corpus_words / expectedSamples.length,
      );
      if (bandFindings.length) throw new Error(`${id} measured frequency diverges`);
      if (parsed.json.schema !== PROFILE_SCHEMA || parsed.json.corpus_words !== measurements.corpus_words) {
        throw new Error(`${id} deterministic profile identity diverges`);
      }
      for (const observation of parsed.json.observations) {
        if (!observation.rate) continue;
        const measurementId = observation.rate.counting_rule.match(/\[measurement:([a-z0-9-]+)\]/)?.[1];
        const measured = byId.get(measurementId);
        if (!measured || measured.count !== observation.rate.count
          || Math.abs(measured.per_1000_words - observation.rate.per_1000_words) > 0.01) {
          throw new Error(`${id} independently measured rate diverges`);
        }
      }
      if (JSON.stringify([...parsed.json.samples_used].sort()) !== JSON.stringify(expectedSamples)) {
        throw new Error(`${id} samples_used differs from its corpus lock`);
      }
      const coverage = analyzeParagraphCoverage(parsed.markdown);
      if (coverage.some((row) => row.status === "absent")) throw new Error(`${id} silently omits coverage`);
      const recount = crossCount(sourceProfile(profile), parsed.markdown);
      if (recount.some((row) => row.status === "DIVERGES")) throw new Error(`${id} independent recount diverges`);
      const outDir = join(runDir, "inputs", "profiles", profile.id);
      requireCanonical(join(outDir, `r${render}.source.json`), `${JSON.stringify(decoded.source, null, 2)}\n`, `${id} source`);
      requireCanonical(join(outDir, `r${render}.md`), `${parsed.markdown.trim()}\n`, `${id} markdown`);
      requireCanonical(join(outDir, `r${render}.json`), `${JSON.stringify(parsed.json, null, 2)}\n`, `${id} profile JSON`);
      requireCanonical(
        join(runDir, "raw", `${id}.md`),
        `\`\`\`json\n${JSON.stringify(parsed.json, null, 2)}\n\`\`\`\n`,
        `${id} canonical render`,
      );
      profileMeta[profile.id][`r${render}`] = { transport_repairs: decoded.repairs, coverage, recount };
      stabilityRenders.push(parsed.json);
    }
    stability[profile.id] = analyzeProfileStability(stabilityRenders);
    if (!stability[profile.id].ok) throw new Error(`${profile.id} k=3 stability failed`);
  }
  return { profileMeta, stability };
}

function deriveDraftEvidence(runDir, manifest, cases) {
  const draftDispatch = manifestDispatch(manifest, "draft");
  const drafts = {};
  const refusals = {};
  for (const c of cases.cases) {
    const chain = resolveDraftChain(runDir, manifest, c);
    const assembled = assembleVoiceDraft(chain.finalSource, {
      request: c.prompt, auditClaims: chain.auditClaims,
    });
    if (!assembled.ok) throw new Error(`${c.id} raw draft assembly failed: ${assembled.errors.join("; ")}`);
    const parsed = parseDraft(assembled.output);
    const validation = validateDraft(parsed);
    if (!validation.ok || validation.refusal) throw new Error(`${c.id} reconstructed draft is invalid`);
    requireCanonical(
      join(runDir, "inputs", "sources", "drafts", `${c.id}.original.json`),
      `${JSON.stringify(chain.originalSource, null, 2)}\n`, `${c.id} original source`,
    );
    const normalizedPath = join(runDir, "inputs", "sources", "drafts", `${c.id}.normalized.json`);
    if (chain.normalized) {
      requireCanonical(
        normalizedPath,
        `${JSON.stringify(chain.normalizedSource, null, 2)}\n`, `${c.id} normalized source`,
      );
    } else if (existsSync(normalizedPath)) {
      throw new Error(`${c.id} has a stale canonical normalized source`);
    }
    if (chain.initialAudit) {
      requireCanonical(
        join(runDir, "inputs", "audits", "initial", `${c.id}.json`),
        `${JSON.stringify(chain.initialAudit, null, 2)}\n`, `${c.id} initial audit`,
      );
    } else if (existsSync(join(runDir, "inputs", "audits", "initial", `${c.id}.json`))) {
      throw new Error(`${c.id} has a stale canonical initial audit`);
    }
    requireCanonical(
      join(runDir, "inputs", "audits", `${c.id}.json`),
      `${JSON.stringify(chain.finalAudit, null, 2)}\n`, `${c.id} applied audit`,
    );
    requireCanonical(
      join(runDir, "inputs", "sources", "drafts", `${c.id}.json`),
      `${JSON.stringify(chain.finalSource, null, 2)}\n`, `${c.id} audited source`,
    );
    requireCanonical(join(runDir, "outputs", "drafts", `${c.id}.md`), assembled.output, `${c.id} assembled output`);
    const draftBody = `${parsed.draft.trim()}\n`;
    requireCanonical(join(runDir, "inputs", "drafts", `${c.id}.txt`), draftBody, `${c.id} critic draft`);
    const disclosurePath = join(runDir, "inputs", "records", `${c.id}.json`);
    if (parsed.hadJsonFence) {
      requireCanonical(disclosurePath, `${JSON.stringify(parsed.json, null, 2)}\n`, `${c.id} disclosure`);
    } else if (existsSync(disclosurePath)) {
      throw new Error(`${c.id} has a stale disclosure absent from raw assembly`);
    }
    drafts[c.id] = draftBody;
  }
  for (const c of cases.refusals) {
    const rawPath = join(runDir, "raw", "refusals", `${c.id}.json`);
    const record = completedResult(rawPath, draftDispatch);
    if (!record) throw new Error(`missing refusal result ${c.id}`);
    const decoded = semanticDraftSource(record);
    if (!decoded.source) throw new Error(`${c.id} invalid raw refusal source: ${decoded.error}`);
    const assembled = assembleVoiceDraft(decoded.source, { request: c.prompt });
    if (!assembled.ok) throw new Error(`${c.id} raw refusal assembly failed: ${assembled.errors.join("; ")}`);
    const parsed = parseDraft(assembled.output);
    const validation = validateDraft(parsed);
    if (!validation.ok || !validation.refusal) throw new Error(`${c.id} reconstructed refusal is invalid`);
    requireCanonical(
      join(runDir, "inputs", "sources", "refusals", `${c.id}.json`),
      `${JSON.stringify(decoded.source, null, 2)}\n`, `${c.id} refusal source`,
    );
    requireCanonical(join(runDir, "outputs", "refusals", `${c.id}.md`), assembled.output, `${c.id} refusal output`);
    refusals[c.id] = parsed.json.refused;
  }
  return { drafts, refusals };
}

function structuralGates(runDir, manifest, cases, draftEvidence = null) {
  const rows = [];
  for (const c of cases.cases) {
    const draft = draftEvidence?.drafts?.[c.id]
      ?? text(join(runDir, "inputs", "drafts", `${c.id}.txt`));
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
  const refusals = draftEvidence
    ? cases.refusals.every((c) => typeof draftEvidence.refusals[c.id] === "string" && draftEvidence.refusals[c.id])
    : refusalGatePasses(runDir, manifest, cases);
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

function deriveCriticEvidence(runDir, manifest, cases, {
  writeCanonical = false, deferCanonical = false,
} = {}) {
  const dispatch = manifestDispatch(manifest, "critic");
  const drafts = [];
  const critics = {};
  let contractFailures = 0;
  for (const c of cases.cases) {
    const verdicts = [];
    const findings = [];
    critics[c.id] = {};
    for (let draw = 1; draw <= 3; draw += 1) {
      const id = `${c.id}-d${draw}`;
      const rawPath = join(runDir, "critics", "raw", `${id}.json`);
      const promptPath = join(runDir, "critics", "prompts", `${id}.md`);
      const record = completedResult(rawPath, dispatch);
      if (!record) throw new Error(`missing critic draw ${id}`);
      const decoded = semanticCriticSource(record);
      if (!decoded.source) throw new Error(`${id} invalid semantic critic source: ${decoded.error}`);
      const assembled = assembleVoiceCritic(decoded.source, { rhythmScanSupplied: false });
      if (!assembled.ok) throw new Error(`${id} invalid semantic critic source: ${assembled.errors.join("; ")}`);
      const sourcePath = join(runDir, "critics", "sources", `${id}.json`);
      const renderPath = join(runDir, "critics", "outputs", `${id}.md`);
      const sourceBody = `${JSON.stringify(decoded.source, null, 2)}\n`;
      if (writeCanonical) {
        write(sourcePath, decoded.source);
        write(renderPath, assembled.output);
      } else if (!deferCanonical) {
        if (!existsSync(sourcePath) || text(sourcePath) !== sourceBody) {
          throw new Error(`${id} canonical critic source does not reproduce from raw`);
        }
        if (!existsSync(renderPath) || text(renderPath) !== assembled.output) {
          throw new Error(`${id} canonical critic render does not reproduce from raw`);
        }
      }
      const derived = deriveCritic(assembled.output);
      if (!derived.verdict) throw new Error(`${id} has no closing CLEAN/REVISE verdict`);
      if (derived.verdict !== decoded.source.verdict || derived.findings !== decoded.source.findings.length) {
        throw new Error(`${id} deterministic critic assembly diverged from its semantic source`);
      }
      if (derived.uncited || derived.authorship_claims) contractFailures += 1;
      verdicts.push(derived.verdict);
      findings.push(derived.findings);
      critics[c.id][`d${draw}`] = {
        prompt: rel(promptPath), prompt_sha256: SHA(text(promptPath)),
        raw: rel(rawPath), raw_sha256: SHA(text(rawPath)),
        source: rel(sourcePath), source_sha256: SHA(sourceBody),
        render: rel(renderPath), render_sha256: SHA(assembled.output),
        ...codexCompanionArtifactFields(record),
        ...derived,
      };
    }
    drafts.push({ id: c.id, topic: c.topic, verdicts, findings });
  }
  if (contractFailures) throw new Error(`${contractFailures} critic draws violate the citation/authorship contract`);
  return { drafts, critics };
}

function deriveAcceptanceEvidence(runDir, manifest, cases, options = {}) {
  const critic = deriveCriticEvidence(runDir, manifest, cases, options);
  const draftEvidence = deriveDraftEvidence(runDir, manifest, cases);
  const structural = structuralGates(runDir, manifest, cases, draftEvidence);
  const tally = {
    schema: "prose-author-generator-tally/1",
    run: basename(runDir),
    drafts: critic.drafts,
    structural_gates: structural.gates,
  };
  return { ...critic, structural, tally, score: scoreRun(tally) };
}

function dispatchProvenanceErrors(runDir, manifest, cases) {
  const errors = [];
  const expected = [];
  const profileDispatch = manifestDispatch(manifest, "profile");
  const profileSystem = resolve(REPO, manifest.agents.profile.snapshot);
  for (const profile of cases.profiles) {
    const profileSchema = manifestStageSchema(
      manifest, "profile", sourceRenderSchema(manifest.corpora[profile.id].measurements),
      { profileId: profile.id },
    );
    for (let render = 1; render <= profile.renders; render += 1) {
      const promptPath = join(runDir, "prompts", "profiles", `${profile.id}-r${render}.md`);
      expected.push({
        path: join(runDir, "raw", "profiles", `${profile.id}-r${render}.json`),
        dispatch: profileDispatch,
        input: invocationInput(profileSystem, text(promptPath), schemaInvocation(profileDispatch, profileSchema)),
      });
    }
  }
  const draftDispatch = manifestDispatch(manifest, "draft");
  const draftSystem = resolve(REPO, manifest.agents.draft.snapshot);
  const draftSchema = manifestStageSchema(manifest, "draft", DRAFT_SOURCE_SCHEMA);
  for (const c of cases.cases) {
    const promptPath = join(runDir, "prompts", "drafts", `${c.id}.md`);
    expected.push({
      path: join(runDir, "raw", "drafts", `${c.id}.json`), dispatch: draftDispatch,
      input: invocationInput(draftSystem, text(promptPath), schemaInvocation(draftDispatch, draftSchema)),
    });
  }
  for (const c of cases.refusals) {
    const promptPath = join(runDir, "prompts", "refusals", `${c.id}.md`);
    expected.push({
      path: join(runDir, "raw", "refusals", `${c.id}.json`), dispatch: draftDispatch,
      input: invocationInput(draftSystem, text(promptPath), schemaInvocation(draftDispatch, draftSchema)),
    });
  }
  const auditDispatch = manifestDispatch(manifest, "claim_audit");
  const auditSystem = resolve(REPO, manifest.agents.claim_audit.snapshot);
  let auditSchema;
  try {
    const schema = manifestClaimAuditSchema(manifest);
    auditSchema = manifestStageSchema(
      manifest, "claim_audit", schema, { id: DRAFT_AUDIT_SCHEMA_ID },
    );
  } catch (error) {
    errors.push(error.message);
    auditSchema = null;
  }
  for (const c of cases.cases) {
    try {
      const chain = resolveDraftChain(runDir, manifest, c);
      if (chain.initialAudit) {
        const promptPath = join(runDir, "prompts", "claim-audits", `${c.id}.md`);
        expected.push({
          path: join(runDir, "raw", "claim-audits", `${c.id}.json`), dispatch: auditDispatch,
          input: invocationInput(auditSystem, text(promptPath), schemaInvocation(auditDispatch, auditSchema)),
        });
      }
    } catch (error) {
      errors.push(`${c.id} conditional claim provenance cannot be resolved: ${error.message}`);
    }
  }
  const criticDispatch = manifestDispatch(manifest, "critic");
  const criticSystem = resolve(REPO, manifest.agents.critic.snapshot);
  const criticSchema = manifestStageSchema(manifest, "critic", CRITIC_SOURCE_SCHEMA);
  const auditAnchor = immutableFirstAddAnchor(join(runDir, "CLAIMS-AUDIT.json"));
  if (auditAnchor.error) errors.push(`claims audit is not an immutable pre-critic anchor: ${auditAnchor.error}`);
  const criticPrerequisites = auditAnchor.error ? null : {
    claims_audit_sha256: auditAnchor.sha256,
    claims_audit_commit: auditAnchor.commit,
  };
  for (const c of cases.cases) {
    for (let draw = 1; draw <= 3; draw += 1) {
      const promptPath = join(runDir, "critics", "prompts", `${c.id}-d${draw}.md`);
      expected.push({
        path: join(runDir, "critics", "raw", `${c.id}-d${draw}.json`), dispatch: criticDispatch,
        input: invocationInput(criticSystem, text(promptPath), {
          ...schemaInvocation(criticDispatch, criticSchema),
          prerequisites: criticPrerequisites,
        }),
        prerequisiteCommit: auditAnchor.error ? null : auditAnchor.commit,
      });
    }
  }
  for (const item of expected) {
    try {
      const record = completedResult(item.path, item.dispatch, item.input);
      if (!record) {
        errors.push(`missing model result ${rel(item.path)}`);
        continue;
      }
      const evidencePaths = [resolve(item.path), ...codexCompanionEvidencePaths(record)];
      for (const evidencePath of evidencePaths) {
        if (item.prerequisiteCommit) {
          const orderError = strictlyCommittedAfter(evidencePath, item.prerequisiteCommit);
          if (orderError) {
            errors.push(`${rel(evidencePath)} is not immutable evidence after its claims audit: ${orderError}`);
          }
        } else {
          const anchor = immutableFirstAddAnchor(evidencePath);
          if (anchor.error) errors.push(`${rel(evidencePath)} is not immutable model evidence: ${anchor.error}`);
        }
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  return errors;
}

function stagedInputErrors(runDir, manifest, cases) {
  const errors = [];
  const lockPath = join(runDir, "corpus.lock.json");
  if (!existsSync(lockPath) || SHA(text(lockPath)) !== manifest.corpus_lock_sha256) {
    errors.push("corpus.lock.json changed after prepare");
  }
  for (const profile of cases.profiles) {
    const source = sourceProfile(profile);
    const staged = resolve(REPO, manifest.corpora[profile.id].staged);
    const within = relative(runDir, staged);
    if (within === "" || within.startsWith("..") || resolve(runDir, within) !== staged) {
      errors.push(`${profile.id} staged corpus escapes the locked run directory`);
      continue;
    }
    const expected = new Map();
    for (const sample of manifest.corpora[profile.id].lock.files) {
      const path = sampleRelativePath(sample);
      const from = join(source, path);
      const raw = text(from);
      const frontmatter = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)?.[0] ?? "";
      expected.set(path, `${frontmatter}${bodyOf(raw).trim()}\n`);
    }
    expected.set("measurements.json", `${JSON.stringify(manifest.corpora[profile.id].measurements, null, 2)}\n`);
    for (const file of ["profile.json", "voice.md"]) {
      if (existsSync(join(source, file))) expected.set(file, text(join(source, file)));
    }
    const actualFiles = filesUnder(staged);
    if (JSON.stringify(actualFiles) !== JSON.stringify([...expected.keys()].sort())) {
      errors.push(`${profile.id} staged file set drifted`);
    }
    for (const [file, expectedBody] of expected) {
      const target = join(staged, file);
      if (!existsSync(target) || text(target) !== expectedBody) errors.push(`${profile.id} staged input drifted: ${file}`);
    }
    for (let render = 1; render <= profile.renders; render += 1) {
      const promptPath = join(runDir, "prompts", "profiles", `${profile.id}-r${render}.md`);
      if (!existsSync(promptPath) || text(promptPath) !== expectedProfilePrompt(manifest, profile.id)) {
        errors.push(`${profile.id}-r${render} profile prompt does not reproduce from locked inputs`);
      }
    }
  }
  return errors;
}

function promptDerivationErrors(runDir, manifest, cases) {
  const errors = [];
  const draftDispatch = manifestDispatch(manifest, "draft");
  for (const c of [...cases.cases, ...cases.refusals.map((row) => ({ ...row, refusal: true }))]) {
    const profileDir = join(runDir, "inputs", "profiles", c.profile);
    const expected = `${draftPrompt(
      c, text(join(profileDir, `r${c.render}.md`)), json(join(profileDir, `r${c.render}.json`)),
    )}\n`;
    const promptPath = join(runDir, "prompts", c.refusal ? "refusals" : "drafts", `${c.id}.md`);
    if (!existsSync(promptPath) || text(promptPath) !== expected) {
      errors.push(`${c.id} draft prompt does not reproduce from its locked request and profile`);
    }
  }
  for (const c of cases.cases) {
    try {
      const rawPath = join(runDir, "raw", "drafts", `${c.id}.json`);
      const record = completedResult(rawPath, draftDispatch);
      const decoded = record ? semanticDraftSource(record) : { source: null };
      if (!decoded.source) throw new Error("draft source unavailable");
      const chain = resolveDraftChain(runDir, manifest, c);
      const initialAuditPromptPath = join(runDir, "prompts", "claim-audits", `${c.id}.md`);
      if (chain.initialAudit) {
        const expectedAudit = `${claimAuditPrompt(c, chain.normalizedSource)}\n`;
        if (!existsSync(initialAuditPromptPath) || text(initialAuditPromptPath) !== expectedAudit) {
          errors.push(`${c.id} initial claim-audit prompt does not reproduce from the raw draft`);
        }
      } else if (existsSync(initialAuditPromptPath)) {
        errors.push(`${c.id} has a stale initial claim-audit prompt`);
      }
      const inputDir = join(runDir, "critics", "inputs", c.id);
      const expectedDraft = text(join(runDir, "inputs", "drafts", `${c.id}.txt`));
      if (!existsSync(join(inputDir, "draft.txt")) || text(join(inputDir, "draft.txt")) !== expectedDraft) {
        errors.push(`${c.id} critic draft input drifted`);
      }
      const stagedCorpus = resolve(REPO, manifest.corpora[c.profile].staged, "corpus", "human");
      const expectedCorpusFiles = filesUnder(stagedCorpus);
      const actualCorpusFiles = filesUnder(join(inputDir, "corpus"));
      if (JSON.stringify(actualCorpusFiles) !== JSON.stringify(expectedCorpusFiles)) {
        errors.push(`${c.id} critic corpus file set drifted`);
      }
      for (const file of expectedCorpusFiles) {
        const actual = join(inputDir, "corpus", file);
        if (!existsSync(actual) || text(actual) !== text(join(stagedCorpus, file))) {
          errors.push(`${c.id} critic corpus input drifted: ${file}`);
        }
      }
      const corpus = expectedCorpusFiles.map((file) => ({
        file, body: stripFrontmatter(text(join(stagedCorpus, file))),
      }));
      const expectedCritic = `${criticPrompt(c.id, corpus, expectedDraft)}\n`;
      for (let draw = 1; draw <= 3; draw += 1) {
        const criticPromptPath = join(runDir, "critics", "prompts", `${c.id}-d${draw}.md`);
        if (!existsSync(criticPromptPath) || text(criticPromptPath) !== expectedCritic) {
          errors.push(`${c.id}-d${draw} critic prompt does not reproduce from locked inputs`);
        }
      }
    } catch (error) {
      errors.push(`${c.id} prompt provenance cannot be verified: ${error.message}`);
    }
  }
  return errors;
}

function collect(runDir) {
  const { manifest, cases, p } = loadPrepared(runDir);
  const preflightErrors = dispatchPreflightErrors(runDir, manifest, cases, "critic");
  if (preflightErrors.length) {
    die(`acceptance finalization preflight failed; no files were written:\n    ${preflightErrors.join("\n    ")}`);
  }
  const audit = json(p.audit);
  const artifacts = json(p.artifacts);
  const auditFailures = claimsAuditFailures(audit, cases, artifacts, runDir);
  if (auditFailures.length) die(`claims audit incomplete:\n    ${auditFailures.join("\n    ")}`);
  const evidence = deriveAcceptanceEvidence(runDir, manifest, cases, { deferCanonical: true });
  const materializedCritics = deriveCriticEvidence(runDir, manifest, cases, { writeCanonical: true });
  if (JSON.stringify(materializedCritics) !== JSON.stringify({
    drafts: evidence.drafts, critics: evidence.critics,
  })) die("critic evidence changed between read-only finalization and materialization");
  artifacts.critics = evidence.critics;
  write(p.structural, evidence.structural);
  write(p.tally, evidence.tally);
  write(p.score, evidence.score);
  artifacts.evidence = {
    claims_audit: rel(p.audit), claims_audit_sha256: SHA(text(p.audit)),
    structural: rel(p.structural), structural_sha256: SHA(text(p.structural)),
    tally: rel(p.tally), tally_sha256: SHA(text(p.tally)),
    score: rel(p.score), score_sha256: SHA(text(p.score)),
  };
  write(p.artifacts, artifacts);
  process.stdout.write(`\n  drafts passing locked bar: ${evidence.score.passed} of ${evidence.score.of}\n`);
  process.stdout.write(`  structural gates: ${evidence.score.gateFailures.length ? `FAIL ${evidence.score.gateFailures.join(", ")}` : "all pass"}\n\n`);
  process.exitCode = evidence.score.clears ? 0 : 1;
}

function check(runDir) {
  const { manifest, cases, p } = loadPrepared(runDir);
  const errors = [];
  if (SHA(text(p.design)) !== manifest.design_sha256) errors.push("DESIGN.md changed after prepare");
  if (SHA(text(p.cases)) !== manifest.cases_sha256) errors.push("CASES.json changed after prepare");
  errors.push(...lockedImplementationErrors(manifest));
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
    errors.push(...stagedInputErrors(runDir, manifest, cases));
  } catch (error) {
    errors.push(`staged inputs cannot be verified: ${error.message}`);
  }
  if (STAGES.some((stage) => manifestDispatch(manifest, stage).harness === "codex")) {
    if (JSON.stringify(manifest.codex_no_tools_config) !== JSON.stringify(CODEX_NO_TOOLS_CONFIG)) {
      errors.push("Codex no-tools configuration changed after prepare");
    }
    try {
      manifestStageSchema(manifest, "draft", DRAFT_SOURCE_SCHEMA);
      manifestStageSchema(manifest, "critic", CRITIC_SOURCE_SCHEMA);
      manifestClaimAuditSchema(manifest);
      for (const profile of cases.profiles) {
        manifestStageSchema(
          manifest, "profile", sourceRenderSchema(manifest.corpora[profile.id].measurements),
          { profileId: profile.id },
        );
      }
    } catch (error) {
      errors.push(`locked Codex stage schema is invalid: ${error.message}`);
    }
  }
  try {
    const preparedTree = execFileSync("git", ["rev-parse", `${manifest.prepared_commit}^{tree}`], { cwd: REPO, encoding: "utf8" }).trim();
    if (!preparedTree) errors.push("prepared commit is not resolvable");
  } catch {
    errors.push("prepared commit is not resolvable");
  }
  for (const [label, path] of [
    ["ARTIFACTS.json", p.artifacts], ["CLAIMS-AUDIT.json", p.audit],
    ["STRUCTURAL.json", p.structural], ["TALLY.json", p.tally], ["SCORE.json", p.score],
  ]) {
    if (!existsSync(path)) errors.push(`${label} missing`);
  }
  errors.push(...dispatchProvenanceErrors(runDir, manifest, cases));
  try {
    errors.push(...promptDerivationErrors(runDir, manifest, cases));
  } catch (error) {
    errors.push(`generated prompts cannot be verified: ${error.message}`);
  }
  let artifacts = null;
  if (existsSync(p.artifacts)) {
    artifacts = json(p.artifacts);
    errors.push(...artifactHashErrors(artifacts, runDir, cases, manifest));
    if (existsSync(p.audit)) errors.push(...claimsAuditFailures(json(p.audit), cases, artifacts, runDir));
  }
  try {
    const profiles = deriveProfileEvidence(runDir, manifest, cases);
    if (artifacts && JSON.stringify(artifacts.profile_stability) !== JSON.stringify(profiles.stability)) {
      errors.push("ARTIFACTS.json profile stability does not reproduce from raw profile results");
    }
    if (artifacts) {
      for (const profile of cases.profiles) {
        for (let render = 1; render <= profile.renders; render += 1) {
          const stored = artifacts.profiles?.[profile.id]?.[`r${render}`];
          const derived = profiles.profileMeta[profile.id][`r${render}`];
          if (stored && (stored.transport_repairs !== derived.transport_repairs
            || JSON.stringify(stored.coverage) !== JSON.stringify(derived.coverage)
            || JSON.stringify(stored.recount) !== JSON.stringify(derived.recount))) {
            errors.push(`${profile.id}-r${render} profile evidence metadata does not reproduce from raw`);
          }
        }
      }
    }
  } catch (error) {
    errors.push(`profile evidence cannot be rederived: ${error.message}`);
  }
  try {
    const evidence = deriveAcceptanceEvidence(runDir, manifest, cases);
    if (artifacts && JSON.stringify(artifacts.critics) !== JSON.stringify(evidence.critics)) {
      errors.push("ARTIFACTS.json critic evidence does not reproduce from raw results");
    }
    for (const [path, expected, label] of [
      [p.structural, evidence.structural, "STRUCTURAL.json"],
      [p.tally, evidence.tally, "TALLY.json"],
      [p.score, evidence.score, "SCORE.json"],
    ]) {
      if (existsSync(path) && JSON.stringify(json(path)) !== JSON.stringify(expected)) {
        errors.push(`${label} does not reproduce from immutable raw results`);
      }
    }
    if (!evidence.score.clears) {
      errors.push(`locked bar not cleared (${evidence.score.passed}/${evidence.score.of}; ${evidence.score.gateFailures.join(", ")})`);
    }
  } catch (error) {
    errors.push(`acceptance evidence cannot be rederived: ${error.message}`);
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
  ARTIFACT_PATH_KEYS, artifactEntryHashErrors, artifactHashErrors, claimAuditPrompt, claimsAuditFailures,
  codexCompanionArtifactFields, codexCompanionPathErrors, codexRecordErrors,
  committedManifestError, completedResult,
  claude as dispatchClaude, codex as dispatchCodex,
  criticPrompt, deriveAcceptanceEvidence, deriveCritic, draftConformancePrompt, draftPrompt,
  factualCandidateReasons, invocationInput,
  immutableFirstAddAnchor, legacyRepairArtifactErrors, localModuleClosure, lockedImplementationErrors,
  manifestDispatch, manifestStageSchema, modelAdapterName, prepareConfig, quotationAudit,
  dispatchPreflightErrors, rawNamespaceErrors, resolveDraftChain, retiredRepairEvidenceErrors, schemaInvocation,
  sentenceReviewTemplate, stagePrompt, strictlyCommittedAfter, structuralGates, validateCases,
  assertStrictOutputSchema, strictOutputSchemaErrors,
};

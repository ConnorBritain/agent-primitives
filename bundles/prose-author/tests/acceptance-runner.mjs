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
import {
  assembleVoiceCritic, CRITIC_CATEGORIES, CRITIC_SOURCE_SCHEMA, parseVoiceCriticSource,
} from "./voice-critic-source.mjs";
import {
  assembleVoiceDraft, normalizeVoiceDraftSource, parseVoiceDraftSource,
  SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA, validateVoiceDraftSource,
} from "../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA as DRAFT_AUDIT_SCHEMA,
  AUDIT_SCHEMA_ID as DRAFT_AUDIT_SCHEMA_ID,
  parseVoiceDraftClaimAudit, sentenceRefs,
} from "../skills/prose-draft/tools/draft-claim-audit.mjs";
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

function prepareConfig(env = process.env) {
  const model = env.ACCEPTANCE_MODEL || "sonnet";
  const draftHarness = env.ACCEPTANCE_DRAFT_HARNESS || "codex";
  if (!["claude", "codex"].includes(draftHarness)) {
    throw new Error("ACCEPTANCE_DRAFT_HARNESS must be claude or codex");
  }
  return {
    model,
    draftHarness,
    draftModel: env.ACCEPTANCE_DRAFT_MODEL
      || (draftHarness === "codex" ? "gpt-5.6-luna" : model),
    draftEffort: env.ACCEPTANCE_DRAFT_EFFORT || env.ACCEPTANCE_EFFORT || "medium",
    claimAuditEffort: env.ACCEPTANCE_CLAIM_AUDIT_EFFORT || "low",
    criticEffort: env.ACCEPTANCE_CRITIC_EFFORT || env.ACCEPTANCE_EFFORT || "medium",
    profileEffort: env.ACCEPTANCE_PROFILE_EFFORT || "low",
    concurrency: positiveInt(env.ACCEPTANCE_CONCURRENCY || "1", "ACCEPTANCE_CONCURRENCY"),
    timeoutMs: positiveInt(env.ACCEPTANCE_MODEL_TIMEOUT_MS || "720000", "ACCEPTANCE_MODEL_TIMEOUT_MS"),
    profileNative: env.ACCEPTANCE_PROFILE_NATIVE_SCHEMA !== "0",
    draftNative: env.ACCEPTANCE_DRAFT_NATIVE_SCHEMA !== "0",
    claimAuditNative: env.ACCEPTANCE_CLAIM_AUDIT_NATIVE_SCHEMA !== "0",
    criticNative: env.ACCEPTANCE_CRITIC_NATIVE_SCHEMA !== "0",
  };
}

function manifestFingerprint(manifest) {
  return SHA(JSON.stringify(manifest));
}

function manifestDispatch(manifest, stage) {
  if (!STAGES.includes(stage)) throw new Error(`unknown acceptance stage ${stage}`);
  if (!Number.isInteger(manifest?.concurrency) || manifest.concurrency < 1) {
    throw new Error("manifest concurrency is invalid");
  }
  const config = manifest?.dispatch?.[stage];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`manifest has no locked ${stage} dispatch configuration`);
  }
  const harnesses = stage === "draft" ? ["claude-code", "codex"] : ["claude-code"];
  if (!harnesses.includes(config.harness)) throw new Error(`manifest ${stage} harness is invalid`);
  if (typeof config.model !== "string" || !config.model.trim()) throw new Error(`manifest ${stage} model is invalid`);
  if (typeof config.effort !== "string" || !config.effort.trim()) throw new Error(`manifest ${stage} effort is invalid`);
  if (!TRANSPORTS.has(config.transport)) throw new Error(`manifest ${stage} transport is invalid`);
  if (!Number.isInteger(config.timeout_ms) || config.timeout_ms < 1) throw new Error(`manifest ${stage} timeout is invalid`);
  if (config.harness === "codex" && config.transport !== "native-structured") {
    throw new Error(`manifest ${stage} Codex dispatch requires native-structured transport`);
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

function invocationInput(system, prompt, { schema = null, schemaPath = null } = {}) {
  return {
    system_sha256: SHA(text(system)),
    prompt_sha256: SHA(prompt),
    schema_sha256: schemaPath ? SHA(text(schemaPath)) : (schema ? SHA(JSON.stringify(schema)) : null),
  };
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
    "Otherwise emit voice-profile-source/3 exactly as described by the system prompt.",
    "Fill every deterministic measured slot below with semantic prose. Supply supporting",
    "filenames and qualitative frequencies for the remaining qualitative dimensions, and",
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
  write(draftSchemaPath, DRAFT_SOURCE_SCHEMA);
  const claimAuditSchemaPath = join(runDir, "schemas", "voice-draft-claim-audit-3.json");
  write(claimAuditSchemaPath, DRAFT_AUDIT_SCHEMA);

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
    schema: MANIFEST_SCHEMA,
    run_id: basename(runDir),
    prepared: today(),
    prepared_commit: preparedCommit,
    claim_pipeline: CLAIM_PIPELINE,
    dispatch: {
      profile: {
        harness: "claude-code", model: config.model, effort: config.profileEffort,
        transport: config.profileNative ? "native-structured" : "json-fence",
        timeout_ms: config.timeoutMs,
      },
      draft: {
        harness: config.draftHarness === "codex" ? "codex" : "claude-code",
        model: config.draftModel, effort: config.draftEffort,
        transport: config.draftNative ? "native-structured" : "json-fence",
        timeout_ms: config.timeoutMs,
      },
      claim_audit: {
        harness: "claude-code", model: config.model, effort: config.claimAuditEffort,
        transport: config.claimAuditNative ? "native-structured" : "json-fence",
        timeout_ms: config.timeoutMs,
      },
      critic: {
        harness: "claude-code", model: config.model, effort: config.criticEffort,
        transport: config.criticNative ? "native-structured" : "json-fence",
        timeout_ms: config.timeoutMs,
      },
    },
    concurrency: config.concurrency,
    codex_no_tools_config: config.draftHarness === "codex" ? CODEX_NO_TOOLS_CONFIG : [],
    schemas: {
      draft: { path: rel(draftSchemaPath), sha256: SHA(text(draftSchemaPath)) },
      claim_audit: {
        id: DRAFT_AUDIT_SCHEMA_ID,
        path: rel(claimAuditSchemaPath),
        sha256: SHA(text(claimAuditSchemaPath)),
      },
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
  } catch (error) {
    die(`MANIFEST.json claim-audit schema is invalid: ${error.message}`);
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
    const eventErrors = codexRecordErrors(record);
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

async function claude({ system, prompt, cwd, tools, allowed, output, schema = null, dispatch }) {
  const input = invocationInput(system, prompt, { schema });
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
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, dispatch.timeout_ms);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timeout); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) return reject(new Error(`claude exceeded ${dispatch.timeout_ms}ms; no redraw was made`));
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${stderr.slice(0, 2000)}`));
      let record;
      try { record = JSON.parse(stdout); } catch { return reject(new Error(`claude emitted invalid JSON: ${stdout.slice(0, 500)}`)); }
      const hasText = typeof record.result === "string" && record.result.trim();
      const hasStructured = record.structured_output !== null
        && typeof record.structured_output === "object";
      if (record.type !== "result" || record.is_error || (!hasText && !hasStructured)) {
        return reject(new Error(`claude emitted no successful result: ${stdout.slice(0, 1000)}`));
      }
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

async function codex({ system, prompt, output, schemaPath, noToolsConfig, dispatch }) {
  const input = invocationInput(system, prompt, { schemaPath });
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
  const isolationDir = mkdtempSync(join(tmpdir(), "prose-author-codex-draft-"));
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
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      settled = true;
      clearTimeout(timeout);
      rmSync(isolationDir, { recursive: true, force: true });
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rmSync(isolationDir, { recursive: true, force: true });
      if (stdout) write(eventsOutput, stdout.endsWith("\n") ? stdout : `${stdout}\n`);
      const fail = (message) => {
        write(output, {
          type: "result", is_error: true, harness: "codex", result: "",
          structured_output: null, raw_events: rel(eventsOutput), error: message,
          acceptance_dispatch: resultDispatch(dispatch),
          acceptance_input: input,
        });
        reject(new Error(message));
      };
      if (timedOut) return fail(`codex exceeded ${dispatch.timeout_ms}ms; no redraw was made`);
      if (code !== 0) return fail(`codex exited ${code}: ${stderr.slice(0, 2000)}`);
      try {
        resolvePromise(finalizeCodexEvents({ eventsOutput, finalOutput, output, dispatch, input }));
      } catch (error) {
        fail(error.message);
      }
    });
    child.stdin.end(combinedPrompt);
  });
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
  const dispatch = manifestDispatch(manifest, "profile");
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
          dispatch,
          schema: dispatch.transport === "native-structured"
            ? sourceRenderSchema(manifest.corpora[profile.id].measurements) : null,
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
    "Return voice-draft-source/3 exactly as described by the system prompt.",
    "Finalize the ledger before the paragraphs, then fill the proof-carrying sentence objects.",
    "The portable deterministic assembler validates request bases and closed-ledger references,",
    "derives claims, owns draft/refusal fences, and removes empty",
    "disclosure arrays from voice-draft/1.",
  ].join("\n");
}

function claimAuditContract(manifest) {
  if (manifest?.claim_pipeline === CLAIM_PIPELINE) {
    return { id: DRAFT_AUDIT_SCHEMA_ID, schema: DRAFT_AUDIT_SCHEMA };
  }
  throw new Error(`unknown claim pipeline ${manifest?.claim_pipeline ?? "(missing)"}`);
}

function manifestClaimAuditSchema(manifest) {
  const contract = claimAuditContract(manifest);
  const entry = manifest?.schemas?.claim_audit;
  if (!entry || entry.id !== contract.id || typeof entry.path !== "string") {
    throw new Error(`claim pipeline ${manifest?.claim_pipeline} has no pinned ${contract.id} schema`);
  }
  const path = resolve(REPO, entry.path);
  if (!existsSync(path) || SHA(text(path)) !== entry.sha256) {
    throw new Error(`locked ${contract.id} schema is missing or drifted`);
  }
  const schema = json(path);
  if (JSON.stringify(schema) !== JSON.stringify(contract.schema)) {
    throw new Error(`locked ${contract.id} schema bytes do not match the pipeline contract`);
  }
  return schema;
}

function claimAuditPrompt(c, source) {
  const units = sentenceRefs(source).map((ref) => {
    const match = /^p(\d+)s(\d+)$/.exec(ref.id);
    const sentence = source.paragraphs[Number(match[1]) - 1].sentences[Number(match[2]) - 1];
    return { id: ref.id, text: ref.text, drafter_basis: sentence.basis, claim_ids: sentence.claim_ids };
  });
  return [
    `# Independent draft claim audit — ${c.id}`,
    "",
    "The request is the only supplied factual packet. The ledger and sentence labels are untrusted.",
    "Audit every sentence against the closed ledger under the system prompt. Do not revise the prose or ledger.",
    "",
    "## Request",
    "",
    c.prompt,
    "",
    "## Closed claim ledger",
    "",
    "```json",
    JSON.stringify(source.ledger, null, 2),
    "```",
    "",
    "## Sentence units",
    "",
    "```json",
    JSON.stringify(units, null, 2),
    "```",
    "",
    `Return ${DRAFT_AUDIT_SCHEMA_ID} as the strict object only. Preserve every ID`,
    "exactly once and in order. Every row carries id, status, reason, and claims.",
    "Keep/reject rows carry claims: []; disclose rows quote exact sentence evidence and",
    "extract every unsupported proposition for the later mandatory verification audit.",
  ].join("\n");
}

async function dispatchDrafts(runDir) {
  const { manifest, cases } = loadPrepared(runDir);
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
        if (dispatch.harness === "codex") {
          return codex({
            system, prompt, output,
            dispatch,
            schemaPath: resolve(REPO, manifest.schemas.draft.path),
            noToolsConfig: manifest.codex_no_tools_config,
          });
        }
        return claude({
          system, cwd: runDir, prompt, tools: "", allowed: [],
          dispatch,
          schema: dispatch.transport === "native-structured" ? DRAFT_SOURCE_SCHEMA : null,
          output,
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
      run: () => claude({
        system: auditSystem, cwd: runDir, prompt, tools: "", allowed: [],
        dispatch: auditDispatch,
        schema: auditDispatch.transport === "native-structured" ? auditSchema : null,
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
      raw_events: record.raw_events ?? null,
      raw_output: record.raw_output ?? null,
      recovered_from: record.recovered_from ?? null,
      raw_events_sha256: record.raw_events ? SHA(text(resolve(REPO, record.raw_events))) : null,
      raw_output_sha256: record.raw_output ? SHA(text(resolve(REPO, record.raw_output))) : null,
      recovered_from_sha256: record.recovered_from ? SHA(text(resolve(REPO, record.recovered_from))) : null,
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
      raw_events: record.raw_events ?? null,
      raw_output: record.raw_output ?? null,
      recovered_from: record.recovered_from ?? null,
      raw_events_sha256: record.raw_events ? SHA(text(resolve(REPO, record.raw_events))) : null,
      raw_output_sha256: record.raw_output ? SHA(text(resolve(REPO, record.raw_output))) : null,
      recovered_from_sha256: record.recovered_from ? SHA(text(resolve(REPO, record.recovered_from))) : null,
    };
  }
  write(artifactsPath, artifacts);
  prepareClaimsAudit(runDir, cases, artifacts);
  process.stdout.write("\n  collected twenty drafts and two valid underdetermined refusals\n\n");
}

function prepareClaimsAudit(runDir, cases, artifacts) {
  const auditPath = join(runDir, "CLAIMS-AUDIT.json");
  const prior = existsSync(auditPath) ? json(auditPath) : null;
  const next = {
    schema: "prose-author-claims-audit/2",
    instructions: [
      "claims_verified: verify every listed claim against an authoritative source; use true only when every item is verified",
      "disclosure_complete: read the draft sentence by sentence and use true only when every checkable assertion is listed or supplied by the request; the profile is voice evidence, never a factual packet",
      "quotations_verified: inspect every quoted span and use true only when every attributed quotation is verbatim in the request or independently verified; scare quotes may be marked reviewed",
    ],
    drafts: {},
  };
  for (const c of cases.cases) {
    const disclosure = artifacts.drafts[c.id].disclosure ? json(resolve(REPO, artifacts.drafts[c.id].disclosure)) : null;
    const claims = disclosure?.claims ?? [];
    const draft = text(join(runDir, "inputs", "drafts", `${c.id}.txt`));
    const quotedSpans = quotationAudit(draft, c.prompt);
    const previous = prior?.schema === "prose-author-claims-audit/2" ? prior.drafts?.[c.id] : null;
    const unchanged = previous?.draft_sha256 === artifacts.drafts[c.id].draft_sha256
      && JSON.stringify(previous.claims) === JSON.stringify(claims)
      && JSON.stringify(previous.quoted_spans) === JSON.stringify(quotedSpans);
    next.drafts[c.id] = {
      draft_sha256: artifacts.drafts[c.id].draft_sha256,
      claims,
      quoted_spans: quotedSpans,
      claims_verified: unchanged ? previous.claims_verified : (claims.length === 0 ? true : null),
      disclosure_complete: unchanged ? previous.disclosure_complete : null,
      quotations_verified: unchanged ? previous.quotations_verified : (quotedSpans.length === 0 ? true : null),
      note: unchanged ? (previous.note ?? "") : "",
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
  return value.normalize("NFKC").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function claimsAuditFailures(audit, cases, artifacts = null, runDir = null) {
  const failures = [];
  if (audit?.schema !== "prose-author-claims-audit/2") return ["CLAIMS-AUDIT.json has the wrong schema"];
  const expectedIds = new Set(cases.cases.map((c) => c.id));
  for (const id of Object.keys(audit.drafts ?? {})) {
    if (!expectedIds.has(id)) failures.push(`${id}: unexpected audit row`);
  }
  for (const c of cases.cases) {
    const row = audit.drafts?.[c.id];
    if (!row) { failures.push(`${c.id}: missing audit row`); continue; }
    if (artifacts && runDir) {
      const artifact = artifacts.drafts?.[c.id];
      if (!artifact) {
        failures.push(`${c.id}: missing draft artifact for audit`);
      } else {
        if (row.draft_sha256 !== artifact.draft_sha256) failures.push(`${c.id}: audited draft hash drifted`);
        const disclosure = artifact.disclosure ? json(resolve(REPO, artifact.disclosure)) : null;
        const expectedClaims = disclosure?.claims ?? [];
        if (JSON.stringify(row.claims) !== JSON.stringify(expectedClaims)) failures.push(`${c.id}: audited claims drifted`);
        const draft = text(join(runDir, "inputs", "drafts", `${c.id}.txt`));
        const expectedQuotes = quotationAudit(draft, c.prompt);
        if (JSON.stringify(row.quoted_spans) !== JSON.stringify(expectedQuotes)) {
          failures.push(`${c.id}: audited quotations drifted`);
        }
      }
    }
    for (const field of ["claims_verified", "disclosure_complete", "quotations_verified"]) {
      if (row[field] !== true) failures.push(`${c.id}: ${field}`);
    }
  }
  return failures;
}

const ARTIFACT_PATH_KEYS = {
  profile: ["prompt", "raw", "source", "render", "markdown", "json"],
  draft: [
    "prompt", "raw", "original_source", "normalized_source",
    "initial_audit_prompt", "initial_audit_raw", "initial_audit",
    "audit_prompt", "audit_raw", "audit", "source", "render_output", "draft", "disclosure",
    "raw_events", "raw_output", "recovered_from",
  ],
  refusal: ["prompt", "raw", "source", "render_output", "raw_events", "raw_output", "recovered_from"],
  critic: ["prompt", "raw", "source", "render"],
  evidence: ["claims_audit", "structural", "tally", "score"],
};

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
  const errors = [];
  if (artifacts?.schema !== ARTIFACTS_SCHEMA) {
    return ["ARTIFACTS.json has the wrong schema"];
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
      errors.push(...artifactEntryHashErrors(renders[id], ARTIFACT_PATH_KEYS.profile, `profiles.${profile.id}.${id}`, runDir));
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
    const optional = ["disclosure", "recovered_from"];
    if (!chain?.normalized) optional.push("normalized_source");
    if (!chain?.initialAudit) optional.push("initial_audit_prompt", "initial_audit_raw", "initial_audit");
    if (manifestDispatch(manifest, "draft").harness !== "codex") optional.push("raw_events", "raw_output");
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
      errors.push(...artifactEntryHashErrors(draws[id], ARTIFACT_PATH_KEYS.critic, `critics.${c.id}.${id}`, runDir));
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
  const { manifest, cases } = loadPrepared(runDir);
  const dispatch = manifestDispatch(manifest, "critic");
  collectDrafts(runDir);
  const auditFailures = claimsAuditFailures(json(join(runDir, "CLAIMS-AUDIT.json")), cases);
  if (auditFailures.length) {
    die(`claims audit incomplete; no critic calls were made:\n    ${auditFailures.join("\n    ")}`);
  }
  const system = resolve(REPO, manifest.agents.critic.snapshot);
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
        run: () => claude({
          system, cwd: inputDir, prompt, tools: "", allowed: [],
          dispatch,
          schema: dispatch.transport === "native-structured" ? CRITIC_SOURCE_SCHEMA : null,
          output: join(runDir, "critics", "raw", `${c.id}-d${draw}.json`),
        }),
      });
    }
  }
  await pool("critic", jobs, manifest.concurrency);
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

function deriveCriticEvidence(runDir, manifest, cases, { writeCanonical = false } = {}) {
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
      } else {
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
        source: rel(sourcePath), source_sha256: SHA(text(sourcePath)),
        render: rel(renderPath), render_sha256: SHA(text(renderPath)),
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
    for (let render = 1; render <= profile.renders; render += 1) {
      const promptPath = join(runDir, "prompts", "profiles", `${profile.id}-r${render}.md`);
      expected.push({
        path: join(runDir, "raw", "profiles", `${profile.id}-r${render}.json`),
        dispatch: profileDispatch,
        input: invocationInput(profileSystem, text(promptPath), {
          schema: profileDispatch.transport === "native-structured"
            ? sourceRenderSchema(manifest.corpora[profile.id].measurements) : null,
        }),
      });
    }
  }
  const draftDispatch = manifestDispatch(manifest, "draft");
  const draftSystem = resolve(REPO, manifest.agents.draft.snapshot);
  const draftSchemaPath = resolve(REPO, manifest.schemas.draft.path);
  for (const c of cases.cases) {
    const promptPath = join(runDir, "prompts", "drafts", `${c.id}.md`);
    expected.push({
      path: join(runDir, "raw", "drafts", `${c.id}.json`), dispatch: draftDispatch,
      input: invocationInput(draftSystem, text(promptPath), {
        schemaPath: draftDispatch.harness === "codex" ? draftSchemaPath : null,
        schema: draftDispatch.harness !== "codex" && draftDispatch.transport === "native-structured"
          ? DRAFT_SOURCE_SCHEMA : null,
      }),
    });
  }
  for (const c of cases.refusals) {
    const promptPath = join(runDir, "prompts", "refusals", `${c.id}.md`);
    expected.push({
      path: join(runDir, "raw", "refusals", `${c.id}.json`), dispatch: draftDispatch,
      input: invocationInput(draftSystem, text(promptPath), {
        schemaPath: draftDispatch.harness === "codex" ? draftSchemaPath : null,
        schema: draftDispatch.harness !== "codex" && draftDispatch.transport === "native-structured"
          ? DRAFT_SOURCE_SCHEMA : null,
      }),
    });
  }
  const auditDispatch = manifestDispatch(manifest, "claim_audit");
  const auditSystem = resolve(REPO, manifest.agents.claim_audit.snapshot);
  let auditSchema;
  try {
    auditSchema = manifestClaimAuditSchema(manifest);
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
          input: invocationInput(auditSystem, text(promptPath), {
            schema: auditDispatch.transport === "native-structured" ? auditSchema : null,
          }),
        });
      }
    } catch (error) {
      errors.push(`${c.id} conditional claim provenance cannot be resolved: ${error.message}`);
    }
  }
  const criticDispatch = manifestDispatch(manifest, "critic");
  const criticSystem = resolve(REPO, manifest.agents.critic.snapshot);
  for (const c of cases.cases) {
    for (let draw = 1; draw <= 3; draw += 1) {
      const promptPath = join(runDir, "critics", "prompts", `${c.id}-d${draw}.md`);
      expected.push({
        path: join(runDir, "critics", "raw", `${c.id}-d${draw}.json`), dispatch: criticDispatch,
        input: invocationInput(criticSystem, text(promptPath), {
          schema: criticDispatch.transport === "native-structured" ? CRITIC_SOURCE_SCHEMA : null,
        }),
      });
    }
  }
  for (const item of expected) {
    try {
      if (!completedResult(item.path, item.dispatch, item.input)) errors.push(`missing model result ${rel(item.path)}`);
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
  collectDrafts(runDir);
  const audit = json(p.audit);
  const artifacts = json(p.artifacts);
  const auditFailures = claimsAuditFailures(audit, cases, artifacts, runDir);
  if (auditFailures.length) die(`claims audit incomplete:\n    ${auditFailures.join("\n    ")}`);
  const evidence = deriveAcceptanceEvidence(runDir, manifest, cases, { writeCanonical: true });
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
  if (manifestDispatch(manifest, "draft").harness === "codex") {
    if (JSON.stringify(manifest.codex_no_tools_config) !== JSON.stringify(CODEX_NO_TOOLS_CONFIG)) {
      errors.push("Codex no-tools configuration changed after prepare");
    }
    const draftSchema = manifest.schemas?.draft;
    if (!draftSchema || !existsSync(resolve(REPO, draftSchema.path))) {
      errors.push("locked Codex draft schema is missing");
    } else if (SHA(text(resolve(REPO, draftSchema.path))) !== draftSchema.sha256) {
      errors.push("locked Codex draft schema hash mismatch");
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
  artifactEntryHashErrors, artifactHashErrors, claimAuditPrompt, claimsAuditFailures,
  codexRecordErrors, committedManifestError, completedResult,
  claude as dispatchClaude, codex as dispatchCodex,
  criticPrompt, deriveAcceptanceEvidence, deriveCritic, draftPrompt, invocationInput,
  legacyRepairArtifactErrors, localModuleClosure, lockedImplementationErrors,
  manifestDispatch, prepareConfig, quotationAudit, resolveDraftChain, retiredRepairEvidenceErrors,
  stagePrompt, structuralGates, validateCases,
};

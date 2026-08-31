#!/usr/bin/env node
/** One-call diagnostic for voice-draft consuming voice-style-spec/1. Not acceptance evidence. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStrictOutputSchema, CODEX_NO_TOOLS_CONFIG, completedResult, dispatchCodex,
  draftPrompt, invocationInput, localModuleClosure,
} from "../../acceptance-runner.mjs";
import {
  SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA, validateVoiceDraftSource,
} from "../../../skills/prose-draft/tools/draft-contract.mjs";
import { measureDraftConformance } from "../../../skills/prose-draft/tools/draft-conformance.mjs";
import { draftTargetCard, wordTargetBounds } from "../../../skills/prose-draft/tools/draft-targets.mjs";
import {
  applyProposal, compileStyle, digest, emptyScope, initPreferences,
} from "../../../skills/prose-style-tune/tools/style-contract.mjs";

const RUN = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(RUN, "..", "..", "..", "..", "..");
const DESIGN_PATH = join(RUN, "DESIGN.json");
const LOCK_PATH = join(RUN, "LOCK.json");
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
const stripFrontmatter = (value) => value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

function operation(id, decision) {
  return {
    id, op: "add", target_decision_id: null, decision,
    rationale: "The canary records one explicit style preference.",
    expected_effect: "The named behavior changes in the canary draft.",
  };
}

function sourceContext() {
  const design = json(DESIGN_PATH);
  const profile = json(resolve(REPO, design.profile_json));
  const question = profile.observations.find((row) =>
    /^\[measurement:question-marks\]/.test(row?.rate?.counting_rule ?? ""));
  if (!question) throw new Error("profile has no counted question observation");
  const v1 = initPreferences(profile, "v0.3 style-spec canary");
  const scope = emptyScope();
  scope.forms = ["essay"];
  const proposal = {
    schema: "voice-preference-proposal/1",
    based_on: { revision: v1.revision, digest: digest(v1) },
    feedback: { kind: "direct-feedback", statement: design.preference },
    operations: [
      operation("suppress-questions", {
        feature: "rhetorical-questions",
        dimension: "questions-imperatives-vocatives",
        observation_ids: [question.id],
        directive: design.preference,
        stance: "avoid",
        control: { mode: "suppress-counted", observation_id: question.id, minimum: 0, aim: 0, maximum: 0 },
        scope,
        basis: { kind: "direct-feedback", statement: design.preference },
      }),
      operation("try-concrete-opening", {
        feature: "concrete-opening",
        dimension: "openings-endings-closure",
        observation_ids: [],
        directive: design.experiment,
        stance: "experimental",
        control: { mode: "qualitative", observation_id: null, minimum: null, aim: null, maximum: null },
        scope,
        basis: { kind: "direct-feedback", statement: design.experiment },
      }),
    ],
    questions: [],
  };
  const preferences = applyProposal(profile, v1, proposal, ["suppress-questions", "try-concrete-opening"]);
  const experimentId = preferences.decisions.find((row) => row.feature === "concrete-opening").id;
  const style = compileStyle(profile, preferences, design.context, { experiments: [experimentId] });
  return { design, profile, preferences, style, question };
}

function lockedFiles(context) {
  return [...new Set([
    ...localModuleClosure([SCRIPT]), rel(DESIGN_PATH), AGENT_SOURCE,
    context.design.profile_json, context.design.profile_markdown, context.design.source_corpus_lock,
  ])].sort();
}

function prepare() {
  if (existsSync(LOCK_PATH)) throw new Error("LOCK.json already exists; canary is immutable");
  const context = sourceContext();
  if (context.design.acceptance_evidence !== false || context.design.redraws !== 0) {
    throw new Error("canary must remain zero-redraw and non-acceptance");
  }
  const locked = lockedFiles(context);
  execFileSync("git", ["ls-files", "--error-unmatch", ...locked], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...locked], { cwd: REPO, stdio: "ignore" });
  const preparedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();
  const agentBody = stripFrontmatter(text(join(REPO, AGENT_SOURCE)));
  const systemPath = join(RUN, "prompts", "agents", "draft.md");
  const schemaPath = join(RUN, "schemas", "draft.json");
  const promptPath = join(RUN, "prompts", "draft.md");
  write(systemPath, agentBody);
  write(schemaPath, assertStrictOutputSchema(DRAFT_SOURCE_SCHEMA, "style canary draft schema"));
  write(promptPath, `${draftPrompt(
    { prompt: context.design.request }, context.style.effective_markdown, context.style,
  )}\n`);
  write(join(RUN, "inputs", "profile.json"), context.profile);
  write(join(RUN, "inputs", "preferences.json"), context.preferences);
  write(join(RUN, "inputs", "style.json"), context.style);
  write(join(RUN, "inputs", "context.json"), context.design.context);
  write(join(RUN, "inputs", "request.txt"), `${context.design.request}\n`);

  const sourceLocks = json(resolve(REPO, context.design.source_corpus_lock));
  const currency = structuredClone(sourceLocks[context.design.source_corpus_key]);
  currency.agent = "voice-draft";
  currency.agent_sha256 = SHA(text(join(REPO, AGENT_SOURCE)));
  currency.profile_json_sha256 = SHA(text(join(RUN, "inputs", "profile.json")));
  write(join(RUN, "corpus.lock.json"), { "eff-mullin-style-spec": currency });
  write(join(RUN, "ARTIFACTS.json"), {
    schema: "prose-author-style-spec-canary-artifacts/1", profiles: {}, drafts: {},
    critics: {}, refusals: {}, evidence: {}, profile_stability: {},
  });
  const dispatch = {
    stage: "draft", harness: context.design.harness, model: context.design.model,
    effort: context.design.effort, transport: "native-structured", timeout_ms: 720000,
    concurrency: 1, manifest_sha256: null,
  };
  const lock = {
    schema: "prose-author-style-spec-canary-lock/1",
    acceptance_evidence: false,
    redraws: 0,
    prepared_commit: preparedCommit,
    dispatch,
    codex_no_tools_config: CODEX_NO_TOOLS_CONFIG,
    agent: { source: AGENT_SOURCE, snapshot: rel(systemPath), sha256: SHA(agentBody) },
    prompt: { path: rel(promptPath), sha256: SHA(text(promptPath)) },
    output_schema: { path: rel(schemaPath), sha256: SHA(text(schemaPath)) },
    style_digest: digest(context.style),
    preference_digest: digest(context.preferences),
    locked_files: Object.fromEntries(locked.map((file) => [file, SHA(text(join(REPO, file)))])),
  };
  lock.dispatch.manifest_sha256 = digest(lock);
  write(LOCK_PATH, lock);
  process.stdout.write("prepared style-spec canary; commit prepared artifacts before dispatch\n");
}

function loadPrepared() {
  const lock = json(LOCK_PATH);
  if (lock.schema !== "prose-author-style-spec-canary-lock/1") throw new Error("wrong lock schema");
  for (const [file, expected] of Object.entries(lock.locked_files)) {
    if (SHA(text(join(REPO, file))) !== expected) throw new Error(`locked file drifted: ${file}`);
  }
  if (SHA(text(resolve(REPO, lock.agent.snapshot))) !== lock.agent.sha256) throw new Error("agent snapshot drifted");
  if (SHA(text(resolve(REPO, lock.prompt.path))) !== lock.prompt.sha256) throw new Error("prompt drifted");
  if (SHA(text(resolve(REPO, lock.output_schema.path))) !== lock.output_schema.sha256) throw new Error("schema drifted");
  return lock;
}

function expectedInput(lock) {
  return invocationInput(resolve(REPO, lock.agent.snapshot), text(resolve(REPO, lock.prompt.path)), {
    schemaPath: resolve(REPO, lock.output_schema.path),
  });
}

function derived(lock) {
  const context = sourceContext();
  if (digest(context.style) !== lock.style_digest || digest(context.preferences) !== lock.preference_digest) {
    throw new Error("compiled style no longer reproduces");
  }
  const rawPath = join(RUN, "raw", "drafts", "v030.json");
  const record = completedResult(rawPath, lock.dispatch, expectedInput(lock));
  if (!record) throw new Error("missing completed draft record");
  const validated = validateVoiceDraftSource(record.structured_output, { request: context.design.request });
  if (!validated.ok || validated.refusal) throw new Error(validated.errors.join("; "));
  const card = draftTargetCard(context.style, context.design.request);
  const report = measureDraftConformance(record.structured_output.draft, card);
  const questionRow = report.measurements.find((row) => row.observation_id === context.question.id);
  if (!questionRow || questionRow.actual_count !== 0 || questionRow.minimum !== 0 || questionRow.maximum !== 0) {
    throw new Error("draft did not honor the zero-question preference target");
  }
  const bounds = wordTargetBounds(card.word_target);
  if (report.draft_words < bounds.minimum || report.draft_words > bounds.maximum) {
    throw new Error(`draft length ${report.draft_words} is outside ${bounds.minimum}-${bounds.maximum}`);
  }
  return { record, report, rawPath };
}

async function run() {
  const lock = loadPrepared();
  const rawPath = join(RUN, "raw", "drafts", "v030.json");
  await dispatchCodex({
    system: resolve(REPO, lock.agent.snapshot), prompt: text(resolve(REPO, lock.prompt.path)),
    output: rawPath, schemaPath: resolve(REPO, lock.output_schema.path),
    noToolsConfig: lock.codex_no_tools_config, prerequisites: null, dispatch: lock.dispatch,
  });
  const evidence = derived(lock);
  write(join(RUN, "outputs", "source.json"), evidence.record.structured_output);
  write(join(RUN, "outputs", "conformance.json"), evidence.report);
  write(join(RUN, "RESULT.json"), {
    schema: "prose-author-style-spec-canary-result/1", status: "PASS",
    acceptance_evidence: false, redraws: 0, prepared_commit: lock.prepared_commit,
    raw: rel(evidence.rawPath), raw_sha256: SHA(text(evidence.rawPath)),
    source: rel(join(RUN, "outputs", "source.json")),
    source_sha256: SHA(text(join(RUN, "outputs", "source.json"))),
    conformance: rel(join(RUN, "outputs", "conformance.json")),
    conformance_sha256: SHA(text(join(RUN, "outputs", "conformance.json"))),
    question_marks: 0, draft_words: evidence.report.draft_words,
  });
  process.stdout.write("style-spec canary PASS\n");
}

function check() {
  const lock = loadPrepared();
  const evidence = derived(lock);
  const result = json(join(RUN, "RESULT.json"));
  if (result.status !== "PASS" || result.acceptance_evidence !== false || result.redraws !== 0
    || result.question_marks !== 0 || result.draft_words !== evidence.report.draft_words) {
    throw new Error("result does not reproduce the passing non-acceptance canary");
  }
  if (text(resolve(REPO, result.source)) !== `${JSON.stringify(evidence.record.structured_output, null, 2)}\n`) {
    throw new Error("source output does not reproduce");
  }
  if (text(resolve(REPO, result.conformance)) !== `${JSON.stringify(evidence.report, null, 2)}\n`) {
    throw new Error("conformance output does not reproduce");
  }
  process.stdout.write("style-spec canary check PASS\n");
}

const command = process.argv[2];
if (command === "prepare") prepare();
else if (command === "run") await run();
else if (command === "check") check();
else throw new Error("usage: run.mjs <prepare|run|check>");

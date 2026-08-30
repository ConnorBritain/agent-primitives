/** Immutable, zero-redraw diagnostic runner for one whole-paragraph residual prune plan. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStrictOutputSchema, CODEX_NO_TOOLS_CONFIG, committedManifestError, completedResult,
  dispatchCodex, invocationInput, localModuleClosure, lockedImplementationErrors,
  manifestDispatch, schemaInvocation,
} from "./acceptance-runner.mjs";
import {
  applyResidualPrunePlan, RESIDUAL_PRUNE_SCHEMA, residualPrunePrompt,
} from "../skills/prose-draft/tools/draft-residual-prune.mjs";
import { draftTargetCard } from "../skills/prose-draft/tools/draft-targets.mjs";

export async function runResidualPruneCanary(entryUrl, command) {
  const RUN = dirname(fileURLToPath(entryUrl));
  const REPO = resolve(RUN, "..", "..", "..", "..", "..");
  const DESIGN_PATH = join(RUN, "DESIGN.json");
  const MANIFEST_PATH = join(RUN, "MANIFEST.json");
  const RESULT_PATH = join(RUN, "RESULT.json");
  const FAILURE_PATH = join(RUN, "FAILURE.json");
  const SYSTEM_SOURCE = "bundles/prose-author/skills/prose-draft/references/residual-prune.md";
  const SCRIPT = relative(REPO, fileURLToPath(entryUrl));
  const SHA = (value) => createHash("sha256").update(value).digest("hex");
  const text = (path) => readFileSync(path, "utf8");
  const json = (path) => JSON.parse(text(path));
  const rel = (path) => relative(REPO, resolve(path));
  const write = (path, value) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  };
  const git = (...args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();

  function sourceInputs(design) {
    return [design.cases, design.prior_record, design.profile_json];
  }

  function lockedFiles(design) {
    return [...new Set([
      ...localModuleClosure([SCRIPT]), rel(DESIGN_PATH), SYSTEM_SOURCE, ...sourceInputs(design),
    ])].sort();
  }

  function sourceContext(design) {
    const cases = json(resolve(REPO, design.cases));
    const c = cases.cases.find((row) => row.id === design.case_id);
    if (!c) throw new Error(`missing locked case ${design.case_id}`);
    const wrapper = json(resolve(REPO, design.prior_record));
    const prior = wrapper.structured_output;
    if (!prior || typeof prior !== "object") throw new Error("prior wrapper has no structured source");
    const profile = json(resolve(REPO, design.profile_json));
    return { c, prior, profile };
  }

  function prerequisites(manifest) {
    return {
      prior_semantic_revision_raw_sha256: manifest.inputs.prior_record_sha256,
      profile_json_sha256: manifest.inputs.profile_json_sha256,
      case_request_sha256: manifest.inputs.case_request_sha256,
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
    const card = draftTargetCard(context.profile, context.c.prompt);
    const system = text(resolve(REPO, SYSTEM_SOURCE));
    const systemSnapshot = join(RUN, "prompts", "agents", "pruner.md");
    const schemaPath = join(RUN, "schemas", "residual-prune.json");
    const promptPath = join(RUN, "prompts", "residual-prune.md");
    const priorPath = join(RUN, "inputs", "prior.json");
    const profileJsonPath = join(RUN, "inputs", "profile.json");
    write(systemSnapshot, system);
    write(schemaPath, assertStrictOutputSchema(RESIDUAL_PRUNE_SCHEMA, "residual prune schema"));
    write(priorPath, context.prior);
    write(profileJsonPath, context.profile);
    write(promptPath, `${residualPrunePrompt(context.prior, { request: context.c.prompt, card })}\n`);
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
        draft: { source: SYSTEM_SOURCE, snapshot: rel(systemSnapshot), sha256: SHA(system) },
      },
      schema_path: rel(schemaPath), schema_sha256: SHA(text(schemaPath)),
      prompt_path: rel(promptPath), prompt_sha256: SHA(text(promptPath)),
      inputs: {
        prior: rel(priorPath), prior_sha256: SHA(text(priorPath)),
        prior_record_sha256: SHA(text(resolve(REPO, design.prior_record))),
        profile_json: rel(profileJsonPath), profile_json_sha256: SHA(text(profileJsonPath)),
        case_request_sha256: SHA(context.c.prompt),
      },
      locked_files: Object.fromEntries(locked.map((file) => [file, SHA(text(join(REPO, file)))])),
    };
    write(MANIFEST_PATH, manifest);
    process.stdout.write("prepared residual prune canary; commit MANIFEST.json before dispatch\n");
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
    const rawPath = join(RUN, "raw", "plan.json");
    const record = completedResult(rawPath, dispatch, expectedInput(manifest));
    if (!record) throw new Error("missing residual prune plan");
    const validated = applyResidualPrunePlan(context.prior, record.structured_output, {
      request: context.c.prompt, card: draftTargetCard(context.profile, context.c.prompt),
    });
    return { record, validated, rawPath };
  }

  async function run() {
    const manifest = loadPrepared();
    const dispatch = manifestDispatch(manifest, "draft");
    const rawPath = join(RUN, "raw", "plan.json");
    await dispatchCodex({
      system: resolve(REPO, manifest.agents.draft.snapshot),
      prompt: text(resolve(REPO, manifest.prompt_path)), output: rawPath,
      schemaPath: resolve(REPO, manifest.schema_path),
      noToolsConfig: manifest.codex_no_tools_config,
      prerequisites: prerequisites(manifest), dispatch,
    });
    const evidence = derived(manifest);
    if (!evidence.validated.ok) {
      write(FAILURE_PATH, {
        schema: "prose-author-stage-adapter-canary-failure/1",
        status: "FAIL", acceptance_evidence: false, redraws: 0,
        case_id: json(DESIGN_PATH).case_id,
        errors: evidence.validated.errors,
        plan: evidence.record.structured_output,
        report: evidence.validated.report,
        raw: rel(rawPath), raw_sha256: SHA(text(rawPath)),
      });
      throw new Error(evidence.validated.errors.join("; "));
    }
    const planPath = join(RUN, "outputs", "plan.json");
    const sourcePath = join(RUN, "outputs", "source.json");
    const draftPath = join(RUN, "outputs", "draft.md");
    const reportPath = join(RUN, "outputs", "semantic-report.json");
    write(planPath, evidence.record.structured_output);
    write(sourcePath, evidence.validated.source);
    write(draftPath, evidence.validated.source.draft);
    write(reportPath, evidence.validated.report);
    write(RESULT_PATH, {
      schema: "prose-author-stage-adapter-canary-result/1",
      status: "PASS", acceptance_evidence: false, redraws: 0,
      prepared_commit: manifest.prepared_commit,
      residual_prune_validated: true,
      deleted_paragraphs: evidence.validated.deleted.map((row) => row.id),
      final_words: evidence.validated.report.draft_words,
      raw: rel(rawPath), raw_sha256: SHA(text(rawPath)),
      plan: rel(planPath), plan_sha256: SHA(text(planPath)),
      source: rel(sourcePath), source_sha256: SHA(text(sourcePath)),
      draft: rel(draftPath), draft_sha256: SHA(text(draftPath)),
      report: rel(reportPath), report_sha256: SHA(text(reportPath)),
    });
    process.stdout.write("residual prune canary PASS\n");
  }

  function check() {
    const manifest = loadPrepared();
    const evidence = derived(manifest);
    if (!evidence.validated.ok) throw new Error(evidence.validated.errors.join("; "));
    const expected = {
      plan: `${JSON.stringify(evidence.record.structured_output, null, 2)}\n`,
      source: `${JSON.stringify(evidence.validated.source, null, 2)}\n`,
      draft: evidence.validated.source.draft,
      report: `${JSON.stringify(evidence.validated.report, null, 2)}\n`,
    };
    for (const [name, body] of Object.entries(expected)) {
      const filename = name === "report" ? "semantic-report.json" : `${name}.${name === "draft" ? "md" : "json"}`;
      const path = join(RUN, "outputs", filename);
      if (!existsSync(path) || text(path) !== body) throw new Error(`${name} output does not reproduce`);
    }
    const result = json(RESULT_PATH);
    if (result.status !== "PASS" || result.acceptance_evidence !== false
      || result.redraws !== 0 || result.residual_prune_validated !== true) {
      throw new Error("result does not record the passing non-acceptance boundary");
    }
    process.stdout.write("residual prune canary check PASS\n");
  }

  if (command === "prepare") prepare();
  else if (command === "run") await run();
  else if (command === "check") check();
  else throw new Error("usage: run.mjs <prepare|run|check>");
}

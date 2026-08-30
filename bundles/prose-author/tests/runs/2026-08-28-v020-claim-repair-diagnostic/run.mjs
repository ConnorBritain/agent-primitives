#!/usr/bin/env node
/**
 * Locked, explicitly non-acceptance replay of three known claim-boundary failures.
 *
 *   node run.mjs prepare
 *   git add . && git commit                 # lock MANIFEST.json before dispatch
 *   node run.mjs repairs                    # exactly three Codex calls, no redraws
 *   node run.mjs reaudits                   # exactly three fresh Claude calls
 *   node run.mjs check
 *
 * A clear result only justifies spending a complete new 20/2/60 acceptance run.
 * It is never acceptance evidence itself.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync, existsSync, mkdirSync, readFileSync, writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  claimAuditPrompt, claimRepairPrompt, CODEX_NO_TOOLS_CONFIG, completedResult,
  dispatchClaude, dispatchCodex, invocationInput,
} from "../../acceptance-runner.mjs";
import {
  SOURCE_SCHEMA, validateVoiceDraftSource,
} from "../../../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA,
} from "../../../skills/prose-draft/tools/draft-claim-audit.mjs";
import {
  validateVoiceDraftClaimRepair,
} from "../../../skills/prose-draft/tools/draft-claim-repair.mjs";

const RUN = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(RUN, "../../../../..");
const DESIGN_PATH = join(RUN, "DESIGN.json");
const MANIFEST_PATH = join(RUN, "MANIFEST.json");
const RESULT_PATH = join(RUN, "RESULT.json");
const SHA = (value) => createHash("sha256").update(value).digest("hex");
const text = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(text(path));
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const rel = (path) => relative(REPO, path);
const stripFrontmatter = (value) => value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

const IMPLEMENTATION = [
  "bundles/prose-author/tests/acceptance-runner.mjs",
  "bundles/prose-author/skills/prose-draft/references/claim-repair.md",
  "bundles/prose-author/skills/prose-draft/references/claim-audit.md",
  "bundles/prose-author/skills/prose-draft/tools/draft-contract.mjs",
  "bundles/prose-author/skills/prose-draft/tools/draft-claim-audit.mjs",
  "bundles/prose-author/skills/prose-draft/tools/draft-claim-repair.mjs",
];

function design() {
  return json(DESIGN_PATH);
}

function sourceDesign() {
  return json(resolve(REPO, design().source_run, "DESIGN.json"));
}

function sourceCase(id) {
  const c = sourceDesign().cases.find((row) => row.id === id);
  if (!c) throw new Error(`source design has no case ${id}`);
  return c;
}

function caseSource(c) {
  const path = join(RUN, "inputs", "sources", `${c.id}.json`);
  return json(path);
}

function caseAudit(c) {
  return c.mode === "audit-rejection" ? json(join(RUN, "inputs", "audits", `${c.id}.json`)) : null;
}

function preparedBlob(path, commit) {
  return execFileSync("git", ["show", `${commit}:${path}`], { cwd: REPO });
}

function prepare() {
  if (existsSync(MANIFEST_PATH)) throw new Error("diagnostic is already prepared");
  const d = design();
  if (d.acceptance_evidence !== false || d.cases.length !== 3) {
    throw new Error("diagnostic design must remain non-acceptance and exactly three cells");
  }
  const runFiles = [rel(DESIGN_PATH), rel(join(RUN, "run.mjs"))];
  const sourceFiles = d.cases.flatMap((c) => [
    join(d.source_run, c.source),
    ...(c.audit ? [join(d.source_run, c.audit)] : []),
  ]);
  const lockedFiles = [...runFiles, ...IMPLEMENTATION, ...sourceFiles];
  execFileSync("git", ["ls-files", "--error-unmatch", ...lockedFiles], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...lockedFiles], { cwd: REPO, stdio: "ignore" });
  const preparedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();

  for (const c of d.cases) {
    const sourcePath = resolve(REPO, d.source_run, c.source);
    const raw = json(sourcePath);
    const source = c.mode === "structural-unused-ledger" ? raw.structured_output : raw;
    if (!source || source.schema !== "voice-draft-source/3") throw new Error(`${c.id} source is invalid`);
    write(join(RUN, "inputs", "sources", `${c.id}.json`), source);
    if (c.audit) {
      const auditTarget = join(RUN, "inputs", "audits", `${c.id}.json`);
      mkdirSync(dirname(auditTarget), { recursive: true });
      cpSync(resolve(REPO, d.source_run, c.audit), auditTarget);
    }
  }

  const repairSystem = stripFrontmatter(text(resolve(REPO, "bundles/prose-author/skills/prose-draft/references/claim-repair.md")));
  const auditSystem = stripFrontmatter(text(resolve(REPO, "bundles/prose-author/skills/prose-draft/references/claim-audit.md")));
  write(join(RUN, "prompts", "agents", "repair.md"), repairSystem);
  write(join(RUN, "prompts", "agents", "audit.md"), auditSystem);
  write(join(RUN, "schemas", "draft.json"), SOURCE_SCHEMA);
  write(join(RUN, "schemas", "audit.json"), AUDIT_SCHEMA);

  const inputs = {};
  for (const c of d.cases) {
    const sourcePath = join(RUN, "inputs", "sources", `${c.id}.json`);
    const auditPath = join(RUN, "inputs", "audits", `${c.id}.json`);
    inputs[c.id] = {
      source: rel(sourcePath), source_sha256: SHA(text(sourcePath)),
      audit: existsSync(auditPath) ? rel(auditPath) : null,
      audit_sha256: existsSync(auditPath) ? SHA(text(auditPath)) : null,
      request_sha256: SHA(sourceCase(c.id).prompt),
    };
  }
  write(MANIFEST_PATH, {
    schema: "prose-author-claim-repair-diagnostic-manifest/1",
    acceptance_evidence: false,
    prepared_commit: preparedCommit,
    design_sha256: SHA(text(DESIGN_PATH)),
    locked_files: Object.fromEntries(lockedFiles.map((path) => [path, SHA(text(resolve(REPO, path)))])),
    dispatch: { repair: d.repair, reaudit: d.reaudit },
    codex_no_tools_config: CODEX_NO_TOOLS_CONFIG,
    systems: {
      repair: { path: rel(join(RUN, "prompts", "agents", "repair.md")), sha256: SHA(repairSystem) },
      audit: { path: rel(join(RUN, "prompts", "agents", "audit.md")), sha256: SHA(auditSystem) },
    },
    schemas: {
      draft: { path: rel(join(RUN, "schemas", "draft.json")), sha256: SHA(text(join(RUN, "schemas", "draft.json"))) },
      audit: { path: rel(join(RUN, "schemas", "audit.json")), sha256: SHA(text(join(RUN, "schemas", "audit.json"))) },
    },
    inputs,
  });
  process.stdout.write("prepared non-acceptance claim-repair diagnostic; commit it before dispatch\n");
}

function loadLocked() {
  const d = design();
  const manifest = json(MANIFEST_PATH);
  if (manifest.acceptance_evidence !== false) throw new Error("diagnostic cannot become acceptance evidence");
  if (SHA(text(DESIGN_PATH)) !== manifest.design_sha256) throw new Error("DESIGN.json drifted");
  const addCommit = execFileSync(
    "git", ["log", "--diff-filter=A", "--format=%H", "--", rel(MANIFEST_PATH)],
    { cwd: REPO, encoding: "utf8" },
  ).trim().split("\n")[0];
  if (!addCommit) throw new Error("MANIFEST.json is not committed");
  const anchorParent = execFileSync("git", ["rev-parse", `${addCommit}^`], { cwd: REPO, encoding: "utf8" }).trim();
  if (anchorParent !== manifest.prepared_commit) throw new Error("MANIFEST.json is not anchored to prepared_commit");
  const committedManifest = execFileSync("git", ["show", `${addCommit}:${rel(MANIFEST_PATH)}`], { cwd: REPO });
  if (SHA(committedManifest) !== SHA(text(MANIFEST_PATH))) throw new Error("MANIFEST.json is not committed unchanged");
  for (const [path, hash] of Object.entries(manifest.locked_files)) {
    if (SHA(text(resolve(REPO, path))) !== hash) throw new Error(`locked file drifted: ${path}`);
    if (SHA(preparedBlob(path, manifest.prepared_commit)) !== hash) {
      throw new Error(`locked file was not anchored in prepared_commit: ${path}`);
    }
  }
  for (const [id, input] of Object.entries(manifest.inputs)) {
    if (SHA(text(resolve(REPO, input.source))) !== input.source_sha256) throw new Error(`${id} source drifted`);
    if (input.audit && SHA(text(resolve(REPO, input.audit))) !== input.audit_sha256) throw new Error(`${id} audit drifted`);
    if (SHA(sourceCase(id).prompt) !== input.request_sha256) throw new Error(`${id} request drifted`);
  }
  for (const row of [...Object.values(manifest.systems), ...Object.values(manifest.schemas)]) {
    if (SHA(text(resolve(REPO, row.path))) !== row.sha256) throw new Error(`snapshot drifted: ${row.path}`);
  }
  return { d, manifest };
}

function repairNeed(c) {
  const source = caseSource(c);
  const request = sourceCase(c.id).prompt;
  const validation = validateVoiceDraftSource(source, { request });
  if (c.mode === "audit-rejection") {
    if (!validation.ok || validation.refusal) throw new Error(`${c.id} original source no longer validates`);
    return { source, request, audit: caseAudit(c), sourceErrors: [] };
  }
  if (validation.ok || validation.refusal || validation.errors.length !== 1
    || validation.errors[0] !== "source.ledger c3 is not cited by any sentence") {
    throw new Error(`${c.id} no longer reproduces its sole structural failure`);
  }
  return { source, request, audit: null, sourceErrors: validation.errors };
}

async function repairs() {
  const { d, manifest } = loadLocked();
  for (const c of d.cases) {
    const need = repairNeed(c);
    const prompt = claimRepairPrompt(sourceCase(c.id), need.source, need);
    const promptPath = join(RUN, "prompts", "repairs", `${c.id}.md`);
    write(promptPath, `${prompt}\n`);
    process.stdout.write(`repair ${c.id} ... `);
    const started = Date.now();
    await dispatchCodex({
      system: resolve(REPO, manifest.systems.repair.path), prompt,
      output: join(RUN, "raw", "repairs", `${c.id}.json`),
      schemaPath: resolve(REPO, manifest.schemas.draft.path),
      noToolsConfig: manifest.codex_no_tools_config, dispatch: manifest.dispatch.repair,
    });
    process.stdout.write(`${Math.round((Date.now() - started) / 1000)}s\n`);
  }
}

function repairedSource(c, manifest) {
  const prompt = text(join(RUN, "prompts", "repairs", `${c.id}.md`));
  const record = completedResult(
    join(RUN, "raw", "repairs", `${c.id}.json`), manifest.dispatch.repair,
    invocationInput(resolve(REPO, manifest.systems.repair.path), prompt, {
      schemaPath: resolve(REPO, manifest.schemas.draft.path),
    }),
  );
  if (!record) throw new Error(`${c.id} has no repair result`);
  return record.structured_output;
}

async function reaudits() {
  const { d, manifest } = loadLocked();
  for (const c of d.cases) {
    const need = repairNeed(c);
    const repaired = repairedSource(c, manifest);
    const bounded = validateVoiceDraftClaimRepair(need.source, repaired, {
      request: need.request, audit: need.audit, sourceErrors: need.sourceErrors,
    });
    if (!bounded.ok) throw new Error(`${c.id} repair is not bounded: ${bounded.errors.join("; ")}`);
    const prompt = claimAuditPrompt(sourceCase(c.id), repaired);
    const promptPath = join(RUN, "prompts", "reaudits", `${c.id}.md`);
    write(promptPath, `${prompt}\n`);
    process.stdout.write(`reaudit ${c.id} ... `);
    const started = Date.now();
    await dispatchClaude({
      system: resolve(REPO, manifest.systems.audit.path), prompt, cwd: RUN,
      tools: "", allowed: [], output: join(RUN, "raw", "reaudits", `${c.id}.json`),
      schema: AUDIT_SCHEMA, dispatch: manifest.dispatch.reaudit,
    });
    process.stdout.write(`${Math.round((Date.now() - started) / 1000)}s\n`);
  }
}

function check() {
  const { d, manifest } = loadLocked();
  const cases = {};
  let clears = true;
  for (const c of d.cases) {
    const need = repairNeed(c);
    const repaired = repairedSource(c, manifest);
    const bounded = validateVoiceDraftClaimRepair(need.source, repaired, {
      request: need.request, audit: need.audit, sourceErrors: need.sourceErrors,
    });
    const prompt = text(join(RUN, "prompts", "reaudits", `${c.id}.md`));
    const record = completedResult(
      join(RUN, "raw", "reaudits", `${c.id}.json`), manifest.dispatch.reaudit,
      invocationInput(resolve(REPO, manifest.systems.audit.path), prompt, { schema: AUDIT_SCHEMA }),
    );
    if (!record) throw new Error(`${c.id} has no reaudit result`);
    const applied = applyVoiceDraftClaimAudit(repaired, record.structured_output, { request: need.request });
    const clear = bounded.ok && applied.ok;
    clears &&= clear;
    cases[c.id] = {
      clear, bounded_errors: bounded.errors, reaudit_errors: applied.errors,
      source_sha256: SHA(JSON.stringify(need.source)),
      repaired_sha256: SHA(JSON.stringify(repaired)),
      reaudit_sha256: SHA(JSON.stringify(record.structured_output)),
    };
  }
  const result = {
    schema: "prose-author-claim-repair-diagnostic-result/1",
    acceptance_evidence: false,
    clears,
    interpretation: clears
      ? "This justifies a complete fresh acceptance run; it is not acceptance evidence."
      : "Stop before acceptance and reconsider the claim-boundary representation.",
    cases,
  };
  write(RESULT_PATH, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!clears) process.exitCode = 1;
}

const command = process.argv[2];
if (command === "prepare") prepare();
else if (command === "repairs") await repairs();
else if (command === "reaudits") await reaudits();
else if (command === "check") check();
else throw new Error(`unknown diagnostic command ${JSON.stringify(command)}`);

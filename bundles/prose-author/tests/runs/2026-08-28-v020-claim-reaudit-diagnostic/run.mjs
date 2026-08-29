#!/usr/bin/env node
/** Locked continuation of the non-acceptance three-cell claim diagnostic. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  claimAuditPrompt, claimRepairPrompt, completedResult, dispatchClaude, invocationInput,
} from "../../acceptance-runner.mjs";
import { validateVoiceDraftSource } from "../../../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA,
} from "../../../skills/prose-draft/tools/draft-claim-audit.mjs";
import { validateVoiceDraftClaimRepair } from "../../../skills/prose-draft/tools/draft-claim-repair.mjs";

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
const design = () => json(DESIGN_PATH);

function sourceCase(id) {
  const c = json(resolve(REPO, design().source_design)).cases.find((row) => row.id === id);
  if (!c) throw new Error(`source design has no case ${id}`);
  return c;
}

function repairDesign() {
  return json(resolve(REPO, design().repair_run, "DESIGN.json"));
}

function repairManifest() {
  return json(resolve(REPO, design().repair_run, "MANIFEST.json"));
}

function originalSource(id) {
  return json(resolve(REPO, design().repair_run, "inputs", "sources", `${id}.json`));
}

function originalAudit(id) {
  const path = resolve(REPO, design().repair_run, "inputs", "audits", `${id}.json`);
  return existsSync(path) ? json(path) : null;
}

function repairNeed(id) {
  const source = originalSource(id);
  const request = sourceCase(id).prompt;
  const audit = originalAudit(id);
  const validation = validateVoiceDraftSource(source, { request });
  const sourceErrors = audit ? [] : validation.errors;
  return { source, request, audit, sourceErrors };
}

function exactRepairRecord(id) {
  const manifest = repairManifest();
  const c = sourceCase(id);
  const need = repairNeed(id);
  const prompt = claimRepairPrompt(c, need.source, need);
  const record = completedResult(
    resolve(REPO, design().repair_run, "raw", "repairs", `${id}.json`),
    manifest.dispatch.repair,
    invocationInput(resolve(REPO, manifest.systems.repair.path), prompt, {
      schemaPath: resolve(REPO, manifest.schemas.draft.path),
    }),
  );
  if (!record) throw new Error(`${id} has no completed repair`);
  const bounded = validateVoiceDraftClaimRepair(need.source, record.structured_output, {
    request: need.request, audit: need.audit, sourceErrors: need.sourceErrors,
  });
  if (!bounded.ok) throw new Error(`${id} repair is not bounded: ${bounded.errors.join("; ")}`);
  return record;
}

function prepare() {
  if (existsSync(MANIFEST_PATH)) throw new Error("reaudit continuation is already prepared");
  const d = design();
  if (d.acceptance_evidence !== false || JSON.stringify(d.cases) !== JSON.stringify(["d01", "m05", "d05"])) {
    throw new Error("continuation must remain non-acceptance and fixed to three cells");
  }
  const repairFiles = d.cases.flatMap((id) => [
    `${d.repair_run}/raw/repairs/${id}.json`,
    `${d.repair_run}/raw/repairs/${id}.codex-events.jsonl`,
    `${d.repair_run}/raw/repairs/${id}.codex-output.json`,
    `${d.repair_run}/inputs/sources/${id}.json`,
    ...((id === "d05") ? [] : [`${d.repair_run}/inputs/audits/${id}.json`]),
  ]);
  const implementation = [
    "bundles/prose-author/tests/acceptance-runner.mjs",
    "bundles/prose-author/skills/prose-draft/references/claim-audit.md",
    "bundles/prose-author/skills/prose-draft/tools/draft-contract.mjs",
    "bundles/prose-author/skills/prose-draft/tools/draft-claim-audit.mjs",
    "bundles/prose-author/skills/prose-draft/tools/draft-claim-repair.mjs",
  ];
  const lockedFiles = [rel(DESIGN_PATH), rel(join(RUN, "run.mjs")), d.source_design,
    `${d.repair_run}/DESIGN.json`, `${d.repair_run}/MANIFEST.json`, ...repairFiles, ...implementation];
  execFileSync("git", ["ls-files", "--error-unmatch", ...lockedFiles], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...lockedFiles], { cwd: REPO, stdio: "ignore" });
  const preparedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();

  const auditSystem = text(resolve(REPO, "bundles/prose-author/skills/prose-draft/references/claim-audit.md"));
  write(join(RUN, "prompts", "agents", "audit.md"), auditSystem);
  write(join(RUN, "schemas", "audit.json"), AUDIT_SCHEMA);
  const inputs = {};
  for (const id of d.cases) {
    const record = exactRepairRecord(id);
    const repairedPath = join(RUN, "inputs", "repaired", `${id}.json`);
    write(repairedPath, record.structured_output);
    inputs[id] = {
      repaired: rel(repairedPath), repaired_sha256: SHA(text(repairedPath)),
      raw_repair: `${d.repair_run}/raw/repairs/${id}.json`,
      raw_repair_sha256: SHA(text(resolve(REPO, d.repair_run, "raw", "repairs", `${id}.json`))),
      request_sha256: SHA(sourceCase(id).prompt),
    };
  }
  write(MANIFEST_PATH, {
    schema: "prose-author-claim-reaudit-diagnostic-manifest/1",
    acceptance_evidence: false,
    prepared_commit: preparedCommit,
    design_sha256: SHA(text(DESIGN_PATH)),
    locked_files: Object.fromEntries(lockedFiles.map((path) => [path, SHA(text(resolve(REPO, path)))])),
    dispatch: { reaudit: d.reaudit },
    system: { path: rel(join(RUN, "prompts", "agents", "audit.md")), sha256: SHA(auditSystem) },
    audit_schema: { path: rel(join(RUN, "schemas", "audit.json")), sha256: SHA(text(join(RUN, "schemas", "audit.json"))) },
    inputs,
  });
  process.stdout.write("prepared locked reaudit continuation; commit it before dispatch\n");
}

function loadLocked() {
  const d = design();
  const manifest = json(MANIFEST_PATH);
  if (manifest.acceptance_evidence !== false || SHA(text(DESIGN_PATH)) !== manifest.design_sha256) {
    throw new Error("reaudit diagnostic design drifted");
  }
  const addCommit = execFileSync(
    "git", ["log", "--diff-filter=A", "--format=%H", "--", rel(MANIFEST_PATH)],
    { cwd: REPO, encoding: "utf8" },
  ).trim().split("\n")[0];
  if (!addCommit) throw new Error("MANIFEST.json is not committed");
  const parent = execFileSync("git", ["rev-parse", `${addCommit}^`], { cwd: REPO, encoding: "utf8" }).trim();
  if (parent !== manifest.prepared_commit) throw new Error("MANIFEST.json anchor parent drifted");
  const committed = execFileSync("git", ["show", `${addCommit}:${rel(MANIFEST_PATH)}`], { cwd: REPO });
  if (SHA(committed) !== SHA(text(MANIFEST_PATH))) throw new Error("MANIFEST.json changed after its lock commit");
  for (const [path, hash] of Object.entries(manifest.locked_files)) {
    if (SHA(text(resolve(REPO, path))) !== hash) throw new Error(`locked file drifted: ${path}`);
    const blob = execFileSync("git", ["show", `${manifest.prepared_commit}:${path}`], { cwd: REPO });
    if (SHA(blob) !== hash) throw new Error(`locked file was not in prepared_commit: ${path}`);
  }
  for (const [id, input] of Object.entries(manifest.inputs)) {
    if (SHA(text(resolve(REPO, input.repaired))) !== input.repaired_sha256) throw new Error(`${id} repaired source drifted`);
    if (SHA(text(resolve(REPO, input.raw_repair))) !== input.raw_repair_sha256) throw new Error(`${id} raw repair drifted`);
    if (SHA(sourceCase(id).prompt) !== input.request_sha256) throw new Error(`${id} request drifted`);
  }
  if (SHA(text(resolve(REPO, manifest.system.path))) !== manifest.system.sha256) throw new Error("audit system drifted");
  if (SHA(text(resolve(REPO, manifest.audit_schema.path))) !== manifest.audit_schema.sha256) throw new Error("audit schema drifted");
  return { d, manifest };
}

async function audits() {
  const { d, manifest } = loadLocked();
  for (const id of d.cases) {
    const c = sourceCase(id);
    const repaired = json(resolve(REPO, manifest.inputs[id].repaired));
    const prompt = claimAuditPrompt(c, repaired);
    const promptPath = join(RUN, "prompts", "reaudits", `${id}.md`);
    write(promptPath, prompt);
    process.stdout.write(`reaudit ${id} ... `);
    const started = Date.now();
    await dispatchClaude({
      system: resolve(REPO, manifest.system.path), prompt, cwd: RUN, tools: "", allowed: [],
      output: join(RUN, "raw", "reaudits", `${id}.json`), schema: AUDIT_SCHEMA,
      dispatch: manifest.dispatch.reaudit,
    });
    process.stdout.write(`${Math.round((Date.now() - started) / 1000)}s\n`);
  }
}

function check() {
  const { d, manifest } = loadLocked();
  const cases = {};
  let clears = true;
  for (const id of d.cases) {
    const c = sourceCase(id);
    const repaired = json(resolve(REPO, manifest.inputs[id].repaired));
    const prompt = text(join(RUN, "prompts", "reaudits", `${id}.md`));
    const record = completedResult(
      join(RUN, "raw", "reaudits", `${id}.json`), manifest.dispatch.reaudit,
      invocationInput(resolve(REPO, manifest.system.path), prompt, { schema: AUDIT_SCHEMA }),
    );
    if (!record) throw new Error(`${id} has no reaudit result`);
    const applied = applyVoiceDraftClaimAudit(repaired, record.structured_output, { request: c.prompt });
    clears &&= applied.ok;
    cases[id] = {
      clear: applied.ok, reaudit_errors: applied.errors,
      repaired_sha256: manifest.inputs[id].repaired_sha256,
      reaudit_sha256: SHA(JSON.stringify(record.structured_output)),
    };
  }
  const result = {
    schema: "prose-author-claim-reaudit-diagnostic-result/1",
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
else if (command === "audits") await audits();
else if (command === "check") check();
else throw new Error(`unknown reaudit command ${JSON.stringify(command)}`);

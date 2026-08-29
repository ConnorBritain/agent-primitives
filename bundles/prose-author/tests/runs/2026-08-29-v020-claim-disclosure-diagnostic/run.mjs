#!/usr/bin/env node
/** Locked, non-acceptance three-cell diagnostic for the audit-disclosure boundary. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  claimAuditPrompt, completedResult, dispatchClaude, invocationInput,
  localModuleClosure, manifestDispatch, stagePrompt,
} from "../../acceptance-runner.mjs";
import {
  assembleVoiceDraft, normalizeVoiceDraftSource,
} from "../../../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA, AUDIT_SCHEMA_ID,
} from "../../../skills/prose-draft/tools/draft-claim-audit.mjs";

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
  const row = json(resolve(REPO, design().source_design)).cases.find((entry) => entry.id === id);
  if (!row) throw new Error(`source design has no case ${id}`);
  return row;
}

function sourcePath(id) {
  return resolve(REPO, design().source_run, "inputs", "sources", `${id}.json`);
}

function proseOf(source) {
  return source.paragraphs
    .map((paragraph) => paragraph.sentences.map((sentence) => sentence.text.trim()).join(" "))
    .join("\n\n");
}

function publicRecord(output) {
  const matches = [...output.matchAll(/```json\n([\s\S]*?)\n```/g)];
  return matches.length ? JSON.parse(matches.at(-1)[1]) : null;
}

function gitBlob(commit, path) {
  return execFileSync("git", ["show", `${commit}:${path}`], { cwd: REPO });
}

function prepare() {
  if (existsSync(MANIFEST_PATH)) throw new Error("claim-disclosure diagnostic is already prepared");
  const d = design();
  const ids = d.cases.map((row) => row.id);
  if (d.acceptance_evidence !== false
    || d.claim_pipeline !== "audit-disclosure/1"
    || JSON.stringify(ids) !== JSON.stringify(["d01", "m05", "d05"])) {
    throw new Error("diagnostic must remain non-acceptance, audit-disclosure/1, and fixed to three cells");
  }
  const sourceFiles = ids.map((id) => rel(sourcePath(id)));
  const implementation = localModuleClosure([
    "bundles/prose-author/tests/acceptance-runner.mjs",
    "bundles/prose-author/skills/prose-draft/tools/draft-contract.mjs",
    "bundles/prose-author/skills/prose-draft/tools/draft-claim-audit.mjs",
  ]);
  const lockedFiles = [...new Set([
    rel(DESIGN_PATH), rel(join(RUN, "run.mjs")), d.source_design,
    ...sourceFiles, ...implementation,
  ])].sort();
  execFileSync("git", ["ls-files", "--error-unmatch", ...lockedFiles], { cwd: REPO, stdio: "ignore" });
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...lockedFiles], { cwd: REPO, stdio: "ignore" });
  const preparedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();

  const auditSystemSource = resolve(REPO,
    "bundles/prose-author/skills/prose-draft/references/claim-audit.md");
  const auditSystemPath = join(RUN, "prompts", "agents", "audit.md");
  const auditSchemaPath = join(RUN, "schemas", "audit.json");
  write(auditSystemPath, text(auditSystemSource));
  write(auditSchemaPath, AUDIT_SCHEMA);

  const inputs = {};
  for (const row of d.cases) {
    const c = sourceCase(row.id);
    const original = json(sourcePath(row.id));
    const normalized = normalizeVoiceDraftSource(original, { request: c.prompt });
    if (!normalized.ok || normalized.refusal) {
      throw new Error(`${row.id} cannot enter diagnostic: ${normalized.errors.join("; ")}`);
    }
    const removed = normalized.removed_ledger_ids ?? [];
    if (JSON.stringify(removed) !== JSON.stringify(row.expected_removed_ledger_ids)) {
      throw new Error(`${row.id} deterministic normalization drifted`);
    }
    const originalPath = join(RUN, "inputs", "sources", `${row.id}.original.json`);
    const normalizedPath = join(RUN, "inputs", "sources", `${row.id}.json`);
    write(originalPath, original);
    write(normalizedPath, normalized.source);
    inputs[row.id] = {
      source: rel(normalizedPath), source_sha256: SHA(text(normalizedPath)),
      original_source: rel(originalPath), original_source_sha256: SHA(text(originalPath)),
      source_run_path: rel(sourcePath(row.id)), source_run_sha256: SHA(text(sourcePath(row.id))),
      request_sha256: SHA(c.prompt), prose_sha256: SHA(proseOf(normalized.source)),
      removed_ledger_ids: removed,
    };
  }

  const anchoredFiles = [auditSystemPath, auditSchemaPath,
    ...Object.values(inputs).flatMap((input) => [
      resolve(REPO, input.source), resolve(REPO, input.original_source),
    ])];
  write(MANIFEST_PATH, {
    schema: "prose-author-claim-disclosure-diagnostic-manifest/1",
    acceptance_evidence: false,
    claim_pipeline: d.claim_pipeline,
    prepared_commit: preparedCommit,
    concurrency: 1,
    design_sha256: SHA(text(DESIGN_PATH)),
    locked_files: Object.fromEntries(lockedFiles.map((path) => [path, SHA(text(resolve(REPO, path)))])),
    anchored_files: Object.fromEntries(anchoredFiles.map((path) => [rel(path), SHA(text(path))])),
    dispatch: { claim_audit: d.dispatch },
    system: { path: rel(auditSystemPath), sha256: SHA(text(auditSystemPath)) },
    audit_schema: { path: rel(auditSchemaPath), sha256: SHA(text(auditSchemaPath)), id: AUDIT_SCHEMA_ID },
    inputs,
  });
  process.stdout.write("prepared locked claim-disclosure diagnostic; commit it before dispatch\n");
}

function loadLocked() {
  const d = design();
  const manifest = json(MANIFEST_PATH);
  if (manifest.acceptance_evidence !== false
    || manifest.claim_pipeline !== "audit-disclosure/1"
    || SHA(text(DESIGN_PATH)) !== manifest.design_sha256) {
    throw new Error("claim-disclosure diagnostic design drifted");
  }
  const addCommit = execFileSync(
    "git", ["log", "--diff-filter=A", "--format=%H", "--", rel(MANIFEST_PATH)],
    { cwd: REPO, encoding: "utf8" },
  ).trim().split("\n")[0];
  if (!addCommit) throw new Error("MANIFEST.json is not committed");
  const parent = execFileSync("git", ["rev-parse", `${addCommit}^`], { cwd: REPO, encoding: "utf8" }).trim();
  if (parent !== manifest.prepared_commit) throw new Error("MANIFEST.json anchor parent drifted");
  if (SHA(gitBlob(addCommit, rel(MANIFEST_PATH))) !== SHA(text(MANIFEST_PATH))) {
    throw new Error("MANIFEST.json changed after its lock commit");
  }
  for (const [path, hash] of Object.entries(manifest.locked_files)) {
    if (SHA(text(resolve(REPO, path))) !== hash) throw new Error(`locked file drifted: ${path}`);
    if (SHA(gitBlob(manifest.prepared_commit, path)) !== hash) {
      throw new Error(`locked file was not in prepared_commit: ${path}`);
    }
  }
  for (const [path, hash] of Object.entries(manifest.anchored_files)) {
    if (SHA(text(resolve(REPO, path))) !== hash) throw new Error(`anchored file drifted: ${path}`);
    if (SHA(gitBlob(addCommit, path)) !== hash) throw new Error(`anchored file drifted in lock commit: ${path}`);
  }
  for (const [id, input] of Object.entries(manifest.inputs)) {
    if (SHA(text(resolve(REPO, input.source))) !== input.source_sha256) throw new Error(`${id} source drifted`);
    if (SHA(text(resolve(REPO, input.original_source))) !== input.original_source_sha256) {
      throw new Error(`${id} original source drifted`);
    }
    if (SHA(text(resolve(REPO, input.source_run_path))) !== input.source_run_sha256) {
      throw new Error(`${id} source-run input drifted`);
    }
    if (SHA(sourceCase(id).prompt) !== input.request_sha256) throw new Error(`${id} request drifted`);
    if (SHA(proseOf(json(resolve(REPO, input.source)))) !== input.prose_sha256) {
      throw new Error(`${id} normalized prose drifted`);
    }
  }
  if (manifest.audit_schema.id !== AUDIT_SCHEMA_ID
    || SHA(text(resolve(REPO, manifest.system.path))) !== manifest.system.sha256
    || SHA(text(resolve(REPO, manifest.audit_schema.path))) !== manifest.audit_schema.sha256) {
    throw new Error("staged claim-audit system or schema drifted");
  }
  return { d, manifest, dispatch: manifestDispatch(manifest, "claim_audit") };
}

async function audits() {
  const { d, manifest, dispatch } = loadLocked();
  for (const row of d.cases) {
    const c = sourceCase(row.id);
    const source = json(resolve(REPO, manifest.inputs[row.id].source));
    const promptPath = join(RUN, "prompts", "audits", `${row.id}.md`);
    const prompt = stagePrompt(promptPath, claimAuditPrompt(c, source));
    process.stdout.write(`claim audit ${row.id} ... `);
    const started = Date.now();
    await dispatchClaude({
      system: resolve(REPO, manifest.system.path), prompt, cwd: RUN, tools: "", allowed: [],
      output: join(RUN, "raw", "audits", `${row.id}.json`), schema: AUDIT_SCHEMA, dispatch,
    });
    process.stdout.write(`${Math.round((Date.now() - started) / 1000)}s\n`);
  }
}

function check() {
  const { d, manifest, dispatch } = loadLocked();
  const cases = {};
  let clears = true;
  for (const row of d.cases) {
    const c = sourceCase(row.id);
    const source = json(resolve(REPO, manifest.inputs[row.id].source));
    const promptPath = join(RUN, "prompts", "audits", `${row.id}.md`);
    const expectedPrompt = `${claimAuditPrompt(c, source).replace(/\n$/, "")}\n`;
    if (!existsSync(promptPath) || text(promptPath) !== expectedPrompt) {
      throw new Error(`${row.id} staged audit prompt drifted`);
    }
    const record = completedResult(
      join(RUN, "raw", "audits", `${row.id}.json`), dispatch,
      invocationInput(resolve(REPO, manifest.system.path), expectedPrompt, { schema: AUDIT_SCHEMA }),
    );
    if (!record) throw new Error(`${row.id} has no audit result`);
    const audit = record.structured_output;
    const applied = applyVoiceDraftClaimAudit(source, audit, { request: c.prompt });
    const statuses = new Map((audit?.sentences ?? []).map((entry) => [entry.id, entry.status]));
    const expectedDisclosed = row.expected_disclosures.every((id) => statuses.get(id) === "disclose");
    const noRejects = !(audit?.sentences ?? []).some((entry) => entry.status === "reject");
    const assembled = applied.ok
      ? assembleVoiceDraft(source, { request: c.prompt, auditClaims: applied.claims })
      : { ok: false, output: null, errors: applied.errors };
    const proseUnchanged = assembled.ok
      && assembled.output.startsWith(`\`\`\`markdown\n${proseOf(source)}\n\`\`\``)
      && SHA(proseOf(source)) === manifest.inputs[row.id].prose_sha256;
    const publicClaims = assembled.ok ? (publicRecord(assembled.output)?.claims ?? []) : [];
    const disclosuresPublic = applied.ok && applied.claims.every((claim) =>
      publicClaims.some((entry) => entry.claim === claim.claim && entry.where === claim.where));
    const clear = applied.ok && expectedDisclosed && noRejects && proseUnchanged && disclosuresPublic;
    clears &&= clear;
    cases[row.id] = {
      clear,
      expected_disclosures: row.expected_disclosures,
      actual_disclosures: (audit?.sentences ?? [])
        .filter((entry) => entry.status === "disclose").map((entry) => entry.id),
      reject_ids: (audit?.sentences ?? [])
        .filter((entry) => entry.status === "reject").map((entry) => entry.id),
      claim_count: applied.claims?.length ?? 0,
      claims: applied.claims ?? [],
      audit_errors: applied.errors,
      prose_unchanged: proseUnchanged,
      disclosures_public: disclosuresPublic,
      source_sha256: manifest.inputs[row.id].source_sha256,
      prompt_sha256: SHA(expectedPrompt),
      raw_audit_sha256: SHA(text(join(RUN, "raw", "audits", `${row.id}.json`))),
      audit_sha256: SHA(JSON.stringify(audit)),
    };
  }
  const result = {
    schema: "prose-author-claim-disclosure-diagnostic-result/1",
    acceptance_evidence: false,
    clears,
    model_calls: 3,
    redraws: 0,
    interpretation: clears
      ? "The audit-disclosure boundary merits a complete fresh acceptance run; this is not acceptance evidence."
      : "Stop before acceptance and reconsider the audit-disclosure boundary.",
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
else throw new Error(`unknown claim-disclosure command ${JSON.stringify(command)}`);

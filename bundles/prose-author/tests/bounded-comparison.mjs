#!/usr/bin/env node
/** Six cases, three conditions, one initial draft each. No repair or release bar. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { renderCurrentProfile, selectCurrentExamples, compactProfile, copyingCheck, scanRuntimeArtifacts, runtimeDependencies } from "../skills/prose-draft/tools/writing-runtime.mjs";
import { callModel } from "../skills/prose-draft/tools/runtime-adapters.mjs";
import { DRAFT_INSTRUCTIONS, PROFILE_INSTRUCTIONS, DRAFT_SCHEMA, validateDraftV5 } from "../skills/prose-draft/tools/runtime-contract.mjs";
import { sha256, readCurrentSamples, validateProfileV3, heldOutDiagnostics, measureSamples } from "../skills/prose-draft/tools/profile-v3.mjs";
import { checkRules, compareObserved } from "../skills/prose-draft/tools/style-rules.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, "../../..");
export const DESIGN = join(HERE, "fixtures/v040/COMPARISON-DESIGN.json");
export const CONDITIONS = ["examples", "profile", "profile-and-examples"];
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof v === "string" ? v : `${JSON.stringify(v, null, 2)}\n`, { flag: "wx", mode: 0o600 }); };
export function comparisonInputs(design, form, samples, profile) {
  const rules = [...design.shared_rules, { id: "length", kind: "word-limit", directive: `Use ${form.minimum}–${form.maximum} words.`, minimum: form.minimum, maximum: form.maximum }];
  const selected = selectCurrentExamples(samples, { context: form.context, target_words: (form.minimum + form.maximum) / 2 });
  const base = { brief: form.brief, mode: form.mode, context: form.context, facts: design.facts,
    source_text: form.source_text ?? "", rules };
  return CONDITIONS.map((condition) => ({ condition, input: { ...base,
    profile: condition === "examples" ? null : compactProfile(profile),
    examples: condition === "profile" ? [] : selected.examples } }));
}

export async function runComparison(out, { dispatch = callModel, signal } = {}) {
  const design = read(DESIGN);
  if (design.authors.length !== 2 || design.forms.length !== 3 || JSON.stringify(design.conditions) !== JSON.stringify(CONDITIONS)) throw new Error("Expected the bounded 2×3×3 design");
  mkdirSync(out, { mode: 0o700 }); // Refuse overwrite, resume or redraw of a prior set.
  const started = Date.now();
  const manifest = { schema: "prose-author-bounded-manifest/1", design, design_digest: sha256(readFileSync(DESIGN)),
    implementation_commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
    prompt_digests: { draft: sha256(DRAFT_INSTRUCTIONS), profile: sha256(PROFILE_INSTRUCTIONS) },
    initial_draft_calls: 18, profile_calls: 2, redraws: 0, required_human_attestation: false };
  write(join(out, "MANIFEST.json"), manifest);
  const records = [], profiles = {}, cells = [], measurements = {};
  const record = (stage, entry) => {
    const result = entry.result ?? entry;
    const id = `${String(records.length + 1).padStart(3, "0")}-${stage}`;
    write(join(out, "calls", `${id}.json`), entry);
    records.push({ id, stage, status: result.status, dispatched: result.dispatched ?? false, model: result.model ?? null,
      elapsed_ms: result.elapsed_ms ?? 0, usage: result.usage ?? null, reason: result.reason ?? null });
    process.stdout.write(`${id}: ${result.status}, ${result.elapsed_ms ?? 0} ms\n`);
  };
  for (const author of design.authors) {
    if (signal?.aborted) break;
    const samples = readCurrentSamples(join(HERE, "fixtures/profiles", author));
    measurements[author] = measureSamples(samples);
    write(join(out, "inputs", `${author}.json`), samples);
    const rendered = await renderCurrentProfile({ id: author, samples, adapter: { harness: design.harness, timeout_ms: 300000 } }, {
      dispatch, signal, onCall: (entry) => record(`${author}-profile`, entry) });
    write(join(out, "profiles", `${author}.json`), rendered);
    profiles[author] = rendered;
    if (rendered.status !== "passed") continue; // Incomplete evidence is reported, never a fabricated profile.
    for (const form of design.forms) for (const { condition, input } of comparisonInputs(design, form, samples, rendered.profile)) {
      if (signal?.aborted) break;
      const id = `${author}-${form.id}-${condition}`;
      let result;
      try { result = await dispatch({ harness: design.harness, timeout_ms: 180000, system: DRAFT_INSTRUCTIONS, input, schema: DRAFT_SCHEMA, signal }); }
      catch (e) { result = { status: "failed", reason: e.message, dispatched: false }; }
      record(id, { stage: "initial-draft", system: DRAFT_INSTRUCTIONS, input, result });
      const errors = result.status === "passed" ? validateDraftV5(result.value, [...input.rules.map((r) => r.id), ...(input.profile?.observations.map((o) => o.id) ?? [])]) : [result.reason ?? "Dispatch failed"];
      const draft = errors.length || result.value?.kind !== "draft" ? null : result.value.draft;
      const cell = { id, author, form: form.id, condition, input_digest: sha256(JSON.stringify(input)),
        status: draft ? "initial-candidate" : result.value?.kind === "refusal" ? "refused" : "failed", errors,
        refused: result.value?.refused ?? null, draft, draft_digest: draft === null ? null : sha256(draft),
        omitted: result.value?.omitted ?? [], claims: result.value?.claims ?? [],
        mechanical: draft === null ? null : checkRules(draft, input.rules),
        observed: draft === null ? null : compareObserved(draft, rendered.profile, form.context),
        // Unknown source form/register is not silently treated as matching a new form.
        pooled_diagnostic: draft === null ? null : { comparison: compareObserved(draft, rendered.profile, {}), interpretation: "Unspecified-metadata corpus reference only; not a form-matched pass or failure" },
        copying: draft === null ? null : copyingCheck(draft, samples, { original: input.source_text }),
        artifacts: draft === null ? null : scanRuntimeArtifacts(draft, runtimeDependencies().scanner),
        human_keep_edit: "not-measured", editing_burden: "not-measured", semantic_review: "not-evaluated" };
      cells.push(cell); write(join(out, "cells", `${id}.json`), cell);
      if (draft !== null) write(join(out, "drafts", `${id}.md`), draft);
    }
  }
  const report = { schema: "prose-author-bounded-report/1", status: cells.length === 18 && cells.every((c) => c.draft !== null) ? "recorded" : "incomplete",
    elapsed_ms: Date.now() - started, calls: records, model_calls: records.filter((r) => r.dispatched).length,
    cells, held_out_human: Object.fromEntries(Object.entries(measurements).map(([author, m]) => [author, heldOutDiagnostics(m)])),
    limits: design.limits, profiles: Object.fromEntries(Object.entries(profiles).map(([author, p]) => [author, { status: p.status, reason: p.reason ?? null }])) };
  write(join(out, "REPORT.json"), report);
  write(join(out, "REPORT.md"), renderComparisonReport(report));
  return report;
}

export function renderComparisonReport(report) {
  const rows = report.cells.map((c) => `| ${c.author} / ${c.form} | ${c.condition} | ${c.mechanical?.draft_words ?? "—"} | ${c.mechanical?.status ?? "not-evaluated"} | ${c.omitted.length} | ${c.copying?.findings.length ?? "—"} | ${c.status} |`);
  return `# Bounded personal-style comparison\n\nStatus: **${report.status}**. ${report.cells.length}/18 initial candidates recorded; ${report.model_calls} actual model calls; ${(report.elapsed_ms / 1000).toFixed(1)} seconds elapsed. No redraws, repairs or critic panel.\n\n| Case | Condition | Words | Explicit rules | Omissions | Copying flags | State |\n|---|---|---:|---|---:|---:|---|\n${rows.join("\n")}\n\n## Interpretation and limits\n\nThese are initial candidates, not certified final prose. Rule compliance is not resemblance or quality. Numeric deviations, source-group compatibility, excluded material, claim disclosures, artifact findings, per-call models/latencies and held-out human departures are recorded in REPORT.json. An unknown corpus form is not silently treated as a matching form. Pooled diagnostics are labeled separately.\n\n${report.limits.map((l) => `- ${l}`).join("\n")}\n`;
}

/** Recount immutable initial drafts; never dispatches a model or replaces a cell. */
export function comparisonCallErrors(design, calls) {
  const expected = design.authors.flatMap((author) => [`${author}-profile`,
    ...design.forms.flatMap((form) => CONDITIONS.map((condition) => `${author}-${form.id}-${condition}`))]);
  // A condition named "profile" is a draft, not another profile-render call.
  return JSON.stringify(calls.map((r) => r.stage)) === JSON.stringify(expected)
    && new Set(calls.map((r) => r.id)).size === expected.length
    ? [] : ["Expected exactly two profile and eighteen draft records in design order, with no redraws"];
}

export function verifyComparison(out) {
  const manifest = read(join(out, "MANIFEST.json")), report = read(join(out, "REPORT.json")), errors = [];
  if (manifest.prompt_digests.draft !== sha256(DRAFT_INSTRUCTIONS) || manifest.prompt_digests.profile !== sha256(PROFILE_INSTRUCTIONS)) errors.push("Current prompt bodies differ from the recorded comparison");
  if (manifest.design_digest !== sha256(readFileSync(DESIGN)) || JSON.stringify(manifest.design) !== JSON.stringify(read(DESIGN))) errors.push("Comparison design changed");
  if (report.cells.length !== 18 || new Set(report.cells.map((c) => c.id)).size !== 18) errors.push("Expected eighteen unique initial cells");
  errors.push(...comparisonCallErrors(manifest.design, report.calls));
  for (const author of manifest.design.authors) {
    const samples = read(join(out, "inputs", `${author}.json`)), rendered = read(join(out, "profiles", `${author}.json`));
    if (JSON.stringify(samples) !== JSON.stringify(readCurrentSamples(join(HERE, "fixtures/profiles", author)))) errors.push(`${author}: source corpus changed`);
    if (rendered.status !== "passed") { errors.push(`${author}: profile not rendered`); continue; }
    errors.push(...validateProfileV3(rendered.profile, { samples }).map((e) => `${author}: ${e}`));
    for (const form of manifest.design.forms) for (const { condition, input } of comparisonInputs(manifest.design, form, samples, rendered.profile)) {
      const id = `${author}-${form.id}-${condition}`, cell = report.cells.find((c) => c.id === id);
      if (!cell || cell.draft === null) { errors.push(`${id}: initial draft missing`); continue; }
      const record = report.calls.find((r) => r.stage === id);
      if (!record) { errors.push(`${id}: call record missing`); continue; }
      const raw = read(join(out, "calls", `${record.id}.json`));
      if (JSON.stringify(input) !== JSON.stringify(raw.input) || raw.system !== DRAFT_INSTRUCTIONS || cell.input_digest !== sha256(JSON.stringify(input))) errors.push(`${id}: generation inputs do not reproduce`);
      errors.push(...validateDraftV5(raw.result.value, [...input.rules.map((r) => r.id), ...(input.profile?.observations.map((o) => o.id) ?? [])]).map((e) => `${id}: ${e}`));
      if (raw.result.value.draft !== cell.draft || readFileSync(join(out, "drafts", `${id}.md`), "utf8") !== cell.draft || cell.draft_digest !== sha256(cell.draft)) errors.push(`${id}: final initial-draft bytes changed`);
      if (JSON.stringify(checkRules(cell.draft, input.rules)) !== JSON.stringify(cell.mechanical)) errors.push(`${id}: rule results do not reproduce`);
      if (JSON.stringify(copyingCheck(cell.draft, samples, { original: input.source_text })) !== JSON.stringify(cell.copying)) errors.push(`${id}: copying results do not reproduce`);
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--out"), out = process.argv[i + 1];
  if (process.argv.includes("--check")) {
    if (i < 0 || !out) throw new Error("Use --check --out recorded-directory");
    const errors = verifyComparison(resolve(out));
    process.stdout.write(errors.length ? `${errors.join("\n")}\n` : "Current comparison inputs, profiles and exact draft checks reproduce.\n");
    process.exitCode = errors.length ? 1 : 0;
  } else {
  if (i < 0 || !out || existsSync(resolve(out))) throw new Error("Use --out NEW-directory; existing comparisons cannot be overwritten");
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort()); process.once("SIGTERM", () => controller.abort());
  const report = await runComparison(resolve(out), { signal: controller.signal });
  process.stdout.write(`Comparison ${report.status}: ${report.cells.length}/18 cells\n`);
  if (report.status !== "recorded") process.exitCode = 1;
  }
}

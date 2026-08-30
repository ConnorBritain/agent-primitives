#!/usr/bin/env node
/** Bounded whole-paragraph pruning for a still-overlong semantic revision. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeVoiceDraftSource } from "./draft-contract.mjs";
import { measureDraftConformance } from "./draft-conformance.mjs";
import {
  draftTargetCard, SEMANTIC_BEARING_MEASUREMENTS, wordTargetBounds,
} from "./draft-targets.mjs";

export const RESIDUAL_PRUNE_SCHEMA_ID = "voice-draft-residual-prune/1";
export const MAX_PRUNED_PARAGRAPHS = 6;

export const RESIDUAL_PRUNE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    schema: { type: "string", const: RESIDUAL_PRUNE_SCHEMA_ID },
    delete_paragraphs: {
      type: "array", minItems: 1, maxItems: MAX_PRUNED_PARAGRAPHS,
      items: { type: "integer", minimum: 2, maximum: 999 },
    },
    reason: { type: "string", minLength: 1, maxLength: 1000 },
  },
  required: ["schema", "delete_paragraphs", "reason"],
};

const words = (value) => String(value).trim() ? String(value).trim().split(/\s+/).length : 0;

export function requestedExactTitle(request) {
  if (typeof request !== "string" || !/\bkeep the title\b/i.test(request)) return null;
  const match = request.match(/\bTitle:\s*(.+?)(?=\.\s+(?:Cover|Include|Discuss|Explain|Argue|Keep)\b|[\r\n]|$)/i);
  return match?.[1]?.trim() || null;
}

const openingTitle = (draft) => {
  const first = String(draft).split(/\r?\n/).find((line) => line.trim())?.trim() || "";
  return first.replace(/^#\s+/, "").trim();
};

export function semanticResidualStatus(source, { request, card }) {
  const normalized = normalizeVoiceDraftSource(source, { request });
  if (!normalized.ok || normalized.refusal) {
    return {
      ok: false, needs_correction: true, errors: normalized.errors,
      source: null, report: null, semantic_failures: [], length: null, title: null,
    };
  }
  const report = measureDraftConformance(normalized.source.draft, card);
  const semanticFailures = report.measurements.filter((row) =>
    SEMANTIC_BEARING_MEASUREMENTS.includes(row.measurement_id) && row.status !== "in-range");
  const bounds = Number.isInteger(card?.word_target) ? wordTargetBounds(card.word_target) : null;
  const length = !bounds ? null : {
    ...bounds,
    actual: report.draft_words,
    status: report.draft_words < bounds.minimum ? "deficit"
      : report.draft_words > bounds.maximum ? "excess" : "in-range",
  };
  const expectedTitle = requestedExactTitle(request);
  const title = !expectedTitle ? null : {
    expected: expectedTitle,
    actual: openingTitle(normalized.source.draft),
    status: openingTitle(normalized.source.draft) === expectedTitle ? "exact" : "mismatch",
  };
  return {
    ok: true,
    needs_correction: semanticFailures.length > 0
      || (length && length.status !== "in-range") || (title && title.status !== "exact"),
    errors: [], source: normalized.source, report,
    semantic_failures: semanticFailures, length, title,
  };
}

export function residualParagraphs(draft) {
  return String(draft).trim().split(/\r?\n\s*\r?\n/).map((text, index) => ({
    id: index + 1,
    text,
    words: words(text),
    heading: /^#{1,6}\s+\S/.test(text.trim()),
  }));
}

export function normalizeSafeResidual(source, { request, card }) {
  const normalized = normalizeVoiceDraftSource(source, { request });
  if (!normalized.ok || normalized.refusal) {
    return { ok: false, errors: normalized.errors, source: null, changes: [], status: null };
  }
  const paragraphs = residualParagraphs(normalized.source.draft);
  const changes = [];
  const title = requestedExactTitle(request);
  if (title && openingTitle(paragraphs[0]?.text) !== title) {
    const before = paragraphs[0].text;
    paragraphs[0] = { ...paragraphs[0], text: `# ${title}`, words: words(`# ${title}`), heading: true };
    changes.push({ kind: "restore-exact-title", paragraph: 1, before, after: paragraphs[0].text });
  }
  let interim = { ...normalized.source, draft: paragraphs.map((row) => row.text).join("\n\n") };
  let status = semanticResidualStatus(interim, { request, card });
  const questionFailure = status.semantic_failures.find((row) => row.measurement_id === "question-marks"
    && row.status === "excess");
  let excess = questionFailure ? questionFailure.actual_count - questionFailure.maximum : 0;
  for (const row of paragraphs) {
    if (excess < 1 || row.id === 1 || !row.heading || !/\?\s*$/.test(row.text)) continue;
    const before = row.text;
    row.text = row.text.replace(/\?\s*$/, "");
    row.words = words(row.text);
    changes.push({ kind: "remove-heading-question-mark", paragraph: row.id, before, after: row.text });
    excess -= 1;
  }
  interim = { ...normalized.source, draft: paragraphs.map((row) => row.text).join("\n\n") };
  status = semanticResidualStatus(interim, { request, card });
  return { ok: true, errors: [], source: interim, changes, status, paragraphs };
}

const planErrors = (plan) => {
  const errors = [];
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return ["residual prune plan must be an object"];
  if (plan.schema !== RESIDUAL_PRUNE_SCHEMA_ID) errors.push(`residual prune schema must be ${RESIDUAL_PRUNE_SCHEMA_ID}`);
  if (!Array.isArray(plan.delete_paragraphs) || plan.delete_paragraphs.length < 1
    || plan.delete_paragraphs.length > MAX_PRUNED_PARAGRAPHS) {
    errors.push(`residual prune must delete 1–${MAX_PRUNED_PARAGRAPHS} paragraphs`);
  } else if (plan.delete_paragraphs.some((id) => !Number.isInteger(id) || id < 2)) {
    errors.push("residual prune paragraph ids must be integers greater than one");
  } else if (new Set(plan.delete_paragraphs).size !== plan.delete_paragraphs.length) {
    errors.push("residual prune paragraph ids must be unique");
  }
  if (typeof plan.reason !== "string" || !plan.reason.trim()) errors.push("residual prune needs a reason");
  const keys = Object.keys(plan).sort().join(",");
  if (keys !== "delete_paragraphs,reason,schema") errors.push("residual prune plan has unknown or missing fields");
  return errors;
};

export function applyResidualPrunePlan(priorSource, plan, { request, card }) {
  const errors = planErrors(plan);
  const base = normalizeSafeResidual(priorSource, { request, card });
  if (!base.ok) return { ok: false, errors: [...errors, ...base.errors], source: null, report: null };
  if (base.status.length?.status !== "excess") {
    errors.push("whole-paragraph pruning is only available for a remaining length excess");
  }
  const ids = new Set(plan?.delete_paragraphs || []);
  for (const id of ids) {
    const row = base.paragraphs.find((paragraph) => paragraph.id === id);
    if (!row) errors.push(`residual prune paragraph ${id} does not exist`);
    else if (row.heading) errors.push(`residual prune paragraph ${id} is a heading`);
    else if (id === base.paragraphs.length) errors.push("residual prune cannot delete the closing paragraph");
  }
  for (let start = 0; start < base.paragraphs.length; start += 1) {
    if (!base.paragraphs[start].heading) continue;
    let end = start + 1;
    while (end < base.paragraphs.length && !base.paragraphs[end].heading) end += 1;
    const bodies = base.paragraphs.slice(start + 1, end).filter((row) => !row.heading);
    if (bodies.length && bodies.every((row) => ids.has(row.id))) {
      errors.push(`residual prune cannot empty section beginning at paragraph ${base.paragraphs[start].id}`);
    }
  }
  if (errors.length) return { ok: false, errors, source: null, report: null };
  const kept = base.paragraphs.filter((row) => !ids.has(row.id));
  const source = { ...base.source, draft: kept.map((row) => row.text).join("\n\n") };
  const status = semanticResidualStatus(source, { request, card });
  for (const row of status.semantic_failures) {
    errors.push(`residual prune leaves ${row.measurement_id} count ${row.actual_count} ${row.status}; required ${row.minimum}–${row.maximum}`);
  }
  if (status.length && status.length.status !== "in-range") {
    errors.push(`residual prune has ${status.length.actual} words; required ${status.length.minimum}–${status.length.maximum}`);
  }
  if (status.title && status.title.status !== "exact") errors.push("residual prune did not preserve the exact requested title");
  return {
    ok: errors.length === 0, errors, source, report: status.report,
    length: status.length, title: status.title,
    safe_changes: base.changes,
    deleted: base.paragraphs.filter((row) => ids.has(row.id)),
  };
}

export function residualPrunePrompt(priorSource, { request, card }) {
  const base = normalizeSafeResidual(priorSource, { request, card });
  if (!base.ok || base.status.length?.status !== "excess") {
    throw new TypeError("residual prune requires one valid overlong semantic revision");
  }
  const preferredTolerance = Math.max(25, Math.ceil(base.status.length.target * 0.075));
  const preferredMaximum = base.status.length.target + preferredTolerance;
  const hardCut = base.status.length.actual - base.status.length.maximum;
  const preferredCut = Math.max(hardCut, base.status.length.actual - preferredMaximum);
  const rows = base.paragraphs.map((row) => [
    `### Paragraph ${row.id} — ${row.words} words${row.heading ? " — LOCKED HEADING" : ""}`,
    "", row.text, "",
  ]).flat();
  return [
    "Select whole body paragraphs to delete from one rejected overlong draft.",
    "You are not writing or revising prose. Return one deletion plan only. Deterministic code",
    "will apply the plan, restore the exact title, perform the listed safe heading normalization,",
    "and reject the result unless every semantic counter and length bound passes.",
    "",
    "## Request", "", request, "",
    "## Hard constraints", "",
    `- The normalized draft has ${base.status.length.actual} words; it must end at ${base.status.length.minimum}–${base.status.length.maximum} words.`,
    `- Delete at least ${hardCut} words. Prefer deleting at least ${preferredCut} words so the result is no more than ${preferredMaximum}.`,
    "- Do not delete paragraph 1, any LOCKED HEADING, the closing paragraph, or every body paragraph in a section.",
    "- Preserve the request's subject, audience, position, every requested point, recommendations, and supplied facts.",
    "- Prefer redundant examples, repeated setup, and recap paragraphs over thesis, transitions, or requested-point coverage.",
    "- Paragraph ids refer to the normalized draft below and must be returned exactly.",
    ...(base.changes.length ? [
      "", "## Deterministic safe changes already reserved", "",
      ...base.changes.map((change) => `- Paragraph ${change.paragraph}: ${change.kind}.`),
    ] : []),
    "", "## Normalized numbered draft", "", ...rows,
    "Return voice-draft-residual-prune/1 exactly. Give only paragraph ids and a short reason; do not return prose.",
  ].join("\n");
}

const cliArgs = (argv) => {
  const args = { command: argv[0] };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`invalid argument ${key ?? "(missing)"}`);
    args[key.slice(2).replaceAll("-", "_")] = value;
  }
  return args;
};

const cliJson = (path) => JSON.parse(readFileSync(resolve(path), "utf8"));
const cliSource = (path) => {
  const value = cliJson(path);
  return value?.structured_output && typeof value.structured_output === "object"
    ? value.structured_output : value;
};

export function residualPruneCli(argv = process.argv.slice(2)) {
  const args = cliArgs(argv);
  if (args.command === "schema") {
    process.stdout.write(`${JSON.stringify(RESIDUAL_PRUNE_SCHEMA, null, 2)}\n`);
    return;
  }
  if (!args.source || !args.profile || !args.request_file) {
    throw new Error("prompt/apply require --source, --profile, and --request-file");
  }
  const source = cliSource(args.source);
  const profile = cliJson(args.profile);
  const request = readFileSync(resolve(args.request_file), "utf8").trim();
  const card = draftTargetCard(profile, request);
  if (args.command === "prompt") {
    process.stdout.write(`${residualPrunePrompt(source, { request, card })}\n`);
    return;
  }
  if (args.command === "apply") {
    if (!args.plan) throw new Error("apply requires --plan");
    const result = applyResidualPrunePlan(source, cliSource(args.plan), { request, card });
    if (!result.ok) throw new Error(result.errors.join("; "));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  throw new Error("usage: draft-residual-prune.mjs <schema|prompt|apply> [--source file --profile file --request-file file --plan file]");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    residualPruneCli();
  } catch (error) {
    process.stderr.write(`draft-residual-prune: ${error.message}\n`);
    process.exitCode = 1;
  }
}

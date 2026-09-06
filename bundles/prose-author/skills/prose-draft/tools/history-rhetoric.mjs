/** Optional one-draw rhetorical estimates. Raw inputs/results never enter durable callbacks. */
import { createHash } from "node:crypto";
import { visibleProse, wordCount } from "./visible-prose.mjs";
import { segmentHistoryProse } from "./history-measure.mjs";
import { callModel } from "./runtime-adapters.mjs";
import { runtimePrompt, schemaErrors } from "./runtime-contract.mjs";
import { bodyRange } from "./profile-v3.mjs";

export const RHETORIC_LABELS = ["qualification-uncertainty", "qualification-scope", "qualification-concession", "analogy-explanation", "analogy-evaluation", "analogy-illustration",
  "reader-direct", "reader-inclusive", "reader-question", "reader-directive", "paragraph-claim", "paragraph-explanation", "paragraph-evidence", "paragraph-qualification", "paragraph-transition", "paragraph-closure"];
export const RHETORIC_RUBRIC = "rhetoric-rubric/1";
const number = { type: "number" };
const object = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
export const RHETORIC_SCHEMA = object({ schema: { type: "string", const: "voice-rhetoric-source/1" },
  annotations: { type: "array", items: object({ label: { type: "string", enum: RHETORIC_LABELS }, paragraph: number, start: number, end: number }) },
  unclassified: { type: "array", items: number } });
export const RHETORIC_REASONS = ["disabled", "budget-exhausted", "oversized", "no-prose", "unsupported-language", "dependency-unavailable", "dispatch-failed", "invalid-evidence", "cancelled"];
const digest = (s) => createHash("sha256").update(s).digest("hex");
const unavailable = (reason, call = null) => ({ status: "not-evaluated", reason, ...(call ? { call } : {}) });
export function rhetoricalInput(text, options = {}) {
  const n = visibleProse(text, { format: options.format ?? "markdown", quotedRanges: options.quoted_ranges ?? [], bodyRange: bodyRange(text) });
  const segmented = segmentHistoryProse(n.author);
  return { language: "en", paragraphs: segmented.paragraphs.map((p) => n.author.slice(p.start, p.end)), words: wordCount(n.author),
    paragraph_lengths: segmented.paragraphs.map((p) => p.end - p.start),
    sentence_spans: segmented.paragraphs.map((p) => p.sentences.map((s) => ({ start: s.start - p.start, end: s.end - p.start }))) };
}
export function validateRhetoricalSource(value, paragraphs) {
  const errors = schemaErrors(value, RHETORIC_SCHEMA);
  if (errors.length) return errors;
  const seen = new Set(), annotated = new Set();
  for (const a of value.annotations) {
    const p = paragraphs[a.paragraph];
    if (![a.paragraph, a.start, a.end].every(Number.isInteger) || !p || a.start < 0 || a.end <= a.start || a.end > p.length || !p.slice(a.start, a.end).trim()) { errors.push("Invalid evidence span"); continue; }
    // A boundary may not bisect a UTF-16 surrogate pair.
    if ([a.start, a.end].some((i) => i > 0 && i < p.length && /[\uDC00-\uDFFF]/.test(p[i]) && /[\uD800-\uDBFF]/.test(p[i - 1]))) errors.push("Split code point");
    if (a.label.startsWith("paragraph-") && (a.start !== 0 || a.end !== p.length)) errors.push("Paragraph role requires whole-paragraph span");
    const key = JSON.stringify([a.label, a.paragraph, a.start, a.end]);
    if (seen.has(key)) errors.push("Duplicate annotation");
    seen.add(key); annotated.add(a.paragraph);
  }
  if (new Set(value.unclassified).size !== value.unclassified.length || value.unclassified.some((i) => !Number.isInteger(i) || !paragraphs[i] || annotated.has(i))) errors.push("Invalid unclassified accounting");
  for (let i = 0; i < paragraphs.length; i++) if (!annotated.has(i) && !value.unclassified.includes(i)) errors.push("Silent paragraph omission");
  return errors;
}
export function aggregateRhetoric(value, input, { model, harness, prompt_digest, call = null }) {
  if (validateRhetoricalSource(value, input.paragraphs).length) throw new TypeError("Invalid rhetorical evidence");
  const series = digest(JSON.stringify([RHETORIC_RUBRIC, prompt_digest, harness, model]));
  return { status: "measured-estimate", rubric: RHETORIC_RUBRIC, series, model, harness, prompt_digest,
    paragraphs: input.paragraphs.length, unclassified: value.unclassified.length,
    measurements: RHETORIC_LABELS.map((id) => {
      const count = value.annotations.filter((a) => a.label === id).length;
      const denominator = id.startsWith("paragraph-") ? input.paragraphs.length : input.words;
      return { id, count, denominator, value: denominator ? count / denominator * (id.startsWith("paragraph-") ? 1 : 1000) : null };
    }), ...(call ? { call } : {}) };
}
export function validateStoredRhetoric(value) {
  const exact = (obj, keys) => obj && typeof obj === "object" && !Array.isArray(obj) && Object.keys(obj).every((k) => keys.includes(k));
  const finite = (v) => Number.isFinite(v) && v >= 0;
  const hex = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
  if (!exact(value, ["status", "reason", "rubric", "series", "model", "harness", "prompt_digest", "paragraphs", "unclassified", "measurements", "call"])) throw new TypeError("Unexpected rhetorical storage fields");
  if (value.call) {
    const c = value.call;
    if (!exact(c, ["harness", "model", "elapsed_ms", "dispatched", "prompt_digest", "input_digest", "usage"]) || !["codex", "claude"].includes(c.harness)
      || (c.model !== null && !/^[a-zA-Z0-9_.:[\] -]{1,100}$/.test(c.model)) || !finite(c.elapsed_ms) || typeof c.dispatched !== "boolean"
      || !hex(c.prompt_digest) || !hex(c.input_digest) || !exact(c.usage, ["input_tokens", "output_tokens", "cached_input_tokens"]) || !Object.values(c.usage).every(finite)) throw new TypeError("Invalid sanitized call metadata");
  }
  if (value.status === "not-evaluated" && RHETORIC_REASONS.includes(value.reason) && !value.measurements) return value;
  if (value.status !== "measured-estimate" || value.rubric !== RHETORIC_RUBRIC || !hex(value.series) || !hex(value.prompt_digest)
    || !["codex", "claude"].includes(value.harness) || typeof value.model !== "string" || !/^[a-zA-Z0-9_.:[\] -]{1,100}$/.test(value.model)
    || !Number.isInteger(value.paragraphs) || value.paragraphs < 1 || !Number.isInteger(value.unclassified) || value.unclassified < 0 || value.unclassified > value.paragraphs
    || value.measurements?.length !== RHETORIC_LABELS.length) throw new TypeError("Invalid rhetorical estimate");
  for (let i = 0; i < RHETORIC_LABELS.length; i++) {
    const m = value.measurements[i];
    if (!exact(m, ["id", "count", "denominator", "value"]) || m.id !== RHETORIC_LABELS[i] || !Number.isInteger(m.count) || m.count < 0
      || !Number.isInteger(m.denominator) || m.denominator <= 0 || m.value !== m.count / m.denominator * (m.id.startsWith("paragraph-") ? 1 : 1000)) throw new TypeError("Invalid rhetorical arithmetic");
  }
  return value;
}
export async function measureRhetoric(text, { enabled = false, budget, adapter, signal, ...options } = {}, { dispatch = callModel } = {}) {
  if (!enabled) return unavailable("disabled");
  if (!budget || !Number.isInteger(budget.remaining) || budget.remaining <= 0) return unavailable("budget-exhausted");
  if (!/^en(?:-|$)/i.test(options.language ?? "en")) return unavailable("unsupported-language");
  const input = rhetoricalInput(text, options);
  if (!input.words) return unavailable("no-prose");
  if (text.length > 48000 || input.paragraphs.length > 200) return unavailable("oversized");
  if (signal?.aborted) return unavailable("cancelled");
  const system = runtimePrompt("voice-rhetoric-measure");
  if (!system || !["claude", "codex"].includes(adapter?.harness)) return unavailable("dependency-unavailable");
  budget.remaining--;
  let result;
  try { result = await dispatch({ ...adapter, system, input, schema: RHETORIC_SCHEMA, signal }); }
  catch { return unavailable("dispatch-failed"); }
  const usage = Object.fromEntries(["input_tokens", "output_tokens", "cached_input_tokens"].filter((k) => Number.isFinite(result.usage?.[k]) && result.usage[k] >= 0).map((k) => [k, result.usage[k]]));
  const model = typeof result.model === "string" && /^[a-zA-Z0-9_.:[\] -]{1,100}$/.test(result.model) ? result.model : null;
  const call = { harness: adapter.harness, model, elapsed_ms: Number.isFinite(result.elapsed_ms) && result.elapsed_ms >= 0 ? result.elapsed_ms : 0,
    dispatched: result.dispatched === true, prompt_digest: digest(system), input_digest: digest(JSON.stringify(input)), usage };
  if (result.status !== "passed" || !model) return unavailable("dispatch-failed", call);
  if (validateRhetoricalSource(result.value, input.paragraphs).length) return unavailable("invalid-evidence", call);
  return validateStoredRhetoric(aggregateRhetoric(result.value, input, { model, harness: adapter.harness, prompt_digest: call.prompt_digest, call }));
}

/** Headless production orchestration; independent stages, bounded repair, final-byte receipts. */
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { sha256, validateProfileV3, measureSamples, assembleProfileV3 } from "./profile-v3.mjs";
import { visibleProse, wordCount } from "./visible-prose.mjs";
import { initPreferencesV2, compileStyleV2, digest } from "./preferences-v2.mjs";
import { checkRules, compareObserved, verifyRuleReceipt } from "./style-rules.mjs";
import { callModel, canonicalHarness } from "./runtime-adapters.mjs";
import { DRAFT_SCHEMA, PROFILE_SOURCE_SCHEMA, REVIEW_SCHEMA, schemaErrors, validateDraftV5, validateReview,
  DRAFT_INSTRUCTIONS, PROFILE_INSTRUCTIONS, TASK_REVIEW_INSTRUCTIONS, REVIEW_TRANSPORT } from "./runtime-contract.mjs";
import { findScanner } from "./verify.mjs";
import { installedCompanions } from "./installed-dependencies.mjs";
import { startHistorySession } from "./history-session.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const strip = (s) => s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
export const MAX_REPAIRS = 2;
export const MAX_CALLS = 16;

/** Preserve omission disclosures, but do not turn reviewed natural variation into quotas. */
export function reviewedAdvisoryOmissions(omitted, advisoryIds, reviews) {
  return omitted.filter((o) => advisoryIds.includes(o.id) && ["task-review", "voice-review"].every((stage) => {
    const review = reviews.find((r) => r.stage === stage);
    const disposition = review?.result?.instructions.find((r) => r.id === o.id);
    return review?.status === "passed" && ["omitted", "not-applicable"].includes(disposition?.status);
  }));
}
const first = (paths) => paths.find((p) => p && existsSync(p)) ?? null;
const promptFrom = (path) => { try { return path ? strip(readFileSync(path, "utf8")) : null; } catch { return null; } };

export function runtimeDependencies(explicit = {}, env = process.env, adapter = {}) {
  const companions = installedCompanions(HERE, adapter, { env });
  const reviewRoot = explicit.review_root ?? env.PROSE_REVIEW_ROOT ?? companions["prose-review"];
  const agent = (name) => first([
    reviewRoot && join(reviewRoot, "agents", `${name}.md`),
    join(HERE, "../../../agents", `${name}.md`), // loose-file installation
    join(HERE, "../../../../prose-review/agents", `${name}.md`),
  ]);
  return {
    scanner: explicit.scanner === null ? null : explicit.scanner ?? findScanner([], env)
      ?? first([companions["prose-tell-scan"] && join(companions["prose-tell-scan"], "skills/tell-scan/tools/tell-scan.mjs")]),
    voice: explicit.voice === null ? null : explicit.voice ?? agent("prose-voice-critic"),
    fidelity: explicit.fidelity === null ? null : explicit.fidelity ?? agent("prose-fidelity-critic"),
    fidelity_scan: explicit.fidelity_scan === null ? null : explicit.fidelity_scan ?? first([
      reviewRoot && join(reviewRoot, "tools/fidelity-scan.mjs"),
      join(HERE, "../../../tools/fidelity-scan.mjs"),
      join(HERE, "../../../../prose-review/tools/fidelity-scan.mjs"),
    ]),
  };
}

export function selectCurrentExamples(samples, { profile = null, context = {}, target_words = null, max_chars = 48000 } = {}) {
  const measured = measureSamples(samples);
  const permitted = new Set(measured.samples.map((s) => s.id));
  const profileIds = profile ? new Set(profile.measured.samples.map((s) => s.id)) : null;
  const excluded = [];
  const eligible = samples.filter((s) => permitted.has(s.id) && (!profileIds || profileIds.has(s.id))).filter((s) => {
    const mismatches = ["form", "register"].filter((key) => context[key] && s[key] && context[key] !== s[key]);
    if (mismatches.length) {
      excluded.push({ id: s.id, reason: `Known example metadata conflicts with requested ${mismatches.join(" and ")}` });
      return false;
    }
    return true;
  });
  const score = (s) => Number(Boolean(context.form && s.form === context.form)) * 2 + Number(Boolean(context.register && s.register === context.register));
  eligible.sort((a, b) => score(b) - score(a)
    || (target_words ? Math.abs(wordCount(visibleProse(a.text).author) - target_words) - Math.abs(wordCount(visibleProse(b.text).author) - target_words) : 0)
    || a.id.localeCompare(b.id, "en"));
  const chosen = [], warnings = []; let used = 0;
  for (const s of eligible) {
    if (chosen.length >= 3) break;
    if (used + s.text.length > max_chars) { excluded.push({ id: s.id, reason: "Whole file exceeds remaining example budget; no excerpt substituted" }); continue; }
    chosen.push({ id: s.id, text: s.text, digest: sha256(s.text) }); used += s.text.length;
    const unknown = ["form", "register"].filter((key) => context[key] && !s[key]);
    if (unknown.length) warnings.push({ id: s.id, reason: `Example ${unknown.join(" and ")} metadata unavailable; matching is not established` });
  }
  excluded.sort((a, b) => a.id.localeCompare(b.id, "en"));
  return { examples: chosen, excluded, warnings, policy: "whole human-authored files only; known form/register mismatches excluded; unknown metadata disclosed; no generated samples" };
}

/** Long exact overlaps are flags for review, not a plagiarism verdict. */
export function copyingCheck(draft, samples, { original = "", authorized_quotes = [] } = {}) {
  const words = (s) => visibleProse(s).visible.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
  const window = 12, tokens = words(draft), authorized = [original, ...authorized_quotes].map(words).map((w) => w.join(" "));
  const findings = [];
  for (const sample of samples) {
    const source = words(sample.text).join(" ");
    for (let i = 0; i <= tokens.length - window; i++) {
      const phrase = tokens.slice(i, i + window).join(" ");
      if (source.includes(phrase) && !authorized.some((a) => a.includes(phrase))) { findings.push({ file: sample.id, phrase, reason: "Unexplained exact 12-word overlap with style evidence" }); break; }
    }
  }
  return { status: !samples.length ? "not-evaluated" : findings.length ? "failed" : "passed", findings,
    reason: !samples.length ? "No corpus text available for copying comparison" : "Exact overlap heuristic, not proof that all copying is absent" };
}

export function compactProfile(profile) {
  if (!profile) return null;
  return { schema: profile.schema, id: profile.id, digest: digest(profile), support: profile.measured.support,
    coverage: profile.coverage, observations: profile.observations, limits: profile.limits,
    measurements: profile.measured.measurements };
}

function jobErrors(job) {
  if (!job || job.schema !== "prose-writing-job/1") return ["Expected prose-writing-job/1"];
  const errors = [];
  if (!["draft", "rewrite", "continue"].includes(job.mode)) errors.push("Choose draft, rewrite or continue");
  if (typeof job.brief !== "string" || !job.brief.trim()) errors.push("Writing brief is missing");
  if (!job.context?.form || !job.context?.purpose) errors.push("Form and purpose must be determined before drafting");
  if (["rewrite", "continue"].includes(job.mode) && !job.source_text?.trim()) errors.push("Rewrite/continuation needs the existing passage");
  if (job.samples !== undefined && !Array.isArray(job.samples)) errors.push("samples must be an array");
  if (job.facts !== undefined && (!Array.isArray(job.facts) || job.facts.some((f) => typeof f !== "string"))) errors.push("facts must be supplied text strings");
  if (job.review && !["standard", "deep"].includes(job.review)) errors.push("Unknown review mode");
  if (job.examples !== undefined && typeof job.examples !== "boolean") errors.push("examples must be boolean");
  if (!job.adapter || !["codex", "claude"].includes(job.adapter.harness)) errors.push("Select the current Claude or Codex harness");
  return errors;
}

export function scanRuntimeArtifacts(draft, scanner) {
  if (!scanner || !existsSync(scanner)) return { status: "not-evaluated", reason: "prose-tell-scan is unavailable", findings: [] };
  const dir = mkdtempSync(join(tmpdir(), "prose-runtime-scan-"));
  try {
    const file = join(dir, "draft.md"); writeFileSync(file, draft);
    // No author fallback is presented as personal calibration. Only Tier A artifacts
    // are consumed here; the catalog and its thresholds never go to generation.
    let stdout;
    try { stdout = execFileSync(process.execPath, [scanner, file, "--json"], { encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { if (!e.stdout) throw e; stdout = e.stdout; }
    const payload = JSON.parse(stdout), result = payload.results?.[0];
    if (!Array.isArray(result?.findings)) throw new TypeError("Malformed scanner result");
    const findings = result.findings.filter((f) => f.tier === "A" && f.flagged).map((f) => ({ id: f.id, examples: f.examples }));
    return { status: findings.length ? "failed" : "passed", draft_digest: sha256(draft), findings, reason: "Tier A artifact scan only; no fallback cadence claim" };
  } catch (e) { return { status: "not-evaluated", reason: `Scanner failed: ${e.message}`, findings: [] }; }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

export async function renderCurrentProfile({ id, samples, adapter, selection = {} }, { dispatch = callModel, onCall = () => {}, signal } = {}) {
  if (!PROFILE_INSTRUCTIONS) return { status: "not-evaluated", reason: "Packaged voice-profile-render prompt is unavailable", profile: null };
  if (signal?.aborted) return { status: "not-evaluated", reason: "Cancelled before profile render", profile: null };
  const measured = measureSamples(samples, selection);
  if (!measured.sample_count) return { status: "not-evaluated", reason: "No usable corpus; explicit preferences remain usable", profile: null };
  const used = samples.filter((s) => measured.samples.some((m) => m.id === s.id));
  const input = { coverage_dimensions: Object.keys(Object.fromEntries(assembleProfileV3({ id, samples: used }).coverage.map((r) => [r.dimension, true]))),
    samples: used, measured: { support: measured.support, groups: measured.groups, measurements: measured.measurements } };
  let result;
  try { result = await dispatch({ ...adapter, system: PROFILE_INSTRUCTIONS, input, schema: PROFILE_SOURCE_SCHEMA, signal }); }
  catch (e) { result = { status: "failed", reason: `Profile dispatch failed: ${e.message}`, dispatched: false }; }
  onCall({ stage: "profile", input, system: PROFILE_INSTRUCTIONS, result });
  if (result.status !== "passed") return { status: result.status, reason: result.reason, profile: null };
  const errors = schemaErrors(result.value, PROFILE_SOURCE_SCHEMA);
  if (errors.length) return { status: "failed", reason: errors.join("; "), profile: null };
  if (result.value.refused) return { status: "refused", reason: result.value.refused, profile: null };
  try {
    const observations = result.value.observations.map((o) => ({ ...o, citations: o.citations.map((c) => {
      const source = used.find((s) => s.id === c.file)?.text, start = source?.indexOf(c.quote) ?? -1;
      if (!c.quote || start < 0 || source.indexOf(c.quote, start + 1) !== -1) throw new TypeError("Profile citation must locate one unique original span");
      return { ...c, start, end: start + c.quote.length };
    }) }));
    const dimensions = new Set([...observations.flatMap((o) => o.dimensions), ...result.value.unresolved.map((r) => r.dimension)]);
    if (dimensions.size !== 10 || result.value.unresolved.some((r) => !r.reason.trim())) throw new TypeError("Renderer omitted a coverage dimension or unresolved reason");
    if (observations.length > 14) throw new TypeError("Renderer exceeded fourteen observations");
    const profile = assembleProfileV3({ id, samples: used, observations, unresolved: result.value.unresolved,
      renderer: { prompt_digest: sha256(PROFILE_INSTRUCTIONS), input_digest: result.input_digest, harness: adapter.harness, model: result.model } });
    return { status: "passed", profile };
  } catch (e) { return { status: "failed", reason: e.message, profile: null }; }
}

export async function runWriting(job, { dispatch = callModel, scan = scanRuntimeArtifacts, onCall = () => {}, onProgress = () => {}, signal } = {}) {
  if (job?.adapter) job = { ...job, adapter: { ...job.adapter, harness: canonicalHarness(job.adapter.harness) } };
  const started = Date.now(), calls = [], attempts = [], errors = jobErrors(job);
  const refused = (reason) => ({ schema: "prose-writing-result/1", status: "refused", draft: "", reason, calls, attempts, elapsed_ms: Date.now() - started });
  if (!DRAFT_INSTRUCTIONS) return { ...refused("Packaged voice-draft prompt is unavailable"), status: "ungated" };
  if (errors.length) return refused(errors.join("; "));
  const samples = job.samples ?? [], profile = job.profile ?? null;
  if (profile) {
    const invalid = validateProfileV3(profile, samples.length ? { samples } : {});
    if (invalid.length) return refused(invalid.join("; "));
    const registers = [...new Set(profile.measured.groups.map((g) => g.register).filter(Boolean))];
    if (registers.length > 1 && !job.context.register) return refused("The corpus spans registers; choose the requested register");
  }
  let spec, selected;
  try {
    spec = compileStyleV2(job.preferences ?? initPreferencesV2("task-local"), { profile, context: job.context, overrides: job.rules ?? [] });
    selected = job.examples === false ? { examples: [], excluded: [], policy: "profile-only" }
      : selectCurrentExamples(samples, { profile, context: job.context, target_words: job.target_words });
  } catch (e) { return refused(e.message); }
  const deps = runtimeDependencies(job.dependencies, process.env, job.adapter), instructionIds = [...new Set([...spec.rules.map((r) => r.id), ...(profile?.observations.map((o) => o.id) ?? [])])];
  const advisoryIds = (profile?.observations ?? []).map((o) => o.id).filter((id) => !spec.rules.some((r) => r.id === id));
  const baseInput = { brief: job.brief, mode: job.mode, context: job.context, facts: job.facts ?? [], source_text: job.source_text ?? "",
    profile: compactProfile(profile), rules: spec.rules, examples: selected.examples };
  const invoke = async (stage, system, input, schema) => {
    if (calls.length >= MAX_CALLS || signal?.aborted) return { status: "not-evaluated", reason: signal?.aborted ? "Cancelled" : "Model-call limit reached" };
    onProgress({ stage, calls: calls.length });
    let result;
    try { result = await dispatch({ ...job.adapter, system, input, schema, signal }); }
    catch (e) { result = { status: "failed", reason: `Dispatch failed: ${e.message}`, dispatched: false }; }
    calls.push({ stage, status: result.status, dispatched: result.dispatched ?? false, harness: result.harness ?? job.adapter.harness,
      model: result.model ?? null, elapsed_ms: result.elapsed_ms ?? 0, usage: result.usage ?? null,
      input_digest: result.input_digest ?? sha256(JSON.stringify(input)), system_digest: sha256(system), isolation: result.isolation ?? "unreported", reason: result.reason ?? null });
    onCall({ stage, input, system, result }); return result;
  };
  let candidate = null, repairFindings = null, repairOriginal = "", terminal = null;
  const history = startHistorySession(job, { dispatch, signal });
  for (let cycle = 0; cycle <= MAX_REPAIRS; cycle++) {
    const generated = await invoke(cycle ? "repair" : "draft", DRAFT_INSTRUCTIONS,
      { ...baseInput, ...(cycle ? { previous_draft: candidate.draft, repair_findings: repairFindings } : {}) }, DRAFT_SCHEMA);
    if (generated.status !== "passed") { terminal = { status: "ungated", reason: generated.reason }; break; }
    const invalid = validateDraftV5(generated.value, instructionIds);
    if (invalid.length) { terminal = { status: "incomplete", reason: invalid.join("; ") }; break; }
    if (generated.value.kind === "refusal") {
      if (!candidate) return refused(generated.value.refused);
      terminal = { status: "incomplete", reason: generated.value.refused }; break;
    }
    repairOriginal = candidate?.draft ?? (job.mode === "rewrite" ? job.source_text : "");
    candidate = generated.value;
    const mechanical = checkRules(candidate.draft, spec.rules), observed = compareObserved(candidate.draft, profile, job.context);
    const historyEvidence = await history?.observe(candidate.draft, cycle ? `repair-${cycle}` : "draft");
    const copying = copyingCheck(candidate.draft, samples, { original: job.source_text ?? "", authorized_quotes: job.authorized_quotes ?? [] });
    let artifacts;
    try { artifacts = await scan(candidate.draft, deps.scanner); }
    catch (e) { artifacts = { status: "not-evaluated", reason: `Scanner failed: ${e.message}`, findings: [] }; }
    const reviews = [];
    const stageReview = async (stage, system, input, options = {}) => {
      if (!system) { reviews.push({ stage, status: "not-evaluated", reason: `${stage} dependency is unavailable` }); return; }
      const called = await invoke(stage, system, { ...input, advisory_instruction_ids: options.advisoryIds ?? [], missing_atoms: options.missingAtoms ?? [], draft: candidate.draft }, REVIEW_SCHEMA);
      if (called.status !== "passed") { reviews.push({ stage, status: "not-evaluated", reason: called.reason }); return; }
      const invalid = validateReview(called.value, { draft: candidate.draft, original: input.original ?? "", instructionIds: input.instruction_ids ?? [], advisoryIds: options.advisoryIds ?? [], missingAtoms: options.missingAtoms ?? [] });
      reviews.push(invalid.length ? { stage, status: "not-evaluated", reason: invalid.join("; ") }
        : { stage, status: called.value.verdict === "clear" ? "passed" : called.value.verdict === "revise" ? "failed" : "not-evaluated", result: called.value });
    };
    await stageReview("task-review", TASK_REVIEW_INSTRUCTIONS, { brief: job.brief, context: job.context,
      original: [job.source_text ?? "", ...(job.facts ?? [])].join("\n"), profile: compactProfile(profile), rules: spec.rules, instruction_ids: instructionIds }, { advisoryIds });
    const voicePrompt = promptFrom(deps.voice);
    if (profile) await stageReview("voice-review", voicePrompt && samples.length ? `${voicePrompt}\n\n${REVIEW_TRANSPORT}` : null,
      { original: samples.map((s) => s.text).join("\n\n"), profile: compactProfile(profile), rules: spec.rules,
        instruction_ids: instructionIds, context: job.context,
        observed_comparison: observed, previous_draft: repairOriginal || null,
        ...(historyEvidence ? { numerical_history: historyEvidence } : {}) }, { advisoryIds });
    if (repairOriginal) {
      if (!deps.fidelity || !deps.fidelity_scan) reviews.push({ stage: "fidelity-review", status: "not-evaluated", reason: "prose-review fidelity critic or scanner is unavailable" });
      else {
        try {
          const { scanFidelity } = await import(pathToFileURL(resolve(deps.fidelity_scan)).href);
          const fidelity = scanFidelity(repairOriginal, candidate.draft);
          const missingAtoms = [...new Set(fidelity.missing.map((r) => r.source))];
          await stageReview("fidelity-review", `${strip(readFileSync(deps.fidelity, "utf8"))}\n\n${REVIEW_TRANSPORT}`,
            { original: repairOriginal, fidelity_scan: fidelity, missing_atoms: missingAtoms, instruction_ids: [], brief: job.brief }, { missingAtoms });
        } catch (e) { reviews.push({ stage: "fidelity-review", status: "not-evaluated", reason: e.message }); }
      }
    }
    if (job.review === "deep") await stageReview("claim-audit", `Audit factual claims against ONLY the supplied sources. Identify unsupported names, dates, numbers, attributed quotations, biography and citations. Disclose unverifiable additions. No external verification is available in this call. ${REVIEW_TRANSPORT}`,
      { original: [job.source_text ?? "", ...(job.facts ?? [])].join("\n"), instruction_ids: [] });
    const advisoryOmissions = reviewedAdvisoryOmissions(candidate.omitted, advisoryIds, reviews);
    const unresolvedOmissions = candidate.omitted.filter((o) => !advisoryOmissions.includes(o));
    const attempt = { cycle, draft: candidate.draft, draft_digest: sha256(candidate.draft), mechanical, observed, copying, artifacts, reviews,
      omitted: candidate.omitted, advisory_omissions: advisoryOmissions, unresolved_omissions: unresolvedOmissions, claims: candidate.claims };
    attempts.push(attempt);
    const hardFailed = mechanical.checks.some((r) => r.enforcement === "enforced" && r.status === "failed");
    const unavailable = mechanical.checks.some((r) => r.enforcement === "enforced" && r.status === "not-evaluated")
      || artifacts.status === "not-evaluated" || reviews.some((r) => r.status === "not-evaluated");
    const failed = hardFailed || copying.status === "failed" || artifacts.status === "failed" || reviews.some((r) => r.status === "failed");
    if (!failed) { terminal = { status: unavailable ? "ungated" : unresolvedOmissions.length ? "incomplete" : "checked", reason: unavailable ? "One or more required checks were unavailable or unresolved" : unresolvedOmissions.length ? "One or more omissions remain unresolved" : "Exact final text checked; no resemblance, quality or factual guarantee" }; break; }
    repairFindings = { rules: mechanical.checks.filter((r) => r.enforcement === "enforced" && r.status === "failed"), copying: copying.findings,
      // Scanner thresholds/catalog entries are intentionally not fed back to generation.
      artifact_instruction: artifacts.status === "failed" ? "Remove accidental machine scaffolding; preserve substantive text. No scanner thresholds are supplied." : null,
      reviews: reviews.filter((r) => r.status === "failed").map((r) => ({ stage: r.stage, findings: r.result.findings })) };
    terminal = { status: "incomplete", reason: "Unresolved findings after the bounded repair budget" };
  }
  const finalAttempt = attempts.at(-1), draft = candidate?.draft ?? "";
  if (finalAttempt && verifyRuleReceipt(draft, spec.rules, finalAttempt.mechanical).status === "failed") terminal = { status: "incomplete", reason: "Final rule receipt did not reproduce" };
  return { schema: "prose-writing-result/1", ...terminal, draft,
    receipt: { draft_digest: sha256(draft), profile_digest: spec.profile_digest, preference_digest: spec.preference_digest,
      preference_revision: spec.preference_revision, active_preferences: spec.active_preferences.map((p) => p.id), overrides: spec.override_ids,
      examples: selected.examples.map(({ id, digest }) => ({ id, digest })), example_exclusions: selected.excluded,
      example_warnings: selected.warnings ?? [],
      model_calls: calls.filter((c) => c.dispatched).length, elapsed_ms: Date.now() - started,
      final_check: finalAttempt ? { cycle: finalAttempt.cycle, draft_digest: finalAttempt.draft_digest } : null,
      isolation: "partial: fresh CLI context and audited tool events, not a general read-isolation guarantee" },
    claims: [...(candidate?.claims ?? []), ...(finalAttempt?.reviews.flatMap((r) => r.result?.disclosures ?? []) ?? [])],
    omitted: candidate?.omitted ?? [], advisory_omissions: finalAttempt?.advisory_omissions ?? [],
    unresolved_omissions: finalAttempt?.unresolved_omissions ?? [], attempts, calls,
    ...(history ? { telemetry: history.finish(draft) } : {}) };
}

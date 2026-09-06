/** Independent synthetic expectations; no author corpus or model needed. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { measureHistoryText, segmentHistoryProse, numericDistribution, validateHistoryMeasurement } from "../skills/prose-draft/tools/history-measure.mjs";
import { configureHistory, readHistory, saveHistoryMeasurement, activeHistoryRecords, exportHistory, previewHistoryDeletion, deleteHistory, pinHistory, digestHistory, historyConsent } from "../skills/prose-draft/tools/history-store.mjs";
import { buildHistoryReport, compareHistoryMeasurement, compareHistoryStages } from "../skills/prose-draft/tools/history-report.mjs";
import { measureRhetoric, rhetoricalInput, validateRhetoricalSource, aggregateRhetoric, validateStoredRhetoric } from "../skills/prose-draft/tools/history-rhetoric.mjs";
import { runWriting } from "../skills/prose-draft/tools/writing-runtime.mjs";
import { verifyHistoryRun, startHistorySession } from "../skills/prose-draft/tools/history-session.mjs";
import { historyMain } from "../skills/prose-draft/tools/history-cli.mjs";
import { canonicalHarness } from "../skills/prose-draft/tools/runtime-adapters.mjs";

export async function run(t, { tmp }) {
  t.group("v0.5 numerical history and consent");
  const test = (name, fn) => { try { fn(); t.check(name, true); } catch (e) { t.check(name, false, e.stack); } };
  const root = join(tmp, "history-v050"), identity = "fixture";
  const measure = (text) => measureHistoryText(text);
  test("known Claude product alias resolves without accepting unknown transports", () => {
    assert.equal(canonicalHarness("claude-code"), "claude");
    assert.equal(canonicalHarness("codex"), "codex");
    assert.equal(canonicalHarness("other-harness"), "other-harness");
  });
  test("misspelled history attachment fields fail rather than silently selecting a default store", () => {
    const session = startHistorySession({ context: { form: "reply" }, telemetry: { identity: "fixture", store: root } });
    assert.equal(session.finish("A draft.").status, "failed");
    const previous = process.env.PROSE_HISTORY_DIR;
    try {
      process.env.PROSE_HISTORY_DIR = "relative-invalid";
      assert.equal(startHistorySession({ context: { form: "reply" }, telemetry: { identity: "fixture" } }).finish("A draft.").status, "failed");
    } finally { if (previous === undefined) delete process.env.PROSE_HISTORY_DIR; else process.env.PROSE_HISTORY_DIR = previous; }
  });
  const input = (id, text = "You write. We read!") => ({ document_id: id, revision_id: "r1", text, provenance: "human-independent", project: "notes", form: "essay", register: "informal", measurement: measure(text) });
  test("surface counts exclude URLs, code, metadata and quoted material", () => {
    const m = measure('---\nwho: You?\n---\nYou read [this](https://test/?x=1) (briefly); we wait…\n\n> Really!\n\n`why?`');
    const counts = Object.fromEntries(m.counts.map((m) => [m.id, m.count]));
    assert.equal(counts["question-marks"], 0); assert.equal(counts["exclamation-marks"], 0);
    assert.equal(counts["round-parenthetical-spans"], 1); assert.equal(counts.semicolons, 1); assert.equal(counts.ellipses, 1);
    assert.ok(m.quoted_words > 0); assert.equal(validateHistoryMeasurement(m), m);
    assert.ok(!JSON.stringify(m).includes("briefly"));
  });
  test("sentence heuristic handles decimals, titles and closing quotes", () => {
    const p = segmentHistoryProse('Dr. Smith paid 3.50 dollars. "Really?" Yes!\n\nA fragment');
    assert.equal(p.paragraphs.length, 2); assert.equal(p.paragraphs[0].sentences.length, 3);
    assert.deepEqual(p.paragraphs[0].sentences.map((s) => s.words), [6, 1, 1]);
    assert.ok(p.warnings.includes("fragment-or-ambiguous-ending"));
  });
  test("equal means do not erase variance or adjacent rhythm", () => {
    const a = measure("One. Two three four five six."), b = measure("One two three. Four five six.");
    assert.equal(a.rhythm.sentences.mean, 3); assert.equal(b.rhythm.sentences.mean, 3);
    assert.equal(a.rhythm.sentences.variance, 4); assert.equal(b.rhythm.sentences.variance, 0);
    assert.equal(a.rhythm.adjacent_differences.mean, 4); assert.equal(b.rhythm.adjacent_differences.mean, 0);
    assert.ok(compareHistoryStages(a, b).changes.some((c) => c.id === "sentence-variance"));
  });
  test("placement retains single-sentence paragraphs as their own category", () => {
    const m = measure("You begin. You continue. You finish.\n\nYou alone.");
    assert.deepEqual(m.counts.find((c) => c.id === "second-person-family").placement, { initial: 1, interior: 1, final: 1, only: 1, unplaced: 0 });
  });
  test("empty and unsupported inputs do not manufacture measurements", () => {
    assert.equal(measure("").counts[0].status, "not-evaluated");
    assert.equal(measureHistoryText("Vous écrivez!", { language: "fr" }).rhythm.status, "not-evaluated");
    assert.equal(measureHistoryText("You", { language: "fr" }).counts[0].count, null);
    assert.throws(() => numericDistribution([NaN]));
  });
  test("new stores are disabled and unconfigured ingestion writes no record", () => {
    assert.equal(readHistory(root, identity), null);
    assert.equal(saveHistoryMeasurement(root, identity, input("a")).status, "not-evaluated");
    assert.equal(readHistory(root, identity), null);
    configureHistory(root, identity, { project: "notes", enabled: true });
    assert.equal(historyConsent(readHistory(root, identity), "elsewhere").enabled, false);
    assert.equal(historyConsent(readHistory(root, identity), "notes").rhetoric, false);
  });
  test("duplicate ingestion and document revisions do not inflate independence", () => {
    assert.throws(() => saveHistoryMeasurement(root, identity, { ...input("false-count", "No reader address."), measurement: measure("You you you.") }), /divergence/);
    assert.equal(saveHistoryMeasurement(root, identity, input("a")).status, "saved");
    assert.equal(saveHistoryMeasurement(root, identity, input("a")).status, "duplicate");
    saveHistoryMeasurement(root, identity, input("alias"));
    assert.equal(activeHistoryRecords(readHistory(root, identity)).length, 1);
    const next = { ...input("a", "We changed this."), revision_id: "r2" };
    saveHistoryMeasurement(root, identity, next);
    assert.equal(activeHistoryRecords(readHistory(root, identity)).length, 1);
    assert.equal(activeHistoryRecords(readHistory(root, identity), { exclude_document: "a" }).length, 0);
    assert.throws(() => saveHistoryMeasurement(root, identity, { ...next, text: "different" }));
  });
  test("history and exports do not preserve source prose or encryption keys", () => {
    const privateText = "Secret unpublished fixture: lavender armadillos.";
    saveHistoryMeasurement(root, identity, input("private", privateText));
    const state = readHistory(root, identity), disk = readFileSync(join(root, digestHistory(identity), "state.json"), "utf8");
    assert.ok(!disk.includes("lavender")); assert.ok(!JSON.stringify(exportHistory(state)).includes(state.key));
    assert.throws(() => validateHistoryMeasurement({ ...measure("Hi."), secret: privateText }));
  });
  test("generated records remain separate and unknown metadata never establishes a baseline", () => {
    saveHistoryMeasurement(root, identity, { ...input("generated", "Model output here."), provenance: "generated" });
    saveHistoryMeasurement(root, identity, { ...input("unknown", "Unclassified prose here."), register: null });
    const report = buildHistoryReport(readHistory(root, identity));
    assert.equal(report.groups.find((g) => g.provenance === "generated").baseline_eligible, false);
    assert.equal(report.groups.find((g) => g.register === null).baseline_eligible, false);
    assert.equal(compareHistoryMeasurement(measure("Why?"), report, { register: "informal", form: "essay" }).status, "not-evaluated");
  });
  test("disablement retains records; explicit scope overrides global collection", () => {
    const n = readHistory(root, identity).records.length;
    configureHistory(root, identity, { project: null, enabled: true, rhetoric: true });
    configureHistory(root, identity, { project: "notes", enabled: false });
    assert.equal(saveHistoryMeasurement(root, identity, input("disabled")).status, "not-evaluated");
    assert.equal(readHistory(root, identity).records.length, n);
    assert.equal(historyConsent(readHistory(root, identity), "elsewhere").rhetoric, true);
  });
  test("deletion is preview-bound and removes dependent snapshots", () => {
    const state = readHistory(root, identity);
    pinHistory(root, identity, buildHistoryReport(state));
    const before = readHistory(root, identity), preview = previewHistoryDeletion(before, [before.records[0].document]);
    assert.ok(preview.snapshots.length);
    deleteHistory(root, identity, preview);
    assert.equal(readHistory(root, identity).snapshots.length, 0);
    assert.throws(() => deleteHistory(root, identity, preview));
    const all = previewHistoryDeletion(readHistory(root, identity));
    deleteHistory(root, identity, all);
    assert.equal(readHistory(root, identity), null);
  });
  test("writer collision is visible and lock ownership is not stolen", () => {
    const dir = join(root, digestHistory("locked")); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, ".writer.lock"), "fixture");
    assert.throws(() => configureHistory(root, "locked", { project: null, enabled: true }), /interrupted writer/);
    assert.equal(readFileSync(join(dir, ".writer.lock"), "utf8"), "fixture");
  });
  test("pooled exposure differs from document mean and empirical departures require twenty pieces", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, document: `d${i}`, content: `b${i}`, stage: "ingested", written_at: null,
      provenance: "human-independent", form: "essay", register: "informal", measurement: measure(i ? "word ".repeat(200) : "you ".repeat(20)) }));
    const report = buildHistoryReport({ identity: "test", revision: 1, records: rows });
    const f = report.groups[0].lifetime.features.find((f) => f.id === "second-person-family");
    assert.equal(f.mean, 50); assert.equal(f.pooled_rate, 20 / 3820 * 1000); assert.equal(f.median, 0);
    assert.equal(compareHistoryMeasurement(measure("You."), report, { register: "informal", form: "essay" }).features[0].status, "above-empirical-range");
    const sparse = buildHistoryReport({ records: rows.slice(0, 19) });
    assert.equal(compareHistoryMeasurement(measure("You."), sparse, { register: "informal", form: "essay" }).status, "not-evaluated");
  });
  test("direction uses writing dates and comparable windows, not changing genre mixture", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, document: `d${i}`, content: `b${i}`, stage: "ingested",
      written_at: i < 5 ? "2026-05-01" : i < 10 ? "2026-08-01" : null,
      provenance: "human-independent", form: i === 11 ? "reply" : "essay", register: "informal", measurement: measure(i < 5 ? "word ".repeat(200) : "you ".repeat(200)) }));
    const report = buildHistoryReport({ records: rows }, { now: "2026-09-01" }), essay = report.groups.find((g) => g.form === "essay");
    assert.equal(essay.recent.pieces, 5); assert.equal(essay.previous.pieces, 5); assert.equal(essay.undated_pieces, 1);
    assert.equal(essay.direction[0].mean_difference, 1000);
    assert.equal(report.groups.find((g) => g.form === "reply").lifetime.support, "limited-evidence");
    rows[0].measurement = { ...rows[0].measurement, analyzer: "a".repeat(64) };
    assert.equal(buildHistoryReport({ records: rows }).groups.length, 3);
  });
  test("rhetorical evidence needs complete paragraph accounting and valid nonduplicate spans", () => {
    const paragraphs = ["Perhaps this works.", "It explains the result."];
    const value = { schema: "voice-rhetoric-source/1", annotations: [{ label: "qualification-uncertainty", paragraph: 0, start: 0, end: 7 }], unclassified: [1] };
    assert.deepEqual(validateRhetoricalSource(value, paragraphs), []);
    assert.ok(validateRhetoricalSource({ ...value, unclassified: [] }, paragraphs).length);
    assert.ok(validateRhetoricalSource({ ...value, annotations: [...value.annotations, ...value.annotations] }, paragraphs).length);
    assert.ok(validateRhetoricalSource({ ...value, annotations: [{ ...value.annotations[0], end: 900 }] }, paragraphs).length);
    assert.ok(validateRhetoricalSource({ ...value, annotations: [{ ...value.annotations[0], label: "paragraph-claim" }] }, paragraphs).length);
  });
  const asyncTest = async (name, fn) => { try { await fn(); t.check(name, true); } catch (e) { t.check(name, false, e.stack); } };
  const annotation = (input) => ({ schema: "voice-rhetoric-source/1", annotations: input.paragraphs.map((p, i) => ({ label: "paragraph-claim", paragraph: i, start: 0, end: p.length })), unclassified: [] });
  const result = (value) => ({ status: "passed", dispatched: true, harness: "codex", model: "fixture-model", elapsed_ms: 1, value });
  await asyncTest("rhetorical analysis is separately enabled, bounded and sanitizes all source-bearing output", async () => {
    let calls = 0;
    const dispatch = async ({ input }) => { calls++; return { ...result(annotation(input)), raw: "SECRET RAW OUTPUT", reason: "SECRET REASON", usage: { input_tokens: 4, private: "SECRET USAGE" } }; };
    const budget = { remaining: 1 }, options = { enabled: true, budget, adapter: { harness: "codex" } };
    assert.equal((await measureRhetoric("Private fixture prose.", { ...options, enabled: false }, { dispatch })).reason, "disabled");
    const measured = await measureRhetoric("Private fixture prose.", options, { dispatch });
    assert.equal(measured.status, "measured-estimate"); assert.equal(validateStoredRhetoric(measured), measured);
    assert.ok(!JSON.stringify(measured).includes("SECRET")); assert.ok(!JSON.stringify(measured).includes("Private fixture"));
    assert.equal((await measureRhetoric("Again.", options, { dispatch })).reason, "budget-exhausted"); assert.equal(calls, 1);
    assert.throws(() => validateStoredRhetoric({ ...measured, annotations: ["leak"] }));
    const invalid = await measureRhetoric("Again.", { ...options, budget: { remaining: 1 } }, { dispatch: async () => result({ schema: "voice-rhetoric-source/1", annotations: [], unclassified: [] }) });
    assert.equal(invalid.reason, "invalid-evidence"); assert.equal(invalid.measurements, undefined);
    const unused = { remaining: 2 };
    assert.equal((await measureRhetoric("x".repeat(48001), { ...options, budget: unused }, { dispatch })).reason, "oversized");
    assert.equal((await measureRhetoric("Texte.", { ...options, language: "fr", budget: unused }, { dispatch })).reason, "unsupported-language");
    const aborted = new AbortController(); aborted.abort();
    assert.equal((await measureRhetoric("Text.", { ...options, signal: aborted.signal, budget: unused }, { dispatch })).reason, "cancelled");
    assert.equal(unused.remaining, 2);
  });
  test("optional model series never fragments deterministic baselines", () => {
    const text = "A fixture paragraph.", input = rhetoricalInput(text), m = measure(text);
    const rhetoric = aggregateRhetoric(annotation(input), input, { model: "fixture", harness: "codex", prompt_digest: "b".repeat(64) });
    const rows = [0, 1, 2].map((i) => ({ id: `r${i}`, document: `d${i}`, content: `b${i}`, stage: "ingested", provenance: "human-independent", register: "informal", form: "essay", measurement: m,
      rhetoric: i === 0 ? rhetoric : i === 1 ? { ...rhetoric, series: "c".repeat(64) } : { status: "not-evaluated", reason: "disabled" } }));
    const groups = buildHistoryReport({ records: rows }).groups;
    assert.equal(groups.find((g) => g.rhetorical_series === null).lifetime.pieces, 3);
    assert.equal(groups.filter((g) => g.rhetorical_series).length, 2);
    assert.ok(groups.filter((g) => g.rhetorical_series).every((g) => g.lifetime.features.every((f) => f.id.startsWith("rhetoric:"))));
  });
  await asyncTest("runtime history is advisory, records exact stages and rejects changed final bytes", async () => {
    configureHistory(root, "runtime", { project: "notes", enabled: true, rhetoric: true });
    const inputs = [];
    const dispatch = async ({ input, schema }) => {
      inputs.push(input);
      if (schema.properties.schema.const === "voice-rhetoric-source/1") return result(annotation(input));
      if (schema.properties.schema.const === "voice-draft-source/5") return result({ schema: "voice-draft-source/5", kind: "draft", draft: "Thanks. I cannot attend.", omitted: [], claims: [], refused: "" });
      return result({ schema: "prose-runtime-review/1", verdict: "clear", findings: [], instructions: [], atom_accounting: [], disclosures: [] });
    };
    const written = await runWriting({ schema: "prose-writing-job/1", mode: "draft", brief: "Decline.", context: { form: "reply", register: "informal", project: "notes", purpose: "decline" }, adapter: { harness: "codex" },
      telemetry: { identity: "runtime", directory: root, document_id: "reply", revision_id: "r1" } }, { dispatch, scan: async () => ({ status: "passed", findings: [] }) });
    assert.equal(written.status, "checked"); assert.equal(written.attempts.length, 1);
    assert.equal(written.telemetry.calls.length, 1); assert.equal(written.telemetry.stages.length, 1);
    assert.equal(written.telemetry.semantic_interpretation, "not-evaluated");
    assert.equal(verifyHistoryRun(written).status, "passed");
    assert.equal(verifyHistoryRun({ ...written, draft: `${written.draft} Changed.` }).status, "failed");
    const draftInput = inputs.find((i) => i.brief && !i.draft);
    assert.equal(draftInput.numerical_history, undefined);
    assert.ok(readHistory(root, "runtime").records.every((r) => r.provenance === "generated"));
    assert.equal(activeHistoryRecords(readHistory(root, "runtime")).length, 1);
  });
  await asyncTest("skill-internal CLI previews selected ingestion and never saves source text", async () => {
    configureHistory(root, "cli", { project: null, enabled: true });
    const dir = join(tmp, "history-cli"); mkdirSync(dir);
    writeFileSync(join(dir, "source.txt"), "A short private test piece.");
    writeFileSync(join(dir, "job.json"), JSON.stringify({ schema: "voice-history-ingest/1", documents: [{ document_id: "one", revision_id: "r1", file: "source.txt", provenance: "human-independent", form: "reply", register: "informal" }] }));
    const args = ["--store", root, "--identity", "cli", "--job", join(dir, "job.json")];
    assert.equal((await historyMain(["ingest-preview", ...args])).maximum_model_calls, 0);
    assert.equal((await historyMain(["ingest", ...args])).results[0].status, "saved");
    assert.ok(!JSON.stringify(await historyMain(["show", ...args.slice(0, 4)])).includes("private test"));
    assert.equal((await historyMain(["ingest", ...args])).results[0].status, "duplicate");
    assert.equal((await historyMain(["show", "--directory", root, "--identity", "cli"])).records.length, 1);
    await assert.rejects(() => historyMain(["show", "--stroe", root, "--identity", "cli"]), /option/);
    await assert.rejects(() => historyMain(["show", "--store", root, "--directory", join(root, "other"), "--identity", "cli"]), /Conflicting/);
    await assert.rejects(() => historyMain(["show", "--store", "--identity", "cli"]), /option/);
  });
  await asyncTest("repairs keep a frozen baseline and use no more than three rhetorical calls", async () => {
    configureHistory(root, "repairs", { project: null, enabled: true, rhetoric: true });
    let drafts = 0;
    const generationInputs = [];
    const dispatch = async ({ input, schema }) => {
      if (schema.properties.schema.const === "voice-rhetoric-source/1") return result(annotation(input));
      if (schema.properties.schema.const === "voice-draft-source/5") {
        generationInputs.push(input);
        if (drafts === 1) saveHistoryMeasurement(root, "repairs", inputForBaseline());
        return result({ schema: "voice-draft-source/5", kind: "draft", draft: ["Why?", "Why??", "Why."][drafts++], omitted: [], claims: [], refused: "" });
      }
      return result({ schema: "prose-runtime-review/1", verdict: "clear", findings: [],
        instructions: (input.instruction_ids ?? []).map((id) => ({ id, status: "applied", reason: "fixture review" })),
        atom_accounting: (input.missing_atoms ?? []).map((atom) => ({ atom, disposition: "scanner-defect", reason: "fixture accounting" })), disclosures: [] });
    };
    const inputForBaseline = () => ({ ...input("later", "Later human fixture."), project: null });
    const r = await runWriting({ schema: "prose-writing-job/1", mode: "draft", brief: "Write why.", context: { form: "reply", register: "informal", purpose: "fixture" }, adapter: { harness: "codex" },
      rules: [{ id: "q", kind: "punctuation", directive: "No question marks", characters: "?", minimum: 0, maximum: 0 }],
      telemetry: { identity: "repairs", directory: root, document_id: "work", revision_id: "r1" } }, { dispatch, scan: async () => ({ status: "passed", findings: [] }) });
    assert.equal(r.status, "checked"); assert.equal(drafts, 3); assert.equal(r.telemetry.calls.length, 3);
    assert.deepEqual(r.telemetry.stages.map((s) => s.stage), ["draft", "repair-1", "repair-2"]);
    assert.equal(new Set(r.telemetry.stages.map((s) => s.comparison.baseline_digest)).size, 1);
    assert.equal(r.telemetry.baseline.groups.length, 0);
    assert.ok(generationInputs.every((i) => !i.numerical_history && !i.telemetry));
    assert.equal(verifyHistoryRun(r).status, "passed");
    const changed = structuredClone(r); changed.telemetry.stages[1].changes.changes[0].difference = 999;
    assert.equal(verifyHistoryRun(changed).status, "failed");
  });
}

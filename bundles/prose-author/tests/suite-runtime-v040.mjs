import assert from "node:assert/strict";
import { writeFileSync, readFileSync, cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { runWriting, selectCurrentExamples, copyingCheck, renderCurrentProfile, MAX_REPAIRS, scanRuntimeArtifacts, reviewedAdvisoryOmissions } from "../skills/prose-draft/tools/writing-runtime.mjs";
import { parseAdapterOutput, adapterPreflight, configuredModel, callModel, adapterFailureReason } from "../skills/prose-draft/tools/runtime-adapters.mjs";
import { assembleProfileV3, sha256 } from "../skills/prose-draft/tools/profile-v3.mjs";
import { validateDraftV5, validateReview, DRAFT_INSTRUCTIONS, PROFILE_INSTRUCTIONS, runtimePrompt } from "../skills/prose-draft/tools/runtime-contract.mjs";
import { renderCurrentPrompts } from "./render-current-prompts.mjs";
import { initPreferenceStore, readPreferenceStore, applyPreferenceStore, undoPreferenceStore, defaultPreferenceDirectory } from "../skills/prose-draft/tools/preference-store.mjs";
import { proposePreferencesV2, emptyScope } from "../skills/prose-draft/tools/preferences-v2.mjs";
import { runtimeMain, loadWritingJob } from "../skills/prose-draft/tools/prose-runtime.mjs";
import { discoveryCards, preferenceDiff, comparePreference } from "../skills/prose-draft/tools/style-session.mjs";
import { initPreferencesV2, applyPreferencesV2 } from "../skills/prose-draft/tools/preferences-v2.mjs";
import { comparisonInputs, comparisonCallErrors, verifyComparison, DESIGN } from "./bounded-comparison.mjs";
import { installedCompanions } from "../skills/prose-draft/tools/installed-dependencies.mjs";
import { renderWritingReceipt, renderWritingDelivery } from "../skills/prose-draft/tools/writing-receipt.mjs";
import { parseSuiteSummary } from "./mutations.mjs";
import { chatReceiptMode } from "./chat-receipt.mjs";
import { parseArgs as installerArgs, installPlugins, checkPlugins, verifyDeployment } from "../../../install-prose-codex.mjs";

const candidate = (draft) => ({ schema: "voice-draft-source/5", kind: "draft", draft, omitted: [], claims: [], refused: "" });
const clear = (input) => ({ schema: "prose-runtime-review/1", verdict: "clear", findings: [],
  instructions: (input.instruction_ids ?? []).map((id) => ({ id, status: "applied", reason: "Applied in the supplied draft" })),
  atom_accounting: (input.missing_atoms ?? []).map((atom) => ({ atom, disposition: "immaterial", reason: "Explicit fixture compression" })), disclosures: [] });
const job = (extra = {}) => ({ schema: "prose-writing-job/1", mode: "draft", brief: "Decline an invitation politely.", context: { form: "reply", purpose: "decline" }, adapter: { harness: "codex" }, ...extra });
const scanner = (draft) => ({ status: "passed", draft_digest: sha256(draft), findings: [] });
const simulated = (value) => ({ status: "passed", value, dispatched: true, model: "fixture-model", elapsed_ms: 1, isolation: "test-double" });
const dispatchFor = (drafts = ["Thank you. I cannot attend."]) => {
  let index = 0;
  return async ({ input, schema }) => simulated(schema.properties.schema.const === "voice-draft-source/5" ? candidate(drafts[Math.min(index++, drafts.length - 1)]) : clear(input));
};

export async function run(t, { tmp, HERE }) {
  t.group("v0.4 production runtime and authenticated CLI transport");
  const test = async (name, fn) => { try { await fn(); t.check(name, true); } catch (e) { t.check(name, false, e.stack); } };
  await test("attributed receipt excerpts are checked against source, not mistaken for host summaries", () => {
    const draft = "A reply.", receipt = "Status: checked.\n\nTask review: passed. Voice review: not-evaluated.\n";
    const final = `${draft}\n\nGenerated check receipt excerpt:\n\n> Status: checked.\n>\n> Task review: passed.\n\n[Delivery](/task/delivery.md)`;
    assert.equal(chatReceiptMode(final, draft, receipt), "verified-receipt-excerpts");
    assert.equal(chatReceiptMode(final.replace("Task review: passed.", "Voice review: passed."), draft, receipt), null);
    assert.equal(chatReceiptMode(final + "\n\nEvery review passed.", draft, receipt), null);
    assert.equal(chatReceiptMode("All checks passed. [Delivery](/task/delivery.md)", draft, receipt), null);
    assert.equal(chatReceiptMode("Chat summary (unverified): task review passed.", draft, receipt), "unverified-summary");
  });
  await test("mutation counts require the completed suite summary, not receipt diagnostics", () => {
    const diagnostic = "AssertionError: expected Hard rules: 1 passed, 0 failed, 2 not-evaluated\n";
    const summary = `${"─".repeat(60)}\n1339 passed, 1 failed\n\nFailures:\n  - receipt test\n`;
    assert.deepEqual(parseSuiteSummary(diagnostic + summary), { failed: 1, crashed: false });
    assert.deepEqual(parseSuiteSummary(diagnostic), { failed: null, crashed: true });
    assert.deepEqual(parseSuiteSummary("1 passed, 0 failed\n"), { failed: null, crashed: true });
    assert.deepEqual(parseSuiteSummary(summary + summary), { failed: null, crashed: true });
    assert.deepEqual(parseSuiteSummary(`${"─".repeat(60)}\r\n334 passed, 0 failed, 1 skipped\r\n\nSkipped:\n`), { failed: 0, crashed: false });
  });
  await test("synchronous discovery and capability probes cannot wait forever on ignored SIGTERM", () => {
    const options = [];
    const exec = (file, args, opts) => { options.push(opts); throw Object.assign(new Error("fixture timeout"), { code: "ETIMEDOUT" }); };
    assert.equal(adapterPreflight("codex", { exec }).status, "not-evaluated");
    assert.deepEqual(installedCompanions(join(tmp, "cache/test/prose-author/0.4.0/skills/prose-draft/tools"), { harness: "codex" }, { exec }), {});
    assert.equal(options.length, 2);
    for (const opts of options) { assert.equal(opts.timeout, 15000); assert.equal(opts.killSignal, "SIGKILL"); }
  });
  await test("local Codex installer requires an explicit source switch and refuses unrelated plugin impact", () => {
    assert.equal(installerArgs([]).local, true); assert.equal(installerArgs(["--remote"]).local, false);
    assert.throws(() => installerArgs(["--remote", "--local"]), /not both/);
    const calls = [], root = join(HERE, "../../.."), remote = { name: "agent-primitives", root,
      marketplaceSource: { sourceType: "git", source: "https://github.com/ConnorBritain/agent-primitives.git" } };
    let extra = false;
    const run = (args) => {
      calls.push(args);
      if (args[1] === "marketplace" && args[2] === "list") return JSON.stringify({ marketplaces: [remote] });
      if (args[1] === "list") return JSON.stringify({ installed: extra ? [{ marketplaceName: "agent-primitives", name: "unrelated" }] : [] });
      return "{}";
    };
    assert.throws(() => installPlugins({}, run), /replace-marketplace/);
    assert.equal(calls.length, 1);
    extra = true;
    assert.throws(() => installPlugins({ replaceMarketplace: true }, run), /other installed plugins/);
    assert.ok(!calls.some((c) => c.includes("remove")));
    extra = false; installPlugins({ replaceMarketplace: true }, run);
    const addSource = calls.find((c) => c[1] === "marketplace" && c[2] === "add");
    assert.equal(addSource[3], root); assert.ok(!addSource.includes("--ref"));
    assert.equal(calls.filter((c) => c[1] === "add").length, 3);
  });
  await test("deployment checks reject changed final installed bytes and stale extra tools", () => {
    const source = join(tmp, "deployment-source"), target = join(tmp, "deployment-target");
    mkdirSync(join(source, "skills/one/tools"), { recursive: true });
    writeFileSync(join(source, "skills/one/tools/check.mjs"), "source bytes");
    cpSync(source, target, { recursive: true }); verifyDeployment(source, target);
    writeFileSync(join(target, "skills/one/tools/check.mjs"), "changed");
    assert.throws(() => verifyDeployment(source, target), /differs from this checkout/);
    writeFileSync(join(target, "skills/one/tools/check.mjs"), "source bytes");
    writeFileSync(join(target, "skills/one/tools/stale.mjs"), "stale");
    assert.throws(() => verifyDeployment(source, target), /inventory differs/);
  });
  await test("remote install checks cannot certify older plugins paired with current agent wrappers", () => {
    const run = () => JSON.stringify({ installed: [{ pluginId: "prose-author@agent-primitives", installed: true, enabled: true, version: "0.3.0" }] });
    assert.throws(() => checkPlugins({ local: false }, run), /do not mix remote plugins/);
  });
  await test("plugin dependency discovery uses enabled registry versions and never guesses among caches", () => {
    const market = join(tmp, "plugins/cache/fixture"), tools = join(market, "prose-author/0.4.0/skills/prose-draft/tools");
    for (const harness of ["codex", "claude"]) {
      const target = join(market, "prose-review/0.3.0");
      mkdirSync(join(target, `.${harness}-plugin`), { recursive: true });
      writeFileSync(join(target, `.${harness}-plugin/plugin.json`), JSON.stringify({ name: "prose-review", version: "0.3.0" }));
      const entry = { id: "prose-review@fixture", pluginId: "prose-review@fixture", enabled: true, installed: true, version: "0.3.0", installPath: target };
      const lookup = (entries) => installedCompanions(tools, { harness }, { exec: () => JSON.stringify(harness === "codex" ? { installed: entries } : entries) });
      assert.equal(lookup([entry])["prose-review"], target);
      assert.deepEqual(lookup([{ ...entry, enabled: false }]), {});
      assert.deepEqual(lookup([entry, entry]), {});
      assert.deepEqual(lookup([{ ...entry, version: "0.2.0" }]), {});
      assert.deepEqual(lookup([{ ...entry, errors: ["unavailable"] }]), {});
    }
    assert.deepEqual(installedCompanions(tools, { harness: "pi" }, { exec: () => { throw new Error("must not call"); } }), {});
    assert.deepEqual(installedCompanions(tools, { harness: "codex" }, { exec: () => "malformed" }), {});
  });
  await test("loose Claude installer includes the fidelity scan without unrelated tools", () => {
    const project = join(tmp, "loose-claude-v040"); mkdirSync(project);
    const names = ["prose-fidelity-critic", "prose-draft", "tell-scan"];
    const command = process.platform === "win32" ? "powershell.exe" : "bash";
    const args = process.platform === "win32"
      ? ["-NoProfile", "-File", join(HERE, "../../../install.ps1"), "-Project", ...names]
      : [join(HERE, "../../../install.sh"), "--project", ...names];
    execFileSync(command, args, { cwd: project, encoding: "utf8" });
    const installed = join(project, ".claude/tools/fidelity-scan.mjs");
    assert.equal(readFileSync(installed, "utf8"), readFileSync(join(HERE, "../../prose-review/tools/fidelity-scan.mjs"), "utf8"));
    assert.ok(existsSync(join(project, ".claude/skills/prose-draft/tools/prose-runtime.mjs")));
    assert.ok(!existsSync(join(project, ".claude/tools/unrelated.mjs")));
  });
  await test("current comparison reproduces source inputs, prompt bodies and exact recorded draft checks", () => {
    assert.deepEqual(verifyComparison(join(HERE, "runs/2026-09-06-v040-bounded")), []);
  });
  await test("comparison call inventory distinguishes profile conditions and rejects missing, duplicate and redrawn cells", () => {
    const design = JSON.parse(readFileSync(DESIGN, "utf8"));
    const stages = design.authors.flatMap((a) => [`${a}-profile`, ...design.forms.flatMap((f) => design.conditions.map((c) => `${a}-${f.id}-${c}`))]);
    const calls = stages.map((stage, i) => ({ id: String(i), stage }));
    assert.deepEqual(comparisonCallErrors(design, calls), []);
    assert.ok(comparisonCallErrors(design, calls.slice(1)).length);
    assert.ok(comparisonCallErrors(design, [...calls, { id: "redraw", stage: calls[1].stage }]).length);
    assert.ok(comparisonCallErrors(design, calls.map((r, i) => i === 1 ? calls[0] : r)).length);
    assert.ok(comparisonCallErrors(design, calls.map((r, i) => i === 1 ? { ...r, id: calls[0].id } : r)).length);
  });
  await test("bounded comparison varies only profile/examples, not task facts or explicit preferences", () => {
    const design = JSON.parse(readFileSync(DESIGN, "utf8"));
    assert.equal(design.authors.length * design.forms.length * design.conditions.length, 18);
    const samples = [{ id: "a", text: "Human prose.", author: "A", source: "fixture", human_authored: true }];
    const profile = assembleProfileV3({ id: "a", samples });
    for (const form of design.forms) {
      const variants = comparisonInputs(design, form, samples, profile);
      assert.deepEqual(variants.map((v) => v.condition), ["examples", "profile", "profile-and-examples"]);
      for (const key of ["brief", "mode", "context", "facts", "rules", "source_text"]) {
        assert.deepEqual(variants[0].input[key], variants[1].input[key]); assert.deepEqual(variants[0].input[key], variants[2].input[key]);
      }
      assert.equal(variants[0].input.profile, null); assert.deepEqual(variants[1].input.examples, []);
      assert.deepEqual(variants[0].input.examples, variants[2].input.examples);
      assert.deepEqual(variants[1].input.profile, variants[2].input.profile);
    }
  });
  await test("every review receives an explicit exact atom list, including an empty task-review list", async () => {
    const calls = [], dispatch = dispatchFor();
    const result = await runWriting(job(), { scan: scanner, dispatch: async (args) => {
      calls.push(args); return dispatch(args);
    } });
    assert.equal(result.status, "checked");
    const review = calls.find((r) => r.schema.properties.schema.const === "prose-runtime-review/1");
    assert.deepEqual(review.input.missing_atoms, []);
    assert.match(review.system, /If missing_atoms is empty, return atom_accounting: \[\]/);
    const extra = { ...clear(review.input), atom_accounting: [{ atom: "invented inventory row", disposition: "immaterial", reason: "Present" }] };
    assert.ok(validateReview(extra, { draft: result.draft }).some((e) => /every missing atom/.test(e)));
  });
  await test("runtime and standalone agent bodies are rendered from the same primitive sources", () => {
    assert.deepEqual(renderCurrentPrompts(), []);
    const body = (name) => readFileSync(join(HERE, "../../../primitives/agents", name, "agent.md"), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
    assert.equal(DRAFT_INSTRUCTIONS, body("voice-draft")); assert.equal(PROFILE_INSTRUCTIONS, body("voice-profile-render"));
    assert.equal(runtimePrompt("voice-feedback-interpret"), body("voice-feedback-interpret"));
  });
  await test("a missing installed prompt yields ungated output without calling a model", () => {
    const copy = join(tmp, "missing-prompt-skill");
    cpSync(join(HERE, "../skills/prose-draft"), copy, { recursive: true });
    rmSync(join(copy, "references/prompts/voice-draft.md"));
    const script = `import {runWriting} from ${JSON.stringify(new URL(`file://${join(copy, "tools/writing-runtime.mjs")}`).href)}; const result=await runWriting(${JSON.stringify(job())},{dispatch:async()=>{throw new Error("must not call");}}); console.log(JSON.stringify(result));`;
    const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }));
    assert.equal(result.status, "ungated"); assert.equal(result.calls.length, 0); assert.match(result.reason, /prompt is unavailable/);
  });
  await test("repairs retain profile, examples and explicit rules and re-review every observation", async () => {
    const samples = [{ id: "a", text: "I pause (briefly).", author: "A", source: "fixture", human_authored: true }];
    const profile = assembleProfileV3({ id: "a", samples, observations: [{ description: "This one sample qualifies duration through an aside.", dimensions: ["qualification-hedging"], citations: [{ file: "a", quote: "(briefly)", start: 8, end: 17 }] }] });
    const inputs = [], dispatch = dispatchFor(["May I decline?", "I must decline."]);
    const result = await runWriting(job({ profile, samples, rules: [{ id: "q", kind: "punctuation", directive: "No question marks", characters: "?", minimum: 0, maximum: 0 }] }), {
      scan: scanner, dispatch: async (args) => { inputs.push(structuredClone(args)); return dispatch(args); } });
    assert.equal(result.status, "checked"); assert.equal(result.attempts.length, 2);
    const generations = inputs.filter((r) => r.schema.properties.schema.const === "voice-draft-source/5");
    for (const key of ["profile", "examples", "rules", "facts", "context"]) assert.deepEqual(generations[0].input[key], generations[1].input[key]);
    assert.equal(generations[0].system, DRAFT_INSTRUCTIONS); assert.equal(generations[1].system, DRAFT_INSTRUCTIONS);
    const voice = inputs.filter((r) => r.input.observed_comparison);
    assert.equal(voice.length, 2); assert.deepEqual(voice[1].input.instruction_ids, ["q", ...profile.observations.map((o) => o.id)]);
    assert.deepEqual(voice[1].input.advisory_instruction_ids, profile.observations.map((o) => o.id));
    assert.equal(voice[1].input.previous_draft, "May I decline?");
  });
  await test("advisory omissions can be clear, but required omissions and uncertainty cannot", () => {
    const value = clear({ instruction_ids: ["observed"] });
    value.instructions[0].status = "omitted"; value.instructions[0].reason = "No aside needed in this reply.";
    const options = { draft: "No, thank you.", instructionIds: ["observed"], advisoryIds: ["observed"] };
    assert.deepEqual(validateReview(value, options), []);
    assert.ok(validateReview(value, { ...options, advisoryIds: [] }).some((e) => /omitted required instruction/.test(e)));
    value.instructions[0].status = "unresolved";
    assert.ok(validateReview(value, options).some((e) => /unresolved/.test(e)));
    value.instructions.push({ id: "extra", status: "applied", reason: "Not requested" });
    assert.ok(validateReview(value, options).some((e) => /exactly once/.test(e)));
  });
  await test("advisory omission resolution requires both successful reviews and never excuses user rules", () => {
    const omitted = [{ id: "observed", reason: "Not relevant to this reply" }, { id: "required", reason: "Could not apply" }];
    const review = (stage) => ({ stage, status: "passed", result: { instructions: omitted.map((o) => ({ ...o, status: "not-applicable" })) } });
    const both = [review("task-review"), review("voice-review")];
    assert.deepEqual(reviewedAdvisoryOmissions(omitted, ["observed"], both), [omitted[0]]);
    assert.deepEqual(reviewedAdvisoryOmissions(omitted, ["observed"], both.slice(0, 1)), []);
    both[1].status = "not-evaluated";
    assert.deepEqual(reviewedAdvisoryOmissions(omitted, ["observed"], both), []);
    both[1].status = "passed"; both[1].result.instructions[0].status = "applied";
    assert.deepEqual(reviewedAdvisoryOmissions(omitted, ["observed"], both), []);
  });
  await test("the runtime retains reviewed natural variation without requiring every observed habit", async () => {
    const samples = [{ id: "a", text: "I pause (briefly).", author: "A", source: "fixture", human_authored: true }];
    const profile = assembleProfileV3({ id: "a", samples, observations: [{ description: "This one sample qualifies duration through an aside.", dimensions: ["qualification-hedging"], citations: [{ file: "a", quote: "(briefly)", start: 8, end: 17 }] }] });
    const omitted = [{ id: "o001", reason: "No aside needed for this short reply." }];
    const dispatch = async ({ input }) => {
      if (!input.draft) return simulated({ ...candidate("No, thank you."), omitted });
      assert.deepEqual(input.advisory_instruction_ids, ["o001"]);
      const review = clear(input); review.instructions[0] = { id: "o001", status: "omitted", reason: omitted[0].reason };
      return simulated(review);
    };
    const result = await runWriting(job({ profile, samples }), { dispatch, scan: scanner });
    assert.equal(result.status, "checked"); assert.equal(result.attempts.length, 1);
    assert.deepEqual(result.omitted, omitted); assert.deepEqual(result.advisory_omissions, omitted);
    assert.deepEqual(result.unresolved_omissions, []);
    const required = await runWriting(job({ rules: [{ id: "o001", kind: "required-text", directive: "Include the exact text thank you", text: "thank you" }] }), {
      scan: scanner, dispatch: async ({ input }) => simulated(input.draft ? clear(input) : { ...candidate("No, thank you."), omitted }) });
    assert.equal(required.status, "incomplete"); assert.deepEqual(required.unresolved_omissions, omitted);
  });
  await test("new sessions locate one persistent store without creating or replacing an identity", async () => {
    assert.equal(defaultPreferenceDirectory({}, tmp), join(tmp, ".config/prose-author/preferences"));
    assert.equal(defaultPreferenceDirectory({ PROSE_PREFERENCES_DIR: tmp }, "/different-home"), tmp);
    assert.throws(() => defaultPreferenceDirectory({ PROSE_PREFERENCES_DIR: "relative" }, tmp), /absolute/);
    const store = join(tmp, "locate-only-store"), options = { stdout: () => {}, stderr: () => {} };
    const absent = await runtimeMain(["preferences", "locate", "--store", store], options);
    assert.equal(absent.exists, false); assert.equal(absent.preference_id, null);
    initPreferenceStore(store, "shared-person");
    const located = await runtimeMain(["preferences", "locate", "--store", store], options);
    assert.equal(located.preference_id, "shared-person");
    assert.throws(() => initPreferenceStore(store, "different-person"), /different identity/);
  });
  await test("discovery stays small and distinguishes unmeasured choices from observed evidence", () => {
    const p = initPreferencesV2("discovery");
    const empty = discoveryCards(p);
    assert.equal(empty.cards.length, 3); assert.ok(empty.cards.every((c) => c.status === "not-evaluated"));
    assert.equal(empty.next_offset, null);
    const profile = assembleProfileV3({ id: "a", samples: [{ id: "a", text: "I pause (briefly).", source: "fixture", author: "A", human_authored: true }] });
    const first = discoveryCards(p, { profile }), second = discoveryCards(p, { profile, offset: first.next_offset });
    assert.equal(first.cards.length, 3); assert.equal(second.cards.length, 3);
    assert.ok(first.cards.every((c) => !second.cards.some((d) => d.id === c.id)));
    assert.throws(() => discoveryCards(p, { limit: 4 }), /one to three/);
  });
  await test("one-feature comparisons preserve stored choices and reject inactive or unchanged variants", () => {
    const p = initPreferencesV2("comparison");
    const rule = { id: "q", kind: "punctuation", directive: "Never ask questions in replies", characters: "?", minimum: 0, maximum: 0 };
    const decision = { id: "q", feature: "questions", scope: { ...emptyScope(), forms: ["reply"] }, rule, binding: null };
    const saved = applyPreferencesV2(p, proposePreferencesV2(p, { feedback: "Never ask questions in replies", operations: [{ id: "save", kind: "upsert", decision }] })).preferences;
    const before = JSON.stringify(saved), preview = { ...rule, directive: "Allow one question", maximum: 1 };
    const compared = comparePreference(saved, { decision_id: "q", rule: preview, context: { form: "reply" } });
    assert.equal(compared.saved, false); assert.equal(JSON.stringify(saved), before);
    assert.equal(compared.variants[0].style.rules[0].maximum, 0); assert.equal(compared.variants[1].style.rules[0].maximum, 1);
    assert.deepEqual(preferenceDiff(saved, saved).changes, []);
    assert.equal(preferenceDiff(p, saved).changes[0].kind, "added");
    assert.throws(() => comparePreference(saved, { decision_id: "q", rule: preview, context: { form: "essay" } }), /active preference/);
    assert.throws(() => comparePreference(saved, { decision_id: "q", rule, context: { form: "reply" } }), /actual rule change/);
  });
  await test("documented feedback and discovery work through the real command entrypoint", async () => {
    const reference = readFileSync(join(HERE, "../skills/prose-style-tune/references/session.md"), "utf8");
    const feedback = JSON.parse(reference.match(/```json\n([\s\S]*?)\n```/)[1]);
    const store = join(tmp, "documented-preferences"), file = join(tmp, "documented-feedback.json"), proposalFile = join(tmp, "documented-proposal.json");
    const options = { stdout: () => {}, stderr: () => {} };
    await runtimeMain(["preferences", "init", "--store", store, "--id", "documented"], options);
    writeFileSync(file, JSON.stringify(feedback));
    const proposal = await runtimeMain(["preferences", "propose", "--store", store, "--feedback", file], options);
    writeFileSync(proposalFile, JSON.stringify(proposal));
    const saved = await runtimeMain(["preferences", "apply", "--store", store, "--proposal", proposalFile], options);
    assert.equal(saved.status, "saved"); assert.deepEqual(saved.receipt.scopes[0].scope.forms, ["reply"]);
    const cards = await runtimeMain(["preferences", "discover", "--store", store], options);
    assert.equal(cards.cards.length, 3);
    const undone = await runtimeMain(["preferences", "undo", "--store", store], options);
    assert.equal(undone.revision, 3); assert.deepEqual(undone.decisions, []);
  });
  await test("examples-only entrypoint does not silently render a profile", async () => {
    const path = join(tmp, "examples-only.json"), out = join(tmp, "examples-only-run"), inputs = [];
    writeFileSync(path, JSON.stringify(job({ profile_policy: "none", samples: [{ id: "a", text: "A little human note.", author: "A", source: "fixture", human_authored: true }] })));
    const result = await runtimeMain(["run", "--job", path, "--out", out], { dispatch: async (args) => { inputs.push(args.input); return dispatchFor()(args); }, stdout: () => {}, stderr: () => {} });
    assert.equal(result.status, "checked"); assert.equal(result.invocation.model_calls, 2);
    assert.equal(inputs[0].profile, null); assert.equal(inputs[0].examples[0].text, "A little human note.");
    assert.equal(result.invocation.model_call_records, 2);
  });
  await test("automatic profile preparation is included in total call accounting and recorded inputs", async () => {
    const path = join(tmp, "automatic-profile.json"), out = join(tmp, "automatic-profile-run");
    const samples = [{ id: "a", text: "A little human note.", author: "A", source: "fixture", human_authored: true }];
    writeFileSync(path, JSON.stringify(job({ samples })));
    const result = await runtimeMain(["run", "--job", path, "--out", out], { stdout: () => {}, stderr: () => {}, dispatch: async (args) => {
      if (args.schema.properties.schema.const !== "voice-profile-source/5") return dispatchFor()(args);
      return simulated({ schema: "voice-profile-source/5", observations: [], refused: "",
        unresolved: args.input.coverage_dimensions.map((dimension) => ({ dimension, reason: "This small fixture supplies no recurring semantic habit" })) });
    } });
    assert.equal(result.status, "checked");
    assert.equal(result.invocation.model_calls, 4); assert.equal(result.receipt.model_calls, 3);
    const record = JSON.parse(readFileSync(join(out, "call-001.json")));
    assert.equal(record.stage, "profile"); assert.equal(record.input.samples[0].text, samples[0].text); assert.ok(record.system);
    assert.equal(result.invocation.model_elapsed_ms, 4);
  });
  await test("contradictory inline/file inputs and missing explicit store values refuse", async () => {
    const path = join(tmp, "conflicting-inputs.json");
    writeFileSync(path, JSON.stringify(job({ source_file: "missing.md", source_text: "A different source" })));
    assert.throws(() => loadWritingJob(path), /not both/);
    await assert.rejects(() => runtimeMain(["preferences", "locate", "--store", "--id", "invalid"]), /Missing --store/);
  });
  await test("profile cancellation and thrown transport are recorded without invented success", async () => {
    const sampleJob = { id: "cancelled", samples: [{ id: "a", text: "Human sample.", author: "A", source: "fixture", human_authored: true }], adapter: { harness: "codex" } };
    const controller = new AbortController(); controller.abort(); let count = 0;
    const cancelled = await renderCurrentProfile(sampleJob, { signal: controller.signal, dispatch: async () => { count++; } });
    assert.equal(cancelled.status, "not-evaluated"); assert.equal(count, 0);
    const records = [], broken = await renderCurrentProfile(sampleJob, { dispatch: async () => { throw new Error("Disconnected"); }, onCall: (r) => records.push(r) });
    assert.equal(broken.status, "failed"); assert.equal(records[0].stage, "profile"); assert.equal(records[0].result.dispatched, false);
  });
  await test("ordinary brief with no numeric length runs actual final-byte checks", async () => {
    const result = await runWriting(job({ rules: [{ id: "no-questions", directive: "Never use question marks", kind: "punctuation", characters: "?", minimum: 0, maximum: 0 }] }), { dispatch: dispatchFor(), scan: scanner });
    assert.equal(result.status, "checked"); assert.equal(result.receipt.model_calls, 2);
    assert.equal(result.receipt.draft_digest, sha256(result.draft));
    assert.equal(result.attempts[0].mechanical.checks[0].status, "passed");
  });
  await test("missing scanner yields an explicitly ungated draft, not a pass", async () => {
    const result = await runWriting(job({ dependencies: { scanner: null } }), { dispatch: dispatchFor() });
    assert.equal(result.status, "ungated"); assert.ok(result.draft);
    assert.equal(result.attempts[0].artifacts.status, "not-evaluated");
  });
  await test("mechanical failures trigger bounded repair and recount every final candidate", async () => {
    const result = await runWriting(job({ rules: [{ id: "no-questions", directive: "Never ask questions", kind: "punctuation", characters: "?", minimum: 0, maximum: 0 }] }), { dispatch: dispatchFor(["Can I decline?", "I cannot attend."]), scan: scanner });
    assert.equal(result.status, "checked"); assert.equal(result.attempts.length, 2);
    assert.equal(result.attempts[0].mechanical.checks[0].status, "failed");
    assert.equal(result.attempts[1].mechanical.checks[0].status, "passed");
    assert.ok(result.attempts[1].reviews.some((r) => r.stage === "fidelity-review" && r.status === "passed"));
    assert.equal(result.receipt.final_check.draft_digest, sha256("I cannot attend."));
  });
  await test("repair exhaustion is incomplete and never silently loops", async () => {
    const result = await runWriting(job({ rules: [{ id: "q", directive: "No questions", kind: "punctuation", characters: "?", minimum: 0, maximum: 0 }] }), { dispatch: dispatchFor(["Why?"]), scan: scanner });
    assert.equal(result.status, "incomplete"); assert.equal(result.attempts.length, MAX_REPAIRS + 1);
    assert.equal(result.calls.filter((c) => c.stage === "repair").length, 2);
  });
  await test("refusal and interrupted transport do not become fabricated successful drafts", async () => {
    const noContext = await runWriting(job({ context: {} }), { dispatch: dispatchFor(), scan: scanner });
    assert.equal(noContext.status, "refused"); assert.equal(noContext.calls.length, 0);
    const unavailable = await runWriting(job(), { dispatch: async () => ({ status: "not-evaluated", reason: "No CLI", dispatched: false }), scan: scanner });
    assert.equal(unavailable.status, "ungated"); assert.equal(unavailable.draft, ""); assert.equal(unavailable.receipt.model_calls, 0);
    const failed = await runWriting(job(), { dispatch: async () => { throw new Error("Transport interrupted"); }, scan: scanner });
    assert.equal(failed.status, "ungated"); assert.equal(failed.draft, "");
  });
  await test("continuation receives existing prose as context without becoming a corpus sample", async () => {
    const inputs = [];
    const result = await runWriting(job({ mode: "continue", source_text: "The budget was approved." }), {
      dispatch: async (args) => { inputs.push(args.input); return dispatchFor(["Next, we schedule the work."])(args); }, scan: scanner });
    assert.equal(result.status, "checked"); assert.equal(inputs[0].source_text, "The budget was approved.");
    assert.equal(inputs[0].examples.length, 0); assert.equal(result.draft, "Next, we schedule the work.");
  });
  await test("rewrite preservation requires the fidelity stage and atom accounting", async () => {
    const result = await runWriting(job({ mode: "rewrite", source_text: "The meeting starts at 10." }), { dispatch: dispatchFor(["The meeting starts at ten."]), scan: scanner });
    const review = result.attempts[0].reviews.find((r) => r.stage === "fidelity-review");
    assert.equal(review.status, "passed"); assert.ok(review.result.atom_accounting.some((r) => r.atom === "10"));
    const missing = await runWriting(job({ mode: "rewrite", source_text: "Original.", dependencies: { fidelity_scan: null } }), { dispatch: dispatchFor(["Revised."]), scan: scanner });
    assert.equal(missing.status, "ungated");
  });
  await test("missing review dispositions and unsupported biography cannot pass silently in fixtures", async () => {
    const generated = "At my employer Acme, I manage the legal team.";
    const result = await runWriting(job(), { scan: scanner, dispatch: async ({ input, schema }) => {
      if (schema.properties.schema.const === "voice-draft-source/5") return simulated(candidate(generated));
      const review = clear(input); review.verdict = "revise";
      review.findings = [{ quote: generated, source_quote: "", category: "unsupported-biography", reason: "No employer or job was supplied" }];
      return simulated(review);
    } });
    assert.equal(result.status, "incomplete");
    assert.equal(result.attempts[0].reviews[0].status, "failed");
    assert.ok(validateReview(clear({}), { draft: "Hello", instructionIds: ["missing"] }).some((e) => /every requested instruction/.test(e)));
  });
  await test("malformed draft or unlocatable disclosures never count as reviewed output", async () => {
    assert.ok(validateDraftV5({ ...candidate("Hi."), claims: [{ quote: "Not present", reason: "Verify" }] }).length);
    const result = await runWriting(job(), { dispatch: async () => simulated({ ...candidate("Hello"), claims: "invalid" }), scan: scanner });
    assert.equal(result.status, "incomplete"); assert.equal(result.draft, "");
  });
  await test("whole-file example selection is deterministic and never includes model samples", () => {
    const samples = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, text: `Human example ${i}.`, source: "fixture", author: "A", human_authored: true, form: i === 3 ? "reply" : "essay" }));
    samples.push({ ...samples[0], id: "model", human_authored: false });
    const result = selectCurrentExamples(samples, { context: { form: "reply" } });
    assert.equal(result.examples.length, 1); assert.equal(result.examples[0].id, "s3");
    assert.deepEqual(result.excluded.map((e) => e.id), ["s0", "s1", "s2", "s4"]);
    assert.equal(selectCurrentExamples(samples).examples.length, 3);
    for (const e of result.examples) assert.equal(e.text, samples.find((s) => s.id === e.id).text);
    assert.deepEqual(selectCurrentExamples([...samples].reverse(), { context: { form: "reply" } }), result);
    assert.equal(selectCurrentExamples(samples, { max_chars: 1 }).examples.length, 0);
  });
  await test("examples exclude known register conflicts and disclose unknown metadata on the final receipt", async () => {
    const sample = (id, metadata) => ({ id, text: `Human example ${id}.`, source: "fixture", author: "A", human_authored: true, ...metadata });
    const samples = [sample("matching", { form: "reply", register: "casual" }), sample("wrong-register", { form: "reply", register: "formal" }), sample("unknown", {})];
    const context = { form: "reply", purpose: "decline", register: "casual" };
    const selected = selectCurrentExamples(samples, { context });
    assert.deepEqual(selected.examples.map((e) => e.id), ["matching", "unknown"]);
    assert.deepEqual(selected.excluded.map((e) => e.id), ["wrong-register"]);
    assert.equal(selected.warnings.length, 1); assert.equal(selected.warnings[0].id, "unknown");
    assert.match(selected.warnings[0].reason, /matching is not established/);
    const result = await runWriting(job({ samples, context }), { dispatch: async ({ input }) => simulated(input.draft ? clear(input) : candidate("Thank you. I cannot make it.")), scan: scanner });
    assert.deepEqual(result.receipt.example_warnings, selected.warnings);
    assert.deepEqual(result.receipt.example_exclusions, selected.excluded);
  });
  await test("copying flags unexplained overlap but permits explicit supplied quotations", () => {
    const text = "The first twelve words in this particular sentence belong to this author alone.";
    const samples = [{ id: "source", text }];
    assert.equal(copyingCheck(text, samples).status, "failed");
    assert.equal(copyingCheck(text, samples, { authorized_quotes: [text] }).status, "passed");
    assert.equal(copyingCheck(text, samples, { original: text }).status, "passed");
    assert.equal(copyingCheck(text, []).status, "not-evaluated");
  });
  await test("profile render accepts one response with exact cited excerpts, not guessed offsets", async () => {
    const samples = [{ id: "a", text: "I pause (briefly).", source: "fixture", author: "A", human_authored: true }];
    const unresolved = ["person-reader-stance", "contraction-negation", "questions-imperatives-vocatives", "opponents-allies-sources", "profanity-vulgarity", "self-reference-biography", "interruption-punctuation", "figures-analogy", "openings-endings-closure"].map((dimension) => ({ dimension, reason: "Limited sample" }));
    const output = { schema: "voice-profile-source/5", refused: "", observations: [{ description: "In this one sample the aside qualifies duration.", dimensions: ["qualification-hedging"], citations: [{ file: "a", quote: "(briefly)" }] }], unresolved };
    const result = await renderCurrentProfile({ id: "a", samples, adapter: { harness: "codex" } }, { dispatch: async () => simulated(output) });
    assert.equal(result.status, "passed"); assert.equal(result.profile.observations[0].citations[0].start, 8);
    const bad = await renderCurrentProfile({ id: "a", samples, adapter: { harness: "codex" } }, { dispatch: async () => simulated({ ...output, unresolved: [] }) });
    assert.equal(bad.status, "failed");
  });
  await test("stale corpus and missing voice dependency are explicit", async () => {
    const samples = [{ id: "a", text: "A short human sample.", source: "fixture", author: "A", human_authored: true }];
    const p = assembleProfileV3({ id: "a", samples });
    const changed = await runWriting(job({ profile: p, samples: [{ ...samples[0], text: "Changed." }] }), { dispatch: dispatchFor(), scan: scanner });
    assert.equal(changed.status, "refused"); assert.equal(changed.calls.length, 0);
    const missing = await runWriting(job({ profile: p, samples, dependencies: { voice: null } }), { dispatch: dispatchFor(), scan: scanner });
    assert.equal(missing.status, "ungated");
  });
  await test("Codex JSONL rejects tool activity, incomplete turns and malformed output", () => {
    const events = [{ type: "item.completed", item: { type: "agent_message", text: JSON.stringify({ ok: true }) } }, { type: "turn.completed", usage: { output_tokens: 3 } }];
    assert.deepEqual(parseAdapterOutput("codex", events.map(JSON.stringify).join("\n")).value, { ok: true });
    assert.throws(() => parseAdapterOutput("codex", [...events, { type: "item.completed", item: { type: "command_execution" } }].map(JSON.stringify).join("\n")), /Unexpected tool/);
    assert.throws(() => parseAdapterOutput("codex", JSON.stringify(events[0])), /did not complete/);
    assert.throws(() => parseAdapterOutput("codex", "not json"), /Malformed/);
  });
  await test("Claude accepts structured transport but rejects unrelated tools", () => {
    const events = [{ type: "system", subtype: "init", tools: [], mcp_servers: [] }, { type: "result", subtype: "success", is_error: false, structured_output: { ok: true } }];
    assert.deepEqual(parseAdapterOutput("claude", events.map(JSON.stringify).join("\n")).value, { ok: true });
    assert.throws(() => parseAdapterOutput("claude", [{ type: "system", subtype: "init", tools: ["Read"] }, ...events].map(JSON.stringify).join("\n")), /unexpected tools/);
  });
  await test("unsupported CLI flags and pre-dispatch cancellation spend no model call", async () => {
    assert.equal(adapterPreflight("pi").status, "not-evaluated");
    assert.equal(adapterPreflight("codex", { exec: () => "old CLI" }).status, "not-evaluated");
    assert.equal(configuredModel("codex", { PROSE_MODEL: "chosen-model" }), "chosen-model");
    const result = await callModel({ harness: "codex", preflight: { status: "not-evaluated", reason: "Fixture unavailable" } });
    assert.equal(result.dispatched, false);
    const controller = new AbortController(); controller.abort();
    const cancelled = await callModel({ harness: "codex", preflight: { status: "passed" }, signal: controller.signal });
    assert.equal(cancelled.dispatched, false);
    assert.match(adapterFailureReason("codex", JSON.stringify({ type: "turn.failed", error: { message: JSON.stringify({ error: { message: "This model requires a newer CLI." } }) } }), 1), /requires a newer CLI/);
  });
  await test("real Tier A scanner is invoked without a fallback author-comparison claim", () => {
    const result = scanRuntimeArtifacts("A short, ordinary sentence.", new URL("../../prose-tell-scan/skills/tell-scan/tools/tell-scan.mjs", import.meta.url).pathname);
    assert.equal(result.status, "passed");
    assert.match(result.reason, /no fallback cadence claim/);
    assert.equal(result.draft_digest, sha256("A short, ordinary sentence."));
    assert.equal(scanRuntimeArtifacts("Text.", null).status, "not-evaluated");
  });
  await test("host permission failures have actionable diagnostics without dumping local state paths", () => {
    const stderr = "WARN state at /private/local-state is read only\nError: failed to initialize in-process app-server client: Operation not permitted (os error 1)\n";
    const reason = adapterFailureReason("codex", "", 1, stderr);
    assert.match(reason, /denied by host permissions/); assert.match(reason, /without approval/);
    assert.doesNotMatch(reason, /private\/local-state/);
    assert.equal(adapterFailureReason("codex", "", 1, "unrelated startup failure"), "codex exited 1");
  });
  await test("deep claim auditing receives supplied facts and cannot vanish into a checked result", async () => {
    let auditCalls = 0;
    const input = job({ review: "deep", facts: ["The invitation is for Friday."] });
    const dispatch = async (args) => {
      if (args.system.startsWith("Audit factual claims")) {
        auditCalls++; assert.ok(args.input.original.includes(input.facts[0]));
        return { status: "failed", reason: "Audit interrupted", dispatched: true };
      }
      return dispatchFor()(args);
    };
    const result = await runWriting(input, { dispatch, scan: scanner });
    assert.equal(auditCalls, 1); assert.equal(result.status, "ungated");
    assert.equal(result.attempts[0].reviews.find((r) => r.stage === "claim-audit").status, "not-evaluated");
  });
  await test("saved feedback survives a new CLI process and undo preserves earlier revisions", () => {
    const directory = join(tmp, "preference-store-v040"), p = initPreferenceStore(directory, "writer");
    const decision = { id: "dash", feature: "dash", binding: null, scope: { ...emptyScope(), forms: ["reply"] },
      rule: { id: "dash", kind: "punctuation", directive: "Never use em dashes in replies", characters: "—", minimum: 0, maximum: 0 } };
    const proposal = proposePreferencesV2(p, { feedback: "Never use em dashes in replies", operations: [{ id: "save", kind: "upsert", decision }] });
    applyPreferenceStore(directory, proposal);
    const cli = join(HERE, "../skills/prose-draft/tools/prose-runtime.mjs");
    const reopened = JSON.parse(execFileSync(process.execPath, [cli, "preferences", "show", "--store", directory], { encoding: "utf8" }));
    assert.equal(reopened.revision, 2); assert.equal(reopened.decisions[0].id, "dash");
    undoPreferenceStore(directory); assert.equal(readPreferenceStore(directory).decisions.length, 0);
    assert.equal(readPreferenceStore(directory).revision, 3);
    assert.throws(() => initPreferenceStore(directory, "different-writer"), /different identity/);
  });
  await test("an occupied preference-store lock refuses rather than colliding", () => {
    const directory = join(tmp, "occupied-store-v040"); initPreferenceStore(directory, "writer");
    writeFileSync(join(directory, ".writer.lock"), "fixture owner");
    assert.throws(() => initPreferenceStore(directory, "writer"), /another or interrupted writer/);
    assert.equal(readFileSync(join(directory, ".writer.lock"), "utf8"), "fixture owner");
  });
  await test("the actual skill entrypoint writes final prose and refuses run-directory reuse", async () => {
    const path = join(tmp, "writing-job-v040.json"), out = join(tmp, "writing-entrypoint-v040");
    writeFileSync(path, JSON.stringify(job()));
    const result = await runtimeMain(["run", "--job", path, "--out", out], { dispatch: dispatchFor(), stdout: () => {}, stderr: () => {} });
    assert.equal(result.status, "checked"); assert.equal(readFileSync(join(out, "draft.md"), "utf8"), result.draft);
    assert.equal(JSON.parse(readFileSync(join(out, "result.json"))).receipt.draft_digest, sha256(result.draft));
    await assert.rejects(() => runtimeMain(["run", "--job", path, "--out", out], { dispatch: dispatchFor() }), /EEXIST/);
  });
  await test("human receipt reports recorded statuses and delivery preserves the exact prose", () => {
    const result = { status: "ungated", reason: "Voice dependency unavailable", draft: "A short draft.  \n", attempts: [{
      mechanical: { checks: [{ id: "limit", enforcement: "enforced", status: "passed" }, { id: "warmth", enforcement: "advisory", status: "not-evaluated" }] },
      artifacts: { status: "failed" }, copying: { status: "not-evaluated" },
      reviews: [{ stage: "task-review", status: "passed" }, { stage: "voice-review", status: "not-evaluated" }],
    }], receipt: { preference_revision: 2, active_preferences: ["limit"] }, invocation: { model_calls: 2, elapsed_ms: 1200 } };
    const context = job({ profile: { measured: { support: "limited-evidence" } } });
    const receipt = renderWritingReceipt(result, context);
    assert.match(receipt, /Status: ungated/); assert.match(receipt, /Profile evidence: limited-evidence/);
    assert.match(receipt, /Artifact scan: failed/); assert.match(receipt, /Voice review: not-evaluated/);
    assert.match(receipt, /Hard rules: 1 passed, 0 failed, 0 not-evaluated/);
    assert.match(receipt, /Not mechanically evaluated \(semantic instructions\): warmth/);
    assert.equal(renderWritingDelivery(result, receipt), result.draft + "\n\n" + receipt);
    const missing = renderWritingReceipt({ status: "ungated", reason: "CLI missing" }, job());
    assert.match(missing, /Hard rules: not-evaluated/); assert.match(missing, /Artifact scan: not-evaluated/);
    assert.doesNotMatch(missing, /Artifact scan: passed/);
  });
  await test("a mixed-rule receipt can reproduce without relabeling semantic checks as mechanical passes", async () => {
    const file = join(tmp, "mixed-receipt-job.json"), out = join(tmp, "mixed-receipt-run");
    writeFileSync(file, JSON.stringify(job({ rules: [
      { id: "limit", kind: "word-limit", directive: "Under 60 words", minimum: 1, maximum: 59 },
      { id: "warmth", kind: "semantic", directive: "Decline warmly" },
    ] })));
    const options = { dispatch: dispatchFor(), stdout: () => {}, stderr: () => {} };
    const result = await runtimeMain(["run", "--job", file, "--out", out], options);
    assert.equal(result.status, "checked");
    assert.equal(result.attempts[0].mechanical.status, "not-evaluated");
    assert.equal(readFileSync(join(out, "delivery.md"), "utf8"), result.draft + "\n\n" + readFileSync(join(out, "receipt.md"), "utf8"));
    const args = ["check-result", "--result", join(out, "result.json"), "--draft", join(out, "draft.md"), "--job", join(out, "resolved-job.json")];
    const checked = await runtimeMain(args, options);
    assert.equal(checked.schema, "prose-result-verification/1"); assert.equal(checked.status, "passed");
    assert.equal(checked.mechanical_status, "not-evaluated"); assert.equal(checked.result_status, "checked");
    assert.equal(checked.delivery_status, "not-evaluated");
    const deliveryArgs = [...args, "--delivery", join(out, "delivery.md")];
    const delivery = readFileSync(join(out, "delivery.md"), "utf8");
    assert.equal((await runtimeMain(deliveryArgs, options)).delivery_status, "passed");
    assert.match(delivery, /Host-written chat summaries are unverified/);
    writeFileSync(join(out, "delivery.md"), delivery.replace("Task review: passed", "Task review: failed"));
    assert.equal((await runtimeMain(deliveryArgs, options)).status, "failed", "A receipt-only change invalidates delivery");
    writeFileSync(join(out, "delivery.md"), delivery + " ");
    assert.equal((await runtimeMain(deliveryArgs, options)).status, "failed", "Final delivery bytes are exact");
    writeFileSync(join(out, "delivery.md"), delivery);
    const changedRecord = { ...result, draft: "A different draft." };
    writeFileSync(join(out, "result.json"), JSON.stringify(changedRecord));
    writeFileSync(join(out, "delivery.md"), renderWritingDelivery(changedRecord, renderWritingReceipt(changedRecord, job({ rules: [
      { id: "limit", kind: "word-limit", directive: "Under 60 words", minimum: 1, maximum: 59 },
      { id: "warmth", kind: "semantic", directive: "Decline warmly" },
    ] }))));
    assert.equal((await runtimeMain(deliveryArgs, options)).status, "failed", "Delivery prose must be the checked draft");
    writeFileSync(join(out, "result.json"), JSON.stringify(result));
    writeFileSync(join(out, "delivery.md"), delivery);
    const retained = JSON.parse(readFileSync(join(out, "result.json")));
    assert.equal(retained.attempts[0].mechanical.checks[1].status, "not-evaluated");
    writeFileSync(join(out, "draft.md"), result.draft + " ");
    assert.equal((await runtimeMain(args, options)).status, "failed");
    writeFileSync(join(out, "draft.md"), result.draft);
    writeFileSync(join(out, "result.json"), JSON.stringify({ ...result, status: "incomplete" }));
    assert.equal((await runtimeMain(args, options)).result_status, "incomplete");
  });
}

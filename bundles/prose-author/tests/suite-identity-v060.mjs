import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { identityDirectory, readIdentities, registerIdentity, selectIdentity, resolveIdentity, publishIdentityProfile, resolveWritingIdentity, identityMain } from "../skills/prose-draft/tools/identity-store.mjs";
import { initPreferenceStore, readPreferenceStore, applyPreferenceStore } from "../skills/prose-draft/tools/preference-store.mjs";
import { proposePreferencesV2, emptyScope } from "../skills/prose-draft/tools/preferences-v2.mjs";
import { assembleProfileV3, sha256 } from "../skills/prose-draft/tools/profile-v3.mjs";
import { runtimeMain, loadWritingJob } from "../skills/prose-draft/tools/prose-runtime.mjs";
import { readHistory } from "../skills/prose-draft/tools/history-store.mjs";
import { historyMain } from "../skills/prose-draft/tools/history-cli.mjs";

export async function run(t, { tmp, HERE }) {
  t.group("v0.6 shared writing identities");
  const test = async (name, fn) => { try { await fn(); t.check(name, true); } catch (e) { t.check(name, false, e.stack); } };
  const root = join(tmp, "identities-v060"), prefs = join(tmp, "identity-prefs"), corpus = join(tmp, "identity-corpus"), history = join(tmp, "identity-history");
  mkdirSync(join(corpus, "corpus", "human"), { recursive: true });
  const profileFile = join(tmp, "identity-profile.json");
  writeFileSync(profileFile, JSON.stringify(assembleProfileV3({ id: "writer", samples: [] })));
  initPreferenceStore(prefs, "writer");
  const entry = { id: "writer", samples_dir: corpus, profile_file: profileFile, preference_store: prefs, history_directory: history };
  const scoped = { writing_identity: "writer", identity_registry: root };
  const jobFile = join(tmp, "identity-job.json");
  const writeJob = (data) => { writeFileSync(jobFile, JSON.stringify(data)); return loadWritingJob(jobFile); };
  await test("registry is absent until explicitly configured and default path is harness neutral", () => {
    assert.equal(identityDirectory({}, tmp), join(tmp, ".config/prose-author/identities"));
    assert.throws(() => identityDirectory({ PROSE_IDENTITY_DIR: "relative" }, tmp), /absolute/);
    assert.equal(readIdentities(root).revision, 0); assert.equal(existsSync(root), false);
  });
  await test("registration preserves separate corpus, preferences and metrics without enabling history", () => {
    const state = registerIdentity(root, entry, 0);
    assert.equal(state.revision, 1); assert.equal(state.default_identity, null);
    assert.equal(existsSync(history), false); assert.equal(readPreferenceStore(prefs).revision, 1);
    assert.throws(() => resolveIdentity(root), /No default/);
    selectIdentity(root, "writer", 1);
    assert.equal(resolveIdentity(root).id, "writer");
  });
  await test("unknown identities, fields and incompatible versions refuse instead of falling back", () => {
    assert.throws(() => resolveIdentity(root, "someone-else"), /Unknown/);
    assert.throws(() => registerIdentity(root, { ...entry, sample_dir: corpus }, 2), /Unknown/);
    assert.throws(() => registerIdentity(root, { ...entry, samples_dir: "relative" }, 2), /absolute/);
    const bad = join(tmp, "old-profile.json"); writeFileSync(bad, '{"schema":"voice-profile/1"}');
    assert.throws(() => registerIdentity(root, { ...entry, profile_file: bad }, 2), /voice-profile\/3/);
    assert.equal(readIdentities(root).revision, 2);
  });
  await test("registry mutations reject stale clients and preserve lock ownership", () => {
    assert.throws(() => selectIdentity(root, null, 1), /Stale/);
    const lock = join(root, ".writer.lock"); writeFileSync(lock, "other writer");
    assert.throws(() => selectIdentity(root, null, 2), /writer/);
    assert.equal(readFileSync(lock, "utf8"), "other writer"); unlinkSync(lock);
    assert.equal(readIdentities(root).revision, 2);
  });
  await test("future registry schemas and changed revision bytes cannot be interpreted as current", () => {
    const broken = join(tmp, "future-registry"); mkdirSync(join(broken, "revisions"), { recursive: true });
    const bytes = JSON.stringify({ ...readIdentities(root), schema: "voice-identity-registry/999" });
    const file = `2-${sha256(bytes)}.json`;
    writeFileSync(join(broken, "current.json"), JSON.stringify({ file })); writeFileSync(join(broken, "revisions", file), bytes);
    assert.throws(() => readIdentities(broken), /Unsupported identity registry/);
    writeFileSync(join(broken, "revisions", file), JSON.stringify(readIdentities(root)));
    assert.throws(() => readIdentities(broken), /digest mismatch/);
  });
  await test("automatic defaults resolve only when no task-specific author inputs were supplied", () => {
    const old = process.env.PROSE_IDENTITY_DIR; process.env.PROSE_IDENTITY_DIR = root;
    try {
      const resolved = writeJob({ brief: "Reply", telemetry: null });
      assert.equal(resolved.identity_resolution.id, "writer"); assert.equal(resolved.profile.schema, "voice-profile/3");
      assert.equal(resolved.preferences.id, "writer"); assert.deepEqual(resolved.samples, []);
      assert.equal(writeJob({ writing_identity: null }).identity_resolution, undefined);
      for (const key of ["profile", "samples", "preferences", "profile_file", "samples_dir", "preference_store"]) {
        const oneOff = { [key]: "not opened by resolver" };
        assert.equal(resolveWritingIdentity(oneOff), oneOff);
      }
    } finally { if (old === undefined) delete process.env.PROSE_IDENTITY_DIR; else process.env.PROSE_IDENTITY_DIR = old; }
  });
  await test("explicit task evidence is not half-filled from the shared profile/corpus pair", () => {
    const job = resolveWritingIdentity({ ...scoped, samples: [], telemetry: null });
    assert.equal(job.profile, undefined); assert.equal(job.samples_dir, undefined);
    assert.equal(job.preference_store, prefs); assert.equal(job.telemetry, null);
    assert.equal(resolveWritingIdentity({ ...scoped, profile_policy: "none" }).profile, undefined);
  });
  await test("unavailable registered corpus and altered pinned profile fail before dispatch", () => {
    const current = readFileSync(profileFile, "utf8");
    writeFileSync(profileFile, current + "\n");
    assert.throws(() => resolveWritingIdentity(scoped), /Pinned profile changed/);
    writeFileSync(profileFile, current);
    registerIdentity(root, { ...entry, samples_dir: join(tmp, "missing-corpus") }, 2);
    assert.throws(() => resolveWritingIdentity(scoped), /corpus is unavailable/);
    registerIdentity(root, entry, 3);
  });
  await test("profile publication is immutable and leaves independent preferences and history untouched", () => {
    const before = readFileSync(join(prefs, "current.json"), "utf8");
    publishIdentityProfile(root, "writer", profileFile, 4);
    const pinned = resolveIdentity(root); assert.notEqual(pinned.profile_file, profileFile);
    assert.equal(readFileSync(pinned.profile_file, "utf8"), readFileSync(profileFile, "utf8"));
    assert.equal(readFileSync(join(prefs, "current.json"), "utf8"), before); assert.equal(existsSync(history), false);
    assert.throws(() => publishIdentityProfile(root, "writer", profileFile, 4), /Stale/);
  });
  await test("history routing binds the selected identity without enabling collection", async () => {
    const loaded = writeJob(scoped);
    assert.equal(loaded.telemetry.identity, "writer"); assert.equal(loaded.telemetry.directory, history);
    assert.equal(existsSync(history), false);
    assert.throws(() => resolveWritingIdentity({ ...scoped, telemetry: { identity: "other" } }), /conflicts/);
    const located = await historyMain(["locate", "--registry", root, "--writing-identity", "writer"]);
    assert.equal(located.directory, history); assert.equal(located.default_enabled, false);
    assert.throws(() => identityMain(["select", "--identity", "writer", "--revision", "5", "--registr", root]), /Unknown/);
    assert.equal(readIdentities(root).revision, 5);
  });
  await test("two installed runtime copies read one registry and shared preference revision", async () => {
    const install = join(tmp, "other-install");
    cpSync(join(HERE, "../skills/prose-draft"), install, { recursive: true });
    const cli = join(install, "tools/prose-runtime.mjs");
    const decision = { id: "dash", feature: "dash", binding: null, scope: { ...emptyScope(), forms: ["reply"] },
      rule: { id: "dash", kind: "punctuation", directive: "Never use em dashes in replies", characters: "—", minimum: 0, maximum: 0 } };
    applyPreferenceStore(prefs, proposePreferencesV2(readPreferenceStore(prefs), { feedback: "Never use em dashes in replies", operations: [{ id: "save", kind: "upsert", decision }] }));
    const result = JSON.parse(execFileSync(process.execPath, [cli, "preferences", "show", "--registry", root, "--writing-identity", "writer"], { encoding: "utf8" }));
    assert.equal(result.id, "writer");
    assert.equal(result.revision, 2); assert.equal(result.decisions[0].id, "dash");
    const shown = await runtimeMain(["preferences", "show", "--registry", root, "--writing-identity", "writer"], { stdout: () => {} });
    assert.deepEqual(result, shown);
    execFileSync(process.execPath, [cli, "preferences", "undo", "--registry", root, "--writing-identity", "writer"]);
    assert.equal(readPreferenceStore(prefs).decisions.length, 0); assert.equal(readPreferenceStore(prefs).revision, 3);
    const configured = join(tmp, "history-consent.json"); writeFileSync(configured, JSON.stringify({ project: "notes", enabled: true, rhetoric: false }));
    execFileSync(process.execPath, [cli, "history", "configure", "--registry", root, "--writing-identity", "writer", "--config", configured]);
    assert.equal(readHistory(history, "writer").scopes[0].enabled, true);
  });
  await test("final-byte verification uses frozen inputs even after a default identity change", async () => {
    const out = join(tmp, "identity-run");
    const data = { schema: "prose-writing-job/1", mode: "draft", brief: "Say thank you.", context: { form: "reply", purpose: "thank" }, adapter: { harness: "codex" },
      ...scoped, profile_policy: "none", telemetry: null, rules: [{ id: "short", kind: "word-limit", directive: "Under ten words", minimum: 1, maximum: 9 }] };
    writeFileSync(jobFile, JSON.stringify(data));
    const dispatch = async ({ schema, input }) => ({ status: "passed", dispatched: true, model: "fixture", elapsed_ms: 0, value: schema.properties.schema.const === "voice-draft-source/5"
      ? { schema: "voice-draft-source/5", kind: "draft", draft: "Thank you.", omitted: [], claims: [], refused: "" }
      : { schema: "prose-runtime-review/1", verdict: "clear", findings: [], instructions: (input.instruction_ids ?? []).map((id) => ({ id, status: "applied", reason: "Fixture" })), atom_accounting: [], disclosures: [] } });
    const result = await runtimeMain(["run", "--job", jobFile, "--out", out], { dispatch, stdout: () => {}, stderr: () => {} });
    assert.equal(result.status, "checked", result.reason);
    const old = process.env.PROSE_IDENTITY_DIR; process.env.PROSE_IDENTITY_DIR = root;
    try {
      selectIdentity(root, null, 5);
      const checked = await runtimeMain(["check-result", "--result", join(out, "result.json"), "--draft", join(out, "draft.md"), "--job", join(out, "resolved-job.json"), "--delivery", join(out, "delivery.md")], { stdout: () => {} });
      assert.equal(checked.status, "passed");
      assert.match(readFileSync(join(out, "receipt.md"), "utf8"), /Writing identity: writer; registry revision 5/);
      writeFileSync(join(out, "draft.md"), "A changed draft.");
      const changed = await runtimeMain(["check-result", "--result", join(out, "result.json"), "--draft", join(out, "draft.md"), "--job", join(out, "resolved-job.json")], { stdout: () => {} });
      assert.equal(changed.status, "failed");
    } finally { if (old === undefined) delete process.env.PROSE_IDENTITY_DIR; else process.env.PROSE_IDENTITY_DIR = old; }
  });
}

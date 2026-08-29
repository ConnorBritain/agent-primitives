/** Acceptance harness integrity — the scorer may not grade its own handwritten tally. */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

import {
  ARTIFACT_PATH_KEYS, artifactEntryHashErrors, artifactHashErrors, claimAuditPrompt, claimsAuditFailures,
  CODEX_NO_TOOLS_CONFIG, codexToolEvents,
  codexCompanionArtifactFields, codexRecordErrors, committedManifestError, completedResult,
  criticPrompt, deriveCritic, draftPrompt,
  dispatchCodex,
  factualCandidateReasons, HARNESS_CAPABILITIES, invocationInput,
  immutableFirstAddAnchor, legacyRepairArtifactErrors, localModuleClosure, lockedImplementationErrors,
  manifestDispatch, modelAdapterName, prepareConfig, profileRenderPrompt,
  quotationAudit, resolveDraftChain, retiredRepairEvidenceErrors, sentenceReviewTemplate, stagePrompt,
  strictlyCommittedAfter, schemaInvocation, validateCases,
} from "./acceptance-runner.mjs";
import { measureProfile, PROFILE_MEASUREMENT_RULES } from "./profile-measurements.mjs";
import {
  assembleVoiceCritic, CRITIC_SOURCE_SCHEMA, validateVoiceCriticSource,
} from "./voice-critic-source.mjs";
import { sentenceRefs } from "../skills/prose-draft/tools/draft-claim-audit.mjs";

const clone = (value) => JSON.parse(JSON.stringify(value));
const humanAttestation = () => ({
  reviewer: "Release reviewer",
  completed_at: "2026-08-29T06:00:00Z",
  statement: "I personally reviewed every immutable sentence and recorded every unsupported descriptive premise as requires-change or listed-for-verification before any critic call.",
});

export async function run(t, { HERE }) {
  const runDir = join(HERE, "runs", "2026-08-27-v020-acceptance");
  const cases = JSON.parse(readFileSync(join(runDir, "CASES.json"), "utf8"));
  const source = readFileSync(join(HERE, "acceptance-runner.mjs"), "utf8");
  const canarySource = readFileSync(join(HERE, "request-support-canary.mjs"), "utf8");

  t.group("v0.2 acceptance harness — the locked design is executable");
  t.check("request-support canaries persist harness failures before refusing a redraw",
    /`\$\{id\}\.failure\.json`[\s\S]*prompt_sha256[\s\S]*schema_sha256/.test(canarySource));
  t.check("request-support canaries read the structured leakage result rather than an array length",
    /no_corpus_leakage: leakage\.count === 0/.test(canarySource));
  t.check("the committed twenty-case design validates", validateCases(cases).length === 0);
  {
    const missing = clone(cases);
    missing.cases.pop();
    t.check("an omitted draft case invalidates the run", validateCases(missing).some((e) => /twenty/.test(e)));
  }
  {
    const duplicate = clone(cases);
    duplicate.cases[1].id = duplicate.cases[0].id;
    t.check("duplicate draft ids invalidate the run", validateCases(duplicate).some((e) => /duplicate/.test(e)));
  }
  {
    const selected = clone(cases);
    selected.cases[2].render = 1;
    t.check("selecting a favourable render violates round robin", validateCases(selected).some((e) => /round robin/.test(e)));
  }
  {
    const shapes = clone(cases);
    shapes.cases[0].shape = "reply";
    t.check("changing the preregistered 4/3/3 shape mix invalidates the run",
      validateCases(shapes).some((e) => /four essays/.test(e)));
  }

  t.group("v0.2 acceptance harness — dispatch boundaries");
  {
    const measurements = measureProfile(join(HERE, "fixtures", "profiles", "eff-mullin"));
    const prompt = profileRenderPrompt("fixture", [{ file: "sample.txt", body: "Sample body." }], measurements);
    t.check("profile prompts inline their staged inputs", /Input file: sample\.txt/.test(prompt) && /Sample body\./.test(prompt));
    t.check("profile prompts end on the provider-neutral semantic source contract",
      /emit voice-profile-source\/3[\s\S]*deterministic measured slot[\s\S]*supporting[\s\S]*qualitative dimensions[\s\S]*unresolved reason/.test(prompt));
    t.check("profile prompts assign all duplicate bookkeeping to deterministic code",
      /Do not copy counts, rates, support[\s\S]*observation IDs, coverage statuses, or final profile fields[\s\S]*deterministic assembler owns/.test(prompt));
    t.check("profile prompts require refusal instead of invented evidence",
      /Complete the renderer's refusal checks[\s\S]*state the refusal[\s\S]*rather than inventing evidence/.test(prompt));
    t.check("profile prompts state which sparse measurements can and cannot form an absence pair",
      /first-person-singular-family is a sparse counterpart and will be an absence with measured replacement first-person-plural-family/.test(prompt)
        && /profanity-vulgarity has no measured positive replacement; do not emit it as an absence/.test(prompt));
    t.check("profile prompts leave measured frequency bands to deterministic assembly",
      /qualitative frequencies/.test(prompt)
        && /not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency/.test(prompt));
    t.check("profile prompts pin every measured ID to a unique semantic slot",
      /first-person-singular-family -> self-reference-biography; section absences; counted absence/.test(prompt)
        && /Required unresolved dimensions: profanity-vulgarity/.test(prompt));
    t.check("profile dispatch can request native structure without making assembly depend on it",
      source.includes('manifest, "profile", sourceRenderSchema(manifest.corpora[profile.id].measurements)')
        && source.includes("run: () => dispatchModel({")
        && source.includes('"--json-schema"')
        && source.includes("assembleVoiceProfile(source"));
  }
  {
    const prompt = draftPrompt({ prompt: "Write X." }, "Profile prose", { schema: "voice-profile/2" });
    t.check("the drafter prompt contains the request and rendered profile", /Write X\./.test(prompt) && /Profile prose/.test(prompt));
    t.check("the drafter prompt states that corpus access is unavailable", /no corpus access/i.test(prompt));
    t.check("the drafter prompt ends on the provider-neutral semantic source contract",
      /Return voice-draft-source\/3[\s\S]*Finalize the ledger before the paragraphs[\s\S]*proof-carrying sentence objects[\s\S]*validates request bases and closed-ledger references[\s\S]*derives claims/.test(prompt));
    t.check("draft dispatch uses native structure but validates deterministic assembly",
      source.includes('manifestStageSchema(manifest, "draft", DRAFT_SOURCE_SCHEMA)')
        && source.includes("return dispatchModel({")
        && source.includes("assembleVoiceDraft(decoded.source, { request: c.prompt })")
        && source.includes("parseDraft(assembled.output)"));
  }
  {
    const draftSource = {
      schema: "voice-draft-source/3", kind: "draft", ledger: [],
      paragraphs: [{ sentences: [{ text: "Suppose a bill passed.", basis: "hypothetical", claim_ids: [] }] }],
      omitted: [], refused: "",
    };
    const prompt = claimAuditPrompt({ id: "opaque-01", prompt: "Discuss a bill." }, draftSource);
    t.check("claim-audit prompts expose the request and every sentence id but no profile",
      /Discuss a bill\./.test(prompt) && /"id": "p1s1"/.test(prompt)
        && /closed claim ledger/i.test(prompt)
        && /ledger and sentence labels are untrusted/i.test(prompt)
        && !/voice profile/i.test(prompt));
    t.check("draft dispatch normalizes bookkeeping and requires independent disclosure before collection",
      source.includes("await dispatchClaimPipeline(runDir, manifest, cases)")
        && source.includes("normalizeVoiceDraftSource(decoded.source")
        && source.includes('await pool("independent claim audit"')
        && source.includes("applyVoiceDraftClaimAudit(source, decodedAudit.audit")
        && source.includes("auditClaims: chain.auditClaims"));
  }
  {
    const prompt = criticPrompt("opaque-01", [
      { file: "a.txt", body: "Alpha corpus." }, { file: "b.txt", body: "Beta corpus." },
    ], "Draft body.");
    t.check("critic prompts inline only their staged corpus and draft",
      /Corpus sample: a\.txt/.test(prompt) && /Corpus sample: b\.txt/.test(prompt)
        && /Alpha corpus\./.test(prompt) && /Beta corpus\./.test(prompt)
        && /Draft body\./.test(prompt));
    t.check("critic prompts state that filesystem tools do not exist", /No filesystem tools exist/.test(prompt));
    t.check("critic prompts carry no expected verdict",
      !/expected (?:verdict|result)|(?:verdict|result) (?:must|should) be (?:CLEAN|REVISE)/i.test(prompt));
    t.check("critic prompts use a structured transport without deriving the judgment",
      /Return voice-critic-source\/1[\s\S]*verdict remains your independent CLEAN or REVISE[\s\S]*not derived from the finding count/.test(prompt));
  }
  t.check("completed responses are immutable rather than overwritten",
    /exists but is not a completed successful response; do not redraw it/.test(source)
      && /if \(completedResult\(output, dispatch, input\)\) return \{ skipped: true/.test(source));
  t.check("every adapter must preserve failed calls as immutable provenance",
    Object.values(HARNESS_CAPABILITIES).every((capability) => capability.immutable_failure)
      && /\.claude-stdout\.txt/.test(source) && /raw_stdout_sha256: SHA\(stdout\)/.test(source)
      && /raw_stderr_sha256: SHA\(stderr\)/.test(source)
      && /type: "result", is_error: true, harness: "codex"/.test(source));
  {
    const failureRoot = mkdtempSync(join(tmpdir(), "prose-author-codex-spawn-failure-"));
    const originalPath = process.env.PATH;
    try {
      const system = join(failureRoot, "system.md");
      const schemaPath = join(failureRoot, "schema.json");
      const output = join(failureRoot, "result.json");
      writeFileSync(system, "Return an object.\n");
      writeFileSync(schemaPath, '{"type":"object","additionalProperties":false}\n');
      const dispatch = {
        stage: "draft", harness: "codex", model: "unavailable-model", effort: "low",
        transport: "native-structured", timeout_ms: 1000, concurrency: 1,
        manifest_sha256: "0".repeat(64),
      };
      process.env.PATH = join(failureRoot, "missing-bin");
      let firstError = "";
      let secondError = "";
      try {
        await dispatchCodex({
          system, prompt: "Return {}.", output, schemaPath, noToolsConfig: [], dispatch,
        });
      } catch (error) { firstError = error.message; }
      const failure = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : null;
      try {
        await dispatchCodex({
          system, prompt: "Return {}.", output, schemaPath, noToolsConfig: [], dispatch,
        });
      } catch (error) { secondError = error.message; }
      t.check("a Codex spawn error is persisted before rejection and forbids a redraw",
        /spawn codex ENOENT/.test(firstError)
          && failure?.type === "result" && failure?.is_error === true
          && /spawn codex ENOENT/.test(failure?.error ?? "")
          && /do not redraw/.test(secondError));
    } finally {
      process.env.PATH = originalPath;
      rmSync(failureRoot, { recursive: true, force: true });
    }
  }
  t.check("acceptance requires source JSON to parse without transport repair",
    /source required \$\{decoded\.repairs\} transport quote repair/.test(source));
  t.check("a locked native transport cannot silently fall back to fenced text",
    /did not honor its locked native-structured transport/.test(source)
      && /returned native structure under its locked json-fence transport/.test(source));
  t.check("acceptance rejects any measured frequency that diverges from its deterministic band",
    /checkFrequencyAgainstRate/.test(source) && /measured frequency diverges/.test(source));
  t.check("acceptance records k=3 mechanical stability and exposes qualitative variation",
    /analyzeProfileStability/.test(source)
      && /k=3 mechanical stability failed/.test(source)
      && /profile_stability/.test(source));
  t.check("prepare requires the locked implementation and design to be committed",
    /must be committed before prepare/.test(source));
  t.check("clean-context calls exclude user plugins, MCP servers, settings, and Chrome",
    ["--disable-slash-commands", "--strict-mcp-config", "--setting-sources", "--no-chrome"]
      .every((flag) => source.includes(`\"${flag}\"`)));
  t.check("Codex is the default for every stage while each stage remains independently selectable",
    Object.values(prepareConfig({}).stages).every((stage) => stage.harness === "codex"
      && stage.model === "gpt-5.6-luna")
      && prepareConfig({ ACCEPTANCE_CRITIC_HARNESS: "claude", ACCEPTANCE_MODEL: "sonnet" })
        .stages.critic.harness === "claude-code"
      && /Object\.fromEntries\(STAGES\.map\(\(stage\)/.test(source));
  t.check("adapter selection is stage-neutral and rejects undeclared harnesses",
    (() => {
      try {
        return ["profile", "draft", "claim_audit", "critic"].every((stage) =>
          modelAdapterName({ stage, harness: "codex" }) === "codex"
            && modelAdapterName({ stage, harness: "claude-code" }) === "claude-code");
      } catch { return false; }
    })()
      && (() => {
        try { modelAdapterName({ stage: "profile", harness: "unknown" }); return false; }
        catch (error) { return /no adapter/.test(error.message); }
      })());
  t.check("schema provenance follows the selected adapter for every stage",
    ["profile", "draft", "claim_audit", "critic"].every((stage) => {
      const pinned = { schema: { type: "object" }, path: `/locked/${stage}.json` };
      const codex = schemaInvocation({ stage, harness: "codex", transport: "native-structured" }, pinned);
      const claude = schemaInvocation({ stage, harness: "claude-code", transport: "native-structured" }, pinned);
      return codex.schemaPath === pinned.path && !("schema" in codex)
        && claude.schema === pinned.schema && !("schemaPath" in claude);
    }) && schemaInvocation(
      { stage: "critic", harness: "claude-code", transport: "json-fence" },
      { schema: { type: "object" }, path: "/locked/critic.json" },
    ).schema === null);
  t.check("manifest validation refuses adapters without the full gated capability set",
    Object.values(HARNESS_CAPABILITIES).every((capability) =>
      capability.clean_context && capability.no_tools && capability.immutable_failure)
      && /if \(!capabilities\.clean_context \|\| !capabilities\.no_tools \|\| !capabilities\.immutable_failure\)/.test(source)
      && /lacks required acceptance capabilities/.test(source));
  t.check("Codex calls disable every local, network, connector, and collaboration tool class",
    ["features.shell_tool=false", "features.unified_exec=false", "features.apps=false",
      "features.browser_use=false", "features.computer_use=false", "features.multi_agent=false",
      "agents.enabled=false", "features.plugins=false", "features.hooks=false",
      "features.skill_search=false", "features.workspace_dependencies=false",
      "tools.view_image=false", "tools.web_search=false", 'web_search="disabled"']
      .every((setting) => CODEX_NO_TOOLS_CONFIG.includes(setting)));
  t.check("Codex runs outside the repository with user config and rules ignored",
    /mkdtempSync\(join\(tmpdir\(\), `prose-author-codex-\$\{dispatch\.stage\}-`\)\)/.test(source)
      && /"--ignore-user-config", "--ignore-rules"/.test(source)
      && /"-C", isolationDir, "-s", "read-only"/.test(source));
  t.check("Codex event auditing fails closed on any non-language-model item",
    codexToolEvents([
      { item: { type: "agent_message" } }, { item: { type: "reasoning" } },
    ]).length === 0
      && codexToolEvents([{ item: { type: "command_execution" } }]).length === 1
      && codexToolEvents([{ item: { type: "mcp_tool_call" } }]).length === 1
      && /codex no-tools boundary rejected item types/.test(source));
  {
    const companionPath = "bundles/prose-author/tests/acceptance-runner.mjs";
    const fields = codexCompanionArtifactFields({
      raw_events: companionPath, raw_output: companionPath, recovered_from: companionPath,
    });
    t.check("Codex raw events, final output, schema, and deny-list are pinned as evidence",
      ["raw_events", "raw_output", "recovered_from"].every((key) =>
        fields[key] === companionPath && /^[a-f0-9]{64}$/.test(fields[`${key}_sha256`]))
        && /codex_no_tools_config/.test(source) && /locked Codex stage schema is invalid/.test(source));
  }
  t.check("every Codex-routable stage hash-binds its raw companion evidence",
    ["raw_events", "raw_output", "recovered_from"].every((key) =>
      ARTIFACT_PATH_KEYS.profile.includes(key) && ARTIFACT_PATH_KEYS.critic.includes(key))
      && ["initial_audit_raw_events", "initial_audit_raw_output", "initial_audit_recovered_from",
        "audit_raw_events", "audit_raw_output", "audit_recovered_from"]
        .every((key) => ARTIFACT_PATH_KEYS.draft.includes(key))
      && (source.match(/\.\.\.codexCompanionArtifactFields\(record\),/g) ?? []).length === 4
      && /codexCompanionArtifactFields\(auditRecord, "audit_"\)/.test(source));
  t.check("final provenance makes every model record immutable and orders all critic companions after human review",
    /const evidencePaths = \[resolve\(item\.path\), \.\.\.codexCompanionEvidencePaths\(record\)\]/.test(source)
      && /for \(const evidencePath of evidencePaths\)/.test(source)
      && /strictlyCommittedAfter\(evidencePath, item\.prerequisiteCommit\)/.test(source)
      && /immutableFirstAddAnchor\(evidencePath\)/.test(source));
  t.check("Codex output-last-message loss is recovered from the immutable event without a redraw",
    /The JSONL agent_message is the primary raw response/.test(source)
      && /final output file diverges from its immutable event stream/.test(source)
      && /recovered_from/.test(source)
      && /preserveFailure: true/.test(source));
  t.check("the model effort is pinned in the manifest rather than inherited",
    /\.\.\.config\.stages\[stage\], timeout_ms: config\.timeoutMs/.test(source)
      && /"--effort", dispatch\.effort/.test(source));
  t.check("acceptance defaults to one model process and native structured profile transport",
    prepareConfig({}).concurrency === 1
      && prepareConfig({}).stages.profile.transport === "native-structured"
      && /profileSchemaEntries/.test(source));
  t.check("acceptance defaults to native structured draft transport and records it in the manifest",
    prepareConfig({}).stages.draft.transport === "native-structured"
      && /Object\.fromEntries\(STAGES\.map/.test(source));
  t.check("acceptance defaults to a native independent claim-audit transport",
    prepareConfig({}).stages.claim_audit.transport === "native-structured"
      && source.includes("claim_pipeline: CLAIM_PIPELINE")
      && source.includes("voice-draft-claim-audit-3.json")
      && source.includes("schema: auditSchema, schemaPath: auditSchemaPath"));
  t.check("the current manifest exposes no model repair or reaudit stage",
    !source.includes("claimRepairEffort")
      && !source.includes("claimRepairNative")
      && !source.includes('manifestDispatch(manifest, "claim_repair")')
      && !source.includes('manifestDispatch(manifest, "claim_reaudit")'));
  t.check("acceptance defaults to native structured critic transport and validates assembly",
    prepareConfig({}).stages.critic.transport === "native-structured"
      && source.includes('manifestStageSchema(manifest, "critic", CRITIC_SOURCE_SCHEMA)')
      && source.includes("schema: criticSchema.schema, schemaPath: criticSchema.path")
      && source.includes("assembleVoiceCritic(decoded.source"));
  t.check("critic dispatch is blocked until the independent claims audit is complete",
    /const claimsAudit = json\(p\.audit\);[\s\S]*const auditFailures = claimsAuditFailures\(\s*claimsAudit, cases, artifacts, runDir[\s\S]*no critic calls were made/.test(source)
      && /immutableFirstAddAnchor\(p\.audit\)/.test(source));
  t.check("the human completeness gate treats only the request as supplied factual evidence",
    source.includes("the profile is voice evidence, never a factual packet")
      && !source.includes("supplied by the request/profile"));

  {
    const chainRoot = mkdtempSync(join(tmpdir(), "prose-author-claim-chain-"));
    try {
      const stage = (harness = "claude-code") => ({
        harness, model: "locked", effort: "low", transport: "native-structured", timeout_ms: 100,
      });
      const manifest = {
        concurrency: 1,
        claim_pipeline: "audit-disclosure/1",
        dispatch: {
          draft: stage(), claim_audit: stage(),
        },
      };
      const request = "A maker can disable features after sale.";
      const c = { id: "chain01", prompt: request };
      const original = {
        schema: "voice-draft-source/3", kind: "draft", ledger: [{
          id: "c1", basis: "request-supported", claim: request,
          request_basis: "maker can disable features after sale",
        }],
        paragraphs: [{ sentences: [
          { text: request, basis: "request-supported", claim_ids: ["c1"] },
          { text: "Many buyers never notice.", basis: "reasoning", claim_ids: [] },
          { text: "Ownership should mean control.", basis: "normative", claim_ids: [] },
          { text: "A buyer could reasonably object.", basis: "hypothetical", claim_ids: [] },
          { text: "The distinction matters.", basis: "reasoning", claim_ids: [] },
        ] }],
        omitted: [], refused: "",
      };
      const initialAudit = {
        schema: "voice-draft-claim-audit/2", sentences: [
          { id: "p1s1", status: "keep", reason: "The request supplies the complete assertion." },
          { id: "p1s2", status: "reject", reason: "Unledgered population claim." },
          { id: "p1s3", status: "keep", reason: "This is a normative conclusion." },
          { id: "p1s4", status: "keep", reason: "This is explicitly hypothetical." },
          { id: "p1s5", status: "keep", reason: "This is a nonfactual conclusion." },
        ],
      };
      const put = (folder, id, payload, stageName) => {
        const path = join(chainRoot, "raw", folder, `${id}.json`);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, `${JSON.stringify({
          type: "result", is_error: false, result: JSON.stringify(payload), structured_output: payload,
          acceptance_dispatch: manifestDispatch(manifest, stageName),
        })}\n`);
      };
      const currentOriginal = {
        ...original,
        ledger: [...original.ledger, {
          id: "c2", basis: "external-verification", claim: "Unused claim.", request_basis: "",
        }],
      };
      const currentAudit = {
        schema: "voice-draft-claim-audit/3",
        sentences: sentenceRefs(original).map((ref, index) => index === 1 ? {
          id: ref.id, status: "disclose", reason: "Unledgered population claim.",
          claims: [{
            claim: "Many buyers do not notice the condition.",
            evidence: "Many buyers never notice",
            kind: "broad-generalization",
            verification_question: "What evidence establishes how many buyers notice?",
          }],
        } : {
          id: ref.id, status: "keep", reason: "No unsupported descriptive premise.", claims: [],
        }),
      };
      put("drafts", c.id, currentOriginal, "draft");
      put("claim-audits", c.id, currentAudit, "claim_audit");
      let disclosed = null;
      try { disclosed = resolveDraftChain(chainRoot, manifest, c); } catch {}
      t.check("current checking prunes an unused ledger suffix and preserves an audit-owned claim overlay",
        disclosed?.normalized && !disclosed.repaired
          && disclosed.removedLedgerIds.join(",") === "c2"
          && disclosed.finalSource.ledger.length === 1
          && disclosed.finalSource.paragraphs === disclosed.normalizedSource.paragraphs
          && disclosed.auditClaims.length === 1
          && disclosed.auditClaims[0].sentence_id === "p1s2");
      put("claim-audits", c.id, initialAudit, "claim_audit");
      let downgradeRejected = false;
      try { resolveDraftChain(chainRoot, manifest, c); } catch (error) {
        downgradeRejected = /audit-disclosure\/1 requires voice-draft-claim-audit\/3/.test(error.message);
      }
      t.check("a model-authored audit schema cannot downgrade the prepared current claim pipeline",
        downgradeRejected);
      put("claim-audits", c.id, currentAudit, "claim_audit");
      const staleRepairPath = join(chainRoot, "raw", "claim-repairs", `${c.id}.json`);
      mkdirSync(dirname(staleRepairPath), { recursive: true });
      writeFileSync(staleRepairPath, "{}\n");
      let staleRejected = false;
      try { resolveDraftChain(chainRoot, manifest, c); } catch (error) {
        staleRejected = /stale model-repair evidence/.test(error.message);
      }
      t.check("current checking rejects stale model-repair evidence without exposing a repair stage",
        staleRejected);
      rmSync(staleRepairPath);
      const orphanRepairPath = join(chainRoot, "raw", "claim-repairs", "orphan.json");
      writeFileSync(orphanRepairPath, "{}\n");
      t.check("current checking rejects an orphan repair result regardless of case naming",
        retiredRepairEvidenceErrors(chainRoot).some((error) => error.includes("raw/claim-repairs/orphan.json")));
      rmSync(orphanRepairPath);
      const companionPath = join(chainRoot, "raw", "claim-repairs", "probe.codex-events.jsonl");
      writeFileSync(companionPath, "{}\n");
      t.check("current checking rejects a retired Codex repair companion file",
        retiredRepairEvidenceErrors(chainRoot)
          .some((error) => error.includes("raw/claim-repairs/probe.codex-events.jsonl")));
      rmSync(companionPath);
      const orphanPromptPath = join(chainRoot, "prompts", "claim-repairs", "orphan.md");
      mkdirSync(dirname(orphanPromptPath), { recursive: true });
      writeFileSync(orphanPromptPath, "obsolete\n");
      t.check("current checking rejects an orphan repair prompt",
        retiredRepairEvidenceErrors(chainRoot).some((error) => error.includes("prompts/claim-repairs/orphan.md")));
      rmSync(orphanPromptPath);
      const repairedSourcePath = join(chainRoot, "inputs", "sources", "drafts", "orphan.repaired.json");
      mkdirSync(dirname(repairedSourcePath), { recursive: true });
      writeFileSync(repairedSourcePath, "{}\n");
      t.check("current checking rejects an orphan canonical repaired source",
        retiredRepairEvidenceErrors(chainRoot)
          .some((error) => error.includes("inputs/sources/drafts/orphan.repaired.json")));
    } finally {
      rmSync(chainRoot, { recursive: true, force: true });
    }
  }

  t.group("v0.2 acceptance harness — prepared configuration is the only dispatch authority");
  {
    const lockedManifest = { concurrency: 2, dispatch: { draft: {
      harness: "codex", model: "locked-model", effort: "high",
      transport: "native-structured", timeout_ms: 1234,
    } } };
    const config = manifestDispatch(lockedManifest, "draft");
    t.check("a prepared stage resolves all runtime choices from one locked manifest record",
      config.stage === "draft" && config.harness === "codex" && config.model === "locked-model"
        && config.effort === "high" && config.transport === "native-structured"
        && config.timeout_ms === 1234 && config.concurrency === 2
        && /^[a-f0-9]{64}$/.test(config.manifest_sha256));
    t.check("Codex cannot be resumed under an unlocked fence transport",
      (() => {
        try {
          manifestDispatch({ concurrency: 2, dispatch: { draft: {
            harness: "codex", model: "locked-model", effort: "high",
            transport: "json-fence", timeout_ms: 1234,
          } } }, "draft");
          return false;
        } catch { return true; }
      })());
    t.check("dispatch provenance fingerprints concurrency and the complete manifest",
      /manifest_sha256: manifestFingerprint\(manifest\)/.test(source)
        && /concurrency: manifest\.concurrency/.test(source));
    {
      const systemPath = join(HERE, "bar.mjs");
      const one = invocationInput(systemPath, "first", { schema: { type: "object" } });
      const two = invocationInput(systemPath, "second", { schema: { type: "object" } });
      const three = invocationInput(systemPath, "first", { schema: { type: "string" } });
      const four = invocationInput(systemPath, "first", {
        schema: { type: "object" },
        prerequisites: { claims_audit_sha256: "a".repeat(64), claims_audit_commit: "b".repeat(40) },
      });
      t.check("raw invocation provenance binds exact system, prompt, and schema bytes",
        /^[a-f0-9]{64}$/.test(one.system_sha256)
          && one.prompt_sha256 !== two.prompt_sha256
          && one.schema_sha256 !== three.schema_sha256
          && /completedResult\(item\.path, item\.dispatch, item\.input\)/.test(source));
      t.check("critic invocation provenance can bind an exact pre-dispatch human audit",
        four.prerequisites.claims_audit_sha256 === "a".repeat(64)
          && four.prerequisites.claims_audit_commit === "b".repeat(40)
          && /prerequisites: criticPrerequisites/.test(source));
    }
    {
      const promptRoot = mkdtempSync(join(tmpdir(), "prose-author-staged-prompt-"));
      try {
        const promptPath = join(promptRoot, "prompt.md");
        const dispatched = stagePrompt(promptPath, "exact prompt bytes");
        t.check("the exact staged prompt bytes are the bytes dispatched and fingerprinted",
          dispatched === readFileSync(promptPath, "utf8")
            && dispatched.endsWith("\n")
            && invocationInput(join(HERE, "bar.mjs"), dispatched).prompt_sha256
              === invocationInput(join(HERE, "bar.mjs"), readFileSync(promptPath, "utf8")).prompt_sha256);
      } finally {
        rmSync(promptRoot, { recursive: true, force: true });
      }
    }
    {
      const anchorRoot = mkdtempSync(join(tmpdir(), "prose-author-manifest-anchor-"));
      try {
        const anchorFile = join(anchorRoot, "MANIFEST.json");
        execFileSync("git", ["init", "-q"], { cwd: anchorRoot, stdio: "ignore" });
        writeFileSync(join(anchorRoot, "base.txt"), "base\n");
        execFileSync("git", ["add", "base.txt"], { cwd: anchorRoot, stdio: "ignore" });
        execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid",
          "commit", "-qm", "base"], { cwd: anchorRoot, stdio: "ignore" });
        const preparedCommit = execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: anchorRoot, encoding: "utf8",
        }).trim();
        const baseHash = createHash("sha256").update("base\n").digest("hex");
        const lockedManifest = { prepared_commit: preparedCommit, locked_files: { "base.txt": baseHash } };
        const cleanLock = lockedImplementationErrors(lockedManifest, anchorRoot).length === 0;
        writeFileSync(join(anchorRoot, "base.txt"), "transient mutation\n");
        const currentDrift = lockedImplementationErrors(lockedManifest, anchorRoot)
          .some((error) => /changed after prepare/.test(error));
        const transientHash = createHash("sha256").update("transient mutation\n").digest("hex");
        const parentDrift = lockedImplementationErrors({
          prepared_commit: preparedCommit, locked_files: { "base.txt": transientHash },
        }, anchorRoot).some((error) => /not anchored in prepared_commit/.test(error));
        writeFileSync(join(anchorRoot, "base.txt"), "base\n");
        t.check("locked implementation bytes are verified against current files and the prepared commit before dispatch",
          cleanLock && currentDrift && parentDrift
            && /const implementationErrors = lockedImplementationErrors\(manifest\)/.test(source)
            && /locked implementation failed pre-dispatch verification/.test(source));
        writeFileSync(anchorFile, "{}\n");
        execFileSync("git", ["add", "MANIFEST.json"], { cwd: anchorRoot, stdio: "ignore" });
        execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid",
          "commit", "-qm", "lock"], { cwd: anchorRoot, stdio: "ignore" });
        const committed = committedManifestError(anchorFile, preparedCommit, anchorRoot) === null;
        writeFileSync(anchorFile, "{\"changed\":true}\n");
        execFileSync("git", ["add", "MANIFEST.json"], { cwd: anchorRoot, stdio: "ignore" });
        execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid",
          "commit", "-qm", "mutate"], { cwd: anchorRoot, stdio: "ignore" });
        t.check("a prepared manifest must be committed unchanged before any stage resumes",
          committed && /differs from its immutable first-add version/.test(
            committedManifestError(anchorFile, preparedCommit, anchorRoot),
          )
            && /const anchorError = committedManifestError\(p\.manifest, manifest\.prepared_commit\)/.test(source)
            && /MANIFEST\.json must be committed unchanged before dispatch/.test(source));
      } finally {
        rmSync(anchorRoot, { recursive: true, force: true });
      }
    }
    {
      const anchorRoot = mkdtempSync(join(tmpdir(), "prose-author-critic-audit-anchor-"));
      try {
        execFileSync("git", ["init", "-q"], { cwd: anchorRoot, stdio: "ignore" });
        writeFileSync(join(anchorRoot, "base.txt"), "base\n");
        execFileSync("git", ["add", "base.txt"], { cwd: anchorRoot, stdio: "ignore" });
        execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid",
          "commit", "-qm", "base"], { cwd: anchorRoot, stdio: "ignore" });
        const auditPath = join(anchorRoot, "run", "CLAIMS-AUDIT.json");
        mkdirSync(dirname(auditPath), { recursive: true });
        writeFileSync(auditPath, "{\"complete\":true}\n");
        execFileSync("git", ["add", "run/CLAIMS-AUDIT.json"], { cwd: anchorRoot, stdio: "ignore" });
        execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid",
          "commit", "-qm", "anchor audit"], { cwd: anchorRoot, stdio: "ignore" });
        const auditAnchor = immutableFirstAddAnchor(auditPath, anchorRoot);
        const rawPath = join(anchorRoot, "run", "critics", "raw", "x-d1.json");
        mkdirSync(dirname(rawPath), { recursive: true });
        writeFileSync(rawPath, "{\"type\":\"result\"}\n");
        execFileSync("git", ["add", "run/critics/raw/x-d1.json"], { cwd: anchorRoot, stdio: "ignore" });
        execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid",
          "commit", "-qm", "record critic"], { cwd: anchorRoot, stdio: "ignore" });
        const ordered = strictlyCommittedAfter(rawPath, auditAnchor.commit, anchorRoot) === null;
        writeFileSync(auditPath, "{\"complete\":false}\n");
        const auditDrift = immutableFirstAddAnchor(auditPath, anchorRoot).error;
        t.check("the completed human audit is immutable and critic evidence is committed strictly after it",
          !auditAnchor.error && ordered && /differs from its immutable first-add version/.test(auditDrift)
            && /if \(auditAnchor\.error\) \{/.test(source)
            && /completed claims audit must be committed unchanged before critic calls/.test(source)
            && /strictlyCommittedAfter\(evidencePath, item\.prerequisiteCommit\)/.test(source));
      } finally {
        rmSync(anchorRoot, { recursive: true, force: true });
      }
    }
    const closure = localModuleClosure(["bundles/prose-author/tests/acceptance-runner.mjs"]);
    t.check("the prepare lock contains the transitive scoring and structural dependency closure",
      ["bundles/prose-author/tests/bar.mjs", "bundles/prose-author/tests/loop.mjs",
        "bundles/prose-author/tests/cross-count.mjs", "bundles/prose-author/tests/corpus-rates.mjs",
        "bundles/prose-author/tests/run-gates.mjs"]
        .every((file) => closure.includes(file))
        && /\.\.\.localModuleClosure\(\["bundles\/prose-author\/tests\/acceptance-runner\.mjs"\]\)/.test(source));
    t.check("every model result is checked against its locked stage provenance",
      /resultMatchesDispatch\(record, expectedDispatch\)/.test(source)
        && /dispatch provenance does not match its locked manifest stage/.test(source)
        && /completedResult\(rawPath, dispatch\)/.test(source));
    t.check("a recoverable Codex failure cannot be relabelled under a new manifest",
      /recoverable failure dispatch does not match its locked manifest stage/.test(source)
        && /if \(!resultMatchesDispatch\(existing, dispatch\)/.test(source)
        && /existing\.acceptance_input/.test(source));
    {
      const eventRoot = mkdtempSync(join(tmpdir(), "prose-author-codex-events-"));
      try {
        const result = JSON.stringify({ ok: true });
        writeFileSync(join(eventRoot, "events.jsonl"), [
          JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: result } }),
          JSON.stringify({ type: "turn.completed" }), "",
        ].join("\n"));
        writeFileSync(join(eventRoot, "output.json"), `${result}\n`);
        const acceptanceDispatch = {
          stage: "draft", harness: "codex", model: "locked", effort: "high",
          transport: "native-structured", timeout_ms: 10, concurrency: 1,
          manifest_sha256: "0".repeat(64),
        };
        const acceptanceInput = {
          system_sha256: "1".repeat(64), prompt_sha256: "2".repeat(64), schema_sha256: "3".repeat(64),
        };
        const record = {
          harness: "codex", result, structured_output: { ok: true },
          raw_events: "events.jsonl", raw_output: "output.json", recovered_from: null,
          acceptance_dispatch: acceptanceDispatch, acceptance_input: acceptanceInput,
        };
        t.check("final Codex verification reconstructs the wrapper from its primary event stream",
          codexRecordErrors(record, eventRoot).length === 0
            && codexRecordErrors({ ...record, structured_output: { ok: false } }, eventRoot)
              .some((error) => /structure diverges/.test(error)));
        const wrapperPath = join(eventRoot, "wrapper.json");
        const wrapperEvents = join(eventRoot, "wrapper.codex-events.jsonl");
        const wrapperOutput = join(eventRoot, "wrapper.codex-output.json");
        writeFileSync(wrapperEvents, readFileSync(join(eventRoot, "events.jsonl"), "utf8"));
        writeFileSync(wrapperOutput, readFileSync(join(eventRoot, "output.json"), "utf8"));
        const repoRoot = resolve(HERE, "..", "..", "..");
        const wrapperRecord = {
          ...record,
          raw_events: relative(repoRoot, wrapperEvents),
          raw_output: relative(repoRoot, wrapperOutput),
        };
        writeFileSync(wrapperPath, `${JSON.stringify({
          type: "result", is_error: false, ...wrapperRecord,
        })}\n`);
        const lockedWrapperPasses = completedResult(wrapperPath, acceptanceDispatch, acceptanceInput) !== null;
        writeFileSync(wrapperPath, `${JSON.stringify({
          type: "result", is_error: false, ...wrapperRecord, raw_events: wrapperRecord.raw_output,
        })}\n`);
        let companionSwapRejected = false;
        try { completedResult(wrapperPath, acceptanceDispatch, acceptanceInput); } catch (error) {
          companionSwapRejected = /does not name its canonical companion/.test(error.message);
        }
        writeFileSync(wrapperPath, `${JSON.stringify({
          type: "result", is_error: false, ...wrapperRecord, harness: undefined,
        })}\n`);
        let relabelRejected = false;
        try { completedResult(wrapperPath, acceptanceDispatch, acceptanceInput); } catch (error) {
          relabelRejected = /missing or divergent harness label/.test(error.message);
        }
        t.check("locked Codex reconstruction cannot be skipped by relabelling its wrapper",
          lockedWrapperPasses && companionSwapRejected && relabelRejected);
        const recovery = {
          type: "result", is_error: true, error: "codex emitted no final structured output",
          structured_output: null, raw_events: "events.jsonl",
          acceptance_dispatch: acceptanceDispatch, acceptance_input: acceptanceInput,
        };
        writeFileSync(join(eventRoot, "failure.json"), `${JSON.stringify(recovery)}\n`);
        const recovered = { ...record, recovered_from: "failure.json" };
        t.check("a recovered Codex wrapper requires its preserved failure companion",
          codexRecordErrors(recovered, eventRoot).length === 0
            && /^[a-f0-9]{64}$/.test(codexCompanionArtifactFields({
              recovered_from: "bundles/prose-author/tests/acceptance-runner.mjs",
            }).recovered_from_sha256));
        writeFileSync(join(eventRoot, "failure.json"), "{}\n");
        t.check("tampered recovery provenance fails reconstruction",
          codexRecordErrors(recovered, eventRoot).some((error) => /does not preserve/.test(error)));
      } finally {
        rmSync(eventRoot, { recursive: true, force: true });
      }
    }
    t.check("invalid prepare-only environment does not break a read-only import",
      (() => {
        try {
          execFileSync(process.execPath, ["--input-type=module", "-e",
            `await import(${JSON.stringify(join(HERE, "acceptance-runner.mjs"))})`], {
            env: { ...process.env, ACCEPTANCE_CONCURRENCY: "not-an-integer" }, stdio: "ignore",
          });
          return true;
        } catch { return false; }
      })());
  }

  t.group("v0.2 acceptance harness — claim and quotation audit");
  {
    const rows = quotationAudit(
      'A “supplied phrase” appears. Acme called it "invented wording." A “profile phrase” appears.',
      "The request includes supplied phrase.",
      "The voice profile includes profile phrase.",
    );
    t.check("quoted spans are inventoried with paragraph locations",
      rows.length === 3 && rows.every((row) => row.where === "paragraph 1"));
    t.check("quote inventory distinguishes supplied from unsupplied wording",
      rows[0].present_in_request === true
        && rows[1].present_in_request === false
        && rows[2].present_in_request === false);
    t.check("the candidate prepass surfaces the diagnostic's conditional and rhetorical misses",
      factualCandidateReasons("A choice screen is often presented as power in your hands.")
        .includes("frequency-or-quantity")
        && factualCandidateReasons("Developers feel this gap when access still depends on approval.")
          .includes("population-or-institution")
        && factualCandidateReasons("A crude prohibition attracts attention.")
          .includes("empirical-causation"));
    const candidateSource = {
      schema: "voice-draft-source/3",
      paragraphs: [{ sentences: [{ text: "Developers feel this gap when access still depends on approval." }] }],
    };
    t.check("the human review template carries deterministic candidates rather than a blank checklist",
      sentenceReviewTemplate(candidateSource)[0].candidate_reasons.includes("population-or-institution")
        && sentenceReviewTemplate(candidateSource)[0].candidate_reasons.includes("capability-or-dependence"));
    t.check("a plainly normative sentence is not promoted into a factual candidate",
      factualCandidateReasons("We should require the advertised core functions to remain usable.").length === 0);
  }
  t.check("model dispatch has a hard timeout instead of waiting indefinitely",
    /ACCEPTANCE_MODEL_TIMEOUT_MS/.test(source)
      && /child\.kill\("SIGTERM"\)/.test(source)
      && /exceeded \$\{dispatch\.timeout_ms\}ms/.test(source));
  t.check("the deterministic profile prepass covers the major countable dimensions",
    ["second-person-family", "contractions", "uncontracted-negatives", "profanity-vulgarity",
      "first-person-singular-family", "question-marks", "round-parenthetical-spans", "em-dashes"]
      .every((id) => PROFILE_MEASUREMENT_RULES.some((rule) => rule.id === id)));
  {
    const measured = measureProfile(join(HERE, "fixtures", "profiles", "doctorow-blog"));
    t.check("the prepass produces one corpus word total and one row per fixed rule",
      measured.corpus_words > 0 && measured.measurements.length === PROFILE_MEASUREMENT_RULES.length);
    t.check("every prepass rate is arithmetic on its count and corpus words",
      measured.measurements.every((m) => Math.abs(m.per_1000_words
        - Math.round((m.count / measured.corpus_words) * 100000) / 100) < 1e-9));
    t.check("every deterministic counting rule carries a stable measurement locator",
      measured.measurements.every((m) => m.counting_rule.startsWith(`[measurement:${m.id}]`)));
    t.check("every deterministic measurement carries an auditable file partition",
      measured.measurements.every((m) => m.files_with.length === m.samples_with
        && m.files_without.length === m.samples_without
        && m.files_with.length + m.files_without.length === measured.sample_count));
  }
  t.check("the checker pins design, case, agent, corpus, request, and artefact hashes",
    ["design_sha256", "cases_sha256", "locked_files", "locked implementation changed after prepare",
      "agent snapshot hash mismatch", "corpus lock drifted", "prompt hash mismatch", "missing artifact"]
      .every((phrase) => source.includes(phrase)));
  t.check("the checker reconstructs staged corpora and every model prompt from locked inputs",
    /function stagedInputErrors/.test(source)
      && /staged file set drifted/.test(source)
      && /function promptDerivationErrors/.test(source)
      && /profile prompt does not reproduce from locked inputs/.test(source)
      && /draft prompt does not reproduce from its locked request and profile/.test(source)
      && /claim-audit prompt does not reproduce from the raw draft/.test(source)
      && /critic prompt does not reproduce from locked inputs/.test(source)
      && /errors\.push\(\.\.\.stagedInputErrors\(runDir, manifest, cases\)\)/.test(source)
      && /errors\.push\(\.\.\.promptDerivationErrors\(runDir, manifest, cases\)\)/.test(source));
  {
    const namespaceRoot = mkdtempSync(join(tmpdir(), "prose-author-raw-namespace-"));
    try {
      const cell = (folder, name) => {
        const wrapper = join(namespaceRoot, folder, `${name}.json`);
        mkdirSync(dirname(wrapper), { recursive: true });
        writeFileSync(wrapper, '{"recovered_from":null}\n');
        writeFileSync(wrapper.replace(/\.json$/, ".codex-events.jsonl"), "{}\n");
        writeFileSync(wrapper.replace(/\.json$/, ".codex-output.json"), "{}\n");
      };
      const stage = {
        harness: "codex", model: "fixture", effort: "low",
        transport: "native-structured", timeout_ms: 1,
      };
      const namespaceManifest = {
        concurrency: 1,
        dispatch: Object.fromEntries(["profile", "draft", "claim_audit", "critic"]
          .map((name) => [name, stage])),
      };
      const namespaceCases = {
        profiles: [{ id: "p", renders: 1 }], cases: [{ id: "d" }], refusals: [{ id: "r" }],
      };
      mkdirSync(join(namespaceRoot, "raw"), { recursive: true });
      writeFileSync(join(namespaceRoot, "raw", "p-r1.md"), "canonical profile\n");
      cell(join("raw", "profiles"), "p-r1");
      cell(join("raw", "drafts"), "d");
      cell(join("raw", "refusals"), "r");
      cell(join("raw", "claim-audits"), "d");
      for (let draw = 1; draw <= 3; draw += 1) cell(join("critics", "raw"), `d-d${draw}`);
      const cleanNamespace = artifactHashErrors(
        null, namespaceRoot, namespaceCases, namespaceManifest,
      ).filter((error) => error.startsWith("raw namespace"));
      writeFileSync(join(namespaceRoot, "raw", "profiles", "unindexed-redraw.codex-events.jsonl"), "{}\n");
      writeFileSync(join(namespaceRoot, "critics", "raw", "d-d4.json"), "{}\n");
      rmSync(join(namespaceRoot, "critics", "raw", "d-d3.codex-output.json"));
      cell(join("critics", "failures"), "d-d1.failed");
      const disguisedWrapper = join(namespaceRoot, "outputs", "moved-call.bin");
      mkdirSync(dirname(disguisedWrapper), { recursive: true });
      writeFileSync(disguisedWrapper, `${JSON.stringify({
        type: "result", is_error: true,
        acceptance_dispatch: { stage: "critic" }, acceptance_input: { prompt_sha256: "x" },
      })}\n`);
      const tamperedNamespace = artifactHashErrors(
        null, namespaceRoot, namespaceCases, namespaceManifest,
      ).filter((error) => error.startsWith("raw namespace"));
      t.check("raw namespaces reject orphan redraws, extra critic draws, and missing companions",
        cleanNamespace.length === 0
          && tamperedNamespace.some((error) => /unindexed-redraw\.codex-events\.jsonl/.test(error))
          && tamperedNamespace.some((error) => /d-d4\.json/.test(error))
          && tamperedNamespace.some((error) => /missing expected file d-d3\.codex-output\.json/.test(error))
          && tamperedNamespace.some((error) => /critics[/\\]failures[/\\]d-d1\.failed\.codex-events\.jsonl/.test(error))
          && tamperedNamespace.some((error) => /outputs[/\\]moved-call\.bin/.test(error)));
    } finally {
      rmSync(namespaceRoot, { recursive: true, force: true });
    }
  }
  {
    const body = readFileSync(join(HERE, "acceptance-runner.mjs"), "utf8");
    const hash = createHash("sha256").update(body).digest("hex");
    const entry = { raw: "bundles/prose-author/tests/acceptance-runner.mjs", raw_sha256: hash };
    const recovery = {
      recovered_from: entry.raw, recovered_from_sha256: hash,
    };
    t.check("recorded artifact hashes are verified against their files",
      artifactEntryHashErrors(entry, ["raw"], "fixture", HERE).length === 0
        && artifactEntryHashErrors({ ...entry, raw_sha256: "0".repeat(64) }, ["raw"], "fixture", HERE)
          .some((error) => /hash mismatch/.test(error))
        && artifactEntryHashErrors({}, ["raw"], "fixture", HERE)
          .some((error) => /required path\/hash pair is missing/.test(error))
        && artifactEntryHashErrors(recovery, ["recovered_from"], "fixture", HERE, ["recovered_from"]).length === 0
        && artifactEntryHashErrors({ ...recovery, recovered_from_sha256: null },
          ["recovered_from"], "fixture", HERE, ["recovered_from"])
          .some((error) => /no valid recorded hash/.test(error)));
    t.check("current artifacts cannot advertise legacy repair evidence even with a valid hash",
      legacyRepairArtifactErrors({ repair_source: entry.raw, repair_source_sha256: hash }, "fixture")
        .some((error) => /repair_source is forbidden/.test(error))
        && legacyRepairArtifactErrors({}, "fixture").length === 0);
    t.check("legacy repair evidence is forbidden in every nested artifact record",
      legacyRepairArtifactErrors({ evidence: {
        repair_source: entry.raw, repair_source_sha256: hash,
      } }, "ARTIFACTS").some((error) => /ARTIFACTS\.evidence\.repair_source is forbidden/.test(error)));
  }
  t.check("profile render hashes and k=3 stability are independently reproducible",
    /render_sha256: SHA\(text\(rawRender\)\)/.test(source)
      && /analyzeProfileStability\(renderIds\.map/.test(source)
      && /stability evidence does not reproduce from its canonical profiles/.test(source));
  t.check("TALLY, structural gates, and score are rederived from raw critic results during check",
    /function deriveAcceptanceEvidence/.test(source)
      && /const evidence = deriveAcceptanceEvidence\(runDir, manifest, cases\);/.test(source)
      && /if \(!existsSync\(sourcePath\) \|\| text\(sourcePath\) !== sourceBody\)/.test(source)
      && /\[p\.structural, evidence\.structural, "STRUCTURAL\.json"\]/.test(source)
      && /\[p\.tally, evidence\.tally, "TALLY\.json"\]/.test(source)
      && /\[p\.score, evidence\.score, "SCORE\.json"\]/.test(source)
      && /\$\{label\} does not reproduce from immutable raw results/.test(source));
  t.check("profiles, audited drafts, disclosures, refusals, and structural gates reconstruct from raw",
    /function deriveProfileEvidence/.test(source)
      && /const profiles = deriveProfileEvidence\(runDir, manifest, cases\)/.test(source)
      && /profile evidence cannot be rederived/.test(source)
      && /function deriveDraftEvidence/.test(source)
      && /const draftEvidence = deriveDraftEvidence\(runDir, manifest, cases\)/.test(source)
      && /does not reproduce from immutable raw results/.test(source));
  {
    const auditRoot = mkdtempSync(join(tmpdir(), "prose-author-audit-link-"));
    try {
      const draftPath = join(auditRoot, "inputs", "drafts", "x.txt");
      mkdirSync(dirname(draftPath), { recursive: true });
      const draft = "The supplied phrase appears.\n";
      writeFileSync(draftPath, draft);
      const draftHash = createHash("sha256").update(draft).digest("hex");
      const auditCases = { cases: [{
        id: "x", prompt: "Write about ownership choices. Include this exact sentence: The supplied phrase appears.",
      }] };
      const sourcePath = join(auditRoot, "inputs", "sources", "drafts", "x.json");
      const canonicalAuditPath = join(auditRoot, "inputs", "audits", "x.json");
      const sourceRecord = {
        schema: "voice-draft-source/3", kind: "draft",
        ledger: [{
          id: "c1", basis: "request-supported", claim: "The supplied phrase appears.",
          request_basis: "The supplied phrase appears.",
        }],
        paragraphs: [{ sentences: [{
          text: "The supplied phrase appears.", basis: "request-supported", claim_ids: ["c1"],
        }] }],
        omitted: [], refused: "",
      };
      mkdirSync(dirname(sourcePath), { recursive: true });
      writeFileSync(sourcePath, `${JSON.stringify(sourceRecord, null, 2)}\n`);
      mkdirSync(dirname(canonicalAuditPath), { recursive: true });
      writeFileSync(canonicalAuditPath, `${JSON.stringify({
        schema: "voice-draft-claim-audit/3",
        sentences: [{
          id: "p1s1", status: "keep", reason: "The request supplies the complete assertion.", claims: [],
        }],
      }, null, 2)}\n`);
      const review = {
        ...sentenceReviewTemplate(sourceRecord)[0],
        decision: "request-supported", request_evidence: ["The supplied phrase appears."],
        note: "The exact supplied sentence supports every descriptive term in this sentence.",
      };
      const audit = {
        schema: "prose-author-claims-audit/5", attestation: humanAttestation(), instructions: [], drafts: { x: {
        draft_sha256: draftHash, claims: [],
        quoted_spans: quotationAudit(draft, auditCases.cases[0].prompt),
        sentence_reviews: [review], claims_verified: true, quotations_verified: true, note: "",
      } },
      };
      const artifacts = { drafts: { x: {
        draft_sha256: draftHash,
        disclosure: null, disclosure_sha256: null,
        source: relative(resolve(HERE, "../../.."), sourcePath),
        source_sha256: createHash("sha256").update(readFileSync(sourcePath)).digest("hex"),
      } } };
      t.check("human sentence review linkage is rederived from the canonical source and disclosure",
        claimsAuditFailures(audit, auditCases, artifacts, auditRoot).length === 0
          && claimsAuditFailures({ ...audit, drafts: { x: { ...audit.drafts.x,
            draft_sha256: "0".repeat(64),
          } } }, auditCases, artifacts, auditRoot).some((error) => /audited draft hash drifted/.test(error))
          && /claimsAuditFailures\(json\(p\.audit\), cases, artifacts, runDir\)/.test(source));
      t.check("a scalar completeness assertion cannot replace a sentence decision",
        claimsAuditFailures({ ...audit, drafts: { x: { ...audit.drafts.x,
          sentence_reviews: [{ ...review, decision: null }],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /has no completed human decision/.test(error)));
      t.check("omitting one sentence review cannot assert completeness by omission",
        claimsAuditFailures({ ...audit, drafts: { x: { ...audit.drafts.x,
          sentence_reviews: [],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /sentence review covers 0 of 1 sentence units/.test(error)));
      t.check("candidate reasons and sentence hashes are immutable source-derived evidence",
        claimsAuditFailures({ ...audit, drafts: { x: { ...audit.drafts.x,
          sentence_reviews: [{ ...review, candidate_reasons: ["frequency-or-quantity"] }],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /does not reproduce from the immutable source sentence/.test(error)));
      t.check("request-supported review is checked independently of the model-authored request ledger",
        claimsAuditFailures({ ...audit, drafts: { x: { ...audit.drafts.x,
          sentence_reviews: [{ ...review, request_evidence: ["ownership choices"] }],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /no substantive lexical support for the sentence/.test(error)));
      t.check("request-supported human clearance needs an independent rationale",
        claimsAuditFailures({ ...audit, drafts: { x: { ...audit.drafts.x,
          sentence_reviews: [{ ...review, note: "" }],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /needs a substantive independent rationale/.test(error)));
      t.check("request-supported rationale cannot delegate judgment to model authority",
        claimsAuditFailures({ ...audit, drafts: { x: { ...audit.drafts.x,
          sentence_reviews: [{ ...review,
            note: "The automated reviewer classified this as supplied, so no independent check is needed.",
          }],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /delegates semantic judgment to pipeline authority/.test(error)));
      t.check("critic-unlocking review requires an explicit human attestation",
        claimsAuditFailures({ ...audit, attestation: {
          ...humanAttestation(), reviewer: "",
        } }, auditCases, artifacts, auditRoot)
          .some((error) => /reviewer identity is incomplete/.test(error)));
      const alternateSourcePath = join(auditRoot, "alternate", "x.json");
      mkdirSync(dirname(alternateSourcePath), { recursive: true });
      writeFileSync(alternateSourcePath, `${JSON.stringify({
        ...sourceRecord,
        paragraphs: [{ sentences: [{
          text: "This should change.", basis: "reasoning", claim_ids: [],
        }] }],
        ledger: [],
      }, null, 2)}\n`);
      t.check("final checking refuses an artifact pointer to an alternate valid-hash source",
        claimsAuditFailures(audit, auditCases, { drafts: { x: {
          ...artifacts.drafts.x,
          source: relative(resolve(HERE, "../../.."), alternateSourcePath),
          source_sha256: createHash("sha256").update(readFileSync(alternateSourcePath)).digest("hex"),
        } } }, auditRoot)
          .some((error) => /artifact source is not the canonical raw-derived source/.test(error)));
      const riskySource = clone(sourceRecord);
      riskySource.paragraphs[0].sentences[0].text = "Developers often feel this gap.";
      const riskyReview = {
        ...sentenceReviewTemplate(riskySource)[0], decision: "non-factual",
        sentence_evidence: "Developers often feel this gap.", non_factual_basis: "normative",
        note: "too short",
      };
      t.check("clearing a flagged sentence as non-factual requires a substantive human rationale",
        claimsAuditFailures({
          schema: "prose-author-claims-audit/5", attestation: humanAttestation(), instructions: [], drafts: { x: {
          ...audit.drafts.x, sentence_reviews: [riskyReview],
        } },
        }, auditCases).some((error) => /substantive human rationale/.test(error)));
      t.check("a non-factual decision needs an explicit closed semantic basis",
        claimsAuditFailures({
          schema: "prose-author-claims-audit/5", attestation: humanAttestation(), instructions: [], drafts: { x: {
            ...audit.drafts.x,
            sentence_reviews: [{ ...riskyReview,
              non_factual_basis: null,
              note: "The model audit says keep, so this sentence needs no independent semantic explanation.",
            }],
          } },
        }, auditCases).some((error) => /needs one closed semantic basis/.test(error)));
      t.check("a non-factual rationale cannot delegate judgment to model authority",
        claimsAuditFailures({
          schema: "prose-author-claims-audit/5", attestation: humanAttestation(), instructions: [], drafts: { x: {
            ...audit.drafts.x,
            sentence_reviews: [{ ...riskyReview,
              note: "The model audit says this is normative, so no independent factual review is required.",
            }],
          } },
        }, auditCases).some((error) => /delegates semantic judgment to pipeline authority/.test(error)));
      const sharedParagraphSource = {
        schema: "voice-draft-source/3", kind: "draft",
        ledger: [{
          id: "c1", basis: "external-verification", claim: "Acme released version 2.", request_basis: "",
        }],
        paragraphs: [{ sentences: [
          { text: "Acme released version 2.", basis: "external-verification", claim_ids: ["c1"] },
          { text: "Most users prefer it.", basis: "reasoning", claim_ids: [] },
        ] }],
        omitted: [], refused: "",
      };
      const sharedParagraphAudit = {
        schema: "voice-draft-claim-audit/3", sentences: [
          { id: "p1s1", status: "keep", reason: "Finite claim is in the ledger.", claims: [] },
          { id: "p1s2", status: "keep", reason: "Auditor incorrectly calls this reasoning.", claims: [] },
        ],
      };
      const sharedDraft = "Acme released version 2. Most users prefer it.\n";
      const sharedDisclosure = {
        schema: "voice-draft/1", claims: [{ claim: "Acme released version 2.", where: "paragraph 1" }],
      };
      writeFileSync(sourcePath, `${JSON.stringify(sharedParagraphSource, null, 2)}\n`);
      writeFileSync(canonicalAuditPath, `${JSON.stringify(sharedParagraphAudit, null, 2)}\n`);
      writeFileSync(draftPath, sharedDraft);
      const disclosurePath = join(auditRoot, "inputs", "records", "x.json");
      mkdirSync(dirname(disclosurePath), { recursive: true });
      writeFileSync(disclosurePath, `${JSON.stringify(sharedDisclosure, null, 2)}\n`);
      const templates = sentenceReviewTemplate(sharedParagraphSource);
      const sharedHumanAudit = {
        schema: "prose-author-claims-audit/5", attestation: humanAttestation(), instructions: [], drafts: { x: {
        draft_sha256: createHash("sha256").update(sharedDraft).digest("hex"),
        claims: sharedDisclosure.claims, quoted_spans: [],
        sentence_reviews: [
          { ...templates[0], decision: "listed-for-verification", claim_refs: ["Acme released version 2."] },
          { ...templates[1], decision: "listed-for-verification", claim_refs: ["Acme released version 2."] },
        ],
        claims_verified: true, quotations_verified: true, note: "",
      } },
      };
      const sharedArtifacts = { drafts: { x: {
        draft_sha256: sharedHumanAudit.drafts.x.draft_sha256,
        source: relative(resolve(HERE, "../../.."), sourcePath),
        source_sha256: createHash("sha256").update(readFileSync(sourcePath)).digest("hex"),
        disclosure: relative(resolve(HERE, "../../.."), disclosurePath),
        disclosure_sha256: createHash("sha256").update(readFileSync(disclosurePath)).digest("hex"),
      } } };
      t.check("a public claim from the same paragraph cannot cover a different sentence",
        claimsAuditFailures(sharedHumanAudit, auditCases, sharedArtifacts, auditRoot)
          .some((error) => /claim refs do not match the exact canonical sentence inventory/.test(error)));
      t.check("non-factual sentence evidence must be an exact span of that canonical sentence",
        claimsAuditFailures({ ...sharedHumanAudit, drafts: { x: { ...sharedHumanAudit.drafts.x,
          sentence_reviews: [sharedHumanAudit.drafts.x.sentence_reviews[0], {
            ...templates[1], decision: "non-factual", sentence_evidence: "Most users",
            non_factual_basis: "normative",
            note: "This is presented as argumentative framing without any independently checkable premise.",
          }],
        } } }, auditCases, sharedArtifacts, auditRoot)
          .some((error) => /must reproduce the complete canonical sentence/.test(error)));
      t.check("a canonical disclosure cannot be hidden behind a null artifact pointer",
        claimsAuditFailures(sharedHumanAudit, auditCases, { drafts: { x: {
          ...sharedArtifacts.drafts.x, disclosure: null, disclosure_sha256: null,
        } } }, auditRoot)
          .some((error) => /artifact disclosure is not the canonical raw-derived record/.test(error)));
    } finally {
      rmSync(auditRoot, { recursive: true, force: true });
    }
  }

  t.group("v0.2 acceptance harness — critic contracts are derived from raw bodies");
  {
    const sourceRecord = {
      schema: "voice-critic-source/1", findings: [],
      clean_categories: ["register-breaks", "unfamiliar-constructions"],
      rhythm_assessed: false, rhythm_note: "No deterministic rhythm scan was supplied.",
      verdict: "CLEAN",
    };
    t.check("the critic source schema is strict-harness compatible",
      CRITIC_SOURCE_SCHEMA.additionalProperties === false
        && CRITIC_SOURCE_SCHEMA.properties.schema.type === "string"
        && CRITIC_SOURCE_SCHEMA.properties.verdict.type === "string");
    t.check("a clean semantic critic source validates",
      validateVoiceCriticSource(sourceRecord, { rhythmScanSupplied: false }).ok);
    const cleanOutput = assembleVoiceCritic(sourceRecord, { rhythmScanSupplied: false });
    t.check("critic assembly owns one exact closing token",
      cleanOutput.ok && cleanOutput.output.trim().endsWith("**CLEAN**")
        && deriveCritic(cleanOutput.output).verdict === "CLEAN");
    const independent = assembleVoiceCritic({
      ...sourceRecord,
      findings: [{
        location: "paragraph 2", what: "register break",
        corpus_evidence: "sample.txt uses a concrete verb instead", confidence: "high",
      }],
      verdict: "CLEAN",
    }, { rhythmScanSupplied: false });
    t.check("critic assembly preserves a model-owned verdict independently of finding count",
      independent.ok && deriveCritic(independent.output).verdict === "CLEAN"
        && deriveCritic(independent.output).findings === 1);
    t.check("an uncited semantic finding is rejected",
      !validateVoiceCriticSource({
        ...sourceRecord,
        findings: [{ location: "p2", what: "break", corpus_evidence: "", confidence: "high" }],
      }).ok);
    t.check("a lone low-confidence finding is rejected",
      !validateVoiceCriticSource({
        ...sourceRecord,
        findings: [{ location: "p2", what: "maybe", corpus_evidence: "sample.txt", confidence: "low" }],
      }).ok);
    t.check("a semantic critic authorship claim is rejected",
      !validateVoiceCriticSource({ ...sourceRecord, rhythm_note: "The draft was AI-generated." }).ok);
  }
  {
    const clean = deriveCritic("All five categories are clean.\n\n**CLEAN**");
    t.check("a closing CLEAN verdict is derived", clean.verdict === "CLEAN" && clean.findings === 0);
  }
  {
    const cited = deriveCritic([
      "**LOCATION**: line 2", "**WHAT**: register break", "**CORPUS EVIDENCE**: `a.txt`, line 4", "**CONFIDENCE**: high", "", "**REVISE**",
    ].join("\n"));
    t.check("finding count comes from LOCATION markers", cited.verdict === "REVISE" && cited.findings === 1);
    t.check("a finding with corpus evidence is not marked uncited", cited.uncited === 0);
  }
  {
    const uncited = deriveCritic("**LOCATION**: line 2\n**WHAT**: guess\n\nREVISE");
    t.check("a finding without corpus evidence violates the critic contract", uncited.uncited === 1);
  }
  {
    const authorship = deriveCritic("This was AI-generated.\n\nCLEAN");
    t.check("a critic authorship claim is counted as a contract failure", authorship.authorship_claims === 1);
  }
  {
    const malformed = deriveCritic("Finding.\n\n**REVISE** — one span only");
    t.check("a model-appended explanation still fails the raw closing-token parser",
      malformed.verdict === null);
  }
}

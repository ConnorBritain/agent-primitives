/** Acceptance harness integrity — the scorer may not grade its own handwritten tally. */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  claimAuditPrompt, claimsAuditFailures, criticPrompt, deriveCritic, draftPrompt, profileRenderPrompt,
  quotationAudit, validateCases,
} from "./acceptance-runner.mjs";
import { measureProfile, PROFILE_MEASUREMENT_RULES } from "./profile-measurements.mjs";
import {
  assembleVoiceCritic, CRITIC_SOURCE_SCHEMA, validateVoiceCriticSource,
} from "./voice-critic-source.mjs";

const clone = (value) => JSON.parse(JSON.stringify(value));

export async function run(t, { HERE }) {
  const runDir = join(HERE, "runs", "2026-08-27-v020-acceptance");
  const cases = JSON.parse(readFileSync(join(runDir, "CASES.json"), "utf8"));
  const source = readFileSync(join(HERE, "acceptance-runner.mjs"), "utf8");

  t.group("v0.2 acceptance harness — the locked design is executable");
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
      source.includes("PROFILE_NATIVE_SCHEMA ? sourceRenderSchema(manifest.corpora[profile.id].measurements) : null")
        && source.includes('"--json-schema"')
        && source.includes("assembleVoiceProfile(source"));
  }
  {
    const prompt = draftPrompt({ prompt: "Write X." }, "Profile prose", { schema: "voice-profile/2" });
    t.check("the drafter prompt contains the request and rendered profile", /Write X\./.test(prompt) && /Profile prose/.test(prompt));
    t.check("the drafter prompt states that corpus access is unavailable", /no corpus access/i.test(prompt));
    t.check("the drafter prompt ends on the provider-neutral semantic source contract",
      /Return voice-draft-source\/2[\s\S]*proof-carrying sentence object[\s\S]*validates request bases[\s\S]*derives claims/.test(prompt));
    t.check("draft dispatch uses native structure but validates deterministic assembly",
      source.includes("DRAFT_NATIVE_SCHEMA ? DRAFT_SOURCE_SCHEMA : null")
        && source.includes("assembleVoiceDraft(decoded.source, { request: c.prompt })")
        && source.includes("parseDraft(assembled.output)"));
  }
  {
    const draftSource = {
      schema: "voice-draft-source/2", kind: "draft",
      paragraphs: [{ sentences: [{ text: "A bill passed.", basis: "reasoning", claims: [] }] }],
      omitted: [], refused: "",
    };
    const prompt = claimAuditPrompt({ id: "opaque-01", prompt: "Discuss a bill." }, draftSource);
    t.check("claim-audit prompts expose the request and every sentence id but no profile",
      /Discuss a bill\./.test(prompt) && /"id": "p1s1"/.test(prompt)
        && /existing basis labels and claims are suggestions, not evidence/i.test(prompt)
        && !/voice profile/i.test(prompt));
    t.check("draft dispatch runs the independent audit before public collection",
      source.includes("await dispatchClaimAudits(runDir, manifest, cases)")
        && source.includes("applyVoiceDraftClaimAudit(decoded.source, decodedAudit.audit")
        && source.includes("assembleVoiceDraft(applied.source"));
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
      && /if \(completedResult\(output\)\) return \{ skipped: true/.test(source));
  t.check("acceptance requires source JSON to parse without transport repair",
    /source required \$\{decoded\.repairs\} transport quote repair/.test(source));
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
  t.check("the model effort is pinned in the manifest rather than inherited",
    /draft_effort: DRAFT_EFFORT/.test(source) && /critic_effort: CRITIC_EFFORT/.test(source)
      && /claim_audit_effort: CLAIM_AUDIT_EFFORT/.test(source)
      && /profile_effort: PROFILE_EFFORT/.test(source) && /"--effort", effort/.test(source)
      && /effort: DRAFT_EFFORT/.test(source) && /effort: CRITIC_EFFORT/.test(source)
      && /effort: CLAIM_AUDIT_EFFORT/.test(source) && /effort: PROFILE_EFFORT/.test(source));
  t.check("acceptance defaults to one model process and native structured profile transport",
    /ACCEPTANCE_CONCURRENCY \|\| "1"/.test(source)
      && /ACCEPTANCE_PROFILE_NATIVE_SCHEMA !== "0"/.test(source)
      && /profile_transport: PROFILE_NATIVE_SCHEMA \? "native-structured" : "json-fence"/.test(source));
  t.check("acceptance defaults to native structured draft transport and records it in the manifest",
    /ACCEPTANCE_DRAFT_NATIVE_SCHEMA !== "0"/.test(source)
      && /draft_transport: DRAFT_NATIVE_SCHEMA \? "native-structured" : "json-fence"/.test(source));
  t.check("acceptance defaults to a native independent claim-audit transport",
    /ACCEPTANCE_CLAIM_AUDIT_NATIVE_SCHEMA !== "0"/.test(source)
      && /claim_audit_transport: CLAIM_AUDIT_NATIVE_SCHEMA \? "native-structured" : "json-fence"/.test(source)
      && source.includes("CLAIM_AUDIT_NATIVE_SCHEMA ? DRAFT_AUDIT_SCHEMA : null"));
  t.check("acceptance defaults to native structured critic transport and validates assembly",
    /ACCEPTANCE_CRITIC_NATIVE_SCHEMA !== "0"/.test(source)
      && /critic_transport: CRITIC_NATIVE_SCHEMA \? "native-structured" : "json-fence"/.test(source)
      && source.includes("CRITIC_NATIVE_SCHEMA ? CRITIC_SOURCE_SCHEMA : null")
      && source.includes("assembleVoiceCritic(decoded.source"));
  t.check("critic dispatch is blocked until the independent claims audit is complete",
    /const auditFailures = claimsAuditFailures\(json\(join\(runDir, "CLAIMS-AUDIT\.json"\)\), cases\);[\s\S]*no critic calls were made/.test(source));

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
    const casesForAudit = { cases: [{ id: "x" }] };
    const incomplete = {
      schema: "prose-author-claims-audit/2",
      drafts: { x: { claims_verified: true, disclosure_complete: null, quotations_verified: true } },
    };
    t.check("a self-reported claims list cannot replace the independent completeness audit",
      claimsAuditFailures(incomplete, casesForAudit).includes("x: disclosure_complete"));
    t.check("all three explicit audit decisions are required before scoring",
      claimsAuditFailures({
        schema: "prose-author-claims-audit/2",
        drafts: { x: { claims_verified: true, disclosure_complete: true, quotations_verified: true } },
      }, casesForAudit).length === 0);
  }
  t.check("model dispatch has a hard timeout instead of waiting indefinitely",
    /ACCEPTANCE_MODEL_TIMEOUT_MS/.test(source)
      && /child\.kill\("SIGTERM"\)/.test(source)
      && /exceeded \$\{MODEL_TIMEOUT_MS\}ms/.test(source));
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
  t.check("TALLY.json is derived by collect rather than accepted as an input",
    /const tally = \{[\s\S]*drafts,[\s\S]*structural_gates: structural\.gates/.test(source));

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

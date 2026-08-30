/** Acceptance harness integrity — the scorer may not grade its own handwritten tally. */

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

import {
  ARTIFACT_PATH_KEYS, artifactEntryHashErrors, artifactHashErrors, claimAuditPrompt, claimsAuditFailures,
  CODEX_NO_TOOLS_CONFIG, codexToolEvents,
  codexCompanionArtifactFields, codexRecordErrors, committedManifestError, completedResult,
  criticPrompt, deriveCritic, draftConformancePrompt, draftPrompt,
  draftResidualSemanticCorrectionPrompt, draftSemanticRevisionPrompt,
  dispatchCodex, dispatchPreflightErrors,
  factualCandidateReasons, HARNESS_CAPABILITIES, invocationInput,
  immutableFirstAddAnchor, legacyRepairArtifactErrors, localModuleClosure, lockedImplementationErrors,
  manifestDispatch, modelAdapterName, prepareConfig, profileRenderPrompt,
  profileEvidenceMetadataErrors,
  quotationAudit, recountValidationErrors, resolveDraftChain, retiredRepairEvidenceErrors, sentenceReviewTemplate, stagePrompt,
  requestedExactTitle, semanticResidualStatus, strictlyCommittedAfter, schemaInvocation, validateCases,
  validateResidualSemanticCorrection, validateSemanticRevision,
  assertStrictOutputSchema, strictOutputSchemaErrors,
} from "./acceptance-runner.mjs";
import { measureProfile, PROFILE_MEASUREMENT_RULES } from "./profile-measurements.mjs";
import {
  assembleVoiceCritic, CRITIC_SOURCE_SCHEMA, validateVoiceCriticSource,
} from "./voice-critic-source.mjs";
import { SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA } from "../skills/prose-draft/tools/draft-contract.mjs";
import {
  AUDIT_SCHEMA as DRAFT_AUDIT_SCHEMA, sentenceRefs,
} from "../skills/prose-draft/tools/draft-claim-audit.mjs";
import {
  countRange, draftTargetCard, renderDraftTargetCard, requestedWordTarget,
  SEMANTIC_BEARING_MEASUREMENTS, TARGET_ABSOLUTE_FLOOR, TARGET_RATIO_BAND, wordTargetBounds,
} from "../skills/prose-draft/tools/draft-targets.mjs";
import {
  applyDraftConformancePatch, CONFORMANCE_MEASUREMENT_IDS, CONFORMANCE_PATCH_SCHEMA,
  contractionFormChangeCount, measureDraftConformance,
} from "../skills/prose-draft/tools/draft-conformance.mjs";
import {
  applyResidualPrunePlan, normalizeSafeResidual, RESIDUAL_PRUNE_SCHEMA,
  residualPrunePrompt,
} from "../skills/prose-draft/tools/draft-residual-prune.mjs";
import { draftControlCard } from "../skills/prose-draft/tools/draft-controls.mjs";
import { COVERAGE_DIMENSIONS } from "../skills/prose-draft/tools/profile-contract.mjs";
import { DEFAULT_RATIO_BAND, MIN_ABSOLUTE_DEVIATION } from "./corpus-rates.mjs";

const clone = (value) => JSON.parse(JSON.stringify(value));
export async function run(t, { HERE }) {
  const runDir = join(HERE, "runs", "2026-08-27-v020-acceptance");
  const cases = JSON.parse(readFileSync(join(runDir, "CASES.json"), "utf8"));
  const source = readFileSync(join(HERE, "acceptance-runner.mjs"), "utf8");
  const canarySource = readFileSync(join(HERE, "request-support-canary.mjs"), "utf8");
  const claimAuditSource = readFileSync(
    join(HERE, "..", "skills", "prose-draft", "references", "claim-audit.md"), "utf8",
  );

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
    t.check("portable structured-output schemas reject unsupported JSON Schema keywords",
      strictOutputSchemaErrors({
        type: "object", additionalProperties: false,
        properties: { values: { type: "array", uniqueItems: true, items: { type: "string" } } },
        required: ["values"],
      }).some((error) => /uniqueItems is not portable/.test(error)));
    t.check("portable structured-output schemas require every closed-object field",
      strictOutputSchemaErrors({
        type: "object", additionalProperties: false,
        properties: { required_value: { type: "string" }, optional_value: { type: "string" } },
        required: ["required_value"],
      }).some((error) => /required must name every property/.test(error)));
    t.check("all fixed acceptance source schemas fit the portable strict subset",
      [DRAFT_SOURCE_SCHEMA, DRAFT_AUDIT_SCHEMA, CRITIC_SOURCE_SCHEMA]
        .every((schema) => assertStrictOutputSchema(schema)));
  }
  {
    const measurements = measureProfile(join(HERE, "fixtures", "profiles", "eff-mullin"));
    const prompt = profileRenderPrompt("fixture", [{ file: "sample.txt", body: "Sample body." }], measurements);
    t.check("profile prompts inline their staged inputs", /Input file: sample\.txt/.test(prompt) && /Sample body\./.test(prompt));
    t.check("profile prompts end on the provider-neutral semantic source contract",
      /emit voice-profile-source\/4[\s\S]*deterministic measured slot[\s\S]*supporting[\s\S]*qualitative dimensions[\s\S]*unresolved reason/.test(prompt));
    t.check("profile prompts assign all duplicate bookkeeping to deterministic code",
      /Do not copy counts, rates, support[\s\S]*observation IDs, coverage statuses, or final profile fields[\s\S]*deterministic assembler owns/.test(prompt));
    t.check("profile prompts require refusal instead of invented evidence",
      /Complete the renderer's refusal checks[\s\S]*state the refusal[\s\S]*rather than inventing evidence/.test(prompt));
    t.check("profile prompts state which sparse measurements can and cannot form an absence pair",
      /first-person-singular-family is a sparse counterpart and will be an absence with measured replacement first-person-plural-family/.test(prompt)
        && /profanity-vulgarity has no measured positive replacement; do not emit it as an absence/.test(prompt));
    t.check("profile prompts leave measured frequency bands to deterministic assembly",
      /restrained placement but no[\s\S]*within-piece frequency/.test(prompt)
        && /not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency/.test(prompt));
    t.check("profile prompts pin every measured ID to a unique semantic slot",
      /first-person-singular-family -> self-reference-biography; section absences; counted absence/.test(prompt)
        && /Required unresolved dimensions: profanity-vulgarity/.test(prompt));
    t.check("profile prompts explain strict nullable unresolved placeholders",
      /strict unresolved object requires every listed qualitative and unresolved key[\s\S]*use null when a qualitative observation covers/.test(prompt));
    t.check("profile dispatch can request native structure without making assembly depend on it",
      source.includes('manifest, "profile", sourceRenderSchema(manifest.corpora[profile.id].measurements)')
        && source.includes("run: () => dispatchModel({")
        && source.includes('"--json-schema"')
        && source.includes("assembleVoiceProfile(source"));
  }
  {
    const profileMarkdown = [
      "# Voice profile — test-profile", "", "## 1. Cadence", "",
      "**Interruption punctuation.** Use en dashes for a compact pivot inside an existing sentence without inflating the paragraph or changing its factual content.",
      "_Evidence: 5/5 samples; several times per piece. [measurement:en-dashes] Count: 10 instances; 4.16 per 1,000 words. Representative locked source: `one.txt`._",
      "", "## 7. What the corpus never does", "",
      "**Interruption punctuation.** Em dashes are absent; use the measured en-dash replacement instead whenever an interrupting pivot is supported by the sentence.",
      "_Evidence: 5/5 samples establish the absence or sparse exception. [measurement:em-dashes] Count: 0 instances; 0.00 per 1,000 words. Representative locked source: `one.txt`._",
    ].join("\n");
    const unresolvedCoverage = COVERAGE_DIMENSIONS
      .filter((dimension) => dimension !== "interruption-punctuation")
      .map((dimension) => ({
        dimension, status: "unresolved",
        unresolved_reason: `The test fixture intentionally supplies no instruction for ${dimension}.`,
      }));
    const targetProfile = {
      schema: "voice-profile/2", profile: "test-profile", confidence: "thin", voice_card: "empty",
      corpus_words: 2404, observations: [{
        id: "o01", section: "cadence", support: 5, of: 5,
        rate: { count: 10, per_1000_words: 4.16, counting_rule: "[measurement:en-dashes] Count en dashes." },
      }, {
        id: "o02", section: "absences", support: 5, of: 5,
        rate: { count: 0, per_1000_words: 0, counting_rule: "[measurement:em-dashes] Count em dashes." },
      }],
      coverage: [
        ...unresolvedCoverage,
        {
          dimension: "interruption-punctuation", status: "absent-paired",
          observation_ids: ["o01", "o02"], positive_observation_id: "o01", absence_observation_id: "o02",
        },
      ],
    };
    const prompt = draftPrompt({ prompt: "Write a 700-word post." }, profileMarkdown, targetProfile);
    const controls = draftControlCard(profileMarkdown, targetProfile);
    t.check("the drafter prompt contains the request and compiled profile instructions",
      /Write a 700-word post\./.test(prompt)
        && /Compiled rhetorical control card/.test(prompt)
        && /o01 \[interruption-punctuation; section:cadence; measurement:en-dashes\]/.test(prompt)
        && controls.instructions.length === 2 && controls.coverage.length === 10);
    t.check("the drafter prompt states that corpus access is unavailable", /no corpus access/i.test(prompt));
    t.check("the drafter receives deterministic length-scaled count aims under the unchanged gate",
      /Deterministic draft target card/.test(prompt)
        && /\[measurement:en-dashes\][\s\S]*aim 3; unchanged gate range 1–5/.test(prompt)
        && /Described observations have restrained placement but no numeric quota/.test(prompt)
        && /revise it until every measured actual is inside its stated min\/max range/.test(prompt)
        && /omitted record[\s\S]*does not excuse an out-of-range measured habit/.test(prompt));
    t.check("target-card arithmetic reproduces the canary's en-dash deficit boundary",
      requestedWordTarget("Write about 700 words.") === 700
        && requestedWordTarget("Write a 650-word essay.") === 650
        && TARGET_RATIO_BAND === DEFAULT_RATIO_BAND
        && TARGET_ABSOLUTE_FLOOR === MIN_ABSOLUTE_DEVIATION
        && JSON.stringify(countRange(4.16, 700)) === JSON.stringify({
          aim: 3, minimum: 1, maximum: 5, expected: 2.91,
        }));
    const targetCard = draftTargetCard(targetProfile, "Write a 700-word post.");
    t.check("counted absences aim at zero without silently tightening the unchanged bar",
      targetCard.measurements[1].status === "counted-absence"
        && targetCard.measurements[1].aim_count === 0
        && targetCard.measurements[1].gate_minimum === 0
        && targetCard.measurements[1].gate_maximum === 1);
    const semanticMeasurements = [
      "second-person-family", "first-person-plural-family", "profanity-vulgarity",
      "first-person-singular-family", "question-marks",
    ];
    const hardCard = renderDraftTargetCard({
      schema: "voice-draft-target-card/1", word_target: 700,
      ratio_band: TARGET_RATIO_BAND, absolute_floor: TARGET_ABSOLUTE_FLOOR,
      qualitative_rule: "Described observations have restrained placement but no numeric quota.",
      measurements: semanticMeasurements.map((measurement_id, index) => ({
        observation_id: `o${index + 10}`, measurement_id, dimensions: ["test"],
        status: "measured-positive", corpus_per_1000_words: 2,
        target_words: 700, aim_count: 2, gate_minimum: 0, gate_maximum: 3,
      })),
    });
    t.check("semantic-bearing target bands are literal pre-return budgets",
      JSON.stringify(SEMANTIC_BEARING_MEASUREMENTS) === JSON.stringify(semanticMeasurements)
        && JSON.stringify(wordTargetBounds(700))
          === JSON.stringify({ target: 700, tolerance: 105, minimum: 595, maximum: 805 })
        && /OPERATIONAL LENGTH: aim 700; working interval 595–805 words inclusive/.test(hardCard)
        && /Outside this interval is a request-length deviation/.test(hardCard)
        && (hardCard.match(/^- HARD /gm) ?? []).length === semanticMeasurements.length
        && /Hard pre-return limits — conformance cannot repair these/.test(hardCard)
        && /\[measurement:question-marks\]: operational target EXACTLY 2; unchanged checker range 0–3/.test(hardCard)
        && /exact operational target, not an outer checker boundary/.test(hardCard)
        && /Recast excess questions as statements before returning the source/.test(hardCard)
        && /Do not emit these private counts/.test(hardCard));
    const initialSource = {
      schema: "voice-draft-source/4", kind: "draft",
      draft: "We can fix this sentence. It needs a turn and gets one.",
      omitted: [], refused: "",
    };
    const semanticPrompt = draftSemanticRevisionPrompt(
      { prompt: "Write a 700-word post." }, profileMarkdown, targetProfile, initialSource,
    );
    t.check("semantic conformance is one mandatory revision rather than candidate selection",
      /one mandatory semantic conformance revision/.test(semanticPrompt)
        && /not a redraw and not a choice between candidates/.test(semanticPrompt)
        && /candidate can never ship/.test(semanticPrompt)
        && /Return voice-draft-source\/4 exactly; return the complete revised draft, not a patch/.test(semanticPrompt)
        && /independent factual audit/.test(semanticPrompt));
    const overlongSemanticPrompt = draftSemanticRevisionPrompt(
      { prompt: "Write a 650-word post." }, profileMarkdown, targetProfile,
      { ...initialSource, draft: `${"word ".repeat(838).trim()}.` },
    );
    t.check("an overlong candidate receives its exact operational interval and minimum suggested cut",
      /candidate has 838 measured words; the accepted interval is 552–748, with target 650/.test(overlongSemanticPrompt)
        && /It is 90 words above the maximum\. Remove at least 90 measured words; aim for 650/.test(overlongSemanticPrompt)
        && /operational request target, not a substitute for the locked voice and structural gates/.test(overlongSemanticPrompt));
    const semanticCard = {
      schema: "voice-draft-target-card/1", word_target: null,
      ratio_band: TARGET_RATIO_BAND, absolute_floor: TARGET_ABSOLUTE_FLOOR,
      qualitative_rule: "test",
      measurements: [{
        observation_id: "o01", measurement_id: "first-person-plural-family",
        dimensions: ["person-reader-stance"], status: "measured-positive",
        corpus_per_1000_words: 1, target_words: 20, aim_count: 0,
        gate_minimum: 0, gate_maximum: 1,
      }],
    };
    const semanticCandidate = {
      ...initialSource, draft: "We can fix this sentence because we control the schedule.",
    };
    const badSemanticRevision = validateSemanticRevision(
      semanticCandidate, semanticCandidate, { request: "Write a short post.", card: semanticCard },
    );
    const goodSemanticRevision = validateSemanticRevision(
      semanticCandidate,
      { ...semanticCandidate, draft: "Workers can fix this sentence because they control the schedule." },
      { request: "Write a short post.", card: semanticCard },
    );
    t.check("semantic conformance deterministically rejects a still-out-of-range meaning-bearing count",
      !badSemanticRevision.ok
        && badSemanticRevision.errors.some((error) => /first-person-plural-family count 2 excess/.test(error)));
    t.check("semantic conformance may make a meaning-bearing revision before the exact byte-safe patch",
      goodSemanticRevision.ok && goodSemanticRevision.report.measurements[0].actual_count === 0);
    const operationalLengthCard = { ...semanticCard, word_target: 650 };
    const overlongButSemanticallyConformant = {
      ...initialSource, draft: `${"Workers can plan the schedule. ".repeat(170).trim()}`,
    };
    const operationalLengthResult = validateSemanticRevision(
      overlongButSemanticallyConformant, overlongButSemanticallyConformant,
      { request: "Write a 650-word post.", card: operationalLengthCard },
    );
    t.check("request length remains operational rather than becoming an unregistered ship gate",
      operationalLengthResult.ok && operationalLengthResult.report.draft_words > 748);
    const residualRun = join(HERE, "runs", "2026-08-30-v020-acceptance-7");
    const residualProfile = JSON.parse(readFileSync(
      join(residualRun, "inputs", "profiles", "eff-mullin", "r2.json"), "utf8",
    ));
    const residualProfileMarkdown = readFileSync(
      join(residualRun, "inputs", "profiles", "eff-mullin", "r2.md"), "utf8",
    );
    const residualCase = cases.cases.find((row) => row.id === "m05");
    const residualCard = draftTargetCard(residualProfile, residualCase.prompt);
    const rejectedResidual = {
      ...initialSource,
      draft: `# Choice screens aren't market choice\n\n${"word ".repeat(842)}A? B? C?`,
    };
    const residualStatus = semanticResidualStatus(rejectedResidual, {
      request: residualCase.prompt, card: residualCard,
    });
    t.check("deterministic residual detection binds both the observed question miss and length overage",
      residualStatus.needs_correction === true
        && residualStatus.semantic_failures.some((row) => row.measurement_id === "question-marks"
          && row.actual_count === 3 && row.maximum === 2)
        && residualStatus.length.actual === 851
        && residualStatus.length.status === "excess"
        && residualStatus.title.status === "mismatch");
    const stillRejected = validateResidualSemanticCorrection(
      rejectedResidual, rejectedResidual, { request: residualCase.prompt, card: residualCard },
    );
    const correctedResidual = {
      ...initialSource,
      draft: `# Choice screens are not market choice\n\n${"word ".repeat(692)}word?`,
    };
    const acceptedResidual = validateResidualSemanticCorrection(
      rejectedResidual, correctedResidual, { request: residualCase.prompt, card: residualCard },
    );
    t.check("a residual correction cannot continue with the same semantic or length failure",
      !stillRejected.ok
        && stillRejected.errors.some((error) => /question-marks count 3 excess/.test(error))
        && stillRejected.errors.some((error) => /851 words; required 595–805/.test(error)));
    t.check("a corrected residual may continue only after semantic recount and length validation",
      acceptedResidual.ok
        && acceptedResidual.report.draft_words === 700
        && acceptedResidual.source.draft.startsWith("# Choice screens are not market choice\n")
        && acceptedResidual.report.measurements.find((row) => row.measurement_id === "question-marks")?.actual_count === 1);
    t.check("only an explicitly locked title becomes a deterministic exact-title constraint",
      requestedExactTitle(residualCase.prompt) === "Choice screens are not market choice"
        && requestedExactTitle("Title: A useful suggestion. Write a post.") === null);
    const residualPrompt = draftResidualSemanticCorrectionPrompt(
      residualCase, residualProfileMarkdown, residualProfile, rejectedResidual,
    );
    t.check("the conditional correction is one provenance-bound continuation, not another candidate draw",
      /conditional second and final semantic correction/.test(residualPrompt)
        && /not a redraw, candidate selection, or request for a variant/.test(residualPrompt)
        && /prior revision[\s\S]*can never ship/.test(residualPrompt)
        && /only source that[\s\S]*may continue to exact conformance, independent claim audit, and criticism/.test(residualPrompt));
    t.check("residual correction gets center targets and a deterministic recount margin",
      /\[measurement:question-marks\] current 3; final target exactly 1; accepted range 0–2/.test(residualPrompt)
        && /current revision has 851 measured words/.test(residualPrompt)
        && /hard accepted interval is 595–805; target 700/.test(residualPrompt)
        && /narrower 647–753 working band/.test(residualPrompt)
        && /Remove at least 98 measured words/.test(residualPrompt)
        && /first nonblank line must be exactly `# Choice screens are not market choice`/.test(residualPrompt)
        && /Privately recount every residual target and the complete word count/.test(residualPrompt));
    const actualResidualSource = JSON.parse(readFileSync(
      join(residualRun, "raw", "drafts", "m05.json"), "utf8",
    )).structured_output;
    const normalizedResidual = normalizeSafeResidual(actualResidualSource, {
      request: residualCase.prompt, card: residualCard,
    });
    t.check("safe residual normalization restores only the locked title and an excess question heading",
      normalizedResidual.ok
        && normalizedResidual.status.report.draft_words === 852
        && normalizedResidual.status.semantic_failures.length === 0
        && normalizedResidual.changes.map((row) => row.kind).join(",")
          === "restore-exact-title,remove-heading-question-mark");
    const narrowPrune = applyResidualPrunePlan(actualResidualSource, {
      schema: "voice-draft-residual-prune/1", delete_paragraphs: [14, 15],
      reason: "Remove a secondary institutional example and the recap after the gatekeeper section.",
    }, { request: residualCase.prompt, card: residualCard });
    const insufficientPrune = applyResidualPrunePlan(actualResidualSource, {
      schema: "voice-draft-residual-prune/1", delete_paragraphs: [12], reason: "Too little.",
    }, { request: residualCase.prompt, card: residualCard });
    t.check("a whole-paragraph residual plan passes only after deterministic application and full recount",
      narrowPrune.ok
        && narrowPrune.length.actual === 753
        && narrowPrune.report.measurements.find((row) => row.measurement_id === "question-marks")?.actual_count === 1
        && narrowPrune.source.draft.startsWith("# Choice screens are not market choice\n"));
    t.check("a plausible deletion that leaves even a one-word excess is rejected",
      !insufficientPrune.ok
        && insufficientPrune.errors.some((error) => /806 words; required 595–805/.test(error)));
    const prunePrompt = residualPrunePrompt(actualResidualSource, {
      request: residualCase.prompt, card: residualCard,
    });
    t.check("the prune planner sees local paragraph budgets instead of being asked to recount a rewritten essay",
      /normalized draft has 852 words/.test(prunePrompt)
        && /Delete at least 47 words/.test(prunePrompt)
        && /Prefer deleting at least 99 words/.test(prunePrompt)
        && /Paragraph 14 — 63 words/.test(prunePrompt)
        && /LOCKED HEADING/.test(prunePrompt)
        && /do not return prose/.test(prunePrompt));
    t.check("the residual prune schema stays inside the portable strict-output subset",
      strictOutputSchemaErrors(RESIDUAL_PRUNE_SCHEMA).length === 0);
    const conformance = measureDraftConformance(initialSource.draft, targetCard);
    const conformancePrompt = draftConformancePrompt(
      { prompt: "Write a 700-word post." }, profileMarkdown, targetProfile, initialSource,
    );
    t.check("the mandatory conformance pass receives deterministic actual counts rather than estimating them",
      conformance.measurements[0].actual_count === 0
        && conformance.measurements[0].status === "deficit"
        && conformance.measurements[0].correction.minimum_change === 1
        && /fixed pipeline stage, not a redraw or a choice between candidates/.test(conformancePrompt)
        && /Deterministic conformance report for the initial draft/.test(conformancePrompt)
        && /actual 0; aim 3; range 1–5; deficit; add-or-recast at least 1/.test(conformancePrompt));
    t.check("the conformance pass returns bounded patches and accounts for all coverage rows",
      /local[\s\S]*code always applies the valid patch/.test(conformancePrompt)
        && /Return voice-draft-conformance-patch\/1 exactly; do not return a rewritten draft/.test(conformancePrompt)
        && /exact, unique before\/after source replacements/.test(conformancePrompt)
        && /anchor[\s\S]*no larger than one paragraph/.test(conformancePrompt)
        && /before anchors may replace at most 24 of the initial 12 words/.test(conformancePrompt)
        && /replacement must retain the exact structural/.test(conformancePrompt)
        && /draft contains any Markdown link or code signal anywhere, return no edits/.test(conformancePrompt)
        && /measurement_ids[\s\S]*token inside \[measurement:\.\.\.\][\s\S]*never put an observation ID such as o03/.test(conformancePrompt)
        && /habit string must literally include the[\s\S]*dimension and every observation ID/.test(conformancePrompt)
        && /Return exactly ten coverage rows/.test(conformancePrompt));
    const patchCoverage = targetProfile.coverage.map((row) => ({
      dimension: row.dimension,
      observation_ids: [...(row.observation_ids ?? [])],
      disposition: row.dimension === "interruption-punctuation" ? "revised" : "unresolved",
      reason: row.dimension === "interruption-punctuation"
        ? "The exact edit adds the measured positive replacement while preserving the counted absence."
        : row.unresolved_reason,
    }));
    const conformingPatch = {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It needs a turn and gets one.", after: "It needs a turn – and gets one.",
        reason: "Adds the missing en-dash pivot without adding an em dash.",
        coverage_dimensions: ["interruption-punctuation"], measurement_ids: ["en-dashes"],
      }],
      coverage: patchCoverage,
      omitted: [],
    };
    const applied = applyDraftConformancePatch(initialSource, conformingPatch, {
      request: "Write a 700-word post.", profile: targetProfile, card: targetCard,
    });
    t.check("the deterministic patch assembler applies exact anchors and remeasures final prose",
      applied.ok && applied.source.draft.includes("turn – and gets one")
        && applied.report.pass && applied.word_control.final_words >= applied.word_control.initial_words);
    const afterClosedFence = applyDraftConformancePatch({
      ...initialSource, draft: "~~~text\ncode sample\n~~~~\n\nIt needs a turn and gets one.",
    }, conformingPatch, {
      request: "Write a 700-word post.", profile: targetProfile, card: targetCard,
    });
    t.check("a conformer makes no edits anywhere in a Markdown-bearing draft",
      !afterClosedFence.ok
        && afterClosedFence.errors.some((error) => /Markdown code or links/.test(error)));
    const missed = applyDraftConformancePatch(initialSource, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0], after: "It needs a turn – and — gets — one.",
        measurement_ids: ["en-dashes", "em-dashes"],
      }],
    }, { request: "Write a 700-word post.", profile: targetProfile, card: targetCard });
    t.check("an exact patch that leaves a measured row out of range cannot pass", !missed.ok
      && missed.errors.some((error) => /final em-dashes count 2 is excess/.test(error)));
    const causalitySource = {
      ...initialSource, draft: "We can fix – this sentence. It needs a turn and gets one.",
    };
    const causalityCard = structuredClone(targetCard);
    const causalityEnDash = causalityCard.measurements.find((row) => row.measurement_id === "en-dashes");
    causalityEnDash.gate_minimum = 2;
    const unrelated = applyDraftConformancePatch(causalitySource, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0],
        before: "We can fix – this sentence.", after: "We can – fix this sentence.",
      }, conformingPatch.edits[0]],
    }, { request: "Write a 700-word post.", profile: targetProfile, card: causalityCard });
    t.check("an edit must itself improve one named failing measurement", !unrelated.ok
      && unrelated.errors.some((error) => /does not move every named failing measurement toward range/.test(error)));
    const semanticReversal = applyDraftConformancePatch({
      ...initialSource,
      draft: "The organization must reject the service and keep confidential notes inside systems it controls.",
    }, {
      ...conformingPatch,
      edits: [{
        before: "The organization must reject the service and keep confidential notes inside systems it controls.",
        after: "The organization should adopt the service – and send confidential notes outside systems it controls.",
        reason: "Adds the missing en dash.",
        coverage_dimensions: ["interruption-punctuation"],
        measurement_ids: ["en-dashes"],
      }],
    }, { request: "The organization must reject the service and keep confidential notes inside systems it controls.", profile: targetProfile, card: targetCard });
    t.check("a measured punctuation correction cannot reverse unrelated request semantics",
      !semanticReversal.ok
        && semanticReversal.errors.some((error) => /changes lexical content outside its named measurement forms/.test(error)));
    const commaReversal = applyDraftConformancePatch({
      ...initialSource, draft: "Let's eat, Grandma.",
    }, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0], before: "Let's eat, Grandma.", after: "Let's eat Grandma –.",
      }],
    }, { request: "Invite Grandma to eat.", profile: targetProfile, card: targetCard });
    t.check("a named dash correction cannot alter unnamed punctuation",
      !commaReversal.ok
        && commaReversal.errors.some((error) => /changes lexical content outside its named measurement forms/.test(error)));
    const decomposedAccent = `Cafe${String.fromCharCode(0x301)}.`;
    const unicodeNormalization = applyDraftConformancePatch({
      ...initialSource, draft: decomposedAccent,
    }, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0], before: decomposedAccent, after: "Café–.",
      }],
    }, { request: "Preserve the exact lexical bytes.", profile: targetProfile, card: targetCard });
    t.check("a named punctuation correction cannot normalize unnamed Unicode code points",
      !unicodeNormalization.ok
        && unicodeNormalization.errors.some((error) => /changes lexical content outside its named measurement forms/.test(error)));
    const newlineNormalization = applyDraftConformancePatch({
      ...initialSource, draft: "Alpha.\r\nBeta.",
    }, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0], before: "Alpha.\r\nBeta.", after: "Alpha –.\nBeta.",
      }],
    }, { request: "Preserve exact line endings.", profile: targetProfile, card: targetCard });
    t.check("a named punctuation correction cannot normalize unnamed line endings",
      !newlineNormalization.ok
        && newlineNormalization.errors.some((error) => /changes lexical content outside its named measurement forms/.test(error)));
    for (const attack of [{
      label: "four-space indentation", before: "Alpha sentence.", after: "    Alpha – sentence.",
    }, {
      label: "tab indentation", before: "Alpha sentence.", after: "\tAlpha – sentence.",
    }, {
      label: "a Markdown hard break", before: "Alpha sentence.\nBeta sentence.", after: "Alpha – sentence.  \nBeta sentence.",
    }, {
      label: "arbitrary internal spacing", before: "Alpha sentence.", after: "Alpha –  sentence.",
    }, {
      label: "a Markdown link", before: "[the source](https://example.com) explains this.", after: "[the source] https://example.com – explains this.",
    }, {
      label: "a Markdown reference-link label", before: "[Policy][ref?] explains the rule.", after: "[Policy][ref–?] explains the rule.",
    }, {
      label: "a Markdown autolink destination", before: "<https://example.com/policy?> explains the rule.", after: "<https://example.com/policy–?> explains the rule.",
    }, {
      label: "a narrow Markdown reference-label anchor", source: "[Policy][ref?] explains the rule.", before: "ref?", after: "ref–?",
    }, {
      label: "a narrow inline-link destination anchor", source: "[Policy](https://example.com/ref?) explains the rule.", before: "ref?", after: "ref–?",
    }, {
      label: "a narrow autolink destination anchor", source: "<https://example.com/ref?> explains the rule.", before: "ref?", after: "ref–?",
    }, {
      label: "a narrow email-autolink anchor", source: "Contact <user@example.com> for the rule.", before: "example.com", after: "example–.com",
    }, {
      label: "a narrow inline-code anchor", source: "Use `alpha?` as the token.", before: "alpha?", after: "alpha–?",
    }, {
      label: "a narrow bracketed-text anchor", source: "Use [alpha?] as the label.", before: "alpha?", after: "alpha–?",
    }, {
      label: "a narrow fenced-code anchor", source: "~~~text\nalpha?\n~~~", before: "alpha?", after: "alpha–?",
    }, {
      label: "a narrow indented-code anchor", source: "    alpha?", before: "alpha?", after: "alpha–?",
    }, {
      label: "a tab-expanded indented-code anchor", source: " \talpha?", before: "alpha?", after: "alpha–?",
    }, {
      label: "a three-space tab-expanded code anchor", source: "   \talpha?", before: "alpha?", after: "alpha–?",
    }, {
      label: "a tilde-fence info-string anchor", source: "~~~lang?\nalpha\n~~~", before: "lang?", after: "lang–?",
    }, {
      label: "a list-nested tilde-fence anchor", source: "- ~~~text\n  alpha?\n  ~~~", before: "alpha?", after: "alpha–?",
    }, {
      label: "a multiline inline-code anchor", source: "Use `alpha\nbeta?` as the token.", before: "beta?", after: "beta–?",
    }, {
      label: "a multiline link-text anchor", source: "[alpha\nbeta?](https://example.com)", before: "beta?", after: "beta–?",
    }, {
      label: "an HTML-block interior anchor", source: "<div>\nalpha?\n</div>", before: "alpha?", after: "alpha–?",
    }]) {
      const structuralAttack = applyDraftConformancePatch({
        ...initialSource, draft: attack.source ?? attack.before,
      }, {
        ...conformingPatch,
        edits: [{ ...conformingPatch.edits[0], before: attack.before, after: attack.after }],
      }, { request: "Preserve the exact source structure.", profile: targetProfile, card: targetCard });
      t.check(`a named punctuation correction cannot create ${attack.label}`,
        !structuralAttack.ok && structuralAttack.errors.some((error) =>
          /changes lexical content|Markdown code or links/.test(error)));
    }
    const roundCard = {
      schema: "voice-draft-target-card/1",
      measurements: [{
        measurement_id: "round-parenthetical-spans", observation_id: "o01",
        dimensions: ["interruption-punctuation"], aim_count: 0, gate_minimum: 0, gate_maximum: 0,
      }],
    };
    const markdownLinkRemoval = applyDraftConformancePatch({
      ...initialSource, draft: "[the source](https://example.com) explains this.",
    }, {
      ...conformingPatch,
      edits: [{
        before: "[the source](https://example.com) explains this.",
        after: "[the source] https://example.com explains this.",
        reason: "Removes the excess measured parenthetical span.",
        coverage_dimensions: ["interruption-punctuation"],
        measurement_ids: ["round-parenthetical-spans"],
      }],
    }, { request: "Preserve the source link.", profile: targetProfile, card: roundCard });
    t.check("a measured parenthesis correction cannot destroy Markdown link syntax",
      !markdownLinkRemoval.ok
        && markdownLinkRemoval.errors.some((error) => /Markdown code or links/.test(error)));
    const borrowedProfile = structuredClone(targetProfile);
    const borrowedOpening = borrowedProfile.coverage.find((row) => row.dimension === "openings-endings-closure");
    borrowedOpening.status = "described";
    borrowedOpening.observation_ids = ["o01"];
    delete borrowedOpening.unresolved_reason;
    const borrowedCoverage = borrowedProfile.coverage.map((row) => ({
      dimension: row.dimension,
      observation_ids: [...(row.observation_ids ?? [])],
      disposition: row.dimension === "openings-endings-closure" ? "revised"
        : row.dimension === "interruption-punctuation" ? "preserved" : "unresolved",
      reason: row.dimension === "openings-endings-closure"
        ? "The edit claims a closing correction."
        : row.dimension === "interruption-punctuation"
          ? "The measured punctuation row is falsely claimed as preserved."
          : row.unresolved_reason,
    }));
    const borrowedDimension = applyDraftConformancePatch(initialSource, {
      ...conformingPatch,
      edits: [{ ...conformingPatch.edits[0], coverage_dimensions: ["openings-endings-closure"] }],
      coverage: borrowedCoverage,
    }, { request: "Write a 700-word post.", profile: borrowedProfile, card: targetCard });
    t.check("an edit cannot borrow a failing measurement from another coverage dimension",
      !borrowedDimension.ok
        && borrowedDimension.errors.some((error) => /coverage_dimensions must exactly match/.test(error)));
    const contractionProfile = structuredClone(targetProfile);
    const contractionRow = contractionProfile.coverage.find((row) => row.dimension === "contraction-negation");
    contractionRow.status = "described";
    contractionRow.observation_ids = ["o01"];
    delete contractionRow.unresolved_reason;
    const contractionCoverage = contractionProfile.coverage.map((row) => ({
      dimension: row.dimension,
      observation_ids: [...(row.observation_ids ?? [])],
      disposition: row.dimension === "contraction-negation" ? "revised"
        : row.dimension === "interruption-punctuation" ? "preserved" : "unresolved",
      reason: row.dimension === "contraction-negation"
        ? "The edit changes only the measured negative form."
        : row.dimension === "interruption-punctuation"
          ? "The punctuation instruction is preserved."
          : row.unresolved_reason,
    }));
    const contractionCard = {
      schema: "voice-draft-target-card/1",
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 1, gate_maximum: 2,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 0, gate_minimum: 0, gate_maximum: 2,
      }],
    };
    const unnamedCollateral = applyDraftConformancePatch({
      ...initialSource, draft: "The service does not retain data.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "The service does not retain data.", after: "The service doesn't retain data.",
        reason: "Uses the measured contraction form.",
        coverage_dimensions: ["contraction-negation"], measurement_ids: ["contractions"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Reject retention.", profile: contractionProfile, card: contractionCard });
    t.check("an edit must name an in-range measurement whose count it also changes",
      !unnamedCollateral.ok
        && unnamedCollateral.errors.some((error) => /measurement_ids must name every and only changed measurement/.test(error)));
    const ambiguousContraction = applyDraftConformancePatch({
      ...initialSource, draft: "I had completed the review.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "I had completed the review.", after: "I’d completed the review.",
        reason: "Uses the measured contraction form without changing tense.",
        coverage_dimensions: ["contraction-negation"], measurement_ids: ["contractions"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "State that the review had been completed.", profile: contractionProfile, card: contractionCard });
    t.check("an ambiguous 'd contraction passes when one valid expansion preserves exact meaning",
      ambiguousContraction.ok && ambiguousContraction.report.pass);
    const wrongDCard = structuredClone(contractionCard);
    const wrongDContractions = wrongDCard.measurements.find((row) => row.measurement_id === "contractions");
    wrongDContractions.aim_count = 0;
    wrongDContractions.gate_minimum = 0;
    wrongDContractions.gate_maximum = 0;
    const wrongDExpansion = applyDraftConformancePatch({
      ...initialSource, draft: "Yesterday, he'd read the report before lunch.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "Yesterday, he'd read the report before lunch.",
        after: "Yesterday, he would read the report before lunch.",
        reason: "Expands the measured contraction.",
        coverage_dimensions: ["contraction-negation"], measurement_ids: ["contractions"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, {
      request: "State that yesterday he had already read the report before lunch.",
      profile: contractionProfile, card: wrongDCard,
    });
    t.check("a lexically ambiguous 'd contraction cannot fail open to the wrong expansion",
      !wrongDExpansion.ok
        && wrongDExpansion.errors.some((error) => /changes lexical content outside its named measurement forms/.test(error)));
    const wrongRunExpansion = applyDraftConformancePatch({
      ...initialSource, draft: "Tomorrow, he'd run the race.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "Tomorrow, he'd run the race.", after: "Tomorrow, he had run the race.",
        reason: "Expands the measured contraction.",
        coverage_dimensions: ["contraction-negation"], measurement_ids: ["contractions"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, {
      request: "State that tomorrow he would run the race.",
      profile: contractionProfile, card: wrongDCard,
    });
    t.check("an ambiguous source 'd contraction cannot be expanded by guessing from run",
      !wrongRunExpansion.ok
        && wrongRunExpansion.errors.some((error) => /changes lexical content outside its named measurement forms/.test(error)));
    const malformedAintExpansion = applyDraftConformancePatch({
      ...initialSource, draft: "I ain't ready.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "I ain't ready.", after: "I ai not ready.",
        reason: "Expands the measured negative contraction.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, {
      request: "State that I am not ready.", profile: contractionProfile, card: wrongDCard,
    });
    t.check("the unresolved ain't contraction cannot be normalized into ai not",
      !malformedAintExpansion.ok
        && malformedAintExpansion.errors.some((error) => /changes lexical content outside its named measurement forms/.test(error)));
    for (const safe of [{
      label: "would-need 'd", before: "He would need help.", after: "He'd need help.",
    }, {
      label: "is-stable 's", before: "It is stable.", after: "It's stable.",
    }]) {
      const safeContraction = applyDraftConformancePatch({
        ...initialSource, draft: safe.before,
      }, {
        schema: "voice-draft-conformance-patch/1",
        edits: [{
          before: safe.before, after: safe.after,
          reason: "Contracts the explicit source auxiliary without changing meaning.",
          coverage_dimensions: ["contraction-negation"], measurement_ids: ["contractions"],
        }],
        coverage: contractionCoverage, omitted: [],
      }, { request: safe.before, profile: contractionProfile, card: contractionCard });
      t.check(`an explicit source auxiliary safely licenses the ${safe.label} contraction`,
        safeContraction.ok && safeContraction.report.pass);
    }
    const letsProfile = structuredClone(contractionProfile);
    const letsPerson = letsProfile.coverage.find((row) => row.dimension === "person-reader-stance");
    letsPerson.status = "described";
    letsPerson.observation_ids = ["o02"];
    delete letsPerson.unresolved_reason;
    const letsCoverage = letsProfile.coverage.map((row) => ({
      dimension: row.dimension,
      observation_ids: [...(row.observation_ids ?? [])],
      disposition: ["contraction-negation", "person-reader-stance"].includes(row.dimension)
        ? "revised" : row.dimension === "interruption-punctuation" ? "preserved" : "unresolved",
      reason: ["contraction-negation", "person-reader-stance"].includes(row.dimension)
        ? "The edit uses the measured closed let-us contraction without changing its meaning."
        : row.dimension === "interruption-punctuation"
          ? "The punctuation instruction is preserved." : row.unresolved_reason,
    }));
    const letsCard = {
      schema: "voice-draft-target-card/1",
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 1, gate_maximum: 2,
      }, {
        measurement_id: "first-person-plural-family", observation_id: "o02",
        dimensions: ["person-reader-stance"], aim_count: 0, gate_minimum: 0, gate_maximum: 1,
      }],
    };
    const letsContraction = applyDraftConformancePatch({
      ...initialSource, draft: "Let us complete the review.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "Let us complete the review.", after: "Let's complete the review.",
        reason: "Uses the measured closed contraction without changing meaning.",
        coverage_dimensions: ["contraction-negation", "person-reader-stance"],
        measurement_ids: ["contractions", "first-person-plural-family"],
      }],
      coverage: letsCoverage, omitted: [],
    }, { request: "Complete the review.", profile: letsProfile, card: letsCard });
    t.check("the closed let-us contraction remains a valid meaning-equivalent correction",
      letsContraction.ok && letsContraction.report.pass);
    const minimalContractionCard = {
      schema: "voice-draft-target-card/1", word_target: 4,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 1, gate_maximum: 2,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 0, gate_minimum: 0, gate_maximum: 0,
      }],
    };
    const minimalContraction = applyDraftConformancePatch({
      ...initialSource, draft: "It should not.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It should not.", after: "It shouldn't.",
        reason: "Uses the minimum measured negative contraction without changing meaning.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write four words.", profile: contractionProfile, card: minimalContractionCard });
    t.check("a minimum required contraction delta is content-length neutral",
      minimalContraction.ok && minimalContraction.report.pass
        && minimalContraction.word_control.initial_words === 3
        && minimalContraction.word_control.final_words === 2
        && minimalContraction.word_control.contraction_word_delta === -1
        && minimalContraction.word_control.contraction_form_changes === 1
        && minimalContraction.word_control.minimum_required_contraction_changes === 1
        && minimalContraction.word_control.contraction_rows_at_nearest_boundary === true
        && minimalContraction.word_control.target_distance_exception === true);
    const dualDeficitCard = {
      schema: "voice-draft-target-card/1", word_target: 8,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 2, gate_minimum: 2, gate_maximum: 3,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 1, gate_maximum: 2,
      }],
    };
    const dualDeficit = applyDraftConformancePatch({
      ...initialSource, draft: "It isn't ready. It is stable. He would wait.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It isn't ready. It is stable. He would wait.",
        after: "It is not ready. It's stable. He'd wait.",
        reason: "Raises both deficient counters to their nearest boundaries with three coupled changes.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write eight words.", profile: contractionProfile, card: dualDeficitCard });
    t.check("same-direction contraction deficits use the coupled minimum",
      contractionFormChangeCount(
        "It isn't ready. It is stable. He would wait.",
        "It is not ready. It's stable. He'd wait.",
      ) === 3
        && dualDeficit.ok
        && dualDeficit.report.pass
        && dualDeficit.word_control.initial_words === 9
        && dualDeficit.word_control.final_words === 8
        && dualDeficit.word_control.contraction_form_changes === 3
        && dualDeficit.word_control.minimum_required_contraction_changes === 3
        && dualDeficit.word_control.contraction_rows_at_nearest_boundary === true);
    const dualExcessCard = {
      schema: "voice-draft-target-card/1", word_target: 16,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 2, gate_minimum: 1, gate_maximum: 2,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 0, gate_maximum: 1,
      }],
    };
    const dualExcess = applyDraftConformancePatch({
      ...initialSource,
      draft: "It isn't ready. They're stable. We'll wait. She is not late. They do not leave.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It isn't ready. They're stable. We'll wait. She is not late.",
        after: "It isn't ready. They are stable. We will wait. She isn't late.",
        reason: "Lowers both excessive counters to their nearest boundaries with three coupled changes.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write sixteen words.", profile: contractionProfile, card: dualExcessCard });
    t.check("same-direction contraction excesses use the coupled minimum",
      contractionFormChangeCount(
        "It isn't ready. They're stable. We'll wait. She is not late.",
        "It isn't ready. They are stable. We will wait. She isn't late.",
      ) === 3
        && dualExcess.ok
        && dualExcess.report.pass
        && dualExcess.word_control.initial_words === 15
        && dualExcess.word_control.final_words === 16
        && dualExcess.word_control.contraction_form_changes === 3
        && dualExcess.word_control.minimum_required_contraction_changes === 3
        && dualExcess.word_control.contraction_rows_at_nearest_boundary === true);
    const excessiveContractionCard = {
      schema: "voice-draft-target-card/1", word_target: 20,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 0, gate_maximum: 3,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 2, gate_minimum: 0, gate_maximum: 2,
      }],
    };
    const excessiveContraction = applyDraftConformancePatch({
      ...initialSource, draft: "It does not wait. It does not stop. It does not fail.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It does not wait. It does not stop.",
        after: "It doesn't wait. It doesn't stop.",
        reason: "Contracts more negatives than the minimum required correction.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write twenty words.", profile: contractionProfile, card: excessiveContractionCard });
    t.check("an extra contraction cannot borrow the content-neutral word exception",
      !excessiveContraction.ok
        && excessiveContraction.errors.some((error) => /moves farther from the requested 20-word target/.test(error)));
    const mixedDeltaCard = {
      schema: "voice-draft-target-card/1", word_target: 120,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 1, gate_maximum: 3,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 0, gate_maximum: 2,
      }],
    };
    const mixedDelta = applyDraftConformancePatch({
      ...initialSource, draft: `${"context ".repeat(100)}It cannot wait. It does not stop.`,
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It cannot wait. It does not stop.",
        after: "It can't wait. It doesn't stop.",
        reason: "Introduces two contractions although only one is required.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write one hundred twenty words.", profile: contractionProfile, card: mixedDeltaCard });
    t.check("a zero-word contraction cannot hide beside a one-word contraction",
      contractionFormChangeCount("It cannot wait. It does not stop.", "It can't wait. It doesn't stop.") === 2
        && !mixedDelta.ok
        && mixedDelta.word_control.contraction_form_changes === 2
        && mixedDelta.word_control.minimum_required_contraction_changes === 1
        && mixedDelta.errors.some((error) => /moves farther from the requested 120-word target/.test(error)));
    const cancellationCard = {
      schema: "voice-draft-target-card/1", word_target: 12,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 2, gate_minimum: 2, gate_maximum: 3,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 1, gate_maximum: 1,
      }],
    };
    const cancellation = applyDraftConformancePatch({
      ...initialSource, draft: "It should not wait. It is not ready. It isn't done.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It should not wait. It is not ready. It isn't done.",
        after: "It shouldn't wait. It isn't ready. It is not done.",
        reason: "Adds two contractions and expands one while net counts move by one.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write twelve words.", profile: contractionProfile, card: cancellationCard });
    t.check("opposing contraction changes cannot cancel inside the length exception",
      contractionFormChangeCount(
        "It should not wait. It is not ready. It isn't done.",
        "It shouldn't wait. It isn't ready. It is not done.",
      ) === 3
        && !cancellation.ok
        && cancellation.word_control.contraction_form_changes === 3
        && cancellation.word_control.minimum_required_contraction_changes === 1
        && cancellation.word_control.contraction_rows_at_nearest_boundary === true
        && cancellation.errors.some((error) => /moves farther from the requested 12-word target/.test(error)));
    const zeroNetCancellationCard = {
      schema: "voice-draft-target-card/1", word_target: 20,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 2, gate_minimum: 2, gate_maximum: 3,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 1, gate_minimum: 0, gate_maximum: 2,
      }],
    };
    const zeroNetCancellation = applyDraftConformancePatch({
      ...initialSource, draft: "It cannot wait. It is not ready. It isn't done.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It cannot wait. It is not ready. It isn't done.",
        after: "It can't wait. It isn't ready. It is not done.",
        reason: "Adds two contractions and expands one without changing whitespace length.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write twenty words.", profile: contractionProfile, card: zeroNetCancellationCard });
    t.check("zero-net opposing form changes fail even without target movement",
      !zeroNetCancellation.ok
        && zeroNetCancellation.word_control.initial_words === 10
        && zeroNetCancellation.word_control.final_words === 10
        && zeroNetCancellation.word_control.contraction_form_changes === 3
        && zeroNetCancellation.word_control.minimum_required_contraction_changes === 1
        && zeroNetCancellation.word_control.contraction_rows_at_nearest_boundary === true
        && zeroNetCancellation.errors.some((error) => /makes 3 contraction-form changes; minimum is 1/.test(error)));
    const contractedAliasCard = {
      schema: "voice-draft-target-card/1", word_target: 8,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 2, gate_minimum: 2, gate_maximum: 3,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 0, gate_minimum: 0, gate_maximum: 0,
      }],
    };
    const contractedAlias = applyDraftConformancePatch({
      ...initialSource, draft: "It should not wait. It won’t stop.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It should not wait. It won’t stop.",
        after: "It shouldn’t wait. It willn’t stop.",
        reason: "Adds one required contraction while rewriting another contracted surface.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write eight words.", profile: contractionProfile, card: contractedAliasCard });
    t.check("a contracted spelling cannot alias another surface at zero cost",
      contractionFormChangeCount("won’t", "willn’t") === null
        && contractionFormChangeCount("don't", "don’t") === null
        && !contractedAlias.ok
        && contractedAlias.word_control.contraction_form_changes === 0
        && contractedAlias.errors.some((error) => /unrecountable contraction-form changes/.test(error)));
    const coupledBoundaryCard = {
      schema: "voice-draft-target-card/1", word_target: 13,
      measurements: [{
        measurement_id: "contractions", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 2, gate_minimum: 2, gate_maximum: 3,
      }, {
        measurement_id: "uncontracted-negatives", observation_id: "o01",
        dimensions: ["contraction-negation"], aim_count: 2, gate_minimum: 0, gate_maximum: 2,
      }],
    };
    const coupledBoundary = applyDraftConformancePatch({
      ...initialSource, draft: "It should not wait. It is not ready. It does not stop.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "It should not wait. It is not ready.",
        after: "It shouldn't wait. It isn't ready.",
        reason: "Reaches one band but crosses another row's nearest boundary.",
        coverage_dimensions: ["contraction-negation"],
        measurement_ids: ["contractions", "uncontracted-negatives"],
      }],
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write thirteen words.", profile: contractionProfile, card: coupledBoundaryCard });
    t.check("a coupled contraction correction must stop at every nearest boundary",
      !coupledBoundary.ok
        && coupledBoundary.word_control.contraction_form_changes === 2
        && coupledBoundary.word_control.minimum_required_contraction_changes === 2
        && coupledBoundary.word_control.contraction_rows_at_nearest_boundary === false
        && coupledBoundary.errors.some((error) => /moves farther from the requested 13-word target/.test(error)));
    const manyContractionsCard = structuredClone(contractionCard);
    const manyContractionsRow = manyContractionsCard.measurements.find((row) => row.measurement_id === "contractions");
    manyContractionsRow.aim_count = 7;
    manyContractionsRow.gate_minimum = 7;
    manyContractionsRow.gate_maximum = 8;
    const ordinalWords = ["one", "two", "three", "four", "five", "six", "seven"];
    const contractionSentences = ordinalWords.map((word) => `She had completed review ${word}.`);
    const contractedSentences = ordinalWords.map((word) => `She'd completed review ${word}.`);
    const manyContractions = applyDraftConformancePatch({
      ...initialSource, draft: `${"context ".repeat(670)}${contractionSentences.join(" ")}`,
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: contractionSentences.map((before, index) => ({
        before, after: contractedSentences[index],
        reason: "Uses the measured had contraction without changing tense.",
        coverage_dimensions: ["contraction-negation"], measurement_ids: ["contractions"],
      })),
      coverage: contractionCoverage, omitted: [],
    }, { request: "Write 700 words.", profile: contractionProfile, card: manyContractionsCard });
    t.check("multiple unambiguous 'd contractions do not fail through variant explosion",
      manyContractions.ok && manyContractions.report.pass);
    const pronounProfile = structuredClone(targetProfile);
    const pronounRow = pronounProfile.coverage.find((row) => row.dimension === "person-reader-stance");
    pronounRow.status = "described";
    pronounRow.observation_ids = ["o01"];
    delete pronounRow.unresolved_reason;
    const pronounCoverage = pronounProfile.coverage.map((row) => ({
      dimension: row.dimension,
      observation_ids: [...(row.observation_ids ?? [])],
      disposition: row.dimension === "person-reader-stance" ? "revised"
        : row.dimension === "interruption-punctuation" ? "preserved" : "unresolved",
      reason: row.dimension === "person-reader-stance"
        ? "The edit claims to reduce collective self-reference."
        : row.dimension === "interruption-punctuation"
          ? "The punctuation instruction is preserved."
          : row.unresolved_reason,
    }));
    const pronounCard = {
      schema: "voice-draft-target-card/1",
      measurements: [{
        measurement_id: "first-person-plural-family", observation_id: "o01",
        dimensions: ["person-reader-stance"], aim_count: 1, gate_minimum: 0, gate_maximum: 1,
      }],
    };
    const moodShift = applyDraftConformancePatch({
      ...initialSource, draft: "We reject the service. We retain the notes.",
    }, {
      schema: "voice-draft-conformance-patch/1",
      edits: [{
        before: "We reject the service.", after: "Reject the service.",
        reason: "Reduces excess collective self-reference.",
        coverage_dimensions: ["person-reader-stance"], measurement_ids: ["first-person-plural-family"],
      }],
      coverage: pronounCoverage, omitted: [],
    }, { request: "State that the organization rejects the service and retains the notes.", profile: pronounProfile, card: pronounCard });
    t.check("a counted pronoun correction cannot turn a request stance into an imperative",
      !moodShift.ok
        && moodShift.errors.some((error) => /changes lexical content outside its named measurement forms/.test(error)));
    const expandedCard = structuredClone(targetCard);
    expandedCard.measurements.find((row) => row.measurement_id === "en-dashes").gate_maximum = 30;
    const expanded = applyDraftConformancePatch(initialSource, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0],
        after: `It needs a turn ${"– ".repeat(20).trim()} and gets one.`,
      }],
    }, { request: "Write a 700-word post.", profile: targetProfile, card: expandedCard });
    t.check("a patch cannot satisfy counts by materially expanding the draft", !expanded.ok
      && expanded.errors.some((error) => /conformance patch expands/.test(error)));
    const duplicateSource = {
      ...initialSource, draft: "It needs a turn and gets one. It needs a turn and gets one.",
    };
    const ambiguous = applyDraftConformancePatch(duplicateSource, conformingPatch, {
      request: "Write a 700-word post.", profile: targetProfile, card: targetCard,
    });
    t.check("a patch cannot address an ambiguous repeated anchor", !ambiguous.ok
      && ambiguous.errors.some((error) => /before is not unique/.test(error)));
    const firstParagraph = `${"alpha ".repeat(30).trim()}.`;
    const secondParagraph = `${"beta ".repeat(30).trim()}.`;
    const wholesaleSource = {
      ...initialSource, draft: `${firstParagraph}\n\n${secondParagraph}`,
    };
    const paragraphSpanning = applyDraftConformancePatch(wholesaleSource, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0], before: wholesaleSource.draft,
        after: `${"gamma ".repeat(30).trim()}.\n\n${"delta–pivot ".repeat(30).trim()}.`,
      }],
    }, { request: "Write a 700-word post.", profile: targetProfile, card: targetCard });
    t.check("an exact patch anchor cannot span multiple paragraphs", !paragraphSpanning.ok
      && paragraphSpanning.errors.some((error) => /before spans more than one paragraph/.test(error)));
    const paragraphCreating = applyDraftConformancePatch(initialSource, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0], after: "It needs a turn –\n\nand gets one.",
      }],
    }, { request: "Write one paragraph.", profile: targetProfile, card: targetCard });
    t.check("an exact patch replacement cannot create a new paragraph", !paragraphCreating.ok
      && paragraphCreating.errors.some((error) => /after creates more than one paragraph/.test(error)));
    const equalLengthRewrite = applyDraftConformancePatch(wholesaleSource, {
      ...conformingPatch,
      edits: [{
        ...conformingPatch.edits[0], before: firstParagraph,
        after: `${"gamma–pivot ".repeat(30).trim()}.`,
      }, {
        ...conformingPatch.edits[0], before: secondParagraph,
        after: `${"delta ".repeat(30).trim()}.`,
      }],
    }, { request: "Write a 700-word post.", profile: targetProfile, card: targetCard });
    t.check("same-length paragraph replacements cannot turn conformance into a second draft",
      !equalLengthRewrite.ok
        && equalLengthRewrite.errors.some((error) => /replaces 60 source words; maximum is 24/.test(error)));
    t.check("the conformance patch schema remains strict-harness compatible",
      assertStrictOutputSchema(CONFORMANCE_PATCH_SCHEMA, "conformance patch schema") === CONFORMANCE_PATCH_SCHEMA
        && JSON.stringify(CONFORMANCE_MEASUREMENT_IDS)
          === JSON.stringify(PROFILE_MEASUREMENT_RULES.map((rule) => rule.id))
        && JSON.stringify(CONFORMANCE_PATCH_SCHEMA.properties.edits.items.properties.measurement_ids.items.enum)
          === JSON.stringify(CONFORMANCE_MEASUREMENT_IDS));
    t.check("the drafter prompt ends on the provider-neutral semantic source contract",
      /Return voice-draft-source\/4[\s\S]*finished prose directly in draft[\s\S]*do not split it into sentence objects[\s\S]*segments the immutable prose[\s\S]*derives the public verification record/.test(prompt));
    t.check("draft dispatch uses native structure but validates deterministic assembly",
      source.includes('manifestStageSchema(manifest, "draft", DRAFT_SOURCE_SCHEMA)')
        && source.includes("return dispatchModel({")
        && source.includes("assembleVoiceDraft(decoded.source, { request: c.prompt })")
        && source.includes("parseDraft(assembled.output)"));
  }
  {
    const draftSource = {
      schema: "voice-draft-source/4", kind: "draft",
      draft: "Suppose a bill passed.", omitted: [], refused: "",
    };
    const prompt = claimAuditPrompt({ id: "opaque-01", prompt: "Discuss a bill." }, draftSource);
    t.check("claim-audit prompts expose the request and every sentence id but no profile",
      /Discuss a bill\./.test(prompt) && /"id": "p1s1"/.test(prompt)
        && /drafter supplied prose, not factual certification/i.test(prompt)
        && /Audit every deterministic sentence unit/i.test(prompt)
        && /Do not copy evidence; deterministic assembly binds the complete/.test(prompt)
        && !/voice profile/i.test(prompt));
    t.check("the independent auditor must account for every sentence rather than sample the draft",
      /inspect every deterministically supplied sentence unit in[\s\S]*order/.test(claimAuditSource)
        && /one decision for every supplied sentence ID, with no omissions, additions,[\s\S]*or reordering/.test(claimAuditSource));
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

      const fakeCodex = join(failureRoot, "codex");
      const earlyOutput = join(failureRoot, "early-exit.json");
      writeFileSync(fakeCodex, "#!/bin/sh\nexit 91\n");
      chmodSync(fakeCodex, 0o755);
      process.env.PATH = failureRoot;
      let earlyError = "";
      try {
        await dispatchCodex({
          system, prompt: "x".repeat(8 * 1024 * 1024), output: earlyOutput,
          schemaPath, noToolsConfig: [], dispatch,
        });
      } catch (error) { earlyError = error.message; }
      const earlyFailure = existsSync(earlyOutput) ? JSON.parse(readFileSync(earlyOutput, "utf8")) : null;
      t.check("an early Codex exit persists stdin EPIPE instead of escaping without a wrapper",
        /codex (?:stdin failed|exited 91)/.test(earlyError)
          && earlyFailure?.type === "result" && earlyFailure?.is_error === true);
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
        return ["profile", "draft", "conformance", "claim_audit", "critic"].every((stage) =>
          modelAdapterName({ stage, harness: "codex" }) === "codex"
            && modelAdapterName({ stage, harness: "claude-code" }) === "claude-code");
      } catch { return false; }
    })()
      && (() => {
        try { modelAdapterName({ stage: "profile", harness: "unknown" }); return false; }
        catch (error) { return /no adapter/.test(error.message); }
      })());
  t.check("schema provenance follows the selected adapter for every stage",
    ["profile", "draft", "conformance", "claim_audit", "critic"].every((stage) => {
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
        "audit_raw_events", "audit_raw_output", "audit_recovered_from",
        "conformance_raw_events", "conformance_raw_output", "conformance_recovered_from",
        "candidate_raw_events", "candidate_raw_output", "candidate_recovered_from"]
        .every((key) => ARTIFACT_PATH_KEYS.draft.includes(key))
      && (source.match(/\.\.\.codexCompanionArtifactFields\(record\),/g) ?? []).length === 4
      && /codexCompanionArtifactFields\(auditRecord, "audit_"\)/.test(source));
  t.check("final provenance makes every model record immutable and orders all critic companions after the audit checkpoint",
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
  t.check("acceptance locks exact conformance as a required stage rather than an optional canary",
    prepareConfig({}).stages.conformance.transport === "native-structured"
      && /STAGES = \["profile", "draft", "conformance", "claim_audit", "critic"\]/.test(source)
      && /await dispatchConformancePipeline\(runDir, manifest, cases\)/.test(source)
      && /resolveConformedDraft\(runDir, manifest, c\)/.test(source));
  t.check("acceptance locks one semantic revision before the unchanged exact patch",
    source.includes('const MANIFEST_SCHEMA = "prose-author-acceptance-manifest/5"')
      && source.includes('const DRAFT_PIPELINE = "mandatory-semantic-revision/1"')
      && source.includes("draft_pipeline: DRAFT_PIPELINE")
      && source.includes("if (!usesSemanticRevision(manifest))")
      && /await pool\("draft candidate"/.test(source)
      && /await pool\("mandatory semantic revision"/.test(source)
      && /candidate_draft_raw_sha256/.test(source)
      && /resolveSemanticRevision\(runDir, manifest, c\)/.test(source));
  t.check("independent recount validation rejects both divergence and an unlocatable claim",
    recountValidationErrors([{ id: "we/us", status: "DIVERGES", stated: 8, measured: 4 }], "p-r1")
      .some((error) => /diverges/.test(error))
    && recountValidationErrors([{ id: "we/us", status: "unlocatable", measured: 4 }], "p-r1")
      .some((error) => /unlocatable/.test(error)));
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
  t.check("the independent completeness gate treats only the request as supplied factual evidence",
    /The request is the only supplied factual packet/.test(claimAuditSource)
      && !claimAuditSource.includes("supplied by the request/profile"));

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
        schema: "voice-draft-claim-audit/4",
        sentences: sentenceRefs(original).map((ref, index) => index === 1 ? {
          id: ref.id, status: "disclose", reason: "Unledgered population claim.",
          claims: [{
            claim: "Many buyers do not notice the condition.",
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
      t.check("historical source/3 checking prunes an unused ledger suffix and preserves an audit-owned claim overlay",
        disclosed?.normalized && !disclosed.repaired
          && disclosed.removedLedgerIds.join(",") === "c2"
          && disclosed.finalSource.ledger.length === 1
          && disclosed.finalSource.paragraphs === disclosed.normalizedSource.paragraphs
          && disclosed.auditClaims.length === 1
          && disclosed.auditClaims[0].sentence_id === "p1s2");
      put("claim-audits", c.id, initialAudit, "claim_audit");
      let downgradeRejected = false;
      try { resolveDraftChain(chainRoot, manifest, c); } catch (error) {
        downgradeRejected = /audit-disclosure\/1 requires voice-draft-claim-audit\/4/.test(error.message);
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
    const conformanceConfig = manifestDispatch({ concurrency: 1, dispatch: { conformance: {
      harness: "codex", model: "locked-model", effort: "medium",
      transport: "native-structured", timeout_ms: 1234,
    } } }, "conformance");
    t.check("a locked canary can dispatch the optional deterministic conformance stage",
      conformanceConfig.stage === "conformance" && conformanceConfig.harness === "codex"
        && conformanceConfig.concurrency === 1);
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
      t.check("critic invocation provenance can bind an exact pre-dispatch independent audit checkpoint",
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
        t.check("the completed independent audit checkpoint is immutable and critic evidence is committed strictly after it",
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
      schema: "voice-draft-source/4", kind: "draft",
      draft: "Developers feel this gap when access still depends on approval.", omitted: [], refused: "",
    };
    t.check("the independent review template carries deterministic candidates rather than a blank checklist",
      sentenceReviewTemplate(candidateSource)[0].candidate_reasons.includes("population-or-institution")
        && sentenceReviewTemplate(candidateSource)[0].candidate_reasons.includes("capability-or-dependence"));
    t.check("a plainly normative sentence is not promoted into a factual candidate",
      factualCandidateReasons("We should require the advertised core functions to remain usable.").length === 0);
  }
  t.check("model dispatch has a hard timeout instead of waiting indefinitely",
    /ACCEPTANCE_MODEL_TIMEOUT_MS/.test(source)
      && /child\.kill\("SIGTERM"\)/.test(source)
      && /exceeded \$\{dispatch\.timeout_ms\}ms/.test(source));
  t.check("every subprocess stdin failure is persisted instead of escaping as an unhandled EPIPE",
    (source.match(/child\.stdin\.on\("error", \(error\) => \{ fail\(`/g) ?? []).length === 2
      && /codex stdin failed: \$\{error\.message\}/.test(source)
      && /claude stdin failed: \$\{error\.message\}/.test(source));
  t.check("every acceptance dispatch performs the closed-world evidence preflight before pooling calls",
    (source.match(/const preflightErrors = dispatchPreflightErrors\(runDir, manifest, cases, "(?:profile|draft|critic)"\);/g) ?? []).length === 4
      && (source.match(/acceptance evidence preflight failed; no (?:profile|draft|critic) calls were made/g) ?? []).length === 3);
  t.check("dispatch preflight rederives every prior producer phase before permitting its consumer",
    /deriveProfileEvidence\(runDir, manifest, cases\)/.test(source)
      && /deriveDraftEvidence\(runDir, manifest, cases\)/.test(source)
      && /existingDraftStageInputErrors\(runDir, manifest, cases\)/.test(source)
      && /existingCriticStageInputErrors\(runDir, manifest, cases\)/.test(source)
      && /committedCurrentError\(join\(runDir, "ARTIFACTS\.json"\)\)/.test(source));
  t.check("critic preflight revalidates earlier draft and audit prompts before any critic call",
    /if \(\["draft", "critic"\]\.includes\(phase\)\) \{[\s\S]{0,120}errors\.push\(\.\.\.existingDraftStageInputErrors\(runDir, manifest, cases\)\)/.test(source));
  t.check("final collection validates the complete graph read-only before writing any canonical output",
    /function collect\(runDir\) \{[\s\S]*dispatchPreflightErrors\(runDir, manifest, cases, "critic"\)[\s\S]*deferCanonical: true[\s\S]*writeCanonical: true/.test(source)
      && !/function collect\(runDir\) \{[\s\S]{0,240}collectDrafts\(runDir\)/.test(source)
      && /acceptance finalization preflight failed; no files were written/.test(source));
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
      && (source.match(/errors\.push\(\.\.\.stagedInputErrors\(runDir, manifest, cases\)\)/g) ?? []).length === 2
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
        corpora: { p: {
          staged: namespaceRoot, source: namespaceRoot, lock: { files: [] },
        } },
      };
      const namespaceCases = {
        profiles: [{ id: "p", renders: 1 }],
        cases: [{ id: "d", profile: "p" }], refusals: [{ id: "r", profile: "p" }],
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
      const disguisedWrapper = join(namespaceRoot, "outputs", "moved-call.archive");
      mkdirSync(dirname(disguisedWrapper), { recursive: true });
      writeFileSync(disguisedWrapper, "arbitrary archived bytes that do not identify their source\n");
      const futureCriticSource = join(namespaceRoot, "critics", "sources", "d-d1.json");
      mkdirSync(dirname(futureCriticSource), { recursive: true });
      writeFileSync(futureCriticSource, "archived failed wrapper bytes\n");
      const tamperedNamespace = artifactHashErrors(
        null, namespaceRoot, namespaceCases, namespaceManifest,
      ).filter((error) => error.startsWith("raw namespace"));
      const preflight = dispatchPreflightErrors(namespaceRoot, namespaceManifest, namespaceCases, "critic");
      const profilePreflight = dispatchPreflightErrors(
        namespaceRoot, namespaceManifest, namespaceCases, "profile",
      );
      t.check("raw namespaces reject orphan redraws, extra critic draws, and missing companions",
        cleanNamespace.length === 0
          && tamperedNamespace.some((error) => /unindexed-redraw\.codex-events\.jsonl/.test(error))
          && tamperedNamespace.some((error) => /d-d4\.json/.test(error))
          && tamperedNamespace.some((error) => /missing expected file d-d3\.codex-output\.json/.test(error))
          && tamperedNamespace.some((error) => /critics[/\\]failures[/\\]d-d1\.failed\.codex-events\.jsonl/.test(error))
          && tamperedNamespace.some((error) => /outputs[/\\]moved-call\.archive/.test(error)));
      t.check("dispatch preflight rejects undeclared archived evidence before any model adapter runs",
        preflight.some((error) => /critics[/\\]failures[/\\]d-d1\.failed\.json/.test(error))
          && preflight.some((error) => /outputs[/\\]moved-call\.archive/.test(error))
          && preflight.some((error) => /critics[/\\]sources[/\\]d-d1\.json/.test(error)));
      t.check("dispatch preflight rejects files owned by a future producer phase",
        profilePreflight.some((error) => /raw[/\\]p-r1\.md/.test(error))
          && profilePreflight.some((error) => /critics[/\\]raw[/\\]d-d1\.json/.test(error)));
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
  {
    const derived = {
      transport_repairs: 0,
      source_normalizations: { duplicate_support_files_removed: 1 },
      coverage: [{ id: "person-number-reader-stance", status: "covered" }],
      recount: [{ id: "question-marks", stated: 2, measured: 2, status: "MATCHES" }],
    };
    const missing = clone(derived);
    delete missing.source_normalizations;
    const tampered = clone(derived);
    tampered.source_normalizations.duplicate_support_files_removed = 0;
    t.check("profile normalization metadata is required and reproduces exactly from immutable raw source",
      profileEvidenceMetadataErrors(clone(derived), derived, "fixture-r1").length === 0
        && profileEvidenceMetadataErrors(missing, derived, "fixture-r1")
          .some((error) => /source_normalizations metadata is missing/.test(error))
        && profileEvidenceMetadataErrors(tampered, derived, "fixture-r1")
          .some((error) => /does not reproduce from raw/.test(error)));
  }
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
      const repoRoot = resolve(HERE, "../../..");
      const draftPath = join(auditRoot, "inputs", "drafts", "x.txt");
      const sourcePath = join(auditRoot, "inputs", "sources", "drafts", "x.json");
      const canonicalAuditPath = join(auditRoot, "inputs", "audits", "x.json");
      mkdirSync(dirname(draftPath), { recursive: true });
      mkdirSync(dirname(sourcePath), { recursive: true });
      mkdirSync(dirname(canonicalAuditPath), { recursive: true });
      const draft = "The supplied phrase appears.\n";
      const draftHash = createHash("sha256").update(draft).digest("hex");
      const auditCases = { cases: [{
        id: "x", prompt: "Write about ownership choices. Include this exact sentence: The supplied phrase appears.",
      }] };
      const sourceRecord = {
        schema: "voice-draft-source/4", kind: "draft",
        draft: draft.trim(), omitted: [], refused: "",
      };
      const independentAudit = {
        schema: "voice-draft-claim-audit/4",
        sentences: [{
          id: "p1s1", status: "keep", reason: "The request supplies the complete assertion.", claims: [],
        }],
      };
      writeFileSync(draftPath, draft);
      writeFileSync(sourcePath, `${JSON.stringify(sourceRecord, null, 2)}\n`);
      writeFileSync(canonicalAuditPath, `${JSON.stringify(independentAudit, null, 2)}\n`);
      const auditHash = createHash("sha256").update(readFileSync(canonicalAuditPath)).digest("hex");
      const auditPromptHash = "c".repeat(64);
      const auditRawHash = "d".repeat(64);
      const auditAgentHash = "a".repeat(64);
      const draftAgentHash = "b".repeat(64);
      const dispatch = {
        harness: "codex", model: "locked-auditor", effort: "low", transport: "native-structured",
        timeout_ms: 100,
      };
      writeFileSync(join(auditRoot, "MANIFEST.json"), `${JSON.stringify({
        concurrency: 1,
        agents: {
          claim_audit: { sha256: auditAgentHash }, draft: { sha256: draftAgentHash },
        },
        dispatch: { claim_audit: dispatch },
      }, null, 2)}\n`);
      const provenance = {
        mode: "independent-model-audit",
        claim_audit_schema: "voice-draft-claim-audit/4",
        audit_agent_sha256: auditAgentHash,
        draft_agent_sha256: draftAgentHash,
        harness: dispatch.harness,
        model: dispatch.model,
        effort: dispatch.effort,
        transport: dispatch.transport,
      };
      const review = {
        ...sentenceReviewTemplate(sourceRecord)[0],
        decision: "cleared",
        note: independentAudit.sentences[0].reason,
      };
      const checkpoint = {
        schema: "prose-author-claims-audit/6", provenance, instructions: [], drafts: { x: {
          draft_sha256: draftHash,
          audit_prompt_sha256: auditPromptHash,
          audit_raw_sha256: auditRawHash,
          audit_sha256: auditHash,
          claims: [],
          quoted_spans: quotationAudit(draft, auditCases.cases[0].prompt),
          sentence_reviews: [review],
          note: "Deterministically assembled from the immutable independent claim-audit result.",
        } },
      };
      const artifacts = { drafts: { x: {
        draft_sha256: draftHash,
        audit_prompt_sha256: auditPromptHash,
        audit_raw_sha256: auditRawHash,
        source: relative(repoRoot, sourcePath),
        source_sha256: createHash("sha256").update(readFileSync(sourcePath)).digest("hex"),
        audit: relative(repoRoot, canonicalAuditPath),
        audit_sha256: auditHash,
        disclosure: null,
        disclosure_sha256: null,
      } } };
      t.check("independent sentence decisions are rederived from canonical source, audit, and disclosure",
        claimsAuditFailures(checkpoint, auditCases, artifacts, auditRoot).length === 0
          && claimsAuditFailures({ ...checkpoint, drafts: { x: { ...checkpoint.drafts.x,
            draft_sha256: "0".repeat(64),
          } } }, auditCases, artifacts, auditRoot).some((error) => /audited draft hash drifted/.test(error))
          && /claimsAuditFailures\(json\(p\.audit\), cases, artifacts, runDir\)/.test(source));
      t.check("the checkpoint binds each independent audit prompt, raw response, and canonical output",
        claimsAuditFailures({ ...checkpoint, drafts: { x: { ...checkpoint.drafts.x,
          audit_prompt_sha256: "e".repeat(64),
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /independent audit prompt hash drifted/.test(error))
        && claimsAuditFailures({ ...checkpoint, drafts: { x: { ...checkpoint.drafts.x,
          audit_raw_sha256: "f".repeat(64),
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /independent audit raw hash drifted/.test(error))
        && /audit_prompt_sha256: artifacts\.drafts\[c\.id\]\.audit_prompt_sha256/.test(source)
        && /audit_raw_sha256: artifacts\.drafts\[c\.id\]\.audit_raw_sha256/.test(source));
      t.check("a scalar completeness assertion cannot replace a sentence decision",
        claimsAuditFailures({ ...checkpoint, drafts: { x: { ...checkpoint.drafts.x,
          sentence_reviews: [{ ...review, decision: null }],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /has no completed independent decision/.test(error)));
      t.check("omitting one independent sentence review cannot assert completeness by omission",
        claimsAuditFailures({ ...checkpoint, drafts: { x: { ...checkpoint.drafts.x,
          sentence_reviews: [],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /sentence review covers 0 of 1 sentence units/.test(error)));
      t.check("candidate reasons and sentence hashes remain immutable source-derived evidence",
        claimsAuditFailures({ ...checkpoint, drafts: { x: { ...checkpoint.drafts.x,
          sentence_reviews: [{ ...review, candidate_reasons: ["frequency-or-quantity"] }],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /does not reproduce from the immutable independent audit/.test(error)));
      t.check("independent clearance rationale is exact and substantive",
        claimsAuditFailures({ ...checkpoint, drafts: { x: { ...checkpoint.drafts.x,
          sentence_reviews: [{ ...review, note: "too short" }],
        } } }, auditCases, artifacts, auditRoot)
          .some((error) => /substantive independent-auditor rationale/.test(error)));
      t.check("critic-unlocking review requires exact independent-auditor provenance",
        claimsAuditFailures({ ...checkpoint, provenance: {
          ...provenance, audit_agent_sha256: draftAgentHash,
        } }, auditCases, artifacts, auditRoot)
          .some((error) => /does not separate drafting from claim auditing/.test(error))
        && claimsAuditFailures({ ...checkpoint, provenance: {
          ...provenance, model: "mutable-alternate",
        } }, auditCases, artifacts, auditRoot)
          .some((error) => /does not reproduce from the locked manifest/.test(error)));
      const alternateSourcePath = join(auditRoot, "alternate", "x.json");
      mkdirSync(dirname(alternateSourcePath), { recursive: true });
      writeFileSync(alternateSourcePath, `${JSON.stringify({
        ...sourceRecord, draft: "This should change.",
      }, null, 2)}\n`);
      t.check("final checking refuses an artifact pointer to an alternate valid-hash source",
        claimsAuditFailures(checkpoint, auditCases, { drafts: { x: {
          ...artifacts.drafts.x,
          source: relative(repoRoot, alternateSourcePath),
          source_sha256: createHash("sha256").update(readFileSync(alternateSourcePath)).digest("hex"),
        } } }, auditRoot)
          .some((error) => /artifact source is not the canonical raw-derived source/.test(error)));
      const alternateAuditPath = join(auditRoot, "alternate", "audit.json");
      writeFileSync(alternateAuditPath, `${JSON.stringify(independentAudit, null, 2)}\n`);
      t.check("final checking refuses an artifact pointer to an alternate claim audit",
        claimsAuditFailures(checkpoint, auditCases, { drafts: { x: {
          ...artifacts.drafts.x,
          audit: relative(repoRoot, alternateAuditPath),
          audit_sha256: createHash("sha256").update(readFileSync(alternateAuditPath)).digest("hex"),
        } } }, auditRoot)
          .some((error) => /artifact audit is not the canonical independent result/.test(error)));

      const factualDraft = "Acme released version 2. Most users prefer it.\n";
      const factualSource = {
        schema: "voice-draft-source/4", kind: "draft", draft: factualDraft.trim(), omitted: [], refused: "",
      };
      const factualAudit = {
        schema: "voice-draft-claim-audit/4", sentences: [{
          id: "p1s1", status: "disclose", reason: "Named release is an external fact.", claims: [{
            claim: "Acme released version 2.", kind: "bounded-fact",
            verification_question: "Did Acme release version 2?",
          }],
        }, {
          id: "p1s2", status: "disclose", reason: "Population preference is external.", claims: [{
            claim: "Most users prefer Acme version 2.", kind: "broad-generalization",
            verification_question: "What population evidence establishes this preference?",
          }],
        }],
      };
      const disclosurePath = join(auditRoot, "inputs", "records", "x.json");
      mkdirSync(dirname(disclosurePath), { recursive: true });
      const factualClaims = [
        { claim: "Acme released version 2.", where: "paragraph 1" },
        { claim: "Most users prefer Acme version 2.", where: "paragraph 1" },
      ];
      writeFileSync(draftPath, factualDraft);
      writeFileSync(sourcePath, `${JSON.stringify(factualSource, null, 2)}\n`);
      writeFileSync(canonicalAuditPath, `${JSON.stringify(factualAudit, null, 2)}\n`);
      writeFileSync(disclosurePath, `${JSON.stringify({
        schema: "voice-draft/1", claims: factualClaims,
      }, null, 2)}\n`);
      const factualAuditHash = createHash("sha256").update(readFileSync(canonicalAuditPath)).digest("hex");
      const templates = sentenceReviewTemplate(factualSource);
      const factualCheckpoint = {
        schema: "prose-author-claims-audit/6", provenance, instructions: [], drafts: { x: {
          draft_sha256: createHash("sha256").update(factualDraft).digest("hex"),
          audit_prompt_sha256: auditPromptHash,
          audit_raw_sha256: auditRawHash,
          audit_sha256: factualAuditHash,
          claims: factualClaims,
          quoted_spans: [],
          sentence_reviews: [
            { ...templates[0], decision: "listed-for-verification", claim_refs: [factualClaims[0].claim], note: factualAudit.sentences[0].reason },
            { ...templates[1], decision: "listed-for-verification", claim_refs: [factualClaims[1].claim], note: factualAudit.sentences[1].reason },
          ],
          note: "Deterministically assembled from the immutable independent claim-audit result.",
        } },
      };
      const factualArtifacts = { drafts: { x: {
        draft_sha256: factualCheckpoint.drafts.x.draft_sha256,
        audit_prompt_sha256: auditPromptHash,
        audit_raw_sha256: auditRawHash,
        source: relative(repoRoot, sourcePath),
        source_sha256: createHash("sha256").update(readFileSync(sourcePath)).digest("hex"),
        audit: relative(repoRoot, canonicalAuditPath),
        audit_sha256: factualAuditHash,
        disclosure: relative(repoRoot, disclosurePath),
        disclosure_sha256: createHash("sha256").update(readFileSync(disclosurePath)).digest("hex"),
      } } };
      t.check("a same-paragraph claim cannot cover a different audited sentence",
        claimsAuditFailures({ ...factualCheckpoint, drafts: { x: { ...factualCheckpoint.drafts.x,
          sentence_reviews: [factualCheckpoint.drafts.x.sentence_reviews[0], {
            ...factualCheckpoint.drafts.x.sentence_reviews[1], claim_refs: [factualClaims[0].claim],
          }],
        } } }, auditCases, factualArtifacts, auditRoot)
          .some((error) => /claim refs do not match the exact canonical sentence inventory/.test(error)));
      t.check("a canonical disclosure cannot be hidden behind a null artifact pointer",
        claimsAuditFailures(factualCheckpoint, auditCases, { drafts: { x: {
          ...factualArtifacts.drafts.x, disclosure: null, disclosure_sha256: null,
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
    t.check("duplicate critic categories remain a deterministic semantic failure",
      !validateVoiceCriticSource({
        ...sourceRecord, clean_categories: ["register-breaks", "register-breaks"],
      }, { rhythmScanSupplied: false }).ok);
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

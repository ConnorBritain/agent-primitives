/**
 * voice-draft — the hold, the output contract, and the corpus firewall
 *
 * Split out of selftest.mjs, which had grown to 1164 lines across three unrelated
 * primitives while their logic modules were already separate. Each suite exports a
 * `run(t, ctx)` so the shared temp dir and counters stay in one place and the
 * assertions live next to the thing they describe.
 */

import { readdirSync, existsSync as fsExists, readFileSync as fsRead } from "node:fs";
import { join, resolve } from "node:path";
import {
  assembleVoiceDraft, normalizeVoiceDraftSource, SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA,
  validateVoiceDraftSource,
} from "../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA as DRAFT_AUDIT_SCHEMA, sentenceRefs,
} from "../skills/prose-draft/tools/draft-claim-audit.mjs";
import {
  claimRepairEligibilityErrors, claimRepairRejectedIds, validateVoiceDraftClaimRepair,
} from "../skills/prose-draft/tools/draft-claim-repair.mjs";
import { validateDraft, parseDraft, loadRun, corpusLeakage, findFabricatedCitations } from "./voice-draft.mjs";
import { fixtureGuards, staleExemptions } from "./fixture-guard.mjs";

export async function run(t, { HERE }) {
  t.group("voice-draft — the hold, and the fixtures staying out of the prompt");
  {
    // Same guard shape as voice-profile-render's. The shipped branch is dead code
    // while the primitive is held, and is written anyway so that lifting the hold
    // does not also require writing the check that would have caught a bad lift.
    const dir = resolve(HERE, "..", "..", "..", "primitives", "agents", "voice-draft");
    const metaPath = join(dir, "meta.yaml");
    const meta = fsExists(metaPath) ? fsRead(metaPath, "utf8") : "";
    const held = /^ships:\s*false\b/m.test(meta);
    const shipped = /^ships:\s*true\b/m.test(meta);
    const rendered = resolve(HERE, "..", "agents", "voice-draft.md");

    t.check("voice-draft: meta.yaml declares ships as exactly one of true or false", held !== shipped);
    t.check("voice-draft: a held primitive is absent from the bundle's agents/ directory",
      !held || !fsExists(rendered));
    t.check("voice-draft: a held primitive declares a held_reason", !held || /^held_reason:\s*\S/m.test(meta));
    t.check("voice-draft: declares kind: author", /^kind:\s*author\b/m.test(meta));

    // The firewall, declared. Flipping any of these should require editing the line
    // rather than quietly widening the allowlist.
    t.check("voice-draft: declares reads_corpus: false", /^\s*reads_corpus:\s*false\b/m.test(meta));
    t.check("voice-draft: declares reads_catalog: false", /^\s*reads_catalog:\s*false\b/m.test(meta));
    t.check("voice-draft: the claude-code tool allowlist is empty — the firewall is structural",
      /^\s*tools:\s*\[\s*\]\s*$/m.test(meta));
    t.check("voice-draft: Codex metadata names the current source and preserved historical readers",
      /voice-draft-source\/5/.test(meta)
        && /observed rates remain advisory/.test(meta)
        && /Historical source\/1, source\/2, source\/3 and source\/4 artifacts remain readable/.test(meta));

    const agentPath = join(dir, "agent.md");
    if (fsExists(agentPath)) {
      const src = fsRead(agentPath, "utf8");
      const fm = /^---\n([\s\S]*?)\n---\n/.exec(src);
      const keys = fm ? fm[1].split("\n").filter((l) => /^\w[\w-]*:/.test(l)).map((l) => l.split(":")[0]) : [];
      t.check("voice-draft: agent.md frontmatter carries only name + description",
        JSON.stringify(keys.sort()) === JSON.stringify(["description", "name"]));

      // Same lesson as voice-profile-render's v2 leak: a prompt that names the
      // fixture is a prompt that can hand over the finding the run then credits it
      // with making.
      const prompt = src.toLowerCase();
      const fixtures = resolve(HERE, "fixtures", "profiles");

      t.check("voice-draft: no fixture claims a not-author-named exemption it no longer needs",
        staleExemptions(fixtures).length === 0, staleExemptions(fixtures).join(", "));

      for (const { fixture: name, tokens } of fixtureGuards(fixtures)) {
        t.check(`voice-draft prompt does not name the ${name} fixture`, !prompt.includes(name.toLowerCase()));
        const leakedTokens = tokens.filter((tok) => prompt.includes(tok));
        t.check(`voice-draft prompt names no author of the ${name} corpus`,
          leakedTokens.length === 0, leakedTokens.join(", "));
      }

      // PI-02 ship blocker: a render's ten coverage rows are useful only if the
      // drafter reads every row. These assertions pin the prompt-side protocol rather
      // than pretending a deterministic selftest can grade a model-written draft.
      const coverageDimensions = [
        "person-reader-stance", "contraction-negation", "qualification-hedging",
        "questions-imperatives-vocatives", "opponents-allies-sources",
        "profanity-vulgarity", "self-reference-biography", "interruption-punctuation",
        "figures-analogy", "openings-endings-closure",
      ];
      t.check("voice-draft: names all ten voice-profile/3 coverage dimensions",
        coverageDimensions.every((dimension) => prompt.includes(`\`${dimension}\``)),
        coverageDimensions.filter((dimension) => !prompt.includes(`\`${dimension}\``)).join(", "));
      // Preserve the old protocol's assertions against its exact historical prompt.
      // Current behavior/parity is exercised by suite-runtime-v040, not these quotas.
      const legacySrc = fsRead(join(HERE, "fixtures/historical-v030/voice-draft/agent.md"), "utf8");
      const legacyPrompt = legacySrc.toLowerCase();
      for (const status of ["rated", "described", "absent-paired", "unresolved"]) {
        t.check(`historical v0.3 voice-draft: defines how to process ${status} coverage`,
          new RegExp(`\\*\\*\\\`${status}\\\`\\*\\*`).test(legacyPrompt));
      }
      t.check("historical v0.3 voice-draft: resolves supported coverage through observation ids",
        /resolve each supported entry through its `observation_ids`/.test(legacyPrompt));
      t.check("historical v0.3 voice-draft: remains compatible with historical voice-profile/1 inputs",
        /older `voice-profile\/1` profiles have no coverage table[\s\S]*remain usable/.test(legacyPrompt));
      t.check("historical v0.3 voice-draft: silently dropping any supported instruction requires an omission record",
        /whether its status is `rated`, `described`, or `absent-paired`[\s\S]*put it in `omitted`/.test(legacyPrompt));
      t.check("historical v0.3 voice-draft: audits each named actor action and consequence independently",
        /every proper name and quotation[\s\S]*every factual verb and consequence attached to it/.test(legacySrc));
      t.check("historical v0.3 voice-draft: an attributed quotation must be supplied verbatim",
        /attributed quoted words must appear[\s\S]*in the request or in real source material[\s\S]*remove the[\s\S]{0,24}attribution and quotation marks/i.test(legacySrc));
      t.check("historical v0.3 voice-draft: v2 omissions identify the dimension and every observation",
        /for `voice-profile\/2`, name the coverage dimension and every affected observation id in `habit`/.test(legacyPrompt));
      t.check("historical v0.3 voice-draft: deterministic target cards own measured arithmetic while described habits stay qualitative",
        /deterministic draft target card[\s\S]*aim at its stated count[\s\S]*min\/max range[\s\S]*qualitative `described` observation has no numeric quota/.test(legacyPrompt));
      t.check("historical v0.3 voice-draft: conformance mode emits exact minimal patches rather than another candidate draft",
        /explicitly requests `voice-draft-conformance-patch\/1`[\s\S]*not another candidate draft/.test(legacyPrompt)
          && /Every `before` value must copy one exact, unique[\s\S]*one paragraph or less/.test(legacySrc)
          && /Return exactly ten coverage rows[\s\S]*`revised` row must be named by an[\s\S]*edit/.test(legacySrc)
          && /measurement_ids[\s\S]*exact token printed inside `\[measurement:\.\.\.\]`[\s\S]*never an observation id/.test(legacyPrompt)
          && /minimum unavoidable whitespace-word delta[\s\S]*content-length[\s\S]*neutral[\s\S]*extra form change still fails/.test(legacyPrompt)
          && /rejects non-unique or overlapping anchors[\s\S]*out-of-range final[\s\S]*counts/.test(legacySrc));
      if (shipped && fsExists(rendered)) {
        const strip = (s) => s.replace(/^---\n[\s\S]*?\n---\n/, "");
        t.check("voice-draft: rendered body is byte-identical to primitives/ source (AGENTS.md rule 1)",
          strip(src) === strip(fsRead(rendered, "utf8")));
      }
    } else {
      t.check("voice-draft: agent.md exists", false);
    }
  }

  t.group("historical v0.3 draft prompt regressions — frozen quota protocol");
  {
    const agentPath = join(HERE, "fixtures/historical-v030/voice-draft/agent.md");
    const src = fsRead(agentPath, "utf8").toLowerCase();
    const fixturePath = resolve(HERE, "fixtures", "voice-draft-regressions", "safeguards.json");
    t.check("the five drafter safeguard regressions are checked in", fsExists(fixturePath), fixturePath);
    const fixture = fsExists(fixturePath)
      ? JSON.parse(fsRead(fixturePath, "utf8"))
      : { schema: null, cases: [] };
    t.check("drafter safeguards use the versioned regression-fixture schema",
      fixture.schema === "voice-draft-regressions/1");
    const expected = [
      "fabricated-first-person-employer",
      "possessive-pronoun-referent-slip",
      "dropped-rated-parentheticals",
      "dropped-rated-figure-vocabulary",
      "positive-rate-hides-counted-absence",
    ];
    const ids = fixture.cases.map((c) => c.id);
    t.check("the regression fixture covers all five measured failures exactly once",
      JSON.stringify(ids.sort()) === JSON.stringify([...expected].sort()), ids.join(", "));
    t.check("every safeguard fixture ties a bad draft to coverage evidence and an expected action",
      fixture.cases.every((c) => c.coverage_dimension && c.coverage_status
        && c.profile_evidence && c.bad_draft && c.expected_safeguard));
    const byId = Object.fromEntries(fixture.cases.map((c) => [c.id, c]));
    t.check("the biography regression lacks profile support for the invented employer",
      !/employer/i.test(byId["fabricated-first-person-employer"]?.profile_evidence ?? "")
        && /employer/i.test(byId["fabricated-first-person-employer"]?.bad_draft ?? ""));
    t.check("the referent regression contains the your-to-our ownership slip",
      /\byour\b/i.test(byId["possessive-pronoun-referent-slip"]?.bad_draft ?? "")
        && /\bour\b/i.test(byId["possessive-pronoun-referent-slip"]?.bad_draft ?? ""));
    t.check("the interruption regression is a rated non-zero parenthetical dropped to zero",
      byId["dropped-rated-parentheticals"]?.coverage_status === "rated"
        && /5\.05 per 1,000/i.test(byId["dropped-rated-parentheticals"]?.profile_evidence ?? "")
        && /\bno round-bracketed span\b/i.test(byId["dropped-rated-parentheticals"]?.bad_draft ?? ""));
    t.check("the figure regression distinguishes rated vocabulary from generic analogy",
      /vocabulary at 0\.80 per 1,000/i.test(byId["dropped-rated-figure-vocabulary"]?.profile_evidence ?? "")
        && /none of the referenced figure vocabulary/i.test(byId["dropped-rated-figure-vocabulary"]?.bad_draft ?? ""));
    t.check("the absence regression can pass the positive rate while failing its pair",
      byId["positive-rate-hides-counted-absence"]?.coverage_status === "absent-paired"
        && /contraction rate is in band/i.test(byId["positive-rate-hides-counted-absence"]?.bad_draft ?? "")
        && /uncontracted negatives recur/i.test(byId["positive-rate-hides-counted-absence"]?.bad_draft ?? ""));

    const policies = [
      ["first-person grammar does not invent biography",
        /first person is grammar, not biography[\s\S]*never invent an employer/],
      ["unsupported author facts are removed rather than laundered through claims",
        /request does not supply the fact, remove or recast it[\s\S]*independent audit will reject invented author biography/],
      ["the request is the factual packet while the profile remains voice evidence",
        /request as the only supplied factual packet[\s\S]*profile is[\s\S]*not a research packet[\s\S]*pretrained memory is not verified evidence/],
      ["materials that cannot be truthfully reconstructed become omissions",
        /says this author cites sources, quotes named people, gives exact figures[\s\S]*do not have a real source[\s\S]*leave the habit out[\s\S]*record it/i],
      ["the expressive pass emits direct prose for later independent certification",
        /voice-draft-source\/4[\s\S]*finished piece directly in the[\s\S]*`draft` string[\s\S]*segments the immutable prose/],
      ["ordinary request entailments do not license contingent predicates",
        /ordinary lexical entailments[\s\S]*does not supply a contingent[\s\S]*industry practice/],
      ["external claims must be finite rather than unverifiable generalizations",
        /one to three bounded specifics[\s\S]*named actor's concrete action[\s\S]*particular[\s\S]*law or case[\s\S]*finite figure/],
      ["argumentative pieces prefer a few bounded specifics over broad remembered claims",
        /pretrained memory is not verified evidence[\s\S]*small number of[\s\S]*one to three bounded specifics[\s\S]*cloud of unsupported generalization/],
      ["named-source voice habits cannot authorize invented topical examples",
        /frequency tells you how often[\s\S]*never licenses inventing the material[\s\S]*leave the habit out[\s\S]*record it/],
      ["paraphrased opponent positions count as attribution",
        /do not invent an opponent's position, likely response[\s\S]*vendor will say[\s\S]*still attribution even without quotation marks/],
      ["an omitted source habit cannot reappear as a synthetic unnamed position",
        /omit `opponents-allies-sources` for lack of material[\s\S]*must not synthesize an[\s\S]*unnamed position as a substitute/],
      ["the final pronoun pass checks ownership and inclusive groups",
        /final pronoun and referent check[\s\S]*person, number, ownership, or inclusive group/],
      ["semantic-bearing count bands are literal final-output budgets",
        /hard pre-return limit[\s\S]*literal final-output budget[\s\S]*conformance patch is forbidden from repairing/],
      ["semantic-bearing generation targets keep an interior safety margin",
        /hits its exact operational target[\s\S]*min\/max range is the unchanged downstream checker, not your working budget[\s\S]*safety margin/],
      ["excess questions are recast before source emission",
        /question[\s\S]{0,12}marks exceed their exact operational target[\s\S]*recast the excess questions as statements[\s\S]*return the source/],
      ["omissions cannot waive an out-of-range rated habit",
        /do not use `omitted` to[\s\S]{0,12}waive an[\s\S]*out-of-range rated habit/],
      ["the requested form cannot override the profile's lexical register",
        /final register check[\s\S]*requested container[\s\S]*selects form and[\s\S]*does not authorize[\s\S]*abstract nominalizations/],
      ["rated parentheticals are counted rather than remembered",
        /interruption-punctuation[\s\S]*count rated parenthetical spans/],
      ["rated figure vocabulary cannot be replaced by a generic comparison",
        /figures-analogy[\s\S]*generic comparison does not satisfy a rated lexical register/],
      ["counted absences are checked separately from their positive replacement",
        /absent-paired[\s\S]*count the absent form and its positive replacement separately/],
    ];
    for (const [label, pattern] of policies) {
      t.check(`historical v0.3 voice-draft: ${label}`, pattern.test(src));
    }
  }

  t.group("voice-draft output contract — a draft and a refusal are never the same artefact");
  {
    const ok = { hadDraftFence: true, hadJsonFence: false, draft: "Eleven years, and a shelf." };
    t.check("a plain draft validates", validateDraft(ok).ok);

    const refusal = {
      hadDraftFence: false, hadJsonFence: true,
      json: { schema: "voice-draft/1", refused: "no reader named" },
    };
    const r = validateDraft(refusal);
    t.check("a clean refusal validates and is marked as one", r.ok && r.refusal);

    // The disjointness rule: a draft plus a REFUSAL is contradictory — the artefact's
    // status would depend on which fence a caller reads first.
    t.check("emitting a draft AND a refusal is rejected",
      !validateDraft({ ...ok, hadJsonFence: true, json: refusal.json }).ok);

    // A draft plus an OMISSION RECORD is legal and different: it says which rated habits
    // were dropped rather than fabricated. Moved out of the prose after the author's read
    // — the markdown fence is what gets pasted somewhere, so anything in it that is not
    // the piece is a defect. The record still exists so a draft quietly missing a habit
    // cannot pass as a complete one.
    const omitted = {
      ...ok,
      hadJsonFence: true,
      json: {
        schema: "voice-draft/1",
        omitted: [{ habit: "colon and bare link", why: "no verified sources for this topic" }],
      },
    };
    t.check("a draft plus an omission record is accepted", validateDraft(omitted).ok);
    t.check("and it is not misread as a refusal", validateDraft(omitted).refusal === false);
    t.check("an omission record carrying `refused` is rejected",
      !validateDraft({ ...omitted, json: { ...omitted.json, refused: "x" } }).ok);
    t.check("an empty omitted list is rejected — drop the fence rather than report nothing",
      !validateDraft({ ...omitted, json: { schema: "voice-draft/1", omitted: [] } }).ok);
    t.check("an omission entry without a reason is rejected",
      !validateDraft({ ...omitted, json: { schema: "voice-draft/1", omitted: [{ habit: "x" }] } }).ok);

    // FU-18. A draft that will not fabricate a URL will still confidently date an
    // acquisition, and a wrong date has no example.com tell — it reads exactly like a
    // right one. The claims list moves that burden to whoever publishes, at no cost to
    // the prose. It bites hardest on drafts a reader calls spot-on, because those are
    // the ones nobody re-checks.
    const claims = {
      ...ok,
      hadJsonFence: true,
      json: {
        schema: "voice-draft/1",
        claims: [{ claim: "LastPass was taken private in 2020", where: "paragraph 6" }],
      },
    };
    t.check("a draft plus a claims list is accepted", validateDraft(claims).ok);
    t.check("omitted and claims may appear together",
      validateDraft({ ...claims, json: { ...claims.json, omitted: omitted.json.omitted } }).ok);
    t.check("a claim without a location is rejected — 'what to check' needs 'where'",
      !validateDraft({ ...claims, json: { schema: "voice-draft/1", claims: [{ claim: "x" }] } }).ok);
    t.check("an empty claims list is rejected — omit the key instead",
      !validateDraft({ ...claims, json: { schema: "voice-draft/1", claims: [] } }).ok);
    t.check("a record with neither list is rejected — the fence should not exist",
      !validateDraft({ ...claims, json: { schema: "voice-draft/1" } }).ok);
    t.check("a claims record is still not a refusal", validateDraft(claims).refusal === false);

    t.check("a refusal carrying extra keys is rejected",
      !validateDraft({ ...refusal, json: { ...refusal.json, draft: "x" } }).ok);
    t.check("a refusal with an empty reason is rejected",
      !validateDraft({ ...refusal, json: { schema: "voice-draft/1", refused: "  " } }).ok);
    t.check("no fence at all is rejected",
      !validateDraft({ hadDraftFence: false, hadJsonFence: false, draft: null, json: null }).ok);

    // The three claims the primitive may never make, checked on the artefact.
    for (const [label, text] of [
      ["a detector claim", "This would pass any detector."],
      ["a resemblance claim", "It sounds like the author, truly."],
      ["a reference to the profile", "As section 8 notes, the corpus is thin."],
    ]) {
      t.check(`a draft making ${label} is rejected`,
        !validateDraft({ hadDraftFence: true, hadJsonFence: false, draft: text }).ok);
    }
  }

  t.group("voice-draft portable source — models own prose, deterministic code owns fences");
  {
    const required = ["schema", "kind", "draft", "omitted", "refused"];
    t.check("the provider-neutral draft schema requires one fixed shape",
      JSON.stringify([...DRAFT_SOURCE_SCHEMA.required].sort()) === JSON.stringify([...required].sort())
        && DRAFT_SOURCE_SCHEMA.additionalProperties === false
        && DRAFT_SOURCE_SCHEMA.properties.schema.type === "string"
        && DRAFT_SOURCE_SCHEMA.properties.kind.type === "string");
    const request = "A maker can disable features after sale.";
    const direct = {
      schema: "voice-draft-source/4", kind: "draft",
      draft: "A maker can disable features after sale. That leaves ownership hollow.\n\nThe rule should be simple.",
      omitted: [], refused: "",
    };
    t.check("the current semantic source preserves direct Markdown prose",
      validateVoiceDraftSource(direct, { request }).ok
        && sentenceRefs(direct).map((row) => row.id).join(",") === "p1s1,p1s2,p2s1");
    const directAudit = {
      schema: "voice-draft-claim-audit/4",
      sentences: sentenceRefs(direct).map((row) => ({
        id: row.id, status: "keep", reason: "request premise, inference, or normative rule", claims: [],
      })),
    };
    const directApplied = applyVoiceDraftClaimAudit(direct, directAudit, { request });
    const directOutput = assembleVoiceDraft(direct, { request, auditClaims: directApplied.claims });
    t.check("current direct prose cannot assemble before its independent audit",
      !assembleVoiceDraft(direct, { request }).ok);
    t.check("direct prose is independently sentence-audited before canonical assembly",
      directApplied.ok && directOutput.ok
        && directOutput.output.includes("That leaves ownership hollow.\n\nThe rule should be simple."));
    const factualDirect = { ...direct, draft: "Acme released version 2. The change should be reversible." };
    const factualAudit = {
      schema: "voice-draft-claim-audit/4",
      sentences: [{
        id: "p1s1", status: "disclose", reason: "Named actor and release are external facts.",
        claims: [{
          claim: "Acme released version 2.", kind: "bounded-fact",
          verification_question: "Did Acme release version 2?",
        }],
      }, {
        id: "p1s2", status: "keep", reason: "Normative recommendation.", claims: [],
      }],
    };
    const factualApplied = applyVoiceDraftClaimAudit(factualDirect, factualAudit, { request });
    const factualOutput = assembleVoiceDraft(factualDirect, {
      request, auditClaims: factualApplied.claims,
    });
    t.check("the independent audit derives a public claim from direct prose without editing it",
      factualApplied.ok && factualApplied.source === factualDirect
        && factualOutput.ok && factualOutput.output.includes('"claim": "Acme released version 2."')
        && factualOutput.output.includes('"where": "paragraph 1"'));
    t.check("a hard-failure reject still prevents direct prose assembly",
      !applyVoiceDraftClaimAudit(factualDirect, {
        ...factualAudit,
        sentences: [{ id: "p1s1", status: "reject", reason: "Invented quotation.", claims: [] },
          factualAudit.sentences[1]],
      }, { request }).ok);
    t.check("current source rejects prose fences, draft-plus-refusal, and refusal omissions",
      !validateVoiceDraftSource({ ...direct, draft: "```markdown\nNo.\n```" }).ok
        && !validateVoiceDraftSource({ ...direct, refused: "also refuse" }).ok
        && !validateVoiceDraftSource({ ...direct, kind: "refusal", draft: "", refused: "missing register",
          omitted: [{ habit: "x", why: "y" }] }).ok);

    // Historical ledger-first source/3 remains readable and fully checked.
    const source = {
      schema: "voice-draft-source/3", kind: "draft",
      ledger: [{
        id: "c1", basis: "request-supported", claim: "A maker can disable features after sale.",
        request_basis: "maker can disable features after sale",
      }],
      paragraphs: [{ sentences: [
        {
          text: "A maker can disable features after sale.", basis: "request-supported",
          claim_ids: ["c1"],
        },
        { text: "That leaves ownership hollow.", basis: "reasoning", claim_ids: [] },
      ] }],
      omitted: [], refused: "",
    };
    t.check("historical proof-carrying source/3 validates against its request",
      validateVoiceDraftSource(source, { request }).ok);
    const plain = assembleVoiceDraft(source, { request });
    t.check("sentence units assemble to prose and a derived public claim record",
      plain.ok && plain.output.includes("A maker can disable features after sale. That leaves ownership hollow.")
        && plain.output.includes('"where": "paragraph 1"'));
    t.check("the assembled public draft passes the unchanged voice-draft/1 validator",
      validateDraft(parseDraft(plain.output)).ok);

    const disclosed = assembleVoiceDraft({
      ...source,
      omitted: [{ habit: "opponents-allies-sources / obs-12", why: "no verified source" }],
    }, { request });
    t.check("non-empty semantic disclosures survive canonical assembly",
      disclosed.ok && disclosed.output.includes('"omitted"') && disclosed.output.includes('"claims"'));
    const refusal = assembleVoiceDraft({
      ...source, kind: "refusal", ledger: [], paragraphs: [], refused: "reader and occasion are missing",
    });
    t.check("a semantic refusal assembles to one public refusal and no draft",
      refusal.ok && refusal.refusal && !refusal.output.includes("```markdown")
        && refusal.output.includes('"refused"'));
    t.check("a draft source carrying a refusal reason is rejected",
      !validateVoiceDraftSource({ ...source, refused: "also refuse" }, { request }).ok);
    const hiddenEnvelope = validateVoiceDraftSource({
      ...source,
      ledger: [],
      paragraphs: [{ sentences: [{ text: "Prose.\n```json", basis: "reasoning", claim_ids: [] }] }],
    }, { request });
    t.check("a draft source cannot smuggle a fence or newline inside a sentence unit",
      !hiddenEnvelope.ok
        && hiddenEnvelope.errors.some((error) => /text cannot contain a fence or newline/.test(error)));
    t.check("a refusal source carrying draft prose is rejected",
      !validateVoiceDraftSource({ ...source, kind: "refusal", refused: "missing register" }).ok);
    t.check("a refusal source carrying disclosures is rejected",
      !validateVoiceDraftSource({
        ...source, kind: "refusal", paragraphs: [], refused: "missing register",
        omitted: [{ habit: "x", why: "y" }],
      }).ok);
    t.check("missing or extra source keys are rejected rather than inferred",
      !validateVoiceDraftSource(Object.fromEntries(Object.entries(source).filter(([key]) => key !== "paragraphs")), { request }).ok
        && !validateVoiceDraftSource({ ...source, note: "extra" }, { request }).ok);
    t.check("request-supported sentences require claims and a locatable request basis",
      !validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [{ text: "Claim.", basis: "request-supported", claim_ids: [] }] }],
      }, { request }).ok
        && !validateVoiceDraftSource({
          ...source,
          ledger: [{
            id: "c1", basis: "request-supported",
            claim: "A premise is not in the request.", request_basis: "premise not in the request",
          }],
          paragraphs: [{ sentences: [{
            text: "A premise is not in the request.", basis: "request-supported", claim_ids: ["c1"],
          }] }],
      }, { request }).ok);
    const poisonedRequestSupport = validateVoiceDraftSource({
      ...source,
      ledger: [{
        id: "c1", basis: "request-supported", claim: "Many buyers never notice.", request_basis: "Write",
      }],
      paragraphs: [{ sentences: [{
        text: "Many buyers never notice.", basis: "request-supported", claim_ids: ["c1"],
      }] }],
    }, { request: "Write about ownership choices." });
    t.check("a generic instruction token cannot become semantic request support",
      !poisonedRequestSupport.ok
        && poisonedRequestSupport.errors.some((error) => /no substantive lexical support/.test(error))
        && !normalizeVoiceDraftSource({
          ...source,
          ledger: [{
            id: "c1", basis: "request-supported", claim: "Many buyers never notice.", request_basis: "Write",
          }],
          paragraphs: [{ sentences: [{
            text: "Many buyers never notice.", basis: "request-supported", claim_ids: ["c1"],
          }] }],
        }, { request: "Write about ownership choices." }).ok);
    const appendedPredicateClaim = validateVoiceDraftSource({
      ...source,
      ledger: [{
        id: "c1", basis: "request-supported",
        claim: "Device ownership causes cancer.", request_basis: "device ownership",
      }],
      paragraphs: [{ sentences: [{
        text: "Device ownership causes cancer.", basis: "request-supported", claim_ids: ["c1"],
      }] }],
    }, { request: "Write about device ownership." });
    const appendedPredicateSentence = validateVoiceDraftSource({
      ...source,
      ledger: [{
        id: "c1", basis: "request-supported",
        claim: "A device is not fully owned when its maker can disable features after sale.",
        request_basis: "a device is not fully owned when its maker can disable features after sale",
      }],
      paragraphs: [{ sentences: [{
        text: "The maker's remote off switch makes full device ownership impossible.",
        basis: "request-supported", claim_ids: ["c1"],
      }] }],
    }, { request: "Argue that a device is not fully owned when its maker can disable features after sale." });
    t.check("topical overlap cannot license an appended predicate in the request ledger",
      !appendedPredicateClaim.ok
        && appendedPredicateClaim.errors.some((error) => /does not substantively cover its claim/.test(error)));
    t.check("sentence-level paraphrase remains possible after the ledger claim is closed",
      appendedPredicateSentence.ok);
    const mismatchedRequestSentence = validateVoiceDraftSource({
      ...source,
      paragraphs: [{ sentences: [{
        text: "Many buyers never notice.", basis: "request-supported", claim_ids: ["c1"],
      }] }],
    }, { request });
    t.check("a request-backed claim cannot license unrelated prose",
      !mismatchedRequestSentence.ok
        && mismatchedRequestSentence.errors.some((error) => /no substantive lexical support from its cited request claims/.test(error)));
    t.check("proof-carrying drafts cannot validate without the original request",
      !validateVoiceDraftSource(source).ok && !assembleVoiceDraft(source).ok);
    const reasoningWithClaim = validateVoiceDraftSource({
      ...source,
      paragraphs: [{ sentences: [{
        text: "Supposed reasoning.", basis: "reasoning",
        claim_ids: ["c1"],
      }] }],
    }, { request });
    t.check("reasoning and hypothetical units cannot cite a claim payload",
      !reasoningWithClaim.ok
        && reasoningWithClaim.errors.some((error) => /with reasoning basis cannot cite ledger claims/.test(error)));
    t.check("a malformed sentence claim_ids field is rejected without throwing",
      !validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [{ text: "Claim.", basis: "request-supported", claim_ids: "c1" }] }],
      }, { request }).ok);
    const external = assembleVoiceDraft({
      ...source,
      ledger: [{ id: "c1", basis: "external-verification", claim: "The bill passed in 2024.", request_basis: "" }],
      paragraphs: [{ sentences: [{
        text: "The bill passed in 2024.", basis: "external-verification",
        claim_ids: ["c1"],
      }] }],
    }, { request });
    t.check("external facts remain possible but become derived verification claims",
      external.ok && external.output.includes("The bill passed in 2024.")
        && external.output.includes('"claim": "The bill passed in 2024."'));
    t.check("external verification cannot masquerade as request support",
      !validateVoiceDraftSource({
        ...source,
        ledger: [{ id: "c1", basis: "external-verification", claim: "The bill passed.", request_basis: "maker can disable" }],
        paragraphs: [{ sentences: [{ text: "The bill passed.", basis: "external-verification", claim_ids: ["c1"] }] }],
      }, { request }).ok);
    t.check("external verification cannot silently omit its claim queue",
      !validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [{
          text: "The bill passed.", basis: "external-verification", claim_ids: [],
        }] }],
      }, { request }).ok);
    t.check("the claim ledger is closed, contiguous, and fully referenced",
      !validateVoiceDraftSource({ ...source, ledger: [{ ...source.ledger[0], id: "c2" }] }, { request }).ok
        && !validateVoiceDraftSource({ ...source, ledger: [...source.ledger, {
          id: "c2", basis: "external-verification", claim: "Unused fact.", request_basis: "",
        }] }, { request }).ok
        && !validateVoiceDraftSource({ ...source,
          paragraphs: [{ sentences: [{ text: "Claim.", basis: "request-supported", claim_ids: ["c9"] }] }],
        }, { request }).ok);
    const danglingClaim = validateVoiceDraftSource({
      ...source,
      ledger: [],
      paragraphs: [{ sentences: [{
        text: "Claim.", basis: "request-supported", claim_ids: ["c9"],
      }] }],
    }, { request });
    t.check("a sentence cannot cite a claim outside an otherwise empty closed ledger",
      !danglingClaim.ok
        && danglingClaim.errors.some((error) => /claim_ids has dangling reference c9/.test(error)));
    t.check("one authorized premise may support several sentences without inventing a new claim",
      validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [
          source.paragraphs[0].sentences[0],
          { text: "After sale, the maker can still disable the feature.", basis: "request-supported", claim_ids: ["c1"] },
        ] }],
      }, { request }).ok);
    t.check("source/3 proves the ledger was emitted before expressive prose",
      !validateVoiceDraftSource({
        schema: source.schema, kind: source.kind, paragraphs: source.paragraphs,
        ledger: source.ledger, omitted: source.omitted, refused: source.refused,
      }, { request }).ok);
    const legacy = {
      schema: "voice-draft-source/1", kind: "draft", draft: "Historical prose.",
      omitted: [], claims: [], refused: "",
    };
    t.check("historical voice-draft-source/1 artifacts remain readable",
      validateVoiceDraftSource(legacy).ok && assembleVoiceDraft(legacy).ok);
    const previous = {
      schema: "voice-draft-source/2", kind: "draft",
      paragraphs: [{ sentences: [{ text: "Historical proof.", basis: "reasoning", claims: [] }] }],
      omitted: [], refused: "",
    };
    t.check("historical voice-draft-source/2 artifacts remain readable",
      validateVoiceDraftSource(previous, { request }).ok && assembleVoiceDraft(previous, { request }).ok);
    t.check("historical source/2 claim-audit/1 pairs remain readable",
      applyVoiceDraftClaimAudit(previous, {
        schema: "voice-draft-claim-audit/1",
        sentences: [{
          id: "p1s1", status: "keep", basis: "reasoning", claims: [],
          reason: "The historical sentence adds no descriptive fact.",
        }],
      }, { request }).ok);

    const refs = sentenceRefs(source);
    const claimAuditInstructions = fsRead(join(HERE, "..", "skills", "prose-draft", "references", "claim-audit.md"), "utf8");
    t.check("the independent auditor distrusts the drafter and catches generic institutional claims",
      /drafter deliberately supplied no factual labels or[\s\S]*semantic certification is your independent job/.test(claimAuditInstructions)
        && /Generic wording does not turn[\s\S]*into logic/.test(claimAuditInstructions));
    t.check("the independent auditor exposes unsupported propositions without laundering hard failures",
      /For every keep row[\s\S]*`reason`[\s\S]*every clause/.test(claimAuditInstructions)
        && /status: "disclose"[\s\S]*public claim inventory/.test(claimAuditInstructions)
        && /status: "reject"[\s\S]*fabricated or placeholder citation[\s\S]*invented first-person author biography/.test(claimAuditInstructions));
    t.check("the independent auditor separates semantic judgment from mechanical evidence anchoring",
      /- a metaphor, analogy, tautology, or rhetorical label derived from the supplied premise/.test(claimAuditInstructions)
        && /Read figurative agency as figurative[\s\S]*Do not reject it merely because its literal reading would be[\s\S]*impossible/.test(claimAuditInstructions)
        && /independently checkable external proposition/.test(claimAuditInstructions)
        && /Extract every such proposition[\s\S]*do not hide a second assertion behind a[\s\S]*nearby one/.test(claimAuditInstructions)
        && /Do not copy an evidence span[\s\S]*deterministic assembly binds/.test(claimAuditInstructions));
    t.check("the independent auditor accepts ordinary request entailments without laundering contingent facts",
      /ordinary lexical[\s\S]{0,12}entailments and role presuppositions/.test(claimAuditInstructions)
        && /buys or owns a device[\s\S]*buyer[\s\S]*acquired in a sale/.test(claimAuditInstructions)
        && /Do not extend this rule[\s\S]*contingent motive, prevalence,[\s\S]*industry practice/.test(claimAuditInstructions));
    const audit = {
      schema: "voice-draft-claim-audit/4",
      sentences: refs.map((ref, index) => ({
        id: ref.id, status: "keep",
        reason: index === 0
          ? "The assertion is fully covered by request-supported ledger entry c1."
          : "The sentence is a conclusion from the supplied premise and adds no descriptive fact.",
        claims: [],
      })),
    };
    t.check("the independent audit schema is fixed and strict-harness compatible",
      DRAFT_AUDIT_SCHEMA.additionalProperties === false
        && DRAFT_AUDIT_SCHEMA.properties.schema.type === "string"
        && DRAFT_AUDIT_SCHEMA.properties.sentences.items.properties.status.type === "string"
        && !Object.hasOwn(DRAFT_AUDIT_SCHEMA.properties.sentences.items
          .properties.claims.items.properties, "evidence"));
    const applied = applyVoiceDraftClaimAudit(source, audit, { request });
    t.check("an independent audit approves without rewriting the closed ledger or prose",
      applied.ok && applied.source === source && applied.claims.length === 0
        && applied.source.paragraphs[0].sentences[1].basis === "reasoning"
        && assembleVoiceDraft(applied.source, { request }).output.includes("That leaves ownership hollow."));
    const disclosureSource = {
      ...source,
      paragraphs: [{ sentences: [
        source.paragraphs[0].sentences[0],
        { text: "Many buyers never notice the setting.", basis: "reasoning", claim_ids: [] },
      ] }],
    };
    const disclosureAudit = {
      schema: "voice-draft-claim-audit/4",
      sentences: sentenceRefs(disclosureSource).map((ref, index) => index === 0 ? {
        id: ref.id, status: "keep", reason: "The request supplies the complete assertion.", claims: [],
      } : {
        id: ref.id, status: "disclose", reason: "This is an unledgered population claim.",
        claims: [{
          claim: "Many buyers do not notice the setting.",
          kind: "broad-generalization",
          verification_question: "What evidence establishes how often buyers notice this setting?",
        }],
      }),
    };
    const disclosedAudit = applyVoiceDraftClaimAudit(disclosureSource, disclosureAudit, { request });
    const disclosedOutput = disclosedAudit.ok
      ? assembleVoiceDraft(disclosedAudit.source, { request, auditClaims: disclosedAudit.claims })
      : null;
    t.check("an audit-owned disclosure preserves prose while entering the public verification queue",
      disclosedAudit.ok && disclosedAudit.source === disclosureSource
        && disclosedAudit.claims[0].sentence_id === "p1s2"
        && disclosedAudit.claims[0].where === "paragraph 1"
        && disclosedAudit.claims[0].evidence === "Many buyers never notice the setting."
        && disclosedOutput.ok
        && disclosedOutput.output.includes('"claim": "Many buyers do not notice the setting."'));
    t.check("the current audit rejects model-authored evidence instead of trusting it",
      !applyVoiceDraftClaimAudit(disclosureSource, {
        ...disclosureAudit,
        sentences: disclosureAudit.sentences.map((row, index) => index === 1 ? {
          ...row, claims: [{ ...row.claims[0], evidence: "Many buyers never notice" }],
        } : row),
      }, { request }).ok);
    const historicalDisclosureAudit = {
      ...disclosureAudit,
      schema: "voice-draft-claim-audit/3",
      sentences: disclosureAudit.sentences.map((row, index) => index === 1 ? {
        ...row, claims: [{ ...row.claims[0], evidence: "Many buyers never notice" }],
      } : row),
    };
    t.check("historical source/3 claim-audit/3 disclosure evidence remains readable",
      applyVoiceDraftClaimAudit(disclosureSource, historicalDisclosureAudit, { request }).ok);
    t.check("historical claim-audit/3 disclosure evidence must remain an exact sentence span",
      !applyVoiceDraftClaimAudit(disclosureSource, {
        ...historicalDisclosureAudit,
        sentences: historicalDisclosureAudit.sentences.map((row, index) => index === 1 ? {
          ...row, claims: [{ ...row.claims[0], evidence: "buyers usually ignore settings" }],
        } : row),
      }, { request }).ok);
    t.check("only disclose rows can carry claims, and every disclose row carries one",
      !applyVoiceDraftClaimAudit(disclosureSource, {
        ...disclosureAudit,
        sentences: disclosureAudit.sentences.map((row, index) => index === 1
          ? { ...row, status: "keep" }
          : row),
      }, { request }).ok
        && !applyVoiceDraftClaimAudit(disclosureSource, {
          ...disclosureAudit,
          sentences: disclosureAudit.sentences.map((row, index) => index === 1
            ? { ...row, claims: [] }
            : row),
        }, { request }).ok);
    t.check("historical source/3 claim-audit/2 evidence remains readable",
      applyVoiceDraftClaimAudit(source, {
        schema: "voice-draft-claim-audit/2",
        sentences: refs.map((ref) => ({
          id: ref.id, status: "keep", reason: "Historical complete rationale.",
        })),
      }, { request }).ok);
    t.check("an audit must cover every sentence in exact order",
      !applyVoiceDraftClaimAudit(source, { ...audit, sentences: audit.sentences.slice(1) }, { request }).ok
        && !applyVoiceDraftClaimAudit(source, { ...audit, sentences: [...audit.sentences].reverse() }, { request }).ok);
    t.check("every kept audit decision needs a reviewable basis rationale",
      !applyVoiceDraftClaimAudit(source, {
        ...audit, sentences: audit.sentences.map((row, index) => index ? row : { ...row, reason: "" }),
      }, { request }).ok);
    t.check("an auditor rejection stops assembly rather than rewriting prose",
      !applyVoiceDraftClaimAudit(source, {
        ...audit,
        sentences: audit.sentences.map((row, index) => index ? row : {
          ...row, status: "reject", reason: "attributed wording is absent from the request",
        }),
      }, { request }).ok);

    const unusedSuffix = {
      ...source,
      ledger: [...source.ledger, {
        id: "c2", basis: "external-verification", claim: "Unused external claim.", request_basis: "",
      }],
    };
    const normalized = normalizeVoiceDraftSource(unusedSuffix, { request });
    t.check("an unused ledger suffix is pruned deterministically without touching prose",
      normalized.ok && normalized.changed && normalized.removed_ledger_ids.join(",") === "c2"
        && normalized.source.ledger.length === 1
        && normalized.source.paragraphs === unusedSuffix.paragraphs);
    t.check("normalization refuses anything beyond an unused contiguous ledger suffix",
      !normalizeVoiceDraftSource({
        ...unusedSuffix,
        ledger: [unusedSuffix.ledger[0], { ...unusedSuffix.ledger[1], id: "c3" }],
      }, { request }).ok
        && !normalizeVoiceDraftSource({ ...source, refused: "also refuse" }, { request }).ok);

    const repairSource = {
      ...source,
      paragraphs: [{ sentences: [
        source.paragraphs[0].sentences[0],
        source.paragraphs[0].sentences[1],
        { text: "Ownership should mean control.", basis: "normative", claim_ids: [] },
        { text: "A buyer could reasonably object.", basis: "hypothetical", claim_ids: [] },
        { text: "The distinction matters.", basis: "reasoning", claim_ids: [] },
      ] }],
    };
    const repairRefs = sentenceRefs(repairSource);
    const rejectedAudit = {
      schema: "voice-draft-claim-audit/2",
      sentences: repairRefs.map((ref, index) => index === 1 ? {
        id: ref.id, status: "reject", reason: "The sentence adds an unbounded population claim.",
      } : {
        id: ref.id, status: "keep", reason: "The sentence adds no unsupported descriptive fact.",
      }),
    };
    const repaired = {
      ...repairSource,
      paragraphs: [{ sentences: repairSource.paragraphs[0].sentences.map((sentence, index) => index === 1 ? {
        text: "Hypothetically: That leaves ownership hollow.", basis: "hypothetical", claim_ids: [],
      } : sentence) }],
    };
    t.check("a bounded repair may rewrite only independently rejected sentence units",
      validateVoiceDraftClaimRepair(repairSource, repaired, { request, audit: rejectedAudit }).ok);
    const allRejected = {
      schema: "voice-draft-claim-audit/2",
      sentences: audit.sentences.map((row) => ({
        id: row.id, status: "reject", reason: "The sentence adds an unbounded population claim.",
      })),
    };
    const allRewritten = {
      ...source,
      ledger: [],
      paragraphs: [{ sentences: [
        { text: "Hypothetically: A maker can disable features after sale.", basis: "hypothetical", claim_ids: [] },
        { text: "Hypothetically: That leaves ownership hollow.", basis: "hypothetical", claim_ids: [] },
      ] }],
    };
    const broadRepair = validateVoiceDraftClaimRepair(source, allRewritten, { request, audit: allRejected });
    t.check("an all-rejected audit cannot turn bounded repair into a second draft",
      !broadRepair.ok && broadRepair.errors.some((error) => /more than 20%/.test(error)));
    const injectedContent = validateVoiceDraftClaimRepair(repairSource, {
      ...repaired,
      paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 1 ? {
        ...sentence, text: "That leaves ownership hollow while moon cheese exists.",
      } : sentence) }],
    }, { request, audit: rejectedAudit });
    t.check("a rejected sentence cannot inject new factual content under a clean relabel",
      !injectedContent.ok
        && injectedContent.errors.some((error) => /fixed hypothetical wrapper/.test(error)));
    const wholesaleMarkers = validateVoiceDraftClaimRepair(repairSource, {
      ...repaired,
      paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 1 ? {
        ...sentence, text: "Perhaps someone could imagine something possible.",
      } : sentence) }],
    }, { request, audit: rejectedAudit });
    t.check("allowed hypothetical markers cannot replace rather than minimally edit a rejected sentence",
      !wholesaleMarkers.ok
        && wholesaleMarkers.errors.some((error) => /fixed hypothetical wrapper/.test(error)));
    const polaritySource = {
      ...repairSource,
      paragraphs: [{ sentences: repairSource.paragraphs[0].sentences.map((sentence, index) => index === 1 ? {
        ...sentence, text: "That does not leave ownership hollow.",
      } : sentence) }],
    };
    const polarityRepair = {
      ...polaritySource,
      paragraphs: [{ sentences: polaritySource.paragraphs[0].sentences.map((sentence, index) => index === 1 ? {
        ...sentence, text: "Hypothetically: That does leave ownership hollow.", basis: "hypothetical",
      } : sentence) }],
    };
    const reversed = validateVoiceDraftClaimRepair(
      polaritySource, polarityRepair, { request, audit: rejectedAudit },
    );
    t.check("a bounded repair cannot reverse argument polarity by deleting negation",
      !reversed.ok && reversed.errors.some((error) => /fixed hypothetical wrapper/.test(error)));
    const roleSwap = validateVoiceDraftClaimRepair(repairSource, {
      ...repaired,
      paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 1 ? {
        ...sentence, text: "Hypothetically: Ownership leaves that hollow.",
      } : sentence) }],
    }, { request, audit: rejectedAudit });
    const punctuationRewrite = validateVoiceDraftClaimRepair(repairSource, {
      ...repaired,
      paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 1 ? {
        ...sentence, text: "Hypothetically: That. Leaves. Ownership. Hollow.",
      } : sentence) }],
    }, { request, audit: rejectedAudit });
    const repeatedPrefix = validateVoiceDraftClaimRepair(repairSource, {
      ...repaired,
      paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 1 ? {
        ...sentence, text: "Hypothetically: Hypothetically: That leaves ownership hollow.",
      } : sentence) }],
    }, { request, audit: rejectedAudit });
    t.check("the fixed wrapper preserves actor order, punctuation, and bounded length exactly",
      [roleSwap, punctuationRewrite, repeatedPrefix].every((result) => !result.ok
        && result.errors.some((error) => /fixed hypothetical wrapper/.test(error))));
    t.check("the fixed wrapper must carry hypothetical basis rather than a factual or reasoning relabel",
      !validateVoiceDraftClaimRepair(repairSource, {
        ...repaired,
        paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 1
          ? { ...sentence, basis: "reasoning" }
          : sentence) }],
      }, { request, audit: rejectedAudit }).ok);
    t.check("a bounded repair cannot edit an accepted sentence or add a claim",
      !validateVoiceDraftClaimRepair(repairSource, {
        ...repaired,
        ledger: [...repaired.ledger, {
          id: "c2", basis: "external-verification", claim: "A new remembered fact.", request_basis: "",
        }],
        paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 0
          ? { ...sentence, text: "Changed accepted prose." }
          : index === 1 ? { ...sentence, basis: "external-verification", claim_ids: ["c2"] } : sentence) }],
      }, { request, audit: rejectedAudit }).ok);
    t.check("a bounded repair cannot edit an accepted sentence even when everything else is valid",
      !validateVoiceDraftClaimRepair(repairSource, {
        ...repaired,
        paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 0
          ? { ...sentence, text: "A maker may disable features even after sale." }
          : sentence) }],
      }, { request, audit: rejectedAudit }).ok);
    t.check("a bounded repair cannot add a new factual ledger entry even inside a rejected sentence",
      !validateVoiceDraftClaimRepair(repairSource, {
        ...repaired,
        ledger: [...repaired.ledger, {
          id: "c2", basis: "external-verification", claim: "A new remembered fact.", request_basis: "",
        }],
        paragraphs: [{ sentences: repaired.paragraphs[0].sentences.map((sentence, index) => index === 1
          ? { text: "A new remembered fact.", basis: "external-verification", claim_ids: ["c2"] }
          : sentence) }],
      }, { request, audit: rejectedAudit }).ok);
    t.check("a bounded repair cannot alter a retained ledger entry's provenance",
      !validateVoiceDraftClaimRepair(repairSource, {
        ...repaired,
        ledger: repaired.ledger.map((entry) => ({
          ...entry, request_basis: "A maker can disable features after sale",
        })),
      }, { request, audit: rejectedAudit }).ok);
    t.check("an audit repair must change the rejected prose rather than relabel it",
      !validateVoiceDraftClaimRepair(repairSource, {
        ...repairSource,
        paragraphs: [{ sentences: repairSource.paragraphs[0].sentences.map((sentence, index) => index === 1
          ? { ...sentence, basis: "hypothetical" }
          : sentence) }],
      }, { request, audit: rejectedAudit }).ok);
    t.check("a malformed initial audit cannot authorize a repair boundary",
      claimRepairRejectedIds(repairSource, {
        ...rejectedAudit,
        sentences: rejectedAudit.sentences.map((row, index) => index
          ? { ...row, unexpected: "repair authority" }
          : row),
      }).length === 0
        && claimRepairRejectedIds(repairSource, {
          ...rejectedAudit,
          sentences: rejectedAudit.sentences.map((row, index) => index
            ? { ...row, reason: "" }
            : row),
        }).length === 0);
    const twentySentenceSource = {
      ...repairSource,
      paragraphs: [{ sentences: Array.from({ length: 20 }, (_, index) => index === 0
        ? repairSource.paragraphs[0].sentences[0]
        : { text: `Normative sentence ${index}.`, basis: "normative", claim_ids: [] }) }],
    };
    const threeRejected = {
      schema: "voice-draft-claim-audit/2",
      sentences: sentenceRefs(twentySentenceSource).map((ref, index) => ({
        id: ref.id, status: index < 3 ? "reject" : "keep", reason: "Complete rationale.",
      })),
    };
    t.check("bounded repair rejects more than two units even when their share is below 20 percent",
      claimRepairEligibilityErrors(twentySentenceSource, threeRejected)
        .some((error) => /maximum is 2/.test(error)));
    const invalidUnused = {
      ...source,
      ledger: [...source.ledger, {
        id: "c2", basis: "external-verification", claim: "Unused remembered fact.", request_basis: "",
      }],
    };
    t.check("a bounded source repair may prune an unused ledger suffix without touching prose",
      validateVoiceDraftClaimRepair(invalidUnused, source, {
        request, sourceErrors: ["source.ledger c2 is not cited by any sentence"],
      }).ok);
    const repairInstructions = fsRead(
      join(HERE, "..", "skills", "prose-draft", "references", "claim-repair.md"), "utf8",
    );
    t.check("the repair prompt forbids a redraw and requires a fresh independent audit",
      /not writing a new draft/.test(repairInstructions)
        && /preserve every `keep` sentence object byte-for-byte/i.test(repairInstructions)
        && /Never add a ledger\s+entry/.test(repairInstructions)
        && /prefixing its original text with the exact bytes\s+`Hypothetically: `/.test(repairInstructions)
        && /later,\s+fresh claim audit/i.test(repairInstructions));
  }

  t.group("voice-draft — a missed habit is a worse imitation; an invented citation is a lie");
  {
    // Measured regression, not a hypothetical. FU-16's frequency vocabulary told the
    // drafter how often to use a habit; a follow-up edit told it a stated rate is an
    // instruction rather than a ceiling. Handed a corpus that ends paragraphs on a link
    // "throughout", it invented https://example.com/... placeholders. Zero fabricated
    // URLs before that edit, two after.
    //
    // This is the failure a reader is least likely to catch: a fake link is
    // indistinguishable from a real one in a draft.
    t.check("a placeholder URL is caught",
      findFabricatedCitations("the receipts are here:\nhttps://example.com/pw-acquisition").length === 1);
    t.check("several are all reported, not just the first",
      findFabricatedCitations("a https://example.com/x b https://yoursite.com/y").length === 2);
    t.check("a real-looking URL is not flagged — this check cannot verify reachability",
      findFabricatedCitations("https://blog.lastpass.com/posts/notice-of-recent-security-incident").length === 0);
    t.check("prose with no URLs is not an accusation",
      findFabricatedCitations("No links at all in this paragraph.").length === 0);

    // The regression itself, pinned so it cannot silently return.
    const v2 = resolve(HERE, "runs", "2026-08-07-fu16-frequency", "superseded", "draft-v2-fabricated-urls.txt");
    if (fsExists(v2)) {
      t.check("the recorded fabrication regression still reproduces from its artefact",
        findFabricatedCitations(fsRead(v2, "utf8")).length === 2);
    }
  }

  t.group("voice-draft run — every checked-in draft honours the contract and the firewall");
  {
    const runDir = resolve(HERE, "runs", "2026-08-07-pi02-s3-voice-draft");
    const fixtures = resolve(HERE, "fixtures", "profiles");
    const outs = fsExists(runDir) ? loadRun(runDir) : [];
    t.check("the S3 run has checked-in drafts to validate", outs.length > 0, runDir);

    for (const o of outs) {
      const v = validateDraft(o);
      t.check(`${o.name}: honours the output contract`, v.ok, v.errors.join("; "));
    }

    // Expected refusals must actually refuse. A run where the refusal fixtures
    // quietly produced drafts would still be "all green" without this.
    const manifestPath = resolve(HERE, "fixtures", "prompts", "MANIFEST.json");
    if (fsExists(manifestPath)) {
      for (const c of JSON.parse(fsRead(manifestPath, "utf8")).cases) {
        const out = outs.find((o) => o.name.startsWith(c.id));
        if (!out) { t.check(`${c.id}: has a recorded outcome`, false); continue; }
        const isRefusal = out.hadJsonFence && !out.hadDraftFence;
        t.check(`${c.id} (${c.shape}): expected to ${c.expect}, and did`,
          (c.expect === "refuse") === isRefusal,
          `expected ${c.expect}, got ${isRefusal ? "refuse" : "draft"}`);
      }
    }

    // THE structural claim. voice-draft ships with tools: [] so it cannot reach the
    // corpus; no harness here can reproduce an empty allowlist, so the property is
    // checked on the artefact. A shared 6-gram the profile never quoted means corpus
    // text arrived by some other path.
    // Which profile produced which artefact comes from CASES.json, checked in beside
    // the artefacts. It used to be a literal in this file, written by the same author
    // as the run — and a wrong entry there would have pointed the leakage check at the
    // wrong corpus, where it would pass for the wrong reason and look identical.
    const casesPath = join(runDir, "CASES.json");
    t.check("the run records which profile produced each artefact", fsExists(casesPath), casesPath);
    const cases = fsExists(casesPath) ? JSON.parse(fsRead(casesPath, "utf8")).cases : [];

    t.check("every checked-in artefact is accounted for in CASES.json",
      outs.every((o) => cases.some((c) => c.artefact === o.name)),
      outs.filter((o) => !cases.some((c) => c.artefact === o.name)).map((o) => o.name).join(", "));
    t.check("every case in CASES.json has a checked-in artefact",
      cases.every((c) => outs.some((o) => o.name === c.artefact)),
      cases.filter((c) => !outs.some((o) => o.name === c.artefact)).map((c) => c.artefact).join(", "));

    let checkedLeakage = 0;
    const draftCount = outs.filter((o) => o.draft).length;
    for (const o of outs) {
      if (!o.draft) continue;
      const c = cases.find((x) => x.artefact === o.name);
      if (!c) continue;
      const profilePath = join(runDir, "inputs", "profiles", `${c.profile}.md`);
      const corpusDir = join(fixtures, c.profile, "corpus", "human");
      if (!fsExists(profilePath) || !fsExists(corpusDir)) {
        t.check(`${o.name}: its declared profile ${c.profile} resolves`, false);
        continue;
      }
      const { count, leaked } = corpusLeakage({
        draft: o.draft, corpusDir, profileText: fsRead(profilePath, "utf8"),
      });
      checkedLeakage += 1;
      t.check(`${o.name}: no corpus text bypassed the ${c.profile} profile`, count === 0,
        leaked.slice(0, 2).join(" | "));
    }
    t.check("the firewall check actually ran on every draft", checkedLeakage === draftCount,
      `${checkedLeakage} of ${draftCount}`);

    // The run doc claims zero ellipses across every Chekhov-profiled draft. That is the
    // end-to-end payoff of FU-6 (the ellipses are the edition's) and FU-7 (the renderer
    // must say so), and it is the kind of claim that rots quietly.
    const chekhovDrafts = outs.filter((o) => o.draft
      && cases.find((c) => c.artefact === o.name)?.profile === "chekhov-correspondence");
    t.check("every Chekhov-profiled draft is free of the edition's ellipsis",
      chekhovDrafts.length > 0 && chekhovDrafts.every((o) => !/\.\.\./.test(o.draft)),
      chekhovDrafts.filter((o) => /\.\.\./.test(o.draft)).map((o) => o.name).join(", "));
  }
}

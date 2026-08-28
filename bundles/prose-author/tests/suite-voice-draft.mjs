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
  assembleVoiceDraft, SOURCE_SCHEMA as DRAFT_SOURCE_SCHEMA, validateVoiceDraftSource,
} from "../skills/prose-draft/tools/draft-contract.mjs";
import {
  applyVoiceDraftClaimAudit, AUDIT_SCHEMA as DRAFT_AUDIT_SCHEMA, sentenceRefs,
} from "../skills/prose-draft/tools/draft-claim-audit.mjs";
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
      t.check("voice-draft: names all ten voice-profile/2 coverage dimensions",
        coverageDimensions.every((dimension) => prompt.includes(`\`${dimension}\``)),
        coverageDimensions.filter((dimension) => !prompt.includes(`\`${dimension}\``)).join(", "));
      for (const status of ["rated", "described", "absent-paired", "unresolved"]) {
        t.check(`voice-draft: defines how to process ${status} coverage`,
          new RegExp(`\\*\\*\\\`${status}\\\`\\*\\*`).test(prompt));
      }
      t.check("voice-draft: resolves supported coverage through observation ids",
        /resolve each supported entry through its `observation_ids`/.test(prompt));
      t.check("voice-draft: remains compatible with historical voice-profile/1 inputs",
        /older `voice-profile\/1` profiles have no coverage table[\s\S]*remain usable/.test(prompt));
      t.check("voice-draft: silently dropping any supported instruction requires an omission record",
        /whether its status is `rated`, `described`, or `absent-paired`[\s\S]*put it in `omitted`/.test(prompt));
      t.check("voice-draft: audits each named actor action and consequence independently",
        /every factual verb attached to it[\s\S]*Inventory each actor-action and actor-consequence[\s\S]*separately in `claims`/.test(src));
      t.check("voice-draft: an attributed quotation must be supplied verbatim",
        /exact quoted words must already appear in[\s\S]*user's request[\s\S]*quotation in `claims` does not make invented wording permissible/.test(src));
      t.check("voice-draft: v2 omissions identify the dimension and every observation",
        /for `voice-profile\/2`, name the coverage dimension and every affected observation id in `habit`/.test(prompt));

      if (shipped && fsExists(rendered)) {
        const strip = (s) => s.replace(/^---\n[\s\S]*?\n---\n/, "");
        t.check("voice-draft: rendered body is byte-identical to primitives/ source (AGENTS.md rule 1)",
          strip(src) === strip(fsRead(rendered, "utf8")));
      }
    } else {
      t.check("voice-draft: agent.md exists", false);
    }
  }

  t.group("voice-draft prompt regressions — known silent failures have explicit final checks");
  {
    const agentPath = resolve(HERE, "..", "..", "..", "primitives", "agents", "voice-draft", "agent.md");
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
        /request does not supply the fact, remove or recast it[\s\S]*does not license making one up/],
      ["the request is the factual packet while the profile remains voice evidence",
        /request as the only supplied factual packet[\s\S]*profile is[\s\S]*not a research packet[\s\S]*pretrained memory is not verified evidence/],
      ["materials that cannot be truthfully reconstructed become omissions",
        /requires an exact quotation, citation, link, figure, or[\s\S]*do not have[\s\S]*record it in `omitted`/],
      ["every emitted sentence must carry an explicit factual basis",
        /voice-draft-source\/2[\s\S]*every prose[\s\S]*sentence in exactly one sentence unit[\s\S]*classify every sentence with exactly one basis/],
      ["external descriptive facts require a verification label",
        /external factual assertion[\s\S]*classify it as[\s\S]*external-verification[\s\S]*do not mislabel remembered history/],
      ["external claims must be finite rather than unverifiable generalizations",
        /external claim must be finite[\s\S]*authoritative record[\s\S]*entire industry[\s\S]*not made safe by adding them to a queue/],
      ["the final pronoun pass checks ownership and inclusive groups",
        /final pronoun and referent check[\s\S]*person, number, ownership, or inclusive group/],
      ["the final claim inventory catches separate assertions rather than nearby topics",
        /final claim inventory[\s\S]*sentence by sentence[\s\S]*nearby[\s\S]*does not cover a second assertion/],
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
      t.check(`voice-draft: ${label}`, pattern.test(src));
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
    const required = ["schema", "kind", "paragraphs", "omitted", "refused"];
    t.check("the provider-neutral draft schema requires one fixed shape",
      JSON.stringify([...DRAFT_SOURCE_SCHEMA.required].sort()) === JSON.stringify([...required].sort())
        && DRAFT_SOURCE_SCHEMA.additionalProperties === false
        && DRAFT_SOURCE_SCHEMA.properties.schema.type === "string"
        && DRAFT_SOURCE_SCHEMA.properties.kind.type === "string");
    const request = "A maker can disable features after sale.";
    const source = {
      schema: "voice-draft-source/2", kind: "draft",
      paragraphs: [{ sentences: [
        {
          text: "A maker can disable features after sale.", basis: "request-supported",
          claims: [{ claim: "A maker can disable features after sale.", request_basis: "maker can disable features after sale" }],
        },
        { text: "That leaves ownership hollow.", basis: "reasoning", claims: [] },
      ] }],
      omitted: [], refused: "",
    };
    t.check("a proof-carrying semantic draft validates against its request",
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
      ...source, kind: "refusal", paragraphs: [], refused: "reader and occasion are missing",
    });
    t.check("a semantic refusal assembles to one public refusal and no draft",
      refusal.ok && refusal.refusal && !refusal.output.includes("```markdown")
        && refusal.output.includes('"refused"'));
    t.check("a draft source carrying a refusal reason is rejected",
      !validateVoiceDraftSource({ ...source, refused: "also refuse" }, { request }).ok);
    t.check("a draft source cannot smuggle a fence or newline inside a sentence unit",
      !validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [{ text: "Prose.\n```json", basis: "reasoning", claims: [] }] }],
      }, { request }).ok);
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
        paragraphs: [{ sentences: [{ text: "Claim.", basis: "request-supported", claims: [] }] }],
      }, { request }).ok
        && !validateVoiceDraftSource({
          ...source,
          paragraphs: [{ sentences: [{
            text: "Claim.", basis: "request-supported",
            claims: [{ claim: "x", request_basis: "not in the request" }],
          }] }],
        }, { request }).ok);
    t.check("proof-carrying drafts cannot validate without the original request",
      !validateVoiceDraftSource(source).ok && !assembleVoiceDraft(source).ok);
    t.check("reasoning and hypothetical units cannot hide a claims payload",
      !validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [{
          text: "Supposed reasoning.", basis: "reasoning",
          claims: [{ claim: "hidden fact", request_basis: "maker can disable" }],
        }] }],
      }, { request }).ok);
    t.check("a malformed sentence claims field is rejected without throwing",
      !validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [{ text: "Claim.", basis: "request-supported", claims: "x" }] }],
      }, { request }).ok);
    const external = assembleVoiceDraft({
      ...source,
      paragraphs: [{ sentences: [{
        text: "The bill passed in 2024.", basis: "external-verification",
        claims: [{ claim: "The bill passed in 2024.", request_basis: "" }],
      }] }],
    }, { request });
    t.check("external facts remain possible but become derived verification claims",
      external.ok && external.output.includes("The bill passed in 2024.")
        && external.output.includes('"claim": "The bill passed in 2024."'));
    t.check("external verification cannot masquerade as request support",
      !validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [{
          text: "The bill passed.", basis: "external-verification",
          claims: [{ claim: "The bill passed.", request_basis: "maker can disable" }],
        }] }],
      }, { request }).ok);
    t.check("external verification cannot silently omit its claim queue",
      !validateVoiceDraftSource({
        ...source,
        paragraphs: [{ sentences: [{
          text: "The bill passed.", basis: "external-verification", claims: [],
        }] }],
      }, { request }).ok);
    const legacy = {
      schema: "voice-draft-source/1", kind: "draft", draft: "Historical prose.",
      omitted: [], claims: [], refused: "",
    };
    t.check("historical voice-draft-source/1 artifacts remain readable",
      validateVoiceDraftSource(legacy).ok && assembleVoiceDraft(legacy).ok);

    const refs = sentenceRefs(source);
    const claimAuditInstructions = fsRead(join(HERE, "..", "skills", "prose-draft", "references", "claim-audit.md"), "utf8");
    t.check("the independent auditor distrusts the drafter and catches generic institutional claims",
      /basis labels and claims are untrusted suggestions/.test(claimAuditInstructions)
        && /generic wording does not turn[\s\S]*one into reasoning/.test(claimAuditInstructions));
    t.check("the independent auditor requires rationales and finite external propositions",
      /For every `keep`[\s\S]*`reason`[\s\S]*every[\s\S]*clause/.test(claimAuditInstructions)
        && /An external claim is keepable only when it is finite[\s\S]*authoritative[\s\S]*Reject unbounded claims/.test(claimAuditInstructions));
    const audit = {
      schema: "voice-draft-claim-audit/1",
      sentences: refs.map((ref, index) => ({
        id: ref.id, status: "keep",
        basis: index === 0 ? "request-supported" : "external-verification",
        claims: index === 0
          ? [{ claim: "A maker can disable features after sale.", request_basis: "maker can disable features after sale" }]
          : [{ claim: "That leaves ownership hollow.", request_basis: "" }],
        reason: index === 0
          ? "The assertion copies the request premise."
          : "The sentence makes an external descriptive assertion queued for verification.",
      })),
    };
    t.check("the independent audit schema is fixed and strict-harness compatible",
      DRAFT_AUDIT_SCHEMA.additionalProperties === false
        && DRAFT_AUDIT_SCHEMA.properties.schema.type === "string"
        && DRAFT_AUDIT_SCHEMA.properties.sentences.items.properties.status.type === "string");
    const applied = applyVoiceDraftClaimAudit(source, audit, { request });
    t.check("an independent audit may correct a sentence basis and derived claim queue",
      applied.ok && applied.source.paragraphs[0].sentences[1].basis === "external-verification"
        && assembleVoiceDraft(applied.source, { request }).output.includes("That leaves ownership hollow."));
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

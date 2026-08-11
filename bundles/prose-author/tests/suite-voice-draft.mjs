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
import { validateDraft, loadRun, corpusLeakage, findFabricatedCitations } from "./voice-draft.mjs";
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

      if (shipped && fsExists(rendered)) {
        const strip = (s) => s.replace(/^---\n[\s\S]*?\n---\n/, "");
        t.check("voice-draft: rendered body is byte-identical to primitives/ source (AGENTS.md rule 1)",
          strip(src) === strip(fsRead(rendered, "utf8")));
      }
    } else {
      t.check("voice-draft: agent.md exists", false);
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

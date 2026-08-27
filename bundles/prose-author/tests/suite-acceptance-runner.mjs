/** Acceptance harness integrity — the scorer may not grade its own handwritten tally. */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  criticPrompt, deriveCritic, draftPrompt, profileRenderPrompt, validateCases,
} from "./acceptance-runner.mjs";
import { measureProfile, PROFILE_MEASUREMENT_RULES } from "./profile-measurements.mjs";

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
    const prompt = profileRenderPrompt("fixture", [{ file: "sample.txt", body: "Sample body." }]);
    t.check("profile prompts inline their staged inputs", /Input file: sample\.txt/.test(prompt) && /Sample body\./.test(prompt));
    t.check("profile prompts end on the self-contained envelope contract",
      /single Markdown-fence voice-profile\/2 envelope[\s\S]*voice-profile\/2:profile[\s\S]*voice-profile\/2:record[\s\S]*one Markdown fence/.test(prompt));
    t.check("profile prompts end on a mechanical coverage-status audit",
      /audit every coverage row mechanically[\s\S]*rated if ANY referenced[\s\S]*described only if NONE/.test(prompt));
    t.check("profile prompts audit every rated rule before emission",
      /complete counting_rule verbatim[\s\S]*not literally present[\s\S]*remove the rate[\s\S]*Never invent a rate/.test(prompt));
    t.check("profile prompts audit literal support, zero absences, and prose coverage",
      /exact <support>\/<of> token[\s\S]*zero rate is an[\s\S]*absent-paired[\s\S]*distinct positive rated replacement[\s\S]*personal testimony\/disclosure/.test(prompt));
  }
  {
    const prompt = draftPrompt({ prompt: "Write X." }, "Profile prose", { schema: "voice-profile/2" });
    t.check("the drafter prompt contains the request and rendered profile", /Write X\./.test(prompt) && /Profile prose/.test(prompt));
    t.check("the drafter prompt states that corpus access is unavailable", /no corpus access/i.test(prompt));
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
    t.check("critic prompts carry no expected verdict", !/expected (?:verdict|result)|\bCLEAN\b|\bREVISE\b/.test(prompt));
  }
  t.check("completed responses are immutable rather than overwritten",
    /exists but is not a completed successful response; do not redraw it/.test(source)
      && /if \(completedResult\(output\)\) return \{ skipped: true/.test(source));
  t.check("prepare requires the locked implementation and design to be committed",
    /must be committed before prepare/.test(source));
  t.check("clean-context calls exclude user plugins, MCP servers, settings, and Chrome",
    ["--disable-slash-commands", "--strict-mcp-config", "--setting-sources", "--no-chrome"]
      .every((flag) => source.includes(`\"${flag}\"`)));
  t.check("the model effort is pinned in the manifest rather than inherited",
    /effort: EFFORT/.test(source) && /"--effort", EFFORT/.test(source));
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
  }
  t.check("the checker pins design, case, agent, corpus, request, and artefact hashes",
    ["design_sha256", "cases_sha256", "agent snapshot hash mismatch", "corpus lock drifted", "prompt hash mismatch", "missing artifact"]
      .every((phrase) => source.includes(phrase)));
  t.check("TALLY.json is derived by collect rather than accepted as an input",
    /const tally = \{[\s\S]*drafts,[\s\S]*structural_gates: structural\.gates/.test(source));

  t.group("v0.2 acceptance harness — critic contracts are derived from raw bodies");
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
}

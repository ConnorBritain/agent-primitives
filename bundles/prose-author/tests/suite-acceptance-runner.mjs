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
    /effort: EFFORT/.test(source) && /profile_effort: PROFILE_EFFORT/.test(source)
      && /"--effort", effort/.test(source) && /effort: PROFILE_EFFORT/.test(source));
  t.check("acceptance defaults to one model process and native structured profile transport",
    /ACCEPTANCE_CONCURRENCY \|\| "1"/.test(source)
      && /ACCEPTANCE_PROFILE_NATIVE_SCHEMA !== "0"/.test(source)
      && /profile_transport: PROFILE_NATIVE_SCHEMA \? "native-structured" : "json-fence"/.test(source));
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

/** Headless style tuning — evidence/preferences boundary, revisions, scope, and compilation. */

import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  applyProposal, comparison, compileStyle, digest, diffPreferences, discover,
  emptyScope, feedbackPrompt, initPreferences, PROPOSAL_SCHEMA, validatePreferences,
} from "../skills/prose-style-tune/tools/style-contract.mjs";
import { draftControlCard } from "../skills/prose-draft/tools/draft-controls.mjs";
import { draftTargetCard } from "../skills/prose-draft/tools/draft-targets.mjs";
import { strictOutputSchemaErrors } from "./strict-output-schema.mjs";

const context = (overrides = {}) => ({
  register: "argumentative", form: "essay", audience: "general", purpose: "explain", project: null,
  ...overrides,
});

function decision({
  feature, dimension, observations = [], directive, stance = "preferred",
  control = { mode: "qualitative", observation_id: null, minimum: null, aim: null, maximum: null },
  scope = emptyScope(), statement = "Use this preference.", kind = "direct-feedback",
}) {
  return {
    feature, dimension, observation_ids: observations, directive, stance, control, scope,
    basis: { kind, statement },
  };
}

function proposal(preferences, operations, { questions = [], statement = "Use this preference." } = {}) {
  return {
    schema: "voice-preference-proposal/1",
    based_on: { revision: preferences.revision, digest: digest(preferences) },
    feedback: { kind: "direct-feedback", statement },
    operations,
    questions,
  };
}

function add(id, row) {
  return {
    id, op: "add", target_decision_id: null, decision: row,
    rationale: "The user named this behavior directly.",
    expected_effect: "A future comparison can show whether the named behavior changed.",
  };
}

export async function run(t, { HERE }) {
  t.group("prose-style-tune — observed evidence and user preference remain separate");

  const agentDir = resolve(HERE, "..", "..", "..", "primitives", "agents", "voice-feedback-interpret");
  const agentPrompt = readFileSync(resolve(agentDir, "agent.md"), "utf8");
  const agentMeta = readFileSync(resolve(agentDir, "meta.yaml"), "utf8");
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(agentPrompt)?.[1] ?? "";
  const frontmatterKeys = frontmatter.split("\n").filter((line) => /^\w[\w-]*:/.test(line))
    .map((line) => line.split(":")[0]).sort();
  t.check("voice-feedback-interpret has only portable name and description frontmatter",
    JSON.stringify(frontmatterKeys) === JSON.stringify(["description", "name"]));
  t.check("voice-feedback-interpret ships as a read-only planner with no corpus or catalog access",
    /^kind:\s*planner$/m.test(agentMeta) && /^ships:\s*true$/m.test(agentMeta)
      && /^\s*read_only:\s*true$/m.test(agentMeta) && /^\s*reads_corpus:\s*false$/m.test(agentMeta)
      && /^\s*reads_catalog:\s*false$/m.test(agentMeta) && /^\s*tools:\s*\[\]$/m.test(agentMeta));
  t.check("feedback interpretation keeps evidence separate and cannot apply itself",
    /authoritative as a preference[\s\S]*never retroactive evidence/.test(agentPrompt)
      && /Inferred preferences need approval/.test(agentPrompt)
      && /propose changes only and never apply your own plan/.test(agentPrompt)
      && /“I like this” about an entire draft[\s\S]*is underdetermined/.test(agentPrompt));

  const cliSource = resolve(HERE, "..", "skills", "prose-style-tune", "tools", "style-contract.mjs");
  const cliTemp = mkdtempSync(join(tmpdir(), "prose-style-cli-"));
  const cliLink = join(cliTemp, "style-contract.mjs");
  let linkedSchema = null;
  try {
    symlinkSync(realpathSync(cliSource), cliLink);
    linkedSchema = JSON.parse(execFileSync(process.execPath, [cliLink, "schema", "proposal"], { encoding: "utf8" }));
  } finally {
    rmSync(cliTemp, { recursive: true, force: true });
  }
  t.check("style-contract CLI runs through a canonicalized or symlinked install path",
    linkedSchema?.type === "object" && linkedSchema?.required?.includes("operations"));

  const profilePath = resolve(HERE, "runs", "2026-08-30-v020-semantic-revision-canary", "inputs", "profile.json");
  const profile = JSON.parse(readFileSync(profilePath, "utf8"));
  const questions = profile.observations.find((row) =>
    /^\[measurement:question-marks\]/.test(row?.rate?.counting_rule ?? ""));
  t.check("style-tune fixture has a reproducibly counted question observation", Boolean(questions));

  const v1 = initPreferences(profile, "Working voice");
  t.check("initial preferences lock to the canonical observed profile digest",
    v1.profile.digest === digest(profile) && v1.revision === 1 && v1.parent_digest === null);
  t.check("an empty initial preference artifact validates", validatePreferences(v1, profile).ok);

  const cards = discover(profile, v1, { offset: 0, limit: 3 });
  t.check("discovery serves no more than the requested three dimensions",
    cards.cards.length === 3 && cards.next_offset === 3);
  t.check("discovery cards carry profile evidence rather than corpus text",
    cards.cards.every((card) => Array.isArray(card.evidence)
      && !Object.hasOwn(card, "corpus") && !Object.hasOwn(card, "samples")));
  t.check("the feedback proposal schema fits the shared strict provider subset",
    strictOutputSchemaErrors(PROPOSAL_SCHEMA).length === 0,
    strictOutputSchemaErrors(PROPOSAL_SCHEMA).join("; "));
  const prompt = feedbackPrompt(profile, v1,
    { kind: "discovery-answer", statement: "Prefer this only in essays." },
    { context: context(), discoveryCard: cards.cards[0] });
  t.check("portable feedback dispatch binds one event and current ancestry without corpus input",
    prompt.includes(`BASED_ON_DIGEST: ${digest(v1)}`)
      && prompt.includes("Prefer this only in essays.")
      && !/corpus\/human|catalog\.json/.test(prompt));

  const suppressQuestions = decision({
    feature: "rhetorical-questions",
    dimension: "questions-imperatives-vocatives",
    observations: [questions.id],
    directive: "Use no rhetorical or terminal questions in this context.",
    stance: "avoid",
    control: { mode: "suppress-counted", observation_id: questions.id, minimum: 0, aim: 0, maximum: 0 },
    statement: "Never use rhetorical questions.",
  });
  const unselected = decision({
    feature: "direct-opening", dimension: "openings-endings-closure",
    directive: "State the central claim in the opening sentence.",
    statement: "Maybe try a more direct opening.", stance: "experimental",
  });
  const selectedV2 = applyProposal(profile, v1, proposal(v1, [
    add("remove-questions", suppressQuestions), add("unselected-opening", unselected),
  ], {
    statement: "Never use rhetorical questions.",
  }), ["remove-questions"]);
  t.check("explicit acceptance creates one new immutable revision",
    selectedV2.revision === 2 && selectedV2.parent_digest === digest(v1) && v1.decisions.length === 0
      && selectedV2.decisions.length === 1 && selectedV2.decisions[0].id === "p001");
  const v2 = applyProposal(profile, v1,
    proposal(v1, [add("remove-questions", suppressQuestions)]), ["remove-questions"]);

  let unresolvedRejected = false;
  try {
    applyProposal(profile, v2, proposal(v2, [add("ambiguous-opening", unselected)], {
      questions: ["Everywhere, or only in essays?"],
    }), ["ambiguous-opening"]);
  } catch (error) {
    unresolvedRejected = /unresolved questions/.test(error.message);
  }
  t.check("unresolved semantic proposals cannot mutate preferences", unresolvedRejected);

  let staleRejected = false;
  try {
    const stale = proposal(v1, [add("stale", suppressQuestions)]);
    applyProposal(profile, v2, stale, ["stale"]);
  } catch (error) {
    staleRejected = /another revision|stale/.test(error.message);
  }
  t.check("a proposal cannot apply to a newer preference revision", staleRejected);

  const emailScope = { ...emptyScope(), forms: ["email"] };
  const preserveEmail = decision({
    feature: "rhetorical-questions",
    dimension: "questions-imperatives-vocatives",
    observations: [questions.id],
    directive: "Retain the profile's measured question rate in email.",
    stance: "preferred",
    control: { mode: "preserve-observed", observation_id: questions.id, minimum: null, aim: null, maximum: null },
    scope: emailScope,
    statement: "Questions are fine in email.",
  });
  const experiment = decision({
    feature: "concrete-opening",
    dimension: "openings-endings-closure",
    directive: "Open with one concrete situation before stating the general claim.",
    stance: "experimental",
    statement: "I'd like to try more concrete openings.",
  });
  const v3 = applyProposal(profile, v2, proposal(v2, [
    add("email-questions", preserveEmail), add("try-opening", experiment),
  ]), ["email-questions", "try-opening"]);

  const essayStyle = compileStyle(profile, v3, context());
  const emailStyle = compileStyle(profile, v3, context({ form: "email", purpose: "reply" }));
  t.check("a context-specific preference overrides a global decision for the same feature",
    essayStyle.active_preferences.some((row) => row.id === "p001")
      && emailStyle.active_preferences.some((row) => row.id === "p002")
      && !emailStyle.active_preferences.some((row) => row.id === "p001"));
  t.check("compiled style keeps observed profile bytes structurally unchanged",
    digest(essayStyle.observed_profile) === digest(profile)
      && /user's choices[\s\S]*not observations about the source corpus/.test(essayStyle.effective_markdown));

  const card = draftTargetCard(essayStyle, "Write a 700-word essay for a general reader.");
  const questionTarget = card.measurements.find((row) => row.observation_id === questions.id);
  t.check("numeric user preference overrides reach the deterministic draft target card",
    questionTarget.preference_id === "p001" && questionTarget.aim_count === 0
      && questionTarget.gate_minimum === 0 && questionTarget.gate_maximum === 0);
  const controls = draftControlCard(essayStyle.effective_markdown, essayStyle);
  t.check("semantic user preferences reach the ID-bound drafting control card",
    controls.preferences.some((row) => row.id === "p001") && controls.preference_revision === 3);

  const trial = comparison(profile, v3, context(), "p003");
  const conditions = Object.values(trial.orchestrator_only_mapping).sort();
  t.check("comparison changes exactly one named experiment and keeps mapping out of the user question",
    JSON.stringify(conditions) === JSON.stringify(["baseline", "experiment"])
      && !/baseline|experiment/i.test(trial.question)
      && [trial.candidate_a, trial.candidate_b].filter((style) =>
        style.active_preferences.some((row) => row.id === "p003")).length === 1);

  const changes = diffPreferences(v1, v3);
  t.check("deterministic diff reports added decisions without rewriting old versions",
    changes.from_revision === 1 && changes.to_revision === 3
      && changes.added.length === 3 && changes.removed.length === 0 && changes.changed.length === 0);

  const alteredProfile = structuredClone(profile);
  alteredProfile.profile_markdown += "\n";
  t.check("a changed observed profile makes its preference overlay visibly stale",
    !validatePreferences(v3, alteredProfile).ok
      && validatePreferences(v3, alteredProfile).errors.some((error) => /digest is stale/.test(error)));

  const collision = structuredClone(v3);
  collision.decisions.push({
    id: "p004",
    ...decision({
      feature: "rhetorical-questions",
      dimension: "questions-imperatives-vocatives",
      observations: [questions.id],
      directive: "Use the measured question rate for a general audience.",
      scope: { ...emptyScope(), audiences: ["general"] },
      control: { mode: "preserve-observed", observation_id: questions.id, minimum: null, aim: null, maximum: null },
      statement: "Questions are fine for general readers.",
    }),
  });
  let conflictRejected = false;
  try { compileStyle(profile, collision, context({ form: "email" })); }
  catch (error) { conflictRejected = /active preference conflicts[\s\S]*p002, p004/.test(error.message); }
  t.check("equally specific active decisions refuse instead of silently choosing a winner", conflictRejected);

  let canaryCheck = "";
  try { canaryCheck = (await import("./historical-canary-check.mjs")).checkHistoricalStyleCanary(); }
  catch (error) { canaryCheck = `${error.message}\n${error.stdout ?? ""}${error.stderr ?? ""}`; }
  t.check("the one-call compiled-style canary reproduces without a redraw",
    /style-spec canary check PASS/.test(canaryCheck), canaryCheck.trim());
}

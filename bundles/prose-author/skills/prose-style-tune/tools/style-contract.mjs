#!/usr/bin/env node
/**
 * Deterministic contracts for the headless prose-author style tuner.
 *
 * Semantic agents may propose preference changes. This module owns profile identity,
 * scope matching, revision ancestry, accepted-operation selection, conflict refusal,
 * discovery pagination, diffs, and compilation. It never edits the observed profile.
 */

import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  COVERAGE_DIMENSIONS, DIMENSION_LABELS,
} from "../../prose-draft/tools/profile-contract.mjs";

export const PREFERENCES_SCHEMA_ID = "voice-preferences/1";
export const PROPOSAL_SCHEMA_ID = "voice-preference-proposal/1";
export const STYLE_SCHEMA_ID = "voice-style-spec/1";
export const DISCOVERY_SCHEMA_ID = "voice-style-discovery/1";
export const DIFF_SCHEMA_ID = "voice-preferences-diff/1";
export const COMPARISON_SCHEMA_ID = "voice-style-comparison/1";

export const STANCES = ["locked", "preferred", "avoid", "experimental"];
export const FEEDBACK_KINDS = ["direct-feedback", "pairwise-choice", "discovery-answer"];
export const SCOPE_AXES = ["registers", "forms", "audiences", "purposes", "projects"];
export const CONTROL_MODES = ["qualitative", "preserve-observed", "suppress-counted", "count-range"];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const ownKeys = (value) => Object.keys(value).sort();
const exactKeys = (value, keys) => isObject(value)
  && JSON.stringify(ownKeys(value)) === JSON.stringify([...keys].sort());

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function nonempty(value, max = 500) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validateProfile(profile) {
  const errors = [];
  if (!isObject(profile) || profile.schema !== "voice-profile/2") {
    return ["style tuning requires a current voice-profile/2; refresh historical profiles before tuning"];
  }
  if (!nonempty(profile.profile, 160)) errors.push("profile.profile must identify the observed profile");
  if (!nonempty(profile.profile_markdown, 100_000)) errors.push("profile.profile_markdown is required");
  if (!Array.isArray(profile.observations)) errors.push("profile.observations must be an array");
  if (!Array.isArray(profile.coverage)) errors.push("profile.coverage must be an array");
  const dimensions = new Set((profile.coverage ?? []).map((row) => row?.dimension));
  for (const dimension of COVERAGE_DIMENSIONS) {
    if (!dimensions.has(dimension)) errors.push(`profile.coverage is missing ${dimension}`);
  }
  return errors;
}

export function emptyScope() {
  return Object.fromEntries(SCOPE_AXES.map((axis) => [axis, []]));
}

function validateScope(scope, at = "scope") {
  const errors = [];
  if (!exactKeys(scope, SCOPE_AXES)) return [`${at} must contain exactly ${SCOPE_AXES.join(", ")}`];
  for (const axis of SCOPE_AXES) {
    if (!Array.isArray(scope[axis])) {
      errors.push(`${at}.${axis} must be an array`);
      continue;
    }
    const seen = new Set();
    for (const [index, value] of scope[axis].entries()) {
      if (!nonempty(value, 80)) errors.push(`${at}.${axis}[${index}] must be a non-empty string`);
      else if (seen.has(value)) errors.push(`${at}.${axis} repeats ${value}`);
      else seen.add(value);
    }
  }
  return errors;
}

function validateBasis(basis, at = "basis") {
  if (!exactKeys(basis, ["kind", "statement"])) return [`${at} must contain exactly kind and statement`];
  const errors = [];
  if (!FEEDBACK_KINDS.includes(basis.kind)) errors.push(`${at}.kind is invalid`);
  if (!nonempty(basis.statement, 2_000)) errors.push(`${at}.statement must preserve the user's actual feedback`);
  return errors;
}

function validateControl(control, decision, profile, at = "control") {
  if (!exactKeys(control, ["mode", "observation_id", "minimum", "aim", "maximum"])) {
    return [`${at} must contain exactly mode, observation_id, minimum, aim, maximum`];
  }
  const errors = [];
  if (!CONTROL_MODES.includes(control.mode)) errors.push(`${at}.mode is invalid`);
  const numeric = [control.minimum, control.aim, control.maximum];
  if (control.mode === "qualitative") {
    if (control.observation_id !== null || numeric.some((value) => value !== null)) {
      errors.push(`${at} qualitative mode cannot carry an observation or numeric target`);
    }
    return errors;
  }
  if (!decision.observation_ids.includes(control.observation_id)) {
    errors.push(`${at}.observation_id must be one of the decision's observation_ids`);
  }
  const observation = profile.observations.find((row) => row.id === control.observation_id);
  if (!observation?.rate || !/^\[measurement:[a-z0-9-]+\]/.test(observation.rate.counting_rule ?? "")) {
    errors.push(`${at}.observation_id must reference a reproducibly counted observation`);
  }
  if (control.mode === "preserve-observed") {
    if (numeric.some((value) => value !== null)) errors.push(`${at} preserve-observed derives its target and accepts no numbers`);
  } else {
    if (!numeric.every((value) => Number.isInteger(value) && value >= 0)) {
      errors.push(`${at} counted modes require non-negative integer minimum, aim, and maximum`);
    } else if (!(control.minimum <= control.aim && control.aim <= control.maximum)) {
      errors.push(`${at} requires minimum <= aim <= maximum`);
    }
    if (control.mode === "suppress-counted" && numeric.some((value) => value !== 0)) {
      errors.push(`${at} suppress-counted requires a 0/0/0 range`);
    }
  }
  if (control.mode === "suppress-counted" && !["avoid", "experimental"].includes(decision.stance)) {
    errors.push(`${at} suppress-counted requires avoid or experimental stance`);
  }
  return errors;
}

function validateDecision(decision, profile, at, { idRequired = true } = {}) {
  const keys = ["feature", "dimension", "observation_ids", "directive", "stance", "control", "scope", "basis"];
  if (idRequired) keys.unshift("id");
  if (!exactKeys(decision, keys)) return [`${at} has unexpected or missing fields`];
  const errors = [];
  if (idRequired && !/^p\d{3,}$/.test(decision.id)) errors.push(`${at}.id must be p plus at least three digits`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(decision.feature ?? "")) {
    errors.push(`${at}.feature must be a stable lowercase slug`);
  }
  if (!COVERAGE_DIMENSIONS.includes(decision.dimension)) errors.push(`${at}.dimension is invalid`);
  if (!Array.isArray(decision.observation_ids)) errors.push(`${at}.observation_ids must be an array`);
  else {
    const known = new Set((profile.observations ?? []).map((row) => row?.id));
    const seen = new Set();
    for (const id of decision.observation_ids) {
      if (!known.has(id)) errors.push(`${at}.observation_ids has dangling reference ${id}`);
      if (seen.has(id)) errors.push(`${at}.observation_ids repeats ${id}`);
      seen.add(id);
    }
  }
  if (!nonempty(decision.directive, 500)) errors.push(`${at}.directive must be a concise actionable instruction`);
  if (!STANCES.includes(decision.stance)) errors.push(`${at}.stance is invalid`);
  errors.push(...validateControl(decision.control, decision, profile, `${at}.control`));
  errors.push(...validateScope(decision.scope, `${at}.scope`));
  errors.push(...validateBasis(decision.basis, `${at}.basis`));
  return errors;
}

function profileRef(profile) {
  return { schema: profile.schema, id: profile.profile, digest: digest(profile) };
}

export function initPreferences(profile, label = "Default") {
  const errors = validateProfile(profile);
  if (errors.length) throw new Error(errors.join("; "));
  if (!nonempty(label, 120)) throw new Error("label must be a non-empty string");
  return {
    schema: PREFERENCES_SCHEMA_ID,
    profile: profileRef(profile),
    revision: 1,
    parent_digest: null,
    label: label.trim(),
    decisions: [],
  };
}

export function validatePreferences(preferences, profile) {
  const errors = validateProfile(profile);
  if (!exactKeys(preferences, ["schema", "profile", "revision", "parent_digest", "label", "decisions"])) {
    errors.push("preferences has unexpected or missing fields");
    return { ok: false, errors };
  }
  if (preferences.schema !== PREFERENCES_SCHEMA_ID) errors.push(`preferences.schema must be ${PREFERENCES_SCHEMA_ID}`);
  if (!exactKeys(preferences.profile, ["schema", "id", "digest"])) errors.push("preferences.profile has invalid fields");
  else {
    const expected = profileRef(profile);
    if (preferences.profile.schema !== expected.schema) errors.push("preferences profile schema does not match");
    if (preferences.profile.id !== expected.id) errors.push("preferences profile id does not match");
    if (preferences.profile.digest !== expected.digest) errors.push("preferences profile digest is stale");
  }
  if (!Number.isInteger(preferences.revision) || preferences.revision < 1) errors.push("preferences.revision must be a positive integer");
  if (!(preferences.parent_digest === null || /^[a-f0-9]{64}$/.test(preferences.parent_digest))) {
    errors.push("preferences.parent_digest must be null or sha256");
  }
  if (!nonempty(preferences.label, 120)) errors.push("preferences.label must be a non-empty string");
  if (!Array.isArray(preferences.decisions)) errors.push("preferences.decisions must be an array");
  const ids = new Set();
  const scopeFeatures = new Set();
  for (const [index, decision] of (preferences.decisions ?? []).entries()) {
    errors.push(...validateDecision(decision, profile, `preferences.decisions[${index}]`));
    if (ids.has(decision?.id)) errors.push(`preferences.decisions repeats id ${decision?.id}`);
    ids.add(decision?.id);
    const identity = `${decision?.feature ?? ""}:${stableStringify(decision?.scope ?? {})}`;
    if (scopeFeatures.has(identity)) errors.push(`preferences has two decisions for ${decision?.feature} at the same scope`);
    scopeFeatures.add(identity);
  }
  return { ok: errors.length === 0, errors };
}

function validateContext(context) {
  const keys = ["register", "form", "audience", "purpose", "project"];
  if (!exactKeys(context, keys)) return ["context must contain exactly register, form, audience, purpose, project"];
  const errors = [];
  for (const key of keys) {
    if (!(context[key] === null || nonempty(context[key], 80))) errors.push(`context.${key} must be null or a non-empty string`);
  }
  return errors;
}

function contextAxis(axis) {
  return { registers: "register", forms: "form", audiences: "audience", purposes: "purpose", projects: "project" }[axis];
}

function scopeMatch(scope, context) {
  for (const axis of SCOPE_AXES) {
    if (scope[axis].length === 0) continue;
    const value = context[contextAxis(axis)];
    if (value === null) return { matches: false, reason: `context has no ${contextAxis(axis)}` };
    if (!scope[axis].includes(value)) return { matches: false, reason: `${contextAxis(axis)} ${value} is outside scope` };
  }
  return { matches: true, reason: "matched" };
}

function specificity(scope) {
  return SCOPE_AXES.filter((axis) => scope[axis].length > 0).length;
}

function renderScope(scope) {
  const parts = SCOPE_AXES.filter((axis) => scope[axis].length).map((axis) => `${axis}=${scope[axis].join("|")}`);
  return parts.length ? parts.join(", ") : "all contexts";
}

export function compileStyle(profile, preferences, context, { experiments = [] } = {}) {
  const validated = validatePreferences(preferences, profile);
  const errors = [...validated.errors, ...validateContext(context)];
  if (errors.length) throw new Error(errors.join("; "));
  const enabled = new Set(experiments);
  for (const id of enabled) {
    const decision = preferences.decisions.find((row) => row.id === id);
    if (!decision) errors.push(`unknown experiment ${id}`);
    else if (decision.stance !== "experimental") errors.push(`${id} is not experimental`);
  }
  if (errors.length) throw new Error(errors.join("; "));

  const eligible = [];
  const inactive = [];
  for (const decision of preferences.decisions) {
    const match = scopeMatch(decision.scope, context);
    if (!match.matches) {
      inactive.push({ id: decision.id, reason: match.reason });
    } else if (decision.stance === "experimental" && !enabled.has(decision.id)) {
      inactive.push({ id: decision.id, reason: "experiment not enabled" });
    } else {
      eligible.push(decision);
    }
  }

  const byFeature = new Map();
  for (const decision of eligible) {
    if (!byFeature.has(decision.feature)) byFeature.set(decision.feature, []);
    byFeature.get(decision.feature).push(decision);
  }
  const active = [];
  const conflicts = [];
  for (const [feature, decisions] of byFeature) {
    const highest = Math.max(...decisions.map((row) => specificity(row.scope)));
    const winners = decisions.filter((row) => specificity(row.scope) === highest);
    if (winners.length > 1) {
      conflicts.push({ feature, decision_ids: winners.map((row) => row.id), reason: "equally specific active decisions" });
      continue;
    }
    active.push(winners[0]);
    for (const overridden of decisions.filter((row) => row !== winners[0])) {
      inactive.push({ id: overridden.id, reason: `overridden by more specific ${winners[0].id}` });
    }
  }
  if (conflicts.length) throw new Error(`active preference conflicts: ${conflicts.map((row) => `${row.feature} (${row.decision_ids.join(", ")})`).join("; ")}`);

  const lines = active.sort((a, b) => a.id.localeCompare(b.id)).map((decision) => {
    const action = decision.stance === "avoid" ? "AVOID" : decision.stance.toUpperCase();
    const evidence = decision.observation_ids.length ? `; observed evidence ${decision.observation_ids.join(", ")}` : "; user preference only";
    const control = decision.control.mode === "qualitative" ? "qualitative"
      : `${decision.control.mode}:${decision.control.observation_id}`;
    return `- [${action}] ${decision.dimension}/${decision.feature}: ${decision.directive} (${renderScope(decision.scope)}${evidence}; control ${control})`;
  });
  const overlay = lines.length
    ? `\n\n## User-approved preference overlay\n\nThese directives record the user's choices. They are not observations about the source corpus.\n\n${lines.join("\n")}`
    : "\n\n## User-approved preference overlay\n\nNo active user preferences apply to this context.";

  return {
    schema: STYLE_SCHEMA_ID,
    profile_digest: profileRef(profile).digest,
    preference_revision: preferences.revision,
    preference_digest: digest(preferences),
    context,
    observed_profile: profile,
    active_preferences: active,
    inactive_preferences: inactive,
    effective_markdown: `${profile.profile_markdown.trim()}${overlay}\n`,
  };
}

function validateProposal(proposal, preferences, profile) {
  const errors = [];
  if (!exactKeys(proposal, ["schema", "based_on", "feedback", "operations", "questions"])) {
    return ["proposal has unexpected or missing fields"];
  }
  if (proposal.schema !== PROPOSAL_SCHEMA_ID) errors.push(`proposal.schema must be ${PROPOSAL_SCHEMA_ID}`);
  if (!exactKeys(proposal.based_on, ["revision", "digest"])) errors.push("proposal.based_on is invalid");
  else {
    if (proposal.based_on.revision !== preferences.revision) errors.push("proposal was made against another revision");
    if (proposal.based_on.digest !== digest(preferences)) errors.push("proposal digest is stale");
  }
  if (!exactKeys(proposal.feedback, ["kind", "statement"])) errors.push("proposal.feedback is invalid");
  else {
    if (!FEEDBACK_KINDS.includes(proposal.feedback.kind)) errors.push("proposal.feedback.kind is invalid");
    if (!nonempty(proposal.feedback.statement, 2_000)) errors.push("proposal.feedback.statement is required");
  }
  if (!Array.isArray(proposal.questions)) errors.push("proposal.questions must be an array");
  else proposal.questions.forEach((question, index) => {
    if (!nonempty(question, 500)) errors.push(`proposal.questions[${index}] is invalid`);
  });
  if (!Array.isArray(proposal.operations)) errors.push("proposal.operations must be an array");
  const operationIds = new Set();
  for (const [index, operation] of (proposal.operations ?? []).entries()) {
    const at = `proposal.operations[${index}]`;
    if (!exactKeys(operation, ["id", "op", "target_decision_id", "decision", "rationale", "expected_effect"])) {
      errors.push(`${at} has unexpected or missing fields`);
      continue;
    }
    if (!/^[a-z][a-z0-9-]{1,63}$/.test(operation.id ?? "")) errors.push(`${at}.id is invalid`);
    if (operationIds.has(operation.id)) errors.push(`proposal repeats operation id ${operation.id}`);
    operationIds.add(operation.id);
    if (!["add", "replace", "remove"].includes(operation.op)) errors.push(`${at}.op is invalid`);
    if (operation.op === "add" && operation.target_decision_id !== null) errors.push(`${at}.target_decision_id must be null for add`);
    if (["replace", "remove"].includes(operation.op)
      && !preferences.decisions.some((row) => row.id === operation.target_decision_id)) {
      errors.push(`${at}.target_decision_id does not exist`);
    }
    if (operation.op === "remove") {
      if (operation.decision !== null) errors.push(`${at}.decision must be null for remove`);
    } else {
      errors.push(...validateDecision(operation.decision, profile, `${at}.decision`, { idRequired: false }));
    }
    if (!nonempty(operation.rationale, 800)) errors.push(`${at}.rationale is required`);
    if (!nonempty(operation.expected_effect, 800)) errors.push(`${at}.expected_effect is required`);
  }
  return errors;
}

function nextDecisionId(decisions) {
  const largest = decisions.reduce((max, row) => Math.max(max, Number(row.id.slice(1)) || 0), 0);
  return `p${String(largest + 1).padStart(3, "0")}`;
}

export function applyProposal(profile, preferences, proposal, acceptedIds) {
  const base = validatePreferences(preferences, profile);
  const errors = [...base.errors, ...validateProposal(proposal, preferences, profile)];
  if (!Array.isArray(acceptedIds) || acceptedIds.length === 0) errors.push("accept at least one proposed operation explicitly");
  const accepted = new Set(acceptedIds);
  if (accepted.size !== acceptedIds.length) errors.push("accepted operation ids must be unique");
  const known = new Set((proposal.operations ?? []).map((row) => row.id));
  for (const id of accepted) if (!known.has(id)) errors.push(`accepted operation ${id} does not exist`);
  if ((proposal.questions ?? []).length) errors.push("proposal has unresolved questions; answer them before applying changes");
  if (errors.length) throw new Error(errors.join("; "));

  const decisions = preferences.decisions.map((row) => structuredClone(row));
  for (const operation of proposal.operations.filter((row) => accepted.has(row.id))) {
    if (operation.op === "remove") {
      decisions.splice(decisions.findIndex((row) => row.id === operation.target_decision_id), 1);
    } else if (operation.op === "replace") {
      const index = decisions.findIndex((row) => row.id === operation.target_decision_id);
      decisions[index] = { id: operation.target_decision_id, ...structuredClone(operation.decision) };
    } else {
      decisions.push({ id: nextDecisionId(decisions), ...structuredClone(operation.decision) });
    }
  }
  const next = {
    schema: PREFERENCES_SCHEMA_ID,
    profile: structuredClone(preferences.profile),
    revision: preferences.revision + 1,
    parent_digest: digest(preferences),
    label: preferences.label,
    decisions,
  };
  const checked = validatePreferences(next, profile);
  if (!checked.ok) throw new Error(checked.errors.join("; "));
  return next;
}

export function diffPreferences(before, after) {
  if (before.schema !== PREFERENCES_SCHEMA_ID || after.schema !== PREFERENCES_SCHEMA_ID) {
    throw new Error("diff requires two voice-preferences/1 artifacts");
  }
  if (before.profile.digest !== after.profile.digest) throw new Error("cannot diff preferences for different observed profiles");
  if (after.revision <= before.revision) throw new Error("after revision must be newer than before revision");
  const oldRows = new Map(before.decisions.map((row) => [row.id, row]));
  const newRows = new Map(after.decisions.map((row) => [row.id, row]));
  const added = [...newRows.keys()].filter((id) => !oldRows.has(id)).map((id) => newRows.get(id));
  const removed = [...oldRows.keys()].filter((id) => !newRows.has(id)).map((id) => oldRows.get(id));
  const changed = [...newRows.keys()].filter((id) => oldRows.has(id)
    && stableStringify(oldRows.get(id)) !== stableStringify(newRows.get(id)))
    .map((id) => ({ id, before: oldRows.get(id), after: newRows.get(id) }));
  return {
    schema: DIFF_SCHEMA_ID,
    profile_digest: before.profile.digest,
    from_revision: before.revision,
    to_revision: after.revision,
    from_digest: digest(before),
    to_digest: digest(after),
    added,
    removed,
    changed,
  };
}

export function discover(profile, preferences = null, { offset = 0, limit = 3 } = {}) {
  const errors = validateProfile(profile);
  if (preferences) errors.push(...validatePreferences(preferences, profile).errors);
  if (!Number.isInteger(offset) || offset < 0 || offset >= COVERAGE_DIMENSIONS.length) errors.push("offset is out of range");
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) errors.push("limit must be between 1 and 5");
  if (errors.length) throw new Error(errors.join("; "));
  const observations = new Map(profile.observations.map((row) => [row.id, row]));
  const slice = COVERAGE_DIMENSIONS.slice(offset, offset + limit);
  const cards = slice.map((dimension) => {
    const coverage = profile.coverage.find((row) => row.dimension === dimension);
    const support = (coverage.observation_ids ?? []).map((id) => observations.get(id)).filter(Boolean).map((row) => ({
      id: row.id,
      prose: row.prose,
      support: row.support,
      of: row.of,
      rate: row.rate ?? null,
    }));
    return {
      id: `discover-${dimension}`,
      dimension,
      label: DIMENSION_LABELS[dimension],
      observed_status: coverage.status,
      evidence: support,
      current_decisions: (preferences?.decisions ?? []).filter((row) => row.dimension === dimension),
      question: `For ${DIMENSION_LABELS[dimension].toLowerCase()}, should the observed behavior remain evidence only, become a preference, be locked, be avoided, or apply only in named contexts?`,
      choices: ["evidence-only", "prefer", "lock", "avoid", "scope", "show-examples"],
    };
  });
  const next = offset + cards.length;
  return {
    schema: DISCOVERY_SCHEMA_ID,
    profile_digest: digest(profile),
    preference_revision: preferences?.revision ?? null,
    offset,
    next_offset: next < COVERAGE_DIMENSIONS.length ? next : null,
    cards,
  };
}

export function feedbackPrompt(profile, preferences, feedback, { context = null, discoveryCard = null } = {}) {
  const errors = validatePreferences(preferences, profile).errors;
  if (!exactKeys(feedback, ["kind", "statement"])) errors.push("feedback must contain exactly kind and statement");
  else {
    if (!FEEDBACK_KINDS.includes(feedback.kind)) errors.push("feedback.kind is invalid");
    if (!nonempty(feedback.statement, 2_000)) errors.push("feedback.statement is required");
  }
  if (context) errors.push(...validateContext(context));
  if (discoveryCard) {
    if (!isObject(discoveryCard) || !COVERAGE_DIMENSIONS.includes(discoveryCard.dimension)
      || !Array.isArray(discoveryCard.evidence)) {
      errors.push("discovery card is invalid");
    }
  }
  if (errors.length) throw new Error(errors.join("; "));
  const evidence = discoveryCard ?? profile;
  return [
    "Interpret exactly one user style-feedback event under the voice-feedback-interpret contract.",
    "Return voice-preference-proposal/1 matching the supplied strict schema. Do not apply it.",
    "The observed evidence and user preferences are different layers. Do not rewrite the observed evidence.",
    "",
    `BASED_ON_REVISION: ${preferences.revision}`,
    `BASED_ON_DIGEST: ${digest(preferences)}`,
    "",
    "OBSERVED_EVIDENCE:",
    JSON.stringify(evidence, null, 2),
    "",
    "CURRENT_PREFERENCES:",
    JSON.stringify(preferences, null, 2),
    "",
    "FEEDBACK_EVENT:",
    JSON.stringify(feedback, null, 2),
    "",
    "EVENT_CONTEXT:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

export function comparison(profile, preferences, context, decisionId) {
  const decision = preferences.decisions.find((row) => row.id === decisionId);
  if (!decision) throw new Error(`unknown decision ${decisionId}`);
  if (decision.stance !== "experimental") throw new Error("controlled comparison requires an experimental decision");
  const baseline = compileStyle(profile, preferences, context);
  const treatment = compileStyle(profile, preferences, context, { experiments: [decisionId] });
  if (!treatment.active_preferences.some((row) => row.id === decisionId)) {
    throw new Error("experimental decision does not apply to this context");
  }
  const seed = digest({ profile: digest(profile), preferences: digest(preferences), context, decision_id: decisionId });
  const treatmentFirst = Number.parseInt(seed.slice(0, 2), 16) % 2 === 0;
  const candidateA = treatmentFirst ? treatment : baseline;
  const candidateB = treatmentFirst ? baseline : treatment;
  return {
    schema: COMPARISON_SCHEMA_ID,
    comparison_digest: seed,
    decision_id: decisionId,
    question: "Which draft do you prefer, A or B, and what specific passage drove the choice?",
    candidate_a: candidateA,
    candidate_b: candidateB,
    orchestrator_only_mapping: {
      a: treatmentFirst ? "experiment" : "baseline",
      b: treatmentFirst ? "baseline" : "experiment",
    },
  };
}

const DECISION_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    feature: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
    dimension: { type: "string", enum: COVERAGE_DIMENSIONS },
    observation_ids: { type: "array", items: { type: "string" } },
    directive: { type: "string", minLength: 1, maxLength: 500 },
    stance: { type: "string", enum: STANCES },
    control: {
      type: "object", additionalProperties: false,
      properties: {
        mode: { type: "string", enum: CONTROL_MODES },
        observation_id: { type: ["string", "null"] },
        minimum: { type: ["integer", "null"], minimum: 0 },
        aim: { type: ["integer", "null"], minimum: 0 },
        maximum: { type: ["integer", "null"], minimum: 0 },
      },
      required: ["mode", "observation_id", "minimum", "aim", "maximum"],
    },
    scope: {
      type: "object", additionalProperties: false,
      properties: Object.fromEntries(SCOPE_AXES.map((axis) => [axis, { type: "array", items: { type: "string", minLength: 1, maxLength: 80 } }])),
      required: SCOPE_AXES,
    },
    basis: {
      type: "object", additionalProperties: false,
      properties: { kind: { type: "string", enum: FEEDBACK_KINDS }, statement: { type: "string", minLength: 1, maxLength: 2_000 } },
      required: ["kind", "statement"],
    },
  },
  required: ["feature", "dimension", "observation_ids", "directive", "stance", "control", "scope", "basis"],
};

export const PROPOSAL_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    schema: { type: "string", const: PROPOSAL_SCHEMA_ID },
    based_on: {
      type: "object", additionalProperties: false,
      properties: { revision: { type: "integer", minimum: 1 }, digest: { type: "string", pattern: "^[a-f0-9]{64}$" } },
      required: ["revision", "digest"],
    },
    feedback: {
      type: "object", additionalProperties: false,
      properties: { kind: { type: "string", enum: FEEDBACK_KINDS }, statement: { type: "string", minLength: 1, maxLength: 2_000 } },
      required: ["kind", "statement"],
    },
    operations: {
      type: "array", maxItems: 8,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          id: { type: "string", pattern: "^[a-z][a-z0-9-]{1,63}$" },
          op: { type: "string", enum: ["add", "replace", "remove"] },
          target_decision_id: { type: ["string", "null"] },
          decision: { anyOf: [DECISION_SCHEMA, { type: "null" }] },
          rationale: { type: "string", minLength: 1, maxLength: 800 },
          expected_effect: { type: "string", minLength: 1, maxLength: 800 },
        },
        required: ["id", "op", "target_decision_id", "decision", "rationale", "expected_effect"],
      },
    },
    questions: { type: "array", maxItems: 5, items: { type: "string", minLength: 1, maxLength: 500 } },
  },
  required: ["schema", "based_on", "feedback", "operations", "questions"],
};

function readJson(path, label) {
  try { return JSON.parse(readFileSync(resolve(path), "utf8")); }
  catch (error) { throw new Error(`${label} is not valid JSON: ${error.message}`); }
}

function flag(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return "commands: schema proposal | init --profile P [--label L] | validate --profile P --preferences V | discover --profile P [--preferences V] [--offset N] [--limit N] | prompt --profile P --preferences V --feedback F [--context C] [--card D] | compile --profile P --preferences V --context C [--experiments p001,p002] | apply --profile P --preferences V --proposal R --accept op-1,op-2 | diff --from V1 --to V2 | compare --profile P --preferences V --context C --decision p001";
}

export function main() {
  try {
    const command = process.argv[2];
    if (command === "schema" && process.argv[3] === "proposal") return emit(PROPOSAL_SCHEMA);
    if (command === "init") return emit(initPreferences(readJson(flag("--profile"), "profile"), flag("--label", "Default")));
    if (command === "validate") {
      const result = validatePreferences(readJson(flag("--preferences"), "preferences"), readJson(flag("--profile"), "profile"));
      if (!result.ok) throw new Error(result.errors.join("; "));
      return emit({ ok: true });
    }
    if (command === "discover") return emit(discover(
      readJson(flag("--profile"), "profile"),
      flag("--preferences") ? readJson(flag("--preferences"), "preferences") : null,
      { offset: Number(flag("--offset", "0")), limit: Number(flag("--limit", "3")) },
    ));
    if (command === "prompt") return process.stdout.write(`${feedbackPrompt(
      readJson(flag("--profile"), "profile"),
      readJson(flag("--preferences"), "preferences"),
      readJson(flag("--feedback"), "feedback"),
      {
        context: flag("--context") ? readJson(flag("--context"), "context") : null,
        discoveryCard: flag("--card") ? readJson(flag("--card"), "discovery card") : null,
      },
    )}\n`);
    if (command === "compile") return emit(compileStyle(
      readJson(flag("--profile"), "profile"),
      readJson(flag("--preferences"), "preferences"),
      readJson(flag("--context"), "context"),
      { experiments: flag("--experiments", "").split(",").filter(Boolean) },
    ));
    if (command === "apply") return emit(applyProposal(
      readJson(flag("--profile"), "profile"),
      readJson(flag("--preferences"), "preferences"),
      readJson(flag("--proposal"), "proposal"),
      flag("--accept", "").split(",").filter(Boolean),
    ));
    if (command === "diff") return emit(diffPreferences(readJson(flag("--from"), "before"), readJson(flag("--to"), "after")));
    if (command === "compare") return emit(comparison(
      readJson(flag("--profile"), "profile"),
      readJson(flag("--preferences"), "preferences"),
      readJson(flag("--context"), "context"),
      flag("--decision"),
    ));
    throw new Error(usage());
  } catch (error) {
    process.stderr.write(`style-contract: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1]
  && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))) main();

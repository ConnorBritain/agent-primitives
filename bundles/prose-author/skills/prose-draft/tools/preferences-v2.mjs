/** Portable preferences: immutable revisions, independent explicit rules, scoped compilation. */
import { sha256, validateProfileV3 } from "./profile-v3.mjs";
import { ruleErrors } from "./style-rules.mjs";

export const PREFERENCES_V2 = "voice-preferences/2";
export const STYLE_SPEC_V2 = "voice-style-spec/2";
export const SCOPE_AXES_V2 = ["registers", "forms", "audiences", "purposes", "projects"];
const singular = { registers: "register", forms: "form", audiences: "audience", purposes: "purpose", projects: "project" };
export const stableJSON = (v) => Array.isArray(v) ? `[${v.map(stableJSON).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableJSON(v[k])}`).join(",")}}` : JSON.stringify(v);
export const digest = (v) => sha256(stableJSON(v));
export const emptyScope = () => Object.fromEntries(SCOPE_AXES_V2.map((k) => [k, []]));
const nonempty = (s) => typeof s === "string" && s.trim().length > 0;

export function initPreferencesV2(id) {
  if (!nonempty(id)) throw new TypeError("Preference set needs a stable id");
  return { schema: PREFERENCES_V2, id, revision: 1, parent_digest: null, decisions: [] };
}

function decisionErrors(d) {
  if (!d || !nonempty(d.id) || !nonempty(d.feature)) return ["Decision needs id and feature"];
  const errors = ruleErrors(d.rule);
  if (d.rule?.id !== d.id) errors.push("Rule and decision IDs must agree");
  if (!d.scope || Object.keys(d.scope).length !== SCOPE_AXES_V2.length
    || SCOPE_AXES_V2.some((k) => !Array.isArray(d.scope[k]) || d.scope[k].some((s) => !nonempty(s)) || new Set(d.scope[k]).size !== d.scope[k].length)) errors.push("Scope needs five unique string arrays");
  if (!d.basis || !["direct-persistent", "approved-inference", "migration"].includes(d.basis.kind) || !nonempty(d.basis.feedback)) errors.push("Decision needs its feedback provenance");
  if (d.binding !== null && (!d.binding || !/^[a-f0-9]{64}$/.test(d.binding.profile_digest) || !d.binding.observation_ids?.length || d.binding.observation_ids.some((s) => !nonempty(s)))) errors.push("Invalid observation-dependent binding");
  return errors;
}

export function validatePreferencesV2(p) {
  if (p?.schema !== PREFERENCES_V2 || !nonempty(p.id) || !Number.isInteger(p.revision) || p.revision < 1 || !Array.isArray(p.decisions)) return ["Expected voice-preferences/2"];
  const errors = [];
  if (p.revision === 1 ? p.parent_digest !== null : !/^[a-f0-9]{64}$/.test(p.parent_digest)) errors.push("Invalid revision ancestry");
  if (new Set(p.decisions.map((d) => d.id)).size !== p.decisions.length) errors.push("Duplicate decision IDs");
  for (const d of p.decisions) errors.push(...decisionErrors(d).map((e) => `${d.id}: ${e}`));
  return errors;
}

function assertPreferences(p) {
  const errors = validatePreferencesV2(p);
  if (errors.length) throw new TypeError(errors.join("; "));
}

/** Persistent authority comes from the user's instruction, not an edit-distance score.
 * Deliberately narrow recognition: less explicit formulations go through approval.
 */
export function feedbackDisposition(feedback) {
  if (typeof feedback !== "string") throw new TypeError("Feedback must be text");
  return /^(?:please\s+)?(?:always\b|never\b|remember\b)/i.test(feedback.trim()) ? "direct-persistent" : "needs-approval";
}

export function proposePreferencesV2(p, { feedback, operations }) {
  assertPreferences(p);
  if (!nonempty(feedback) || !Array.isArray(operations) || !operations.length) throw new TypeError("Proposal needs feedback and operations");
  return { schema: "voice-preference-proposal/2", based_on: { revision: p.revision, digest: digest(p) }, feedback,
    disposition: feedbackDisposition(feedback), operations };
}

export function applyPreferencesV2(p, proposal, { accepted = [] } = {}) {
  assertPreferences(p);
  if (proposal?.schema !== "voice-preference-proposal/2" || proposal.based_on?.revision !== p.revision || proposal.based_on?.digest !== digest(p)) throw new TypeError("Stale preference proposal");
  if (!Array.isArray(proposal.operations) || !proposal.operations.length) throw new TypeError("Empty operations");
  const ops = proposal.operations, ids = ops.map((o) => o.id);
  if (ids.some((id) => !nonempty(id)) || new Set(ids).size !== ids.length) throw new TypeError("Operation IDs must be unique");
  if (!Array.isArray(accepted) || new Set(accepted).size !== accepted.length || accepted.some((id) => !ids.includes(id))) throw new TypeError("Invalid accepted operation IDs");
  const direct = feedbackDisposition(proposal.feedback) === "direct-persistent";
  if (!direct && !accepted.length) return { status: "approval-required", preferences: p, receipt: "No preference was saved; this interpretation needs approval." };
  const selected = ops.filter((o) => direct && !accepted.length || accepted.includes(o.id));
  const decisions = new Map(p.decisions.map((d) => [d.id, structuredClone(d)]));
  for (const op of selected) {
    if (op.kind === "remove") {
      if (!decisions.delete(op.decision_id)) throw new TypeError(`Unknown preference ${op.decision_id}`);
    } else if (op.kind === "upsert") {
      const d = { ...structuredClone(op.decision), basis: { kind: direct ? "direct-persistent" : "approved-inference", feedback: proposal.feedback } };
      const errors = decisionErrors(d); if (errors.length) throw new TypeError(errors.join("; "));
      decisions.set(d.id, d);
    } else throw new TypeError("Unknown preference operation");
  }
  const next = { ...p, revision: p.revision + 1, parent_digest: digest(p), decisions: [...decisions.values()] };
  return { status: "saved", preferences: next, receipt: { revision: next.revision, parent_digest: next.parent_digest,
    applied: selected.map((o) => o.id), scopes: selected.filter((o) => o.decision).map((o) => ({ id: o.decision.id, scope: o.decision.scope })),
    undo: `Restore revision ${p.revision} through undo; history is preserved.` } };
}

export function undoPreferencesV2(current, previous) {
  assertPreferences(current); assertPreferences(previous);
  if (current.id !== previous.id || current.parent_digest !== digest(previous) || current.revision !== previous.revision + 1) throw new TypeError("Undo requires the exact preceding revision");
  return { ...structuredClone(previous), revision: current.revision + 1, parent_digest: digest(current) };
}

export function compileStyleV2(p, { profile = null, context = {}, overrides = [] } = {}) {
  assertPreferences(p);
  if (profile) {
    const errors = validateProfileV3(profile); if (errors.length) throw new TypeError(errors.join("; "));
  }
  if (!Array.isArray(overrides) || new Set(overrides.map((r) => r.id)).size !== overrides.length) throw new TypeError("Overrides require unique rule IDs");
  for (const r of overrides) { const errors = ruleErrors(r); if (errors.length) throw new TypeError(errors.join("; ")); }
  const candidates = new Map(), selected = new Map(), inactive = [];
  for (const d of p.decisions) {
    if (!SCOPE_AXES_V2.every((axis) => !d.scope[axis].length || d.scope[axis].includes(context[singular[axis]]))) { inactive.push({ id: d.id, reason: "Outside current scope" }); continue; }
    if (d.binding && (!profile || d.binding.profile_digest !== digest(profile) || d.binding.observation_ids.some((id) => !profile.observations.some((o) => o.id === id)))) {
      throw new TypeError(`Preference ${d.id} needs validated rebinding to the current profile`);
    }
    const specificity = SCOPE_AXES_V2.filter((axis) => d.scope[axis].length).length;
    candidates.set(d.feature, [...(candidates.get(d.feature) ?? []), { decision: d, specificity }]);
  }
  for (const [feature, entries] of candidates) {
    const maximum = Math.max(...entries.map((e) => e.specificity));
    const winners = entries.filter((e) => e.specificity === maximum);
    if (winners.length > 1) throw new TypeError(`Conflicting equally specific preferences for ${feature}; clarify before drafting`);
    selected.set(feature, winners[0]);
    inactive.push(...entries.filter((e) => e !== winners[0]).map((e) => ({ id: e.decision.id, reason: "A more specific preference applies" })));
  }
  // Explicit one-off rules replace the same decision ID only in this compilation.
  const rules = new Map([...selected.values()].map(({ decision }) => [decision.id, decision.rule]));
  for (const r of overrides) rules.set(r.id, r);
  const active = [...selected.values()].map(({ decision }) => decision);
  return { schema: STYLE_SPEC_V2, preference_revision: p.revision, preference_digest: digest(p),
    profile, profile_digest: profile ? digest(profile) : null, context,
    active_preferences: active, inactive_preferences: inactive, rules: [...rules.values()],
    override_ids: overrides.map((r) => r.id), enforcement: "Mechanical rules enforced on final bytes; observed tendencies and semantic preferences remain advisory/reviewed." };
}

/** Preserve old intent without inventing a hard constraint from an old qualitative lock.
 * Old measured controls retain their profile/2 binding and require explicit rebinding.
 */
export function migratePreferencesV1(old) {
  if (old?.schema !== "voice-preferences/1" || !Array.isArray(old.decisions) || !old.profile?.digest) throw new TypeError("Expected historical preferences/1");
  const p = initPreferencesV2(old.label || old.profile.id || "migrated-preferences");
  const decisions = old.decisions.map((d) => {
    let rule = { id: d.id, kind: "semantic", directive: d.directive };
    const control = d.control;
    if (["suppress-counted", "count-range"].includes(control?.mode)) {
      // A historic observation id is not a measurement id. No guessing across versions.
      rule = { ...rule, directive: `${d.directive} [Legacy measured control requires explicit rebinding.]` };
    }
    return { id: d.id, feature: d.feature, scope: structuredClone(d.scope), rule,
      basis: { kind: "migration", feedback: d.directive },
      binding: d.observation_ids?.length ? { profile_digest: old.profile.digest, observation_ids: d.observation_ids } : null };
  });
  const result = { ...p, decisions };
  assertPreferences(result); return result;
}

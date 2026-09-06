/** Small, deterministic conversational views. These never mutate preferences. */
import { compileStyleV2, digest, stableJSON, validatePreferencesV2 } from "./preferences-v2.mjs";
import { validateProfileV3 } from "./profile-v3.mjs";
import { DIMENSION_LABELS } from "./profile-contract.mjs";

function valid(preferences) {
  const errors = validatePreferencesV2(preferences);
  if (errors.length) throw new TypeError(errors.join("; "));
}

export function preferenceDiff(from, to) {
  valid(from); valid(to);
  if (from.id !== to.id) throw new TypeError("Cannot compare different preference identities");
  const before = new Map(from.decisions.map((d) => [d.id, d]));
  const after = new Map(to.decisions.map((d) => [d.id, d]));
  return { schema: "voice-preferences-diff/2", from: { revision: from.revision, digest: digest(from) },
    to: { revision: to.revision, digest: digest(to) },
    changes: [...new Set([...before.keys(), ...after.keys()])].sort().flatMap((id) => {
      const a = before.get(id) ?? null, b = after.get(id) ?? null;
      return stableJSON(a) === stableJSON(b) ? [] : [{ id, kind: !a ? "added" : !b ? "removed" : "changed", before: a, after: b }];
    }) };
}

export function discoveryCards(preferences, { profile = null, offset = 0, limit = 3 } = {}) {
  valid(preferences);
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 3) throw new TypeError("Discovery needs a nonnegative offset and one to three cards");
  if (profile) {
    const errors = validateProfileV3(profile);
    if (errors.length) throw new TypeError(errors.join("; "));
  }
  const rows = profile ? profile.coverage.map((row) => ({
    id: row.dimension, label: DIMENSION_LABELS[row.dimension] ?? row.dimension, status: row.status,
    observations: profile.observations.filter((o) => row.observation_ids.includes(o.id)),
    measurements: profile.measured.measurements.filter((m) => row.measurement_ids.includes(m.id)),
    reason: row.reason ?? null,
    question: `For ${DIMENSION_LABELS[row.dimension] ?? row.dimension}, keep this as evidence only, or choose a specific preference?`,
  })) : [
    { id: "punctuation", label: "Punctuation choices", question: "Is there any punctuation you explicitly want to require or avoid?" },
    { id: "phrasing", label: "Phrases you choose", question: "Are there particular phrases you want to use or avoid?" },
    { id: "register", label: "Situations and readers", question: "Which writing situation needs a different tone, and how should it differ?" },
  ].map((row) => ({ ...row, status: "not-evaluated", observations: [], measurements: [], reason: "No learned profile; preferences can still be saved" }));
  const cards = rows.slice(offset, offset + limit).map((row) => ({ ...row,
    preferences: preferences.decisions.filter((d) => d.feature === row.id || d.binding?.observation_ids.some((id) => row.observations.some((o) => o.id === id))) }));
  return { schema: "voice-style-discovery/2", preference_digest: digest(preferences), profile_digest: profile ? digest(profile) : null,
    cards, next_offset: offset + cards.length < rows.length ? offset + cards.length : null,
    interpretation: "Observed rates are advisory; sample absences are not universal prohibitions." };
}

/** A one-feature preview is not a saved preference or a causal experiment. */
export function comparePreference(preferences, { decision_id, rule, context, profile = null }) {
  const a = compileStyleV2(preferences, { context, profile });
  const active = a.active_preferences.find((d) => d.id === decision_id);
  if (!active || rule?.id !== decision_id) throw new TypeError("Comparison must replace exactly one active preference using its existing ID");
  if (stableJSON(active.rule) === stableJSON(rule)) throw new TypeError("Comparison needs an actual rule change");
  const b = compileStyleV2(preferences, { context, profile, overrides: [rule] });
  return { schema: "voice-style-comparison/2", preference_digest: digest(preferences), feature: active.feature,
    variants: [{ label: "A", rules: [], style: a }, { label: "B", rules: [rule], style: b }],
    changed_decision: decision_id, saved: false,
    limitation: "Hold the brief, facts, examples, profile and model settings fixed. Sampling differences are not evidence for unrelated preferences." };
}

---
name: prose-style-tune
description: Discover, save, scope, compare, version, or undo personal writing-style preferences; inspect opt-in numerical writing history and changes over time. Use for persistent style rules, guided comparisons, history ingestion, baselines, export, or deletion. Observations and user choices stay separate.
---

# Prose style tune

Resolve the shared writing identity with the sibling runtime's `identity resolve`
before locating preferences. For setup, switching writers or publishing a refreshed
profile, read [the identity reference](../prose-draft/references/identities.md).
Preference and history commands resolve the registered default; use
`--writing-identity ID` for another selection. Keep all persistent state outside
plugin installations. Selection does not enable numerical or rhetorical collection.

Use the sibling drafting skill's production runtime for storage and compilation.
Read [references/session.md](references/session.md) before acting. The tool owns
revisions, digests, scope precedence, conflict detection and undo. Never
hand-edit saved preference files or ask users to review raw JSON.

Keep observed `voice-profile/3`, independent choices in `voice-preferences/2`,
and context-specific `voice-style-spec/2` distinct. Tuning never changes the
observed profile. Explicit rules need no profile. Historical versions remain
historical; migrate or refresh explicitly.

## Interpret corrections narrowly

- A clear persistent instruction (“always,” “never,” “remember this”) authorizes
  saving that instruction. Show what was saved, its scope, revision and undo.
- A draft-specific edit changes only this draft. Offer a narrow persistent
  proposal if useful; never save an inference without approval.
- Ambiguous scope or meaning needs a short clarification, even when the user
  used “always.” Do not infer an essay-wide preference from one edited word.

Encode supported literal phrases, exact required text, punctuation, word limits
and named count ranges as mechanical rules. Other preferences remain semantic
and reviewable, not falsely enforced. Bind to observations only when the choice
actually depends on them. Independent rules survive profile refresh; dependent
bindings require reviewing new evidence before rebinding.

## Discover and compare in small batches

Use `preferences discover` for at most three cards. Present a short cited
snippet, the limited observed tendency when available, and one question per
card. Without a profile, ask about choices without pretending they were
observed. Wait for an answer or skip before another batch. Evidence-only answers
create no preference.

Use `preferences compare` to preview one change to an active preference without
saving it. Generate two variants with the same brief, facts, examples, profile
and model settings; only the selected rule changes. Present A/B without the
mapping, ask what the user would keep or edit, then reveal the mapping. A choice
supports only the tested feature; unrelated sampling differences do not become
new rules. Inferred preferences still require approval. Missing drafting
dependencies mean no verified comparison.

## Scope, history and delivery

For numerical writing history, collection consent, selected-file ingestion,
baselines, trends, export or deletion, read the sibling drafting skill's
`references/history.md` and use its runtime. This is a different store from
preference revision history. Collection is opt-in; rhetorical model calls need
separate opt-in. Surface a small relevant set of comparisons, not raw JSON.
History never automatically rewrites preferences or promotes generated work to
independent human evidence.

Compile with current register/form/audience/purpose/project context.
More-specific rules override broader ones for the same feature. Equally
specific conflicts require clarification. A one-off override changes only the
current job, never a saved rule.

Use `preferences diff` for actual changes and `preferences undo` to restore the
previous state as a new revision without erasing history. State which scope
changed. Route writing through sibling `prose-draft` so the exact delivered bytes
are checked; the tuner does not certify prose.

Observed absences mean “not observed in these samples,” not universal bans.
Never claim resemblance, quality, factual accuracy or detector success.

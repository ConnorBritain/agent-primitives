---
name: prose-draft
description: Draft, rewrite, or continue prose using personal writing examples and explicit style preferences. Use for short replies, notes or outlines turned into prose, passage rewrites, and writing in a chosen personal style. Supports preference-only help without a corpus; does not promise resemblance or factual accuracy.
---

# Prose draft

Use the production runner for writing and checking, not an improvised sequence
of legacy acceptance scripts. You handle the conversation and authorized inputs;
the runner dispatches models, checks delivered text, and records repairs.
Read [references/runtime.md](references/runtime.md) before the first invocation.
The commands there are agent internals, never homework for the user.

## Choose the task and evidence

- New prose from a brief, topic, notes or outline: `draft`. “Blank page” means
  there is no existing passage to rewrite.
- A supplied passage to change: `rewrite`; preserve supplied facts, quotations,
  qualifications and scope. Show original and result when useful.
- Extend a passage: `continue`; supply relevant existing text for coherence.
  It is task context, not a new human corpus sample.

Determine form and purpose from the request. Ask one short question if register
is genuinely unchoosable; do not force users to fill every context field.
Reuse their chosen profile and preference store. Without samples, provide
preference-only assistance and say that a learned voice was not evaluated.
At session start use `preferences locate` to find the shared persistent store;
if it exists, pass its directory as the job's `preference_store`. Do not silently
start with empty preferences just because this is a new conversation.

New profiles use `voice-profile/3`: visible author-written prose, per-document
distributions, and ten coverage dimensions. Five independent pieces and 1,000
aggregate author-written words per selected register/form support a profile;
short pieces count. Below this floor, label the evidence limited. Historical
profiles remain readable with the historical tools but need an explicit current
refresh for this runtime; never silently relabel old measurements.

Pass only the brief, task facts, relevant passage, active preferences, profile,
and authorized human samples. Default selection is at most three matching whole
human examples. Honor profile-only requests with `examples: false`. Observed
tendencies are advisory, not quotas; “not observed” does not mean forbidden.
Examples teach style, not the user's biography. Never pass a tell catalog into
generation, even as repair advice.

Encode every explicit, supported mechanical instruction as a concrete rule:
required/prohibited text, punctuation, word limits or supported count ranges.
Do not put these only in the brief or classify them as `semantic`. Use the rule
examples in the runtime reference; reserve semantic rules for contextual requests
without a deterministic checker. Draft-specific rules do not save preferences.

## Run and return the exact result

Invoke `tools/prose-runtime.mjs run` using the current Claude or Codex harness
and its configured model. Do not substitute a model or request an API key.
The runner performs mechanical checks on every output, task review, targeted
voice review when a profile exists, fidelity review on rewrites and repairs,
and at most two problem-specific repair cycles. Use deep review for researched
or explicitly publication-sensitive work; supply actual source content as task
facts, not just URLs.

Link to `delivery.md` as the authoritative checked delivery: it contains the
exact draft and a runtime-generated receipt. Verify it using `check-result`
with `--delivery` before handoff. Do not edit the generated receipt or infer a
missing dependency from the skill list: recorded statuses determine what ran.
You may also display the exact `draft.md` bytes in chat. Label any host-written
chat summary unverified; it is not a replacement for the generated receipt.
A requested change needs a new rewrite run; earlier checks do not cover new
text. An invalidated result must not retain its previous checked label.

Add a link to the detailed sidecar. Disclose claims requiring verification and
supported instructions omitted by the draft. Report model calls and elapsed time when relevant, not
estimated dollars. Keep JSON and measurement tables out of ordinary conversation.

`checked` means configured checks ran on these bytes, not that the draft is good
or resembles the author. `incomplete` and `ungated` are not certifications:
name failed or unavailable checks. Missing `prose-tell-scan`, a required
`prose-review` dependency, interrupted calls, or exhausted repairs must remain
visible. Do not restart a whole run just to obtain a passing result.

If the host sandbox prevents the authenticated CLI from starting, report ungated
and use the host's normal permission request when available. Do not disable a
sandbox or change authentication to work around a denial without user approval.

## Learn from corrections

Use sibling `prose-style-tune` for persistent preferences. Clear “always,”
“never,” or “remember” instructions save with scope/version and undo receipts.
Ordinary edits stay task-local; inferred preferences need approval. A one-word
correction can support a narrow proposal. Never apply the historical corpus
ingestion edit-percentage floor to feedback learning or silently add generated
text to `corpus/human/`.

## Limits

Mechanical rules are reproducible; semantic review can miss mistakes. The
runner restricts subprocess context and audits tool activity, but reports
isolation as partial, not general filesystem isolation. Observed distributions
allow natural variation; they do not establish quality or prove that prose
sounds like you. Verify consequential factual additions against real sources.

# prose-author — current invocation protocol

Users converse with the skills. The skills invoke the production runner; they
do not manually reconstruct its review/repair loop.

## Writing sequence

1. Resolve the task's form, purpose and relevant context. Locate saved
   preferences, select the intended identity, and compile applicable rules.
2. Validate supplied current profile/source locks or render one profile from
   authorized human samples. No corpus permits preference-only work; sparse
   evidence stays labeled limited.
3. Dispatch the drafter with authorized task facts/passage, profile, preferences
   and at most three selected whole human examples. A profile-only option
   withholds examples. No tell catalog reaches drafting.
4. Check visible final prose against explicit mechanical rules. Record exclusions,
   observed-pattern diagnostics, copying flags and the Tier A artifact scan.
5. Review task adherence and semantic instructions. Add independent voice review
   when a profile exists; add fidelity scanning/review for rewrites and repairs.
   Use deeper claim auditing for researched or publication-sensitive work.
6. Repair identified problems at most twice, retaining the same profile,
   preferences and selected examples. Preserve substance and recheck all final
   bytes. No automatic paragraph pruning merely to satisfy length.
7. Verify `delivery.md` with `check-result --delivery`, then link it as the
   authoritative delivery: exact prose plus the recorded receipt. Host-written
   chat summaries are explicitly unverified, not replacement receipts.
   Link the sidecar for disclosures, omissions and unresolved checks. Do not
   infer statuses from the host's skill list. A later edit invalidates the
   earlier result.

Observed frequency is advisory, not permission to ignore supported style.
Reviewers must distinguish ordinary variation from concrete substitutions or
losses that flatten the observed behavior. Every supported observation is
accounted for; a numerical departure alone is not a semantic finding.

## Context boundaries

An opted-in writing identity may attach numerical history. Snapshot the reference
before generation and exclude the current document/revisions. Measure each draft
stage against that reference; optional rhetorical analysis uses its own bounded
budget. Send compact advisory history evidence only to the existing voice review,
not to the drafter as new constraints. Storage/analysis failures are disclosed
separately and cannot erase an otherwise usable writing result.

The read-only rhetorical annotator receives only normalized author-prose
paragraphs and the fixed rubric. Located annotations are validated transiently;
history retains numbers and sanitized call metadata, not text or explanations.
There is no automatic ingestion of outside files or promotion into a corpus.

| Stage | Authorized inputs | Excluded |
| --- | --- | --- |
| Profile renderer | Whole human samples, provenance, deterministic measurements | Tell catalog, generated drafting history |
| Feedback interpreter | Exact feedback, current preferences, optional profile/card, context | Corpus, tell catalog, unrelated history |
| Drafter/repair | Brief, facts, relevant passage, profile/rules, selected whole examples, identified repair findings | Unselected corpus, tell catalog, unrelated session history |
| Task/claim reviewer | Exact draft, brief, supplied facts, active instructions | Example biography treated as user facts |
| Voice reviewer | Exact draft, authorized human evidence, profile, preferences, diagnostics | Drafter reasoning or catalog targets |
| Fidelity reviewer | Source/candidate pair and deterministic missing-atom scan | Unrelated style optimization |

The adapters use fresh authenticated CLI contexts, restrict tools/configuration
where supported, and inspect execution records. Report isolation as partial.
An empty tool list is not a proof of general filesystem isolation.

## Corrections and scope

At the start of a new session, locate the persistent store rather than silently
using empty preferences. A direct persistent instruction saves with a visible
scope/version/undo receipt. An inferred interpretation requires approval.
Ambiguous meaning or scope needs a short question. Draft-specific edits stay
local; a one-off override does not rewrite a saved rule.

More-specific rules override broader ones for the same feature. Equally
specific conflicts refuse compilation. Independent rules survive profile
refresh. An observation-dependent rule requires a valid binding to new evidence.
Undo restores prior decisions as a new revision; it does not erase history.

Discovery serves at most three cards. A controlled comparison varies one active
rule while holding task facts, profile, examples and model settings fixed. It
does not save either variant. Ask what the user would keep/edit; sampling
differences do not authorize unrelated preferences.

## Result interpretation

`checked` means the configured checks completed on the recorded bytes, not that
the prose is good or resembles its author. `incomplete` names unmet instructions
or exhausted repairs. `ungated` names missing or unresolved checks. A refusal
contains no draft. Every check distinguishes passed, failed and not-evaluated.

No human attestation is required. Disclosed claims still need verification when
consequential, and a semantic review can overlook an error. Never claim detector
success. Keep the receipt short; detailed JSON is a sidecar, not a user task.

The current path supersedes the quota-era conformance/prune pipeline.
Historical tools, raw runs and thresholds remain preserved separately; they
are not evidence that a current prompt was exercised.
## Shared identity preparation (v0.6)

Before writing or tuning, resolve the selected shared identity. Registration and
default selection are explicit user choices; corpus, profile, preferences and
numerical history remain separate and outside plugin caches. Resolve once before
the run snapshot, then keep those inputs fixed. A one-off author can opt out.
History still requires consent, and generated prose never becomes human corpus
material automatically. See [identity operations](skills/prose-draft/references/identities.md).

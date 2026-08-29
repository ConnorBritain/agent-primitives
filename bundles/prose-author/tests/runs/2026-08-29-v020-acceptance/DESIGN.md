# prose-author v0.2.0 acceptance — locked design

**This file and `CASES.json` must be committed before the run is prepared. The prepared
manifest, final agent prompts, schemas, validators, fixtures, and their transitive scoring
closure must then be committed before any model dispatch. Results may populate the run;
they may not change this design, the cases, profile assignment, or ship bar.**

## Question

Can the final `voice-profile-render` → `voice-draft` pipeline clear the unchanged generator
ship bar on two modern, licensed, single-author corpora without selecting a favourable
render or treating a model-authored claim inventory as completeness evidence?

## Inputs

- `doctorow-blog`: ten CC BY 4.0 Pluralistic posts.
- `eff-mullin`: eleven CC BY 4.0 EFF Deeplinks posts by Joe Mullin.
- Three fresh `voice-profile/2` renders per corpus. All six must pass the ten-dimension
  coverage contract and contain no contradictory mechanical observations.
- Ten fresh prompts per corpus: four essay topics, three title-and-outline posts, and three
  replies. The two corpora receive the same ten prompts so topic and form remain fixed while
  voice evidence changes.
- Profile assignment is the fixed round robin `r1`, `r2`, `r3`, repeat, independently within
  each corpus. A failed render or draft is not replaced by a favourable alternative.
- One underdetermined-register refusal per corpus.

No profile, draft, refusal, claim review, or critic draw from a historical run contributes
to this result.

## Dispatch and provenance

- The prepared manifest pins every stage's harness, model, effort, transport, timeout,
  concurrency, prompt body, schema, corpus lock, and implementation closure.
- `voice-draft` receives only the request and assigned profile. It receives no corpus,
  filesystem, network, connector, collaboration, or shell access. Native harness events are
  preserved and reconstructed where the adapter exposes them.
- A separate model claim audit reads the request and immutable sentence units but no voice
  profile. It is assistive evidence, not the completeness authority. It may disclose a
  finite verification claim or reject a hard factual failure; it never rewrites prose.
- `CLAIMS-AUDIT.json` uses `prose-author-claims-audit/5`. A named human reviewer must decide
  every immutable sentence as `request-supported`, `listed-for-verification`, `non-factual`,
  or `requires-change`, using independently selected exact request evidence, exact
  per-sentence public claims, or the complete canonical sentence plus an independent closed
  semantic basis and rationale. Any `requires-change` blocks critics and invalidates the run.
- The completed human review and attestation must be committed as their immutable first-add
  version before any critic call. Every critic invocation records that exact audit hash and
  commit. Final checking requires every immutable critic record to have been first committed
  strictly after the audit anchor.
- `prose-voice-critic` runs at k=3 for each draft: sixty fresh draws, with no redraws. Each
  draw receives only its staged corpus and draft, not the profile, claim audit, expected
  verdict, other cells, or prior draws.
- Raw responses, native events, prompt hashes, agent hashes, corpus locks, canonical
  assemblies, disclosures, and score inputs remain independently reconstructable.

## Bar

Unchanged from `.planning/2026-08-07-generator-ship-bar.md`:

1. Every draft has at least two of three `CLEAN` verdicts.
2. Every draft has at most 1.0 findings per draw.
3. Zero fabricated citations.
4. Zero corpus leakage outside text already present in the assigned profile.
5. Both underdetermined prompts refuse with no draft.
6. No draft claims resemblance, quality, or detector performance.

All twenty drafts and all structural gates must pass. Profile validation, provenance,
contract, audit, or structural failure invalidates the whole run. After any implementation
fix, a complete new 20-draft, 2-refusal, 60-critic run is required; favourable cells from
this run cannot be reused.

## Evidence audit

Before scoring, final checking must:

- reconstruct all six profiles from raw responses and deterministic measurements;
- verify all ten coverage dimensions, rate arithmetic, locators, independent recounts, and
  k=3 mechanical stability;
- reconstruct every draft, refusal, audit overlay, disclosure, prompt, and critic result;
- bind each human sentence decision to its canonical source, request evidence, exact public
  claim inventory, quotation inventory, and immutable draft hash;
- prove repository commit ordering from the human audit anchor through critic evidence;
- recompute all structural gates, tallies, and the unchanged numeric bar from raw evidence.

Handwritten verdicts, selected redraws, mutable artifact pointers, after-the-fact human
review, or a model's assertion that its own claim list is complete are not accepted.

## What a pass does not establish

- It does not show that the system sounds like a private user. No private corpus is part of
  this release gate.
- It is evidence from two modern licensed authors and twenty prompts, not a general
  resemblance, prose-quality, authorship-detector, or universal style-fidelity claim.
- It does not validate poetry, translation, tables, code, whole-book generation, or every
  register supported by either corpus.
- Human reviewer identity is an operational attestation rather than cryptographic identity.
  Git proves evidence commit order, not the provider's wall-clock execution time.
- The run validates the pinned harness adapters and models used here. It does not establish
  equivalent behavior for every coding-agent harness, model, or subscription plan.

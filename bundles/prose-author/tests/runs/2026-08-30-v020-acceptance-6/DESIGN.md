# prose-author v0.2.0 acceptance — locked design, complete rerun 6

**This file and `CASES.json` must be committed before the run is prepared. The prepared
manifest, final agent prompts, schemas, validators, fixtures, and their transitive scoring
closure must then be committed before any model dispatch. Results may populate the run;
they may not change this design, the cases, profile assignment, or ship bar.**

## Question

Can the final `voice-profile-render` → `voice-draft` pipeline clear the unchanged generator
ship bar on two modern, licensed, single-author corpora without selecting a favourable
render or letting the drafting invocation certify its own factual completeness?

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
- Every stage uses the subscription-backed Codex CLI with `gpt-5.6-luna`, native structured
  output, concurrency one, and a twelve-minute per-call timeout. No direct provider API key,
  fallback model, parallel draw, or runtime override is permitted.
- `voice-draft` receives only the request and assigned profile. It receives no corpus,
  filesystem, network, connector, collaboration, or shell access. Native harness events are
  preserved and reconstructed where the adapter exposes them.
- Every non-refusal candidate then receives exactly one mandatory semantic-revision call
  against the same request, profile, immutable candidate, and deterministic count report.
  The revision is always used and the candidate can never ship, so this is neither a redraw nor
  selection among alternatives. Deterministic validation requires the revised draft to satisfy
  every semantic-bearing measured band and the requested word target within the locked tolerance.
  Candidate and revision prompts, raw results, normalized sources, and hashes remain separate.
- Every semantic revision then receives one mandatory `voice-draft-conformance-patch/1`
  call against that same request and profile. This is a fixed pipeline stage, not a redraw:
  it emits at most twelve exact, uniquely anchored local replacements, accounts for all ten
  coverage dimensions, and is always applied to the initial draft when valid. Deterministic
  code rejects ambiguous or overlapping anchors, material expansion, movement away from the
  requested word target, any anchor spanning a paragraph boundary, cumulative replacement of
  more than 20% of source words (with a 24-word floor and 120-word ceiling), a silent coverage
  omission, an unnamed measurement delta, a measurement/coverage-dimension mismatch, any
  structural change outside safe dash, parenthesis, and meaning-equivalent contraction-form
  transformations, or any final measured habit outside its unchanged profile-derived band.
  The comparison preserves case, words, Unicode code points, line-ending sequences, unnamed
  punctuation, Markdown, line breaks, and paragraph boundaries. A named punctuation form may move at most one adjacent ordinary
  ASCII separator; indentation, tabs, repeated or trailing spaces, Markdown links/code,
  and all other structure remain exact. A draft containing any Markdown link or code signal
  is immutable as a whole in patch mode; the conformer returns no edits, and the initial
  draft must already satisfy every measured target. This fail-closed boundary avoids a
  partial Markdown parser whose local anchors could miss multiline or nested syntax.
  Closed contractions such as `let us`/`let's` are
  bidirectional. An ambiguous `'d` or `'s` form may be introduced only when the exact
  source spells out `had`, `would`, `is`, or `has`; the explicit source fixes the meaning
  without branching. An already ambiguous source contraction is never expanded by patch
  mode, so forms such as `he'd read` and `he'd run` fail closed rather than choosing a
  convenient auxiliary. Every contraction-changing patch must use the exact global minimum
  number of form transitions, even when the net whitespace word delta is zero. The deterministic
  minimum enumerates permitted final contraction and uncontracted-negative count pairs, pins every
  initially failing row to its nearest boundary, and prices a pair as
  `|Δ uncontracted negatives| + |Δ contractions + Δ uncontracted negatives|`. Distinct contracted
  surfaces, including apostrophe-glyph changes and spellings with a shared expansion, are never
  treated as zero-cost aliases. Question-mark, pronoun-family, profanity, and other semantic-bearing
  count changes are not patchable. The initial draft and patch remain separate immutable evidence;
  there is no candidate selection.
- Semantic-bearing hard rows use the deterministic length-scaled center as an exact generation
  target. This is a safety margin for counts the patch cannot repair, not a replacement ship bar:
  the unchanged min/max band remains the sole deterministic acceptance range. A draft inside that
  unchanged range is structurally accepted even if it misses the center; a draft outside it fails.
- Invented quotations and paraphrased opponent positions are both prohibited. A generic claim such
  as `the vendor will say ...` remains attribution without quotation marks unless the request or a
  supplied source provides that position. The independent audit rejects, rather than discloses, an
  invented attribution.
- A separate claim-auditor invocation reads the request and every immutable sentence unit but
  no voice profile. Its prompt body, harness, model, effort, transport, schema, raw response,
  native event evidence, and output hash are locked independently from the drafting invocation.
  It may clear a complete sentence, disclose each unsupported proposition into the public claim
  inventory, or reject fabricated attribution, invented biography, corpus leakage, and other
  hard factual failures. It never revises prose and cannot share an invocation with the drafter.
- `CLAIMS-AUDIT.json` uses `prose-author-claims-audit/6`. Deterministic assembly maps every
  immutable auditor row to `cleared`, `listed-for-verification`, or `requires-change`, binds it
  to the canonical sentence hash, exact audit prompt/raw/output hashes, and source-derived
  factual-candidate flags, and requires exact per-sentence public claim references. A scalar completeness assertion, missing sentence,
  handwritten decision, alternate source pointer, alternate audit pointer, same-paragraph claim,
  or drafting-agent self-audit fails closed. Any `requires-change` blocks critics and invalidates
  the run. No human attestation is required or accepted as a substitute for this audit.
- The completed independent audit checkpoint must be committed as its immutable first-add
  version before any critic call. Every critic invocation records that exact checkpoint hash and
  commit. Final checking requires every immutable critic record and Codex companion to have been
  first committed strictly after the checkpoint anchor.
- The checkpoint proves disclosure completeness and provenance for this voice test. It does not
  claim that uncited prose has been independently fact-checked, and it does not require a human
  to source every disclosed generalization before voice criticism. Fabricated citations remain
  a zero-tolerance structural failure.
- `prose-voice-critic` runs at k=3 for each draft: sixty fresh draws, with no redraws. Each
  draw receives only its staged corpus and draft, not the profile, claim audit, expected
  verdict, other cells, or prior draws.
- Current `voice-profile-source/4` qualitative support bookkeeping is normalized by the
  deterministic assembler as an exact filename set: repeated support filenames are removed
  before support tallying, the exact removal count is recorded in `source_normalizations`,
  and the raw model source remains preserved unchanged. At least two distinct supporting
  filenames are still required. Final checking reassembles the raw source and requires exact
  stored-versus-derived normalization metadata; historical source/3 behavior is unchanged.
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
- reconstruct every candidate, mandatory semantic revision, exact conformance patch, conformed source, refusal, audit
  overlay, disclosure, prompt, and critic result;
- bind each independent sentence decision to its canonical source, exact auditor result,
  public claim inventory, quotation candidates, locked auditor provenance, and immutable draft hash;
- prove repository commit ordering from the independent audit checkpoint through critic evidence;
- recompute all structural gates, tallies, and the unchanged numeric bar from raw evidence.

Handwritten verdicts, selected redraws, mutable artifact pointers, drafting-invocation
self-certification, or an unbound model assertion that its claim list is complete are not accepted.

## What a pass does not establish

- It does not show that the system sounds like a private user. No private corpus is part of
  this release gate.
- It is evidence from two modern licensed authors and twenty prompts, not a general
  resemblance, prose-quality, authorship-detector, or universal style-fidelity claim.
- It does not validate poetry, translation, tables, code, whole-book generation, or every
  register supported by either corpus.
- The independent auditor is another model invocation, not an oracle. Complete sentence coverage,
  prompt separation, public disclosure, candidate flags, and immutable provenance make silent
  factual invention harder and auditable; they do not mechanically prove entailment or truth.
- Git proves evidence commit order, not the provider's wall-clock execution time.
- The run validates the pinned harness adapters and models used here. It does not establish
  equivalent behavior for every coding-agent harness, model, or subscription plan.

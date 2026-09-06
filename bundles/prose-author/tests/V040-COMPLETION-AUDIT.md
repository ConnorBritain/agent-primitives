# v0.4.0 completion audit — not yet complete

This maps the approved five-milestone plan to inspected code and recorded
evidence. A passing deterministic test is not proof of prose quality, semantic
accuracy, or correct behavior by every outer coding agent. The remaining
integration failures are retained, not converted to passes by this audit.

## 1. Measurement and explicit rules

| Requirement | Evidence and current finding |
|---|---|
| Visible prose excludes markup destinations, metadata and code; locations/exclusions retained | `visible-prose.mjs`; independent expected-count and original-offset fixtures in `suite-v040.mjs` cover links, definitions, HTML, entities, metadata, code and unterminated fences. Verified within the documented parser limits. |
| Quoted material separated | The same suite tests block/HTML quotations and caller-supplied ranges. Semantic identification of every inline quotation is deliberately not claimed. |
| Parenthetical contamination and missing-length bypass corrected | Independent Mullin link fixtures, exact-zero violations, absent target and empty-denominator cases pass. Current measurements reproduce 97 Doctorow and 11 Mullin parenthetical spans, not the historical contaminated Mullin count. |
| Per-document/group distributions and held-out human deviations | `v040-measurements.mjs`, `fixtures/v040/MEASUREMENTS.json` and `profile-v3.mjs` record document/group provenance. Held-out tests exclude the held-out piece from its reference set. Unknown form/register labels remain unknown. |
| Tendencies advisory; observed absence not prohibition | `compareObserved`, runtime advisory-ID review accounting, draft prompt and regression fixtures distinguish observations from explicit rules. Live Claude profile output retained reviewed advisory omissions. |
| Independent hard rules; semantic preferences not fake mechanical checks | `style-rules.mjs` implements literal phrases, required text, punctuation, word limits and enumerated count ranges. Unsupported semantic rules report not-evaluated mechanically. Current fixtures reproduce both passing and failing exact bytes. |
| Profile/3, preferences/2 and spec/2; historical readers/scoring preserved | Current contracts are separate from historical tools. Historical prompt bodies are archived and hash checked; current measurement and comparison checks reproduce without rewriting old evidence. |

## 2. Production runtime

| Requirement | Evidence and current finding |
|---|---|
| Reusable dependency-free runtime behind skills | `prose-runtime.mjs`, `writing-runtime.mjs`, adapter/check/review modules and installed skill references implement separate preparation, dispatch, checking, review, repair and assembly. Node is the production dependency; no acceptance-bar runner is imported. |
| Claude/Codex authenticated CLI adapters; configured model and actual usage | Both adapters have live installed draft/rewrite/continue records. Models were inherited, not silently substituted. CLI launch counts and elapsed time are recorded without dollar estimates. |
| Restricted authorized context, audited execution, honest isolation | Adapter arguments disable unrelated tools/configuration where supported; parsers reject unexpected tool records. Isolation remains explicitly partial. Restricted parent-sandbox initialization is a recorded Codex failure, not a proven supported environment. |
| Up to three whole human examples; deterministic matching; profile-only | Selection regressions cover whole samples, nonhuman exclusions, known form/register mismatches and unknown-label warnings. Repairs retain the same examples/profile/rules. The comparison records all three evidence conditions. |
| Tell catalog excluded; copying checked afterward | Generation and repair receive no catalog. Copying checks distinguish authorized source quotations from unexplained exact overlap. Twelve-word overlap is a heuristic, not proof against all copying. |
| Task-scaled review and at most two targeted repairs | Runtime fixtures and live records show task review, profile voice review, rewrite/repair fidelity review and explicit deep claim auditing. Interrupted audits cannot become checked outputs. A live Codex review disagreement stopped incomplete after two repairs. |
| Exact final bytes after every change; no silent substantive pruning | Per-attempt hashes, rule receipts, review input checks and fidelity review are implemented. Installed tests reject a trailing-space-only external edit. Semantic preservation remains fallible rather than universally guaranteed. |
| Prose, concise receipt, detailed sidecar | Runtime emits exact draft, generated receipt/delivery, resolved job and individual calls. Receipt-integrity status is separate from original check status. **Outer-host delivery remains incomplete:** Claude reformatted the receipt and one earlier conversation misstated scan availability. |
| Missing/incompatible/interrupted dependencies honestly ungated | Installed missing-CLI and old-incompatible-CLI evidence exists. POSIX installed child-interruption testing exposed a synchronous-probe hang. The fix passes real fixture-child registry/capability/generation interruption checks, including cleanup and an ungated result. These are local transport fixtures, not provider-cancellation evidence. |

## 3. Corrections and everyday use

| Requirement | Evidence and current finding |
|---|---|
| Clear persistent feedback saves; inferred feedback requires approval | `preferences-v2.mjs`, the tuning skill and installed store tests cover direct instructions and a one-word inferred proposal. Ordinary task rules do not alter saved revisions. |
| Scope/version receipts, persistence, undo | Fresh installed processes and two fresh agent conversations per harness saved a reply-only rule and undid it. Live drafts applied that saved rule. Independent current-store rechecks pass without model calls. |
| Scope conflicts, history, comparison, rollback and one-off overrides | Fixtures exercise same-feature equal-specificity conflicts, more-specific decisions, immutable ancestry, stale proposals and unsaved overrides. The compiler uses exact scope labels and feature identities; it does not solve arbitrary cross-feature semantic contradictions. |
| Rules survive refresh; observation bindings require rebinding | Independent saved rules compile against refreshed profiles. Invalidated observation bindings refuse rather than silently retarget. Migration preserves old qualitative intent without inventing hard counters. |
| Short samples and five-piece/1,000-word supported floor | Independent fixtures test short pieces, deduplication, one-author selection and group-specific support. Sparse evidence remains limited or preference-only. Stale hashes and oversized inputs refuse explicitly. |
| Reply, outline-to-blog, rewrite, continuation | All three comparison forms have recorded outputs. Installed draft/rewrite/continue paths have live results in both harnesses, including the initial Claude rewrite failure and focused fixed repeat. Continuation receives existing text without ingesting it into the human corpus. |
| Small-batch discovery and controlled choices | Three-card discovery and one-active-feature comparisons execute through installed preference entrypoints. Choices remain unsaved until approved; no JSON/claim marathon or human attestation is required. |
| Task-scaled factual scrutiny and no hallucination-elimination claim | Task/fidelity/claim review contracts preserve or disclose supplied/added facts. Unsupported-biography fixtures fail review. Source-limited semantic reviews are not external fact checking and can miss errors. |

## 4. Bounded usefulness evidence

The inspected [comparison](runs/2026-09-06-v040-bounded/INTERPRETATION.md) contains
six cases, three conditions, 18 initial drafts and two shared profile renders.
Design commit `c00178c` predates generation. The exact ordered call inventory,
prompt/corpus/input hashes and delivered initial bytes reproduce. There were no
redraws, repair cycles or k=3 critic panels.

All 18 explicit-rule and Tier A checks passed; no 12-word copying flags fired.
Per-cell counts, deviations, omissions, model calls and latency are retained.
Unknown source form/register labels make form-matched comparisons not-evaluated;
pooled diagnostics are labeled separately. Held-out human departures are
reported, not relabeled as calibrated statistical false-positive rates.
Human keep/edit judgments and editing burden remain **unmeasured**, as permitted
by the plan until the user supplies feedback. The evidence does not establish
that profile-plus-examples writes better prose than examples alone.

## 5. Packaging, installation and local verification

| Requirement | Evidence and current finding |
|---|---|
| Instructions, prompts, contracts and user documentation updated | Canonical/rendered/embedded prompt parity is tested. README, protocol, design, runtime, installation and portability documentation describe current semantics. Final engineering and operational failure notes are consolidated in [the evidence report](V040-FINAL-ENGINEERING.md); corpus-selection guidance is explicit and locally refreshed. |
| Version consistency and independently usable components | All four prose-author manifests and marketplace entry were parsed at 0.4.0. Compatible companion bundles remain prose-review 0.3.0 and prose-tell-scan 0.1.1. Pi is documented but not implemented. |
| Local engineering suites and historical verification | Author suite, both sibling suites, acceptance, both harness-integrity suites, four canonical checks and four historical run verifiers pass locally. The historical fidelity correction warning and held-agent parity skip remain disclosed. |
| Mutation update/check and concurrent safety | The 242-case update passed. The first full check failed on one count discrepancy (4 failures instead of 2); three focused repeats and a diagnostic full check reproduced 2. The diagnostic full check passed all 242 rows, baseline/restoration suites and unchanged-tree verification. Ten concurrent review runs passed, five with an applied private-sandbox mutation directly observed. The isolated discrepancy remains unexplained, not declared fixed. See [final engineering evidence](V040-FINAL-ENGINEERING.md). |
| Installed plugin and loose-file paths | Both plugin deployments were byte checked after the timeout fix and refreshed again after the final guidance edit; Claude loose installation includes runtime tools and fidelity scanner. Codex custom-agent wrappers are installed. Actual installed interruption and zero-call preference/receipt rechecks pass. Windows scripts were not executed on this Mac. |
| Both installed conversational workflows work | Tuning save/undo conversations pass. Skill-name drafting reaches the runtime. **Not complete:** Codex's restricted outer sandbox blocks initialization; the requested full-access test awaits permission. Claude's focused counter-documentation repeat used one valid job and passed all hard rules, but still reformatted the receipt and made an unsupported installation statement. Strict receipt delivery remains failed. |
| Review-ready handoff with exact evidence and honest limits | Comparison and installed reports exist. This audit keeps outstanding items explicit. No completed-candidate claim yet. |
| Preserve history and claims audit; no publication or Actions changes | No pushes, PRs, merges, tags or publication occurred. `.github/workflows` has no diff from the starting commit. The existing untracked claims audit retains its recorded SHA-256 and remains untracked. |

## Remaining completion decisions

1. Preserve the completed mutation evidence, including its first failed check
   and the unexplained extra failures; do not relabel the failed run as passed.
2. Resolve the installed conversation boundary failures without repeatedly
   redrawing unchanged prose or imposing a new literary acceptance bar.
3. Revisit this audit after the conversation-boundary decisions and their
   affected checks; documentation and installation bytes are currently reconciled,
   but the unresolved workflows still prevent a completion claim.

An unavailable full-access test is not permission to disable a sandbox. A
fallible voice/fidelity disagreement correctly reported as incomplete is also
not a reason to promise universal semantic correctness.

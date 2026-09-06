# v0.5.0 — local candidate complete

Goal: opt-in numerical style history, separately enabled rhetorical measurement,
contextual baselines/trends, and advisory comparisons across drafting stages.
The approved completion boundary is a committed, locally installed candidate for
Claude and Codex. No push, PR, merge, publication, Actions changes, or automatic
collection of the user's real writing.

## Milestones

1. Numerical measurement, consented store, reports and independent regressions.
2. Read-only rhetorical primitive, bounded dispatch, evidence validation and sanitization.
3. Runtime integration, conversational history operations and exact-byte receipts.
4. Bounded six-passage/two-draw diagnostic and installed synthetic workflows.
5. Local engineering gates, packaging/version 0.5.0, installation and handoff.

Existing v0.4.0 evidence and the untracked historical claims audit are preserved.
Implementation, local installation and engineering verification are complete.
See [the final evidence report](V050-FINAL-ENGINEERING.md), including original
failures and the remaining host-summary limitation. No measurement-accuracy or
writing-quality claim is established by this completion.

## Implementation and bounded evidence

- `b4cd8ba` implements measurement, consented numerical storage, contextual
  reports, optional rhetorical analysis and stage integration; locks six passage
  selections before dispatch. The author suite passed 1,362 assertions then.
- The locked diagnostic returned 12/12 structurally valid estimates with twelve
  CLI calls, 134.785 seconds summed call latency and no redraws. Paired count
  disagreement affected 0–2 labels per passage. Semantic accuracy remains
  unmeasured. See `runs/2026-09-06-v050-rhetoric/REPORT.md`.
- `e23c3ee` preserves those results and corrects the Claude product-name alias and
  strict history option handling. Unknown flags cannot silently select the
  default store; `--directory` and `--store` resolve to the same explicit target.
- Codex's installed synthetic conversation passed. Claude's first conversation
  exposed the adapter/option issues and retried despite the test instruction;
  its original failure is retained. The accidentally selected default-store
  synthetic identity was deleted and independently verified absent.
- The affected second Claude conversation produced one checked draft, one task
  review and one rhetorical analysis using the correct store, then exported,
  disabled and deleted its synthetic identity. Its chat paraphrase omitted the
  required unverified label; the original conversation test remains failed on
  that presentation assertion. No third draft was generated to chase a label.
- Zero-model-call installed artifact audits passed for Codex and the corrected
  Claude run: exact delivery/numerical reproduction, five separate human test
  pieces, generated stage provenance, numbers-only export, disablement retention,
  targeted deletion and unchanged preference revision. These audits do not
  relabel the failed Claude chat test as passed.

The generated delivery is authoritative. Host adherence to chat-summary guidance
is advisory, not an enforced boundary. The additional instruction clarifies that
a host paraphrase must not be titled a check receipt; no post-change live chat
compliance guarantee is claimed. All test identities are synthetic; no real
user writing was ingested or real-user collection enabled.

Final local engineering and installed-byte verification passed.

The first full mutation update passed all 266 probes. Its follow-up check exposed
a timing-dependent count in the moving-reference probe: it rebuilt both the
reference population and the reporting timestamp. The same-millisecond case had
one failure; a later millisecond added an unrelated single-stage failure. The
probe now preserves the original reporting time while still rereading changed
history. Five focused full-suite trials each catch the intended repair failure.
No production code or assertion changed. The original failed check is retained.
Final verification at `dbaa9ef` passed all 21 steps and reproduced all 266 rows
of the tool-generated table, with no source changes during the check.

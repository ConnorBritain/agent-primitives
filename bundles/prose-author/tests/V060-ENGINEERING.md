# v0.6 shared writing identities — engineering evidence

Scope: `voice-identity-registry/1`, runtime resolution, skill instructions and
packaging. No new model quality/resemblance claim or acceptance campaign.

## Regressions

`node bundles/prose-author/tests/selftest.mjs`: 1,377 passed, zero failed.
The twelve new identity cases exercise independent expected behavior:

- absent registry remains absent until requested setup;
- explicit default selection, unknown IDs, invalid paths and unsupported versions;
- digest verification, immutable revisions, occupied locks and stale writers;
- task-specific author inputs and explicit opt-out do not inherit defaults;
- evidence pairs are not half-filled from another selection;
- missing corpus and changed pinned profile refuse before dispatch;
- profile publication retains independent preferences and does not enable history;
- identity-based history routing and cross-writer attachment rejection;
- a separately copied runtime in a new process sees saved corrections and undo;
- exact-final-byte verification remains valid after default selection changes.

The initial focused run found an incomplete test brief (missing purpose); the
fixture was corrected. The first full run caught a changed missing-flag error
message; the CLI retained its historical `Missing --store` behavior. Neither
fix weakened an assertion.

## Other local checks

| Command | Result |
| --- | --- |
| `node bundles/prose-tell-scan/tests/selftest.mjs` | 334 passed; zero failed; one intentional held-primitive parity skip |
| `node bundles/prose-tell-scan/tests/acceptance.mjs` | Existing locked scanner thresholds passed |
| `node bundles/prose-review/tests/selftest.mjs` | 300 passed; zero failed |
| `node bundles/prose-review/tests/run-harness-test.mjs` | 36 passed; zero failed |
| `node bundles/prose-review/tests/revise-harness-test.mjs` | 34 passed; zero failed |
| `node bundles/prose-author/tests/concurrency.mjs` | Three passed; all 275 mutations preserve working-tree bytes |
| Skill Creator `quick_validate.py` on both changed skills | Passed using an isolated uv environment with PyYAML |
| `git diff --check` | Passed |

Canonical checks (`run-harness.mjs check`) and verification (`verify-run.mjs`)
passed for all four preserved runs: `2026-08-04-b`, `2026-08-05-fidelity`,
`2026-08-05-fidelity-s4`, and `2026-08-05-voice-cross-author`.

Mutation sweep and active-installation verification are recorded below when
complete; the change is not yet represented here as fully verified.

## Limits

The registry coordinates local filesystem state, not distributed/cloud sync.
Compatible runtime copies are required. Pi and native Devin model adapters are
not added; their agents can share the store via a compatible runtime and an
explicit supported backend. Older inactive caches retain historical behavior.

Profile publication is explicit. No source text is auto-imported, no profile is
inferred from an empty corpus, and neither identity registration nor selection
enables numerical history or rhetorical calls. Stored numbers remain distinct
from corpora and explicit preferences. Local locks fail visibly on contention;
interrupted-writer recovery is not automatic.

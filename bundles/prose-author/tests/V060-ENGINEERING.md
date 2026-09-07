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

`node bundles/prose-author/tests/mutations.mjs --update` completed with exit zero:
all 275 mutations caught, none uncaught or crashed. This preserves the previous
266 probes and adds nine identity/receipt probes. `MUTATIONS.md` was generated
only by the tool's update mode and compared byte-for-byte with the completed
sweep's captured table. A second full check-mode sweep was not run. No assertions
were weakened. Active-installation checks are complete as recorded below.

## Local installations

- Codex plugin deployment: author 0.6.0, review 0.3.0, tell-scan 0.1.1; deployment
  inventories/bytes match source, and all seven custom agent wrappers pass the
  installer check.
- Claude plugin deployment: the same versions and matching deployment bytes.
- Claude loose skills and Devin global skills: 100 source files byte-verified;
  the two Devin entrypoints intentionally retain a disclosed Codex backend bridge.
  Both adapted skills pass the skill validator. Existing copies were backed up.
- All four active runtime locations resolve exactly the same `personal` identity,
  registry revision, corpus, preference and history paths. Its corpus is empty,
  its preference store contains no decisions, and history/rhetoric remain off.
- Real installed Codex invocation: two authenticated calls; 17.123 seconds elapsed.
- Real installed Claude invocation: two authenticated calls; 37.571 seconds elapsed.
- Both preference-only draft/review smoke runs return `checked`; their exact
  delivered bytes and receipts reverify. History remains `disabled`. No voice
  profile or resemblance claim is inferred from these synthetic installation tests.

Raw jobs, calls, deliveries and original-install backups remain in private local
installation evidence, not this public repository. No native Pi install was
present. Live conversational skill discovery in Devin's UI was not retested;
the installed runtimes and extension plugin registries are the verified boundary.

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

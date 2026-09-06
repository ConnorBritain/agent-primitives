# v0.5.0 local completion evidence

The local candidate is implemented, installed for Claude and Codex, and ready
for use and review. This is not a published release. No push, PR, merge, tag,
publication, GitHub Actions change, or collection of the user's real writing
was performed.

Final engineering commit: `dbaa9efda25096a4a5c3251cce78e774933dd980`.
Production implementation is unchanged from `bb9e7f2`; the later commit fixes
a mutation probe and records its generated table. Subsequent changes are
completion documentation only. Historical v0.4.0 evidence remains intact.

## Delivered scope

- Opt-in, local numbers-only history, separate from corpora and preferences;
  selected outside writing is ingested explicitly, not watched in the background.
- Visible-author-prose measurements, per-piece rhythm and punctuation variation,
  contextual lifetime and recent/previous-90-day summaries, pinned references,
  export, disablement and preview-bound deletion.
- Human-independent, assisted, generated and unknown provenance remain separate.
  Revisions and duplicate bodies do not manufacture independent evidence.
- Optional rhetorical estimates under four fixed families, with separate
  consent and bounded authenticated CLI calls. Raw annotations are not stored
  in numerical history; incompatible model/rubric series remain separate.
- Exact-byte initial/repair/final comparisons against one frozen reference.
  Departures are advisory, not repair quotas or automatic preference updates.

The contracts and conversational operations are documented in
[the history interface](../skills/prose-draft/references/history.md).
The 22 new engineering fixtures cover independent expected measurements,
consent and provenance, duplicate/revision handling, compatible populations,
uncertainty, evidence validation, budgets, privacy, runtime integration,
frozen references, exact final bytes and strict option handling.

## Local engineering results

All 21 steps in the final sequence exited zero on Node 22.23.1. The commands
below run locally from the repository root; no Actions workflow was invoked.

| Command | Final result |
| --- | --- |
| `node bundles/prose-author/tests/selftest.mjs` | 1,365 passed, 0 failed |
| `node bundles/prose-tell-scan/tests/selftest.mjs` | 334 passed, 0 failed, 1 intentional skip |
| `node bundles/prose-tell-scan/tests/acceptance.mjs` | Exit 0 |
| `node bundles/prose-review/tests/selftest.mjs` | 300 passed, 0 failed |
| `node bundles/prose-review/tests/run-harness-test.mjs` | Exit 0 |
| `node bundles/prose-review/tests/revise-harness-test.mjs` | Exit 0 |
| `node bundles/prose-review/tests/run-harness.mjs check <run>` | All four historical runs exit 0 |
| `node bundles/prose-review/tests/verify-run.mjs <run>` | All four historical runs exit 0 |
| `node bundles/prose-author/tests/concurrency.mjs` | Exit 0 |
| `node bundles/prose-author/tests/mutations.mjs` | 266 caught mutations; table matches; exit 0 |
| Five additional concurrent `prose-review` selftests | Each 300 passed, 0 failed |

The four run directories are under `bundles/prose-review/tests/runs/`:
`2026-08-04-b`, `2026-08-05-fidelity`, `2026-08-05-fidelity-s4`, and
`2026-08-05-voice-cross-author`. The real-checkout skip is the intentionally held
pattern critic's missing rendered copy. Mutation sandboxes additionally lack
tracked-file Git corroboration: their sibling suite reports 330 passed and two
skips. Sandbox and real-checkout evidence are not interchangeable.

### Retained mutation discrepancy and correction

The existing `node bundles/prose-author/tests/mutations.mjs --update` generated
the table in 2,013.300 seconds and caught all 266 mutations. The first check took
2,032.835 seconds and failed: one probe produced two failing assertions instead
of the recorded one. All other child-suite summaries matched.

The moving-reference probe rebuilt both history and the reporting timestamp.
Its unintended timestamp change broke an unrelated single-stage comparison
only when two calls landed in different milliseconds. The probe now keeps
`baseline.as_of` fixed while still rereading changed history. The repair fixture
deliberately adds human history between stages, so the intended mutation remains
caught independently of clock timing. Five focused full-suite trials each
produced that one failure. No production code or assertion was changed.

The final full check took 2,003.295 seconds; all 266 rows match the tool-generated
table. The table was not hand-edited or adjusted to accept a variable count.
All 272 child outputs are retained for each full phase: three baselines,
266 mutations and three restored suites. The final check's before/after tracked
diff digests both equal the SHA-256 of empty bytes, confirming no source change.
These engineering sequences made zero model calls.

## Bounded rhetorical evidence

Six licensed passages, three each from Doctorow and EFF Mullin, were locked
before dispatch at `b4cd8ba`. Two draws per passage yielded 12/12 structurally
valid located estimates: twelve authenticated CLI calls, 134.785 seconds summed
call time, no redraws. Paired counts disagreed on zero to two labels per passage.
Semantic accuracy remains unmeasured; structural validity is not accuracy.

See [the retained report](runs/2026-09-06-v050-rhetoric/REPORT.md).
The zero-call command below reverified the locked sources, prompt and cells:

```bash
node bundles/prose-author/tests/history-diagnostic.mjs --check --out bundles/prose-author/tests/runs/2026-09-06-v050-rhetoric
```

No private corpus was tested. There was no 20/60 panel, human attestation,
resemblance claim, or requirement that a more elaborate writing condition win.

## Installed workflows and the remaining host limitation

| Retained conversation | Outcome | Runtime evidence |
| --- | --- | --- |
| Codex 1 | Conversation passed | Checked draft, task review and rhetorical estimate; 3 inner calls, 24.319 s |
| Claude 1 | Failed; retained | Product-name alias and ignored directory option caused a refusal followed by a retry contrary to the test instruction; no valid history-attached run |
| Claude 2, after the adapter/option fixes | Workflow artifacts passed; original conversation test still failed | One checked draft, task review and rhetorical estimate; 3 inner calls, 31.706 s |

The parent-conversation elapsed times were respectively 213.433, 263.702 and
235.953 seconds. These include inner-runtime latency and must not be added to it.
Calls used authenticated CLI sessions; no speculative dollar cost is reported.

Claude 1's mistakenly selected default-store synthetic identity was deleted and
independently verified absent. No real-user identity was modified. The known
`claude-code` alias now resolves to the Claude adapter; unknown/conflicting
directory flags fail before writes instead of silently choosing another store.

Claude 2 completed the intended lifecycle but paraphrased the receipt without
the required unverified label. Its original test remains failed. No third draft
was generated to chase that label. Guidance now explicitly distinguishes a
host paraphrase from a checked receipt; post-change chat adherence is unmeasured.
The checked `delivery.md` is authoritative, not the host's reformatted summary.

Independent zero-call artifact audits passed for Codex 1 and Claude 2: exact
delivery/numerical reproduction, five separate synthetic human test pieces,
generated stage provenance, numbers-only export, disablement retention,
targeted identity deletion and unchanged preference revision. They do not
relabel a failed conversation as passed. Synthetic fixtures are not evidence
about real human voice or a private corpus.

Both native plugin production inventories and bytes match the checkout; all
four author manifests and the marketplace entry agree at 0.5.0. Seven Codex
custom-agent wrappers verify. Claude loose drafting/tuning skills and the new
rhetorical agent match their shipped sources. Skill and plugin format validators
passed. Installed `check-result` reproduced both retained final deliveries and
history records without further model calls. Existing companion versions remain
unchanged; the Pi adapter remains documented but unimplemented.

## Evidence retention and limits

Raw host traces, all original failures, child-suite logs and reports are backed
up privately. Representative immutable report hashes:

| Report | SHA-256 |
| --- | --- |
| Original failed engineering sequence | `b87c7f33697fafcd59021ac7978341f127190cdef2851cceec12ba3f67d3744c` |
| Final passing engineering sequence | `e7fda2e37c9bec20aa46b14433bb2884c42a9cbfa935d6db4e9c9761b196cdbb` |
| Codex conversation 1 | `4df21633ca69e78c1486bcd07bcd69dd152f5c9bfeba45333f2efda53db06e37` |
| Claude conversation 1 | `07c90876f224fa50845b716d5dce7f9467cb61cd16715572ee182e2d72bea87c` |
| Claude conversation 2 | `5f71d5f956843d04a3706795713367371d47d7373536e7097c84cf5093b9b2ef` |

The preexisting untracked claims audit remains unchanged at SHA-256
`12814f1c017285fd0942a7069be8b29878aefeb252e42bc08f00c82d6e0ef9d6`.
GitHub Actions files have no diff from `b911319`. A heuristic scan found no
personal home-directory paths or API-key-shaped strings in changed repository
files; this is not a comprehensive secret audit.

English sentence boundaries are heuristic. Rhetorical labels are fallible
model estimates. Small samples and rare events remain uncertain; empirical
ranges are not calibrated confidence intervals or universal author constraints.
History cannot establish identity, intent, knowledge, factual accuracy, quality
or resemblance. Numerical history stores no prose, but ordinary writing-run
artifacts and provider processing have separate retention behavior. Collection
and rhetorical analysis remain off for real user writing until explicitly enabled.

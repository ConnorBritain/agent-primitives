# Current runtime and portable contracts

This is a developer/adapter reference. Users enter through `prose-draft` and
`prose-style-tune`; their agent prepares files and invokes the runner.

## Contracts and historical readers

| Contract | Owner and meaning |
| --- | --- |
| `visible-prose/1` | Normalized visible/author prose, original offsets, exclusions and warnings |
| `voice-profile-measurements/2` | Per-document counts/rates and distributions grouped by available register/form |
| `voice-profile-source/5` | Renderer interpretation: cited observations, unresolved dimensions or refusal |
| `voice-profile/3` | Assembled evidence, all ten coverage dimensions, deterministic measurements and provenance |
| `voice-preferences/2` | Independent scoped decisions, feedback provenance and immutable revision ancestry |
| `voice-identity-registry/1` | Shared identity pointers, explicit default, immutable registry/profile revisions and stale-writer checks |
| `voice-style-spec/2` | Applicable profile/preferences/rules compiled for one context; one-off overrides do not save |
| `voice-feedback-source/2` | Interpreter's proposed operations or clarification, never a saved change |
| `voice-draft-source/5` | Candidate prose, omissions, unsupported-claim disclosures or refusal |
| `prose-runtime-review/1` | Located findings, instruction dispositions and missing-atom accounting |
| `prose-writing-job/1` | Authorized task and file references; current adapter selection |
| `prose-writing-result/1` | Exact final prose, receipt, attempts, calls, disclosures and unresolved checks |
| `prose-result-verification/1` | Receipt integrity result, retaining original runtime and mechanical statuses |

Shared identities resolve through `identity-store.mjs` before job snapshots, not
inside model prompts. The local registry defaults to
`~/.config/prose-author/identities`; an absolute `PROSE_IDENTITY_DIR` or explicit
registry selection overrides it. See the [identity contract and operations](skills/prose-draft/references/identities.md).
Existing explicit-path jobs remain supported. Old result verification never
reloads current identity state. Registry versions are checked independently of
profile, preference and numerical schemas. Pi can share storage without a native
model adapter; all writers still need a compatible runtime and local filesystem.

Production implementations live in `skills/prose-draft/tools/`. The small strict
model transport schemas are in `runtime-contract.mjs`; profile and preference
validators are in `profile-v3.mjs` and `preferences-v2.mjs`. Field-level job and
rule examples are in the skills' [runtime reference](skills/prose-draft/references/runtime.md)
and [session reference](skills/prose-style-tune/references/session.md).

Historical profile/1 and profile/2, preference/specification /1 and draft source
/1–/4 remain readable by their original tools. Do not pass them to current
generation as if they were current evidence. `migratePreferencesV1` preserves
qualitative intent without turning old measured locks into invented mechanical
rules; observation-dependent choices need explicit validated rebinding.

## Measurement semantics

The optional v0.5 extension adds `voice-history-store/1`,
`voice-history-record/1`, `voice-history-measurements/1`,
`voice-history-report/1`, `voice-history-ingest/1`, and
`voice-history-run/1`. Rhetorical annotation uses `voice-rhetoric-source/1`
with `rhetoric-rubric/1`; model/prompt versions define separate series.
Current writing jobs/results accept an optional telemetry attachment without
changing historical profile/preference contracts. See the
[history reference](skills/prose-draft/references/history.md) for operations,
consent, numerical semantics, budgets, and retention boundaries.

The normalizer masks link destinations, metadata, code and other non-prose while
retaining original UTF-16 source offsets. Recognized Markdown/HTML quotations
and caller-supplied quote ranges are separate from author-written prose. Inline
quotation attribution is not guessed. Unknown markup/entity behavior is a
documented limitation; this is not a complete Markdown or HTML parser.

Explicit rules check visible final prose, including visible quotations. Observed
author tendencies exclude identified quoted material. A count is a surface-form
measurement, not proof of rhetorical function. Rates use actual draft length;
zero prose words make a rate not-evaluated. A user-chosen zero limit is exact.

Observed distributions are advisory. Group/form metadata is not fabricated to
make a comparison evaluable. Held-out diagnostics compare each human piece with
other pieces and expose departures; they are not calibrated prediction
intervals. No observed zero creates a universal user prohibition.

## Pipeline and failure behavior

`prose-runtime.mjs` resolves explicitly authorized input files and creates a new
private output directory. Existing run directories are not overwritten. The
runner selects at most three whole human examples deterministically, validates
current profile evidence, compiles applicable preferences and dispatches a fresh
model context. It never imports the acceptance release protocol.

Known form/register mismatches are excluded, even when fewer than three examples
remain. Samples without the requested metadata can provide general style
evidence, but the receipt warns that their match is not established. Selection
never invents missing metadata or fills a slot with a known conflicting sample.

The exact candidate is mechanically checked and independently reviewed at the
task's required depth. At most two repair cycles retain original style inputs,
address identified problems and preserve substantive material. Every new version
is rescanned and reviewed. The result records exact final hashes; an external
edit invalidates the old receipt. `check-result` reproduces mechanical checks,
not a new semantic review of altered prose.

The runner writes `receipt.md` from recorded checks and combines it with exact
draft bytes in `delivery.md`. That generated file is the authoritative checked
delivery; the host links to it and labels any chat summary unverified. It must
not reconstruct scanner availability from the host's skill list.
`check-result.status` reports reproduction; `result_status` and
`mechanical_status` retain the original outcomes. An intact report with semantic
checks marked not-evaluated can pass integrity without upgrading those checks.
With `--delivery`, verification also compares the complete delivery against the
recorded draft and regenerated receipt. A receipt-only edit fails; omitting
this option reports `delivery_status: not-evaluated`, not a passing file check.

Review accounting distinguishes advisory observation IDs from explicit rules.
An observed habit need not occur in every draft. Omission disclosures are kept;
they become `advisory_omissions` only when both task and voice reviews clear the
draft and explain the observation as omitted or not applicable. Other omissions
remain `unresolved_omissions` and prevent a checked result. This exception never
applies to explicit user rules. A concrete voice-dilution finding still requires
repair even when it concerns an advisory observation.

Check status is passed, failed or not-evaluated. Aggregate output status is
checked, incomplete, ungated or refused. An empty preference set or unavailable
matching corpus does not manufacture a personal-style pass. Missing model or
review dependencies, interrupted calls and malformed outputs remain visible.
The invocation totals include automatic profile preparation as well as writing
and review calls. Raw records can contain private prose and should stay private.

## Claude and Codex adapters

`callModel` accepts `harness`, authorized `system` and `input`, strict `schema`,
optional `model`/`effort`, bounded `timeout_ms`, and an abort signal. It returns
status/reason, actual model, dispatch flag, elapsed time, usage when reported,
input/schema hashes and execution records. Model calls are not priced in dollars.

Adapters use existing CLI authentication, not direct API clients. API-key
environment variables are withheld from children to avoid inadvertently changing
authentication/billing paths. Configured models are retained; unsupported CLI
flags or model availability cause an explicit failure, not a silent downgrade.

Claude receives an empty tool list, explicit system prompt, empty strict MCP
configuration and no persisted session. Codex receives a fresh ephemeral exec
context with user rules/configuration disabled and explicit tool restrictions.
Both run in empty temporary directories and inspect execution records for
unexpected tools. These are partial context restrictions, not a general OS-level
guarantee against every filesystem read. Semantic reviewers remain fallible.

The parent harness must permit its child CLI to initialize local authenticated
state. A restricted parent sandbox can block Codex before a model request even
with network enabled. The adapter reports this as ungated with an actionable
permission diagnostic; it does not bypass that restriction. Use the host's
normal permission process, not an undisclosed sandbox or authentication change.

Capability and plugin-registry probes are read-only and forcibly terminate after
15 seconds. Generation has its own configured timeout, first sends termination,
then forces termination after two seconds if needed. Local child cleanup does
not prove provider-side cancellation of an already submitted model request.

## Pi and other harnesses: adapter interface, implementation deferred

No native Pi adapter ships in this candidate. A compatible adapter should:

1. Preflight the installed CLI and required capabilities without a model call.
2. Preserve the configured model and authenticated session without requiring an
   API key or copying credentials into task data.
3. Accept only the authorized system/input/schema, use a fresh context and
   disable unrelated tools/history where supported. Disclose what is unsupported.
4. Emit structured output with execution records; reject incomplete or malformed
   results and unexpected tool activity instead of returning a successful draft.
5. Honor cancellation and bounded timeouts, report whether a call was actually
   dispatched, and record model/latency/usage without guessed costs.
6. Pass transport tests for missing dependencies, unsupported isolation,
   interruption and malformed output. Then use the same production checks,
   preference store and bounded repair pipeline; do not implement a second bar.

The deterministic contracts are independently reusable from Node. Merely loading
the skill Markdown in another harness does not establish a verified workflow.

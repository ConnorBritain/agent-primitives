# Production writing runtime

Resolve paths relative to the installed skill directory. Node.js is the only
runtime dependency. Adapter names are `claude` or `codex`; the product-name alias
`claude-code` is normalized to the same `claude` transport without changing the
model or authentication. Other unknown adapters remain unsupported.
The current harness's authenticated `claude` or `codex` CLI
must be on PATH. Omit model overrides to preserve configured models. If these
dependencies are missing, explain the unavailable check; do not simulate a run.

## Prepare one job

Resolve the shared writing identity first (`identity resolve`). See
[identities.md](identities.md) for setup and selection. `writing_identity` selects
an ID or opts out with null; optional `identity_registry` selects an absolute
registry path. With no explicit author inputs, the selected default is automatic.
Resolved inputs are frozen before model dispatch. Do not redundantly insert
legacy default preference paths into an identity-based job; explicit author
inputs without an explicit identity intentionally bypass default inheritance.

Create a private task directory and an input JSON file. Do not put a private
corpus or call transcripts into a public repository. Use an existing persistent
preference-store path when the user has one; keep temporary outputs separate.
Use `preferences locate` at session start to discover the shared default store
without creating it. Pass the returned existing directory as `preference_store`
so a new conversation applies the same saved corrections. An explicit user
store/identity takes precedence; do not combine two authors' rules.

```json
{
  "schema": "prose-writing-job/1",
  "mode": "draft",
  "brief": "Decline the invitation warmly, without proposing another date.",
  "context": {"form": "reply", "purpose": "decline", "register": null, "audience": null, "project": null},
  "facts": ["I appreciate the invitation.", "I cannot attend on Friday."],
  "adapter": {"harness": "codex"},
  "rules": [{"id": "short-reply", "kind": "word-limit", "directive": "Keep this under 60 words.", "minimum": 1, "maximum": 59}],
  "examples": true,
  "review": "standard"
}
```

Use `claude` for Claude. Optional file inputs, resolved relative to the job:

- `preference_store`: the persistent directory, never a manually assembled
  replacement for its current revision.
- `samples_dir`: the author's profile directory with `corpus/human/`. Samples
  need `human_authored: true`, attribution (`author`, `source`) and may include
  `register`, `form`, and `date` frontmatter. Whole attributable short samples
  count; generated text belongs outside this directory.
- `profile_file`: an existing `voice-profile/3`. Supplying samples too allows
  source revalidation and independent voice review.
- `source_file`: the exact passage for `rewrite` or `continue`.

Inline `samples`, `profile`, `preferences`, and `source_text` are also supported.
Do not supply both an inline field and its file equivalent. A run with samples
and no profile renders one automatically. Use `profile_policy: "none"` only for
an explicitly examples-only or preference-only condition; it does not remove a
supplied profile silently. `examples: false` with a profile means profile-only
generation; the reviewer can still use authorized samples.

Automatic rendering summarizes the supplied samples. `context.register` and
`context.form` guide drafting, example selection and comparisons; they do not
filter the renderer's corpus. For a register-specific profile, supply the
explicitly selected whole human pieces through `samples` (or a selected corpus
directory), preserving their attribution and metadata. Do not invent labels for
unknown samples. A mixed corpus remains limited evidence overall, with support
reported separately for its known groups.

The five scope axes are exact labels. Reuse saved labels instead of inventing
synonyms that would make a scoped preference silently inactive. An explicit
one-off rule with the same ID replaces that saved rule for this job only.
Unsupported semantic requests use `kind: "semantic"` and a `directive`, not
invented counters. For rule shapes and persistent choices, read the sibling
[session reference](../../prose-style-tune/references/session.md).

Encode requested hard rules with their supported kinds, not as semantic rules
or facts alone. These task-local examples do not change saved preferences:

```json
[
  {"id":"exact-name","kind":"required-text","directive":"Include the exact name River House.","text":"River House"},
  {"id":"no-phrase","kind":"prohibited-phrase","directive":"Do not use cutting edge.","text":"cutting edge"},
  {"id":"no-exclamation","kind":"punctuation","directive":"No exclamation marks.","characters":"!","minimum":0,"maximum":0},
  {"id":"one-question","kind":"count-range","directive":"At most one question mark.","measurement_id":"question-marks","unit":"per-document","minimum":0,"maximum":1},
  {"id":"brief","kind":"word-limit","directive":"Fewer than 60 words.","minimum":1,"maximum":59},
  {"id":"tone","kind":"semantic","directive":"Decline warmly without inventing a reason."}
]
```

Before dispatch, account for each explicit user restriction in `rules` or an
existing active preference. Semantic classification is not a shortcut around an
available hard checker. Unknown semantic requests remain reviewable, not fake
mechanical checks.

Supported `count-range` measurement IDs are `second-person-family`,
`first-person-plural-family`, `contractions`, `uncontracted-negatives`,
`profanity-vulgarity`, `first-person-singular-family`, `question-marks`,
`round-parenthetical-spans`, `em-dashes`, and `en-dashes`. Do not invent another
ID. Sentence counts are currently semantic instructions, not a supported counter;
the runtime refuses unknown counters before generation.

## Dispatch and dependencies

Agent-internal commands (use resolved absolute paths in execution):

```bash
node tools/prose-runtime.mjs run --job /task/job.json --out /task/new-run
node tools/prose-runtime.mjs profile --job /task/job.json --out /task/new-profile
```

The output directory must be new; never reuse it to hide a failed attempt.
When a CLI rejects its configured model, report the actual error. Do not
downgrade the model, switch authentication methods or retry with an API key.
The parent harness must permit the authenticated CLI to initialize its local
state and make its model request. A restricted parent sandbox can prevent this
even when network access is enabled. Report that denial and request permission
through the host when available; never silently weaken the sandbox.

The runner discovers adjacent `prose-tell-scan` and `prose-review` installations.
If discovery fails, resolve installed paths and pass `dependencies` explicitly:

```json
{"dependencies": {
  "scanner": "/installed/tell-scan/tools/tell-scan.mjs",
  "review_root": "/installed/prose-review"
}}
```

Verify the actual scanner filename/location before using it. A review root
contains `agents/prose-voice-critic.md`, `agents/prose-fidelity-critic.md` and
`tools/fidelity-scan.mjs`. For loose installs, explicit `voice`, `fidelity`, and
`fidelity_scan` paths are supported. `TELL_SCAN_PATH` and `PROSE_REVIEW_ROOT`
also work. An explicit null dependency exercises the unavailable-check path.
Do not invent paths or treat an absent sibling as an evaluated check.

## Deliver and retain evidence

Each new output directory contains the resolved input snapshot, exact draft,
`receipt.md`, combined `delivery.md`, result sidecar, and individual model-call records; a newly rendered profile is
also saved. Raw records can contain private prose and should stay private.

Read the sidecar, then link to the generated `delivery.md` as the authoritative
checked delivery, with a link to details. Leave that file unchanged. If you add
a chat summary, explicitly label it unverified; reproducing the whole receipt
verbatim in chat is optional. Do not infer check status from which skills were
listed: the runtime's receipt records the actual scan/review results.
`not-evaluated` is never a pass. An observed-pattern
departure is advisory, not a failed hard rule. No required user attestation or
manual review of hundreds of claims exists.

Before handoff, verify both the prose and generated receipt in the delivery:

```bash
node tools/prose-runtime.mjs check-result --result /task/new-run/result.json --draft /task/new-run/draft.md --job /task/new-run/resolved-job.json --delivery /task/new-run/delivery.md
```

This checks receipt integrity: `status` describes whether bytes and the report
reproduce, while `result_status` and `mechanical_status` retain the original
outcome. An integrity pass never upgrades an incomplete or unevaluated result.
It does not rerun semantic review on changed prose. If integrity fails, deliver no prior checked
label; a new requested rewrite needs a new run. The runtime limits repairs to two
cycles and never deletes paragraphs merely to meet a word target.

Historical `profile-measure`, `profile-assemble`, `draft-conformance`,
`draft-residual-prune`, `verify`, and `ingest-edit` remain available for historical
artifacts. They are not the current writing path and their old corpus floors or
quota interpretation do not govern current feedback or generation.

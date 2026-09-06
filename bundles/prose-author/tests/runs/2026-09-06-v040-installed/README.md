# Installed runtime evidence — checkpoint

These calls executed `prose-runtime.mjs` from the actual local **plugin caches**,
not the repository's runtime path. Both registries had author 0.4.0, review 0.3.0
and tell-scan 0.1.1 enabled. Deployment-file inventories and bytes matched the
checkout. Companion resolution used the enabled registry version. Model calls
used existing authenticated CLI sessions and configured models, with no direct
API-key requirement or dollar-cost estimate.

| Harness/model | Case | Result | Model calls | Invocation elapsed |
|---|---|---|---:|---:|
| Codex / gpt-6-astra | Short reply | checked | 2 | 15.443 s |
| Codex / gpt-6-astra | Rewrite | checked | 3 | 23.532 s |
| Codex / gpt-6-astra | Continuation | checked | 2 | 14.598 s |
| Claude / opus[1m] | Short reply | checked | 2 | 20.874 s |
| Claude / opus[1m] | Rewrite, initial | ungated | 3 | 33.139 s |
| Claude / opus[1m] | Continuation | checked | 2 | 28.227 s |
| Claude / opus[1m] | Rewrite, contract fix | checked | 3 | 45.319 s |

There were **17 actual model calls**. Timings are per-invocation measurements,
not a controlled performance benchmark. All successful cases' `check-result`
commands reproduced the mechanical checks against exact saved draft bytes.
Rewrites completed fidelity scan and model review. These cases used supplied
fictional facts and explicit rules, **not a learned voice profile**.

## The failure and focused fix

Claude's initial rewrite passed rules and fidelity review, but its task reviewer
invented five atom-accounting rows. The task-review contract expected an empty
list; the runtime refused to certify the malformed review and returned ungated.

Review calls now always carry an explicit `missing_atoms` list, including `[]`
outside fidelity review. The transport says to account for exactly that list;
additional semantic losses belong in findings, not invented inventory rows.
The exact-list validator was not relaxed. A regression test checks both the
explicit empty input and rejection of extra output rows. Removing that input
caused the regression to fail in a targeted mutation trial.

Only the affected Claude rewrite was repeated after installing the fix. The
initial failed case remains alongside the repeat; no outputs were replaced and
the bounded 18-draft comparison was not rerun. Same-version Codex reinstall
refreshed its files. Claude `plugin update` did not refresh changed files under
0.4.0; `plugin install` did, confirmed by byte comparison.

## What remains unproven

Follow-up [session evidence](../2026-09-06-v040-sessions/README.md) now covers
persistent feedback, undo, missing-CLI failures and external final-byte edits.
The following describes the boundary of this earlier checkpoint.

This checkpoint establishes the basic installed runtime paths, not automatic
conversational skill selection, personalized voice quality, or complete release
readiness. Installed persistent-feedback/undo, installed failure-path coverage,
the full local engineering set and generated mutation table are still pending.
Claude loose-file copies were installed and their dependency paths resolved,
but these model runs exercised plugin copies. PowerShell was not run on this Mac.

Each case directory retains its job, resolved input, final draft, call records
and result. Absolute temporary paths in those diagnostic records describe the
original execution location; the files here are archival copies.

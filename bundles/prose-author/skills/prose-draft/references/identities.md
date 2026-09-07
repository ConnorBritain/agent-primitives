# Shared writing identities

Use when setting up shared writing memory, switching writers, changing corpus or
profile locations, or refreshing a shared profile. The agent runs these commands;
users choose identities and sources conversationally, not by editing JSON.

## One registry outside every installation

The default registry is `~/.config/prose-author/identities`. An absolute
`PROSE_IDENTITY_DIR` overrides it. Every compatible installed runtime uses this
same location, independent of Claude, Codex, Devin or Pi. Explicit `--registry`
selects another registry for identity, preference and history commands. A writing
job uses `identity_registry` instead. No daemon, folder watcher or cloud sync exists.

The `voice-identity-registry/1` contract holds named pointers, a revision and an
explicit default. Corpus text, learned profiles, preferences and numerical history
remain separate. Selecting a default authorizes using that identity's registered
writing inputs for otherwise unspecified writing jobs. It does not enable history,
authorize rhetoric calls, or make generated text human corpus material.

## Configure and select

Use `identity locate` and `identity list` first. If no registry exists, ordinary
legacy explicit-path workflows still work. If identities exist without a selected
default, clarify which to use; never pick an arbitrary first writer.

Prepare this configuration in a private task directory, replacing placeholder
paths with absolute user-approved paths. `samples_dir` is the directory containing
`corpus/human/`, not the human subdirectory itself. Unused fields may be null.

```json
{
  "id": "personal",
  "samples_dir": "/private/writing/personal",
  "profile_file": null,
  "preference_store": "/private/writing/preferences",
  "history_directory": "/private/writing/history",
  "history_identity": "personal"
}
```

IDs use 1–64 letters, digits, underscores or hyphens, starting with a letter or
digit. `none` is reserved for clearing a default. Do not infer author identity
from filenames or mix existing preference stores. An existing store's own ID
may differ from the registry label: registration deliberately points to that store.

```bash
node tools/prose-runtime.mjs identity list
node tools/prose-runtime.mjs identity register --config /task/identity.json --revision 0
node tools/prose-runtime.mjs identity select --identity personal --revision 1
node tools/prose-runtime.mjs identity resolve
```

Use the actual current revision, not these example numbers. Register replaces
one complete entry; preserve fields you are not changing. Registration records
pointers only: it neither copies a corpus nor initializes/migrates a preference
store. Create an empty selected corpus directory and initialize a new preference
store through `preferences init --store PATH --id ID` only as part of requested
setup. Existing data stays in place. An existing `profile_file` must validate as
`voice-profile/3`; its exact bytes are pinned. Historical profiles stay historical.

Every mutation checks the expected revision under an exclusive lock, saves an
immutable revision, then atomically replaces the current pointer. A stale client
must reread and reconsider its change. Do not remove a lock while another writer
may be active. Interrupted writers require explicit inspection/recovery. Unknown
registry versions fail; never rewrite them through an older runtime.

## Draft and tune

Jobs without explicit author inputs resolve the selected default automatically.
`writing_identity: "personal"` selects explicitly. `writing_identity: null`
opts out for one-off work. Supplying profile, samples or preferences explicitly
without a `writing_identity` also opts out of default inheritance, preventing
another author's task from silently receiving personal inputs.

When an identity is explicit, task-specific profile/sample inputs replace the
registered evidence pair as a unit; the runner does not half-fill that pair.
Explicit preferences override the registered preference pointer. Registered
missing corpus/preferences or changed profile bytes fail rather than silently
falling back. `profile_policy: "none"` leaves the registered profile out but can
still use its samples. `examples: false` keeps the existing profile-only behavior.

Preference commands automatically resolve the default store; use
`--writing-identity personal` to select another one. History commands also resolve
the default; `--writing-identity personal` selects the registry label, while the
historical `--identity ID` still addresses a raw history identity. Explicit
`--store`/`--directory` retain their old path semantics. Avoid combining a registry
selection with an unrelated explicit store.

History attachments use the registered numerical store and identity, but the
history service independently enforces opt-in scope and rhetorical consent.
Use `telemetry: null` to disable attachment for one job. To retain document IDs
across revisions, supply `telemetry` with the registered `history_identity` and
the existing document/revision IDs; omit directory to inherit the registered one.
A conflicting attached identity is rejected. No corpus is automatically ingested.

## Refresh and publish a shared profile

Render with the selected human samples using the normal profile command. After
a requested refresh succeeds, explicitly publish the returned `profile.json`:

```bash
node tools/prose-runtime.mjs identity publish-profile --identity personal --profile /task/run/profile.json --revision 2
```

Use the registry revision captured before the refresh. If another session changed
it, inspect that change before retrying publication. This command validates and
stores immutable profile bytes, then updates that identity's pointer; prior
profiles remain available. It does not alter independent preferences. Existing
observation-dependent preferences still require validated rebinding to new
evidence. To restore a prior profile, publish its retained file as a new registry
revision; never relabel or overwrite prior profile bytes.

Every writing run snapshots resolved inputs and registry selection. Its receipt
names the identity/revision. `check-result` uses those frozen inputs, not the
current default, so later updates cannot retroactively alter earlier checks.

## Portability and limits

Compatible installations on one machine can share these files immediately. Pi
and native Devin model dispatch still need their own adapters or an explicitly
disclosed Claude/Codex backend; shared storage is not model integration. Keep
registry and referenced files private and outside plugin caches/repositories.
Back up the registry together with its external referenced stores and corpora.
Local locks do not provide distributed multi-machine synchronization. An older
installation that predates identity lookup must be updated or given explicit paths.

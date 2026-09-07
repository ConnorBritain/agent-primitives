# Numerical writing history

Read when the user enables history, ingests selected writing, asks about changes
over time, or requests export/deletion. These commands are agent internals.
Do not ask the user to type commands or inspect JSON. Ordinary drafting does not
authorize collection. Nothing watches folders or uploads a corpus in the background.

## Consent, identity, and storage

With a shared writing identity configured, commands without explicit raw identity
or store flags resolve its registered numerical store. Use `--writing-identity ID`
to select a registry identity; see [identities.md](identities.md). Historical
`--identity ID` and explicit directory flags retain their existing semantics.
Identity selection alone never enables collection.

Use `tools/prose-runtime.mjs history locate` to locate the shared local store.
The default is `.config/prose-author/history` under the user home; an absolute
`PROSE_HISTORY_DIR` overrides it. This is separate from corpora and preferences.
For a user-selected custom store, append `--store DIRECTORY` to **every** history
command, not only to the writing job's telemetry attachment. `--directory` is an
equivalent alias; conflicting directories and unknown flags fail before writes.
Use the user's chosen short identity identifier; ask if multiple identities
could apply. Never infer a new identity from a source filename.
The store directory is reserved for numerical state. Prepare configuration,
ingestion jobs, selected source files, exports and readable reports in the task's
separate output directory, not inside the history store.

The configuration is a small JSON file prepared by the agent:

```json
{"project":"newsletter","enabled":true,"rhetoric":false}
```

Invoke `history configure --identity ID --config FILE`. `project: null` means
all projects for this identity and requires that explicit scope. Project-specific
settings take precedence, including disabling a project inside an enabled identity.
`rhetoric: true` requires separate authorization: it sends each selected piece or
draft stage through one additional authenticated CLI analysis call. Explain this
before enabling it. Disabling collection preserves existing history.

Show the saved scope and whether rhetorical calls are enabled. Do not enable the
user's real history just because installation or testing succeeded.

## Selected outside writing

Prepare a `voice-history-ingest/1` job with explicitly selected source files,
resolved relative to the job file. IDs and known metadata are short identifiers,
not titles or copied prose. `written_at` is the actual writing date if supplied;
omit it rather than substituting ingestion time or guessing from file metadata.

```json
{
  "schema":"voice-history-ingest/1",
  "adapter":{"harness":"codex"},
  "rhetorical_call_limit":10,
  "documents":[{
    "document_id":"essay-01","revision_id":"r1","file":"essay.md",
    "provenance":"human-independent","project":"newsletter",
    "form":"essay","register":"informal","written_at":"2026-08-01",
    "format":"markdown","language":"en"
  }]
}
```

Use `history ingest-preview --identity ID --job FILE` to show piece count and
maximum extra calls, then `history ingest` with the same arguments. More than ten
rhetorical calls requires a new explicit batch; unmeasured pieces are not zeros.
`history compare` measures selected files without saving them. Missing metadata
remains null/unclassified. Provenance is one of `human-independent`, `ai-assisted`,
`generated`, or `unknown`; ask a concise attribution question when necessary.
No formal attestation or edit-percentage threshold is required.

Keep the same document ID when ingesting a revision, with a new revision ID.
Only the latest ingested/final revision counts toward a baseline. Duplicate
bodies do not become independent evidence under new IDs. Acceptance or editing
never promotes generated writing to independent human evidence.

## Reports and pinned baselines

`history report --identity ID --out NEW.md` produces readable Markdown and a JSON
sidecar on stdout. Optional `--as-of ISO-DATE` makes temporal reports reproducible.
`history pin --identity ID` saves the current numerical reference and returns its
snapshot ID. `history show` exposes numerical records for agent-side inspection;
present a few relevant findings rather than dumping the table into conversation.

Explain the population, piece count, word exposure, and any missing context.
Report lifetime distributions and the most recent 90 days versus the preceding
90 days. Undated writing stays out of time windows. Five independent pieces and
1,000 words per group/window support descriptive interpretation; short individual
pieces are allowed. Empirical departure labels require twenty reference pieces.
Ranges are not calibrated confidence intervals. A departure is not a defect,
and repeated feature comparisons naturally produce flags.

Rhetorical estimates use four families: qualification, analogy function, reader
address, paragraph roles. They are separated by actual model and rubric/prompt
version, not pooled as objective counts. Numerical rhythm is an English sentence
boundary heuristic, not a syntactic parser. Unknown classification is not zero.

## Drafting attachment

For a known, opted-in identity, add this optional field to the normal writing job:

```json
"telemetry":{"identity":"writer","document_id":"essay-01","revision_id":"r2"}
```

The normal `context.project` selects the scope. Optional `directory` selects a
different shared store; `snapshot` selects a pinned reference. Retain document
IDs across runs when revising the same piece. If no identity has been selected,
do not silently attach another person's history. The runner enforces collection
consent even when an attachment is present.

Initial drafting and repairs keep one reference snapshot. Measurements can
inform existing voice review, never become automatic quota failures or new
saved preferences. Rhetorical analysis is capped at three calls per writing run,
separate from the writing/review budget. Missing history services leave the prose
usable with telemetry failure disclosed. No profile means no invented voice-review
certification. The final history sidecar is tied to the exact delivered bytes.

## Export and deletion

`history export --identity ID --out NEW.json` creates an independent numerical
copy, without the store's secret fingerprint key. Keep the export private.
To delete, call `history delete-preview --identity ID`, optionally supplying
`--documents FILE` containing selected opaque document identifiers from `show`.
No document selection previews the entire identity. Explain exactly what will be
removed; apply the user's requested deletion using `history delete --identity ID
--preview FILE` with that exact preview. A changed store requires a fresh preview.
Affected pinned snapshots are removed too. Tell the user deletion is not undoable
from the live store; external exports/backups remain outside this operation.

## Privacy and limits

The store retains numbers and minimal metadata until deletion, not source prose,
snippets, vocabulary lists, paths, or model explanations. These records are still
personal data. The history analyzer's temporary provider inputs and returned
annotations are not written to durable history logs; provider processing has its
own retention behavior. Existing writing-run directories still contain drafts,
task inputs, and review records. Deleting history does not delete those files.

An analyzer change separates measurement series. Recounting requires explicitly
supplied originals: discarded text cannot be reconstructed from measurements.
History cannot establish author identity, intent, knowledge, factual accuracy,
quality, resemblance, or whether prose would pass a detector.

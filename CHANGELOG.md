# Changelog

All notable changes to this repository's bundles.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Bundles version
independently; each entry names the bundle it belongs to. The version recorded here is the
one in that bundle's four manifests and its `.claude-plugin/marketplace.json` entry, which
must agree.

**A note on what appears here.** A primitive that is authored but **held** (`ships: false`
in its `meta.yaml`, no rendered copy under `bundles/*/agents/`) is not a release and does
not get a version. It appears under *Unreleased* with its hold reason, because a reader
deciding whether to install a bundle should be able to see what is being worked on and why
it is not yet in their hands.

---

## Unreleased

The prose-author local candidates below remain unpublished.
No push, PR, release, tag or marketplace publication is implied.

---

## prose-review

### [0.3.0]

- **Added** `prose-reviser`, under a log-only contract: it emits an edit log rather than
  rewritten prose, so every change is inspectable before it is applied.
- **Added** `prose-fidelity-critic`, closing the review flywheel — a revision can now be
  checked for information loss, not only for voice.
- **Changed** the run harness to be re-runnable, with recorded verdicts recomputed from
  artefacts rather than trusted.

### [0.1.0]

- **Added** `prose-voice-critic` — judges a draft against an author's corpus directly,
  and a harness for measuring whether a prompt change actually moved the verdicts.

---

## prose-tell-scan

### [0.1.1]

- **Fixed** calibration blending so approved samples cannot dominate the pool past the
  cap, and cannot be blended in below the human-sample floor on a cold start.

### [0.1.0]

- **Added** `tell-scan` — scans prose for AI tells against a calibrated corpus rather
  than a fixed list, so the bands move with the author's own writing.

---

## verification-gate

### [0.1.0]

- **Added** `verification-critic` and `architecture-reviewer`, plus the hook wiring that
  runs them as a gate before work is declared done.

---

## prose-author

### [0.6.0] — shared writing identities

- **Added** a harness-independent `voice-identity-registry/1` outside plugin
  installations, pointing to shared corpora, pinned profiles, preferences and
  numerical history. Defaults require explicit selection; one-off jobs can opt out.
- **Added** immutable registry/profile revisions, atomic pointer updates,
  exclusive writer locks and stale-revision rejection. Incompatible versions,
  unavailable registered corpora and changed pinned profile bytes fail explicitly.
- **Integrated** identity resolution into drafting, profile preparation, tuning
  and history commands. Runs snapshot resolved inputs; old receipts do not read
  newer identity state. Existing explicit-path workflows remain available.
- **Preserved** independent preferences and undo across profile publication,
  opt-in history/rhetoric, distinct provenance and historical artifacts. No native
  Pi/Devin model adapter, multi-machine sync or automatic corpus ingestion added.

### [0.5.0] — local candidate, unpublished

- **Added** opt-in numbers-only history with per-piece rhythm and punctuation
  measurements, compatible contextual baselines, temporal summaries, pinned
  references, export, disablement and preview-bound deletion.
- **Added** independently usable `voice-rhetoric-measure` and separately enabled,
  bounded rhetorical estimates. Raw annotations are not retained in history.
- **Preserved** independent human evidence, revision/duplicate accounting and
  explicit preferences. Generated writing never becomes a human baseline;
  statistical departures are not automatic quotas or repair instructions.
- **Verified** exact-byte stage comparisons, native Claude/Codex installation,
  loose files and all local engineering gates, including 266 caught mutations.
  Fixed a timestamp-dependent mutation probe without changing production code
  or assertions; the original failed check remains recorded.
- **Recorded** twelve locked rhetorical draws without redraws. Structural validity
  is not semantic accuracy. Both corrected installed workflows have passing
  artifact audits, while Claude's chat-summary labeling failure remains visible.
- **Limits** collection remains off for real writing until enabled; English
  segmentation is heuristic, rhetoric is model-estimated, and neither establishes
  writing quality or resemblance. See [completion evidence](bundles/prose-author/tests/V050-FINAL-ENGINEERING.md).

### [0.4.0] — local candidate, unpublished

- **Verified** authoritative generated-file delivery in fresh Claude and Codex
  sessions. Chat summaries remain unverified; direct receipt excerpts must match
  their source. `check-result --delivery` detects prose or receipt changes.
- **Recorded** all local engineering gates passing, including 245 mutation
  update/check cases, with original failed experiments and known limits retained.

- **Changed** observed frequencies from compulsory quotas to advisory per-document
  tendencies. Added independent explicit phrase, punctuation, length and count rules.
- **Fixed** visible-prose measurement so link destinations, metadata and code do
  not inflate author counts. Rules use actual final length, exact zero limits and
  explicit not-evaluated states.
- **Added** profile/3, preferences/2 and style-spec/2, preserving historical readers
  and scoring. Short attributable samples count; sparse evidence stays limited.
- **Added** an authenticated Claude/Codex production runtime with task-scaled review,
  exact-byte receipts, selected whole human examples, profile-only mode and at most
  two repairs that retain original style inputs.
- **Added** generated human-readable delivery receipts and separate receipt-integrity
  verification that preserves failed or unevaluated check statuses. Host permission
  denials remain explicitly ungated; no sandbox bypass is automatic.
- **Added** persistent scoped corrections, shared store discovery, immutable history,
  undo and small-batch discovery/comparison. Direct persistent instructions save with
  receipts; inferred preferences require approval. No human attestation is required.
- **Preserved** rewriting and added passage-context continuation without automatically
  ingesting generated text into a human corpus.
- **Documented** the Pi adapter interface; implementation remains deferred. Companion
  bundle versions are unchanged because their contracts are unchanged.
- **Evaluation** uses a bounded two-author, three-form, three-condition comparison,
  not a renewed 20/60 release bar. Current evidence and known limits are
  recorded in [V040-PROGRESS.md](bundles/prose-author/tests/V040-PROGRESS.md).

### [0.3.0]

- **Added** `prose-style-tune`, a headless discovery, feedback, versioning, scoping,
  diff, compilation, and controlled-comparison workflow over immutable `voice-profile/2`
  evidence.
- **Added** `voice-feedback-interpret`, a read-only planner that translates one direct,
  discovery, or pairwise feedback event into a reviewable proposal. It cannot edit the
  profile or apply its own operations.
- **Added** deterministic `voice-preferences/1`, `voice-preference-proposal/1`, and
  `voice-style-spec/1` contracts with canonical digests, parent ancestry, explicit operation
  acceptance, stale-profile refusal, five-axis scopes, conflict refusal, and context-specific
  compilation.
- **Changed** `voice-draft` and its deterministic control/target cards to accept a compiled
  style specification while preserving the profile-only path. Recountable user-supplied
  controls can override named measured targets without rewriting the observed profile.
- **Documented** the repository split boundary: semantic contracts remain primitives;
  persistent corpus/project/UI state belongs in a future Style Studio product repository.

### [0.2.1]

- **Added** a conditional whole-paragraph residual-prune boundary for an overlong
  semantic revision. A corpus-blind planner selects paragraph IDs; deterministic
  code restores an explicitly locked title, normalizes an excess question mark
  on a Markdown heading, applies deletions, and recounts the complete result.
- **Added** a portable `schema` / `prompt` / `apply` CLI and routed the shipped
  `prose-draft` blank-page workflow through it only for the narrow supported case.
- **Verified** the exact immutable v0.2.0 m05 failure: the first two full-rewrite
  correction canaries remained overlong, while the bounded prune canary passed
  at 737 words with every semantic-bearing count in range. This targeted evidence
  is not represented as a fresh 20-draft acceptance run.

### [0.2.0]

- **Added** `voice-profile-render`, which converts a single-author corpus into cited
  semantic findings for deterministic `voice-profile/2` assembly. The profile covers ten
  fixed dimensions and keeps count/rate arithmetic out of the model's hands.
- **Added** `voice-draft`, a corpus-blind blank-page drafter. It receives only the request
  and rendered profile; Claude Code ships it with an empty tool allowlist.
- **Added** deterministic target compilation, semantic conformance measurement, bounded
  exact patches, and an independent factual-basis disclosure/rejection stage. These make
  unsupported claims visible; they do not guarantee factual accuracy.
- **Changed** `prose-draft` to choose between the original passage-rewrite path and the new
  blank-page path, and to label results UNGATED when `prose-tell-scan` or `prose-review`
  is unavailable.
- **Packaged** both agents for Claude Code, Codex, Cursor, generic plugin discovery, and
  loose-file installation without changing their canonical prompt bodies.
- **Evaluated** the release on two modern licensed corpora. Six fresh profiles validated;
  19/20 semantic revisions met every measured band; both underdetermined prompts refused.
  One revision retained one excess question and the run stopped before claim audits and
  critics. This known limitation is documented for v0.2.1 rather than hidden behind a
  resemblance, quality, detector, or factual-accuracy claim.

### [0.1.0]

- **Added** the `prose-draft` skill — scoped generation with two refusal paths, and edit
  ingestion as the correction channel.

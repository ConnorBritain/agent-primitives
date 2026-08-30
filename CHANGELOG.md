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

No unreleased prose-author changes.

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

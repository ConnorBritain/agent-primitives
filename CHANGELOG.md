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

### prose-author — the generator, held

Two primitives are authored, tested, and **deliberately not shipped**:

- **`voice-profile-render`** — reads an author's corpus and writes the voice profile a
  drafter works from. Every observation carries a sample citation and a support count;
  countable habits carry a measured rate (`count` + `per_1000_words`).
- **`voice-draft`** — writes prose from that profile. Runs with `tools: []`, so it
  cannot reach the corpus the profile summarises.

**Why they are held.** The pre-registered ship bar
(majority CLEAN at k=3 **and** ≤ 1.0 critic findings per draw, plus structural gates) is
currently cleared by 5 of 6 measured drafts, with 3 at unanimous zero findings — matching
the human-writing baseline. That is not sufficient, for reasons recorded in the run docs:
every artefact so far is public-domain text or one professional blogger, n is 6 on one
corpus, and no corpus belonging to an actual user has been through any of it.

Supporting test tooling added alongside them:

- `corpus-rates.mjs` — deterministic habit-rate comparison between a corpus and a draft,
  the first instrument here that compares the two rather than comparing drafts to each
  other. Includes the paragraph-ending measure that diagnosed a six-appearance critic
  finding no earlier measure could see.
- `fixture-guard.mjs` — prompt-leak guard. Catches a prompt naming a fixture's author
  (from directory names *and* corpus frontmatter) and a prompt quoting a fixture corpus's
  measured rates, which is the same contamination wearing arithmetic.
- `loop.mjs` / `loop-harness.mjs` — the critique loop's stopping and degradation rules,
  replayable from recorded artefacts.

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

### [0.1.0]

- **Added** the `prose-draft` skill — scoped generation with two refusal paths, and edit
  ingestion as the correction channel.

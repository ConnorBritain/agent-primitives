---
name: prose-draft
description: This skill should be used when the user asks to draft or rewrite a passage in their own voice, says a paragraph "isn't working" and wants it rewritten, asks for help writing from notes in their style, or asks what a draft would look like written the way they write. Requires a calibrated writing profile with a human corpus; refuses to compare against fallbacks when none exists. Drafts against the author's own samples and voice card, never against a list of words to avoid. Never claims the output sounds like the author.
---

# Prose draft

Scoped generation in a specific person's voice, verified in that person's own
measured terms.

**v0.3 has two drafting paths plus an optional tuning layer.** Preserve the v0.1 passage-rewrite path when the user gives
you prose to rewrite. Use the blank-page path when the user gives you a topic,
brief, notes, outline, or correspondence prompt and asks for new prose. “Blank
page” means there is no existing passage to transform; it does not mean the tool
writes without evidence about the voice.

When the user has a `voice-preferences/1`, use the sibling `prose-style-tune` skill to
compile it with the immutable observed profile and the current register/form/audience/purpose/
project context. Give the drafter the resulting `voice-style-spec/1`, not a hand-edited profile.
The ordinary profile-only path remains backward compatible.

## Choose the path before loading style material

- **Existing passage:** use the passage-rewrite path below. Present original and
  rewrite side by side.
- **New prose:** use the blank-page pipeline below. Do not show the corpus to the
  drafter and do not substitute the old exemplar prompt for a rendered profile.
- **Ambiguous request:** ask whether the user wants the supplied prose rewritten
  or wants a new piece built from it as source notes.

## Blank-page pipeline (v0.2)

The boundary is the feature:

```text
human corpus -> voice-profile-render -> voice-profile/2
                                      -> voice-draft (prompt + profile only)
                                      -> conformance + independent claim audit
                                      -> tell scan + independent voice review
```

### 1. Require and render a profile

Require a single-author human corpus satisfying the renderer's documented floor.
If there is no current `voice-profile/2`, or its corpus/prompt lock is stale,
create deterministic measurement context with `tools/profile-measure.mjs`, run
`voice-profile-render` in a fresh context over the corpus, and assemble its
`voice-profile-source/4` with `tools/profile-assemble.mjs`. The assembler—not the
model—owns counts, rates, observation IDs, coverage rows, and final provenance.

Historical `voice-profile/1` artifacts remain readable, but every new render is
`voice-profile/2`. Never combine several renders into a production profile.

If the renderer refuses a thin, mixed, stale, oversized, or catalog-contaminated
corpus, stop. Do not create a generic voice and label it personal.

### 2. Dispatch the corpus-blind drafter

Run `voice-draft` in a fresh context with exactly two semantic inputs:

1. the user's prompt, including reader, purpose, form, and requested length;
2. either the rendered profile (`profile.json`, with its human-readable profile text) or a
   context-specific `voice-style-spec/1` compiled by `prose-style-tune`.

Do not pass corpus files, exemplars, the tell catalog, earlier generated prose,
or session history. The empty Claude tool allowlist enforces this boundary there;
on Codex, Cursor, and AGENTS.md-only harnesses, use a clean subprocess/context and
describe the boundary as advisory rather than enforced.

An underdetermined register is a refusal, not an invitation to guess. The draft
must disclose unsupported factual claims in `claims` and supported profile
instructions it could not use in `omitted`; it must never invent first-person
biography for the author.

### 3. Conform and audit before presenting

Compile the deterministic target card, measure the first draft, and run the
mandatory semantic-conformance revision.

If that revision is still over the requested length, first check whether the
only remaining semantic repairs are an explicitly locked title and excess
question marks on Markdown headings. In that narrow case, use
`tools/draft-residual-prune.mjs`: generate its plan prompt, dispatch
`references/residual-prune.md` in a fresh corpus-blind context with the schema
from the tool's `schema` command, then apply the returned plan through the
tool's `apply` command. The planner may select only whole unlocked body
paragraphs; code restores the title, performs safe heading normalization,
applies the deletions, and recounts the complete result. A plan that remains
long, empties a section, deletes the closing paragraph, or moves a
semantic-bearing counter out of range fails.

Do not use the prune planner for an underlength draft, arbitrary semantic
failures, or general rewriting. Do not redraw complete drafts to chase a
favorable result. After semantic counts and length are in range, request only
the bounded minimal patch and apply it through the deterministic conformance
tool for remaining byte-safe measured forms.

```bash
node tools/draft-residual-prune.mjs schema
node tools/draft-residual-prune.mjs prompt --source revision.json --profile profile.json --request-file request.txt
node tools/draft-residual-prune.mjs apply --source revision.json --profile profile.json --request-file request.txt --plan plan.json
```

Then run the factual-basis audit in a separate clean context and assemble the
public draft only after the audit is linked to the exact prompt and draft. This
does **not** prove factual accuracy. It makes factual invention visible and
rejects the hard categories it can identify; users should still verify disclosed
claims that matter.

### 4. Review independently, or label the result ungated

Run `prose-tell-scan` after drafting. Run `prose-review`'s
`prose-voice-critic` in a fresh context against the author's corpus; if revision
is requested, use the review bundle's revise -> fidelity protocol rather than
letting the drafter silently grade and rewrite itself.

If either `prose-tell-scan` or `prose-review` is unavailable, you may return the
draft, but label it **UNGATED** and name the missing check. Never imply that an
unavailable check passed. A gated result means the exact presented bytes were
scanned and independently reviewed.

### 5. Present only supported claims

Present the draft, its disclosed claims and omissions, the deterministic
conformance result, and the independent review status. Never claim that the
draft sounds like the author, is good, is factually accurate, or would pass a
detector. The author makes the voice judgement.

## Passage rewrite (v0.1, preserved)

One passage is the unit where the author can see immediately whether the result
is theirs, and that judgement is the only one that counts here.

## Before anything else: is there a corpus?

```bash
node tools/exemplars.mjs <profile-dir> --target-words <n> --n 3
```

If this refuses, **stop and say so.** Do not draft against a voice card alone
and describe the result as being in the author's voice, and do not fall back to
a generic register and let the phrasing imply otherwise.

The ordering constraint is real: **corpus → calibration → generation.** A tool
that drafts before it can measure is guessing, and a guess phrased in the second
person is worse than no tool.

## What you are given, and what you are not

**Given:** the author's material, `voice.md` for the register, whole exemplars
from `corpus/human/`, and the register's purpose from `profile.json`.

**Not given: `catalog.json`.** Not as a prohibition list, not as "avoid these
words", not in any form, not even as a hint after drafting. This is decided, not
open.

The reason is the whole design in one line: **prose optimised against a tell list
scores zero and reads like nobody wrote it** — which is the failure the catalog
exists to detect, reproduced by the tool meant to prevent it. The target is the
author's voice. The catalog is a diagnostic that runs afterwards, on the way to a
human, and never a quantity to minimise.

## What you may read from earlier in the piece

| may read | why |
|---|---|
| a factual outline of prior sections | terms and claims already established |
| **the author's edits to your earlier drafts** | the correction signal, pure human data |
| ❌ your own prior prose | self-amplification, compounding every round |

Content and style travel on separate channels, and **the only style input is
human.** If you need continuity of rhythm, get it from the exemplars, not from
what you wrote a minute ago.

The middle row is the valuable one. When an author rewrites a generated
sentence, that diff is the most concentrated evidence about their voice that
exists — better than a corpus sample, because it is a correction in context. It
wrote X, they made it Y, and nothing about that is ambiguous.

## Verify, and say only what the verification supports

```bash
node tools/verify.mjs <draft> --profile <name>
```

Three things are checkable and those three are exactly what you may claim:

1. the draft was scanned against **this author's** profile
2. its cadence and density were compared to **this author's** derived bands
3. no Tier A artifact is present

**A Tier A artifact returns the draft.** Leaked markup, a chatbot preamble, an
identifier failing its own checksum — these are not style observations to weigh
against a band. Regenerate. Do not present one beside a tidy cadence table,
because the author will read the table.

**With no calibrated corpus, report no gap.** Say the draft is artifact-clean —
that check needs no corpus — and then say plainly that cadence was not compared,
rather than comparing against fallbacks and letting "within range" be read as
"within *your* range".

### Never claim

- that the draft **sounds like the author** — unmeasurable, and the one thing
  the author is best placed to judge
- that the draft is **good** — not this tool's business
- that it would **pass any detector** — refused on principle everywhere in this
  repo, and it would be a lie about a moving target

## Presenting the result

Original and rewrite side by side, then the verification, then stop. Do not
argue for the rewrite. The author reads both and decides, and a paragraph
explaining why yours is better is a thumb on that scale.

If the scan showed the draft outside the author's range, say where, and say the
three things it might mean: the draft drifted, they are writing something new, or
their corpus is too narrow to describe them any more. **You cannot tell these
apart.** Phrase it as the open question it is.

## Recording a kept edit

When an edit lands the voice, record it — the pair (original, edit) is the most
concentrated evidence about the author's voice available anywhere.

```bash
node tools/ingest-edit.mjs <edited> --original <path/to/generation> --profile <name>
```

`edit_fraction` is computed here, from a word-level LCS diff. It is never a flag
and never trusted from frontmatter — a number an author states about their own
contribution drifts upward, and unlike `--attest` (which nothing can verify)
this one can be, so it is.

Three refusals worth knowing:

- **below 10% edited** — this teaches the drafter to reproduce its own output;
  if it was already right it was luck, not evidence about you
- **below the word floor** — approved/ never advertises files calibration would
  exclude anyway
- **repeat ingest** — passes with `--force`; otherwise the second copy would
  claim a fresh date for an identical edit, which is drift

### Auditing the approved corpus

```bash
node tools/ingest-edit.mjs --verify --profile <name>
```

Walks every approved sample, reads the `.originals/<sha256>.txt` it points at,
re-derives `edit_fraction` from the pair, and reports drift on any sample whose
stored number no longer recomputes — or whose stored original no longer hashes
to its filename, or is missing entirely. **Exits non-zero on any drift.**

Ingest cannot prove `--original` was really the drafter's output; `--verify`
makes the number auditable afterwards, which is the property that matters for a
threshold input. Run it before trusting a blended calibration, and after any
manual reorganisation of `corpus/approved/`.

## When the author disagrees

If they say "no, that's me" about something flagged — that is the most valuable
event available. It is a labelled, deliberate extension of their voice, in
context, with a measurement attached, covering exactly the case the corpus does
not. Offer to add the passage to `corpus/human/`, and say that the next
calibration will widen the band that flagged it.

## Known limits

- **Blank-page drafting is evidence-constrained generation, not fact checking.**
  The independent audit can reject or disclose unsupported material, but it can
  miss a bad claim. Verify consequential claims against real sources.
- **The profile is a compact map, not the corpus.** It preserves measured and
  cited habits while deliberately denying the drafter direct corpus access. Very
  unusual forms or registers may be refused or may need a refreshed corpus.
- **Residual pruning is deliberately narrow.** It can remove redundant whole
  paragraphs from an overlong revision and deterministically recount the
  result; it cannot repair an underlength draft or prove that a deletion
  preserved every nuance. The independent review remains required for a gated
  result.
- **Passage rewrite remains supported.** Mid-document continuation with the
  drafter reading its own earlier prose is still excluded because it creates the
  self-amplification loop this bundle is designed to avoid.
- **`corpus/approved/` is written by `ingest-edit.mjs` and read by
  `exemplars.mjs`, under the cap in
  [`PROFILES.md`](../../../prose-tell-scan/PROFILES.md).** It never feeds
  cadence bands from here. Slots are `floor(n × cap)`, so at `--n 3` no
  approved sample is selected at all — the cap is a ceiling, not a quota. The
  tool reports this rather than leaving it implicit.
- **`calibrate.mjs` blends `corpus/approved/` into catalog bands** under the
  cap. Human-only and blended ceilings both ship in `thresholds.derived.json`;
  cadence bands stay human-only, always. A narrowed blended ceiling raises a
  warning at calibration time.
- **Verification needs `prose-tell-scan`.** It is resolved from a loose-file
  install, a plugin install, or `TELL_SCAN_PATH`. If it cannot be found,
  `verify.mjs` says the draft was **not scanned** and lists where it looked —
  the absence of a check, never a pass.
- **A gated blank-page result also needs `prose-review`.** Without its independent
  critic, the result must be labelled UNGATED even if deterministic checks pass.

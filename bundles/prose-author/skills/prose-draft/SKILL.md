---
name: prose-draft
description: This skill should be used when the user asks to draft or rewrite a passage in their own voice, says a paragraph "isn't working" and wants it rewritten, asks for help writing from notes in their style, or asks what a draft would look like written the way they write. Requires a calibrated writing profile with a human corpus; refuses to compare against fallbacks when none exists. Drafts against the author's own samples and voice card, never against a list of words to avoid. Never claims the output sounds like the author.
---

# Prose draft

Scoped generation in a specific person's voice, verified in that person's own
measured terms.

**v0.1 does one thing: rewrite one passage, with the original beside it.** Not a
blank page, not a whole piece, not a continuation. One passage is the unit where
the author can see immediately whether the result is theirs, and that judgement
is the only one that counts here.

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

- **One passage.** Blank-page drafting and continuation are v0.2 / v0.4 and
  are not here. Edit ingestion (v0.3) does ship — see *Recording a kept edit*
  above.
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

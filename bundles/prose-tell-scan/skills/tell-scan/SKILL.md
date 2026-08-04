---
name: tell-scan
description: This skill should be used when the user asks to review a draft for AI writing tells, check prose for AI-sounding patterns, check a draft's rhythm or cadence, asks whether something "reads like AI", or asks to have writing "humanized". Also use when calibrating writing profiles, adding samples to a writing corpus, or comparing a revision against an earlier draft. Runs a deterministic scanner over prose and reports what it counted. It measures; it does not rewrite, and it is not the prose-review critics that judge substance, voice, or argument. Reports signals for the author to weigh, never a verdict about authorship.
---

# Prose tell scan

Deterministic measurement of prose: catalogued AI writing tells, and the rhythm
metrics a model cannot reliably estimate about its own output.

The scripts under `tools/` hold the deterministic logic. Your job is
orchestration and interpretation: pick the right invocation, read the JSON, and
tell the author what is worth their attention. Do not re-implement any of the
counting — the entire premise is that counting is a job for a script.

## Why this exists in this shape

Asked to self-assess a draft for AI-isms, a model finds the tells it remembers
writing. A scan of that same draft found *genuinely* six times and *actually*
eight — neither of which the self-assessment surfaced. Frequency is a counting
problem. Anything decidable deterministically is decided by the scripts, so your
judgement is reserved for what a regex genuinely cannot do.

## Running it

All paths are relative to this skill's directory.

```bash
node tools/tell-scan.mjs <file> --json           # the normal case
node tools/tell-scan.mjs <file> --profile essay --json
node tools/tell-scan.mjs <new> --baseline <old> --json   # did a revision work?
node tools/tell-scan.mjs --list-profiles
```

Use `--json` whenever you are going to interpret the result; the human-readable
form is for when the user wants to read it directly. Node ≥ 18, no dependencies.

## Reading the output

Work through it in this order:

1. **`profile.thresholds.derived`** — if `false`, every comparison is against a
   hand-written fallback rather than a measurement of this author's register.
   **Say so in your summary.** A number reported without that caveat gets quoted
   without it too.
2. **`findings[].flagged`** — over threshold with enough occurrences to be a
   rate. These are the leads.
3. **`findings[].held_by_floor`** — cleared the ceiling on one or two hits.
   Mention only if relevant; they are usually noise.
4. **`summary.flagged_categories`** — the count matters more than any single
   entry. Tells cluster or they are nothing.
5. **`cadenceChecks[].flagged`** — rhythm outside the register's band.

Every finding carries `line`, `contexts` (the surrounding sentence with the match
marked), `note`, and `source`. **Quote the context line when reporting.** A bare
matched word is not reviewable; the sentence around it is.

## Rules for reporting

- **Never call anything AI-written.** The output is signals about a draft, for
  its own author. This must never be used to judge whether someone else wrote
  their work, and there is deliberately no score to quote.
- **One elevated category is weak.** Say so. Several co-occurring is worth a
  read-through.
- **Lead with what to do**, not with the table. "Three uses of *actually* in
  four paragraphs, all removable" beats a density figure.
- **Do not propose rewrites unless asked.** This skill diagnoses. Over-editing a
  writer's voice is the failure mode that matters most here.
- **Check `note` before repeating a finding as fact.** Several entries are marked
  `contested` and carry their own false-positive warnings.

## Register profiles

Thresholds are register-dependent, resolved per file: `--profile` flag → the
document's own frontmatter → path rules in `<project>/.claude/humanizer.json` →
`_base` with a warning. Shipped registers: `essay`, `technical`, `narration`,
`correspondence`.

A flat rhythm is correct in a reference doc and a symptom in an essay. If the
resolved profile looks wrong for the document, say so before reporting findings —
every threshold below it depends on that choice.

## Calibration

Shipped thresholds are guesses. Derived ones measure what the author's good
writing in that register actually looks like, and that difference is the product.

```bash
node tools/init.mjs --project <dir>              # scaffold profiles + corpus dirs
node tools/ingest.mjs <file> --profile essay --source "<where from>" --attest
node tools/calibrate.mjs essay --write
```

`--attest` is a claim the user makes that a human wrote the sample unaided. **Ask
before passing it; never assume it.** Wrongly attested samples pull thresholds
toward AI norms with nothing in the output to show it. Calibration refuses below
5 usable samples and labels 5–9 as thin.

When a scan reports uncalibrated thresholds and the user seems likely to keep
using this, offer the calibration path. It is the difference between a tool they
keep and one they disable.

## Dialect and register bias

The style catalog encodes one set of writing norms. An ornate formal register —
the professional norm in several varieties of English, including Indian,
Nigerian, and Kenyan English — trips the `tonal-inflation` and
`corporate-register` categories. Several teaching traditions also train writers
away from repeating words, which produces the same signature the catalog reads as
a tell.

If the user's writing is being flagged this way, offer, in order:

1. **Calibrate** on their own corpus. Bands measured from their writing encode
   their register. This is the real fix.
2. **`--artifacts-only`** — Tier A alone: leaked citation markup, chatbot
   register, cutoff hedges, placeholders. Dialect-neutral, because no variety of
   English produces `[cite: 3]`.
3. **`disable_categories`** in that profile's `catalog.json`.

Never suggest that ornate or formal prose is itself evidence. The catalog lists
that under `rejected` precisely because treating it as a signal is the failure
mode that hits these writers hardest.

## Two tiers

**Tier A is artifacts** — leaked markup, chatbot register, unreplaced
placeholders. Dispositive on one occurrence; they bypass density gating. If one
fires, lead with it.

**Everything else is style**, meaningful only in aggregate and density-gated. One
occurrence of anything in this tier is not a finding.

## Limits worth stating to the user

- **Mention vs use.** A document discussing a tell gets flagged for it. Obvious
  from the context line; the scanner cannot tell the difference.
- **Short documents.** Below ~800 words, density per 1000 swings hard on single
  occurrences. The scanner says so; repeat it.
- **Absence is invisible.** Missing concrete detail, an undefended position, a
  voice that never shifts — the scanner cannot see any of it. If the user wants
  that, it needs a reader, and it is the half that usually matters more.
- **Patterns expire.** Entries carry an `era`. The 2023–24 cohort is largely
  trained out; the current one is participial.

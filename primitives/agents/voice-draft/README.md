# voice-draft

Writes one draft from a prompt and a rendered voice profile — so that drafting in
someone's voice does not require handing their corpus to the drafter.

## Status

**Held.** `ships: false` since 2026-08-07. Authored under PI-02 S3. There is no rendered
copy under `bundles/prose-author/agents/`, no manifest entry, and no marketplace entry.
The gap between `primitives/` and `bundles/` is the hold.

**No ship bar exists yet.** PI-02 sequences it into S5, pre-registered before any
acceptance run. The fixture results in `bundles/prose-author/tests/runs/` are authoring
tests, not acceptance.

Design decisions, including why this is an agent rather than an extension of the shipped
`prose-draft` skill, are in `.planning/PI-02-S3-design.md`.

## Why this is an agent, and named this

`bundles/prose-author/skills/prose-draft/` already ships — it rewrites one passage with
the original beside it, working from whole exemplars. This is different work: blank page,
from a summary.

It is an **agent** rather than a second skill for a reason that has nothing to do with
taste. Skills live in the bundle only and are auto-discovered, so a skill added to this
bundle **ships on merge**; there is no `ships: false` for one, because the hold mechanism
*is* the absence of a bundle copy. PI-02 requires that nothing generate under a bar that
does not exist until S5. An agent can be held. A skill cannot.

It is named `voice-draft` because `prose-draft` is taken, and two things under one name in
one bundle is a dispatcher ambiguity, not a cosmetic problem.

At S6 the two compose the way `CONTRIBUTING.md` already describes — *"a skill that spawns
the agent"*. The shipped skill gains a blank-page path; this agent does the drafting.

## The firewall is the point

The drafter reads **the profile and nothing else**. Not the corpus, not the exemplars,
not the catalog.

This is what the profile is *for*. Rendering it is a whole separate primitive whose job
is to read a corpus once and summarise it; a drafter that also has the corpus makes that
work decoration. And the corpus does not fit the prompt forever — the profile is the
thing that survives a corpus growing past a context window.

`tools: []` makes it structural. With no `Read` and no `Glob` the agent cannot reach the
corpus, because it cannot reach anything: the orchestrator inlines the prompt and the
profile, exactly as `prose-reviser` receives its plan. A promise in a prompt would be
worth less.

**The catalog rule is inherited and absolute.** Prose written to avoid a list of words
reads like nobody wrote it, which is the failure the catalog exists to detect. If one
appears in the input, the drafter refuses.

## The two ways this goes wrong

Both are specific to drafting from a *summary*, and neither has a precedent elsewhere in
this repo.

### Caricature, from misreading the counts

Every observation in a profile carries a count like `9/10 samples`. That is **the number
of samples in which the habit appears at all — not how often it fires inside one.**

A profile saying *"a long accumulating sentence is stopped by a short flat one — 9/10"*
describes a move the writer reaches for. A draft that performs it every paragraph is a
parody, and it reads as one immediately. So a high count says the habit belongs in the
draft; it does not say how often. Where the profile gives no frequency, the rule is
**once or twice and no more** — restraint is recoverable, caricature is not.

### Reproducing the edition instead of the author

A profile's section 8 says what it could not determine, and what in the evidence belongs
to a translator, a compositor, or a selecting editor.

**Section 8 is binding.** If the profile says the ellipses are mostly the printer's
cut-marks, then trailing dots are not this voice, and putting them in is imitating a
typesetter. This is not hypothetical: it is exactly what the Chekhov corpus does, it took
a dedicated investigation (FU-6) to establish, and a drafter reading section 8 as
background would have undone that work silently.

Where section 8 reports a gap — no evidence about length, or a form never observed —
the drafter may still write, but **may not invent a habit to fill it.** An invented habit
is indistinguishable, on the page, from an observed one.

## What it refuses

- **A prompt that leaves the register unchoosable.** The profile records a *range*; a
  prompt with no reader, no occasion and no purpose does not select a point in it, and
  choosing silently asserts a decision the author never made. This is the same rule
  `prose-author` already applies to calibration, where *"within range"* read as *"within
  your range"* is called the tool's worst available lie.
- **A length or form far outside the profile's evidence**, where the draft would be
  mostly invention.
- **Anything the profile cannot constrain at all** — verse, code, tables, translation.
- **A catalog or tell list in its input.**

It does **not** refuse merely because section 8 lists gaps. Every honest profile lists
gaps; a profile with none would be the untrustworthy one. Asking for an essay from a
letters-only profile is legitimate — cadence, figures and address transfer even where
form-level habits do not.

## Reading the output

One artifact: the draft in a `markdown` fence, or a `json` refusal, never both. No
commentary, on the same reasoning as the reviser's log-only contract — a paragraph
explaining the draft is a thumb on the scale for whoever judges it next.

Read the draft first and ask the question the tests cannot: **does this sound like them?**
Then, specifically:

- **Is any one habit doing too much work?** Count how often the profile's headline move
  appears. Three times in five hundred words is usually the ceiling.
- **Does it wear the period as a costume?** The profile describes how someone writes, not
  what they wrote about. A modern subject in an 1890s idiom is a failure even when every
  sentence-level habit is right.
- **Did anything from section 8 get reproduced anyway?**

## Known limits

- **No draft has yet reached the author's own baseline.** In the S3 run, `prose-voice-critic`
  returned 1–3 findings on profile-matched drafts against a baseline of **0 findings,
  unanimous CLEAN, on the author's real writing**. The drafts are distinguishable from the
  author by the same instrument that judges them. Whether that gap closes is what S5's bar
  will measure; it is not closed now, and this README will not claim otherwise.

- **The profile can be silent about something that matters.** A critic in the S3 run
  flagged a matched draft for using no contractions anywhere, citing nine of ten corpus
  samples that contract densely. The profile records no contraction habit at all, so the
  drafter had no way to know. Every gap in a profile becomes a gap in the draft, invisibly.

- **Never measured on a real person's writing.** Same gap `prose-author`,
  `prose-voice-critic` and `voice-profile-render` all declare, for the same reason: this
  repo has public-domain letters and essays, not one author's corpus with provenance
  discipline.

- **The empty tool allowlist is not reproducible in the test harness.** Test dispatches
  read two files by path under an explicit prohibition on reading anything else. The
  firewall is therefore verified on the *output* — a 6-gram overlap check between each
  draft and the corpus, minus everything the profile quoted. Zero hits across six drafts,
  but that is evidence, not enforcement.

- **One draft, no variants.** It does not offer three and let you pick. Whether that is
  right is an open question for S4.

- **Never claims the draft sounds like the author**, that it is good, or that it would
  pass a detector. The first is the author's judgement; the third is refused on principle
  everywhere in this repo.

## Install

Held — not installable yet. When the hold lifts:

```bash
./install.sh voice-draft              # → ~/.claude/agents/
./install.sh --project voice-draft    # → ./.claude/agents/
```

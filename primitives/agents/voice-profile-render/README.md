# voice-profile-render

Reads an author's corpus and writes the description of their voice that a drafter
works from — so that drafting in someone's voice does not require handing the corpus
to the drafter every time.

## Status

**Held.** `ships: false` since 2026-08-07. Authored under PI-02 S2; there is no
rendered copy under `bundles/prose-author/agents/`, no manifest entry, and no
marketplace entry. The gap between `primitives/` and `bundles/` is the hold.

The hold is not a quality judgement. **No ship bar exists yet.** PI-02 sequences the
bar into S5, pre-registered before any acceptance run, and S2 deliberately did not
write one — a bar authored by the same person in the same sitting as the primitive is
a bar shaped to be cleared. The authoring tests (positive, negative, stability,
firewall, schema) are recorded in the S2 run directory under
`bundles/prose-author/tests/runs/`, and they are authoring tests, not acceptance.

Design decisions, including two deviations from PI-02.md, are in
`.planning/PI-02-S2-design.md`.

## Why this exists

`prose-author` already drafts in a person's voice by handing the drafter whole
samples from their corpus. That works, and for one passage it is the right design —
a paragraph lifted out of a piece shows a rhythm without showing what the rhythm was
responding to, so the drafter gets whole pieces.

It stops working for two reasons at once.

**The corpus outgrows the prompt.** Ten letters fit. A register with sixty samples
does not, and the moment something has to choose which samples go in, there is a
selection step whose bias nobody can see. A rendered profile is the thing that
survives that growth: read the corpus whole once, summarise it once, and hand the
summary over from then on.

**Exemplars show a voice without naming what to notice in it.** A drafter given ten
Chekhov letters can see that they are Chekhov and still not register that the
questions are aimed at the recipient rather than the page. Naming the habit is what
turns a sample into an instruction. That is the whole content of this primitive, and
it is also its danger — see below.

The profile does not replace exemplars. It sits beside them.

## The failure mode this is built around

An author-kind primitive's risk, per `CONTRIBUTING.md`, is **inventing conventions
the material does not support.** For this one that is not an edge case; it is the
default behaviour of a fluent model asked to describe a voice.

Read ten pieces of writing and you will feel that you understand the person. Most of
that feeling is not evidence. A profile that says "she writes with a restrained,
unsentimental clarity" is describing an impression, and a drafter told to reproduce
it will produce prose aimed at a mood nobody can check. Worse, it reads *well* —
there is no surface signal separating an observation from a compliment, so review
does not catch it.

So the primitive is organised around one rule: **one claim, one citation, one count.**
Every observation carries the number of samples it holds in and at least one quoted
span from a named sample. An observation that cannot be cited is dropped, and the
number of drops is reported. A render that dropped nothing was not filtering.

That rule is what makes the profile checkable rather than merely fluent, and it is
checked externally — the emitted JSON carries a support count per observation and the
bundle's selftest reads it. The primitive does not self-attest.

## Why a separate agent

**The corpus must not land in the caller's context.** That is the entire reason this
is a subagent and not an inline step. If the session that reads the corpus is also the
session that drafts, the drafter has the corpus, and the profile is decoration. Clean
context is the mechanism, not a nicety.

**The catalog firewall needs a tool boundary.** The renderer must never read an AI-tell
catalog, because the drafter reads the profile and anything catalog-shaped reaches the
drafter transitively — prose optimised against a tell list scores zero and reads like
nobody wrote it, which is the failure the catalog exists to *detect*. A separate agent
with its own narrow allowlist makes that a boundary rather than a promise.

## What it does

Reads `corpus/human/**` whole, plus `voice.md` and `profile.json` from the same
profile directory. Emits two artifacts: a prose profile the drafter reads, and a JSON
provenance block the harness reads.

**It never reads the catalog, and refuses if one is placed in its input.**

**It computes no hashes.** Same rule as `prose-reviser`: a model cannot compute sha256
reliably, and a fabricated hash inside a provenance block is worse than an absent
field. `corpus.lock.json` is produced deterministically alongside the render.

The profile has eight fixed sections — cadence, openings, closings, who is addressed,
figures, register range, what the corpus never does, and what could not be determined.
The renderer may not add sections; anything that fits nowhere goes in the last one as
a gap.

### Section 7 is where a tell list would sneak in

An absence is worth recording and a list of absences is a tell list. The rule that
resolves it is a phrasing rule: **an absence is recordable only paired with the
positive habit that occupies its place.**

Not *"never glosses a metaphor."* Instead: *"images are left to stand — a comparison
is introduced and then dropped without explanation, 7/10 samples, and nothing in the
corpus reaches for* which is to say *or an equivalent unpacking."*

Same information. The second one a drafter can follow; the first they can only avoid
violating, and writing by avoiding violations is how prose gets produced that reads
like nobody wrote it.

### The author's own voice card is an input, not a target

`voice.md` is the author's hand-written account of their own voice, and
`prose-voice-critic` already reads it as *its* target. This primitive does not
overwrite it, and the reason is a circularity: if the renderer wrote `voice.md`, the
critic's target and the drafter's instructions would be the same machine-generated
text, and the drafter could not fail a description it was written from.

Where the card and the corpus agree, the profile may cite the card as corroboration.
**Where they contradict each other, the profile reports the contradiction and does not
resolve it.** An aspiration, a stale card, and a corpus that no longer describes the
author are three different things that look identical from here, and picking one
silently is the worst of the three outcomes.

## When to run it

When a profile directory has a filled `corpus/human/` and something downstream needs
to write in that voice. Once per corpus, not once per draft — the profile is a cached
artefact.

**Ordering is real, and it is the one `prose-author` already states:** corpus, then
calibration, then generation. A profile rendered from three samples describes nothing.

It refuses below five usable samples, marks 5–9 as `thin`, and refuses above fifty
because past that a whole read has quietly become a sampling decision. "Usable" means
carrying PROFILES.md provenance frontmatter; samples without it are excluded and listed
by name.

### Re-rendering

`corpus.lock.json` keys the profile to the corpus that produced it: per-file sha256,
plus an aggregate over the sorted file list, the voice card, and the prompt's own
hash. The prompt is in the key because a profile rendered by an older version of this
primitive is not interchangeable with one rendered by the current version — the
cross-author run's `MANIFEST.json` already records `agent_sha256` for the same reason.

**A stale profile is reported, not silently regenerated.** The profile is an artefact
the author read and approved; regenerating it underneath them because they added one
sample is the erosion that voice locks were designed against. Stale is a status.

## Reading the output

Two fences: the profile in `markdown`, then the provenance in `json`.

Read the profile first, as the drafter would. The question to ask is not "is this
accurate" — it is **"could I write from this?"** An observation you cannot act on is
an impression that survived the citation rule by being attached to a real quote.

Then read the JSON, and read three fields before the rest:

- **`observations_dropped`** — if this is `0`, be suspicious. It means nothing was
  filtered, which for this task is unlikely.
- **`confidence`** — `thin` means 5–9 samples, and every observation inherits that.
- **`multiple_voices_suspected`** — if `true`, the profile is a report about the
  corpus, not a description of a voice. Do not draft from it.

Then spot-check citations against the corpus. Every `support` count in the JSON must
match the count printed in the prose beside the claim; the selftest asserts the
structure, but only a human comparing a quote to its sample catches a citation that
is real and irrelevant.

## Known limits

- **The Chekhov fixture is a translation.** The corpus is Constance Garnett's English,
  so the ellipses, the exclamation marks, and the idiom are partly hers. A profile
  built on it may instruct a drafter to reproduce a translator's habit as the author's.
  Recorded rather than worked around, because working around it means giving up the
  only substantial single-author corpus this repo has. It is a real caveat for the
  fixture and not a defect in the primitive — a user's own corpus has no translator.

- **Never measured on a real person's writing.** Same gap `prose-author` and
  `prose-voice-critic` both declare, for the same reason: measuring "did this describe
  how they actually write" needs one author's corpus with provenance discipline, and
  this repo has public-domain fiction and letters instead.

- **Stability is tested, not guaranteed.** Two renders of the same corpus produce the
  same section structure and substantially overlapping observations. They do not
  produce identical text, and this primitive does not claim they do — byte-equality is
  not a property of a language model, and a test asserting it would pass only by being
  wrong about what was built. What is asserted is the weaker, true thing: no
  observation in one render contradicts one in the other.

- **It cannot cluster.** The "more than one voice" refusal is a judgement, not a
  measurement. `calibrate.mjs` does this numerically, on a gap rather than a
  difference of means, and does it better. If both are available, believe the
  arithmetic.

- **Support counts are the model's own count.** The schema check asserts every
  observation *has* a count and that the JSON matches the prose. It does not verify
  the count is right — that would need the corpus scan the primitive is deliberately
  not carrying. A miscount is a real failure mode and only a human spot-check finds it.

- **No ship bar.** See *Status*. The primitive is authored and tested; it has not been
  measured against a pre-registered standard, because none exists until PI-02 S5.

- **Never claims a draft will sound like the author.** Nor that a draft is good, nor
  that anything would pass a detector. The first is the one judgement the author is
  best placed to make; the third is refused on principle everywhere in this repo.

## Install

Held — not installable yet. When the hold lifts:

```bash
./install.sh voice-profile-render              # → ~/.claude/agents/
./install.sh --project voice-profile-render    # → ./.claude/agents/
```

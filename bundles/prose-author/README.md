# prose-author

Scoped generation in a specific person's voice — drafted against **their own
writing**, verified in **their own measured terms**, and careful about what it
claims.

**v0.1 rewrites one passage, with the original beside it.** Not a blank page, not
a whole piece. One passage is the unit where an author can see immediately
whether the result is theirs, and that judgement is the only one that counts.

## The decision the whole bundle turns on

The obvious design hands the drafter the AI-tell catalog as a list of things to
avoid. **That is reversed here, and the reversal is load-bearing.**

Prose optimised against a tell list scores zero and reads like nobody wrote it —
which is the exact failure the catalog exists to *detect*, reproduced by the tool
meant to prevent it. Goodhart, in one hop: a measure used as a target stops being
either.

So the drafter never sees `catalog.json`. In any form. The target is the author's
voice; the catalog is a diagnostic that runs afterwards, on the way to a human,
and never a quantity to minimise.

## What it is given

The author's material, their `voice.md`, whole exemplars from their
`corpus/human/`, and the register's purpose. Whole files, because a paragraph
lifted out of a piece shows a rhythm without showing what the rhythm was
responding to.

## What it is allowed to say afterwards

`kind: author` obliges a primitive to state how its output was verified. Three
things about a draft are checkable, and those three are exactly what gets
claimed:

1. it was scanned against **this author's** profile
2. cadence and density were compared to **this author's** derived bands
3. no Tier A artifact is present

And three things are never claimed, under any flag: that the draft **sounds like
the author** (unmeasurable, and the one judgement the author is best placed to
make), that it is **good** (not this tool's business), or that it would **pass a
detector** (refused on principle everywhere in this repo).

`tools/verify.mjs` prints that last paragraph as part of its output, because a
claim the tool declines to make is only reliably absent if it says so.

## Two refusals, and both are features

**A Tier A artifact returns the draft.** Leaked markup, a chatbot preamble, an
identifier failing its own checksum — these are not style observations to weigh
against a band. Handing one back beside a tidy cadence table invites the author
to read the table and skim the problem.

**With no calibrated corpus, no gap is reported.** The draft can still be called
artifact-clean, which needs no corpus. But cadence is not compared against
fallback bands, because those describe a generic register this repo guessed at,
and *"within range"* read as *"within your range"* would be the tool's worst
available lie: confident, personal-sounding, and about nobody.

Which makes the ordering constraint real rather than advisory:
**corpus → calibration → generation.**

## The corpus can include model drafts. Carefully.

A generation can land the voice, and throwing those away wastes the best
available signal about what "right" looks like. But feeding them back is a loop
with a known failure: a model pointed at its own output narrows until it
collapses onto its mode.

`tools/exemplars.mjs` enforces the rules from
[`PROFILES.md`](../prose-tell-scan/PROFILES.md):

- **human keeps the majority, always** — the cap is clamped below 0.5 *in code*,
  because a config that can express "the model is most of my voice" will
  eventually be set that way by someone who stopped thinking about it
- **approved drafts supplement; they never bootstrap** — below ten human samples
  they contribute nothing, or the cold-start path is to fill the folder with
  model output and calibrate against model norms on day one
- **and at the documented default they contribute nothing anyway** — slots are
  `floor(n × cap)`, so at `n=3, cap=0.2` that is `floor(0.6) = 0`. Approved
  drafts earn a slot only on larger exemplar sets. That is the intended
  direction, since the cap is a ceiling rather than a quota, but it means the
  feature is *off* at the invocation the docs recommend. The tool now says so in
  its own output rather than leaving you to do the arithmetic
- **weight scales with how much of the draft is actually you** — a generation
  approved untouched is worth approximately nothing as evidence about a person
- **cadence bands never see them at all** — that firewall is in `prose-tell-scan`

A count cap alone would not be enough, and the number is reassuring in a way it
has not earned: approved generations are less varied than human samples twice
over, since the model already regressed to a mode and you then picked the ones
you liked. Twenty percent of the slots is more than twenty percent of the
influence.

## Install

```bash
/plugin install prose-author@agent-primitives
```

Verification needs `prose-tell-scan` installed alongside. Without it,
`verify.mjs` says the draft was **not scanned** — which is the absence of a
check, not a pass.

## Known limits

- **One passage.** Blank page from notes, mid-document continuation, and voice
  locks are v0.2 / v0.4. Edit ingestion (v0.3) ships now, out of order, because
  it needs nothing this bundle does not already have and is what makes a corpus
  grow usefully rather than stay static. See [`DESIGN.md`](DESIGN.md).
- **`calibrate.mjs` now blends `corpus/approved/` into catalog bands** under
  the same cap `exemplars.mjs` uses. Both human-only and blended ceilings ship
  side by side in `thresholds.derived.json` (`PROFILES.md` rules 2 and 5), and
  a narrowing of any ceiling beyond 20% raises a warning. **Cadence bands
  never see approved samples** — that firewall is absolute (rule 3), because a
  generation whose rhythm was right was right *because* it matched the human
  corpus that set the band. Verified in prose-tell-scan's test suite.
- **`corpus/approved/` is written by `tools/ingest-edit.mjs`.** Given an
  edited draft and the original the drafter produced, it computes
  `edit_fraction` from a word-level LCS diff and writes the pair — the edit
  under `corpus/approved/<yyyy-mm-dd>-<hash>.txt`, the original under
  `.originals/<sha256>.txt`. Three refusals guard it: below 10% edited it
  refuses (an untouched generation is not evidence about you); below the word
  floor it refuses (approved/ never advertises files calibration would exclude);
  a repeat ingest refuses without `--force`.
- **It has no acceptance corpus of its own.** The tools are tested; the *drafting
  prompt* is not, because measuring "did this come out in their voice" needs a
  single author's corpus with provenance discipline, and this repo does not have
  one. `prose-voice-critic` has the same gap for the same reason.

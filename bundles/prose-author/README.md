# prose-author

Scoped generation in a specific person's voice—mapped from **their own writing**,
drafted from that map without corpus access, and checked in **their own measured
terms**.

**v0.2 adds blank-page drafting and preserves the v0.1 passage rewriter; v0.2.1
hardens the overlength correction path.** A
blank-page request starts with a topic, notes, outline, brief, or reply prompt,
not an existing passage. `voice-profile-render` turns a single-author corpus into
a cited `voice-profile/2`; `voice-draft` receives only that profile and the
request. The corpus itself never enters the drafting context.

## What ships

| surface | job |
|---|---|
| `prose-draft` skill | chooses the rewrite or blank-page path and coordinates verification |
| `voice-profile-render` agent | interprets the corpus; deterministic tools own counts, rates, IDs, and provenance |
| `voice-draft` agent | creates new prose from the request and profile, with no tools or corpus access in Claude Code |

The canonical agent prompts live under `primitives/`; the copies under
`bundles/prose-author/agents/` are the downloadable plugin artifacts.

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

## What each path is given

The passage rewriter retains the v0.1 inputs: the passage, the author's voice
card, selected human exemplars, and the register purpose.

The blank-page drafter is intentionally narrower. It receives the writing
request and the assembled profile only. Corpus files are visible to the separate
renderer and independent critic, never to the drafter. This prevents the profile
from becoming decorative and gives the same boundary a chance to survive across
Claude Code, Codex, Cursor, and plain agent harnesses.

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

A fully gated blank-page result also needs `prose-review` for an independent
voice review. The draft may still be returned when either dependency is missing,
but it must be labelled **UNGATED** and name the check that did not run.

Loose-file installation is also supported:

```bash
./install.sh voice-profile-render voice-draft prose-draft
```

## Known limits

- **This is not a factual-accuracy guarantee.** The independent audit makes
  unsupported factual material rejectable or visible, but a model audit can
  miss a bad claim. Verify consequential claims against real sources.
- **This release does not claim resemblance or quality.** Measurements constrain
  behaviors the corpus supports; the author decides whether the result sounds
  like them.
- **The final pre-release evaluation was useful but not perfect.** Six fresh
  profiles validated and 19/20 semantic revisions met every measured band. One
  retained one question beyond its target; the run stopped there before the
  critic phase. v0.2.1 replays that exact immutable failure through a bounded
  residual-prune plan and deterministically reaches 737 words with all
  semantic-bearing counts in range. This targeted canary is not a replacement
  20-draft acceptance run. See [`RELEASE-v0.2.1.md`](RELEASE-v0.2.1.md).
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
- **Evaluation coverage is narrow.** v0.2.0 was exercised on two modern licensed
  authors (Doctorow and EFF's Joe Mullin), not a user's private corpus and not a
  broad range of languages or historical registers.

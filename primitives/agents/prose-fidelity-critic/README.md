# prose-fidelity-critic

Read-only critic that answers one question: **did this revision keep what it had
to?** Judged against the original and a deterministic scan of it.

Output contract: `FAITHFUL` / `MATERIAL-LOSS`. Bundle: `prose-review`.

Not whether the revision reads better. Not whether it still sounds like the
author — `prose-voice-critic` owns that and runs on the revision separately.

## Why this exists

Over-editing is the primary failure mode of any rewriter. A reviser that sands
off a qualification, flattens a hedge, or trades "1965" for "the mid-sixties"
has made the prose smoother and the piece less true, and it reports success
either way.

The losses that actually survive review are not the obvious ones. A deleted
paragraph gets noticed. What gets through is `may have been` becoming `was`,
`for the most part` quietly disappearing, an attribution dropped so an opinion
reads as fact. Every word involved is still on the page, so nothing looks
missing.

And by the time anyone thinks to check, the original is often gone. That is why
[`DESIGN.md`](../../../bundles/prose-review/DESIGN.md) lands this critic
**before** the reviser it guards: a guard added afterwards is a guard shaped by
whatever the reviser already does.

## Why a separate agent

**It must not be the reviser.** A critic that performed the revision will
remember what it meant to preserve rather than checking what it did. This is the
sharpest case of the bundle's context-isolation rule, not an instance of it.

**It splits with a script, not within itself.**
[`fidelity-scan.mjs`](../../../bundles/prose-review/tools/fidelity-scan.mjs)
does the counting; the critic does the consequence. The tool's own docstring
names the failure this prevents: a model "sees" a number in the revision because
the sentence around it sounds right. A string comparison does not.

So the critic is **forbidden to claim a flagged atom is present.** If it thinks
the scan is wrong it files that under *Scanner defects*, as a bug report, and
may not fold it into a fidelity finding.

## What it does

| # | Looks for | The rule |
|---|---|---|
| 1 | Flagged atoms genuinely gone | Can the reader recover the information from the revision? A second mention shortened to "the university" loses nothing; a year traded for a decade does. |
| 2 | Claim drift the scan cannot see | Polarity reversed, hedge removed, claim strengthened, attribution dropped. Every word still on the page. |
| 3 | Dropped qualifications and scope limits | *in most cases*, *before 1890*, *here*. Removing one broadens a claim silently. |
| 4 | Edits outside the plan | A change not traceable to a plan entry, **even when the change is good.** |
| 5 | Structural loss wearing a rename | A dropped heading is informational if it is a retitling, material if the section went with it. |

Then it must **account for every flagged atom**: anything the scan raised and
the critic did not is listed under *Immaterial losses* with a reason, one line
each. Returning `FAITHFUL` over a list nobody read is the failure this critic
exists to prevent, and a group waved through as "the rest are fine" is
indistinguishable from not having looked.

## The error preference, which is the opposite of its sibling's

`prose-voice-critic` resolves uncertainty to **silence**, because wrongly telling
authors their voice is off teaches them to write blandly and cannot be taken
back. That is right, and it is wrong here.

Fidelity has ground truth: the original is sitting right there, and every finding
is checkable by anyone. A wrong finding costs the author ten seconds and a glance
at two quoted lines. A **missed** loss ships. So uncertainty resolves toward
`MATERIAL-LOSS`, and the adversarial framing this repo's convention asks for
applies normally — *assume the revision dropped something and find it* is a
question with an answer.

Both critics are in one bundle and point opposite ways on this. That is
deliberate, and both directions are recorded in their `meta.yaml`.

## When to run it

After any rewrite and before accepting one. It needs the pre-revision text:
`git show` where the file is tracked, a copy the orchestrator made where it is
not. **With no original it stops** — fidelity is a comparison, and judging the
revision on its own terms is a different critic's job.

Run `fidelity-scan` first. The protocol gives the critic the scan output; a critic
that has to estimate presence will.

## Reading the output

`MATERIAL-LOSS` says **information was lost, not that the revision is bad.** A
revision that dropped one date earns it, correctly. The verdict is an input to
the author's decision, not a rejection — though in the reviser pipeline it is
load-bearing: `DESIGN.md` has `MATERIAL-LOSS` fail the run and restore the
original.

Every finding quotes the original span **and** what stands in its place. One
that does not is a guess, and the prompt requires it dropped.

*Immaterial losses* is not filler. It is the evidence that the flagged list was
read to the end, and it is where a hurried critic's corners show.

## Known limits

**It inherits every blind spot of the scan, and the scan still has several.**
These are the tool's limits rather than the critic's, but they bound what a
`FAITHFUL` means. Four of the five the first acceptance run surfaced were closed
in S4; the scan now prints its own coverage on every pair, so a critic can no
longer read "none material-missing" as "nothing was lost".

Still open, and the first is a deliberate decision rather than a bug:

- **Single-word named entities are never extracted.** Dropping *Suvorin*,
  *Levitan*, *Fourmis* or *Salon* produces no flag at all. This is a decision,
  not an oversight, and it was made by measuring the alternative rather than by
  arguing: the permissive rule's candidate list is roughly half ordinary
  capitalised English, and because the critic is told the scan is
  **authoritative on presence**, a half-noise list does not cost a little
  precision — it makes the authority claim false and pushes work into
  `contradicts_scan`, the count that blocks the primitive. The measurement is an
  executable assertion rather than a sentence anywhere, including this one:
  `tests/single-word-survey.mjs` enumerates and `tests/selftest.mjs` asserts.
- **Multi-word entities with two function words inside them are not extracted
  either** — *Church of the Embassy* matches nothing, because the run pattern
  allows only one *of*/*the* between capitalised words. Found by a critic on the
  S4 run; not disclosed by the coverage note, which names only the single-word
  gap.
- **Word-form numbers are invisible.** *thirteen* → *young* and *two or three
  years* → *some time* are numeric losses the scan does not look for. Disclosed.
- **The headline still reads `fidelity: FAITHFUL`** over a check that only
  compared atoms. Two critics on the S4 run said independently that a
  presence-check result is printed as a fidelity verdict, and the coverage note
  beneath it cannot undo the word at the top.

Closed in S4: line-wrap-sensitive presence checks, quotes containing a newline,
non-ASCII letters in names (*Augustus Cæsar* was never extracted at all), and a
report that pronounced heading changes informational on documents with no
headings.

The critic caught losses in every one of these categories by reading, which is
the argument for it existing. It is also why *Scanner defects* is a required
section: the run is the tool's bug report, and it is where all four of the still-
open items above came from.

**Its flag rate on faithful revisions rose when the scan started disclosing its
own coverage.** Measured, not inferred: three negatives were run three times
against the pre-S4 scan report and three times against the post-S4 one, same day,
same runner, same model — 1 of 9 draws flagged before, 6 of 9 after, every new
flag a claim-drift finding about phrasing. The note tells the critic where the
scan is blind and the critic goes there. Whether that is the price of an honest
coverage statement or over-steering is open; the evidence is in
[`runs/2026-08-05-fidelity-s4-complete.md`](../../../bundles/prose-review/tests/runs/2026-08-05-fidelity-s4-complete.md).

**It cannot tell an intended cut from an accidental one without a plan.** Asked
to halve a piece, a reviser must drop material, and this critic will report what
it dropped. That is the correct behaviour and it is not the same as a judgement.
Supply the edit plan and item 4 becomes checkable; without one, the critic says
so rather than clearing the revision on that ground.

**It has been measured on synthesised revisions, not on a real reviser's
output.** Ground truth exists because the revisions were built with a known
answer. That is a genuine advantage over the voice critic's harness — but the
losses a real reviser produces may not resemble the losses a person writes on
purpose, and nothing here bounds that.

**It is strict about descriptors attached to named entities, and this produced
the harness's most durable false positive.** Handed *"travelled to the Island of
Sahalin"* → *"travelled to Sahalin"*, it returned `MATERIAL-LOSS`: a reader who
does not know the geography loses that the penal colony was offshore. Reasonable
people differ, and the fixture expecting `FAITHFUL` was **not** corrected to
match. Six draws later — three against each scanner version — it has returned
`MATERIAL-LOSS` every time, so this is settled behaviour rather than a wobble.
Expect it on real revisions: it is the tie-break rule working as specified, and
on a borderline that rule always resolves toward `MATERIAL-LOSS`.

**Its verdicts are not deterministic, and every published figure is a small
number of draws.** Byte-identical prompts have returned different verdicts on the
same pair; on the S4 run two of six negatives split 2–1 and 1–2 across three
draws each. Nothing in the tooling averages this away. Read any single-draw
number as an observation, not a rate — the run logs mark which fixtures were
drawn more than once, and only those carry an agreement count.

**One fixture's expected verdict was wrong, and the critic found it.** Recorded
in [`fixtures.json`](../../../bundles/prose-review/tests/fixtures/fidelity/fixtures.json)
rather than quietly corrected. A score that includes an answer the run itself
supplied is quoted with that caveat attached, and
[`verify-run.mjs`](../../../bundles/prose-review/tests/verify-run.mjs) prints
the caveat so it cannot fall out of a summary. Exactly one fixture was corrected
this way; the next disagreement was carried as a false positive instead, because
a second correction in the same direction would make the expectations
unfalsifiable.

**It says nothing about voice.** A revision can preserve every fact and every
qualification and still not sound like the author. That is
`prose-voice-critic`'s question, and the two run separately on purpose — the
`DESIGN.md` scope table was corrected to say so, because an earlier draft gave
"voice loss" to both.

Current numbers and their caveats live in
[`tests/critic-harness.md`](../../../bundles/prose-review/tests/critic-harness.md)
and the run logs beside it — not here, because they change and this does not.

## Install

```bash
./install.sh prose-fidelity-critic       # → ~/.claude/agents/
./install.sh --project prose-fidelity-critic
```

Or install the whole bundle: `/plugin install prose-review@agent-primitives`.

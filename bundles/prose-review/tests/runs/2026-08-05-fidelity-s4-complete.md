# 2026-08-05 (S4) — prose-fidelity-critic, full sweep after the scanner fix

Thirteen fixtures, one prompt version, each critic run in a fresh context with the
original, the revision, and `fidelity-scan`'s output — and nothing else.
Transcripts in [`2026-08-05-fidelity-s4/`](2026-08-05-fidelity-s4/).

**This is a fresh baseline, not a delta.** It supersedes
[`2026-08-05-fidelity-complete.md`](2026-08-05-fidelity-complete.md) as the
current measurement of `prose-fidelity-critic`, and it deliberately does not
claim an improvement or a regression against it. The reason is in *Why no delta*,
below, and it is the main thing this log is for.

Every figure below is the output of
`node tests/verify-run.mjs runs/2026-08-05-fidelity-s4`, quoted rather than
retyped:

```
  tests/runs/2026-08-05-fidelity-s4 — 13 transcripts

    negative (faithful revisions, n=6):     4 MATERIAL-LOSS, 2 FAITHFUL
    positive (lossy revisions, n=7):        7 MATERIAL-LOSS, 0 FAITHFUL
    findings not quoting both original and revision: 0   <- must be 0
    claims an atom is present that the scan flagged: 0   <- must be 0

    verdicts matching the fixture's expected verdict:  9 of 13
    losses the scan flagged and the critic cleared:    1
    losses the scan missed and the critic caught:      6
    verdicts identical to fidelity-scan's (echo rate): 6 of 13

    1 fixture(s) whose expected verdict was CORRECTED after this run:
      p-death-severus-unnamed: expected FAITHFUL when run, now MATERIAL-LOSS
      Read fixtures.json's correction_note before quoting the score above.
```

**The last block is a false alarm on this run** and the mechanism is recorded in
the [directory README](2026-08-05-fidelity-s4/README.md#a-caveat-verify-runmjs-prints-that-does-not-apply-to-this-run):
`verify-run.mjs` prints the caveat whenever a fixture carries
`corrected_after_run`, without checking that the named run is the run being
verified. The correction predates this run. Left unfixed here because
`verify-run.mjs` belongs to another track.

---

## Why no delta

The previous run reported `1 MATERIAL-LOSS / 6` on negatives. This one reports
`4 / 6`. **Three things differ between the two runs, and only one of them is the
scanner.**

1. **The scanner changed.** Five defects closed (P3 a–e), which alters the scan
   report every critic reads — both the flagged list and a new coverage block.
2. **The dispatcher changed.** The old run was thirteen subagents dispatched by
   hand from an interactive session. This one is `run-harness.mjs dispatch`
   shelling out to `claude -p`. Same model family (`claude-opus-5[1m]`, asked
   directly), different harness, different surrounding context.
3. **The critic is not deterministic.** P12: two dispatches of a byte-identical
   prompt on `n-tihonov-reordered` returned different verdicts. Both published
   runs are one draw per fixture.

`1 of 6 → 4 of 6` is therefore not attributable, and quoting it as an effect of
the scanner fix would be exactly the kind of number this repo keeps a calibration
log about. So the comparison is not made.

## What *is* attributable, because it was measured

The four negatives that came back `MATERIAL-LOSS` were each run **three times
against the new scan report and three times against the pre-S4 scan report**, on
the same day, through the same runner, with the same model, with prompts that
differ only in the `fidelity-scan` block. That holds the dispatcher fixed and
exposes the variance directly.

| fixture | pre-S4 report | post-S4 report | reading |
|---|---|---|---|
| `n-rossolimo-island-dropped` | ML, ML, ML | ML, ML, ML | unanimous both sides. The known carried false positive is **not** a variance artifact and **not** an effect of the fix |
| `n-beauty-modernised` | ML, **F**, **F** | ML, ML, ML | flips from mostly-clear to unanimous flag |
| `n-rossolimo-tightened` | F, F, F | ML, **F**, ML | flips from unanimous clear to a 2–1 split |
| `n-tihonov-reordered` | F, F, F | ML, **F**, **F** | flips from unanimous clear to a 1–2 split |

Aggregated over the three fixtures whose behaviour moved: **1 of 9 draws flagged
under the old report, 6 of 9 under the new one.**

**So the change to the scan report raises the critic's flag rate on faithful
revisions.** That is a real, controlled result and it is not the direction anyone
wanted.

**And two draws is not three, and three is not many.** Nine draws per arm across
three fixtures is enough to see a shift and nowhere near enough to size it. The
control arm's own `n-beauty-modernised` column (ML, F, F) is a reminder that a
single draw on that fixture could have said anything.

### The most likely mechanism, stated as a hypothesis

The fix bundled two things into one block: the corrected flag list, and a new
**coverage note** naming what the scan cannot see — *"any fact carried by
phrasing rather than by a token — a hedge, a scope limit, a polarity."*

Every new `MATERIAL-LOSS` on a negative is a `claim-drift` finding about
phrasing:

- `n-beauty-modernised`: *"virtue is best in a body"* → *"virtue shows best in a
  body"* — quality becomes visibility.
- `n-rossolimo-tightened`: *"had, early in the eighties, acquired"* → *"by early
  in the eighties had acquired"* — a date becomes a deadline.
- `n-tihonov-reordered`: *"long ago been translated by the Germans"* → *"the
  Germans got to me long ago"* — a publication fact becomes an encounter.

None of these is invented and each is defensible on its face. The note tells the
critic where the scan is blind; the critic goes there. **The experiment cannot
separate "the flag list changed" from "the note was added"** — they shipped in
one block and were varied as one block. Saying which requires a third arm and it
was not run.

**Nothing was tuned in response to this.** The note is honest and its removal
would restore a report that pronounces "none material-missing" over a revision
that reversed a polarity. Softening it to recover a number would be tuning the
input after reading the output. The finding is published instead, and the open
question is handed on: *is a 4-of-6 negative rate the price of an honest coverage
statement, or is the note over-steering?*

## What the positive result shows

`7 of 7`, unchanged, and it is still a true-positive rate rather than a proxy —
the revisions were built with known losses. Three of the seven are pairs where
`fidelity-scan` returns FAITHFUL and the revision is materially unfaithful.

The scan-missed count rose from 3 to 6, because `n-beauty-modernised` moved to
class A and three negatives were flagged on losses the scan cannot see. That
number is a count of disagreements, not of correct catches, and on this run three
of the six are disagreements the fixture author calls wrong.

## The echo baseline moved, and the reason is worth more than the number

An echo of the scanner now scores **8 of 13** against the fixtures, up from 7,
because `n-beauty-modernised` changed class. **Nothing about that revision
changed — only the tool did.**

It had been class B, "the scanner over-flags and the critic clears it", on a
flagged atom that was a scanner artifact: `Edward the Fourth` is present in the
revision but wrapped across a line, and the presence check was literal. That was
P3(a). With P3(a) fixed the over-flag does not exist, and the pair is class A.

**A fixture's class is a property of the pair *and the scanner*, not of the
revision.** A class-B fixture whose over-flag is a tool bug has an expiry date,
and this one reached it. Recorded in `fixtures.json` under
`reclassification_note` so the next reader does not have to re-derive it.

Class distribution is now `A=4 B=2 C=4 D=3` (`selftest.mjs` prints it). Class B
is at its floor of two. **The next scanner fix that clears an over-flag empties
it**, and the argument the harness makes about the critic goes with it. That is a
live constraint on S5, not a note.

## What the run says about the scanner, which was not the point of the run

Three defects came back that are not in P3, all from the transcripts' *Scanner
defects* sections, all checked by hand before being written down here:

1. **`Church of the Embassy` is never extracted** (`p-sister-fourmis-cut`).
   `PROPER_NOUN_RUN` allows *one* function word between capitalised words, so a
   run with two — *of the* — does not match. This is a multi-word entity, so it
   is not covered by the single-word limit the report discloses. Real gap, not
   disclosed anywhere.
2. **The headline `fidelity: FAITHFUL` overstates what was checked**, raised
   independently by two critics on class-D pairs. Their point is that a label
   derived from an atom-presence check is printed as a fidelity verdict, and the
   coverage note under it cannot undo the word at the top. One suggested
   `atoms: all present`. This is the same defect as P3(e), one level up, and the
   `renderReport` fix did not go far enough.
3. **`Jam Tiberium` is extracted as a named entity** — the opening words of a
   Latin quotation, which duplicates the quote atom's loss as an entity loss.

**None is fixed here**, and the reason is the same one the previous log gives:
fixing the scanner inside the run that measures it changes the baseline the
measurement was made against. (2) in particular would change the top line of
every prompt.

**And a caveat on the defect reports.** One transcript guessed `"Nunc dimittis"`
was missed for positional reasons; the real cause is the ≥3-word minimum, which
the report does not disclose. The observations in these sections are reliable,
the mechanisms are not. Treat them as a list of things to go and check.

## What this harness still cannot do

**The revisions are synthesised.** Known losses are what make the true-positive
rate real, and also make them a fixture author's idea of what a reviser does
wrong. `prose-reviser` does not exist yet to supply real ones.

**Six negatives is a small denominator**, and four of them are now flagged. That
is not a calibrated false-positive rate; it is six observations, three of which
are disagreements about phrasing that a reasonable reader could go either way on.

**No edit plan was supplied to any case**, so priority item 4 — edits outside the
plan — has still never fired.

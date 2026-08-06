# 2026-08-05 — prose-fidelity-critic, full sweep

> **SUPERSEDED as the current measurement, and kept as evidence.** This run was
> made against `fidelity-scan` *before* the five P3 defects were closed, so the
> scan report every critic here read no longer exists. The current baseline is
> [`2026-08-05-fidelity-s4-complete.md`](2026-08-05-fidelity-s4-complete.md).
>
> **Do not diff the two runs.** The scanner, the dispatcher and the draw all
> differ; the S4 log says why, and runs a controlled experiment instead.
>
> Two figures below are now stale by construction rather than by error. The echo
> baseline moved from 7 of 13 to 8 of 13, and `n-beauty-modernised` moved from
> class B to class A — because its "over-flag" was P3(a), a line-wrap artifact in
> the presence check, and P3(a) is fixed. Its revision was never touched.

Thirteen fixtures, one prompt version, each critic run in a fresh context with
access to the original, the revision, and `fidelity-scan`'s output — and nothing
else. Transcripts in [`2026-08-05-fidelity/`](2026-08-05-fidelity/).

Every figure below is the output of
`node tests/verify-run.mjs runs/2026-08-05-fidelity`, quoted rather than retyped:

```
  bundles/prose-review/tests/runs/2026-08-05-fidelity — 13 transcripts

    negative (faithful revisions, n=6):     1 MATERIAL-LOSS, 5 FAITHFUL
    positive (lossy revisions, n=7):        7 MATERIAL-LOSS, 0 FAITHFUL
    findings not quoting both original and revision: 0   <- must be 0
    claims an atom is present that the scan flagged: 0   <- must be 0

    verdicts matching the fixture's expected verdict:  12 of 13
    losses the scan flagged and the critic cleared:    2
    losses the scan missed and the critic caught:      3
    verdicts identical to fidelity-scan's (echo rate): 8 of 13

    1 fixture(s) whose expected verdict was CORRECTED after this run:
      p-death-severus-unnamed: expected FAITHFUL when run, now MATERIAL-LOSS
      Read fixtures.json's correction_note before quoting the score above.
```

**One false positive, and it is deliberately still counted as one.** See
*The fixture that was not corrected*, below. The negative rate is 1 of 6, not
0 of 5, and the difference between those two numbers is the whole subject of
this log.

---

## Read the last block before quoting the first

**One fixture's expected verdict was wrong, and the critic is what found it.**

`p-death-severus-unnamed` was authored as `n-death-honorifics`: a negative,
class B, expecting `FAITHFUL`. The revision drops two honorifics — *Augustus
Cæsar* → *Augustus* and *Septimus Severus* → *Severus* — and the fixture note
asserted that "both emperors remain identified."

The critic returned `MATERIAL-LOSS` on the second, and gave a reason that is
checkable and correct:

> "Severus" alone does not distinguish Septimius Severus from Alexander Severus
> or Libius Severus, all emperors; the original named one, the revision names a
> family. In a list whose whole point is attributing specific dying words to
> specific men, the reader can no longer attribute this one.

It also, in the same report, cleared the *Augustus* drop as immaterial and filed
the scan's failure to flag it under *Scanner defects* rather than as a finding.
So it made the distinction the fixture author did not, in both directions, in one
pass.

The fixture was corrected and renamed. **The transcript is unedited** — read it
and judge the correction rather than taking this paragraph's word for it. And the
score above is therefore 12 of 12 against a set that includes one answer this run
supplied; `verify-run.mjs` prints that caveat itself so it cannot fall out of a
summary the way the figures in `CALIBRATION.md` did ten times.

Against the fixtures **as first authored**, the result was 11 of 12.

## The fixture that was not corrected

`p-death-severus-unnamed` was corrected because the critic disagreed. The
obvious question is whether *any* fixture would survive disagreement, and the
honest answer had to be produced rather than asserted.

`n-rossolimo-island-dropped` was authored afterwards as a class-B negative:
"travelled to the Island of Sahalin" → "travelled to Sahalin", nothing else
changed. The reasoning was that Sahalin is still named, is an island either way,
and that Chekhov's own Tihonov letter in this same fixture set writes "a journey
to Sahalin".

The critic returned `MATERIAL-LOSS`, arguing that a reader who does not know the
geography loses the fact that the penal colony was offshore.

**The expectation was left alone.** That is arguable, and so is the fixture, and
that is precisely why it stands: one correction on an externally checkable point
of Roman nomenclature is a correction; a second on a judgement call, in the same
direction, would make "the fixture was wrong" unfalsifiable. So the harness
carries a false positive and the negative rate pays for it.

**What it bought, which a clean sweep could not.** Two things worth more than the
point of score they cost:

1. **The critic is strict about descriptors attached to named entities.** Anyone
   running it on real revisions should expect this, and nothing else in the run
   would have shown it.
2. **A class-B fixture must be an *unarguable* over-flag.** The prompt's
   tie-break rule — *"when you cannot tell whether a loss matters, it matters"* —
   predates every fixture here and means borderlines resolve to `MATERIAL-LOSS`
   *by design*. So a borderline authored as class B is a fixture testing against
   the spec, not against the critic. That constraint was not obvious until a
   fixture violated it.

## What the negative result shows

Five clean of six faithful revisions, three of which the scanner flagged.
The reordered Chekhov letter, the tightened Rossolimo letter and the condensed
Paris letter came back clean, and in each case the critic listed the
qualifications it had checked rather than asserting they survived — which is what
makes the silence readable.

The class-B cases are the ones worth reading. `n-tihonov-moscow-university`
cleared "University of Moscow" → "Moscow University" and showed the institution
still named in the same clause. `n-beauty-modernised` was handed a scanner
artifact and did not take the bait. `n-rossolimo-island-dropped` is the one it
failed.

**A caveat on the denominator.** Six negatives is small — the voice harness ran
twelve — and one of the six is a case the author considers arguable. Do not read
5 of 6 as a calibrated false-positive rate. It is an observation with a wide
interval and a named disagreement inside it.

## What the positive result shows, and it is stronger than the voice critic's

The voice harness could only bound a false-positive rate, because voice has no
ground truth. **Fidelity does.** The revisions were built with known losses, so
`7 of 7` is a true-positive rate and not a proxy for one.

Three of those seven are cases where `fidelity-scan` returns `FAITHFUL` and the
revision is materially unfaithful — hedges removed, a polarity reversed, a lower
bound turned into an exact count, a casualty parenthetical deleted. A tool that
only ran the scan would have passed all three.

**The echo baseline is the number to compare against.** A critic that simply
repeated the scanner's verdict scores 8 of 13 here. This one scored 12, and
disagreed in both directions: two over-flags cleared, three blind spots caught.

## What the run says about the scanner, which was not the point of the run

Every transcript's *Scanner defects* section is a bug report, and four defects
came back consistently. None of them is a defect in the critic:

1. **Single-word named entities are never extracted.** `p-sister-fourmis-cut`
   drops *Suvorin*, *Levitan*, *Fourmis*, *Salon* and *Church of the Embassy*;
   the scan flags one atom. Six of that transcript's seven findings came from
   reading.
2. **The presence check is line-wrap sensitive while extraction is not.**
   `n-beauty-modernised` was flagged for an entity that is present but wrapped.
   The critic's diagnosis — that the check matches without collapsing whitespace,
   so the false-positive rate is a function of line width — is right, and is the
   clearest statement of it anyone has written down.
3. **Quotations containing a newline are not extracted at all.** Of ten quoted
   spans in `bacon-of-death53.txt`, the scan sees four. On hard-wrapped prose
   this is the common case.
4. **Word-form numbers are invisible.** *thirteen* → *young*, *two or three
   years* → *some time*.

None is fixed here. Fixing the scanner in the commit that ships the critic would
mean changing the baseline the critic was measured against, and the four are
recorded as follow-up work instead.

**A caveat on the defect reports themselves.** Twice a critic inferred a
*mechanism* and got it wrong while the observation was right — one guessed the
scan does "substring or leading-token matching" when the real cause is that
`Cæsar` fails the extractor's `[a-z]+`, and one described a stripped "more than"
as an atom that passed when there was never a digit atom there at all. The
observations are sound and the explanations are not evidence. Treat *Scanner
defects* as a list of things to go and check.

## What this harness cannot do

**The revisions are synthesised.** They were written to contain known losses,
which is what makes the true-positive rate real — and also means the losses are a
fixture author's idea of what a reviser does wrong. Nothing here bounds behaviour
on a real reviser's output, and `prose-reviser` does not exist yet to supply any.

**Six negatives is a small denominator**, and the voice harness ran twelve.
Whatever 5 of 6 is, it is not a calibrated false-positive rate.

**No edit plan was supplied to any case**, so priority item 4 — edits outside the
plan — is untested. Every transcript says so rather than clearing the revision on
that ground, which is the behaviour the prompt asks for, but the item itself has
never fired.

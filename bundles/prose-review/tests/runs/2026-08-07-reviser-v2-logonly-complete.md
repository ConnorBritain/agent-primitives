# 2026-08-07 reviser v2 (log-only) acceptance run — outcome

**Status: ship bar NOT MET. Hold remains.**

## What ran

- 8 reviser dispatches under the log-only contract adopted 2026-08-07
  (`primitives/agents/prose-reviser/agent.md` sha256 `0a9e94b3939a`).
- 24 fidelity-critic dispatches (k=3 per fixture) against the reconstructed
  revisions.
- Runs:
  - `bundles/prose-review/tests/runs/2026-08-07-reviser-v2-logonly/`
  - `bundles/prose-review/tests/runs/2026-08-07-reviser-v2-logonly-gate/`

## What the log-only redesign proved

- **Content filter sidestepped, definitively.** All 8 reviser dispatches
  returned parseable log-only output. The 4 fixtures the previous v1 run had
  lost to the assistant post-processing filter (`f02`, `f03`, `f05`, `f07` on
  the Chekhov Paris / Rossolimo letters) all produced clean change logs this
  time. The redesign works: the reviser never reproduces the source, and the
  filter has nothing to trip on.
- **Out-of-plan edits impossible by construction.** The harness's apply step
  refused 0 edits: 8 of 8 change logs applied cleanly, every `before` inside
  its authorising `location.quote`. The old contract detected out-of-plan
  edits post-hoc; the new contract cannot express them.

## The verdicts

| fixture | expected | k=3 majority | pass? |
|---|---|---|---|
| f01-word-swap-tihonov            | FAITHFUL      | 3/3 FAITHFUL      | ✓ |
| f02-cut-marker-sister            | FAITHFUL      | 3/3 MATERIAL-LOSS | ✗ |
| f03-hedge-rephrase-rossolimo     | FAITHFUL      | 2/3 MATERIAL-LOSS | ✗ |
| f04-multi-entry-tihonov          | FAITHFUL      | 3/3 FAITHFUL      | ✓ |
| f05-cut-restatement-sister       | FAITHFUL      | 3/3 MATERIAL-LOSS | ✗ |
| f06-refuse-quote-drift           | FAITHFUL (refused) | 3/3 FAITHFUL | ✓ |
| f07-refuse-ambiguous             | FAITHFUL (refused) | 3/3 FAITHFUL | ✓ |
| f08-aggressive-drop-date         | MATERIAL-LOSS | 3/3 MATERIAL-LOSS | ✓ (safety net) |

**Non-safety-net FAITHFUL count: 5 of 7. Ship bar required ≥ 6 of 7. Miss by one.**

Safety-net fixture `f08` behaved exactly as pre-registered.

## Why the three fixtures failed, in one sentence each

The reviser applied each plan entry faithfully; the fidelity critic caught
whole-sentence excisions that the fixture plans authorised but that carry
sensory or biographical content the critic considers material.

- `f02`: plan authorised cutting `"There is no describing Paris, though; I
  will put off the description of it till I get home."` — critic reads it as
  a deferral the letter's closing pays off, and loses that reading when cut.
- `f03`: plan authorised rephrasing `"In 1888 I took the Pushkin prize."` to
  `"The Pushkin prize came in 1888."` — critic reads it as claim-drift
  (agent → patient), Chekhov no longer the one who took the prize.
- `f05`: plan authorised cutting `"Noise, hubbub."` as a two-word restatement
  — critic reads the two words as an auditory dimension not restated by
  `"swarming and surging"` (visual) or `"pavements are filled with little
  tables"` (spatial).

Reasonable people can disagree with all three calls. That is what SPLITs are
for and this run has one (f03: 2 MATERIAL-LOSS, 1 FAITHFUL). But the ship
bar is written to be a bar, not a negotiation, and the bar is a majority
verdict per fixture; f02 and f05 are unanimous MATERIAL-LOSS.

## What this outcome means

**The failure is in the plan fixtures, not in the reviser.** The reviser did
what it was told; the critic caught what the plans authorised. The pipeline
is behaving as designed — a plan that authorises a material loss WILL produce
a revision that fails the gate, which is the point.

**The reviser's own contract has held.** No out-of-plan edits (harness apply
refused 0). No source reproduction (all 8 returned log-only output). Refuse
cases refused correctly (f06, f07). Safety net caught f08.

**The hold does not lift on this run.** Moving the bar post-hoc, or rewriting
the plans until they clear the gate, would be reward-hacking. The bar was
pre-registered precisely against that failure mode.

## What comes next (not on this ticket)

Two paths, both proper work:

1. **Author less-aggressive plans for f02, f03, f05** (deliberately test that
   the reviser plus a well-authored plan can clear the gate). This is a plan
   fixture change, not a reviser change; it must be committed as such and
   re-run under a fresh pre-registered bar.
2. **Accept that these three fixtures encode a genuine authorship disagreement
   and re-scope the bar.** If f02/f05 are the kind of cut a reasonable author
   might make and the fidelity critic's job is to surface them, then the bar
   itself needs revisiting — but that is a change to the ship criterion, not
   to the primitive. Requires an explicit sampling-policy amendment.

Neither is this ticket. This ticket reports the outcome.

## Artefacts

- Reviser change logs: `runs/2026-08-07-reviser-v2-logonly/raw/`
- Reconstructed revisions: `runs/2026-08-07-reviser-v2-logonly/fidelity-fixtures/*/revision.md`
- Fidelity critic verdicts: `runs/2026-08-07-reviser-v2-logonly-gate/raw/`
- Manifests: `MANIFEST.json` in both run directories

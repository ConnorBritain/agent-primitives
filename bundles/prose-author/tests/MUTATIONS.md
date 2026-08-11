# Mutation results

`AGENTS.md` requires the negative test: break a guard, confirm a test fails,
restore. A guard with no failing mutation is decoration.

**This table is generated. Do not edit it by hand.**

```bash
node tests/mutations.mjs            # verify every row against a real run
node tests/mutations.mjs --update   # rewrite it from the runs
```

| mutation | tests failed | what it guards |
|---|---|---|
| stop noticing dominance claims | 2 | a profile calling a habit the engine of a voice must state the rate that backs it |
| accept a profile that states no frequency at all | 1 | a count without a rate cannot tell a drafter how often to use a habit |
| stop recognising placeholder hosts | 3 | an invented citation is caught before it reaches a reader |
| block degradation on any mean rise | 3 | a k=3 noise tick-up does not refuse a good revision |
| stop noticing a fallen verdict | 1 | a revision that drops the verdict is refused |
| treat a split CLEAN as converged | 2 | a split is surfaced, not read as the half that suits the loop |
| resolve a verdict tie to the better verdict | 1 | a coin-flip tie is not evidence of clean |
| drop the attributable-length floor | 1 | a two-letter edit cannot be blamed for an unrelated finding |
| blame edits for text that was already there | 1 | only text an edit INTRODUCED can have caused a finding |
| remove the cap clamp | 2 | human keeps the majority of exemplar slots |
| cold start reports a gap | 4 | no cadence comparison without a calibrated corpus |
| Tier A treated as a normal finding | 6 | an artifact returns the draft instead of being reported |
| drop the attestation requirement | 4 | unattested text cannot become the definition of human |
| stop excluding READMEs | 2 | scaffolding is never a writing sample |
| lose the loose-file scanner candidate | 1 | verification works under the install shape install.sh produces |
| rename readProvenance in calibrate.mjs (sibling present) | 1 | the port is pinned against a sibling that CHANGED, not just absent |
| drop .markdown/.mdx from the ported extension set | 2 | calibration and drafting agree on what counts as a sample |
| change the word floor on one side only | 1 | the ported floor equals the sibling's |
| let a trivial edit through ingest | 2 | voice does not collapse by accepting the model's near-verbatim output |
| let a sub-minimum sample into approved/ | 1 | approved/ never advertises files calibration would exclude |
| let --verify skip the recompute and trust the stored ef | 1 | --verify actually re-derives ef rather than restating what the file says |
| reintroduce the model: unknown sentinel | 1 | the frontmatter never claims an unknown model that would pollute filtering |
| let calibrate skip the aggregate cap on approved samples | 2 | approved samples cannot dominate the blended pool past the cap |
| let calibrate blend approved samples below the human floor | 2 | cold-start cannot calibrate against model norms on day one |
| let fidelity-scan pass a MATERIAL-LOSS as FAITHFUL | 11 | the verdict actually distinguishes fidelity states |
| let fidelity-scan cross line breaks with proper-noun runs | 4 | proper-noun runs stay within a line - a headings-plus-sentence false positive fires on every structured document |
| let fidelity-scan skip thousands-separator normalisation | 1 | 1,234 and 1234 read as the same information, so users are not trained to game the formatter |
| read the narrowing warning from the wrong field path | 2 | the voice-collapse warning reaches the person it is about |
| let tell-scan ignore the blended bands | 3 | an approved edit actually changes what the scanner reports |
| trust edit_fraction as a signed number rather than computing it | 3 | edit_fraction is computed from a diff, never asserted |
| let an open suffix swallow coinages in the profanity pattern | 2 | a coined term built on a rude root is not counted as the habit it resembles |
| measure rates over the whole file instead of the essay body | 5 | site boilerplate is excluded from a rate the profile will quote |
| let a ratio breach alone become a verdict | 1 | one extra instance in a short draft is not reported as caricature |
| accept a non-integer occurrence count | 1 | a count is a count of instances, not an estimate the renderer interpolated |
| let a stated rate disagree with its own count | 1 | a rate is arithmetic on the corpus, not a number the renderer liked |
| accept a count smaller than the number of samples supporting it | 2 | a habit found in ten samples has at least ten instances |
| stop comparing the frequency phrase against the counted rate | 1 | the phrase a drafter reads and the number a harness reads agree |
| scan the corpus directly instead of delegating to the drafter's reader | 2 | rates are measured over the same attested samples the drafter is shown |
| measure an undelimited corpus without saying so | 1 | a corpus measured whole cannot report itself as cleanly delimited |
| let the solidarity pattern match inside longer words | 1 | the habit five drafts are deficient in is not inflated by substring hits |
| stop guarding the corpus's measured rates against leaking into a prompt | 1 | a renderer is not handed the number it is being asked to derive |
| stop deriving author tokens from corpus frontmatter | 1 | a prompt naming an author by any part of their name is caught, not just the surname |
| let a not-author-named exemption go stale | 1 | an exemption that no longer matches a fixture cannot silently disable a check |

Baseline is 0 failed. Every mutation is applied to the real source, measured, and
reverted; the runner refuses to report anything if the baseline is not green or
the tree is not restored afterwards.

## Why this is a script

The table used to be maintained by hand, and it went stale **one commit after it
was created**. A cross-implementation check was added that *also* fires when the
README filter is removed, so a row that correctly said `1` silently became `2`.
The commit re-ran the row it was adding and not the rows it was invalidating.

That is nine-going-on-ten instances of the one failure
[`CALIBRATION.md`](../../prose-tell-scan/CALIBRATION.md) keeps logging: a number
that was true when written and untrue when read. The fix is the same every time
and it is not "be more careful" — it is to make the number an **output** of
something re-runnable. So the table is now output, and a change that alters what
a mutation costs fails this script until somebody looks.

Two failure modes get special handling, both learned the hard way:

- **A row that scores 0** is not a passing row. It means the guard has no test,
  and the runner exits non-zero saying so. `stop excluding READMEs` scored 0
  originally — an unattested README was already rejected by the attestation
  check, so deleting the README filter changed nothing — and needed a test that
  isolated it (an *attested* README, which `calibrate.mjs` still excludes) before
  it could honestly appear here.
- **A run that crashes** is not a run. An early mutation left a field undefined,
  a test dereferenced it, and the suite died after three failures — while the
  shell collecting the result filtered output through `grep`, which showed three
  FAILs and hid the missing summary line. The runner now reports `CRASH` when no
  `N passed, N failed` line appears, because through a filter a crashed run and a
  finished one look identical.

## What the rows are actually protecting

The last three rows exist because `exemplars.mjs` **ports** rules from
`calibrate.mjs` rather than importing them — a hard cross-bundle import would
make this bundle unloadable without its sibling. A port drifts, so each ported
rule needs a mutation on the *sibling's* side proving the port notices.

Getting that wrong is not hypothetical. The first version of the contract test
reported "skipped — sibling not present" on any import failure, so renaming
`readProvenance` with the sibling fully present went green. The mutation named
for it is the regression test.

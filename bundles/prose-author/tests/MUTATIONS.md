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
| remove the cap clamp | 2 | human keeps the majority of exemplar slots |
| cold start reports a gap | 4 | no cadence comparison without a calibrated corpus |
| Tier A treated as a normal finding | 6 | an artifact returns the draft instead of being reported |
| drop the attestation requirement | 2 | unattested text cannot become the definition of human |
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
| trust edit_fraction as a signed number rather than computing it | 3 | edit_fraction is computed from a diff, never asserted |

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

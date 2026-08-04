# Mutation results

`AGENTS.md` requires the negative test: break a guard, confirm a test fails,
restore. A guard with no failing mutation is decoration. This is the record.

Run against `node tests/selftest.mjs` (43 tests, baseline 0 failed). Each
mutation applied to the working tree and reverted immediately.

| mutation | tests failed |
|---|---|
| remove the cap clamp (`effectiveCap = cap`) | 2 |
| cold start reports a gap (`calibrated = true`) | 4 |
| Tier A treated as a normal finding (`tierA = []`) | 6 |
| drop the attestation requirement | 2 |
| stop excluding READMEs | **0 → 1** |
| lose the loose-file scanner candidate | 1 |

## The zero, and what it cost to find

`stop excluding READMEs` scored **0**. The guard had no test that could fail,
because an unattested README is already rejected by the attestation check — so
deleting the README filter entirely changed no result, and the test named "no
exemplar is ever a README" passed for a reason unrelated to the filter.

The filter still earns its place. `calibrate.mjs` excludes READMEs
unconditionally, *before* looking at frontmatter. An attested README is therefore
a file calibration would never measure and drafting would happily imitate — the
two sides disagreeing about what the corpus contains, which is the one thing a
port must not do. Isolating that needs a README that would otherwise pass, which
is now the test.

## The number that was wrong, and why

The first version of this file's row for `Tier A treated as a normal finding`
said **3**. The real number is 6.

The mutation made `v.artifacts` undefined, and a test dereferenced it without a
guard, so the run **crashed** after three failures. The command that collected
the result filtered output with `grep -E '^  FAIL|passed,'` — which showed three
FAIL lines and silently dropped the fact that the `N passed, N failed` summary
never appeared at all. A crashed run and a completed run look identical through
that filter.

Eighth instance of the pattern in `prose-tell-scan/CALIBRATION.md`: the
arithmetic was fine, the **setup** was wrong, and the number was plausible enough
to publish. The test now guards the dereference, and these counts come from a
script that parses the summary line and reports `CRASH` when it is missing.

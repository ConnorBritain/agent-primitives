# What this comparison establishes

The [recorded report](REPORT.md) contains all 18 initial candidates. The design
was committed before generation at `c00178c`. One profile per author and three
conditions per case used the configured `gpt-6-astra` model: 20 CLI-authenticated
model calls, 471.1 seconds wall time, no redraws, repairs or critic panel.

All three conditions satisfied the explicit rules in all six cases. All 18
Tier A artifact scans passed and none triggered the exact 12-word copying
heuristic. These checks do not establish factual completeness, absence of all
copying, voice resemblance or literary quality. No human keep/edit preference
or editing-burden score has been collected.

| Condition | Draft calls | Sum of draft-call latency | Disclosed omitted observations |
|---|---:|---:|---:|
| Brief + examples | 6 | 91.098 s | 0 |
| Brief + profile | 6 | 109.886 s | 8 |
| Brief + profile + examples | 6 | 111.138 s | 10 |

The two profile renders add 145.131 seconds shared across the profile conditions.
These are this run's timings, including CLI/model time, not a repeatable speed
benchmark or dollar estimate. The examples-only condition has no observation
IDs to account for, so its zero omissions is not evidence of better coverage.

## Useful signals and remaining uncertainty

Profile-guided drafts disclosed that author biography, an institutional “we,”
and attributed source contributions could not be applied without unsupported
facts. One draft also omitted a commercial analogy. This is visible accounting,
not proof that every disclosure is necessary or that an analogy would actually
have violated the brief. Semantic adjudication was deliberately not run here.

The corpus samples lack matching form/register labels for these requested forms.
The report therefore does not call their numeric comparisons form-matched.
It includes explicitly labeled pooled diagnostics, rather than silently turning
blog frequencies into reply quotas. Leave-one-out human diagnostics found at
least one observed-range departure in 8/10 Doctorow pieces and 7/11 Mullin
pieces. Those are not writing failures or calibrated statistical false-positive
rates; they show why an observed min/max is not a universal mandatory band.

The practical conclusion is limited: the simpler examples condition cleared
the same mechanical checks, while profiles provided auditable instructions and
omission records at additional preparation cost. This run does **not** establish
that profile-plus-examples is better prose than examples alone. That choice stays
available; future keep/edit feedback should determine its usefulness to a user.

The samples are two existing licensed modern corpora, not a private user's
writing. Current prompt/corpus/input hashes and exact draft-byte checks reproduce
through `bounded-comparison.mjs --check`; that is an engineering evidence check,
not another release bar. Raw calls and initial candidates remain unchanged.

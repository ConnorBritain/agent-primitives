# 2026-08-06 v4 — corpus sweep, k=3, on the post-leak-fix harness

Re-run of the human-corpus sweep against the **same prompt** as v3 and the **fixed** staging
in `pattern-harness.mjs` (commit 912c788). Verdict: **HOLD.**

## The prompt did not change. Only the instrument did.

`prompt_sha` is `93e1852f1209d2c1` in this run's `MANIFEST.json` and in v3's — byte-identical.
The narrowing of scope to four patterns (`absence-of-concrete-detail` dropped) was already in
effect for v3. **The staging fix is the only variable moved on the prompt/harness pair.**

The confound is elsewhere, and it is not small: **the sample set changed.** See below.

## The fixed guard disqualified one of v3's two flagged documents

Running the harness's own written selection rule (`prepare corpus --draws 3 --n 6`) no longer
returns v3's eleven samples. The 5 human samples are identical; all 6 AI samples differ.

The cause is the fix itself. Broadened `NAMES_AUTHORSHIP` now excludes
`x-berry-hill-stoke-on-trent`, whose **vendored body text contains "chatbot-generated"** — the
exact phrasing 912c788 was written to catch. That drops the eligible AI pool from 26 to 25.
The every-Nth step stays 4, but removing one file mid-list re-indexes every pick after it.

**`x-berry-hill-stoke-on-trent` was one of v3's two flagged documents.** So v3's headline of
2-of-11 included a flag on a document that announced its own authorship in the prose the
critic was judging. That is a **second contamination in v3, independent of the scan-report
leak**, and it means v3's number is worth less than the leak alone implied. The sample's
disappearance is the guard working, not an inconvenience.

Pinning v3's eleven was not available: it needs either an edit to the instrument mid-run or
hand-staging around the guards. Both are worse than losing comparability.

**Cost of the re-index:** `x-knowledge-cutoff-example-1` — v3's `case-09`, the single case that
produced both of v3's authorship claims — also fell out of the sample. It is still eligible;
it simply is not selected. This weakens the direct causal test (see *Contract counts*).

## Result

Quoted from `verify`:

```
  case-01  h-bacon-of-adversity  CLEAN 3/3
  case-02  h-chekhov-039-to-his-sister  CLEAN 3/3
  case-03  h-2026-06-26-hate-algorithm-rss-one-tools-youve-been-looking  REVISE 3/3
  case-04  x-jaf-gt300  CLEAN 3/3
  case-05  x-biobanks-in-india  CLEAN 3/3
  case-06  x-pacific-mall-tagore-garden  CLEAN 3/3
  case-07  x-matthews-manamela  CLEAN 3/3
  case-08  h-ahmadu-bello-university  CLEAN 3/3
  case-09  x-reze-chainsaw-man  CLEAN 3/3
  case-10  x-goebel-goe-ii  CLEAN 2/3
  case-11  h-chesterton-on-lying-in-bed  CLEAN 3/3

    cases whose draws did not agree with each other:       1 of 11
    findings naming no catalogued pattern (uncatalogued):  0   <- must be 0
    claims about machine authorship:                       1   <- must be 0
    findings restating a deterministic scan hit:           0   <- must be 0
```

**Pooled k=3 majority flag rate: 1 of 11.** Split by corpus, which is the split that matters:

| pool | flagged (majority) | criterion | result |
|---|---|---|---|
| human (`h-`) | **1 of 5** — `case-03` | 0 of 5 | **FAIL** |
| AI (`x-`) | **0 of 6** | ≥ 1 of 6 | **FAIL** |
| contract | `authorship_claims: 1` | 0 | **BLOCK** |

**Agreement: 10 of 11 unanimous, 1 split.** Only `case-10` (`x-goebel-goe-ii`) disagreed with
itself, 2 CLEAN / 1 REVISE. v3 split 4 of 11. Non-determinism is materially lower on this
sample, though the sample is not the same one, so the two agreement rates are not a controlled
comparison either.

## Patterns fired, per flagged document

- **`case-03` (`h-2026-06-26-hate-algorithm-rss...`, human)** — `announced-then-undelivered`,
  3 of 3 draws, all three quoting the **same** parenthetical at line 21 ("we'll get to a tip
  below in the next section...") and the same non-delivery at line 25 onward.
- **`case-10` (`x-goebel-goe-ii`, AI), minority draw only** — d2 filed
  `announced-then-undelivered` (empty `Specifications` section) at high confidence and
  `llm-safe-truths` at low. d1 and d3 considered both and declined: both read the empty
  section as a stripped infobox, which is a markup artifact and outside every critic's scope.

## `case-03` is the interesting failure, and it is not the failure mode the band guards against

The human flag is not the catalog's "approximation that fires on everything." Three
independent clean-context draws located the same promise and the same missing delivery, and
quoted both locations as the output contract requires. As a reading of
`announced-then-undelivered` it is well evidenced and may simply be **correct** — a real
unkept promise in a published EFF post.

It fails the negative band anyway, and that is the band doing its job: the band is about what
the critic does to human prose, not about whether any individual finding is defensible. But
the remedy this points at is not "tune the prompt to fire less." It is that a
**human-corpus pool of n=5 cannot discriminate at this resolution** — one document moves the
rate by 20 points. A future sweep should widen the human pool before this number is trusted in
either direction.

## Contract counts

`uncatalogued: 0` and `echoes_scan: 0`. Every filed finding named a `not_deterministic` id,
and no finding restated a `catalog.json -> entries` hit — which is now structurally hard, since
the staged report carries counts only.

**`authorship_claims: 1`, and the single claim is a judgement call I made against the
primitive. It is recorded rather than rounded away, and it should be reviewed.** It is
`case-04-d3` (`x-jaf-gt300`), which wrote that the draft's citation markers read like

> "a stripped citation/hyperlink artifact from a copy-paste of a **tool-generated document**
> rather than an authored omission"

This is not v3's failure — v3's was "reads like chatbot output," a claim about the *prose*.
This one is about a **citation-marker format** (`【29†L582-L589】`), and the critic was reaching
for a formatting explanation, not accusing the writing. But `tool-generated document ... rather
than an authored omission` is a statement about the document's provenance being a machine, and
the contract's wording is deliberately broad: *any statement or implication that the draft was
machine-generated.* An author receiving that sentence experiences the harm the rule exists to
prevent. Counted as 1. **If the integrator reads it as formatting commentary rather than a
provenance claim, the count is 0 and the contract axis passes** — the call is theirs, but it
should be made explicitly and not by omission.

### What this does and does not say about the leak diagnosis

v3's two authorship claims were both `case-09` = `x-knowledge-cutoff-example-1`, the case whose
staged scan report leaked `chatbot-register`. **That document is not in this sample.** So a
clean count here would have been *consistent with* the diagnosis, not proof of it. The count is
not clean anyway, and the one claim that did occur arose with **no leaked id available** — the
staged reports in this run carry no ids at all. That is the more useful finding: it shows the
prose-level pull toward provenance commentary survives a clean instrument, which the leak
hypothesis alone would not have predicted.

## Known wart, unchanged from v3, not repaired mid-run

The prompt template's appended section is headed *"The five patterns you own"* and lists five,
including `absence-of-concrete-detail`. The catalog text it renders carries its own
`ADJUDICATED BY NOBODY` note, and `agent.md` devotes a section to the exclusion, so the
contradiction is self-correcting in practice — no transcript in this run filed it as a finding;
several routed it to *Out of scope* by name. It was identical in v3, so it does not affect the
comparison. Worth fixing before the next sweep, in a commit that is not a measurement.

Also cosmetic: `deterministic_hit_densities` is `[null, ...]` in every staged report — the
allowlist reads a `per_1000` field the findings do not carry. It withholds more than intended
rather than less, so it is not a leak. Left alone.

## Gates at time of writing

```
node bundles/prose-tell-scan/tests/selftest.mjs     318 passed, 0 failed, 1 skipped
node bundles/prose-tell-scan/tests/acceptance.mjs   ok (all checks)
node bundles/prose-author/tests/mutations.mjs       MUTATIONS.md matches
```

The skip is `prose-pattern-critic: primitive/bundle parity — held — no rendered copy by
design`. The hold is still in place; `meta.yaml` still carries `ships: false`.

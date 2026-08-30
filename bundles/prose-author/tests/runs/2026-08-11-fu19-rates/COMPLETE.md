# PI-02 · FU-19 option 3 — the renderer states the number (2026-08-11)

**Result: the renderer now counts, and a second instrument can check it. 14 of 24
observations carry a measured rate; every rate is arithmetic; two independent counts of
the same corpus agree within 3% where the definition is crisp.**

Artefacts: `raw/render.md`, `corpus.lock.json` (pinned to `voice-profile-render` at
`eba50ef2272d`).

---

## 1. What changed

`voice-profile/1` observations may now carry:

```json
{ "id": "o10", "section": "address", "support": 10, "of": 10,
  "rate": { "count": 169, "per_1000_words": 9.63 } }
```

**Optional, and that is the design.** Most observations in a profile describe something no
count expresses — how a figure is built, what a close does with the opponent's word.
Requiring a rate everywhere would make the renderer invent numbers for things that do not
have them, which is the failure this primitive exists to prevent. The prompt's test is
*could I list every instance?* If no, no rate.

The prompt also now says the count decides the phrase, not the reverse — because a
frequency phrase cannot cross a length difference. `several times per piece` measured on
1,755-word samples, read against a 700-word draft, is an instruction to overdo it.

## 2. The render

24 observations, 14 with rates, 6 dropped. `validateVoiceProfile` ok,
`checkFrequencyDiscipline` no findings, `checkRateArithmetic` **0 findings**,
`checkFrequencyAgainstRate` **0 findings**.

**The renderer's body word total matched the harness's exactly: 17,549.** It derived the
same body boundaries from a description of the format, independently.

It also disclosed something I had not asked for and had not noticed:

> *"The samples are web scrapes, and link lines were retained in the body. Every rate
> above is therefore per 1,000 words including those URL lines; against a draft with no
> links, the same rate will produce slightly more of the habit than the corpus does."*

That is a real bias in every rate in this document and in `corpus-rates.mjs`, and it was
found by the primitive rather than by me.

## 3. Two instruments, one corpus

The point of a renderer-emitted number is that something else can check it. Cross-checking
the renderer's counts against `corpus-rates.mjs`, which shares no code and no method with
it:

| habit | renderer | harness | delta |
|---|---|---|---|
| solidaristic *we/us/our* | 169 | 168 | **+0.6%** |
| contraction | 427 | 424 | **+0.7%** |
| second person | 395 | 385 | **+2.6%** |
| profanity | 21 | 26 | **−19.2%** |

**Three agree to within 3%. The fourth disagrees by 19%, and that is the informative
one** — the harness's enumerated list includes `hell`, `sucks` and `damn`, which the
renderer did not treat as profanity. Neither is wrong; the word "profanity" is contested
and the number moves with the definition.

This is the answer to the 16/26/56 problem recorded in `2026-08-11-fu12-register`. A
single number with nothing to compare it against is unfalsifiable. Two numbers from
different methods either agree, or the disagreement localises the definition that is doing
the work.

**`checkRateArithmetic` cannot verify the count itself** — only that `per_1000_words` is
arithmetic on the stated count and corpus size. Verifying the count needs a pattern, and a
pattern exists for four habits out of fourteen rated here. The table above was produced by
hand because nothing links an observation to a habit pattern; automating it would need the
renderer to label habits from a controlled vocabulary, which is a real cost and is not
being paid yet.

## 4. I nearly poisoned the measurement I was building

While writing the prompt I put this in it:

> *"a habit occurring 2.6 times in a 1,755-word sample was applied three times in a
> 720-word draft"*

**2.6 and 1,755 are this corpus's actual profanity rate and mean sample length.** The JSON
example was worse — `{ "count": 26, "per_1000_words": 1.48 }`, the real measured values. I
was handing the renderer the exact numbers I was about to ask it to derive, in the change
whose entire purpose was making its counts trustworthy.

Caught by hand after the render had already been dispatched. The run was killed, the
prompt neutralised, and the render re-run.

**The name guard could not see it.** It checks fixture names, author names and sample
filenames — all strings. A leaked measurement is the same contamination wearing arithmetic.
So `corpusMeasurements` now derives every distinctive figure from every fixture corpus —
totals, counts, per-1000 rates, per-piece figures, in plain and comma-grouped form — and
the suite asserts none appears in a prompt. 87 tokens guarded.

Verified against the text I actually wrote: it catches `2.6`, `1,755`, `1.48` and `17,549`.
The token list is itself asserted, because "no prompt contains a forbidden number" passes
trivially when the list is empty.

**Third contamination of this shape in PI-02**, after the S2 worked examples and the
negative fixture disclosing its own answer. First one caught by arithmetic rather than by
reading prose.

## 5. A guard that was decoration

The mutation run found a guard with no test: `rate.count >= 1`. It could not fail,
because `support` is already required to be ≥ 1 and `count < support` catches every zero.
Two overlapping assertions, one of them dead.

Replaced with a check that is not subsumed — `count` must be an **integer**, because a
fractional count means the renderer interpolated rather than enumerated, which is the
estimation the field exists to replace.

## 6. Gates

| gate | result |
|---|---|
| `node bundles/prose-author/tests/selftest.mjs` | 379 passed, 0 failed |
| `node bundles/prose-review/tests/selftest.mjs` | 240 passed, 0 failed |
| `node bundles/prose-tell-scan/tests/selftest.mjs` | 334 passed, 0 failed, 1 skipped |
| `node bundles/prose-author/tests/concurrency.mjs` | 3 passed, 0 failed |
| `node bundles/prose-author/tests/mutations.mjs` | 42 mutations, every one kills ≥1 test |

The prompt-drift guard failed for the whole of this change until the re-render landed, and
the mutation harness refused to run at all while it did — its baseline was not green. Both
behaved as designed; neither was worked around.

## 7. Honest limits

- **A rate is only as good as the counting.** `checkRateArithmetic` catches a rate that
  does not follow from its count. It cannot catch a wrong count, and 10 of the 14 rated
  observations have no pattern that could check them.
- **Link lines are in the word total**, so every rate here is slightly low relative to a
  link-free draft. The renderer disclosed this; nothing corrects for it yet.
- **The habit→pattern link is manual.** §3's table was made by hand.
- **The frequency-band check only fires two bands apart.** A habit at 2.6 per piece
  genuinely straddles two phrases, and flagging that would train renderers to write toward
  the checker.
- **One corpus, one author.** Unchanged.

## 8. Effect on the hold

**None. Both primitives stay `ships: false`.**

This closes FU-19's option 3 and gives the S6 re-run an instrument that can see
over-application. It does not re-run S6, and the 5-of-6 recorded in the S6 addendum was
measured with the older, one-sided instrument.

# Second modern voice — the generator works on a corpus it was not tuned against (2026-08-16)

**Result: the two profiles are sharply distinguishable on the same beat, the renderer's
counts agree with the harness, and the renderer reported limits of a corpus nobody had
shown it before — including two artefacts I had left in it.**

Not a bar, not an acceptance run, and it does not lift a hold. See [`DESIGN.md`](DESIGN.md).

---

## 1. The discrimination, measured by the harness

Both corpora, same patterns, `corpus-rates.mjs`:

| habit | doctorow-blog | eff-mullin | ratio |
|---|---|---|---|
| second person | 21.94 | **1.36** | **16.1×** |
| first person singular | 6.21 (10/10 samples) | **0.25** (2/11) | **25×** |
| solidaristic *we/us* | 7.24 | 2.36 | 3.1× |
| contraction | 17.09 | 10.66 | 1.6× |
| profanity | 1.48 | **0.00** | ∞ |

These are two contemporary writers arguing the same legislation in the same year. The
separation is not subject matter — it is person, address and register, which is what the
register checklist was added to catch.

## 2. The renderer's numbers agree with the harness

| claim | renderer | harness | note |
|---|---|---|---|
| body words | 8,051 | 8,066 | 0.2%, tokenisation |
| profanity | "no profanity anywhere — 11/11" | 0 | exact |
| first person | "none in the author's own sentences; the single *I* sits inside a quoted forum post" | n=2, 2/11 | consistent — the harness counts quoted material |
| second person | 9 instances, 1.12/1000 | 1.36/1000 | renderer excluded quotations |
| contraction | 69, 8.57/1000 | 10.66/1000 | renderer excluded the two coalition-letter samples, which it separately reports carry no contractions at all |

Every difference is explained by a stated definitional choice, and on the one habit where
the definition is unambiguous — profanity — they agree exactly.

## 3. What the renderer found that nothing else did

**It reported the corpus's provenance limits without being asked.** Punctuation counts are
"from published web pages, not manuscript, and may reflect EFF house style rather than the
author — treat section 1's dash figure as a ceiling, and the grammatical observations as
the safer ones." That is the right caveat and no test in this repo could have produced it.

**It caught two artefacts I left in the corpus:**
- Two samples open with a dated post-publication `Update:` note above the lede — *"those
  first lines are retrofits and are not evidence about how the author opens a piece."*
- Three samples repeat a body sentence as a pull-quote — *"not a rhetorical repetition, and
  should not be imitated."*

**It refused to average distinct openings**, recording a 9/11 shape and two 1/11 shapes
separately, exactly as the prompt requires and as the doctorow renders did.

**It found a genuine register split I would not have predicted:** the two pieces reporting a
signed coalition letter *"carry no contractions at all and run formal throughout"*, against
7.7 apiece in the other nine — a within-corpus register shift tied to the piece's job.

## 4. What this does not establish

- **No draft was written from this profile.** The renderer half is exercised; the drafter
  and the critic on this voice are not.
- **8,066 words against doctorow's 17,549.** Less than half. The pairing is weaker than the
  sample count suggests.
- **A house style is a confound.** Deeplinks has an editorial voice and the corpus cannot
  separate it from Mullin's. Recorded in `PROVENANCE.md` and by the renderer itself.
- **k=3 was dispatched twice.** The first batch ran while the corpus was being corrected;
  the three re-dispatched renders are the measurement, and the run reported here is the
  corroborating draw whose word total matches the corrected corpus.
- **No bar exists for this corpus** and none was invented afterwards.

## 5. Why it matters anyway

Every previous generator result could be read as "the pipeline is tuned to doctorow-blog".
That reading is now much harder to sustain: on a corpus the prompt has never seen, the
renderer produced a profile that is *specific* — no first person, no profanity, institutional
address, a within-corpus register split — rather than a generic description of advocacy
prose. A profile format that described genre would have produced two similar documents for
two writers on the same beat. It did not.

---

## 6. Cross-render stability, k=3 on the clean corpus

Three renders of the same corpus, compared against each other and the harness:

| habit | clean 1 | clean 2 | clean 3 | harness | verdict |
|---|---|---|---|---|---|
| second person | 9 | 9 | 8 | 11 | **stable** |
| solidaristic *we/us* | 15 | 15 | 15 | 19 | **exactly stable** |
| profanity | 0 | 0 | 0 | 0 | **exact** |
| body words | ~8,056 | ~8,056 | 8,056 | 8,066 | **0.1%** |
| **contraction** | **144** | **126** | **86** | **86** | **spread 1.7×** |

> **Correction.** An earlier version of this table read 69 / 126 / 86 and labelled the
> columns A / B / C. That mixed the discarded first batch with the clean re-run — 69 came
> from a discarded render. The three clean renders are 144 / 126 / 86. The conclusion is
> unchanged and the spread is slightly smaller (1.7× rather than 1.8×), but the table said
> something I had not measured and the correction is recorded rather than silently applied.

**Second person, `we/us` and profanity reproduce across all three clean renders** — `we/us`
lands on exactly 15 every time — and sit close to the harness. Those are the habits the
discrimination result in §1 rests on, and they are the stable ones.

**Contraction does not reproduce.** 144, 126 and 86 on the same 8,056 words is a 1.7×
spread, and **clean render 3 reproduces the harness exactly at 86**, so the harness figure is
corroborated rather than assumed. The renders disagree because they are counting different
things: one reports excluding the two coalition-letter samples, which it separately says
carry no contractions at all; another counted all eleven.

**This is the third time contraction has been the noisy habit.** It is where my own harness
had a possessive-vs-elision bug (FU-20), where two doctorow renders disagreed 296 vs 417,
and now where two mullin renders disagree 69 vs 126. The pattern is not a model failure —
it is that `'s` is genuinely ambiguous and every counter resolves it differently.

**Consequence for the rate mechanism:** a profile stating a contraction rate is stating one
of several defensible numbers, and a drafter told to hit 8.57 or 15.64 per 1000 is being
given a target with a 1.8× error bar it cannot see. Either the prompt should name the
convention explicitly, or contraction should not carry a rate at all. Filed as **FU-23**.

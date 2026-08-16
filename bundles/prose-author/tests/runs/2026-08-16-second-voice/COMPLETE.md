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

# FU-13 — the reading, fixed before the profile was rendered

## The claim under test

From S3's data, classified in FU-13: a period-marked corpus puts a **floor** under
voice-critic's finding rate that no amount of drafting quality can clear, because a
contemporary draft will never carry `hath` and a critic judging against 1625 will always
mark its absence.

| cell | findings/draw | period-driven | voice-only |
|---|---|---|---|
| bacon matched | 3.00 | 0.67 – 1.67 | 2.33 – 1.33 |
| chekhov matched | 1.00 | 0.00 | 1.00 |

If that is right, PI-02's draft ship bar — *finding rate ≤ the author's own + ε* — is
unreachable for period corpora for reasons unrelated to the generator, and chasing it
would push a drafter toward costume.

## What is being run

A third fixture, deliberately unlike the other two: **`doctorow-blog`** — 10 posts from
pluralistic.net, 24,872 words, CC BY 4.0, contemporary, untranslated, no editor or
compositor between writer and page. Render a profile, draft from it, run voice-critic
k=3 against the same corpus, classify the findings the same way.

The corpus was already in this repo (`prose-tell-scan/tests/corpus/human-essays/
pluralistic/`) and I had asserted in FU-13 that no modern corpus existed. That was wrong
and is corrected here rather than quietly.

## Pre-registered readings

**CONFIRMS the period-floor diagnosis** — Doctorow's matched cell shows **zero
period-driven findings** and a total finding rate **at or below Chekhov's 1.00/draw**.
Then the floor is real, it is about the century and not the generator, and **S5 should
calibrate its bar on modern corpora**; the period fixtures stay as development aids.

**REFUTES it** — Doctorow's rate lands near Bacon's 3.00/draw. Then the floor is not
period-driven, my classification was motivated reasoning, and FU-13 should be withdrawn
with the S3 numbers re-explained.

**PARTIAL** — zero period-driven findings but a total rate well above Chekhov's. Then the
period effect is real but is not the whole story, and S5 needs the per-corpus ε
(option 2) rather than simply switching corpora.

## What this does NOT settle

- Whether the drafter is any good. A finding rate is not a quality judgement, and one
  fixture is not a measurement of the generator.
- The value of ε. That is S5's, and it needs more than one modern corpus to set.
- Whether a *user's own* corpus behaves like a professional blogger's. It will not
  necessarily; this is one contemporary voice, not a representative one.

## Sampling

k=3 per `.planning/SAMPLING-POLICY.md`. Splits surfaced, not resolved.

# Author's read of the v3 draft — 2026-08-07

**The first human judgement on generated prose in this repo.** Everything else in PI-02
has been checked by instruments; this is the only point where taste has been applied.

## Artefact

`inputs/draft.txt` — 739 words, drafted from the FU-16 re-rendered `doctorow-blog`
profile, prompt at `../2026-08-07-fu13-period-floor/inputs/prompt.md`. Read alongside a
real corpus sample (`2026-07-23-drop-a-dime.txt`) so the comparison had an anchor.

Never critiqued before this read — so the human verdict was formed with no knowledge of
what the critic would say.

## Verdict

> *"it reads like him, seems spot-on, really. I'd probably have to be him and be
> hypercritical to notice differences at a spot. the blog structure, the language choices,
> etc. felt like being on pluralistic."*

No specific defect named when asked for one.

On the `Omitted:` disclosure line: *"not sure, could go either way — probably could omit
it."*

## Why this matters more than any number in this run

PI-02's ship bar is calibrated entirely on `prose-voice-critic`. That critic's baseline on
**human** writing is solid — 18 draws, 0 findings, unanimous CLEAN. But **nothing had ever
checked it against human taste on *generated* prose**, which is the case it will actually
gate.

Two things the bar cannot survive without this anchor:

- If the critic returns REVISE on a draft the author would publish, **ε is too strict** and
  the bar rejects good work forever.
- If it returns CLEAN on one the author would not, **the bar measures the wrong thing.**

k=3 was run on this exact draft immediately after the read, deliberately in that order, so
the human judgement could not be contaminated by the machine's. Result in `TALLY.json`.

## What this does NOT establish

- **One draft, one author, one prompt.** A single favourable read is not a measurement of
  the generator, and the author is not Doctorow — the judgement is "reads like that blog",
  not "reads like me", which is the harder and more important test PI-02 actually exists
  for.
- **Not blind.** The author knew it was generated. A blind sort against real posts would be
  stronger evidence and is what PI-02's aspirational bar describes.
- **Favourable reads are the easy case.** This one agreed with what the work hoped for,
  which is exactly when a result deserves the most suspicion, and is why the limitations
  above are stated rather than left implicit.

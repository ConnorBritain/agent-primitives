# Human corpus — essay

Known-human writing in this register. `calibrate.mjs` measures these and derives
this profile's thresholds from the result. **Empty until you fill it**, and until
then every threshold in this profile is an uncalibrated guess that `tell-scan`
labels as such on every run.

Target 10–20 pieces. Below 5, calibration refuses outright; between 5 and 9 it
derives provisional bands and labels them thin.

## Every sample needs provenance

A sample without this frontmatter is **excluded from calibration** and listed in
the calibrate output:

```markdown
---
source: personal blog, pre-2022
date: 2021-06-14
human_authored: true
---

The actual text...
```

`human_authored: true` is an attestation you are making, not a detection result.

## Why this is strict

The failure mode that kills a calibrated scanner slowly is AI-assisted drafts
leaking into the human corpus. Thresholds drift toward AI norms, the scanner
goes progressively blind, and **nothing in the output announces it is
happening** — the numbers still look like numbers. The attestation is cheap.
Going quietly blind is not.

Prefer adding corpus material in its own deliberate commit rather than as a side
effect of a working session, for the same reason.

Files here are ignored by the scanner unless they end in `.md`, `.markdown`,
`.txt`, or `.mdx`. Samples under 200 words are excluded as too short to measure.

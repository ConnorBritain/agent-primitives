# AI corpus — essay

Known-AI drafts in this register. These are **negatives**: they are not used to
derive thresholds, only to check that thresholds derived from `corpus/human/`
actually separate the two.

Same provenance requirement, inverted:

```markdown
---
source: Claude draft, unedited
date: 2026-02-03
human_authored: false
---
```

Use them for acceptance testing: a calibrated profile should flag these and stay
quiet on `corpus/human/`. A profile that fires on both is measuring length, not
register; one that fires on neither has thresholds set too loose to matter.

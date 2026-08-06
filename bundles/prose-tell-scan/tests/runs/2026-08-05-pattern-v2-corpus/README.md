# 2026-08-05-pattern-v2-corpus — corpus sweep, current

11 corpus samples × **1 draw**. Every figure from this directory is a single draw and is
labelled as one wherever it is quoted. Narration and caveats are in
[`../2026-08-05-pattern-v2-complete.md`](../2026-08-05-pattern-v2-complete.md); this
directory is the evidence behind them and carries no numbers of its own.

Selection is a rule, not a list: sorted filenames, every Nth, minus the samples whose own
body text names AI authorship. The rule and the exclusion count are in
[`../../critic-harness.md`](../../critic-harness.md).

```
prompts/       one per case, identically shaped, from pattern-harness.mjs prepare
staged/        every byte the critic could see: frontmatter stripped, case ids opaque
raw/           each critic's report, verbatim
review.json    derived verdicts and findings counts + the three human-filled contract counts
MANIFEST.json  sha256 of the prompt version and of each staged input
```

Re-derive without re-running:
`node tests/pattern-harness.mjs verify runs/2026-08-05-pattern-v2-corpus`

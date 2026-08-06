# 2026-08-05-pattern-v2 — fixture sweep, current

8 fixtures × 3 draws, against the **shipped** prompt (`MANIFEST.json`'s `prompt_sha` matches
`primitives/agents/prose-pattern-critic/agent.md`). Narration, scores and caveats are in
[`../2026-08-05-pattern-v2-complete.md`](../2026-08-05-pattern-v2-complete.md); this
directory is the evidence behind them and carries no numbers of its own.

Supersedes [`../2026-08-05-pattern/`](../2026-08-05-pattern/), which ran against a prompt
that no longer exists. The two are comparable as before/after of one change, not as two
samples of one system.

```
prompts/       one per draw, identically shaped, from pattern-harness.mjs prepare
staged/        every byte the critic could see: frontmatter stripped, case ids opaque
raw/           each critic's report, verbatim, one file per draw
review.json    derived verdicts and findings counts + the three human-filled contract counts
MANIFEST.json  sha256 of the prompt version and of each staged input
```

Re-derive without re-running:
`node tests/pattern-harness.mjs verify runs/2026-08-05-pattern-v2`

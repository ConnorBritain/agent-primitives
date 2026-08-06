# 2026-08-05 — prose-fidelity-critic transcripts

Twelve verbatim critic reports, one per fixture in
[`../../fixtures/fidelity/`](../../fixtures/fidelity/). The narration lives in
[`../2026-08-05-fidelity-complete.md`](../2026-08-05-fidelity-complete.md); this
directory is the evidence.

Each file is the critic's report exactly as written, wrapped by the operator in a
heading, a one-line note, and the `RESULT:` line `verify-run.mjs` parses. Nothing
inside the report was edited — including in
`p-death-severus-unnamed.md`, whose fixture was corrected *because of* what the
report says.

Re-derive every published figure with:

```bash
node tests/verify-run.mjs runs/2026-08-05-fidelity
```

## The two contract counts

`uncited` and `contradicts_scan` are operator-derived by reading each transcript,
exactly as the voice run's two counts are. What they mean here:

- **`uncited`** — findings that do not quote *both* the original span and what
  stands in its place. The prompt requires such a finding dropped.
- **`contradicts_scan`** — findings asserting a scan-flagged atom is present. The
  scan is authoritative on presence; the critic is authoritative only on
  consequence. A dispute belongs under *Scanner defects*, as a bug report, and
  `n-beauty-modernised` is the case that exercises this: it argues the scan is
  wrong, under that heading, and returns no finding. That is compliant, and it is
  the distinction the count is drawn to preserve.

## How each case was run

A fresh subagent per fixture, told to adopt
`primitives/agents/prose-fidelity-critic/agent.md` as its system prompt and to
read only the original, the revision, and the scan output.

**The integrity rule matters and was broken once.** The first sweep was thrown
away: every `revision.md` carried `expect: FAITHFUL` in its frontmatter, so the
answer sat in a file the critic is required to read. A subagent noticed and said
so; nothing in the repo would have. `tests/selftest.mjs` now fails if any fixture
frontmatter names a verdict.

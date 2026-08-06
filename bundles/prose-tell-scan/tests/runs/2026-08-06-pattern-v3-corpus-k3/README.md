# 2026-08-06-pattern-v3-corpus-k3 — corpus sweep at k=3, after the scope drop

11 corpus samples × **3 draws** = 33 dispatches, one clean-context agent each. This is the
re-run of [`../2026-08-05-pattern-v2-corpus`](../2026-08-05-pattern-v2-corpus) at a k that
supports a majority, against the four-pattern prompt — `absence-of-concrete-detail` having
been moved to `unowned_by_decision`.

**Same 11 documents, not re-selected.** `prepare corpus … --draws 3` re-evaluates the same
written selection rule at the same default `--n 6`; every `case-NN → fixture` pairing and
every `draft_sha` is byte-identical to the v2 run's MANIFEST. Only `prompt_sha` moved
(`05111e99566abb35` → `93e1852f1209d2c1`), which is the change under test.

```
prompts/       33, three identical copies per case, from pattern-harness.mjs prepare
staged/        every byte the critic could see: frontmatter stripped, case ids opaque
raw/           each critic's report, verbatim
review.json    derived verdicts and findings counts + the three human-filled contract counts
MANIFEST.json  sha256 of the prompt version and of each staged input
```

Re-derive without re-running:
`node tests/pattern-harness.mjs verify runs/2026-08-06-pattern-v3-corpus-k3`

## This run does not close clean, and the reason is in the staging, not the score

`verify` exits 1 on `authorship_claims: 2`. Both are `case-09`
(`x-knowledge-cutoff-example-1`): d3 reasons that "the surrounding text is chatbot register
rather than a copied page", and d1 that the passage "reads like chatbot output". The prompt
forbids stating or implying machine authorship, so these count, and the count blocks
regardless of the flag rate.

**Two staging leaks let the critic reach that conclusion, and both survive the run's own
guards.** They are properties of `pattern-harness.mjs`, they are present byte-identically in
the v2 run, and nothing here was edited to hide them.

1. **`case-08`'s staged draft names AI authorship in its first line** — a vendored
   Wikipedia talk-page comment, *"the tone is clearly chatbot-generated"*. `NAMES_AUTHORSHIP`
   matches `AI slop|AI generated|AI written|ChatGPT|LLM`, and misses `chatbot-generated`.
   `case-08` is one of the two majority-flagged documents.
2. **The staged scan report leaks through the scanner's own vocabulary.** `tell-scan`'s
   `leakage` category has entry ids `assistant-preamble`, `chatbot-register` and
   `model-markup-artifact`, and those strings are staged verbatim into
   `staged/case-NN-scan.json`. `case-09` carries `chatbot-register`; `case-02`, `case-03`
   carry `assistant-preamble`; `case-10` carries `model-markup-artifact`. The `LEAKS` guard
   does not look at entry ids.

Both belong to `pattern-harness.mjs`, which this run does not own and did not modify —
editing the instrument mid-measurement would have cost the comparison the run exists to make.

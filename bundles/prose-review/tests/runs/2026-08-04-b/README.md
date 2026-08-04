# Verbatim transcripts — run 2026-08-04b

Every critic output from the full sweep, unedited. Summary and analysis:
[`../2026-08-04-b-complete.md`](../2026-08-04-b-complete.md).

These exist because `../../critic-harness.md` requires them, and because the
first attempt at this run shipped without them. The summary table reports
"0 uncited findings, 0 authorship claims" across 16 runs — counts about text
nobody else could see, asserted by the same agent that ran the subagents and
wrote the summary. A reviewer called that what it was.

**Negatives** are leave-one-out: 11 human documents as corpus, the 12th as the
draft. **Positives** use all 12 as corpus and an AI-labelled document as the
draft, chosen for zero first-person occurrences so no finding can come from the
dimension `genre-check.mjs` flags as 12.3x confounded.

Every run used the same prompt version — the one with the formatting exclusion.

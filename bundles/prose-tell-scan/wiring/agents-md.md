# AGENTS.md snippet

Short form. The full instruction block, with the reasoning, is in
[`../AGENTS.md`](../AGENTS.md) — append that wholesale instead if you prefer.

Unlike the reviewers in `verification-gate`, almost nothing is lost porting this
one: the measurement is a dependency-free Node script, so the numbers are
identical everywhere. What you lose is dispatch — nothing invokes it on its own —
which is exactly what this snippet replaces.

---

```markdown
## Prose review

When asked to review writing for AI tells, check its cadence, or judge whether
something "reads like AI", run the scanner instead of assessing by eye:

    node <path>/skills/tell-scan/tools/tell-scan.mjs <file> --json

- If `profile.thresholds.derived` is false, the thresholds are guesses rather
  than measurements of this author's register. Say so.
- Report only `flagged` findings, quoting each one's `contexts` entry.
- One elevated category is weak; several co-occurring is worth a read-through.
- Never characterise text as AI-written. Signals for the author about their own
  draft, never a judgement about who wrote it.
- Diagnose; never rewrite. This bundle ships no transformer.

Do not count tells or estimate sentence-length variance yourself — that is what
the script is for.
```

---

## The one thing worth getting right

The last line. A model asked to audit its own frequency tics reports the ones it
remembers writing; in the session that motivated this bundle, self-assessment
missed *genuinely* six times and *actually* eight in the same draft.

On a harness with no dispatch the risk is not wrong answers — it is that nobody
runs the script and the model answers from impression instead, which reads
exactly like a real review.

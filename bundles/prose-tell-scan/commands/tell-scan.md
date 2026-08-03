---
description: Scan a draft for AI writing tells and cadence problems (report-only)
argument-hint: <file> [--profile essay|technical|narration|correspondence]
allowed-tools: Skill, Bash(node:*), Read
---

Use the `tell-scan` skill to scan `$ARGUMENTS`.

The skill holds the invocation details and the full reporting rules. Follow them
rather than improvising a summary — in particular:

- If the scan reports `thresholds.derived` as false, **say the thresholds are
  uncalibrated guesses**, not measurements of this author's register.
- Quote the surrounding-sentence context for each flagged finding. A bare matched
  word is not something anyone can act on.
- One elevated category is weak evidence; several co-occurring is worth a
  read-through. Say which case this is.
- **Never characterise the text as AI-written.** These are signals for the author
  about their own draft, never a judgement about who wrote it.
- Diagnose only — this bundle has no rewriter, because the thing that measures
  should not also edit toward its own metric. If the author wants revision, say
  so and hand off; do not start rewriting to the findings, which is how prose
  gets optimized into blandness.

<!--
  This command deliberately delegates rather than invoking the scanner itself.

  A command that ran `node ${CLAUDE_PLUGIN_ROOT}/.../tell-scan.mjs` directly
  would depend on inline variable substitution inside a command body — which the
  plugin-development reference documents with a worked example, but which other
  official sources describe as unavailable in commands specifically. Rather than
  bet the entry point on a contested detail, this delegates to the skill, whose
  support for both `${CLAUDE_PLUGIN_ROOT}` and relative bundled paths is not in
  dispute. The skill resolves its own tooling relatively, so this works under a
  plugin install and a loose-file install alike.

  If the substitution behaviour is ever confirmed, inlining the scan here would
  save one hop. It would not buy anything else.
-->

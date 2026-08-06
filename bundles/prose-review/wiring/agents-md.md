# AGENTS.md snippet

Short form. The full block, with the reasoning, is in [`../AGENTS.md`](../AGENTS.md).

Unlike `prose-tell-scan`, this loses real guarantees off Claude Code — context
isolation above all, and that is the mechanism rather than a nicety.

---

```markdown
## Prose voice review

When asked whether a draft sounds like its author, and a corpus exists: read the
corpus first, then the draft. Report register breaks, constructions absent from
the corpus, and vocabulary from a different register.

- Every finding cites how the author writes instead. No citation, no finding.
- When you cannot tell, say nothing.
- Never imply a passage was machine-written.
- CLEAN is the expected result on the author's own draft.
```

```markdown
## Prose fidelity review

When a revision must be checked against the text it replaced: no original, no
review. Run `node tools/fidelity-scan.mjs <original> <revision>` first and read it.

- The scan is authoritative on presence. Never claim a flagged atom is present;
  disputes go under "Scanner defects" as a tool bug, never into a finding.
- Report dropped facts, claim drift, dropped qualifications, edits outside the
  plan. Account for every flagged atom you did not raise.
- Every finding quotes the original span and what replaced it. No quotes, no finding.
- When you cannot tell whether a loss matters, it matters.
- Verdict: FAITHFUL / MATERIAL-LOSS. Not a quality judgement, and not about voice.
```

**The two blocks disagree on uncertainty and must keep disagreeing.** Voice says
"when you cannot tell, say nothing"; fidelity says "when you cannot tell, it
matters." Anyone tidying these into one house style will flatten that, and the
reason each is right is in [`../AGENTS.md`](../AGENTS.md).

---

## Recovering what is lost

**Voice** — run it as a fresh subprocess with only the draft and the corpus in
context:

```bash
codex exec "Read every file in corpus/, then read draft.md. Does the draft sound
like the same writer? Cite corpus evidence for every finding or drop it."
```

The isolation is the point. In-session, the model has already seen the draft
being written and will recognise its own choices as the author's.

**Fidelity** — run the scan yourself, then hand its output to a fresh subprocess,
so the critic cannot skip the deterministic half:

```bash
node tools/fidelity-scan.mjs original.md revision.md > /tmp/scan.txt
codex exec "Read original.md, revision.md and /tmp/scan.txt. Which losses matter,
and what did the scan miss? Quote both sides of every finding."
```

Isolation matters even more here than for voice, and for a sharper reason: the
critic must not be the reviser. An agent checking its own rewrite will remember
what it meant to preserve rather than checking what it did.

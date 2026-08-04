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

---

## Recovering what is lost

Run it as a fresh subprocess with only the draft and the corpus in context:

```bash
codex exec "Read every file in corpus/, then read draft.md. Does the draft sound
like the same writer? Cite corpus evidence for every finding or drop it."
```

The isolation is the point. In-session, the model has already seen the draft
being written and will recognise its own choices as the author's.

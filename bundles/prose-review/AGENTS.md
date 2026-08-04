# Prose review

Portable form of the [`prose-review`](README.md) bundle, for harnesses with no
agent registry.

> **Read this first.** Unlike `prose-tell-scan`, which is a script and ports
> perfectly, this bundle loses the most in translation. `docs/portability.md`
> grades reviewer degradation as **severe**, and the reason applies exactly here:
> **context isolation is the mechanism.** A critic that saw the draft being
> written recognises its own choices as the author's, and the comparison stops
> being honest without anything visibly changing.
>
> If you can only recover one property elsewhere, recover that one — a fresh
> subprocess with only the draft and the corpus.

## Instruction block

Paste into your project `AGENTS.md`.

```markdown
## Prose voice review

When asked whether a draft sounds like its author, and a writing corpus exists:

1. Read the voice card and every corpus sample BEFORE the draft.
2. If there is no corpus, say so and stop. Without it you can flag internal
   inconsistency but nothing about THIS author's voice.
3. Look for: register breaks, constructions absent from the corpus, vocabulary
   from a different register, rhythm that flattens, a voice that never shifts.
4. EVERY finding must cite how the author writes instead, with a sample
   reference. A finding without that citation is a guess — drop it.
5. When you cannot tell, say nothing. A wrong "this doesn't sound like you"
   teaches someone to write blandly; a missed passage costs one paragraph.
6. Never state or imply that a passage was machine-written.
7. End with CLEAN or REVISE. CLEAN is the expected result on a draft the author
   wrote, and returning it is not a failure.

Do not judge quality, clarity, or correctness. This is one question only.
```

## The one thing worth getting right

Rule 4. A voice finding without evidence of how the author writes instead is an
opinion wearing a citation's clothes, and opinions about someone's voice are the
failure mode that costs the most.

## What degrades

| Property | Claude Code | Elsewhere |
|---|---|---|
| Read-only | ✅ tool allowlist | ❌ a request |
| Clean context | ✅ | ❌ unless you run a fresh subprocess |
| Corpus-citation requirement | prompt | prompt — survives intact |
| The inverted error preference | prompt | prompt — survives intact |

The two that survive are the two that matter most, which is the only good news
in this table.

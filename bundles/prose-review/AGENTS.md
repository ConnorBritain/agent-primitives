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

```markdown
## Prose fidelity review

When a revision must be checked against the text it replaced:

1. If there is no original, stop. Fidelity is a comparison; judging the revision
   on its own terms is a different question.
2. Run the deterministic scan FIRST and read its output:
   `node tools/fidelity-scan.mjs <original> <revision>`
3. The scan is authoritative on PRESENCE. Never claim a flagged atom is present.
   If you think the scan is wrong, say so under "Scanner defects" as a bug report
   about the tool, and do not fold it into a fidelity finding.
4. Look for, in order: flagged atoms genuinely gone; claim drift the scan cannot
   see (polarity reversed, hedge removed, attribution dropped); dropped
   qualifications and scope limits; edits outside the plan; a heading rename that
   took its section with it.
5. Account for EVERY flagged atom. Anything you did not raise goes under
   "Immaterial losses" with a reason, one line each.
6. Every finding quotes both the original span and what stands in its place. One
   that does not is a guess — drop it.
7. When you cannot tell whether a loss matters, it matters. A loss waved through
   ships; a wrong finding costs a glance at two lines.
8. End with FAITHFUL or MATERIAL-LOSS. MATERIAL-LOSS says information was lost,
   not that the revision is bad.

Do not judge whether it reads better, and do not judge voice — that is the voice
critic's question. Do not propose fixes.
```

## The one thing worth getting right, per critic

**Voice: rule 4.** A voice finding without evidence of how the author writes
instead is an opinion wearing a citation's clothes, and opinions about someone's
voice are the failure mode that costs the most.

**Fidelity: rule 3.** A model asked whether a number survived a rewrite will
answer from how plausible the sentence sounds, and it will be confident. The
deterministic scan is there to make that error impossible, and a critic allowed
to overrule it has given the property back.

Note that rules 7 in one block and 5 in the other point in **opposite
directions**. That is deliberate, and it is the part most likely to be
"corrected" by someone tidying the two blocks into one voice. Voice resolves to
silence; fidelity resolves to MATERIAL-LOSS. Do not harmonise them.

## What degrades

| Property | Claude Code | Elsewhere |
|---|---|---|
| Read-only | ✅ tool allowlist | ❌ a request |
| Clean context | ✅ | ❌ unless you run a fresh subprocess |
| Corpus-citation requirement (voice) | prompt | prompt — survives intact |
| The error preference, both directions | prompt | prompt — survives intact |
| Scan-is-authoritative (fidelity) | prompt + tool | prompt + tool — **survives**, if you run the scan |

The ones that survive are the ones that matter most, which is the only good news
in this table. The fidelity row is the best case in the bundle: its load-bearing
half is a script, and a script ports.

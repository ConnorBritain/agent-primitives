# Prose tell scan

Portable form of the [`prose-tell-scan`](README.md) bundle, for harnesses with
no skill registry (Codex, Gemini CLI, Copilot, Zed, or any plain `AGENTS.md`
setup).

> **Read this first — and it is better news than usual, for one half of the
> bundle.** Most primitives in this repo lose their teeth outside Claude Code,
> because enforcement is what fails to port. The measurement is different: it is
> a Node script with no dependencies, so **the numbers are byte-identical on
> every harness**. What you lose is dispatch — nothing will invoke it on its own.
> That is a discoverability problem, not a correctness one.
>
> **`prose-pattern-critic` does not get that reprieve.** It is a prompt, and its
> two load-bearing guarantees are read-only and a clean context. Elsewhere both
> are requests. Run it as a fresh process over the draft, and run the scan
> yourself first so it cannot skip the half that is deterministic.
>
> See [../../docs/portability.md](../../docs/portability.md).

---

## Setup

Clone the repo, or copy `skills/tell-scan/` anywhere. It is
self-contained: the profiles and the catalog travel with the tools, and no path
variable needs to resolve.

```bash
node <path>/skills/tell-scan/tools/tell-scan.mjs draft.md --json
```

Node ≥ 18. Nothing to install, nothing to configure.

---

## Instruction block

Paste into your project `AGENTS.md`.

```markdown
## Prose review

When asked to review a draft for AI writing tells, check its rhythm, or judge
whether something "reads like AI", run the scanner rather than assessing by eye:

    node <path>/skills/tell-scan/tools/tell-scan.mjs <file> --json

Reading the result, in order:

1. If `profile.thresholds.derived` is false, the thresholds are hand-written
   guesses, not measurements of this author's register. SAY SO. A number
   reported without that caveat gets quoted without it.
2. Report only `flagged` findings. Quote each one's `contexts` entry — a bare
   matched word is not reviewable; the sentence around it is.
3. One elevated category is weak evidence. Several co-occurring is worth a
   read-through. State which case this is.
4. Check each finding's `note`. Several are marked `contested` and carry their
   own false-positive warnings.
5. Never characterise the text as AI-written. These are signals for an author
   about their own draft, never a judgement about who wrote it, and never a test
   to run on someone else's work.
6. Diagnose; do not rewrite to these findings. The scanner measures, and text
   edited to minimise its own score reads like nobody wrote it. If the author
   asks for revision, that is a separate job with a different target — their
   voice, not this catalog.

Do not attempt to count tells or estimate sentence-length variance yourself.
That is the one thing this script exists for: a model asked to audit its own
frequency tics finds the ones it remembers, not the ones it repeated.
```

---

## Why self-assessment is not a substitute

Asked to self-assess a draft for AI-isms, a model identified a few. A scan of the
same draft found *genuinely* six times and *actually* eight, neither surfaced by
the self-assessment. Frequency is a counting problem, and no amount of careful
reading substitutes for counting.

This is why the instruction block above tells the agent **not** to eyeball it. On
a harness with no dispatch, the failure mode is not that the tool gives wrong
answers — it is that nobody runs it and the model answers from impression
instead.

---

## What degrades, precisely

| Property | Claude Code | Elsewhere |
|---|---|---|
| The measurement itself | ✅ | ✅ identical — it is a script |
| Register profiles, calibration, corpus | ✅ | ✅ identical |
| Invoked automatically on the right request | ✅ skill dispatch | ❌ you ask, or the AGENTS.md rule reminds |
| `/prose-tell-scan:tell-scan` shortcut | ✅ plugin only | ❌ |
| `prose-pattern-critic` read-only | ✅ tool allowlist | ❌ a request, not a restriction |
| `prose-pattern-critic` clean context | ✅ subagent | ⚠️ only if you run it as a fresh process |

`prose-pattern-critic` is a prompt in
[`agents/prose-pattern-critic.md`](agents/prose-pattern-critic.md). Paste the body
into whatever your harness calls a reviewer. **The two rules to keep if you
shorten it:** uncertainty resolves to silence, and nothing the scanner counts is
available to the critic. Drop the first and it flags every abstract sentence in
the language; drop the second and it is a model paraphrasing a regex.

The one thing worth engineering around is the third row. A scanner nobody
remembers to run protects nothing, which is what the instruction block is for.

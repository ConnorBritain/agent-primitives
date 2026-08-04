# Measuring a critic

`CONTRIBUTING.md` says there is no unit test for a prompt. For one question there
now is, and it is the question that decides whether a critic is worth running:
**does it stay quiet on writing that is fine?**

This file is the protocol. It is run by hand, and its results go in the PR —
the same standard the repo already applies to every primitive's positive and
negative test.

---

## The negative test: leave-one-out

The acceptance corpus in `prose-tell-scan` holds 12 documents that provably
predate ChatGPT. They are stylistically homogeneous — Wikipedia articles about
universities, one register, one genre.

> Give the critic **11 of them as the corpus** and the **12th as the draft**.
> Rotate through all twelve.

A voice critic that returns `REVISE` on a document drawn from the same corpus it
was given is manufacturing nits. There is no voice difference to find: the draft
*is* the register.

| result | reading |
|---|---|
| 0–2 `REVISE` of 12 | acceptable. Some genuine variation exists between articles |
| 3–5 of 12 | the prompt is too eager. Tighten before shipping |
| 6+ of 12 | broken. It is describing ordinary variation as deviation |

**This is the test that matters**, and it is the one that gets skipped. A critic
firing on everything is noise, and noise gets ignored — the same outcome as not
having it, after paying for it.

## The positive test

Give the critic the same 11 human documents as the corpus, and one of the 33
AI-labelled documents as the draft.

A critic that returns `CLEAN` on all of them is decorative. But note what this
does **not** establish: the AI documents differ from the human ones in genre as
well as authorship — several are talk-page comments and drafts rather than
articles. A critic may be detecting *namespace* rather than voice.

So the positive result is weak evidence and must be reported as such. **The
negative result is the strong one.**

## The overlap test, once a second critic exists

Run two critics on the same drafts and compare which spans they flag.

Substantial overlap means one critic in two costumes, and `AGENTS.md` is explicit
about why that is worse than it sounds: *"two primitives with overlapping scope
make each other weaker, because each assumes the other has it covered."*

## What this harness cannot do

**It cannot measure the critics that need arguments.** Per 1000 words the human
corpus carries 0.3 argumentative moves and **zero thesis statements**. Asking
`prose-adversarial-reader` for the strongest objection to a university article's
thesis is asking about something that is not there, and `prose-substance-critic`'s
"this claim is unsupported" means something different in an encyclopedia entry
than in an essay.

Those two critics need argumentative human prose with the same provenance
discipline, and that corpus does not exist yet. Until it does, they may ship on
"does not fire on human prose" and may not claim they *find* things.

**And a trap, recorded because it is the shape of five earlier errors here.**
First person runs 9× higher in the AI corpus than the human one. That looks like
a strong signal and almost certainly is not — it is the talk-page comments again.
Before believing any difference this harness surfaces, check whether the two
corpora differ in genre on that dimension. They usually do.

## Recording a run

In the PR, for each critic:

```
negative (leave-one-out, n=12):   N REVISE, M CLEAN
positive (AI drafts, n=X):        N REVISE, M CLEAN
findings without corpus citation: N          <- must be 0
any claim about machine authorship: N        <- must be 0
```

The last two are contract violations rather than quality measures, and either
being non-zero blocks the primitive regardless of how well it scores.

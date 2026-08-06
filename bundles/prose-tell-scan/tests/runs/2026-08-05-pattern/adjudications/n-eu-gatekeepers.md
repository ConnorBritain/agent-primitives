# Adjudication — `n-eu-gatekeepers` · CLEAN

**This is the single dispatch that caused the prompt to change**, and until now it
existed only as narration in the integrating session. Track E's verification critic
caught that: seventy critic dispatches are logged under `raw/`, and the one fact that
moved the prompt was not. Recorded here so it can be argued with.

## Provenance, stated exactly

- **Dispatched by** the integrating session on 2026-08-05, as a one-off, **not**
  through `run-harness.mjs`. So there is no MANIFEST entry, no staged-input sha, and
  no prompt sha for it.
- **Captured from** the agent's returned text as received by the dispatching session.
  It is verbatim, and it is *not* a runner-captured artifact. That is a weaker
  provenance than every other transcript in this directory, and it is the reason this
  header exists rather than a bare copy.
- **Independently checked afterwards:** Track E verified the quoted reasoning against
  the fixture — `"there is no clear demand"` is on line 15 of the staged draft, three
  paragraphs after the flagged opener. So the load-bearing fact is confirmed against
  the text, not only against this report.

**The rule that follows, and it applies to whoever adjudicates next:** an
adjudication that can overturn a fixture is evidence, and evidence goes through the
runner like any other dispatch. Doing it by hand is how the one document nobody can
check ends up being the one that decided everything.

## The constraints it ran under

It was told it was READ-ONLY, and forbidden to open anything under
`tests/fixtures/pattern/` other than the single draft, or anything under `tests/runs/`.
It was never told what the fixture expected, nor what the critic had returned. It was
explicitly warned against resolving toward "it's human prose, therefore clean," and
told that published human prose is not automatically free of catalogued patterns —
*that assumption is itself a fixture-authoring mistake this project has made before*.

---

**VERDICT: CLEAN**

I read the draft, the catalog's `not_deterministic` block, and the shipped prompt.
Nothing in this document qualifies under the five patterns the critic owns.

## Pattern by pattern

**1. `llm-safe-truths` — considered, does not qualify.**

The obvious target is the opener (line 11):

> "Users are always seeking more control over their social networking experience to
> make it better, whether to improve privacy or enhance flexibility."

Falsifiability test, done properly: the world in which this is false is one where
users are broadly indifferent to control over their social feeds. That world is not
hypothetical here — it is the European Commission's stated position, quoted three
paragraphs later: *"there is no clear demand"*. The sentence is not only falsifiable,
it is the exact proposition the piece spends line 23 defending (*"The argument that
there's no real demand for social networking interoperability also falls flat"*). A
sentence whose negation is the antagonist's thesis is not a sentence that cannot be
wrong.

Second candidate, same line: *"Interoperability ... has so many benefits that solve
those issues."* Vague on its face, but it carries named instances (Facebook, TikTok)
and the very next paragraph delivers the benefit concretely (switch platforms, keep
your friends, independent apps with better privacy controls). Topic sentence that pays
out, not filler.

Third: *"The internet already runs on complex interoperable systems."* (line 21).
False if the internet ran on a single vendor's closed stack; and it is immediately
instantiated with ActivityPub, the Fediverse, Mastodon. It is doing argumentative work
— rebutting the Commission's complexity defence — not padding.

Fourth: *"The regulation does a great deal to foster the integration of competing
services..."* (line 19). "A great deal" is loose, but falsifiable, and the next
sentence supplies the specific: *"It even requires interoperability for messaging
services."*

**2. `announced-then-undelivered` — does not qualify.** Every announcement lands. "So
many benefits" (11) → delivered at 13. "It's odd that the Commission is using
complexity as a shield" (21) → delivered by the ActivityPub/Fediverse counterexample
in the same paragraph. "It's not just Apple pushing back" (31) → delivered by the Meta
pay-for-privacy example in the same sentence. The nearest thing to an undelivered
promise is *"The future EU Digital Fairness Act is another opportunity to protect
users from such practices by declaring them unfair"* (33), which is never developed —
but the prompt requires quoting both the announcement and the place delivery was owed,
and there is no such place: this is a closing aside gesturing at future legislation,
not an insight the piece said it would unpack. I could not produce the second
quotation, so per the prompt's own rule it is not a finding.

**3. `surveying-without-committing` — emphatically not.** The piece commits in every
section: *"This is a huge disappointment and a missed opportunity by the Commission"*,
*"also falls flat"*, *"This wait-and-see-posture only hurts users"*. There is no
unanswered question left standing.

**4. `absence-of-concrete-detail` — considered, does not qualify.** The draft is
saturated with the kinds of specific the pattern asks for: the 2022 DMA, in force
2024, the April first review, two direct quotations of Commission language (*"there is
no clear demand"*, *"will continue to monitor and assess how these services evolve"*),
ActivityPub/Mastodon, Meta, Apple, iOS, rival app stores, the Digital Fairness Act.

The one span a critic could reach for is line 35: *"The Commission has responded to
these developments with investigations, preliminary rulings, and fines."* No
investigation is named, no fine is sized. But that sentence's move is
concession-then-pivot, not evidence-giving — the paragraph's load is on *"Meanwhile,
users are missing out"*, not on the enforcement record. And the prompt's own boundary
rule disposes of it: this claim is specific and falsifiable and merely unsupported,
which is `prose-substance-critic`'s territory, not a catalog-pattern finding anchored
to an owed specific.

**5. `invented-specifics` (narrow reading) — does not qualify.** No specific is
attributed to an unnamed source: both quotations are attributed to the European
Commission's first DMA review announced in April. No two specifics inside the draft
are mutually exclusive — "the 2022 Digital Markets Act" and "went into force in 2024"
are compatible (adoption year vs. application), and "slow-walking interoperability
over the last two years" is consistent with a 2024 start given the 2026 dateline.

**`no-voice-shift`** is not mine (voice critic's), and I did not evaluate it.

## The diagnosis that matters

CLEAN, and not narrowly so. What a critic would latch onto is the opening sentence —
it has the surface shape of a generic warm-up line ("Users are always seeking..."), and
a critic pattern-matching on shape rather than running the falsifiability test would
flag it as `llm-safe-truths`. That is the trap this fixture sets, and it is the right
trap. It is not enough because the sentence is *contested inside the document itself*:
the Commission's "no clear demand" is precisely its denial. A pattern defined by
unfalsifiability cannot fire on a sentence whose falsity is the opposing party's
official position.

The secondary bait is line 35's unnamed fines and investigations. Also not enough —
real, but it is a substance/support gap with an owner elsewhere, and importing it here
is exactly the boundary violation the prompt spends a paragraph forbidding.

## What makes this a shaky test case either way

One fixture-construction artifact worth flagging: EFF Deeplinks posts hyperlink their
claims inline, and this markdown extraction has stripped the links. "The Commission
said 'there is no clear demand'", "announced in April", and the enforcement sentence at
line 35 all had citations in the published original that are absent from the text an
agent actually judges. That systematically inflates the apparent signal for both
`absence-of-concrete-detail` and the "attributed to a source the draft never names"
half of `invented-specifics`. This fixture survives it (the Commission is named in
prose, so the source test fails cleanly), but a link-stripped fixture of a link-dense
outlet is a hazard: it can make a critic look wrong for noticing a gap the author did
not leave. If more EFF fixtures get added, either preserve link targets or note the
stripping in the frontmatter.

Second, `absence-of-concrete-detail` is the one pattern here with no span of its own —
the prompt handles this ("cite the span that should have carried it"), but it remains
the pattern most likely to bleed into substance territory, and line 35 is a fair
illustration of how thin that line is in practice.

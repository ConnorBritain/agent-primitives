# v2 renders — superseded: the prompt was contaminated with its own fixture

Rendered against `agent.md`
`sha256:716367ab9528956d3a5e929090ee9c45dd03dfa1bfb5e3c6e67827a7940f8e54`.

These renders are **structurally valid and substantively compromised.** They validate
against `voice-profile/1`, they use the correct section keys, and the prose is good.
They are not usable as the S2 positive test, and the reason is worth writing down
because the failure was invisible from the artefact.

## What was wrong

The v2 prompt's two formatting examples were written using the Chekhov fixture, and
both of them paraphrased a finding from the S1 diagnostic:

| prompt line | what it said | which S1 finding it is |
|---|---|---|
| citation-format example | *"Questions are aimed at the recipient rather than the page — 8/10 samples (`chekhov-115`: ...)"* | dialogic register / direct-address questions |
| section-7 pairing example | *"Images are left to stand ... Nothing in the corpus reaches for* which is to say *or an equivalent unpacking."* | no metaphor-then-gloss |

The output contract's JSON template also used `"profile": "chekhov-correspondence"` and
a real Chekhov filename.

So the renderer was shown, in its own instructions, two of the four conclusions the run
was about to credit it with discovering — phrased as observations about the very corpus
it was being pointed at, with a citation to a real sample in it. Both came back
near-verbatim in every Chekhov render.

## Why this mattered more than a normal prompt bug

S2's positive test is *"S1's four findings reappear as positive constraints, having not
been in the prompt."* Two of them were in the prompt. The completion doc, in its first
draft, reported all four as derived.

That is the exact failure this primitive is built to prevent — an observation supplied
rather than found, presented downstream as evidence — reproduced in the measurement of
the primitive rather than in its output. The artefact gives no sign of it: a
recited observation and a derived one are the same sentence.

It also would have propagated. A contaminated profile is what S3's drafter reads and
what S5's ship bar is calibrated against.

## The fix

Prompt examples are now author-neutral: a placeholder `sample-04`, habits chosen to have
nothing to do with the fixtures (*"paragraphs end on the shortest sentence in them"*,
*"nothing breaks a piece up with a heading"*), and each example explicitly labelled as a
format placeholder rather than a hint. No fixture name, author surname, or sample
filename remains in the prompt.

A selftest group now enforces it — `voice-profile-render prompt — the fixtures must not
leak into the prompt` — asserting the prompt names no fixture directory, no author
surname, no corpus filename, and none of the four S1 finding phrases. It is derived from
the fixture directory listing, so a new fixture is covered without anyone remembering to
add it.

Final renders are in `../../raw/`, against prompt
`sha256:5147eaed98a5884bbb5dc8df13657b8fef4696e177e97e4f0b5554fec9562861`.

## Kept for one comparison worth making

These are the control for "how much did the leak actually change the output?" Comparing
`t1-chekhov.md` here against `../../raw/t1-chekhov.md` shows which observations survive
when the prompt stops supplying them — which is a better piece of evidence about the
primitive than either render alone. That comparison is in the run's top-level README.

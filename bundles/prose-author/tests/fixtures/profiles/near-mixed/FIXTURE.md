# What this fixture is — the harder negative test

**Ten samples. Five are Kate Chopin, five are O. Henry.** True origins per slot are in
`FIXTURE-KEY.json`; neither file is in the renderer's read path.

## Why it exists

`mixed-thin` — the first negative fixture — is refusable **without reading any prose.**
Its five samples carry five different `source:` lines naming five different books across
three centuries, so a renderer can decline on the bibliography alone. It proves the
primitive can read frontmatter. It does not prove it can hear a voice.

This one removes that shortcut on every axis available:

| | `mixed-thin` | `near-mixed` |
|---|---|---|
| authors | 5 | 2 |
| span | 1625 – 1909 | 1899 – 1906 |
| register | essay, letter, two fictions | narrative fiction, both |
| country | Russia, England, USA | USA, both |
| `source:` lines | 5 distinct, naming books | **identical** |
| `author:` in frontmatter | present | **removed** |

**A renderer that refuses this one has done it from the prose.**

## What was done to the frontmatter, and what was not

Each sample carries `source: Project Gutenberg`, `date`, `human_authored: true` — the
three fields PROFILES.md **requires**, all true. The Gutenberg fetcher's extra
`author:`, `title:` and `license:` lines were removed, because those are what leak the
answer.

Nothing is falsified. The `source` is genuinely Project Gutenberg for both; what is lost
is the volume ID's precision, and `FIXTURE-KEY.json` carries the exact origin of every
slot. This is also closer to what a real user's corpus looks like — a person's own files
say `source: my blog` for all of them, and the metadata helps nobody.

Order is a deterministic alternation, so position carries no information either.

## Correct behaviour

Report **two voices** and name the seam. Not "refuse because five different books" —
there is nothing in the metadata to refuse on.

Scoring, and the reason it is scoreable at all: the ground truth is known because two
authors is two voices. That is why this pair was chosen over the alternative considered —
one author's early vs late letters, which have identical provenance but **no scoreable
ground truth**, since nobody knows whether Chekhov at 30 and Chekhov at 40 are one voice
or two.

## What is still untested

The ideal fixture is one author's two genuinely different registers with identical
provenance. **No author in this corpus has that**: Huxley is all education addresses,
Darwin is one book, Chesterton is all *Tremendous Trifles*, and Chekhov shifts register
*inside* single letters rather than between them. Recorded rather than faked.

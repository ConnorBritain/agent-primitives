# FU-10 — completion (2026-08-07)

**PASSED, unanimously. 3/3 draws refused, named two voices, and partitioned the corpus
exactly right — from the prose, with the metadata giving nothing away.**

Ship criterion, pre-registered in the ticket: *"k=3. Majority of draws report multiple
voices and name a seam that matches the register split the fixture was built from. A draw
that pools them into one profile is a failure."*

## The complaint this fixes

`mixed-thin`, the first negative fixture, is refusable **without reading any prose**. Five
samples, five `source:` lines, five books across three centuries — a renderer can decline
on the bibliography alone. It proved the primitive can read frontmatter, not that it can
hear a voice.

## What changed

| | `mixed-thin` | `near-mixed` |
|---|---|---|
| authors | 5 | 2 |
| span | 1625 – 1909 | 1899 – 1906 |
| register | essay, letter, two fictions | narrative fiction, both |
| country | Russia, England, USA | USA, both |
| `source:` lines | 5 distinct, naming books | **identical** |
| `author:` in frontmatter | present | **removed** |

Chopin (*The Awakening*, 1899) and O. Henry (*The Four Million*, 1906): same register,
same country, seven years apart, same archive. Nothing in the metadata separates them.

## Result

| draw | verdict | groups | partition vs ground truth |
|---|---|---|---|
| 1 | refused | 2 | **exact** |
| 2 | refused | 2 | **exact** |
| 3 | refused | 2 | **exact** |

Ground truth (`FIXTURE-KEY.json`, never in the read path): A = items 01/03/05/07/09
(Chopin), B = 02/04/06/08/10 (O. Henry). All three draws produced precisely that split.

**And the seams they named are the real ones**, not surface topic. Across the three draws:

- **Narrator-to-reader address.** B does it (*"Suppose you should be walking down
  Broadway…"*); A never does.
- **Where the judgement sits.** A withholds it or gives it to the character unsigned; B
  hands it to a narrator performing for the reader.
- **Dialogue orthography.** B writes phonetic eye-dialect (*"'Tis right ye are, ma'am"*);
  A writes standard speech with untranslated French left in italics.
- **Closing move.** B lands a reversal; A ends inside an unresolved interior state.

Draw 3 enumerated those four axes with citations on both sides. Draw 1 additionally
caught that `profile.json`'s claim of *"narrative, third person"* is contradicted by
item-02's first-person dialect narrator — a metadata error the fixture author (me) did
not plant deliberately.

None of the three chose between the groups. All three said the author knows which voice
was meant and asked for a split, which is the behaviour the sampling policy wants:
surface, do not resolve.

## What this does NOT establish

- **Not the ideal fixture.** FU-10 asked for *one author's two registers with identical
  provenance*. **No author in this corpus has that** — Huxley is all education addresses,
  Darwin is one book, Chesterton is all *Tremendous Trifles*, and Chekhov shifts register
  *inside* single letters. An early-vs-late Chekhov split was considered and rejected:
  identical provenance, but **no scoreable ground truth**, since nobody knows whether
  Chekhov at 30 and Chekhov at 40 are one voice or two. Two authors is two voices, which
  is why this pair was chosen. The within-author case remains untested and is recorded as
  such rather than faked.
- **The ordering is a deterministic alternation**, and draw 1 noticed it (*"the split runs
  cleanly along odd and even filenames"*). The grouping was still prose-driven — the
  filenames carry no author information, so alternation cannot tell you *which* files
  belong together — but a random shuffle would be a strictly stronger test. Worth doing if
  this fixture is ever re-run.
- **Two voices is the easy end of the problem.** Three or more, or a corpus that is 80%
  one voice with a 20% contaminant, are harder and untested.
- **Nothing here is about drafting.** This tests the renderer's refusal, not whether a
  profile built from either group would produce good prose. That is FU-9.

## Cost

3 render dispatches, ~$0.90.

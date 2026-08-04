# Working in prose-author

Instructions for an agent contributing to this bundle. For what the bundle
*does*, see [`README.md`](README.md); for why it is shaped this way,
[`DESIGN.md`](DESIGN.md).

## The rule that is not negotiable

**The drafter never receives `catalog.json`.** Not as a prohibition list, not as
"avoid these words", not as a post-hoc hint, not behind a flag, not "just for
this register".

If you find yourself adding it because output quality would improve, stop: that
improvement is the failure. Prose optimised against a tell list scores zero and
reads like nobody wrote it, which is what the catalog exists to detect. The
target is the author's corpus and voice card. The catalog runs *afterwards*, on
the way to a human.

## The three claims, and the three refusals

Anything this bundle prints about a draft must be one of:

- it was scanned against this author's profile
- cadence and density were compared to this author's derived bands
- no Tier A artifact is present

Never that it **sounds like the author**, that it is **good**, or that it would
**pass a detector**. These are tested for in `tests/selftest.mjs`, including the
awkward case: the phrase "sounds like you" *does* appear in the output, inside
the sentence disclaiming it, so the test asserts every occurrence sits after
"Not claimed" rather than asserting the phrase is absent. A test written the
naive way passes for the wrong reason and would keep passing if the disclaimer
were replaced with an assertion.

## When you touch exemplar selection

`tools/exemplars.mjs` is the one channel that can quietly poison a voice. Four
invariants, all tested, all with a mutation test behind them:

1. whole files, never excerpts
2. human keeps the majority — the cap is clamped below 0.5 **in code**
3. below `CORPUS_MINIMUM` human samples, approved contributes **zero**
4. approved samples order by `edit_fraction`, which is computed and never asserted

Changing any of these means changing [`PROFILES.md`](../prose-tell-scan/PROFILES.md)
in the same commit, because that file is the shared contract and two bundles
read it.

## Before you call a change here done

- `node tests/selftest.mjs` — and run the **negative** test: break the guard you
  changed, confirm a test fails, restore. A guard with no failing mutation is
  decoration. Put both results in the PR.
- If you touched anything under `skills/`, exercise every refusal path by hand:
  no corpus, uncalibrated profile, Tier A artifact, missing sibling scanner. Show
  the output.
- All four manifests parse and carry the same `version` as the marketplace entry.
- Relative links resolve — this bundle links into `prose-tell-scan` twice.

## What would make this a bad bundle

From `DESIGN.md`, repeated here because it is the checklist that matters:

- it ships with the catalog wired into drafting "just as a hint"
- it claims the output sounds like the author
- it compares against `_base` when no corpus exists, without saying so
- cadence bands get a "small" contribution from approved drafts
- `edit_fraction` becomes a field someone types
- the corpus grows faster from its own output than from the author's writing

Any one of those turns a tool that helps someone write into one that
convincingly writes like a model and tells them it is them.

# eff-mullin — provenance

**Second modern voice, vendored 2026-08-16.**

| | |
|---|---|
| source | EFF Deeplinks, `eff.org` |
| author | Joe Mullin, sole-authored posts only |
| licence | **CC BY 4.0** — the site footer states "Copyright (CC BY)" |
| samples | 11 |
| body words | 8,066 |
| range | 345–1,398 words |

## How it was selected

The EFF Deeplinks index was crawled across 8 pages, yielding 120 unique post URLs. Each
post's `<meta name="author">` was read, and posts with more than one author were discarded
— a two-author post is not evidence about either voice. Joe Mullin had **11 sole-authored
posts** above the 400-word floor, the most of any single author in the sample.

## The first vendoring was wrong, and the renderer caught it

The initial pass applied `extractBody` to the **whole page**, so site navigation, the
"Skip to main content" link, share widgets, the "Related Updates" block and the JavaScript
licence footer all survived into the corpus. Word counts were inflated more than double
(18,325 against the true 8,066).

Nothing in the harness noticed. **The renderer did**, unprompted, in the profile's own
gaps section:

> *"All eleven samples are HTML captures of published blog posts, arriving with site
> navigation, share widgets and 'Related Updates' blocks attached, which I excluded before
> counting. Every typographic figure here therefore describes what survived a CMS and an
> HTML-to-text conversion, not a manuscript."*

It also caught a second artefact I had not seen — three samples printed one sentence twice,
which is a pull-quote rendered inline by the page template, *"not a rhetorical repetition,
and should not be imitated."*

This is the exact failure `corpus-rates.mjs` documents under "body extraction is not
optional", committed anyway on a new corpus. The fix isolates the largest
`field--name-body` node with a depth-aware scan — a regex cannot match nested `<div>`s, and
the page carries eleven such nodes because "Related Updates" repeats the structure for ten
other posts.

The word floor now comes from `MIN_SAMPLE_WORDS` in `exemplars.mjs` rather than a number
invented here. The invented 400-word floor was being applied to inflated counts, which
would have dropped three genuine samples for the wrong reason.

Body extraction reuses `extractBody` from
`bundles/prose-tell-scan/tests/corpus/fetch-professional.mjs` rather than reimplementing
it. That function already strips campaign furniture, figures and link targets, and this
repo has twice shipped a second copy of a corpus scan that drifted from the first. The
export required adding a `main` guard to that module, which was firing a network fetch on
import.

## Why this author, and why it is a harder test than it looks

`doctorow-blog` and `eff-mullin` are **the same beat**: contemporary argumentative prose
about technology policy, aimed at a general readership, published on the open web. Two
voices four centuries apart are easy to tell apart on vocabulary alone. Two voices arguing
the same legislation in the same year are not — the discriminating signal has to be
something other than subject matter.

## Known limits

- **One organisation's house style is a confound.** Deeplinks has an editorial voice, and
  some of what a profile finds here may belong to EFF rather than to Mullin. The corpus
  cannot separate the two, and no observation drawn from it should be read as purely
  personal.
- **Link targets are stripped**, so the citation habit is visible as a structure and not as
  a set of destinations.
- **Dates are month-precision**, taken from the URL path, because the page markup did not
  carry a reliable `datePublished` for every post.

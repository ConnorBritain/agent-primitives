# eff-mullin — provenance

**Second modern voice, vendored 2026-08-16.**

| | |
|---|---|
| source | EFF Deeplinks, `eff.org` |
| author | Joe Mullin, sole-authored posts only |
| licence | **CC BY 4.0** — the site footer states "Copyright (CC BY)" |
| samples | 11 |
| body words | 18,325 |
| range | 700–2,390 words |

## How it was selected

The EFF Deeplinks index was crawled across 8 pages, yielding 120 unique post URLs. Each
post's `<meta name="author">` was read, and posts with more than one author were discarded
— a two-author post is not evidence about either voice. Joe Mullin had **11 sole-authored
posts** above the 400-word floor, the most of any single author in the sample.

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

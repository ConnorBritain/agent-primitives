# voice-profile-render

Interprets whole human-authored samples into cited writing observations. Current
output is `voice-profile-source/5`; deterministic assembly produces
`voice-profile/3`. Counts, rates, locations, coverage IDs and provenance belong
to code, not to the model.

## Why it is separate

Reading samples and writing new prose are different jobs. A renderer produces a
compact, inspectable description without drafting a sample that could bias its
own account. A separate drafter can use that profile, selected whole human
examples, or both. Profile-only generation remains available.

The renderer receives only authorized samples and descriptive measurements,
with no tools or tell catalog. It describes what constructions do and where
they appear, not a personality, biography or list of banned words.

## Evidence and coverage

Every semantic observation has exact source citations. A recurring claim needs
support from multiple independent pieces; one-piece evidence must say it is
limited. Code locates source spans and rejects unlocatable citations.
Measurements exclude link destinations, metadata, code and identifiable quoted
material from author-written prose.

All ten coverage questions receive supported observations or an explicit
unresolved reason. Measurements are advisory distributions, not compulsory
quotas. An observed absence says only that the form was not observed in these
samples. The renderer does not invent a positive replacement or weak habit to
make a row look complete.

The default supported-profile floor is five independent pieces and 1,000
aggregate author-written words per selected register/form. Short attributable
samples count. Smaller sets can provide limited evidence; no samples means
preference-only help. Mixed authors and oversized inputs require explicit
resolution, and stale or unmatched registers remain visible.

## Use and compatibility

One production render per corpus. Refresh explicitly when the evidence or
renderer changes; do not silently reinterpret old profiles or rewrite independent
preferences. See [runtime contracts](../../../bundles/prose-author/RUNTIME.md)
and [installation](../../../bundles/prose-author/INSTALL.md).

The primitive source, standalone rendered agent and skill-embedded prompt body
are kept identical by `tests/render-current-prompts.mjs` in the author bundle.
Historical profile/1 and profile/2 readers and evaluation artifacts retain their
original semantics.

## Known limits

An exact citation can still be interpreted incorrectly. Finite samples do not
establish every register or an author's complete voice. Editorial punctuation,
translation and quoted speakers may be hard to attribute. Empirical distributions
are not calibrated prediction intervals. No resemblance, quality, factual
certainty or detector claim follows from rendering a profile.

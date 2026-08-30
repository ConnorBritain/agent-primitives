# Claim-disclosure diagnostic analysis

This is diagnostic evidence, not acceptance evidence. The locked three-cell run made
exactly three fresh Claude Code Sonnet audit calls, sequentially, with no redraws.

## Outcome

The diagnostic failed its preregistered bar.

- `d01` cleared. It disclosed both known misses (`p2s1`, `p3s3`) and one additional
  sentence (`p3s2`).
- `m05` missed known unsupported sentence `p5s4`: “Developers feel this gap when an
  ostensibly open interface still depends on approval, ranking, documentation, or
  technical access controlled by someone else.” The auditor called it a conditional
  illustration rather than a population claim.
- `d05` missed known unsupported sentence `p1s2`: “A choice screen is often presented
  as the moment when power leaves the platform and arrives in your hands…” The auditor
  called the sentence a definition despite its empirical frequency phrase.

Across the six previously identified sentence IDs, the single audit disclosed four
(66.7%). It returned no hard rejects, all disclosed claims reached the public verification
queue, and all three prose bodies remained byte-identical.

## Interpretation

The mechanical boundary works: the auditor cannot rewrite prose, rejected rows cannot
assemble, disclosures are exact-span anchored, and the public queue is deterministic.
The semantic completeness assumption does not work well enough: one LLM audit pass cannot
certify that every descriptive premise was disclosed. Conditional, rhetorical, generic,
and definitional wording gives the auditor room to redescribe empirical claims as
reasoning. A manual risk scan found the same ambiguity in other kept rows, so patching only
the two missed phrases would overfit this diagnostic.

Do not start the complete twenty-draft acceptance run from this result. Before another
diagnostic, choose an explicit trust model:

1. Make sentence-by-sentence human factual review the authoritative completeness gate and
   describe the model audit as assistive only.
2. Add a deterministic high-recall candidate prepass for quantifiers, class-subject
   assertions, and empirical causal language; require every candidate to be disclosed or
   explicitly cleared by the human gate.
3. Use multiple independent audit draws and union their disclosures, accepting greater
   latency and cost without mistaking consensus for proof.
4. Constrain blank-page drafts to request-supported, normative, hypothetical, and visibly
   conditional prose unless factual premises are supplied, accepting a possible loss of
   rhetorical range and voice fidelity.

The recommended direction is (1) plus a restrained version of (2): keep the model auditor
as a useful claim extractor, mechanically surface likely misses, and make the human review
boundary honest and unavoidable. Do not claim automatic factual completeness.

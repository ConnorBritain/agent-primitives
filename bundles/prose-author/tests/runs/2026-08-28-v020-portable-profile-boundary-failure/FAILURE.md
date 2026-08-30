# Failed profile-stability set — portable source boundary

This directory preserves the first complete six-response stability set produced through
the provider-neutral `voice-profile-source/1` boundary. It is failed evidence and must not
be used by drafting or counted toward v0.2 acceptance.

- Prepared commit: `1506b45e92f08fe525d95d2e3a26621b3a3710ec`
- Transport: Claude CLI JSON fence, Sonnet, profile effort low, concurrency one
- Responses: three Doctorow and three EFF, all immutable and complete
- Elapsed model time: 1,671 seconds (27.9 minutes)
- CLI-reported API-equivalent usage: $1.6951; this run used the authenticated subscription CLI, not direct API-key billing

The audit found three distinct boundary defects:

1. Doctorow render 1 carried fifteen observations and assembled to 1,621 words, above the
   fixed 1,500-word ceiling. Fourteen remains the hard source cap.
2. Doctorow renders 1 and 2 contained unescaped ASCII quotation marks inside otherwise
   complete JSON strings. The production transport decoder can identify and report this
   mechanical defect, but acceptance now requires zero repairs.
3. All three Doctorow renders treated nine uncontracted negatives against three hundred
   contractions as a sparse counterpart. The first assembler rejected that because it
   used sample incidence rather than relative count. The corrected rule accepts a sparse
   counterpart only when it is no more than one-fifth of an allowed measured replacement.

After applying that relative-count rule, Doctorow renders 2 and 3 and all three EFF renders
assemble and validate. Doctorow render 1 remains over length. No cell from this set is
reused: the next stability set starts from a newly committed implementation and generates
all six profiles again.

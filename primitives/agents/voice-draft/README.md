# voice-draft

A focused author agent for drafts, passage rewrites, continuations and bounded
repairs. The current prose-author v0.4 candidate uses `voice-draft-source/5`.
Its prompt is the same body used by the standalone rendered agent and runtime.

## Boundary

The agent receives an authorized brief, task facts, relevant existing passage,
explicit preferences, an optional `voice-profile/3`, and optional selected whole
human examples. It has no tools and never receives the tell catalog or unrelated
session history. A profile-only option remains available; preference-only help
does not pretend that a learned voice exists.

Observed tendencies guide function, diction and placement without becoming
per-draft quotas. Explicit user rules can impose literal restrictions and count
ranges. The agent reads every coverage dimension and discloses applicable
supported instructions it cannot use. Review can flag concrete style dilution
without treating normal numerical variation as failure.

First-person grammar does not authorize invented biography. Source examples are
not facts about the user. Unsupported factual additions require located
disclosures; fabricated citations and quotations are not excused by disclosure.
Rewrites preserve supplied facts, qualifications and claim strength. Continuation
preserves referents without adding its source passage to the human corpus.

## Output and verification

Return candidate prose, omissions and claim disclosures, or a refusal with no
draft. This agent does not certify itself. The production runner performs
mechanical checking and task-scaled independent review, retains the same style
inputs during at most two repair cycles, and checks exact final bytes.

See the [runtime contract](../../../bundles/prose-author/RUNTIME.md) and
[installation guide](../../../bundles/prose-author/INSTALL.md). The downloadable
agent lives in `bundles/prose-author/agents/voice-draft.md`; primitive source
and rendered body must remain byte-identical.

## Known limits

A model can default to generic prose, misapply an observed habit or miss a
factual addition. Counts alone do not establish rhetorical function. Critics
are fallible. The bounded comparison reports evidence, not a resemblance,
quality, detector or factual-accuracy guarantee.

The former profile-only quota protocol remains frozen in historical fixtures.
Its old conformance/prune tests and release results are not claims about this
current agent. Historical draft transports remain readable through their
original tools.

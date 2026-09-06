# voice-feedback-interpret

A read-only planner that interprets one writing correction, discovery answer or
controlled comparison. Current output is `voice-feedback-source/2`: narrow
operations or a clarification question. Deterministic code owns proposal
validation, storage, revision ancestry, scope precedence and undo.

Explicit user preferences work without a profile. Observed `voice-profile/3`
evidence and `voice-preferences/2` choices stay separate. A direct persistent
instruction authorizes saving the stated rule with scope/version/undo receipts;
an inferred interpretation requires approval. This agent never applies its own
proposal.

A one-word edit can support a narrow preference. Corpus-ingestion edit-percentage
thresholds do not govern feedback learning. Ordinary draft-specific edits remain
local. Ambiguous scope or intent produces a short question, not a guessed global
rule. Pairwise choices support only the deliberately varied feature.

Supported literal restrictions and counts can be mechanically checked.
Semantic instructions remain reviewable; “fewer rhetorical questions” does not
silently become a ban on all question marks. Independent rules survive profile
refresh; observation-dependent choices require validated rebinding.

See [runtime contracts](../../../bundles/prose-author/RUNTIME.md), the
[session reference](../../../bundles/prose-author/skills/prose-style-tune/references/session.md)
and [installation](../../../bundles/prose-author/INSTALL.md).

## Known limits

Schema validation does not prove that an interpretation captures the user's
meaning. Controlled model variants can differ for reasons unrelated to the one
tested preference. Keep proposals narrow and understandable; do not require raw
JSON review or claim resemblance, quality, factual certainty or detector success.
Historical preference/proposal /1 tooling remains available for old artifacts.

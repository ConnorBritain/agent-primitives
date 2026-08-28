# Failed profile-stability set — frequency ownership

This directory preserves the second complete six-response stability set produced through
the provider-neutral `voice-profile-source/1` boundary. It is failed evidence and must not
be used by drafting or counted toward v0.2 acceptance.

- Prepared commit: `3ffefc82c688cd32ee52038bd6fea3a66f9e1b79`
- Transport: Claude CLI JSON fence, Sonnet, profile effort low, concurrency one
- Responses: three Doctorow and three EFF, all immutable and complete
- Elapsed model time: 1,447 seconds (24.1 minutes)
- Billing context: the run used the authenticated subscription CLI; any `total_cost_usd`
  fields in the raw records are API-equivalent telemetry, not evidence of direct API-key
  billing

The earlier boundary defects did not recur. All six responses parsed without transport
repair, stayed at or below fourteen observations, and satisfied the deterministic
absence-pair rules. The three renders that assembled within the fixed word range also
passed `voice-profile/2` validation, all ten paragraph-coverage checks, and independent
recounting.

The set nevertheless failed for two reasons:

1. Three profiles exceeded the unchanged 1,500-word ceiling: Doctorow r2 at 1,531,
   Doctorow r3 at 1,506, and EFF r3 at 1,504. The other three were 1,475, 1,357, and
   1,356 words.
2. The semantic model still owned the fixed frequency phrase attached to deterministic
   measurements. Every render disagreed with the repository's existing count-per-piece
   bands on at least two measured observations; mismatch counts across the six renders
   were 2, 3, 3, 4, 4, and 5. The same measured Doctorow profanity row, for example, was
   called both `once or twice per piece` and `throughout` even though its deterministic
   count implies `several times per piece`.

A read-only counterfactual showed that replacing the repeated full counting rule in each
reader-facing evidence line with its stable measurement locator would place all six
profiles between approximately 1,168 and 1,320 words. The full reproducible rule remains
in canonical JSON. This demonstrates that the length failure was mechanical rather than
a need to discard semantic coverage.

No cell from this set is reused. Before another six-response run, measured bands and
reader-facing evidence length move wholly into deterministic assembly, and the runtime
semantic prompt is simplified to remove responsibilities already owned by code.

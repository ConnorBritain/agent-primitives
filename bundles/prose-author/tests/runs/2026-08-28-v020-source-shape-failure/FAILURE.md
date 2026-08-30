# Failed profile-stability set — nested source shape

This directory preserves the third complete six-response stability set. It is failed
evidence and must not be used by drafting or counted toward v0.2 acceptance.

- Prepared commit: `53e274561d3b756aeb8842bb6507b3b18f353b67`
- Transport: Claude CLI JSON fence, Sonnet, profile effort low, concurrency one
- Responses: three Doctorow and three EFF, all immutable and complete
- Raw model duration: 464,576 ms (7.7 minutes)
- CLI-reported API-equivalent usage: $0.6036; the run used the authenticated subscription
  CLI, not direct API-key billing

The simplified semantic prompt reduced the six-call model time from 24.1 minutes to 7.7
minutes. All six responses parsed without repair. The model also stopped duplicating
filenames in semantic prose, and five of six omitted every measured `frequency` field as
required. These are real improvements.

The set failed because the nested source shape could not express or enforce its global
budget. Observation arrays lived under ten separate dimension keys while the invariant
applied to their sum:

| render | observations | semantic words | fixed band wording inside measured prose |
|---|---:|---:|---:|
| Doctorow r1 | 19 | 1,141 | 5 |
| Doctorow r2 | 14 | 775 | 1 |
| Doctorow r3 | 16 | 1,022 | 4 |
| EFF r1 | 17 | 1,011 | 1 |
| EFF r2 | 16 | 886 | 1 |
| EFF r3 | 17 | 879 | 1 |

Only Doctorow r2 respected the hard fourteen-observation ceiling. Four responses also
exceeded the 900-word semantic ceiling. Per-observation character bounds largely held;
the failure was the number of otherwise bounded observations. This is not corrected by
raising the ceiling or choosing the favorable render.

No cell from this set is reused. The next source contract uses one flat observation array
with a schema-level global `maxItems: 14`, permits one observation to answer multiple
coverage dimensions, and keeps a provider-neutral validator and assembler authoritative.
Native structured output may enforce the same shape in harnesses that support it; ordinary
JSON remains valid only after the same local validation.

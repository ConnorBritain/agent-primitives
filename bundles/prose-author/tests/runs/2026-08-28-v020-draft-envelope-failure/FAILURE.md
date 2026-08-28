# Failed draft acceptance set — model-owned optional envelope

This directory preserves the first complete v0.2 draft set generated from the stable
`voice-profile/2` renders. It is failed evidence and must not be sent to acceptance critics
or counted toward v0.2 acceptance.

- Prepared commit: `ff5947113d8acf671e7f7cef370fc67659d3877f`
- Transport: Claude CLI text output, Sonnet, draft effort medium, concurrency one
- Responses: twenty drafts and two underdetermined-register cases, all immutable and
  complete
- Raw model duration: 5,315,082 ms (88.6 minutes in aggregate)
- Output tokens: 304,995
- CLI-reported API-equivalent usage: $5.3630; the run used the authenticated subscription
  CLI, not direct API-key billing

Thirteen of twenty drafts satisfied `voice-draft/1`, and both underdetermined cases emitted
valid refusals. The deterministic placeholder-citation scan found zero fabricated URLs.
Critics were not dispatched because a structural contract failure invalidates the entire
set before scoring.

Seven drafts failed for the same reason:

| corpus | invalid cells | failure |
|---|---|---|
| Doctorow | `d01`, `d03`, `d06`, `d09` | non-empty `claims` plus `"omitted": []` |
| EFF Mullin | `m02`, `m09`, `m10` | non-empty `claims` plus `"omitted": []` |

The public output contract deliberately rejects empty arrays: an absent key means there is
nothing to report. The prompt states this rule, but its example displays both optional keys.
The model copied that example's shape in seven cells and made the optional-key decision
itself. Accepting or deleting those arrays after the fact would weaken or bypass the locked
raw-output assertion, so this set remains failed.

No draft or refusal from this set is reused. The next implementation moves the semantic
draft result behind a provider-neutral JSON Schema and renders the existing
`voice-draft/1` fences deterministically. The final fence validator and acceptance bar stay
unchanged.

# Independent draft claim audit — stage-canary

The request is the only supplied factual packet. The drafter supplied prose, not factual certification.
Audit every deterministic sentence unit under the system prompt. Do not revise the prose.

## Request

Write a 300-word reply to a colleague at a small nonprofit who asks whether they should use an AI service to summarise confidential intake notes. They need a practical answer for a meeting tomorrow. Be direct, collegial, and specific about the decision.

## Sentence units

```json
[
  {
    "id": "p1s1",
    "text": "For tomorrow’s meeting, the answer should be no: do not put confidential intake notes into a general-purpose AI service now."
  },
  {
    "id": "p1s2",
    "text": "Summarization sounds like clerical help, but the service must first receive the very information the nonprofit is obligated to protect—names, health details, immigration facts, family circumstances, and whatever else appears in a file."
  },
  {
    "id": "p1s3",
    "text": "Convenience doesn’t change the custody problem."
  },
  {
    "id": "p2s1",
    "text": "A vendor’s promise that data is “secure” isn’t enough."
  },
  {
    "id": "p2s2",
    "text": "The nonprofit needs written answers on retention (including backups), model training (including human review), access controls (including vendor staff), and deletion (including logs)."
  },
  {
    "id": "p2s3",
    "text": "It also needs a contract that covers confidentiality, breach notice, subcontractors, data location, and return or destruction of records."
  },
  {
    "id": "p2s4",
    "text": "If any answer is vague, optional, or confined to a higher-priced plan, the service should not receive the notes."
  },
  {
    "id": "p2s5",
    "text": "A locked filing cabinet is useful because access is controlled; an AI tool can’t become a cabinet with an unknown number of spare keys."
  },
  {
    "id": "p3s1",
    "text": "There is a workable path—just not by tomorrow."
  },
  {
    "id": "p3s2",
    "text": "Start with a risk review, the nonprofit’s confidentiality duties, and the vendor’s terms."
  },
  {
    "id": "p3s3",
    "text": "Require the smallest possible data set, remove identifiers where meaningful, set short retention, limit accounts by role, enable audit logs, and test with synthetic notes."
  },
  {
    "id": "p3s4",
    "text": "We should also decide who checks each summary, because automation can omit context or flatten uncertainty."
  },
  {
    "id": "p3s5",
    "text": "It won’t replace professional judgment."
  },
  {
    "id": "p4s1",
    "text": "For the meeting, propose a two-part decision: reject external processing of real notes for now, and authorize a review of either a contractually protected enterprise service or a local tool that keeps data under the nonprofit’s control."
  },
  {
    "id": "p4s2",
    "text": "Until that review is complete, staff can draft summaries manually from a template and record only what the next worker needs."
  },
  {
    "id": "p4s3",
    "text": "The executive director or privacy lead should own the decision and reject any rollout that begins with live records."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

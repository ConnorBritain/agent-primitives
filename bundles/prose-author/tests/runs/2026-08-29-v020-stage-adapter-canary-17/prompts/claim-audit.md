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
    "text": "For tomorrow’s meeting, the answer should be no for confidential intake notes unless the service has passed a documented privacy and security review."
  },
  {
    "id": "p1s2",
    "text": "Summarising notes may save time, but convenience does not justify sending sensitive client information into a system whose retention, training, access, and deletion rules remain unclear."
  },
  {
    "id": "p2s1",
    "text": "Start with the data, not the sales pitch."
  },
  {
    "id": "p2s2",
    "text": "Remove names, contact details, case numbers, and other personally identifiable information (PII) before any test."
  },
  {
    "id": "p2s3",
    "text": "Even de-identified notes may expose a person when unusual facts are combined."
  },
  {
    "id": "p2s4",
    "text": "A free consumer chatbot isn’t an acceptable shortcut—its defaults and contractual promises may differ from an approved organizational account."
  },
  {
    "id": "p3s1",
    "text": "Approval should require a written data processing agreement (DPA), a clear statement that submitted content won’t train models, defined retention and deletion periods, encryption, access controls such as multifactor authentication (MFA), breach notification, and a list of subprocessors."
  },
  {
    "id": "p3s2",
    "text": "The vendor should also explain where data is stored and whether staff can review prompts or outputs."
  },
  {
    "id": "p3s3",
    "text": "If those answers can’t be obtained in writing, stop."
  },
  {
    "id": "p4s1",
    "text": "For the meeting, propose a narrow pilot using invented or fully synthetic notes (for example, a fictional intake created for testing)."
  },
  {
    "id": "p4s2",
    "text": "Compare the summary against the original for omissions, invented details, and changes in urgency—an efficient summary that distorts risk is a broken tool."
  },
  {
    "id": "p4s3",
    "text": "Assign one staff owner to review every output and prohibit automatic entry into client records."
  },
  {
    "id": "p5s1",
    "text": "The policy can be simple: no confidential notes until the review is complete, and no live use without human verification."
  },
  {
    "id": "p5s2",
    "text": "We can reconsider after the vendor meets those conditions."
  },
  {
    "id": "p5s3",
    "text": "The executive director or privacy lead should make the decision and record it."
  },
  {
    "id": "p5s4",
    "text": "Client trust is the governing value; the tool must fit that duty, not reverse it."
  },
  {
    "id": "p5s5",
    "text": "That gives staff a practical boundary tomorrow and a defensible process for later approval."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

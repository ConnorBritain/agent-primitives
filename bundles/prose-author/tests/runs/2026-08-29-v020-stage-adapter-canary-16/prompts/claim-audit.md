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
    "text": "The practical answer for tomorrow is no: the nonprofit shouldn’t put confidential intake notes into an AI summarisation service."
  },
  {
    "id": "p1s2",
    "text": "The goal of faster case review is legitimate, but convenience does not outweigh an unclear disclosure path."
  },
  {
    "id": "p1s3",
    "text": "Once notes leave the organisation, the vendor’s retention, training, access, and deletion rules become the confidentiality system—and uncertainty in any one is enough to pause."
  },
  {
    "id": "p2s1",
    "text": "For tomorrow, use a manual summary from the case lead, with direct identifiers (names, addresses, dates of birth) removed unless the meeting requires them."
  },
  {
    "id": "p2s2",
    "text": "Keep source notes in the approved system."
  },
  {
    "id": "p2s3",
    "text": "Circulate only the minimum summary needed for the decision, label it confidential, and record recipients."
  },
  {
    "id": "p2s4",
    "text": "This takes longer but remains a manageable safeguard."
  },
  {
    "id": "p3s1",
    "text": "Before any later pilot, require the service provider to answer a short checklist covering storage location; prompt retention; model training; staff and subcontractor access; deletion timing; breach notice; and the nonprofit’s required agreement (a data processing agreement, if applicable)."
  },
  {
    "id": "p3s2",
    "text": "If the provider can’t give clear, enforceable answers, the pilot stops—period."
  },
  {
    "id": "p3s3",
    "text": "A glossy “enterprise” label offers little control."
  },
  {
    "id": "p4s1",
    "text": "The next step is not to ban useful tools; it is to define a narrow approved use."
  },
  {
    "id": "p4s2",
    "text": "Start with synthetic or de-identified material (no live client histories), test output accuracy, restrict accounts, and assign an owner to review access and deletion."
  },
  {
    "id": "p4s3",
    "text": "A summariser may save time, yet it can also turn one sensitive file into a small bureaucratic vault with more keys than the nonprofit can supervise."
  },
  {
    "id": "p5s1",
    "text": "Our recommendation is simple: decline external AI use for these notes now, approve a limited pilot only after privacy and security review, and make human review mandatory."
  },
  {
    "id": "p5s2",
    "text": "At tomorrow’s meeting, ask for that decision in the minutes (one paragraph is enough), then assign an owner and deadline for vendor review."
  },
  {
    "id": "p5s3",
    "text": "Confidential intake records shouldn’t become a technology experiment by default."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

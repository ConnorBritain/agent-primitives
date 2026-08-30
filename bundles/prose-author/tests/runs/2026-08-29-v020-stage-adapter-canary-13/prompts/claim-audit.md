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
    "text": "For tomorrow’s meeting, the practical answer is no: do not put confidential intake notes into a general AI summarization service."
  },
  {
    "id": "p1s2",
    "text": "The promised benefit is real—faster review and cleaner handoffs—but the organization would be moving sensitive client histories into a system it doesn’t control."
  },
  {
    "id": "p2s1",
    "text": "That decision should change only if the service is approved for this use after a documented review."
  },
  {
    "id": "p2s2",
    "text": "Check the contract (not the marketing page), data-retention terms (including backups), training policy (whether prompts or outputs improve models), and access controls (who inside the vendor can see content)."
  },
  {
    "id": "p2s3",
    "text": "A vendor may call the service “private,” but that word isn’t enough."
  },
  {
    "id": "p2s4",
    "text": "Private under what contract, with what deletion deadline, and with what remedy after a breach?"
  },
  {
    "id": "p2s5",
    "text": "Those aren’t abstract details; they determine whether confidentiality survives the upload."
  },
  {
    "id": "p3s1",
    "text": "For tomorrow, recommend a temporary rule: staff may use AI only on notes stripped of names and every detail that could identify a client."
  },
  {
    "id": "p3s2",
    "text": "Even then, use invented or composite text when testing quality."
  },
  {
    "id": "p3s3",
    "text": "Redaction can fail—an unusual event, location, or family detail may identify someone without a name."
  },
  {
    "id": "p3s4",
    "text": "Staff must never paste raw notes into personal accounts, free tools, or any service the nonprofit hasn’t formally approved."
  },
  {
    "id": "p4s1",
    "text": "Then assign a short review before any pilot."
  },
  {
    "id": "p4s2",
    "text": "We should require a written data-processing agreement, no model training on submitted material, a defined retention and deletion schedule, role-based access, audit logs, breach notice, and confirmation that applicable confidentiality obligations are covered."
  },
  {
    "id": "p4s3",
    "text": "Someone should also test summaries for omissions and distortions (especially risk factors, consent limits, and requested services)."
  },
  {
    "id": "p5s1",
    "text": "The meeting decision is therefore specific: pause use with real intake notes, permit only sanitized testing under supervision, and return with a vetted vendor and written safeguards."
  },
  {
    "id": "p5s2",
    "text": "Convenience is useful."
  },
  {
    "id": "p5s3",
    "text": "It doesn’t outrank client trust."
  },
  {
    "id": "p5s4",
    "text": "That is exactly the firm line to hold tomorrow."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

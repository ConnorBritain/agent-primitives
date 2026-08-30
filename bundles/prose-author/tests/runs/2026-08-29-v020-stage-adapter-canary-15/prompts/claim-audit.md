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
    "text": "Confidential intake notes should not go into a general-purpose AI summariser."
  },
  {
    "id": "p1s2",
    "text": "The time saved is real, but the proposed shortcut creates a second problem: the service may receive sensitive information the nonprofit holds—names, histories, risks, and requests for help."
  },
  {
    "id": "p2s1",
    "text": "For tomorrow’s meeting, the recommendation is simple: pause any upload unless the service has passed a written privacy and security review (not a salesperson’s assurance)."
  },
  {
    "id": "p2s2",
    "text": "That review should confirm a contract covering data use (including model training), retention and deletion (including backups), and access controls (including subcontractors)."
  },
  {
    "id": "p2s3",
    "text": "It should also identify breach-notification duties, where the data is processed, and who can retrieve it."
  },
  {
    "id": "p2s4",
    "text": "If those answers aren’t documented, the answer isn’t “probably safe.”"
  },
  {
    "id": "p2s5",
    "text": "It is no."
  },
  {
    "id": "p3s1",
    "text": "A confidentiality promise does not settle the issue."
  },
  {
    "id": "p3s2",
    "text": "A vendor can promise discretion while keeping copies, permitting staff access, or using content in ways the organization hasn’t approved."
  },
  {
    "id": "p3s3",
    "text": "Intake files are a vault, not spare office paper."
  },
  {
    "id": "p3s4",
    "text": "Once duplicated outside the case system, control gets harder—and a later deletion request may not reach every copy."
  },
  {
    "id": "p4s1",
    "text": "There is a workable path."
  },
  {
    "id": "p4s2",
    "text": "First, check whether an approved case-management system already offers a suitable summarisation tool."
  },
  {
    "id": "p4s3",
    "text": "If summarisation is necessary, test de-identified sample notes, require approval from whoever owns privacy and security (and legal counsel if available), and limit the pilot to the minimum data and staff."
  },
  {
    "id": "p4s4",
    "text": "Human review remains mandatory; a summary can omit context that matters for safety or services."
  },
  {
    "id": "p5s1",
    "text": "The meeting decision should therefore be: no confidential notes in an unapproved AI service; authorize a vendor review and a sample-data pilot instead."
  },
  {
    "id": "p5s2",
    "text": "We can adopt useful automation without making clients pay for convenience with their privacy."
  },
  {
    "id": "p5s3",
    "text": "Until the contract, settings, and deletion process are verified, keep intake notes in the approved system."
  },
  {
    "id": "p5s4",
    "text": "Protect the relationship first, then test the tool with care."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

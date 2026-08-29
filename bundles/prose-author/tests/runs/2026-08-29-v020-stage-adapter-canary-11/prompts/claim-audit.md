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
    "text": "Using an AI service to summarise confidential intake notes has an obvious appeal: it could save staff time and make tomorrow’s meeting easier to prepare."
  },
  {
    "id": "p1s2",
    "text": "But the decision turns on control, not convenience."
  },
  {
    "id": "p1s3",
    "text": "Our recommendation is direct: do not paste those notes into a general-purpose service tomorrow."
  },
  {
    "id": "p2s1",
    "text": "Confidential intake notes may contain names, contact details, health information, legal concerns, or facts about family members (even when the final summary seems harmless)."
  },
  {
    "id": "p2s2",
    "text": "Once staff send that material outside the nonprofit, it’s no longer enough to say the tool is “private.”"
  },
  {
    "id": "p2s3",
    "text": "The provider’s actual terms, settings, retention rules, access controls, and deletion process matter—and they must be confirmed in writing."
  },
  {
    "id": "p3s1",
    "text": "Set a simple rule for the meeting: no confidential notes enter the service unless the nonprofit has approved it for that use."
  },
  {
    "id": "p3s2",
    "text": "Approval should require a written agreement barring model training on the notes, a defined retention and deletion period, encryption, access limited to authorised staff (with multi-factor authentication), and a clear process for correcting or removing records."
  },
  {
    "id": "p3s3",
    "text": "The service should not receive more detail than the summary genuinely needs."
  },
  {
    "id": "p4s1",
    "text": "Meanwhile, use a safer workflow: redact identifying details (names, addresses, case numbers, and unusual facts), then summarise locally from the redacted copy."
  },
  {
    "id": "p4s2",
    "text": "Better still, have a staff member produce the summary from a short template covering needs, risks, actions, and deadlines."
  },
  {
    "id": "p4s3",
    "text": "A summary is a map of the case—not a second vault holding everything the person disclosed."
  },
  {
    "id": "p5s1",
    "text": "If leadership still wants AI, pilot it only with fictional or de-identified notes (not live cases), and record who approved the tool, what data it may receive, and when the decision’s formally reviewed again."
  },
  {
    "id": "p5s2",
    "text": "Don’t let a vendor’s default settings become the nonprofit’s confidentiality policy."
  },
  {
    "id": "p5s3",
    "text": "Tomorrow’s practical decision is therefore narrow: pause use on real intake notes, adopt the redacted template now, and return with documented safeguards."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

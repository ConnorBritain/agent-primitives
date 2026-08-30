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
    "text": "For tomorrow’s meeting, the decision should be no: do not put confidential intake notes into an external AI summarization service unless the nonprofit has completed a documented privacy and security review and signed a contract that controls the data."
  },
  {
    "id": "p1s2",
    "text": "The promised benefit is legitimate (faster case review), but convenience doesn’t answer the central question: who can retain, inspect, reuse, or expose the notes?"
  },
  {
    "id": "p2s1",
    "text": "Start with the vendor’s written terms and data-processing agreement (not a sales page)."
  },
  {
    "id": "p2s2",
    "text": "Confirm that submitted text isn’t used to train models; access is limited to authorized personnel; retention and deletion periods are explicit; subprocessors are disclosed; and breach notice is prompt."
  },
  {
    "id": "p2s3",
    "text": "Require encryption in transit and storage (including backups), role-based access, audit logs, and a process for correcting summaries."
  },
  {
    "id": "p2s4",
    "text": "If the vendor won’t commit in writing, the review is over—the service should not receive the notes."
  },
  {
    "id": "p3s1",
    "text": "Even with contractual safeguards, test only with invented or fully de-identified records (never live client files)."
  },
  {
    "id": "p3s2",
    "text": "A summary can flatten uncertainty, omit a safety detail, or turn a tentative statement into a fact—the linguistic equivalent of filing a note in the wrong drawer."
  },
  {
    "id": "p3s3",
    "text": "Keep the original as the record, label the summary as machine-generated (with date and model version), and require a trained staff member to compare it against the source before anyone acts."
  },
  {
    "id": "p3s4",
    "text": "The tool may assist; it does not decide."
  },
  {
    "id": "p4s1",
    "text": "For the meeting, propose a narrow resolution: pause live-note use; assign the privacy lead and counsel to review the contract and confidentiality duties; run a de-identified pilot only after approval; and bring the results back to the executive director or board."
  },
  {
    "id": "p4s2",
    "text": "That’s not a ban."
  },
  {
    "id": "p4s3",
    "text": "It’s a controlled test with a stop button."
  },
  {
    "id": "p4s4",
    "text": "As an organization, we should choose client confidentiality over a shortcut and approve the service only when the vendor accepts enforceable limits and human review."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

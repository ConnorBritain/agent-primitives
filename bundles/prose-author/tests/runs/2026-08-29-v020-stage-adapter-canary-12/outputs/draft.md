```markdown
For tomorrow’s meeting, the answer should be no: do not put confidential intake notes into a general-purpose AI service now. Summarization sounds like clerical help, but the service must first receive the very information the nonprofit is obligated to protect—names, health details, immigration facts, family circumstances, and whatever else appears in a file. Convenience doesn’t change the custody problem.

A vendor’s promise that data is “secure” isn’t enough. The nonprofit needs written answers on retention (including backups), model training (including human review), access controls (including vendor staff), and deletion (including logs). It also needs a contract that covers confidentiality, breach notice, subcontractors, data location, and return or destruction of records. If any answer is vague, optional, or confined to a higher-priced plan, the service should not receive the notes. A locked filing cabinet is useful because access is controlled; an AI tool can’t become a cabinet with an unknown number of spare keys.

There is a workable path—just not by tomorrow. Start with a risk review, the nonprofit’s confidentiality duties, and the vendor’s terms. Require the smallest possible data set, remove identifiers where meaningful, set short retention, limit accounts by role, enable audit logs, and test with synthetic notes. We should also decide who checks each summary, because automation can omit context or flatten uncertainty. It won’t replace professional judgment.

For the meeting, propose a two-part decision: reject external processing of real notes for now, and authorize a review of either a contractually protected enterprise service or a local tool that keeps data under the nonprofit’s control. Until that review is complete, staff can draft summaries manually from a template and record only what the next worker needs. The executive director or privacy lead should own the decision and reject any rollout that begins with live records.
```

```json
{
  "schema": "voice-draft/1",
  "claims": [
    {
      "claim": "The nonprofit’s confidential intake files contain names, health details, immigration facts, and family circumstances.",
      "where": "paragraph 1"
    },
    {
      "claim": "A review-and-controls path can make AI summarization of confidential nonprofit intake notes practically workable.",
      "where": "paragraph 3"
    },
    {
      "claim": "Automated summarization can omit context or flatten uncertainty in source notes.",
      "where": "paragraph 3"
    },
    {
      "claim": "AI summarization will not replace the professional judgment needed when handling confidential intake notes.",
      "where": "paragraph 3"
    }
  ]
}
```

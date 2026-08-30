```markdown
For tomorrow’s meeting, the decision should be no: do not put confidential intake notes into an external AI summarization service unless the nonprofit has completed a documented privacy and security review and signed a contract that controls the data. The promised benefit is legitimate (faster case review), but convenience doesn’t answer the central question: who can retain, inspect, reuse, or expose the notes?

Start with the vendor’s written terms and data-processing agreement (not a sales page). Confirm that submitted text isn’t used to train models; access is limited to authorized personnel; retention and deletion periods are explicit; subprocessors are disclosed; and breach notice is prompt. Require encryption in transit and storage (including backups), role-based access, audit logs, and a process for correcting summaries. If the vendor won’t commit in writing, the review is over—the service should not receive the notes.

Even with contractual safeguards, test only with invented or fully de-identified records (never live client files). A summary can flatten uncertainty, omit a safety detail, or turn a tentative statement into a fact—the linguistic equivalent of filing a note in the wrong drawer. Keep the original as the record, label the summary as machine-generated (with date and model version), and require a trained staff member to compare it against the source before anyone acts. The tool may assist; it does not decide.

For the meeting, propose a narrow resolution: pause live-note use; assign the privacy lead and counsel to review the contract and confidentiality duties; run a de-identified pilot only after approval; and bring the results back to the executive director or board. That’s not a ban. It’s a controlled test with a stop button. As an organization, we should choose client confidentiality over a shortcut and approve the service only when the vendor accepts enforceable limits and human review.
```

```json
{
  "schema": "voice-draft/1",
  "omitted": [
    {
      "habit": "opponents-allies-sources / o11: name the company and test its outside claims against source materials",
      "why": "The request identifies no AI provider and supplies no vendor terms, reports, quotations, or other source materials to name or assess."
    }
  ],
  "claims": [
    {
      "claim": "Using an AI service to summarize intake notes can make case review faster.",
      "where": "paragraph 1"
    },
    {
      "claim": "AI-generated summaries can remove or understate uncertainty present in source notes.",
      "where": "paragraph 3"
    },
    {
      "claim": "AI-generated summaries can omit safety-relevant details from source notes.",
      "where": "paragraph 3"
    },
    {
      "claim": "AI-generated summaries can present tentative source statements as established facts.",
      "where": "paragraph 3"
    }
  ]
}
```

# Independent draft claim audit — m03

The request is the only supplied factual packet. The ledger and sentence labels are untrusted.
Audit every sentence against the closed ledger under the system prompt. Do not revise the prose or ledger.

## Request

Write a 650-word essay for a general civil-liberties audience arguing that digital access to public court records should not depend on expensive private databases. Use no headline or signoff.

## Closed claim ledger

```json
[
  {
    "id": "c1",
    "basis": "request-supported",
    "claim": "Digital access to public court records should not depend on expensive private databases.",
    "request_basis": "digital access to public court records should not depend on expensive private databases"
  }
]
```

## Sentence units

```json
[
  {
    "id": "p1s1",
    "text": "Digital access to public court records should not depend on expensive private databases.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c1"
    ]
  },
  {
    "id": "p1s2",
    "text": "At first glance, a paid database may look like a convenient answer to a public problem (one searchable interface, one account, one bill), but convenience is not the same thing as public access.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p1s3",
    "text": "If the record is public, the ability to find it cannot be treated as a luxury product.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p2s1",
    "text": "The stated purpose of online access is simple: people should be able to examine the work of courts without first passing through a private gatekeeper.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p2s2",
    "text": "That purpose gets lost when the practical route to a docket, an order, or a filing runs through a service priced for firms and institutions.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p2s3",
    "text": "A public record that cannot be meaningfully reached by the public is public in name only.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s1",
    "text": "This is not an argument against useful tools.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s2",
    "text": "Private databases may organize records well, add valuable search functions, and save time for professionals who can afford them (and for those who need specialized workflows).",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s3",
    "text": "But those services should sit on top of public access, not become the access.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p3s4",
    "text": "Otherwise, the market decides which court records are easy to inspect—and which remain effectively hidden.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s1",
    "text": "Who gets to know what a court has done when the answer depends on a subscription?",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s2",
    "text": "The answer will not be evenly distributed.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s3",
    "text": "Lawyers at large firms may have several ways to retrieve a document, while ordinary people, community groups, independent researchers, and journalists may encounter a price screen before they encounter the record itself.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s4",
    "text": "That is not a neutral inconvenience; it changes who can watch public power.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p5s1",
    "text": "We believe public institutions should make the basic record available in a form that people can actually use.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p5s2",
    "text": "That means reasonable digital search, clear navigation, accessible documents, and stable access (including for people who are not represented by counsel).",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p5s3",
    "text": "It also means that courts should not assume a private platform will solve the public's problem for them.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p5s4",
    "text": "A library does not become public merely because a private company sells a better card catalog.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p6s1",
    "text": "There is no good civil-liberties principle that makes transparency depend on purchasing power.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p6s2",
    "text": "A disclaimer does not magically eliminate the barrier, and a nominally free courthouse terminal does not answer the problem if meaningful access requires expensive tools elsewhere.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p6s3",
    "text": "The right to inspect public proceedings cannot be reduced to the ability to navigate a market that was built around professional users.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p7s1",
    "text": "We should treat court-record access as basic civic infrastructure, not as a premium research feature.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p7s2",
    "text": "Courts and lawmakers should require public-facing systems to provide the essential records directly, in usable formats, with safeguards for genuinely protected information (privacy matters, too).",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p7s3",
    "text": "Private databases can compete on speed, analysis, and additional services—but they should not control the doorway.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p7s4",
    "text": "If you care about open government, ask whether the public can reach the record without paying a toll.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p7s5",
    "text": "The answer should be yes.",
    "drafter_basis": "normative",
    "claim_ids": []
  }
]
```

Return voice-draft-claim-audit/2 as the strict object only. Preserve every ID
exactly once and in order. A keep decision must account for every clause without adding claims.

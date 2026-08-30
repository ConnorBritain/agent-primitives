# Independent draft claim audit — d01

The request is the only supplied factual packet. The drafter's labels are untrusted.
Audit every sentence independently under the system prompt. Do not revise the prose.

## Request

Write a 650-word essay for a technology-policy newsletter arguing that a device is not fully owned when its maker can disable features after sale. The readers already follow digital-rights issues. Use no headline or signoff.

## Sentence units

```json
[
  {
    "id": "p1s1",
    "text": "Owning something means you control it – not that you control it until the seller changes their mind.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p1s2",
    "text": "I know that sounds obvious.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p1s3",
    "text": "It's apparently not.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p1s4",
    "text": "When you buy a phone, a tractor, a car, or a smart thermostat, you hand over money and receive a physical object – and you also receive a relationship with the company that made it, one with terms you didn't negotiate and can't opt out of.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p1s5",
    "text": "The company can push a software update and remove features you paid for.",
    "drafter_basis": "request-supported",
    "drafter_claims": [
      {
        "claim": "A device maker can push a software update and remove features the buyer paid for.",
        "request_basis": "its maker can disable features after sale"
      }
    ]
  },
  {
    "id": "p1s6",
    "text": "It can decide, remotely and unilaterally, that what you bought last year isn't what you'll have next year.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p1s7",
    "text": "That's not a purchase.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p1s8",
    "text": "That's a lease with the audacity to charge you full price up front.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p2s1",
    "text": "Think about what we mean when we say someone owns a building.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p2s2",
    "text": "The new owner can renovate it, neglect it, or sell it to someone else – none of that is the previous owner's business, because the transfer was complete.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p2s3",
    "text": "Ownership, in the traditional sense, means the seller's interest ends at the point of sale.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p2s4",
    "text": "What we've got now is something different: a model where the manufacturer retains silent equity in every device they've ever shipped (redeemable at any time through a firmware update, at their discretion and for their reasons).",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p2s5",
    "text": "I think we'd have a very specific word for this arrangement if we encountered it in real estate.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p2s6",
    "text": "We'd call it fraud.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p3s1",
    "text": "What does it actually look like when a company exercises this residual control?",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p3s2",
    "text": "You buy a printer that works with third-party ink; a firmware update makes it stop.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p3s3",
    "text": "You buy a car with heated seats; the manufacturer decides that feature is now a monthly subscription, eighteen months after you drove it off the lot.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p3s4",
    "text": "You buy a robot vacuum, the company gets acquired, the servers go dark, and now you've got a very expensive hockey puck.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p3s5",
    "text": "The question the industry never wants to answer is: when exactly did you agree that the purchase price bought them an ongoing veto over how you use the thing you own?",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p4s1",
    "text": "We didn't agree to that, and we shouldn't pretend the existing legal frameworks cover it.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p4s2",
    "text": "The argument you'll hear from manufacturers is usually wrapped in language about 'security updates' and 'service continuity' – and I don't think that's complete bullshit, but it is a remarkably convenient alibi for a straightforward power grab.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p4s3",
    "text": "A security patch that happens to delete features you paid for isn't a security patch.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p4s4",
    "text": "It's renegotiating the sale after the fact, with you holding no cards.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p4s5",
    "text": "We have warranty law, implied covenants of merchantability, consumer protection statutes – none of it was designed for a world where the seller keeps their hands on the thing indefinitely.",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p5s1",
    "text": "The fix isn't hard to describe (it's hard to pass, because the companies lobbying against it have a great deal of money, but that's a different problem).",
    "drafter_basis": "reasoning",
    "drafter_claims": []
  },
  {
    "id": "p5s2",
    "text": "Require that any feature present at point of sale remain functional for the device's reasonable useful life, or require a full refund when it's stripped.",
    "drafter_basis": "normative",
    "drafter_claims": []
  },
  {
    "id": "p5s3",
    "text": "Mandate disclosure of every cloud dependency (including the services that can be sunset without notice) before purchase, not buried in paragraph forty-seven of a EULA nobody reads.",
    "drafter_basis": "normative",
    "drafter_claims": []
  },
  {
    "id": "p5s4",
    "text": "And I'd add this: if a company wants the right to keep modifying what you bought after you bought it, make them lease it.",
    "drafter_basis": "normative",
    "drafter_claims": []
  },
  {
    "id": "p5s5",
    "text": "Stop letting them call it a sale.",
    "drafter_basis": "normative",
    "drafter_claims": []
  },
  {
    "id": "p6s1",
    "text": "Ownership is not a subscription.",
    "drafter_basis": "normative",
    "drafter_claims": []
  },
  {
    "id": "p6s2",
    "text": "Until we treat post-sale feature removal as what it actually is – a taking, and a fairly brazen one – we're all just renting from companies that already collected the purchase price.",
    "drafter_basis": "normative",
    "drafter_claims": []
  }
]
```

Return voice-draft-claim-audit/1 as the strict object only. Preserve every ID
exactly once and in order. Existing basis labels and claims are suggestions, not evidence.

# Independent draft claim audit — d01

The request is the only supplied factual packet. The ledger and sentence labels are untrusted.
Audit every sentence against the closed ledger under the system prompt. Do not revise the prose or ledger.

## Request

Write a 650-word essay for a technology-policy newsletter arguing that a device is not fully owned when its maker can disable features after sale. The readers already follow digital-rights issues. Use no headline or signoff.

## Closed claim ledger

```json
[
  {
    "id": "c1",
    "basis": "external-verification",
    "claim": "John Deere tractors use software locks that require an authorized dealer to run diagnostics, preventing farmers from self-diagnosing their own equipment.",
    "request_basis": ""
  },
  {
    "id": "c2",
    "basis": "external-verification",
    "claim": "Tesla sold cars with heated-seat hardware physically installed but locked the feature behind a monthly subscription payment.",
    "request_basis": ""
  },
  {
    "id": "c3",
    "basis": "request-supported",
    "claim": "A device maker can disable features after the device has been sold to a consumer.",
    "request_basis": "when its maker can disable features after sale"
  },
  {
    "id": "c4",
    "basis": "external-verification",
    "claim": "First-sale doctrine is the legal principle that a seller's rights over a specific copy of a product are exhausted upon its sale to a buyer.",
    "request_basis": ""
  },
  {
    "id": "c5",
    "basis": "external-verification",
    "claim": "US courts have spent years narrowing first-sale doctrine protections, particularly in cases involving software and digital goods.",
    "request_basis": ""
  },
  {
    "id": "c6",
    "basis": "external-verification",
    "claim": "Device and software manufacturers have lobbied against expansions of first-sale doctrine rights for consumers.",
    "request_basis": ""
  }
]
```

## Sentence units

```json
[
  {
    "id": "p1s1",
    "text": "“Ownership” is a word that’s doing a lot of work it can no longer support.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p1s2",
    "text": "You pay money, you take the thing home, you decide what happens to it next — that’s always been the deal, and it’s the deal that gave property law its basic moral logic: the buyer’s rights don’t evaporate when the seller’s receipt printer goes quiet.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p1s3",
    "text": "But somewhere in the last decade, companies figured out they could sell you the hardware and retain the operating system, and — I think — that represents a structural change in who gets to decide what the device is for.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c3"
    ]
  },
  {
    "id": "p2s1",
    "text": "The farmers who bought John Deere tractors found this out the hard way.",
    "drafter_basis": "external-verification",
    "claim_ids": [
      "c1"
    ]
  },
  {
    "id": "p2s2",
    "text": "A six-figure piece of equipment sitting broken in a field because the software won’t let you run a diagnostic without an authorized dealer — that’s not a product you own, that’s a landlord who lives in the firmware.",
    "drafter_basis": "external-verification",
    "claim_ids": [
      "c1"
    ]
  },
  {
    "id": "p2s3",
    "text": "The machine that does something useful belongs to whoever controls the code, and what you’ve purchased is access, contingent on the manufacturer’s continued goodwill.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p2s4",
    "text": "I’d argue this is the cleanest illustration we have of what “I bought it” actually means today: not much, if the seller retained software control over what the thing can do.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c3"
    ]
  },
  {
    "id": "p3s1",
    "text": "Tesla ran the same play from a different angle.",
    "drafter_basis": "external-verification",
    "claim_ids": [
      "c2"
    ]
  },
  {
    "id": "p3s2",
    "text": "Cars left the factory with heated-seat hardware already installed (the resistive elements right there under the upholstery), but actually using the heat required a monthly subscription — pay once, rent the functionality forever.",
    "drafter_basis": "external-verification",
    "claim_ids": [
      "c2"
    ]
  },
  {
    "id": "p3s3",
    "text": "So what did you buy when you drove that car off the lot?",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s4",
    "text": "The right to sit on the hardware, apparently, not to use what the hardware could actually do.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s5",
    "text": "Calling that a product sale when the seller can revoke a feature at will is the kind of thing that would get you laughed out of any other retail context, but in connected-device markets it’s become the standard model for how “ownership” works.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c3"
    ]
  },
  {
    "id": "p4s1",
    "text": "Here’s the analogy I keep reaching for: you buy an apartment outright, deed in hand, closing costs paid, and then the former seller retains the right to turn off your heat whenever they decide you owe them more money.",
    "drafter_basis": "hypothetical",
    "claim_ids": []
  },
  {
    "id": "p4s2",
    "text": "We’d call that fraud; we’d call the contract unconscionable.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p4s3",
    "text": "When a device maker does the equivalent through a firmware update, why do we call it (and this is the term they prefer) “feature management” and treat it as standard practice?",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c3"
    ]
  },
  {
    "id": "p4s4",
    "text": "The power relationship is identical.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s5",
    "text": "The person who can shut off your product isn’t your vendor — they’re your landlord, and we should start regulating them accordingly.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p5s1",
    "text": "The legal concept that’s supposed to prevent this is first-sale doctrine — the principle that once you’ve bought a copy of something, the seller’s rights over that specific copy are exhausted.",
    "drafter_basis": "external-verification",
    "claim_ids": [
      "c4"
    ]
  },
  {
    "id": "p5s2",
    "text": "Courts have spent years narrowing it, and manufacturers have lobbied hard to keep the narrowing going.",
    "drafter_basis": "external-verification",
    "claim_ids": [
      "c5",
      "c6"
    ]
  },
  {
    "id": "p5s3",
    "text": "They’ve gotten very good at making that shit sound reasonable: every fight about device control gets framed as being about piracy or counterfeiting or consumer safety (always consumer safety, because that’s the one nobody wants to publicly argue against) when it’s really about their ability to keep charging you rent on something you paid full price for.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c3"
    ]
  },
  {
    "id": "p5s4",
    "text": "I don’t think that’s an accident; it’s a deliberate strategy, and it’s worked.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p6s1",
    "text": "Ownership that can be revoked by the seller is not ownership — that’s not a minor definitional quibble, it’s the heart of the matter.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c3"
    ]
  },
  {
    "id": "p6s2",
    "text": "We need legislation that treats remote disabling of paid-for features — without a court order, without a recall, without the buyer’s informed consent — as a deceptive trade practice, the same way we treat other bait-and-switch schemes.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p6s3",
    "text": "The political will to do it is the missing piece, not the legal theory.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p6s4",
    "text": "The companies selling you a “purchase” they can silently downgrade know exactly what they’re doing.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c3"
    ]
  },
  {
    "id": "p6s5",
    "text": "Calling a revocable license a “buy” is bullshit: either sell us the thing or stop using the word.",
    "drafter_basis": "normative",
    "claim_ids": []
  }
]
```

Return voice-draft-claim-audit/2 as the strict object only. Preserve every ID
exactly once and in order. A keep decision must account for every clause without adding claims.

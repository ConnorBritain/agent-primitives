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
    "basis": "request-supported",
    "claim": "A device maker can disable features on a device after the device has been sold to a consumer.",
    "request_basis": "when its maker can disable features after sale"
  }
]
```

## Sentence units

```json
[
  {
    "id": "p1s1",
    "text": "Ownership is the right to control a thing.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p1s2",
    "text": "Not the right to use it while its maker approves of how you're using it, not the right to possess it until a terms-of-service update reshuffles the deal–but the right to control it, full stop.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p1s3",
    "text": "When a company can reach into a device you paid for and disable a feature, what you've got isn't ownership.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c1"
    ]
  },
  {
    "id": "p1s4",
    "text": "It's a rental with extra steps, and the rent's already been collected.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p2s1",
    "text": "Think about what it means to buy a car.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p2s2",
    "text": "You hand over money, you get a title, and after that the dealership doesn't get a vote on whether you put in an aftermarket stereo.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p2s3",
    "text": "If the dealer showed up in your driveway and disconnected your radio (because the manufacturer decided it was a liability, say), we'd call that vandalism–we'd call it theft.",
    "drafter_basis": "hypothetical",
    "claim_ids": []
  },
  {
    "id": "p2s4",
    "text": "But when your phone's maker sends an update that quietly locks the camera features you paid for, or when your tractor's software stops recognizing the parts your mechanic installed, we call it \"ecosystem management\" (a phrase that earns scare quotes every single time).",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c1"
    ]
  },
  {
    "id": "p2s5",
    "text": "The physical analogy makes the legal sleight-of-hand obvious: the companies are doing the same thing the dealer would be doing, just at a distance and with better lawyers.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s1",
    "text": "I think the piece that's hardest to swallow is how we got here incrementally.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p3s2",
    "text": "We accepted software licenses that said the company owned the code even when we owned the disc.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s3",
    "text": "Then we accepted devices that phoned home.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s4",
    "text": "Then we accepted that features could be gated behind subscriptions.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s5",
    "text": "Each step seemed like a small concession to convenience, and now we're looking at a landscape where paying full retail price for a device doesn't tell you what the device will do next year.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p3s6",
    "text": "The purchase price bought you access to the manufacturer's current intentions, nothing more.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s1",
    "text": "The word the industry prefers is \"connected\"–your device is connected, your car is connected, your thermostat is connected.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s2",
    "text": "What \"connected\" means in practice is that the manufacturer retained a permanent administrative override on hardware you carry in your pocket.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c1"
    ]
  },
  {
    "id": "p4s3",
    "text": "I keep coming back to this: you didn't buy a thing, you bought into an ongoing relationship with an entity that can change the terms whenever it decides to.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s4",
    "text": "That's a service agreement with an upfront fee designed to feel like a sale.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p4s5",
    "text": "It is not a sale.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p5s1",
    "text": "Here's the test that cuts through it: if the company goes bankrupt tomorrow, what do you have?",
    "drafter_basis": "hypothetical",
    "claim_ids": []
  },
  {
    "id": "p5s2",
    "text": "If the honest answer is \"a brick\" or \"a device missing half its features,\" then you were never the owner–you were the lessee of a running service.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p5s3",
    "text": "Ownership survives the death of the seller.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p5s4",
    "text": "Rental doesn't.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p6s1",
    "text": "We've built policy frameworks that let this happen because we treated software control as categorically different from physical control.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p6s2",
    "text": "When a manufacturer can disable the heated seats you paid for unless you subscribe to a monthly plan, that's an extraction–taking back something you already bought, then charging you again to get it.",
    "drafter_basis": "request-supported",
    "claim_ids": [
      "c1"
    ]
  },
  {
    "id": "p6s3",
    "text": "We should be treating it like fraud.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p6s4",
    "text": "We should have rules that say: if you sell a hardware feature, you've sold it, and no subsequent software update can revoke that sale.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p7s1",
    "text": "I'm not describing a hard problem.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p7s2",
    "text": "Property law has handled analogous cases for centuries: you can't sell someone a house and then retain the right to lock certain rooms, and you can't sell a tool and then disable it remotely (at least not without legal consequences we'd recognize immediately as serious).",
    "drafter_basis": "reasoning",
    "claim_ids": []
  },
  {
    "id": "p7s3",
    "text": "I think the only reason device makers can do this shit is that we let them write the licenses that substituted for laws while regulators looked away.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p8s1",
    "text": "The device is yours when you can do what you want with it.",
    "drafter_basis": "normative",
    "claim_ids": []
  },
  {
    "id": "p8s2",
    "text": "Until then, you're just holding it for them.",
    "drafter_basis": "reasoning",
    "claim_ids": []
  }
]
```

Return voice-draft-claim-audit/2 as the strict object only. Preserve every ID
exactly once and in order. A keep decision must account for every clause without adding claims.

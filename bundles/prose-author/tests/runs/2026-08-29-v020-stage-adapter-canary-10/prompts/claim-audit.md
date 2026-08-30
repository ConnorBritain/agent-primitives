# Independent draft claim audit — stage-canary

The request is the only supplied factual packet. The drafter supplied prose, not factual certification.
Audit every deterministic sentence unit under the system prompt. Do not revise the prose.

## Request

Write a 650-word essay for a technology-policy newsletter arguing that a device is not fully owned when its maker can disable features after sale. The readers already follow digital-rights issues. Use no headline or signoff.

## Sentence units

```json
[
  {
    "id": "p1s1",
    "text": "A device isn’t fully yours if the company that sold it can reach into it later and withdraw a function."
  },
  {
    "id": "p1s2",
    "text": "If you buy a machine with a camera, a battery, or a radio, the maker’s continuing power to switch off that component changes the character of the sale."
  },
  {
    "id": "p1s3",
    "text": "You received possession, but the maker retained a veto."
  },
  {
    "id": "p1s4",
    "text": "I use “ownership” for control that survives the seller’s change of mind (and its next quarterly target)."
  },
  {
    "id": "p2s1",
    "text": "The mechanism is remote authority disguised as product maintenance."
  },
  {
    "id": "p2s2",
    "text": "A server checks an entitlement, firmware obeys a command, or an account decides whether hardware in your hand may still do yesterday’s job."
  },
  {
    "id": "p2s3",
    "text": "The same channel can deliver a useful repair (a real benefit, on its face) and enforce a new restriction."
  },
  {
    "id": "p2s4",
    "text": "That dual use doesn’t settle the ownership question; it creates it."
  },
  {
    "id": "p2s5",
    "text": "Who has the final say when your interests and the manufacturer’s diverge?"
  },
  {
    "id": "p2s6",
    "text": "Follow the command path, and you’ll find the owner."
  },
  {
    "id": "p3s1",
    "text": "Imagine a workshop where you own the lathe, but the former seller keeps a key to its control cabinet."
  },
  {
    "id": "p3s2",
    "text": "You may paint it, move it, lend it, even sell it; yet when the seller dislikes your payment status or business model, the spindle stops."
  },
  {
    "id": "p3s3",
    "text": "That isn’t a maintenance relationship."
  },
  {
    "id": "p3s4",
    "text": "It is a landlord relationship wearing a sales receipt – the deed says “yours” while the master key stays elsewhere."
  },
  {
    "id": "p3s5",
    "text": "Once you’ve seen that split, software jargon can’t make it disappear."
  },
  {
    "id": "p4s1",
    "text": "A manufacturer may answer that the customer accepted a license, that remote controls deter abuse, or that continued service costs money."
  },
  {
    "id": "p4s2",
    "text": "Each point can be true in a narrow case."
  },
  {
    "id": "p4s3",
    "text": "None converts a revocable capability into property."
  },
  {
    "id": "p4s4",
    "text": "If a promised function depends on continuing permission from the seller, say so at the till: you’re renting that function (perhaps for the life of an account)."
  },
  {
    "id": "p4s5",
    "text": "Calling the arrangement “ownership” after hiding the revocation power in a clickwrap is bullshit with a serial number."
  },
  {
    "id": "p4s6",
    "text": "I don’t object to services; I object to smuggling a service relationship into a sale."
  },
  {
    "id": "p5s1",
    "text": "Technology policy should begin with this distinction."
  },
  {
    "id": "p5s2",
    "text": "We can permit remote service without granting permanent remote dominion."
  },
  {
    "id": "p5s3",
    "text": "Require affirmative disclosure before sale, local operation for paid functions, and a way to restore essential capabilities when a vendor closes an account or abandons a server."
  },
  {
    "id": "p5s4",
    "text": "Where disabling is necessary for safety, the scope should be specific, reviewable, and tied to the hazard – a fire brake behind glass, rather than a master switch in somebody else’s office."
  },
  {
    "id": "p5s5",
    "text": "We shouldn’t confuse the ability to patch your device with a title to govern it."
  },
  {
    "id": "p6s1",
    "text": "This matters beyond one missing feature."
  },
  {
    "id": "p6s2",
    "text": "Remote revocation turns every sale into a continuing negotiation in which only one side controls the machinery."
  },
  {
    "id": "p6s3",
    "text": "It weakens repair, resale, preservation, and the ordinary expectation that paid goods remain useful."
  },
  {
    "id": "p6s4",
    "text": "We bear those costs as buyers, but independent repairers and secondhand owners bear them differently (and often sooner)."
  },
  {
    "id": "p6s5",
    "text": "I think that difference matters: solidarity gets mushy when “we” conceals who has the kill switch and who wakes up holding dead hardware."
  },
  {
    "id": "p7s1",
    "text": "Here is the practical test."
  },
  {
    "id": "p7s2",
    "text": "Disconnect the vendor, stop the subscription, or transfer the device to another person."
  },
  {
    "id": "p7s3",
    "text": "What remains under your control?"
  },
  {
    "id": "p7s4",
    "text": "If the answer excludes hardware you paid for, you have encountered a conditional tenancy – even if the box arrived with a purchase price."
  },
  {
    "id": "p7s5",
    "text": "That test won’t resolve every edge case, but it exposes the governing power without getting lost in contract labels."
  },
  {
    "id": "p8s1",
    "text": "The clean rule is neither anti-software nor anti-service."
  },
  {
    "id": "p8s2",
    "text": "It is anti-bait-and-switch."
  },
  {
    "id": "p8s3",
    "text": "If the seller wants an ongoing right to remove capability, the transaction should be labeled and priced as a rental, subscription, or managed service."
  },
  {
    "id": "p8s4",
    "text": "If the seller calls it a sale, control of paid functions should pass with the object."
  },
  {
    "id": "p8s5",
    "text": "We don’t need mystical definitions of ownership; we need the receipt, the firmware, and the practical power to tell the same story."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

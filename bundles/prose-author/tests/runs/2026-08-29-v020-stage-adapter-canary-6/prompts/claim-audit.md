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
    "text": "Ownership is the promise that a thing remains yours after the money changes hands."
  },
  {
    "id": "p1s2",
    "text": "If the maker can reach into that thing later and disable a feature, then you bought a device with a landlord hiding inside it."
  },
  {
    "id": "p1s3",
    "text": "The landlord might be polite, automated, and represented by a screen that says “service unavailable,” but the arrangement is still bullshit."
  },
  {
    "id": "p2s1",
    "text": "You can call this a licensing model, a service relationship, or a product with continuing support."
  },
  {
    "id": "p2s2",
    "text": "Those labels describe the maker’s interests."
  },
  {
    "id": "p2s3",
    "text": "They don’t answer the buyer’s question: what, exactly, did your money purchase?"
  },
  {
    "id": "p2s4",
    "text": "If a feature worked when you bought the device and the maker can remove it afterward, your ownership has a hole in it (and the hole is controlled by somebody else)."
  },
  {
    "id": "p3s1",
    "text": "There are plenty of reasons a maker might want this power."
  },
  {
    "id": "p3s2",
    "text": "A company might want to change a product’s behavior, respond to a security problem, or end a service that has become expensive."
  },
  {
    "id": "p3s3",
    "text": "I think some of those reasons are real."
  },
  {
    "id": "p3s4",
    "text": "They still don’t settle the central issue, because a reasonable explanation for taking control isn’t the same thing as a right to take control."
  },
  {
    "id": "p4s1",
    "text": "Consider the ordinary shape of a sale."
  },
  {
    "id": "p4s2",
    "text": "You inspect the thing, decide what it does, pay for it, and take it home."
  },
  {
    "id": "p4s3",
    "text": "The maker’s role changes at that point – from seller to somebody who may offer repairs, updates, or new products."
  },
  {
    "id": "p4s4",
    "text": "If the maker can later decide that one of the device’s functions has expired, then the sale never completed in the ordinary sense."
  },
  {
    "id": "p4s5",
    "text": "It became a subscription with a large one-time payment and a small-print trapdoor (a feature, a service, a relationship)."
  },
  {
    "id": "p5s1",
    "text": "What happens to your risk?"
  },
  {
    "id": "p5s2",
    "text": "You’ve paid the price, but we’re left carrying the uncertainty."
  },
  {
    "id": "p5s3",
    "text": "You can maintain the device carefully and follow every instruction, yet your control depends on a decision made elsewhere."
  },
  {
    "id": "p5s4",
    "text": "Our physical possession becomes a kind of stage prop: it looks like ownership from across the room, while the meaningful authority lives in a server, an account, or a policy you can’t change."
  },
  {
    "id": "p6s1",
    "text": "The usual reply is that you agreed to the terms."
  },
  {
    "id": "p6s2",
    "text": "Maybe you did."
  },
  {
    "id": "p6s3",
    "text": "But did you have a meaningful choice?"
  },
  {
    "id": "p6s4",
    "text": "Could you buy the device with the same features and without the remote switch?"
  },
  {
    "id": "p6s5",
    "text": "Could you repair the software, preserve the function, or keep using the thing after the maker loses interest?"
  },
  {
    "id": "p6s6",
    "text": "If the answer is no, then the agreement describes a condition of access, not a genuine transfer of control."
  },
  {
    "id": "p7s1",
    "text": "This distinction matters even when the disabled feature seems minor."
  },
  {
    "id": "p7s2",
    "text": "A company can remove a convenience today and a necessary function tomorrow."
  },
  {
    "id": "p7s3",
    "text": "You might say that nobody would buy a device under those conditions, but people often learn the condition only after the purchase."
  },
  {
    "id": "p7s4",
    "text": "The surprise isn’t an accident in the consumer’s understanding; it’s the predictable result of calling a controlled service a product."
  },
  {
    "id": "p8s1",
    "text": "We should require makers to say what power they retain, when they can use it, and what happens afterward."
  },
  {
    "id": "p8s2",
    "text": "More importantly, we should treat durable functionality as part of the thing sold."
  },
  {
    "id": "p8s3",
    "text": "A device that can be remotely diminished is a different device from the one you examined at the register, even if the casing, battery, and marketing copy look identical."
  },
  {
    "id": "p9s1",
    "text": "I’m not arguing that every update must preserve every behavior forever."
  },
  {
    "id": "p9s2",
    "text": "I’m arguing for a boundary: the maker can improve what you own, but it shouldn’t be able to revoke the substance of the sale."
  },
  {
    "id": "p9s3",
    "text": "My objection is practical as much as philosophical."
  },
  {
    "id": "p9s4",
    "text": "When you buy a thing, you should receive control proportionate to the price, the promise, and the ordinary meaning of “buy.”"
  },
  {
    "id": "p10s1",
    "text": "We can keep pretending that possession is ownership, or we can describe the arrangement honestly."
  },
  {
    "id": "p10s2",
    "text": "If your device can be switched off piece by piece after sale, then your purchase has handed someone else the keys."
  },
  {
    "id": "p10s3",
    "text": "Give the keys back."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

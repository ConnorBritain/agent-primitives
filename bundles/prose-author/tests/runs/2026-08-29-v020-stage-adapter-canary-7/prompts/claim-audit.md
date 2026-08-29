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
    "text": "A device isn’t fully owned if the company that sold it can reach through the sale and switch off what you bought."
  },
  {
    "id": "p1s2",
    "text": "That sounds like a technical dispute about licenses, firmware, or server access."
  },
  {
    "id": "p1s3",
    "text": "It isn’t."
  },
  {
    "id": "p1s4",
    "text": "It’s a dispute about whether ownership means control, or merely permission that can be revoked by somebody else."
  },
  {
    "id": "p2s1",
    "text": "You can hold the phone, tractor, car, camera, or medical device in your hands."
  },
  {
    "id": "p2s2",
    "text": "You can pay the invoice, insure it, repair it, and pass it to somebody you trust."
  },
  {
    "id": "p2s3",
    "text": "Yet if a remote command can remove a feature after the transaction, your control is conditional."
  },
  {
    "id": "p2s4",
    "text": "The device has a second owner, invisible and very much alive, sitting in a corporate control room."
  },
  {
    "id": "p3s1",
    "text": "Of course, makers have legitimate reasons to patch security flaws, correct dangerous defects, and stop an abusive use of their networks."
  },
  {
    "id": "p3s2",
    "text": "We shouldn’t confuse a safety update with a company’s power to withdraw a promised capability."
  },
  {
    "id": "p3s3",
    "text": "The question is narrower: when a feature was part of the product you chose and paid for, what gives the seller the right to make it disappear?"
  },
  {
    "id": "p4s1",
    "text": "The usual answer is that you didn’t buy the feature."
  },
  {
    "id": "p4s2",
    "text": "You bought access to software, and access remains subject to the terms you accepted."
  },
  {
    "id": "p4s3",
    "text": "But that answer turns an ordinary purchase into a subscription without using the word subscription."
  },
  {
    "id": "p4s4",
    "text": "It makes the customer responsible for the price and the risk while reserving the decisive power for the maker."
  },
  {
    "id": "p5s1",
    "text": "Imagine buying a set of tools whose handles are fitted with locks."
  },
  {
    "id": "p5s2",
    "text": "The tools work when the manufacturer approves your account; they stop working when the manufacturer changes its business plan."
  },
  {
    "id": "p5s3",
    "text": "You still own the metal, the case, and the receipt."
  },
  {
    "id": "p5s4",
    "text": "You just can’t use the thing for the purpose that made it valuable."
  },
  {
    "id": "p5s5",
    "text": "That isn’t ownership in any meaningful consumer sense."
  },
  {
    "id": "p5s6",
    "text": "It’s a hostage situation with better branding."
  },
  {
    "id": "p6s1",
    "text": "I think this matters even when the maker says most customers will never notice."
  },
  {
    "id": "p6s2",
    "text": "Ownership isn’t measured by how often a power is exercised."
  },
  {
    "id": "p6s3",
    "text": "A landlord who rarely enters your apartment without permission still has a different relationship to the space than a company that can enter whenever it likes."
  },
  {
    "id": "p6s4",
    "text": "We understand this instinctively in physical property, but we’ve allowed software to smuggle the exception into every room."
  },
  {
    "id": "p7s1",
    "text": "And what happens when the company is sold, goes bankrupt, abandons a product, or decides that a new business model is more profitable?"
  },
  {
    "id": "p7s2",
    "text": "You may have done everything right and still lose the feature because the institution controlling it changed hands."
  },
  {
    "id": "p7s3",
    "text": "The device doesn’t become less real."
  },
  {
    "id": "p7s4",
    "text": "Your ownership becomes less real."
  },
  {
    "id": "p8s1",
    "text": "Sure, a maker can say that remote control protects the ecosystem."
  },
  {
    "id": "p8s2",
    "text": "But an ecosystem that depends on permanent obedience isn’t a community; it’s a dependency."
  },
  {
    "id": "p8s3",
    "text": "If your car’s heated seats, your camera’s processing mode, or your equipment’s basic function can be disabled from afar, you’re not buying a finished object."
  },
  {
    "id": "p8s4",
    "text": "You’re renting a temporary arrangement of permissions, and the damn receipt is camouflage."
  },
  {
    "id": "p9s1",
    "text": "We should write the rule plainly: a sale transfers meaningful control."
  },
  {
    "id": "p9s2",
    "text": "A maker may fix security problems, but it shouldn’t be able to revoke ordinary functionality merely because it can."
  },
  {
    "id": "p9s3",
    "text": "You should be able to keep using the product you bought, maintain it, and transfer it without asking a distant server for permission."
  },
  {
    "id": "p9s4",
    "text": "I can accept limits that protect other people from concrete harm; I can’t accept a definition of ownership that excludes the owner."
  },
  {
    "id": "p10s1",
    "text": "The point isn’t nostalgia for gadgets that never change."
  },
  {
    "id": "p10s2",
    "text": "It’s a demand that change remain accountable to the person who paid for the thing."
  },
  {
    "id": "p10s3",
    "text": "When you buy a device, you’re buying a piece of the world that should answer to you."
  },
  {
    "id": "p10s4",
    "text": "If it can be switched off after sale, then the sale transferred possession, not ownership."
  },
  {
    "id": "p10s5",
    "text": "We ought to stop calling that ownership until the maker has surrendered the switch."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

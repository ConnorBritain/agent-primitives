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
    "text": "The thing in your hand may be expensive, ingenious, and very nearly yours."
  },
  {
    "id": "p1s2",
    "text": "But if its maker can reach through the network and switch off a feature you paid for, what you own is less like a tool than a rented room in somebody else’s building."
  },
  {
    "id": "p2s1",
    "text": "That distinction matters because ownership isn’t merely the right to possess an object while it behaves according to someone else’s permission."
  },
  {
    "id": "p2s2",
    "text": "Ownership means you can use the thing, maintain it, modify it, and decide what it does within the bounds of law."
  },
  {
    "id": "p2s3",
    "text": "You don’t need the maker’s continuing blessing every time you press a button."
  },
  {
    "id": "p2s4",
    "text": "We understand this instinctively with a bicycle, a refrigerator, or a book."
  },
  {
    "id": "p2s5",
    "text": "The manufacturer’s business ends at the sale, even if the warranty and support contract continue."
  },
  {
    "id": "p3s1",
    "text": "Connected devices complicate that old boundary."
  },
  {
    "id": "p3s2",
    "text": "A phone, car, camera, or household appliance can contain software that performs a purchased function, while the maker retains a switch that can disable it."
  },
  {
    "id": "p3s3",
    "text": "Sometimes the switch exists for safety or legal compliance (those cases deserve careful rules)."
  },
  {
    "id": "p3s4",
    "text": "Sometimes it exists because the company wants to change its product strategy."
  },
  {
    "id": "p3s5",
    "text": "Those cases aren’t the same – we shouldn’t pretend they are."
  },
  {
    "id": "p4s1",
    "text": "The usual defense is that you agreed to the terms."
  },
  {
    "id": "p4s2",
    "text": "Sure, you clicked through a license, and maybe the license says the feature can be withdrawn."
  },
  {
    "id": "p4s3",
    "text": "But a contract can describe a relationship without making the relationship fair."
  },
  {
    "id": "p4s4",
    "text": "If a shop sold you a lamp and reserved the right to remove its light whenever the shop changed its mind, you’d call that bullshit."
  },
  {
    "id": "p4s5",
    "text": "The software version sounds more respectable only because the switch is invisible (and because the legal language is designed to make your eyes slide away)."
  },
  {
    "id": "p5s1",
    "text": "What happens to your choice?"
  },
  {
    "id": "p5s2",
    "text": "You’ve paid the price, arranged your life around the function, and perhaps built other purchases around it."
  },
  {
    "id": "p5s3",
    "text": "Then a server-side decision turns a working capability into a dead icon."
  },
  {
    "id": "p5s4",
    "text": "You can’t repair the decision with a screwdriver, because the thing that broke isn’t sitting in your house."
  },
  {
    "id": "p5s5",
    "text": "It’s sitting in a system you don’t control, operated by a firm that may be thousands of miles away."
  },
  {
    "id": "p6s1",
    "text": "I think this is the central policy question: when does a software-dependent feature become part of the owned device?"
  },
  {
    "id": "p6s2",
    "text": "My answer is that the label shouldn’t decide it."
  },
  {
    "id": "p6s3",
    "text": "The practical test is what you were told you were buying, what you paid for, and whether the maker can later revoke it without your consent."
  },
  {
    "id": "p6s4",
    "text": "A feature called a service, subscription, or enhancement can still be part of the bargain (especially when the advertising presents it as a reason to buy the device)."
  },
  {
    "id": "p6s5",
    "text": "What matters is the power to take it away."
  },
  {
    "id": "p7s1",
    "text": "We’re not arguing that every device must run forever under every circumstance."
  },
  {
    "id": "p7s2",
    "text": "A dangerous defect may require a recall; a court order may require a change; a security failure may demand urgent action (though even then, the remedy should be narrow and explainable)."
  },
  {
    "id": "p7s3",
    "text": "But those exceptional powers should be bounded."
  },
  {
    "id": "p7s4",
    "text": "They shouldn’t become a blank check for redesigning the bargain after the money has changed hands."
  },
  {
    "id": "p8s1",
    "text": "You should also be able to keep using a device when its maker abandons it."
  },
  {
    "id": "p8s2",
    "text": "If a company shuts down the server that a product needs, the law should favor an offline mode, published interfaces, or tools that let you migrate."
  },
  {
    "id": "p8s3",
    "text": "We can require documentation and interoperability, just as we require access to replacement parts in other markets."
  },
  {
    "id": "p8s4",
    "text": "We can give users the right to inspect, repair, and preserve the software that makes a purchased feature work – including the tools needed to keep a lawful device useful."
  },
  {
    "id": "p9s1",
    "text": "The stakes aren’t only sentimental."
  },
  {
    "id": "p9s2",
    "text": "A remote switch changes who holds power after the sale."
  },
  {
    "id": "p9s3",
    "text": "It lets the maker convert a durable object into a continuing claim on your attention, money, and obedience."
  },
  {
    "id": "p9s4",
    "text": "You may own the shell, but the company owns the conditions under which the shell remains useful."
  },
  {
    "id": "p9s5",
    "text": "That’s possession with a leash (and a leash is still a form of control)."
  },
  {
    "id": "p10s1",
    "text": "I don’t want a world where every update is treated as theft or every manufacturer is presumed malicious."
  },
  {
    "id": "p10s2",
    "text": "I want a rule that makes the burden visible: if you sell a feature as part of a device, you can’t quietly reserve the right to take it back."
  },
  {
    "id": "p10s3",
    "text": "We should write that rule into consumer law, repair law, and competition policy."
  },
  {
    "id": "p10s4",
    "text": "Otherwise the next thing you buy may come with an invisible landlord – and you’ll be paying rent on something you already bought."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

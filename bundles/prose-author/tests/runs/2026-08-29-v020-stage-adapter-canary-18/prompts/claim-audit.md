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
    "text": "When a maker sells a device, the transaction appears simple: money changes hands, ownership follows."
  },
  {
    "id": "p1s2",
    "text": "But if the maker can later disable a repair function or software tool, the sale contains a hidden reservation."
  },
  {
    "id": "p1s3",
    "text": "The buyer receives the object; the company keeps a switch."
  },
  {
    "id": "p1s4",
    "text": "That isn't full ownership."
  },
  {
    "id": "p2s1",
    "text": "Property rules begin with a practical idea: the owner decides how a lawful thing will be used."
  },
  {
    "id": "p2s2",
    "text": "Software complicates that idea, but it doesn't erase it."
  },
  {
    "id": "p2s3",
    "text": "A remote feature control (whether exercised through an account, license server, or mandatory update) lets the seller revise the bargain after payment."
  },
  {
    "id": "p2s4",
    "text": "The device may remain on the buyer's desk, yet a part of it sits behind someone else's permission."
  },
  {
    "id": "p2s5",
    "text": "Ownership becomes a card catalog for functions the company still controls."
  },
  {
    "id": "p3s1",
    "text": "Manufacturers may argue that remote controls protect security, safety, or regulatory compliance."
  },
  {
    "id": "p3s2",
    "text": "Those can be legitimate goals."
  },
  {
    "id": "p3s3",
    "text": "A company may need to revoke a compromised credential (a key that exposes other users) or block code that creates a hazard."
  },
  {
    "id": "p3s4",
    "text": "But that concession doesn't establish a power to remove paid features."
  },
  {
    "id": "p3s5",
    "text": "An emergency authority should be narrow, reviewable, and tied to the emergency—not converted into permanent control over ordinary use."
  },
  {
    "id": "p4s1",
    "text": "The distinction matters because technical capability becomes economic leverage."
  },
  {
    "id": "p4s2",
    "text": "If disabling a feature can push an owner toward a subscription, new model, or authorized service, companies will likely feel pressure to use it."
  },
  {
    "id": "p4s3",
    "text": "They may call the change “support policy” (a label with no magic in it), but the practical result is the same: value sold can be withdrawn."
  },
  {
    "id": "p4s4",
    "text": "The switch is a little vault door—and the former seller still holds the combination."
  },
  {
    "id": "p5s1",
    "text": "What happens when the server makes a mistake, the account changes hands, or the company closes the service?"
  },
  {
    "id": "p5s2",
    "text": "A buyer shouldn't have to prove worthiness merely to retain a function."
  },
  {
    "id": "p5s3",
    "text": "Nor should a repair shop need the maker's blessing to restore it (assuming the repair itself is lawful)."
  },
  {
    "id": "p5s4",
    "text": "The uncertainty isn't incidental; it is the enforcement mechanism."
  },
  {
    "id": "p5s5",
    "text": "When access can disappear without the owner's consent, dependence does the work of a contract the buyer never negotiated."
  },
  {
    "id": "p6s1",
    "text": "Policy should separate safety interventions from product control."
  },
  {
    "id": "p6s2",
    "text": "First, sellers should disclose every remotely controllable feature before purchase (including any function dependent on continuing authentication)."
  },
  {
    "id": "p6s3",
    "text": "Second, disabling authority should be limited to circumstances defined in law or the sale contract, with notice and an appeal."
  },
  {
    "id": "p6s4",
    "text": "Third, loss of a feature should trigger repair, restoration, or refund rights—not a maze of disclaimers."
  },
  {
    "id": "p6s5",
    "text": "The rule does not need to forbid updates."
  },
  {
    "id": "p6s6",
    "text": "It needs to stop an update from rewriting ownership."
  },
  {
    "id": "p7s1",
    "text": "There are boundary cases."
  },
  {
    "id": "p7s2",
    "text": "A rented function is different from a sold one (if the rental was clear at checkout)."
  },
  {
    "id": "p7s3",
    "text": "A cloud service can't be guaranteed forever (servers cost money and sometimes fail)."
  },
  {
    "id": "p7s4",
    "text": "And a court order may require disabling a device."
  },
  {
    "id": "p7s5",
    "text": "None of those cases justifies treating every feature as a revocable favor."
  },
  {
    "id": "p7s6",
    "text": "The burden should remain on the maker to identify the narrow authority it invokes, explain why it applies, and preserve functions."
  },
  {
    "id": "p8s1",
    "text": "This is a competition issue."
  },
  {
    "id": "p8s2",
    "text": "Remote disablement can steer owners toward approved parts and services, while independent repair becomes possible but useless."
  },
  {
    "id": "p8s3",
    "text": "It can punish resale: a feature available to the first buyer vanishes for the second (even though the hardware has not changed)."
  },
  {
    "id": "p8s4",
    "text": "That arrangement doesn't preserve a product; it preserves the maker's position after the product leaves its hands."
  },
  {
    "id": "p9s1",
    "text": "We should ask lawmakers for a baseline: after a sale, the maker should not disable a paid feature unless a disclosed and legally justified exception applies (with remedies when it gets the decision wrong)."
  },
  {
    "id": "p9s2",
    "text": "If you own an affected device, document the advertised feature and the disabling notice, then send both to the officials considering right-to-repair and consumer protection rules."
  },
  {
    "id": "p9s3",
    "text": "We don't need a new theory of property—only an old principle applied honestly."
  },
  {
    "id": "p9s4",
    "text": "A sale should transfer meaningful control, not leave the buyer living under the seller's switch."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

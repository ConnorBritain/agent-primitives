# Independent draft claim audit — semantic-budget-canary

The request is the only supplied factual packet. The drafter supplied prose, not factual certification.
Audit every deterministic sentence unit under the system prompt. Do not revise the prose.

## Request

Write a 700-word blog post for owners of connected home devices. Title: The server was part of the appliance. Cover: a vendor closing its cloud service; which features stop working; why the shutdown changes the original bargain; and what local operation would protect. Keep the title.

## Sentence units

```json
[
  {
    "id": "p1s1",
    "text": "# The server was part of the appliance."
  },
  {
    "id": "p2s1",
    "text": "An appliance that depends on a server has two bodies: the object in the house and the computer elsewhere that gives it permission to work."
  },
  {
    "id": "p2s2",
    "text": "When you bought your connected lock, camera, thermostat, or speaker, the box wasn't the whole product (the software across the network was part of it)."
  },
  {
    "id": "p2s3",
    "text": "If the vendor closes that service, what exactly did you buy?"
  },
  {
    "id": "p2s4",
    "text": "You bought hardware whose useful life was tied to a promise hidden behind your wall and outside your control – a promise we call “the cloud” because “somebody else’s computer” sounds less magical."
  },
  {
    "id": "p3s1",
    "text": "Your thermostat may still display a temperature while schedules, remote controls, energy reports, geofencing, voice commands, household sharing, and security alerts disappear."
  },
  {
    "id": "p3s2",
    "text": "A camera may record nothing because authentication lives on a dead server; a lock may open by keypad but can't issue guest codes; a light may illuminate but no longer run the routines you arranged."
  },
  {
    "id": "p3s3",
    "text": "The plastic doesn't vanish."
  },
  {
    "id": "p3s4",
    "text": "The capabilities do (and sometimes setup or account recovery goes with them), leaving your appliance as a smaller, stranger object."
  },
  {
    "id": "p4s1",
    "text": "That changes the original bargain."
  },
  {
    "id": "p4s2",
    "text": "Payment ordinarily settles a transaction: money moves one way, control moves the other."
  },
  {
    "id": "p4s3",
    "text": "That wasn't the deal here, although the sale looked like one."
  },
  {
    "id": "p4s4",
    "text": "The vendor retained a private veto over the product after collecting the purchase price."
  },
  {
    "id": "p4s5",
    "text": "It didn't need to enter the house or recall the hardware."
  },
  {
    "id": "p4s6",
    "text": "It merely had to stop answering network requests, and the appliance wouldn't be the appliance anymore."
  },
  {
    "id": "p4s7",
    "text": "When we lose functions because a distant computer goes dark, the shutdown reveals what was sold: conditional access dressed up as ownership."
  },
  {
    "id": "p5s1",
    "text": "I don't think every connected feature must run forever."
  },
  {
    "id": "p5s2",
    "text": "Servers cost money, security work continues, and companies can fail."
  },
  {
    "id": "p5s3",
    "text": "But those facts describe a maintenance problem; they don't settle who should bear the loss."
  },
  {
    "id": "p5s4",
    "text": "I use a simple test: after service ends, does the essential function remain available without permission from the seller?"
  },
  {
    "id": "p5s5",
    "text": "If the answer is no, my purchase was really a tenancy with one enormous prepaid rent cheque (and a remote control held by the landlord) – except the landlord can demolish the rooms while the furniture remains."
  },
  {
    "id": "p6s1",
    "text": "Even if a shutdown is announced months ahead, notice alone doesn't repair the bargain."
  },
  {
    "id": "p6s2",
    "text": "A long countdown merely tells you when your property will shrink."
  },
  {
    "id": "p6s3",
    "text": "Exporting data may help, and refunds may soften the cost, but neither gives back the capabilities that weren't designed to survive independently."
  },
  {
    "id": "p6s4",
    "text": "If replacement requires buying another device, the shutdown converts planned obsolescence into compulsory shopping."
  },
  {
    "id": "p6s5",
    "text": "Calling that a “service transition” would be bullshit (the part undergoing transition is the buyer’s money) – the mechanism is remote repossession by software."
  },
  {
    "id": "p7s1",
    "text": "Local operation protects against that veto."
  },
  {
    "id": "p7s2",
    "text": "Core controls, schedules, automations, recordings, and account administration should run inside our homes, with cloud connections adding convenience rather than granting permission."
  },
  {
    "id": "p7s3",
    "text": "Remote access can relay encrypted messages to the appliance; it shouldn't be the appliance’s only brain."
  },
  {
    "id": "p7s4",
    "text": "Published protocols and replaceable server settings would let another program take over when the original service ends."
  },
  {
    "id": "p7s5",
    "text": "Exportable keys and documented recovery procedures matter too."
  },
  {
    "id": "p7s6",
    "text": "Redundancy isn't glamorous, but a fire exit rarely is, and the point becomes obvious when the main door doesn't open."
  },
  {
    "id": "p8s1",
    "text": "Local operation also changes incentives."
  },
  {
    "id": "p8s2",
    "text": "A shop that sells a drill cannot make the trigger stop working from headquarters, so its revenue plan must coexist with the drill’s continued existence."
  },
  {
    "id": "p8s3",
    "text": "Connected products should face the same discipline."
  },
  {
    "id": "p8s4",
    "text": "I can accept that optional hosting may expire; what matters to me is whether the machinery keeps performing its purchased job."
  },
  {
    "id": "p8s5",
    "text": "The server may provide an extra entrance, a concierge, or a delivery window."
  },
  {
    "id": "p8s6",
    "text": "It must never become the foundation that disappears while the building is occupied."
  },
  {
    "id": "p9s1",
    "text": "We should demand a plain rule from manufacturers and lawmakers: if closing a cloud service removes a material feature, the product must include a local path for that feature or a transferable path to another operator."
  },
  {
    "id": "p9s2",
    "text": "Disclosure before sale helps, but disclosure alone turns dispossession into fine print."
  },
  {
    "id": "p9s3",
    "text": "The durable protection is technical independence backed by an enforceable obligation."
  },
  {
    "id": "p9s4",
    "text": "The server was part of the appliance, and our rule should treat its removal like removing any other essential component after the sale."
  }
]
```

Return voice-draft-claim-audit/4 as the strict object only. Preserve every ID
exactly once and in order. Every row carries id, status, reason, and claims.
Keep/reject rows carry claims: []; disclose rows extract every unsupported
proposition. Do not copy evidence; deterministic assembly binds the complete
immutable sentence for the later mandatory verification audit.

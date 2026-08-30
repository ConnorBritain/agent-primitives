# prose-reviser · FU-4 — idempotence (2026-08-16)

**Result: idempotent on all four fixtures. 6 plan entries, 6 refusals, 0 edits, 0 bytes
changed.** The README's claim — "idempotence is a claim not a proof" — is now a proof for
this failure mode.

---

## 1. A sharper and cheaper test than the ticket proposed

FU-4 proposed: re-run the reviser on its accepted output, then re-run the **k=7 fidelity
gate** on the second-pass revisions and compare distributions. Bar: second-pass FAITHFUL
rate ≥ first-pass − 10%.

That design is sound but indirect, and it costs ~40 dispatches. The reviser's contract
makes a sharper test available for 4.

**The reviser emits before/after pairs anchored on a verbatim `quote` from the draft.**
After a first pass those quotes describe text that no longer exists — the edit removed it.
So a correct second pass must **refuse every entry**, produce **zero edits**, and leave the
revision **byte-identical**.

And if the bytes are identical, the fidelity distribution is identical by construction.
There is nothing left for 35 critic draws to discover. The k=7 re-run would have measured
model noise around an unchanged artefact.

## 2. Result

Reviser run on its own first-pass revision, same plan, `plan-only` mode:

| fixture | entries | edits | refused | bytes changed |
|---|---|---|---|---|
| f01 word swap | 1 | **0** | 1 | 0 |
| f02b surgical cut | 1 | **0** | 1 | 0 |
| f03b surgical rephrase | 1 | **0** | 1 | 0 |
| f04 multi-entry | 3 | **0** | 3 | 0 |
| **total** | **6** | **0** | **6** | **0** |

Every refusal names the right cause. f04, the sharpest case, refused all three
independently — including the deletion entry, where the anchor `"indeed "` is simply
absent rather than replaced.

## 3. The best individual result is f02b's restraint

f02b's second pass noticed a real cosmetic defect its own first pass had left behind:

> *"line 21-22 carries a mid-sentence line break where the deleted fragment used to sit;
> rewrapping is not authorised by any plan entry"*

It logged this under `noticed_but_not_edited` and **did not fix it.** That is the
plan-is-an-authorisation-set rule holding under the exact pressure designed to break it —
a defect the reviser itself caused, visible, trivially fixable, and out of scope.

An eager reviser would have tidied it. That tidy is how a second pass starts drifting from
the plan, and it is the mechanism FU-4 existed to look for.

## 4. Honest limits

- **One failure mode.** This proves the reviser will not re-apply or double-apply an
  already-applied plan. It says nothing about a second pass driven by a *new* plan from a
  fresh critic round, which is the likelier real-world loop and is not tested here.
- **Four fixtures, all Chekhov.** Same corpus limitation as the whole reviser suite; see
  FU-3.
- **No refusal fixtures.** f06 and f07 refuse on the first pass, so their second pass is
  trivially unchanged and would not have been evidence.
- **The bar was met by a different route than the ticket specified.** I did not run the k=7
  gate. The argument that byte-identical output makes it unnecessary is stated above so it
  can be disagreed with rather than assumed.

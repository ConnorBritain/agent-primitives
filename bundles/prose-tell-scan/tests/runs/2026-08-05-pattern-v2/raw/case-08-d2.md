**PATTERN**: announced-then-undelivered
**LOCATION**: Line 31: "There is a third dynamic at work beneath both the costs and the benefits, and it matters more than either of them. It explains why the same failures keep recurring across companies that share no code and no staff, and it is the reason the usual remedies have not worked. I set it out below." Delivery should follow immediately or at latest in the closing section (lines 37-43: "Automated moderation is no longer an experiment... The question today is not whether companies will use AI to moderate content, but under what conditions they should do so... the need for transparency and accountability becomes more urgent."); the piece then ends at line 45 without ever naming or unpacking a "third dynamic."
**WHY IT IS THIS PATTERN**: The announcement promises a specific causal mechanism — why the same failures recur across companies with no shared code or staff, and why remedies fail — and the closing section delivers only generic conclusions about transparency and accountability, never cashing out that named mechanism.
**CONFIDENCE**: high

Checked and clean:
- `llm-safe-truths` - every broad-sounding sentence I tested (line 5's "permanent feature," line 29's "predictable consequence," line 39's "depends a lot on the details") is falsifiable and is a premise the surrounding argument leans on, not filler.
- `surveying-without-committing` - line 43 poses "under what conditions they should do so" without answering it, but line 1 explicitly frames this as part 1 of a 2-part series with part 2 delivering recommendations; the piece announces itself as a diagnosis, not a survey ducking commitment.
- `absence-of-concrete-detail` - no span survives the second look; see Out of scope for the one candidate I found and declined.
- `invented-specifics` - all attributed specifics (Zuckerberg's Senate testimony, the 2025 joint declaration, the 2019 EFF/Witness/Syrian Archive paper, the 2020 HRW report, CDT's series, GLAAD's statement) are attached to named sources, and I found no two specifics in the draft that cannot both be true.

Out of scope: Line 15, "It quickly became apparent that companies'—and particularly Meta's—approach to moderation during the pandemic represented a backslide in transparency, freedom of expression, and access to remedy," names a specific company and characterizes a specific failure without a date, policy, or instance attached in the surrounding text. Given every other major claim in this piece carries a visible citation (the 2017 Facebook post, the 2018 Senate testimony, the 2025 joint declaration, the EFF/HRW/CDT/GLAAD sources), this reads as a claim that had a source in its original, hyperlinked form; a plain-text copy would drop that link. That is a limit of the copy handed to me, not a detail the author omitted, so I am not counting it as a finding.

CLEAN / REVISE
REVISE

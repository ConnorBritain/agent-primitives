**PATTERN**: `announced-then-undelivered`

**LOCATION**: line 21 — "so you aren't just pummeled with a firehose of news all day long (we'll get to a tip below in the next section that tackles this problem if they don't have separate feeds, though)." / line 25 — "Decentralized social media like Mastodon, Bluesky, and Threads, use RSS for user feeds, so you can follow your friend's posts on Bluesky or Mastodon without actually having an account on either."

**WHY IT IS THIS PATTERN**: the parenthetical explicitly promises a tip, in the next section, for sites that lack separate/full-text feeds and bury you in a firehose; the next section (line 25 onward) is about following social-media accounts without an account, and no later section returns to give a tip for firehose news sites without separate feeds — the promise is never redeemed.

**CONFIDENCE**: high

Checked and found clean:
- `llm-safe-truths` — the piece's broad-sounding lines (line 29 "The internet is more than just Facebook.", line 39/45 "RSS is one of the best examples we have of the open web...", line 33's closing claim) are each stateable-false and load-bearing in the surrounding argument (they set up or cap a specific point about walled gardens or open protocols); none fail all three gates.
- `surveying-without-committing` — line 11's list of RSS readers (Feedly, NewsBlur, The Old Reader, NetNewsWire) presents options without picking one, but the draft says why up front ("don't worry about finding the right RSS reader right away," easy to switch later) — it announces itself as a survey and is doing its job.
- `invented-specifics` — no specific is attributed to a source the draft never names, and no two in-draft specifics conflict (the Big Cartel XML/RSS detail at line 37 matches, rather than contradicts, the trailing correction).

Out of scope:
- Line 11: "Wired, The Verge, and Privacy Guides all have useful roundups" — named outlets with no link; plausible stripped hyperlink from a published version, not a finding.
- Line 13: references to "our current podcast, EFFector" and "our last series, How to Fix the Internet" with no link — same suspected-stripped-citation shape.
- Line 19: "many find that their algorithmic feeds are as often a source of frustration" — unnamed "many," but this is an absence-of-concrete-detail shape (adjudicated by nobody), not filed as a finding.

CLEAN / **REVISE**

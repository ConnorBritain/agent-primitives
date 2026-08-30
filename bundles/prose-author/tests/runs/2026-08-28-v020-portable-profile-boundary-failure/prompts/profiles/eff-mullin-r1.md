Render profile eff-mullin.
Every allowed input file is reproduced verbatim below. Read all of them and
follow the system prompt's output contract exactly. No filesystem tools exist.

## Input file: profile.json

<file>
{
  "name": "eff-mullin",
  "medium": "advocacy blog post",
  "purpose": "policy analysis and legislative advocacy for a civil-liberties organisation, addressed to a general readership that follows technology policy",
  "notes": "FU-3 / second modern voice. Vendored 2026-08-16 from eff.org Deeplinks under CC-BY-4.0, single-author posts only. Companion to doctorow-blog: both are contemporary argumentative prose about technology policy, which is the point — two voices arguing the same beat is a harder discrimination task than two voices from different centuries."
}

</file>

## Input file: voice.md

<file>
---
filled: false
---

<!-- Unfilled. Every observation in a profile rendered from this corpus is derived from the corpus alone. -->

</file>

## Input file: measurements.json

<file>
{
  "schema": "voice-profile-measurements/1",
  "corpus_words": 8066,
  "sample_count": 11,
  "samples": [
    {
      "file": "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
      "words": 378
    },
    {
      "file": "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
      "words": 714
    },
    {
      "file": "californias-ab-412-still-demands-developers-do-impossible.txt",
      "words": 671
    },
    {
      "file": "chatbot-act-forces-one-parenting-model-every-family.txt",
      "words": 1398
    },
    {
      "file": "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
      "words": 750
    },
    {
      "file": "congress-narrowed-guard-act-serious-problems-remain.txt",
      "words": 686
    },
    {
      "file": "court-records-should-be-free.txt",
      "words": 360
    },
    {
      "file": "kids-act-would-require-age-checks-get-online.txt",
      "words": 1117
    },
    {
      "file": "kids-online-safety-act-will-make-internet-worse-everyone.txt",
      "words": 648
    },
    {
      "file": "no-fakes-act-could-silence-satire-commentary-and-news.txt",
      "words": 345
    },
    {
      "file": "why-are-gay-bars-building-databases-their-patrons.txt",
      "words": 999
    }
  ],
  "samples_excluded": [],
  "undelimited_samples": [
    "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
    "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
    "californias-ab-412-still-demands-developers-do-impossible.txt",
    "chatbot-act-forces-one-parenting-model-every-family.txt",
    "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
    "congress-narrowed-guard-act-serious-problems-remain.txt",
    "court-records-should-be-free.txt",
    "kids-act-would-require-age-checks-get-online.txt",
    "kids-online-safety-act-will-make-internet-worse-everyone.txt",
    "no-fakes-act-could-silence-satire-commentary-and-news.txt",
    "why-are-gay-bars-building-databases-their-patrons.txt"
  ],
  "measurements": [
    {
      "id": "second-person-family",
      "count": 11,
      "per_1000_words": 1.36,
      "samples_with": 5,
      "samples_without": 6,
      "files_with": [
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt"
      ],
      "files_without": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "counting_rule": "[measurement:second-person-family] Count case-insensitive whole-word tokens you, your, yours, you're, you've, you'd, and you'll in the extracted sample bodies."
    },
    {
      "id": "first-person-plural-family",
      "count": 19,
      "per_1000_words": 2.36,
      "samples_with": 10,
      "samples_without": 1,
      "files_with": [
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "files_without": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt"
      ],
      "counting_rule": "[measurement:first-person-plural-family] Count case-sensitive whole-word tokens we, We, us, our, Our, ours, Ours, and the listed contracted we forms in the extracted sample bodies; uppercase US is excluded."
    },
    {
      "id": "contractions",
      "count": 86,
      "per_1000_words": 10.66,
      "samples_with": 11,
      "samples_without": 0,
      "files_with": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:contractions] Count whole-word n't, 're, 've, 'll, 'd, and 'm forms plus 's only for the closed elision hosts it, that, there, here, who, what, where, when, how, why, he, she, let, one, nothing, everything, something, somebody, nobody, and this; possessive 's is excluded."
    },
    {
      "id": "uncontracted-negatives",
      "count": 32,
      "per_1000_words": 3.97,
      "samples_with": 9,
      "samples_without": 2,
      "files_with": [
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "files_without": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt"
      ],
      "counting_rule": "[measurement:uncontracted-negatives] Count case-insensitive whole phrases do not, does not, did not, is not, are not, was not, were not, cannot, could not, would not, should not, will not, have not, has not, and had not in the extracted sample bodies."
    },
    {
      "id": "profanity-vulgarity",
      "count": 0,
      "per_1000_words": 0,
      "samples_with": 0,
      "samples_without": 11,
      "files_with": [],
      "files_without": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "counting_rule": "[measurement:profanity-vulgarity] Count only the case-insensitive whole-word profanity and vulgarity forms enumerated by the prose-author profanity rule; coined words containing a rude root are excluded."
    },
    {
      "id": "first-person-singular-family",
      "count": 2,
      "per_1000_words": 0.25,
      "samples_with": 2,
      "samples_without": 9,
      "files_with": [
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt"
      ],
      "files_without": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "counting_rule": "[measurement:first-person-singular-family] Count case-insensitive whole-word tokens I, me, my, mine, and myself in the extracted sample bodies."
    },
    {
      "id": "question-marks",
      "count": 9,
      "per_1000_words": 1.12,
      "samples_with": 4,
      "samples_without": 7,
      "files_with": [
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "files_without": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt"
      ],
      "counting_rule": "[measurement:question-marks] Count every literal question-mark character in the extracted sample bodies."
    },
    {
      "id": "round-parenthetical-spans",
      "count": 97,
      "per_1000_words": 12.03,
      "samples_with": 11,
      "samples_without": 0,
      "files_with": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:round-parenthetical-spans] Count each non-nested pair of round brackets whose contents stay on one line in the extracted sample bodies."
    },
    {
      "id": "em-dashes",
      "count": 53,
      "per_1000_words": 6.57,
      "samples_with": 10,
      "samples_without": 1,
      "files_with": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "files_without": [
        "court-records-should-be-free.txt"
      ],
      "counting_rule": "[measurement:em-dashes] Count every literal em-dash character in the extracted sample bodies."
    },
    {
      "id": "en-dashes",
      "count": 7,
      "per_1000_words": 0.87,
      "samples_with": 1,
      "samples_without": 10,
      "files_with": [
        "californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt"
      ],
      "files_without": [
        "california-ab-412-stalls-out-win-innovation-and-fair-use.txt",
        "californias-ab-412-still-demands-developers-do-impossible.txt",
        "chatbot-act-forces-one-parenting-model-every-family.txt",
        "congress-just-rushed-through-disastrous-copyright-office-overhaul.txt",
        "congress-narrowed-guard-act-serious-problems-remain.txt",
        "court-records-should-be-free.txt",
        "kids-act-would-require-age-checks-get-online.txt",
        "kids-online-safety-act-will-make-internet-worse-everyone.txt",
        "no-fakes-act-could-silence-satire-commentary-and-news.txt",
        "why-are-gay-bars-building-databases-their-patrons.txt"
      ],
      "counting_rule": "[measurement:en-dashes] Count every literal en-dash character in the extracted sample bodies."
    }
  ]
}

</file>

## Input file: corpus/human/california-ab-412-stalls-out-win-innovation-and-fair-use.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: California A.B. 412 Stalls Out—A Win for Innovation and Fair Use
author: Joe Mullin
date: 2025-07-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2025/07/california-ab-412-stalls-out-win-innovation-and-fair-use
---
A.B. 412, the flawed California bill that threatened small developers in the name of AI “transparency,” has been delayed and turned into a [two-year bill](https://capitolmuseum.ca.gov/learn/about-the-government/life-cycle-of-a-bill/). That means it won’t move forward in 2025—a significant victory for innovation, freedom to code, and the open web.

EFF [opposed this bill from the start](https://www.eff.org/deeplinks/2025/03/californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly). A.B. 412 tried to regulate generative AI, not by looking at the public interest, but by mandating training data “reading lists” designed to pave the way for new copyright lawsuits, many of which are filed by large content companies.

Transparency in AI development is a laudable goal. But A.B. 412 failed to offer a fair or effective path to get there. Instead, it gave companies large and small the impossible task of differentiating between what content was copyrighted and what wasn’t—with severe penalties for anyone who couldn’t meet that regulation. That would have protected the largest AI companies, but frozen out smaller and non-commercial developers who might want to tweak or fine-tune AI systems for the public good.

The most interesting work in AI won’t necessarily come from the biggest companies. It will come from small teams, fine-tuning for accessibility, privacy, and building tools that identify AI harms. And some of the most valuable work will be done using source code under permissive licenses.

A.B. 412 ignored those facts, and would have punished some of the most worthwhile projects.

The Bill Blew Off Fair Use Rights

The question of whether—and how much—AI training qualifies as fair use is being actively litigated right now in federal courts. And so far, courts have found much of this work to be fair use. In [a recent landmark AI case,](https://www.eff.org/deeplinks/2025/06/two-courts-rule-generative-ai-and-fair-use-one-gets-it-right) Bartz v. Anthropic, for example, a federal judge found that AI training work is “transformative—spectacularly so.” He compared it to how search engines copy images and text in order to provide useful search results to users.

Copyright is federally governed. When states try to rewrite the rules, they create confusion—and more litigation that doesn’t help anyone.

If lawmakers want to revisit AI transparency, they need to do so without giving rights-holders a tool to weaponize copyright claims. That means rejecting A.B. 412’s approach—and crafting laws that protect speech, competition, and the public’s interest in a robust, open, and fair AI ecosystem.

</file>

## Input file: corpus/human/californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: California’s A.B. 412: A Bill That Could Crush Startups and Cement A Big Tech AI Monopoly
author: Joe Mullin
date: 2025-03-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2025/03/californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly
---
California legislators have begun debating a bill (A.B. 412) that would require AI developers to track and disclose every registered copyrighted work used in AI training. At first glance, this might sound like a reasonable step toward transparency. But it’s an impossible standard that could crush small AI startups and developers while giving big tech firms even more power.

A Burden That Small Developers Can’t Bear

The AI landscape is in danger of being dominated by large companies with deep pockets. These big names are in the news almost daily. But they’re far from the only ones – there are [dozens of AI companies](https://explodingtopics.com/blog/ai-startups) with [fewer than 10 employees](https://www.ycombinator.com/companies/industry/ai) trying to build something new in a particular niche.

This bill demands that creators of any AI model–even a two-person company or a hobbyist tinkering with a small software build– identify copyrighted materials used in training.  That requirement will be incredibly onerous, even if limited just to works registered with the U.S. Copyright Office. The registration system is a cumbersome beast at best–neither machine-readable nor accessible, it’s more like a card catalog than a database–that doesn’t offer information sufficient to identify all authors of a work,  much less help developers to reliably match works in a training set to works in the system.

Even for major tech companies, meeting these new obligations  would be a daunting task. For a small startup, throwing on such an impossible requirement could be a death sentence. If A.B. 412 becomes law, these smaller players will be forced to devote scarce resources to an unworkable compliance regime instead of focusing on development and innovation. The risk of lawsuits—potentially from copyright trolls—would discourage new startups from even attempting to enter the field.

A.I. Training Is Like Reading And It’s Very Likely Fair Use

A.B. 412 starts from a premise that’s both untrue and harmful to the public interest: that reading, scraping or searching of open web content shouldn’t be allowed without payment. In reality, courts should, and we believe will, find that the great majority of this activity is fair use.

It’s now bedrock internet law principle that some forms of copying content online are transformative, and thus legal fair use. That includes reproducing [thumbnail images for image search](https://www.eff.org/deeplinks/2007/05/p10-v-google-public-interest-prevails-digital-copyright-showdown), or [snippets of text to search books](https://www.authorsalliance.org/2023/02/24/fair-use-week-2023-looking-back-at-google-books-eight-years-later/).

The U.S. copyright system is meant to balance innovation with creator rights, and courts are still working through how copyright applies to AI training. In most of the AI cases, [courts have yet to consider](https://www.eff.org/deeplinks/2025/02/copyright-and-ai-cases-and-consequences)—let alone decide—how fair use applies. A.B. 412 jumps the gun, preempting this process and imposing a vague, overly broad standard that will do more harm than good.

Importantly, those key court cases are all federal. The U.S. Constitution makes it clear that copyright is governed by federal law, and A.B. 412 improperly attempts to impose state-level copyright regulations on an issue still in flux.

A.B. 412 Is A Gift to Big Tech

The irony of A.B. 412 is that it won’t stop AI development—it will simply consolidate it in the hands of the largest corporations. Big tech firms already have the resources to navigate complex legal and regulatory environments, and they can afford to comply (or at least appear to comply) with A.B. 412’s burdensome requirements. Small developers, on the other hand, will either be forced out of the market or driven into partnerships where they lose their independence. The result will be less competition, fewer innovations, and a tech landscape even more dominated by a handful of massive companies.

If lawmakers are able to iron out some of the practical problems with A.B. 412 and pass some version of it, they may be able to force programmers to research–and effectively, pay off–copyright owners before they even write a line of code. If that’s the outcome in California, Big Tech will not despair. They’ll celebrate. Only a few companies own large content libraries or can afford to license enough material to build a deep learning model. The possibilities for startups and small programmers will be so meager, and competition will be so limited, that profits for big incumbent companies will be locked in for a generation.

If you are a California resident and want to speak out about A.B. 412, you can find and contact your legislators [through this website](https://findyourrep.legislature.ca.gov/).

</file>

## Input file: corpus/human/californias-ab-412-still-demands-developers-do-impossible.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: California’s AB 412 Still Demands Developers Do The Impossible
author: Joe Mullin
date: 2026-06-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2026/06/californias-ab-412-still-demands-developers-do-impossible
---
California lawmakers are [again](https://www.eff.org/deeplinks/2025/07/california-ab-412-stalls-out-win-innovation-and-fair-use) considering [A.B. 412](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB412), a bill that would require AI developers to identify and disclose copyrighted works used to train generative AI systems.

The problem this year is the [same as last year](https://www.eff.org/deeplinks/2025/03/californias-ab-412-bill-could-crush-startups-and-cement-big-tech-ai-monopoly): it’s practically impossible to comply with this law. The bill demands information that often does not exist, and cannot realistically be obtained.

EFF submitted an [opposition letter](https://www.eff.org/files/2026/06/04/ab_412_may_2026_opp_letter.pdf) to the California Senate Privacy Committee explaining why we continue to believe A.B. 412 is simply unworkable. To the extent developers do follow this law, it will have the effect of locking in the power of the largest companies in AI.

A Burden That Can’t Be Met

A.B. 412 sounds simple: just have AI developers create and keep a list of all the registered copyrighted works they use in AI training.

That may seem straightforward. In practice, it’s anything but.

There is no machine-readable “list” of copyrighted works at the U.S. Copyright Office. And many copyright holders can get a copyright without even depositing a publicly viewable sample of the work—for example, software companies may register copyright on proprietary code without revealing it to the public.

And on the open internet, copyright information is often incomplete, unavailable, or impossible to verify. One image may be registered with the copyright office, while the next is licensed under a free Creative Commons license (like [the images that EFF creates](https://www.eff.org/copyright)), and the next is public domain. A message forum user might post an original story, photograph, or poem without any indication of ownership or registration status.

The bill effectively asks developers to continuously cross-reference massive batches of online data against a copyright system that simply wasn’t designed to do so. If California passes A.B. 412, its impact will go far beyond the large AI companies we read about in the headlines.

Not Just Big Tech

Supporters often frame this bill as a way to help creative workers have some leverage against Big Tech, but the bill reaches much further than the big AI companies.

Its definition of “developer” extends to anyone who makes a generative AI model available to Californians. That includes indie developers tinkering with an existing model, open-source initiatives, nonprofits, and other non-commercial efforts. Recent amendments added exemptions for universities and government entities, which is important, but that still leaves out a vast swathe of non-commercial tech work that’s done by people without full-time jobs in government or academia.

Large companies will hire compliance teams and lawyers to navigate these requirements. Smaller organizations and independent developers usually can’t. The result will be fewer opportunities for startups and new entrants. Faced with this massive compliance burden, some won’t even try.

Courts Are Already Deciding These Questions

The bill is premised on the idea that copyright owners currently don’t have good remedies if they’re mistreated by AI companies. That simply isn’t true. And the growing wave of federal court filings in this space prove it. Content companies that want to sue tech companies, large or small, [have no problem doing so](https://chatgptiseatingtheworld.com/aicopyrightcasetracker/). Those courts are still working through important questions about fair use and transformative use. Some courts have already concluded that [many AI training activities qualify as fair use](https://www.eff.org/deeplinks/2025/06/two-courts-rule-generative-ai-and-fair-use-one-gets-it-right). Others continue to evaluate the issue.

California lawmakers should not rush to impose new state regulation while those questions remain unresolved. This is why copyright is governed at the federal level: both creators and fair users benefit from a single set of nationwide rules.

At this point, the bill remains a solution in search of a problem. Rights holders already have powerful tools to protect their interests under existing federal law. What this bill adds isn’t clarity or transparency, but a costly and essentially impossible compliance burden that will discourage small developers and researchers.

California has been able to support both artistic creativity and tech innovation for decades now.  But A.B. 412 does not strike the right balance.

If you are a California resident and interested in speaking out about this bill, you can find and contact your representatives [through this website](https://findyourrep.legislature.ca.gov/).

</file>

## Input file: corpus/human/chatbot-act-forces-one-parenting-model-every-family.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: The CHATBOT Act Forces One Parenting Model On Every Family
author: Joe Mullin
date: 2026-07-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2026/07/chatbot-act-forces-one-parenting-model-every-family
---
Update: The Senate Commerce Committee voted to advance this bill on August 5, 2026. EFF continues to oppose the bill, which still needs approval from the full Senate.

Artificial intelligence is rapidly changing education, and the way people search for information. Parents, teenagers, teachers, and schools are struggling with tough questions about when AI should, and should not, be used. It makes sense for Congress to hold hearings and examine how AI should be used by minors. But the recently introduced [CHATBOT Act](https://www.congress.gov/bill/119th-congress/senate-bill/4407/text) answers those questions with a one-size-fits-all mandate governing how teenagers access AI through federally prescribed parental monitoring systems.

The Bill Requires AI Companies To Build Family Monitoring Systems

Parents are [approaching AI in different ways](https://www.pewresearch.org/internet/2026/02/24/what-parents-say-about-their-teens-ai-use/). Some closely supervise how their children use chatbots, while others might set more general rules about technology. Many families are still figuring out what role AI should play in schoolwork and everyday life.

The CHATBOT Act would take that decision away from families and AI providers. Instead of letting families and AI providers decide what parental controls should look like, Congress would require every covered AI chatbot to build the same federally prescribed “family account” system.

As part of the required parental-consent process for teens, AI companies must offer parents a "family account" that provides access to a "full record of the conversations and activity" of teen users and tools to "monitor, analyze, and understand, at scale" those conversations. They must also send alerts if a teen attempts to bypass or disable parental controls.

This isn’t simply an optional parental-control feature. The bill requires every covered AI provider to build this monitoring infrastructure, and present it as part of the parental consent process. Congress is prescribing a single, highly invasive model of how families should supervise teenagers’ use of AI.

The CHATBOT Act Creates New Privacy Risks For Families

Parents and families have different ideas about how much independence teenagers should have. Understandably, they also have very different expectations for 8-year olds, 13-year-olds, and 17-year-olds. The CHATBOT Act effectively requires AI providers to build the same monitoring architecture for users of very different ages.

And this mandated data collection will create new privacy and security risks. Once Congress requires AI companies to create a permanent, centralized record of teen AI conversations for parental review, that will be a valuable vault of extremely personal information. That raises serious questions about what would happen in cases where someone else gains access to it through account compromise, family disputes, or other security failures.

The vast archives of conversations created by the government-mandated family accounts won't be interesting only to parents. They will become valuable targets for hackers, identity thieves, civil litigants, and anyone else seeking access to the deeply personal information of others. The CHATBOT Act requires the records to exist, but addresses none of those risks.

Families are still figuring out what role AI should play in schoolwork and everyday life. Congress shouldn’t freeze one answer into federal law by requiring every AI company to build the same prescribed monitoring system.

The CHATBOT Act Applies A Children’s Law To Teenagers

The CHATBOT Act takes the basic structure of [COPPA](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa), a nearly 30-year-old law that applies to children aged 12 and under, and applies the same “verifiable parental consent” to older teenagers.

That’s a dramatic expansion of the law. Congress enacted COPPA to prevent kids from handing over detailed personal information to online services without making sure parents approved. For nearly three decades, Congress has required parental consent before websites collect personal information from any user under 13. COPPA is not simple to comply with, which is why so many internet companies, large and small, simply bar kids under 13 from having accounts. That includes major social media sites and AI. [Facebook](https://www.facebook.com/terms/), [Instagram](https://help.instagram.com/termsofuse), [TikTok](https://www.ucsf.edu/news/2025/01/429296/many-children-use-tiktok-against-rules), [X](https://help.x.com/en/rules-and-policies/information-for-parents-and-minor-users), [YouTube](https://kids.youtube.com/t/terms), [Snapchat](https://www.snap.com/terms), [Discord](https://support.discord.com/hc/en-us/community/posts/360050817374-Age-restriction), [Spotify](https://www.spotify.com/us/legal/end-user-agreement/plain/), and blogging platforms like [WordPress](https://wordpress.com/tos/) all keep out users under 13. Children under 13 are also not allowed to use [Microsoft Co-Pilot](https://support.microsoft.com/en-us/microsoft-copilot/microsoft-copilot-young-people), [Google Gemini](https://support.google.com/gemini/answer/16275805?hl=en), or [ChatGPT](https://help.openai.com/en/articles/8313401-is-chatgpt-safe-for-all-ages). Anthropic [does not allow users under 18](https://support.claude.com/en/articles/13117299-minimum-age-requirement-access-restriction) to use its AI model, Claude. In cases where younger kids maintain social media accounts despite the rules, studies show the vast majority of them are [creating those accounts with parental consent](https://www.eff.org/deeplinks/2026/01/congress-wants-hand-your-parenting-big-tech).

In short, COPPA’s protections against collecting personal information from minors without parental consent already apply to the AI services CHATBOT Act seeks to regulate. Worse, the CHATBOT Act takes COPPA’s privacy protections and inverts them—it will result in AI services likely collecting more information about young users.

But the CHATBOT Act extends that model to high school students using AI assistants that are rapidly becoming tools for learning, research, writing, coding, and creative work. It then mandates specific, invasive surveillance tools that go well beyond anything COPPA requires.

The bill requires providers to offer these “family accounts,” with these specific features, as a default for teenagers. By doing so, CHATBOT effectively treats a high school senior the same way it treats an elementary school student.

Supporters may argue that parents of teens don’t have to create a family account. But every family with a teenager will still have to go through the bill’s parental-consent process before a teenager can use a covered AI system. Providers will need practical ways to verify that an adult is, in fact, the teenager’s parent. And parents of kids under 13 have no option to consent to their kids’ use of an AI system—the bill’s only option is to create a family account.

Congress should not extend the COPPA parental-permission model to millions of older teenagers, and it would be harmful to do so. The government does not require COPPA-style parental permission before a 17-year-old checks out a library book, [uses Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:Guidance_for_younger_editors), types search terms into Google, or [reads a newspaper online](https://help.nytimes.com/115014893428-Terms-of-Service). It shouldn’t require parental permission simply because the same question gets asked of an AI assistant.

The CHATBOT Act Will Pressure AI Companies To Check Users’ Ages

The bill says it doesn’t require [age verification](https://www.eff.org/issues/age-verification). But like many [recent “kids online safety” bills](https://www.eff.org/deeplinks/2026/06/kids-act-would-require-age-checks-get-online), it imposes obligations that depend on a company knowing whether a user is under 18.

Specifically, the bill requires AI systems to either disable access to young kids, get parental consent, or the creation of a family account if a service has reason to believe a user is a minor. The standard means that services don’t need to have actual knowledge of a user’s age to be later held liable for improperly letting them use their AI tools. That creates a practical problem. Given the potential liability of getting something wrong, AI companies will likely require stricter forms of age verification to figure out who is under 13, a teenager, and who is a parent. Some providers might ask for government-issued identification.  Other companies may rely on age estimation systems that use facial scans or other signals to guess a user’s age. Neither of these approaches is good for users’ privacy or security. One collects more information than is necessary, and the other inevitably makes mistakes.

Congress shouldn’t force companies into that choice, or families into this position. In the name of protecting children, the CHATBOT Act will result in online services collecting even more information from kids and families, creating privacy and security risks. Parents who want family accounts like those described in the bill should be free to choose AI services that offer them. But Congress shouldn’t pressure every provider to collect more information about everyone’s age simply to comply with the law.

A Better Way Forward

Congress doesn't have to choose between doing nothing and creating a sweeping new federal parental-monitoring mandate. Existing law allows regulators to police deceptive AI products, protect children's privacy under COPPA, and hold companies accountable when they market unsafe or misleading products to families.

Lawmakers have [urged the FTC to crack down](https://www.duckworth.senate.gov/imo/media/doc/260312aitoyslettertoftc1.pdf) on AI-enabled toys that make unsubstantiated educational claims or illegally collect children's data. Those are regulatory actions that can be taken right now.

Finally, the FTC is [currently investigating](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions) how AI companies test their products, protect children and teens, comply with COPPA, and enforce age restrictions. The results of that inquiry could be useful guidance to Congress, and to the public debate around these issues.

Cracking down on bad actors, while learning more about how families are already making decisions about AI use, is a much better path forward than building one, federally-prescribed model of parenting or product design.

</file>

## Input file: corpus/human/congress-just-rushed-through-disastrous-copyright-office-overhaul.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: Congress Just Rushed Through a Disastrous Copyright Office Overhaul
author: Joe Mullin
date: 2026-06-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2026/06/congress-just-rushed-through-disastrous-copyright-office-overhaul
---
In a voice vote earlier this week, the House of Representatives passed [H.R. 6028](https://www.congress.gov/bill/119th-congress/house-bill/6028/text), the “Legislative Branch Agencies Clarification Act.” The legislation is presented as a technical reorganization of some government agencies, but it’s much more than that.

H.R. 6028 would fundamentally change the U.S. Copyright Office, and not in a good way. The bill removes the Library of Congress’ current supervisory role over the Copyright Office, transfers several powers directly to the Register of Copyrights, and makes the Register a presidential appointee, confirmed by the Senate.

These changes would make an office that’s already hugely influential in copyright and tech policy much more political. EFF first explained why that’s a terrible idea when it came up [nearly a decade ago](https://www.eff.org/deeplinks/2017/03/lets-make-copyright-office-less-political-not-more). This bill, like the older one, weakens the few public-interest checks and balances that do exist.  We hope the Senate promptly rejects this bill.

The Copyright Office Doesn’t Need More Politics—Or More Power

The Copyright Office's main responsibilities are administrative and advisory. It registers copyrights, maintains records, grows the Library of Congress’s collections, and provides expertise to Congress on copyright law. But over the past two decades, the Office has also become increasingly influential in copyright policy debates that affect free expression, libraries, educators, competition—and everyday internet users. Unfortunately, it [has not been a neutral advocate](https://publicknowledge.org/wp-content/uploads/2021/11/Final_Captured_Systemic_Bias_at_the_US_Copyright_Office.pdf). The office’s recent report on the role of AI severely [bungled the issue of fair use](https://www.eff.org/deeplinks/2025/05/us-copyright-offices-draft-report-ai-training-errs-fair-use), prioritizing private licensing market “solutions” over user rights.

Going further back, the Copyright Office [supported](https://www.copyright.gov/docs/regstat111611.html) one of the most infamous anti-internet proposals of all time—the Stop Online Piracy Act (SOPA), a disastrous internet censorship proposal that sparked one of the [largest online protests](https://www.eff.org/deeplinks/2022/01/its-copyright-week-2022-ten-years-later-how-has-sopapipa-shaped-online-copyright) in history. The Office has repeatedly advanced positions that favored large entertainment-industry interests over the public interest.

The Office also plays a major role in the Digital Millennium Copyright Act (DMCA) Section 1201 rulemaking process, which determines when the public may lawfully bypass digital locks for activities such as security research, repair, preservation, or accessibility. EFF has used this process repeatedly to [mitigate some of the worst harms of the DMCA](https://www.eff.org/cases/2018-dmca-rulemaking). H.R. 6028 would move rulemaking authority over 1201 from the Librarian of Congress to the Register of Copyrights, further consolidating power within the Copyright Office itself.

The bill also makes the Register of Copyrights a presidential appointee confirmed by the Senate. Each administration will be pressured to pick nominees aligned with their own policy preferences, and the powerful copyright owning industries will invest even more heavily in lobbying to get their way, and influence the selection. This position should be focused on administrative ability and actual expertise, not lobbying and politics.

The Copyright Office Should Stay Connected To The Library of Congress

H.R. 6028 would do more than change who appoints the Register of Copyrights. It would sever the Copyright Office from Library of Congress supervision and transfer many Librarian powers directly to the Register.

The supervisory relationship exists for good reason, as the nation’s libraries have [pointed out](https://www.librarycopyrightalliance.org/wp-content/uploads/2018/09/Lessons-From-History.pdf) for years. The Library, while far from perfect, at least has the mission of preserving and providing access to knowledge. That should be an important public-interest counterweight in copyright debates. Congress has not explained how weakening the ties between the Library and the Copyright Office would serve the public better, or even seriously inquired about it.

This Bill Was Rushed Through

Back in March, EFF joined Public Knowledge, the Center for Democracy and Technology, library organizations and tech groups, [urging Congress not to fast-track this legislation](https://recreatecoalition.org/reports/recreate-raises-concerns-with-h-r-6028/). We told them changes to the Copyright Office will have major consequences for the “speech rights, educational opportunities, and creative freedoms of all Americans.”

Yet Congress moved forward without any hearings on the bill, and without meaningful examination. H.R. 6028 creates a years-long separation of the Copyright Office from the Library of Congress, transfers significant legal authority, and restructures the appointment process for the nation’s top copyright official. Changes like that deserve hearings, debate, and public scrutiny. H.R. 6028 got none of that.

The Senate Should Stop This Bill

Copyright law exists to serve the public and [“promote the progress”](https://constitution.congress.gov/browse/essay/artI-S8-C8-1/ALDE_00013060/) of science and learning. The institutions that administer copyright law should do the same.

H.R. 6028 would move the Copyright Office further away from that goal. Congress should be strengthening public-interest oversight of copyright policymaking, not looking for ways to concentrate more authority in a single presidentially appointed official.

The Senate should reject H.R. 6028. The Copyright Office should serve the public—not presidential administrations, and not industry lobbyists.

</file>

## Input file: corpus/human/congress-narrowed-guard-act-serious-problems-remain.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: Congress Narrowed the GUARD Act, But Serious Problems Remain
author: Joe Mullin
date: 2026-05-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2026/05/congress-narrowed-guard-act-serious-problems-remain
---
Following criticism, lawmakers have narrowed the [GUARD Act](https://www.judiciary.senate.gov/imo/media/doc/496d2b5e-f099-39eb-317d-d8ab2704ee82/OLL26484_Mgrs.pdf), a bill aimed at restricting minors’ access to certain AI systems. The [earlier version could have applied broadly](https://www.eff.org/deeplinks/2026/04/guard-act-isnt-targeting-dangerous-ai-its-blocking-everyday-internet-use) to nearly every AI-powered chatbot or search tool. The amended bill focuses more narrowly on so-called “AI companions”—conversational systems designed to simulate emotional or interpersonal interactions with users.

That change does address some of the broadest concerns raised about the original proposal, though some questions about the bill’s reach remain. Bottom line: the revised bill still creates serious problems for privacy, online speech, and parental choice.

The new GUARD Act still requires companies offering AI companions to implement burdensome age-verification systems tied to users’ real-world identities. Even parents who specifically want their teenagers to use these systems would still face significant hurdles. A family might decide that a conversational AI tool helps an isolated teenager practice social interaction, or engage in harmless creative roleplay. A parent deployed in the military might set up a persistent AI storyteller for a younger child. Under the revised bill, those users could still face mandatory age checks tied to sensitive personal or financial information before they or their children can use these services.

The revised bill also leaves important definitions unclear while sharply increasing penalties for developers and companies that get those judgments wrong. Congress narrowed the GUARD Act. But it is still trying to solve a complicated social problem with vague legal standards, heavy liability, and privacy-invasive verification systems.

Intrusive Age-Verification Remains In The Bill

The revised GUARD Act still requires companies offering AI companions to verify that users are adults through a “reasonable age verification” system. The bill allows a broader set of verification methods than the earlier version, but they are still tied to a user’s real-world identity—such as financial records, or age-verified accounts for a mobile operating system or app store.

That approach still raises serious privacy and access concerns. Millions of Americans do not have current government ID, accounts at major banks, or stable access to the kinds of digital identity systems the bill contemplates. Even for those who do, requiring identity-linked verification to access online speech tools creates real risks for privacy, anonymity, and data security. Many people are [rightly creeped out](https://www.eff.org/pages/age-verification-systems-are-surveillance-systems#main-content) by age-verification systems, and may simply forgo using these services rather than compromise their privacy and security.

The revised definition of “AI companion” is also narrower than before, but it’s unclear at the margins. The bill now focuses on systems that “engage in interactions involving emotional disclosures” from the user, or present a “persistent identity, persona or character.”

EFF appreciates that the authors recognized that the prior definition could reach a variety of AI systems that are not chatbots, including internet search engines. But the narrowed definition could be read to also apply to a variety of chat tools that are not AI companions. For example, many modern online conversational systems increasingly recognize and respond to users’ emotions. Customer service systems, including completely human-powered ones that existed long before AI chatbots, have long been designed to recognize frustration and respond empathetically. As conversational AI becomes more emotionally responsive, a customer service chatbot’s efforts to empathize may sweep it within the bill’s definition.

Bigger Penalties, Bigger Incentives To Restrict Access

The revised bill also sharply increases penalties. Instead of $100,000 per violation, companies—including small developers—can face fines of up to $250,000 per violation, enforced by both federal and state officials.

That kind of liability creates incentives to over-restrict access, especially for minors. Smaller developers, in particular, may decide it is safer to block younger users entirely, disable conversational features, or avoid developing certain tools at all, rather than risk severe penalties under vague standards.

The concerns driving this bill are real. Some AI systems have engaged in troubling interactions with vulnerable users, including minors. But the right answer to that is targeted enforcement against bad actors, and privacy laws that protect us all. The revised GUARD Act instead responds with a privacy-invasive system that burdens the right to speak, read, and interact online.

Congress did improve this bill, but EFF’s core speech, privacy, and security issues remain.

</file>

## Input file: corpus/human/court-records-should-be-free.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: Court Records Should Be Free
author: Joe Mullin
date: 2026-06-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2026/06/court-records-should-be-free
---
Court records belong to the public. Yet anyone seeking access to federal court filings through PACER, a government software system that stands for Public Access to Court Electronic Records, is usually required to pay hefty fees to search for and view documents. PACER’s fees have long acted as a barrier that makes it hard, especially for low income people, to see and understand the work produced by our own public servants.

That's why EFF [joined a broad group of organizations](https://fixthecourt.com/wp-content/uploads/2026/06/Group-letter-on-the-Open-Courts-Act-6.15.26.pdf) supporting the Open Courts Act of 2026, legislation that would modernize the federal courts' electronic filing systems and eliminate PACER fees.

Public access to the courts is a cornerstone of democratic accountability.

The bill would replace the aging PACER and [CM/ECF](https://en.wikipedia.org/wiki/CM/ECF) systems with a modern, unified platform designed to improve public access, strengthen cybersecurity, and reduce long-term costs. Supporters note that PACER currently collects more than $150 million annually in fees from the public, despite court records being public documents.

The Open Courts Act would also make court records easier to find, access, and understand. The legislation builds on a [similar proposal](https://www.eff.org/deeplinks/2020/09/end-pacer-paywall), also supported by EFF, that previously won bipartisan support in the Senate Judiciary Committee but did not become law before the end of the congressional session.

This is not a new issue for EFF. More than a decade ago, [we criticized PACER's paywalls](https://www.eff.org/deeplinks/2014/09/right-know-pacer-mess-and-how-clean-it) and the removal of some court records from online access, arguing that the public should not have to pay to read the law and the judicial decisions that shape it. The Open Courts Act would move U.S. courts a big step closer to that goal.

In addition to EFF, the bill is supported by [Fix the Court](https://fixthecourt.com/), the group pushing this bill forward; the [Free Law Project](https://free.law/), which maintains RECAP, software that has created a large archive of legal opinions and other court records; as well as civil society groups, open government watchdogs, and media groups.

Public access to the courts is a cornerstone of democratic accountability. Let’s [eliminate unnecessary barriers to court records](https://www.eff.org/deeplinks/2020/09/end-pacer-paywall), and bring the federal judiciary’s tech into the modern era.

Read the [full letter](https://fixthecourt.com/wp-content/uploads/2026/06/Group-letter-on-the-Open-Courts-Act-6.15.26.pdf) supporting the Open Courts Act of 2026

</file>

## Input file: corpus/human/kids-act-would-require-age-checks-get-online.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: The KIDS Act Would Require Age Checks To Get Online
author: Joe Mullin
date: 2026-06-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2026/06/kids-act-would-require-age-checks-get-online
---
Within the next week, Congress is preparing to vote on the [KIDS Act](https://d1dth6e84htgma.cloudfront.net/H7757_SUS_xml_4b1ac8f00f.pdf), a sprawling package of legislation that seeks to control Americans’ web browsing and private messaging. The package includes a revised version of the [Kids Online Safety Act](https://www.eff.org/deeplinks/2025/05/kids-online-safety-act-will-make-internet-worse-everyone), or KOSA, combined with a collection of other internet bills, study bills, reporting requirements, and new regulations. Instead of debating any of these proposals on their merits, lawmakers are attempting to move them all at once under an ultra-expedited process.

The package of cobbled-together bills is a mess, with different age-gating schemes for different services, using different standards. It’s a lot of complexity, and a lot of legal risk. Faced with that, many companies will conclude that the safest option is restrictive age-checking practices across their entire platforms.

Buried inside the KIDS Act are provisions that will push online services to verify all users’ ages, require government-directed moderation policies for online speech, and even create new rules about private and encrypted communications. While supporters continue to claim this bill protects minors online, its requirements come at the expense of privacy, free expression, and the ability of people of all ages to use the internet without revealing sensitive data.

The KIDS Act Pressures Platforms to Check Everyone's Age

Supporters of KOSA have [said](https://www.blumenthal.senate.gov/about/issues/kids-online-safety-act) the bill doesn’t require age verification. And technically, the KOSA section of the bill does say that KOSA shouldn’t be read to require age verification.

But if you read the rest of the bill, that disclaimer starts to look hollow.

Throughout the KOSA section of the legislation, special protections, controls, messaging settings, and parental tools are required whenever a website or app “knows or should have known” a user is a child (defined in the bill as anyone under 13) or a teen (defined as anyone between 13 and 16 years old).

The problem is a website operator doesn’t need actual knowledge that a user is a minor to get in legal trouble. It applies when a platform “knows or should have known” a user’s age—a low, negligence-style standard of knowledge. If an online service gets it wrong, it’s going to be up to courts and regulators to decide, after the fact, if an online service “should” have known a user was 16.

To try to avoid liability, services will have to determine which users are teenagers and which are not. Most won’t be able to simply trust their users. They’ll have to collect more information about age, before any lawsuit or government action arises. Some companies may respond by requesting driver's licenses or passports. Others will rely on age-estimation systems that attempt to guess users' ages by looking at existing activity or doing facial scans. Existing estimation systems make mistakes when estimating children’s ages correctly, which is a big problem when that is the population KOSA is trying to protect. And the systems fail more frequently for [people of color](https://www.theguardian.com/news/2025/sep/19/how-accurate-are-age-checks-for-australias-under-16s-social-media-ban-what-trial-data-reveals), [people with disabilities](https://www.wired.com/story/when-face-recognition-doesnt-know-your-face-is-a-face/), and [trans and nonbinary people](https://dl.acm.org/doi/pdf/10.1145/3359246).

The bill’s authors seem to know this is a problem. On the one hand, the new KOSA section says age verification is not required. On the other, it repeatedly imposes obligations that depend on knowing whether a user is under 17. But a disclaimer doesn’t magically eliminate legal risk, especially for smaller services and startups that can’t afford to defend lawsuits or fight regulators.

KOSA is not the only part of this package that creates age-verification pressure. The SAFE BOTS Act, like KOSA, goes back to the standard that if a service “knows or should have known” that a user is a minor it can’t offer certain chatbot features.

The SCREEN Act requires services that host sexually explicit content to determine whether users are “more likely than not” under the relevant age limit, before allowing access to certain content.

The consequences of this liability will not be limited to minors. If websites and apps are expected to reliably identify teenagers, adults will be asked to prove they are adults. The result is a less private internet for everyone.

The KIDS Act Pressures Platforms To Police Lawful Speech

The new version of KOSA removes the bill’s infamous "duty of care" provision, a significant change. The revised KOSA requires covered platforms to "establish, implement, maintain, and enforce" policies and procedures addressing several categories of content and conduct.

Some categories, such as true threats and sexual exploitation, involve unlawful activity. Others are much broader. The bill specifically requires policies addressing the "sale or use" of narcotic drugs, tobacco products, cannabis products, gambling, and alcohol. It also restricts discussions around financial fraud.

Sounds straightforward enough. Then you remember how people actually talk—online and off. Can teens discuss addiction and recovery? Can a 15-year-old post that she’s worried she has a friend who is drinking too much? Can they seek advice about a parent’s gambling problem, or get help if they or a family member have been scammed? Can they participate in harm-reduction communities or discuss substance abuse treatment? All of these young people would be engaging in lawful speech when discussing topics covered by KOSA’s enumerated harms.

The bill does not directly ban those conversations. But it places platforms under huge pressure to create and enforce moderation policies around broad categories of lawful speech. Faced with legal risk, many services will inevitably choose to remove that speech or restrict those discussions to spaces where they know only adults can participate. We’ve seen this movie before. When legal risk goes up, platforms [will take down](https://www.eff.org/deeplinks/2018/12/congress-censors-internet-eff-continues-fight-fosta-2018-review) more speech.

The KIDS Act Regulates Private Messages, Too

Several provisions of the bill create new rules around direct messages, disappearing or “ephemeral” messages, and AI chat services.

The bill includes language stating that certain KOSA requirements should not be construed to override strong encryption. But the protection is incomplete. The carve-out applies to certain features and messaging controls, but doesn’t apply to KOSA’s separate requirement that platforms "address" a list of harms to minors.

The KIDS Act never answers an obvious question: how exactly is a platform supposed to address those activities if they’re inside encrypted communications that it can’t read? That will create pressure for providers to weaken private communications or limit features on encrypted private services.

That approach is especially troubling when it comes to ephemeral messaging. Disappearing messages are not a “loophole” or a dangerous design trick. They are a [useful privacy feature](https://ssd.eff.org/module/communicating-others) that allows online conversations to function more like ordinary real-world conversations, which are not preserved forever in a permanent database.

Like many other parts of the KIDS Act, these private messaging provisions also depend on websites and apps knowing who is a minor and who is not. The result is more age checks, more restrictions, and less privacy online.

</file>

## Input file: corpus/human/kids-online-safety-act-will-make-internet-worse-everyone.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: The Kids Online Safety Act Will Make the Internet Worse for Everyone
author: Joe Mullin
date: 2025-05-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2025/05/kids-online-safety-act-will-make-internet-worse-everyone
---
The Kids Online Safety Act (KOSA) is back in the Senate. Sponsors are claiming—again—that the latest version won’t censor online content. It isn’t true. This bill still sets up a censorship regime disguised as a “duty of care,” and it will do what previous versions threatened: suppress lawful, important speech online, especially for young people.

KOSA Still Forces Platforms to Police Legal Speech

At the center of the bill is a requirement that platforms “exercise reasonable care” to prevent and mitigate a sweeping list of harms to minors, including depression, anxiety, eating disorders, substance use, bullying, and “compulsive usage.” The bill claims to bar lawsuits over “the viewpoint of users,” but that’s a [smokescreen](https://www.eff.org/deeplinks/2024/03/analyzing-kosas-constitutional-problems-depth). Its core function is to let government agencies sue platforms, big or small, that don’t block or restrict content someone later claims contributed to one of these harms.

When the safest legal option is to delete a forum, platforms will delete the forum.

This bill won’t bother big tech. Large companies will be able to manage this regulation, which is why [Apple](https://www.blackburn.senate.gov/services/files/660C34AF-4D56-47F6-8460-3BC74023F853) and [X](https://thehill.com/policy/technology/5029776-kids-online-safety-act-update/) have agreed to support it. In fact, X [helped negotiate the text](https://www.eff.org/deeplinks/2024/12/xs-last-minute-update-kids-online-safety-act-still-fails-protect-kids-or-adults) of the last version of this bill we saw. Meanwhile, those companies’ smaller competitors will be left scrambling to comply. Under KOSA, a small platform hosting mental health discussion boards will be just as vulnerable as Meta or TikTok—but much less able to defend itself.

To avoid liability, platforms will over-censor. It’s not merely hypothetical. It’s what happens when speech becomes a legal risk. The list of harms in KOSA’s “duty of care” provision is so broad and vague that no platform will know what to do regarding any given piece of content. Forums won’t be able to host posts with messages like “love your body,” “please don’t do drugs,” or “here’s how I got through depression” without fearing that an attorney general or FTC lawyer might later decide the content was harmful. Support groups and anti-harm communities, which can’t do their work without talking about difficult subjects like eating disorders, mental health, and drug abuse, will get caught in the dragnet.

When the safest legal option is to delete a forum, platforms will delete the forum.

There’s Still No Science Behind KOSA’s Core Claims

KOSA relies heavily on vague, subjective harms like “compulsive usage.” The bill defines it as repetitive online behavior that disrupts life activities like eating, sleeping, or socializing. But here’s the problem: there is no accepted clinical definition of “compulsive usage” of online services.

There’s no scientific consensus that online platforms cause mental health disorders, nor agreement on how to measure so-called “addictive” behavior online. The term sounds like settled medical science, but it’s legislative sleight-of-hand: an undefined concept given legal teeth, with major consequences for speech and access to information.

Carveouts Don’t Fix the First Amendment Problem

The bill says it can’t be enforced based on a user’s “viewpoint.” But the text of the bill itself [preferences certain viewpoints](https://www.eff.org/deeplinks/2024/03/analyzing-kosas-constitutional-problems-depth) over others. Plus, liability in KOSA attaches to the platform, not the user. The only way for platforms to reduce risk in the world of KOSA is to monitor, filter, and restrict what users say.

If the FTC can sue a platform because minors saw a medical forum discussing anorexia, or posts about LGBTQ identity, or posts discussing how to help a friend who’s depressed, then that’s censorship. The bill’s stock language that “viewpoints are protected” won’t matter. The legal incentives guarantee that platforms will silence even remotely controversial speech to stay safe.

Lawmakers who support KOSA today are choosing to trust the current administration, and future administrations, to define what youth—and to some degree, all of us—should be allowed to read online.

KOSA will not make kids safer. It will make the internet more dangerous for anyone who relies on it to learn, connect, or speak freely. Lawmakers should reject it, and fast.

</file>

## Input file: corpus/human/no-fakes-act-could-silence-satire-commentary-and-news.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: The NO FAKES Act Could Silence Satire, Commentary, And News
author: Joe Mullin
date: 2026-06-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2026/06/no-fakes-act-could-silence-satire-commentary-and-news
---
The [NO FAKES Act](https://www.eff.org/deeplinks/2026/06/tell-congress-just-say-no-no-fakes) is supposed to target harmful AI-generated impersonations. But in reality, it will [make it easier to suppress](https://www.eff.org/deeplinks/2026/06/tell-congress-just-say-no-no-fakes) commentary, satire, and other lawful speech. That's why EFF has signed a [letter](https://cdt.org/wp-content/uploads/2026/06/NO-FAKES-Summer-2026_FINAL-1.pdf) urging the Senate Judiciary Committee not to advance the bill in its current form.

In the letter, EFF joins a coalition of civil society groups in pointing out that the bill would import many of the worst features of the DMCA notice-and-takedown system into an even broader range of online expression. Faced with a “heckler’s veto” over legal speech, platforms will have incentives to remove content first and ask questions later.

The bill offers no protection for a platform’s judgment about an often difficult question—whether a particular piece of content is satire, parody, commentary, or news. Any platform that guesses wrong faces penalties of up to $750,000 per work.

NO FAKES could also undermine the rights of the people it is supposed to protect. The new federal “likeness” right could be licensed or transferred to others, so individuals will lose control over the use of their own face and voice. That’s not theoretical—workers in the entertainment industry are routinely asked to sign broad contracts about the future use of their likenesses.

As the letter notes:

A background actor who signs a release on set or an ordinary person who clicks through a platform's terms of service could end up with the right to their own face and voice in someone else's hands, for years, with federal enforcement behind it.

EFF and the other signatories urge Congress to examine existing legal remedies and pursue narrowly tailored solutions to genuine harms. The last thing we need is a sweeping new intellectual property right that threatens free expression.

In addition to EFF, the letter is signed by the Center for Democracy & Technology, the American Civil Liberties Union, Fight for the Future, Foundation for Individual Rights and Expression, the Organization for Transformative Works, Public Knowledge, the R Street Institute, The Future of Free Speech, and the Woodhull Freedom Foundation. Read the [full letter](https://cdt.org/wp-content/uploads/2026/06/NO-FAKES-Summer-2026_FINAL-1.pdf) here.

</file>

## Input file: corpus/human/why-are-gay-bars-building-databases-their-patrons.txt

<file>
---
source: EFF Deeplinks (eff.org)
title: Why Are Gay Bars Building Databases of Their Patrons?
author: Joe Mullin
date: 2026-07-01
human_authored: true
license: CC-BY-4.0
link_targets: stripped
extraction: field--name-body node only
permalink: https://www.eff.org/deeplinks/2026/07/why-are-gay-bars-building-databases-their-patrons
---
Update 8/10/2026: Two San Francisco bars that used Patronscan have said they will [stop using the system](https://www.sfgate.com/sf-culture/article/bars-face-scanning-reverse-22382172.php) after listening to customers’ privacy concerns. EFF applauds this change and we hope other bars follow suit by returning to ID-checking systems that respect their customers’ rights.

————————————————————

[Recent reports](https://www.advocate.com/news/san-francisco-gay-bars-privacy) have [raised alarm](https://sf.gazetteer.co/why-do-these-castro-gay-bars-have-tsa-style-face-scanners) about the use of PatronScan, an ID-checking and face-scanning system, at multiple LGBTQ+ bars in San Francisco’s Castro neighborhood. Much of the attention has focused on reports that the system photographs patrons as they enter venues and questions about whether those images are used for facial recognition.

A broader privacy concern also deserves scrutiny. For years, PatronScan has marketed itself not just as an ID-verification tool, but as a system that allows bars and clubs to identify patrons, keep records about them, and share information across venues. As one news article published in 2019 [documented](https://onezero.medium.com/id-at-the-door-meet-the-security-company-building-an-international-database-of-banned-bar-patrons-7c6d4b236fc3), PatronScan built a network that allowed participating bars to flag patrons and share information about them with other establishments.

And in California, it’s not at all clear how PatronScan’s business model of scanning IDs and sharing the information from those scans with other bars comports with the law. California’s [ID privacy law](https://codes.findlaw.com/ca/civil-code/civ-sect-1798-90-1/), which was amended in 2018 to add ID “scans,” states that no businesses shall “retain or use” any information from a scanned ID card except for limited purposes such as to verify age, comply with a legal requirement, or prevent fraud.

A venue cannot claim to be a safe space while feeding its patrons’ data to a third party database.

Californians should be deeply concerned about businesses that collect information from government-issued IDs and use it to build databases about where people go, whom they associate with, and whether they should be allowed into other public gathering places. That concern is especially strong in LGBTQ+ spaces, which have long served as refuges for people to go without being tracked, monitored, or put on lists.

We reached out to Patronscan with questions regarding their practices and their views on California ID law. They referred us to their [published FAQ](https://patronscan.com/policies/) question “Is Patronscan privacy compliant in California?” which claims that the use of Patronscan kiosks is legal in California. They also said “Patronscan does not do facial recognition in North America, or any kind of automated analysis of the ID or the live photo image.”

The California Legislature Has Investigated PatronScan’s Business Model

In 2018, the California Legislature published bill analyses (on that year's [AB 2769](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201720180AB2769)) that went into detail about PatronScan’s business. Reviewing PatronScan's own materials, the California Senate Judiciary Committee [found that the company had collected and retained information](https://www.eff.org/document/ca-senate-floor-analysis-ab-2769) on 561,087 customers in Sacramento alone during the first five months of 2018—a remarkable figure for a city whose population had only recently topped 500,000.

Lawmakers also found that at that time, PatronScan retained information for at least 90 days or longer in some cases, shared information among participating bars, and maintained bans that lasted an average of more than 19 years. A PatronScan “Public Safety Report” used 10,000 scans collected on a single day to report on “where customers live, how far they have traveled, and how many different venues the customers patronized.”

This was not simply checking IDs at the door. PatronScan was building a database.

An immigrants’ rights group, the Coalition for Human Immigrant Rights (CHIRLA), [wrote about its concern](https://www.eff.org/document/ca-assembly-floor-analysis-ca-2769) at the time with these growing ID databases, saying that “placing individuals on a database that labels them a "threat to public safety" has “significant immigration consequences that could lead to deportation, revoking of current status, or denial of future immigration relief.”

Today, Patronscan [states](https://patronscan.com/policies/) that it retains personal information about all customers for 21 days, and about flagged customers for up to five years. This includes the customer’s name, date of birth, photograph, gender, and zip code. It also includes the dates and times that the customer entered particular bars. Such databases are a grave privacy threat. Personal data is routinely stolen by thieves, misused by a company’s employees, seized by government agencies, and diverted to new purposes by a company’s executives.

California Law Still Bans ID-Scan Databases, And Bars Should Follow That Law

In 2018, California lawmakers closed what they viewed as a loophole. Existing law already prohibited businesses from retaining or using information obtained when they “swiped” a driver's license, except for the narrow purposes of legal requirements (like a judicial warrant) or “preventing fraud, abuse, or material misrepresentation.”

After reviewing companies like PatronScan, the Legislature amended the law to make clear that the same restrictions that apply to businesses that “swipe” ID cards also apply when those IDs are “scanned.” PatronScan opposed that change, arguing it wanted to preserve the ability to share information among bars so participating venues could decide whether to admit patrons.

The bill became law anyway. Yet PatronScan continues to market and sell a system that apparently retains information from scanned IDs, and allows participating venues to flag patrons and share information across its network.

At a minimum, that raises serious questions about how those practices fit with California's existing ID privacy law. Bar and nightlife venue owners who utilize PatronScan should think twice about its effects on their customers, and consider going back to standard, visual ID checks. These physical checks have been effective at keeping underage patrons out of 21-and-over venues for decades, and don’t present the serious privacy dangers of creating a private database of bar patrons.

For venues serving vulnerable communities like immigrants or the LGBTQ+ community, the stakes of using this technology are even higher. It’s disappointing and alarming to see some of California’s more well-known LGBTQ+ nightlife spots instead lining up as PatronScan’s early adopters. A venue cannot claim to be a safe space while feeding its patrons’ data to a third party database. These businesses should reject PatronScan, return to the standard ID checks that every other bar has been able to utilize, and prove to their customers that their privacy and security still matters.

</file>


Complete the renderer's refusal checks now.
This locked corpus is expected to be renderable; if it is not, state the refusal
rather than inventing evidence.
Otherwise emit voice-profile-source/1 exactly as described by the system prompt.
Supply semantic prose, supporting filenames, fixed frequencies, measurement IDs,
and one entry for every coverage dimension. Do not copy counts, rates, support
fractions, rules, observation IDs, coverage statuses, or final profile fields; the
portable deterministic assembler owns those. Return the structured object only.

Mechanical absence availability:
- profanity-vulgarity has no measured positive replacement; do not emit it as an absence. Leave its dimension unresolved instead.
- first-person-singular-family may be an absence only with measured replacement first-person-plural-family; the assembler may reuse that positive observation across dimensions.
- en-dashes may be an absence only with measured replacement em-dashes or round-parenthetical-spans; the assembler may reuse that positive observation across dimensions.

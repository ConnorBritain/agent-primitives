Render profile doctorow-blog.
Every allowed input file is reproduced verbatim below. Read all of them and
follow the system prompt's output contract exactly. No filesystem tools exist.

## Input file: profile.json

<file>
{
  "name": "doctorow-blog",
  "description": "Daily link-blog posts and essays — argumentative, technical, addressed to a returning readership.",
  "medium": "blog",
  "register": "polemical, first person, one continuing audience",
  "notes": [
    "FIXTURE, built from CC BY 4.0 material for testing voice-profile-render and",
    "voice-draft. Not a real user's profile.",
    "",
    "Unlike the chekhov and bacon fixtures this corpus is CONTEMPORARY and untranslated:",
    "the author is living, the prose is present-day English, and no editor or translator",
    "sits between the writer and the page. That is the whole point of it — FU-13 exists",
    "because the period-marked fixtures put a floor under the critic's finding rate that",
    "no amount of drafting quality can clear, and a ship bar calibrated on them would be",
    "measuring the century rather than the generator.",
    "",
    "Attribution and licence: ../../../../../prose-tell-scan/tests/corpus/human-essays/",
    "ATTRIBUTION.modern.json. Posts carry their own permalink in frontmatter."
  ]
}

</file>

## Input file: voice.md

<file>
# Voice card — doctorow-blog

Not filled in yet.

## Sentence rhythm

<!-- Deliberately left empty. -->

## Constructions you own

<!-- Deliberately left empty. -->

## Vocabulary you own

<!-- Deliberately left empty. -->

## Constructions you ban

<!-- Deliberately left empty. -->

## How register shifts

<!-- Deliberately left empty. -->

</file>

## Input file: measurements.json

<file>
{
  "schema": "voice-profile-measurements/1",
  "corpus_words": 17549,
  "sample_count": 10,
  "samples": [
    {
      "file": "2026-07-09-wilhoitian.txt",
      "words": 1400
    },
    {
      "file": "2026-07-10-posthuman-as-in-no-humans.txt",
      "words": 1122
    },
    {
      "file": "2026-07-11-your-risk.txt",
      "words": 2459
    },
    {
      "file": "2026-07-13-go-meta-meta.txt",
      "words": 898
    },
    {
      "file": "2026-07-14-designated-survivor.txt",
      "words": 1328
    },
    {
      "file": "2026-07-16-lucky-orifices.txt",
      "words": 2552
    },
    {
      "file": "2026-07-21-dickovers.txt",
      "words": 2332
    },
    {
      "file": "2026-07-22-table-flipper.txt",
      "words": 2061
    },
    {
      "file": "2026-07-23-drop-a-dime.txt",
      "words": 1963
    },
    {
      "file": "2026-07-24-supplemental-income.txt",
      "words": 1434
    }
  ],
  "samples_excluded": [],
  "undelimited_samples": [],
  "measurements": [
    {
      "id": "second-person-family",
      "count": 385,
      "per_1000_words": 21.94,
      "samples_with": 10,
      "samples_without": 0,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:second-person-family] Count case-insensitive whole-word tokens you, your, yours, you're, you've, you'd, and you'll in the extracted sample bodies."
    },
    {
      "id": "first-person-plural-family",
      "count": 127,
      "per_1000_words": 7.24,
      "samples_with": 10,
      "samples_without": 0,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:first-person-plural-family] Count case-sensitive whole-word tokens we, We, us, our, Our, ours, Ours, and the listed contracted we forms in the extracted sample bodies; uppercase US is excluded."
    },
    {
      "id": "contractions",
      "count": 300,
      "per_1000_words": 17.09,
      "samples_with": 10,
      "samples_without": 0,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:contractions] Count whole-word n't, 're, 've, 'll, 'd, and 'm forms plus 's only for the closed elision hosts it, that, there, here, who, what, where, when, how, why, he, she, let, one, nothing, everything, something, somebody, nobody, and this; possessive 's is excluded."
    },
    {
      "id": "uncontracted-negatives",
      "count": 9,
      "per_1000_words": 0.51,
      "samples_with": 5,
      "samples_without": 5,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt"
      ],
      "counting_rule": "[measurement:uncontracted-negatives] Count case-insensitive whole phrases do not, does not, did not, is not, are not, was not, were not, cannot, could not, would not, should not, will not, have not, has not, and had not in the extracted sample bodies."
    },
    {
      "id": "profanity-vulgarity",
      "count": 26,
      "per_1000_words": 1.48,
      "samples_with": 10,
      "samples_without": 0,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:profanity-vulgarity] Count only the case-insensitive whole-word profanity and vulgarity forms enumerated by the prose-author profanity rule; coined words containing a rude root are excluded."
    },
    {
      "id": "first-person-singular-family",
      "count": 113,
      "per_1000_words": 6.44,
      "samples_with": 10,
      "samples_without": 0,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:first-person-singular-family] Count case-insensitive whole-word tokens I, me, my, mine, and myself in the extracted sample bodies."
    },
    {
      "id": "question-marks",
      "count": 38,
      "per_1000_words": 2.17,
      "samples_with": 10,
      "samples_without": 0,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:question-marks] Count every literal question-mark character in the extracted sample bodies."
    },
    {
      "id": "round-parenthetical-spans",
      "count": 97,
      "per_1000_words": 5.53,
      "samples_with": 10,
      "samples_without": 0,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:round-parenthetical-spans] Count each non-nested pair of round brackets whose contents stay on one line in the extracted sample bodies."
    },
    {
      "id": "em-dashes",
      "count": 0,
      "per_1000_words": 0,
      "samples_with": 0,
      "samples_without": 10,
      "files_with": [],
      "files_without": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "counting_rule": "[measurement:em-dashes] Count every literal em-dash character in the extracted sample bodies."
    },
    {
      "id": "en-dashes",
      "count": 73,
      "per_1000_words": 4.16,
      "samples_with": 10,
      "samples_without": 0,
      "files_with": [
        "2026-07-09-wilhoitian.txt",
        "2026-07-10-posthuman-as-in-no-humans.txt",
        "2026-07-11-your-risk.txt",
        "2026-07-13-go-meta-meta.txt",
        "2026-07-14-designated-survivor.txt",
        "2026-07-16-lucky-orifices.txt",
        "2026-07-21-dickovers.txt",
        "2026-07-22-table-flipper.txt",
        "2026-07-23-drop-a-dime.txt",
        "2026-07-24-supplemental-income.txt"
      ],
      "files_without": [],
      "counting_rule": "[measurement:en-dashes] Count every literal en-dash character in the extracted sample bodies."
    }
  ]
}

</file>

## Input file: corpus/human/2026-07-09-wilhoitian.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: Post-political
author: Cory Doctorow
date: 2026-07-09
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/08/wilhoitian/
---
There's plenty of reasons to be skeptical of centrists who bemoan "political polarization" and call for a politics that abandons the "tribalism of left and right."

Obviously there's the false equivalence: on the right, you have fascists who want to send masked, armed goons into the streets to beat, kidnap and murder your neighbors. On the left, you have calls for higher taxes, unions, environmental impact reviews for data-centers, and an end to the genocide in Gaza.

"Leftist extremism" is moving some zines around:

https://www.theguardian.com/us-news/ng-interactive/2026/jun/24/prairieland-texas-ice-protests-zines

Right wing extremism is attempting the overthrow of the government, murdering brown people in gulags, and the earth's richest man slaughtering the world's poorest children for the lulz:

https://hsph.harvard.edu/news/usaid-shutdown-has-led-to-hundreds-of-thousands-of-deaths/

"Horseshoe theory" (the idea that the far right and the far left actually bend around to meet each other) is bullshit:

https://pluralistic.net/2024/02/26/horsehoe-crab/#substantive-disagreement

The reality is that the right and left have large, substantive disagreements that are matters of life and death. Anyone dismissing these as "tribalism" doesn't know what "left" and "right" mean. At best, they have mistaken a collection of cultural signifiers – pronouns, MMA, brands of beer – for politics.

Mistaking cultural signifiers and identity markers for politics is centrism's most dangerous pathology, the thing that makes centrism the handmaiden of the right. If you think identity markers are politics, then you'll be tempted to think the answer to a world run by 150 rich, white, cis straight guys is to replace half of them with women, POCs and queer people. The difference between the left and the right isn't the identities of the ruling class – it's whether we have a ruling class at all.

I collect definitions of "right" and "left." There's Corey Robin's definition from The Reactionary Mind, that conservatism is the belief that some people were born to rule, and others to be ruled over, and that any attempt to elevate the latter group to positions of power (through civil rights movements, affirmative action, etc) will result in dire misrule and disaster:

https://pluralistic.net/2025/07/22/all-day-suckers/#i-love-the-poorly-educated

This explains how the right can encompass white nationalists (rule by white people), Hindu nationalists (rule by high-caste Hindus), libertarians (rule by bosses), imperialists (rule by military aggressors), etc. It also explains the right's obsession with learning the racial and gender markers of anyone involved in a plane crash or other disaster: "See, the oil tanker was being piloted by a DEI hire when it crashed into that bridge!"

Another important definition is Wilhoit's Law:

Conservatism consists of exactly one proposition, to wit: There must be in-groups whom the law protects but does not bind, alongside out-groups whom the law binds but does not protect.

https://pluralistic.net/2025/08/26/sole-and-despotic-dominion/#then-they-came-for-me

This one hardly needs explanation in this era of "it's not a crime if the president does it," where Alex Jones can owe billions to the parents of dozens of murdered children and somehow not have to pay or give up his assets:

https://www.status.news/p/infowars-the-onion-alex-jones-ben-collins

But when it comes to a "post-politics that is neither right nor left," the definition I turn to most often comes from science fiction writer Steven Brust, who once told me:

"Left" and "right" have had the same meaning since the French Revolution. If you want to know if someone is on the left or the right, ask them, "What is more important: human rights or property rights?" If they say "Property rights are a human right," then they are on the right.

https://pluralistic.net/2021/03/16/wage-theft/#ppp

That's it. That's the crux. If you think that property rights are a tool for achieving human rights, then you're on the left. You might support the right of farmers to block attempts to expropriate them via eminent domain in order to build a data center, or the right of people to not have their homes or devices searched by cops, or a library's right to own and archive digital books, even if the publishers insist that ebooks are never "sold," merely "licensed."

If property rights are a tool to achieve human rights, then property rights can be set aside when they impede other rights. Human beings have the right to health care, which is why we should have taken away the pharma companies' patents and copyrights, ending vaccine apartheid and letting the poor world make its own vaccines:

https://pluralistic.net/2021/05/25/the-other-shoe-drops/#quid-pro-quo

Human beings have the right to shelter. If your town has a million empty homes and a million homeless people, there's an obvious solution. At the very least, you can tax the shit out of empty homes to discourage the creation of derelict, empty blights:

https://www.liverpoolecho.co.uk/news/liverpool-news/owners-homes-left-empty-more-28622796

Human beings have the right to food. If a cartel claims that you may not legally sell your 100,000lbs of nectarines, you can just give them away and tell the cartel to fuck off:

https://apnews.com/article/california-farmer-nectarines-lawsuit-patent-4f7bc8ab185e8b9cbdd6d6ad4f2aabd1

As Brust says, this fight is as old as the French Revolution. It's literally the plot of Les Miz ("In days gone by, I stole a loaf of bread in order to live").

Note that this framework leaves plenty of room for disagreement among leftists: we can disagree about who should get taxed and how, when a company should be ordered to destroy its ill-gotten loot and when that loot should be divided up among its victims, and what to do about empty houses and homeless people. We can disagree about reparations, about collectivization and co-operatives, about land reform. Very (very!) few leftists want to abolish property, but to be a leftist is to agree that property is only ever a means, and never an end.

In systems thinking, we are counseled that the most profound and durable changes come from shifts in paradigms, from which all rules, laws and arrangements flow:

https://pluralistic.net/2026/05/12/donella-meadows/#paradigmatic

"Left" and "right" represent two radically different paradigms. The right's paradigm is that property rights are human rights, which cashes out to "property rights are the only human right." If property rights are a human right, then I can burn down my orchard and laugh as you starve outside the gates. If property rights are human rights, I can leave an apartment building empty while you freeze to death on its sidewalk. If property rights are human rights, I can fill my factory with death-traps and insist that the workers I kill freely chose to assume that risk (as economists would say, they have a "revealed preference" for being killed at work):

https://pluralistic.net/2026/03/30/players-of-games/#know-when-to-fold-em

Leftists view property rights as a tool, like laws, or regulations, or polls, or voting. Used well, these tools can produce prosperity for all. But "voting" and "laws" aren't good unto themselves. The Swiss practice of voting on whether your neighbors qualify for citizenship is barbaric:

https://www.bbc.com/news/newsbeat-38595807

Good regulations and laws are good, but simply passing any law is stupid and gets you into terrible trouble, even if the stupid law you've passed is designed to solve a real problem:

https://pluralistic.net/2026/06/23/destroy-the-village/#to-save-it

Viewed as tools, property rights are perfectly useful ways of achieving the primary purpose of a civilization: to safeguard the human rights of its people. Viewed as ends unto themselves, property rights are a terrible danger to our civilization and species.

If you believe property rights are tools, then you can pass laws banning corporations from electioneering:

https://sos.mn.gov/media/3k4hu2if/minnesota-election-laws-statutes-and-rules.pdf

If you believe property rights are human rights, then you end up supporting unlimited dark money spending in elections:

https://www.supremecourt.gov/opinions/25pdf/24-621_h315.pdf

If you believe property rights are tools, you can order landlords who want to ban their tenants from installing balcony solar to fuck off. If you believe property rights are human rights, then landlords can force their tenants to pay every dime the fossil fuel industry demands of them. "Property right as tool" allows you to defend a farmer's right to install a wind-farm, and still, to block a data-center from installing a gas turbine on its own land.

"Post-political" movements are made up of people who don't know what politics are. A "centrist" is ultimately a rightist, because the foundation of rightism is the supremacy of property. It is the ideology that breeds hereditary aristocracy ("property is a human right" means that it's a violation of your human rights to expect you to work for a living if you emerged from a lucky orifice). It's the ideology that breeds oligarchy.

Politics aren't a bunch of cultural signifiers or identity markers. Politics aren't about who rules – it's about whether we are ruled at all, or whether we are free.

(Image: Lewis Clarke, CC BY-SA 2.0, modified)

</file>

## Input file: corpus/human/2026-07-10-posthuman-as-in-no-humans.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: &quot;Rights for robots&quot; and the AI slavery fantasy
author: Cory Doctorow
date: 2026-07-10
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/10/posthuman-as-in-no-humans/
---
While the AI bubble is primarily a material phenomenon (driven by the calculation that bosses are easy marks for a sales pitch that sees them replacing workers with software), there is an inescapable ideological component to it: the desire for a world without people in it:

https://pluralistic.net/2026/05/13/vibe-governance/#k-hole

If you'd like an essay-formatted version of this thread to read or share, here's a link to it on pluralistic.net, my surveillance-free, ad-free, tracker-free blog:

https://pluralistic.net/2026/07/10/posthuman-as-in-no-humans/#hell-is-other-people

AI dangles the possibility of a world without ego-shattering confrontations between bosses who tell themselves they're in charge, and the workers who know how to do things and insist on telling bosses that their ideas are dangerous, illegal and/or unworkable:

https://pluralistic.net/2026/01/05/fisher-price-steering-wheel/#billionaire-solipsism

A world without people might be lonely, but it sure would be convenient. How maddening it must be to invest billions in Amazon warehouse automation, only to have to slow down or (gasp!) stop the machines so that the workers who serve as "humans in the loop" can stop to pee! Isn't there some way we can make that their problem, not ours?

https://pluralistic.net/2024/05/06/one-click-to-quit-the-union/#foxglove

With AI, the fact that you need to pee – or get paid – does become your problem, rather than your boss's. After the majority of your colleagues have been fired ("because AI will do their jobs"), you become painfully aware that there are plenty of people who need your job, who will happily step in to take it if you complain too much about your bladder or your paycheck.

Even better is when the "human in the loop" can be outsourced to a company overseas, which allows bosses to simply set-and-forget a set of requirements for how the human part of the AI's labor is to be done without ever having to meet or even think about those workers' conditions. This is the illusion of full automation, in which the AI does the job "like magic."

The "magic"? A human being stuck in AI Omelas, tormented by an algorithm that sets an inhuman pace, demands inhuman perfection, and metes out pitiless punishments for any misstep – or perceived misstep – without appeal or explanation. So often, "AI" stands for "Absent Indians": low-waged call-center workers pretending to be robots:

https://pluralistic.net/2024/01/29/pay-no-attention/#to-the-little-man-behind-the-curtain

There are many differences between jobs performed by machines and jobs performed by people, of course. But the biggest difference between a machine and a person is moral consideration. A person deserves and demands moral consideration: for their wellbeing, their feelings, even their bladders. A machine gets none of this: you can curse at it, kick it, snap out orders without a "please" or "thank you."

There's only one kind of person you get to treat like this: a slave.

Slavery is labor without even the pretense of moral consideration.

AI, then, isn't just the fantasy of a world without people – it's the fantasy of a world without people…except for slaves. It's the fantasy of a world where the skilled workers who tell you your ideas are stupid are replaced with pliable chatbots who tell you they're brilliant, and then uncomplainingly do the job to your specifications.

It's a world where the cab driver who has all kinds of shit going on in their life – health problems, family problems, (especially) money problems – is replaced by a "robo-taxi" that is being overseen and (often) driven by a remote worker you can't talk to or see, whose problems you therefore never need consider.

The "AI safety" world is a key piece of the AI hype machine, pulling focus away from the idea that AI has shitty economics, produces substandard goods, and fails to do the jobs it takes from human workers, and shifting that focus to the idea that AI is so powerful that it constitutes an existential risk to the human race. The idea that teaching too many words to the word-guessing program risks creating a "superintelligence" that awakens and converts all into paperclips is absurd, a silly idea akin to the notion that if we breed horses to run ever faster, one of our mares will foal a locomotive. Nevertheless, the elevation of "AI takeoff" from a thought-experiment to an "existential risk" is a powerful marketing tool, because any technology that is indistinguishable from god is also going to be extremely valuable (at least, up to the moment that it turns us all into paperclips):

https://pluralistic.net/2024/05/17/fake-it-until-you-dont-make-it/#twenty-one-seconds

Once the superintelligence thought-experiment is upgraded to an X-risk, lots of other thought experiments are sucked along in its wake. That's where "rights for robots" comes in, the idea that we should spend time thinking about whether chatbots should have human rights.

The best argument for this is that every time we extend rights to the nonhuman world, we end up treating each other better. Movements to extend moral consideration to animals raised uncomfortable questions about the treatment of humans: slaves, workers, poor people, women, children. The Rights for Nature movement, which seeks to extend legal and moral personhood to watersheds and forests, has been key to winning legal and moral victories to protect the environment, and thus the animals and people who depend on it.

But while extending rights to natural things produces positive spillovers for human thriving and rights, the opposite happened when we extended personhood to artificial constructs. Corporate personhood has been a catastrophe for human thriving, conjuring into existence a new race of immortal, pluripotent colony organisms we call "limited liability corporations" that use us as disposable, inconvenient gut flora even as they consume our environment, our political system, and our lives:

https://pluralistic.net/2026/04/16/pascals-wager/#doomer-challenge

There's every reason to think that extending personhood to AI will produce the same outcome as "rights for corporations," which is the opposite of the outcome of "Rights for Nature." Rights for nature come at the expense of corporations. Rights for corporations come at the expense of nature. Humans are part of nature, so we benefit from the former, and suffer under the latter:

https://pluralistic.net/2026/04/15/artificial-lifeforms/#moral-consideration

But here's the kicker: as soon as you start arguing about whether chatbots have rights, you elevate them to personhood, which means that all those chatbots your boss just bought are people. And because they're the kind of people who don't warrant moral consideration (let alone a please or thank you), they are slaves (hence "rights for robots").

The AI sales pitch relies on convincing bosses that we've invented a new kind of slave – a worker who neither deserves nor demands rights or consideration. "Rights for robots" affirms that sales pitch. "Rights for robots" implies that robots are slaves. Wittingly or unwittingly, the transformation of "rights for robots" from a thought experiment to a campaign is a massive convincer for any AI salesman who's hunting for would-be slavers to sell chatbots to.

</file>

## Input file: corpus/human/2026-07-11-your-risk.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: Workplace &quot;flexibility&quot; isn&#039;t
author: Cory Doctorow
date: 2026-07-11
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/11/your-risk/
---
Here's an irony: the "gig economy" is a statistical black hole. Workers, customers and regulators know very little about the most basic aspects of it: how much workers get paid, for example, or much unpaid time on the clock a worker puts in before they get a job from the app.

The reason this is ironic is that the "gig economy" is dominated by a handful of massive, data-driven firms that know the precise, up-to-the-second answer to these questions. The problem is that they won't share the data. Of course, workers and customers have the data, too, but our data is widely diffused, with each worker and each customer only representing a single, infinitesimal pixel in this massive picture.

Most of our industry-wide figures about the sector come from painstaking, expensive survey work. The expense and effort involved in conducting this analysis means that the public's understanding of the gig companies' business is fragmentary and thin.

But every now and again, we get a flashbulb glimpse of the full picture. One of those glimpses was captured by David Weil, the former labor standards boss at the US Department of Labor. In 2024, the Massachusetts Attorney General sued Uber over worker misclassification, with Weil serving as an expert witness, who was able to access the raw data on Uber's business operations.

In a new American Prospect longread called "The Dangerous Myth of Flexibility," Weil builds on the public record developed in the case to demolish the central myth of the gigwork companies: that they enter into a mutually beneficial arrangement with their workers by offering "flexibility" that lets workers "choose work that fits the rhythms of their lives, not the other way around":

https://prospect.org/2026/07/09/dangerous-myth-of-flexibility-uber-lyft-gig-economy/

This quote comes from Tony West, the Uber executive who has led the company's efforts to formalize its worker misclassification program, notably California's Prop 22, a $225m statewide campaign that overturned the state's landmark gig work standards. West is also Kamala Harris's brother-in-law, and he served as her campaign's corporate liaison, senior strategist and economic policy advisor.

On its face, West's statement sounds reasonable, and most of us have heard a version of it, possibly even from an Uber driver. But what Uber calls "flexibility" is really a way for the company to offload its operational risks onto its drivers.

Anyone who runs a business has to manage a key operational risk: staffing levels. A restaurateur who doesn't schedule enough cooks, bussers and servers might have to turn away business at the door if there's a rush. But if the restaurateur schedules too many people for a shift, they'll end up paying for those workers to stand around scrolling Tiktok.

In America, Congress and state legislatures have created a system that allows restaurateurs to transfer this risk onto their employees: the "tipped minimum wage." Federally, the minimum wage for tipped employees is only $2.13/hour, with the caveat that employees are obliged to "top up" their workers' pay if the tips from their shift don't add up to $7.25/hour. So if you work five hours and don't wait on a single table, your boss has to pay you $36.25 ($7.25/hour * 5 hours). But if you have a busy shift and you make $40 in tips, your boss only has to pay you $10.65 ($2.13 * 5 – the tipped minimum).

This is a transfer of risk from bosses to workers. The boss can schedule extra servers and offload most of their wages to diners who come through the doors. If your boss overestimates the amount of business, much of the cost of that miscalculation comes out of your paycheck.

This is quite a sweet deal for bosses. After all, servers have virtually no control over the amount of business a restaurant attracts. It's the boss, not the server, who decides where the restaurant will be, which hours it will keep, which food it will serve, how much the food costs, what advertisements to run, and where and when to run them. The boss controls the decor, staff attire and the music. They make the decisions, and workers pay the price if they decide poorly.

For most businesses, workers are less exposed to risks from their boss's strategic errors. If your boss screws up, you might see a lower annual bonus, or take a career hit thanks to the bad company's presence on your CV. Of course, if your boss really messes up they might lay you off or go out of business altogether, but it's a rare business that gets to externalize its risks onto its workers on a shift-by-shift basis the way restaurants get to.

But as sweet as restaurateurs have it, that's nothing compared to the incredible deal that gig platforms get. Companies like Uber and Lyft get to shift nearly all their risk to their workers, and then insist that they're doing workers a favor by offering them "flexibility." Like a restaurateur, Uber and Lyft control all the mechanisms by which the number of riders is set. They decide how to advertise and how to price their rides. When a driver signs on and makes themselves available – at no charge – to Uber, it is the company's actions, not the driver's, that determine whether that driver gets a job, and how much they'll get paid.

Uber and Lyft claim that drivers have control, too – when (if) they're offered a job, they get to decide whether to take it. This is true, but it's more complicated than that. Drivers get about 15 seconds (!) to decide whether to accept a job, which means they have 15 seconds to calculate the mileage and time-based rate on offer, all while operating a vehicle in traffic. Drivers who accept lowball offers risk having their base pay permanently eroded through "algorithmic wage discrimination," which is when the gig platforms infer that workers who accept very low wages are economically desperate and can be offered even lower wages in the future:

https://pluralistic.net/2023/04/12/algorithmic-wage-discrimination/#fishers-of-men

But workers can't simply refuse offers and wait for the wage on offer to increase. That increase may happen, but if a driver is too picky, the platform will punish them for turning down too many offers by excluding them from future opportunities. If this happens often enough, the driver may end up broke enough to start accepting those lowballs, triggering the inexorable downward trajectory of their expected earnings.

This is "flexibility," but mostly it's flexibility for Uber, not for drivers. Uber controls when a driver gets paid, and they control the data about that payment. This allows Uber to claim to be paying well north of minimum wage, while drivers average less than $2.50/hour. Uber exploits its information asymmetry to publish only the numerator (the amount a driver makes when a passenger is in the car) while hiding the denominator (how many hours it takes for Uber to put a passenger in that car):

https://pluralistic.net/2024/02/29/geometry-hates-uber/#toronto-the-gullible

Uber has perfected a system of algorithmic pricing that allows it to dangle just enough money in front of drivers to maximize their number on the road, irrespective of how many riders are looking for cars. The fact that they have all the information (while drivers have none) allows them to extract vast amounts of totally unpaid labor from those drivers. And then, once a passenger gets in the car, Uber's informational systems let it pay that driver the absolute minimum they will accept for the ride.

Of course, it works the same way for passengers, each of whom is offered a different price for the same ride, based on the company's surveillance data and its realtime calculations about how much the rider is willing to pay. When Uber launched, driver pay and passenger fares were linked (the same way a server's tips and the cost of a meal are linked). Today, these are fully decoupled. Uber runs a kind of cod-Marxist operation where workers are paid according to their desperation, and passengers are gouged according to their ability to pay:

https://pluralistic.net/2025/01/11/socialism-for-the-wealthy/#rugged-individualism-for-the-poor

This works so well (for Uber) that Uber has launched a side hustle selling algorithmic pricing and algorithmic wage discrimination systems to companies in other sectors, so expect this arrangement to infect ever-wider swathes of the economy:

https://investor.uber.com/news-events/news/press-release-details/2025/Uber-Expands-AI-Data-Platform-to-Power-Next-Gen-Enterprise-and-AI-Lab-Needs/default.aspx

(And this is neither here nor there, but holy shit, is Uber's investor relations site seriously serving ASPX pages in 2026?! Hey Khosrowshahi, the DOJ called and it wants its Clinton-era antitrust evidence back!)

Back to algorithmic pricing: this opaque, take-it-or-leave-it algorithmic pricing arrangement sets Uber apart from other platforms where sellers offer temporary use of their property to buyers. As Weil writes, at least Airbnb hosts get to override the nightly rate suggested by the platform (though I'd add that the platforms will downrank and bury people who resist their suggestions).

As Weil points out, even if Uber had to pay the minimum wage and assume other operational risks associated with running a business, they'd still have access to these algorithmic tools, albeit with different parameters. Rather than setting the wage floor for drivers at $0/hour, they'd have to pay $7.25/hour (the federal minimum wage, or more, depending on the state). This would force the company to refuse shifts to drivers when there were enough workers on the road to handle demand, but drivers would benefit from this arrangement – rather than driving around for a shift, burning gas and putting wear on your car without getting paid, Uber would just tell you to stay home.

Uber could try to offload those risks onto passengers, but remember, Uber is already charging riders a personalized price based on massive troves of surveillance data that is continuously re-analyzed to guess the largest sum you're willing to pay for any given ride. You're already paying the highest price Uber can set for you, in other words.

Weil has been in many forums – including that Massachusetts courtroom – where Uber touted its "flexibility" as a benefit to drivers. But as he shows, Uber could offer all the same flexibility to drivers without the downside risk of driving around for hours without earning a dime. Sure, forcing Uber and Lyft to extend rights and protections that every employee gets would raise their costs – but "the same is true for any company having to comply with employment law and work protections."

Outside of the US, these companies are being forced to shift the risk from their workers' backs to their own balance sheets. As Weil writes, the UN's International Labor Organization has set binding labor standards for gig companies, called Convention 193, "Decent Work in the Platform Economy":

https://onlabor.org/a-win-for-platform-workers-ilo-convention-no-193/

The US government is pulling out all the stops to prevent these standards from being applied to US gig companies, even abroad. Trump's labor boss Keith Sonderling told the world that the US government "will not sit on the sidelines while some foreign governments push to hamper American innovation in the gig economy worldwide":

https://www.washingtonexaminer.com/opinion/3435961/america-must-lead-gig-economy/

But, as Weil says, this isn't about innovation, flexibility or AI. It's about gig companies changing the distributional outcome of whole sectors, to shift money from workers to investors.

The rest of the world has its own ideas. In Switzerland, the Supreme Court found that gig companies' businesses were illegal and ordered them to extend normal labor protections to gig workers. Naturally, the gig companies just ignored the law and continued to screw those workers. Gig workers, as noted, are diffused. They don't work in the same place. They have no way to find out who else works for the same boss as they do. The same factors that keep us from gathering stats on gig work also keeps gig workers from comparing notes on how they're getting shafted.

What's a labor organizer to do? The Swiss labor union Syndicom came up with an ingenious solution. They partnered with a popular, pro-union pizza restaurant, listed it on the delivery platforms, and then placed orders for tons of pizzas through the scofflaw food-delivery platforms. They transformed the pizzeria into a pop-up union labor hub, and had an organizing conversation with every rider the company dispatched to the restaurant:

https://vimeo.com/1203473793

This is deliciously ingenious, and the labor organizing need not stop there. Companies like Para have shown how, by jailbreaking the apps used by gig workers, they can allow those workers to comparison shop for the best wage. Rather than getting 15 seconds while navigating traffic to decide whether a job is worth taking, drivers and riders could use a "counter-app" that evaluates all the offers on all the platforms and coordinates with other workers to mass-reject lowball offers:

https://pluralistic.net/2021/08/07/hr-4193/#boss-app

The only problem is the "anticircumvention" laws that criminalize this kind of reverse-engineering and modifications of apps. These laws make it a literal crime to change how an app running on your own phone works. These laws were invented in America, with 1998's Digital Millennium Copyright Act, but in the ensuing years, the US Trade Rep has used the threat of tariffs to force every country in the world to adopt their own anticircumvention laws. By caving into US bullying, all of America's trading partners have left their workers and consumers vulnerable to technological surveillance, manipulation and price-gouging, to the great benefit of the US tech companies that have fused with the Trump regime.

This is the hidden silver lining to Trump's lunatic tariffs: they take away the threat that kept all those US-protecting foreign IP laws in force. When someone threatens to burn your house down unless you do as you're told, and then they burn your house down anyway, you really don't have to keep complying:

https://pluralistic.net/2026/01/01/39c3/#the-new-coalition

The possibilities for counterapps in gig work are endless. In Indonesia, gig rider co-ops commission "Tuyul" apps that mod their dispatch apps in ways small (upsizing the font) and large (spoofing the GPS):

https://pluralistic.net/2021/07/08/tuyul-apps/#gojek

In his article, Weil cites a study showing that customers for gig apps tend not to comparison shop – once you choose your default taxi-hailing app, that becomes your go-to. But with counter-apps, your default could be a price-comparison app that bids out your job to all the platforms and chooses the cheapest one, forcing the gig companies to compete with each other:

https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5729723

The platforms like to pitch themselves as "frictionless," but the reality is that they don't reduce friction so much as reallocate it. Because they control the technology, because the law makes it a literal crime to wrestle that control away, they can shift all the friction from their side of the ledger to yours, whether you're a worker or a customer:

https://pluralistic.net/2025/08/23/become-unoptimizable/#downward-redistribution

Tony West isn't lying when he says Uber values flexibility – they value their flexibility, which arises out of the constraints (technical, legal) they impose on us: the drivers and passengers.

</file>

## Input file: corpus/human/2026-07-13-go-meta-meta.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: Why aren&#039;t AI companies competing directly with their customers?
author: Cory Doctorow
date: 2026-07-13
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/13/go-meta-meta/
---
"I often wonder what the Vintners buy/One half so precious as the Goods they sell" -The Rubáiyát of Omar Khayyám

I first encountered that quote from someone extolling the virtues of bookstores, and it stuck with me, because for most of my childhood, every bookstore visit ended with me broke and wishing I'd had three times as much to spend.

As a larval hyperlexic, I just didn't understand what a bookseller could possibly buy with my money that was better than the books they already had? Of course, then I became a bookseller and discovered that Sturgeon's Law ("90% of everything is shit") applies to a bookstore's wares as much as it does to anything else. I also acquired a monthly rent obligation and discovered just how important money could be.

Nevertheless, Omar Khayyám's question stuck with me, especially when I fell down a years-long rabbit-hole of learning about scams and the finance sector (but I repeat myself). Every get-rich-quick schemer will tell you that they've found the infinite money hack, which they will sell to you for a remarkably reasonable sum. Likewise, every stock picker claims they can outperform a simple low-load index fund, and all they ask of you is a few hundred basis points in exchange for multiplying your wealth beyond the dreams of Creosote. Neither one has a good answer to Khayyám's question: if you can make all the money with your amazing system, why do you need my money?

This is a question that needs to be forcefully put to AI hucksters. In their more expansive moments, the Altmans and Amodeis of the world will tell you that they're planning to teach the word-guessing program so many words that it will wake up and become god. DOGE's broccoli-haired brownshirts laughed in the faces of the NIH lifers who begged them not to vaporize their long-running cancer research projects: "General AI is around the corner and it's going to cure cancer. Cancer research is a waste of money!"

Which all raises the question: if you've truly incubated a foetal demiurge in your "AI lab," why are you offering to sell it to me? What do the AI hucksters buy/One half so precious as the Gods they sell?"

Of course, they might answer, "We need your money now so we can make god later." That's why they want your boss to fire you and replace you with their chatbots and split your wages with your former employer. But this just raises the same question: if you have a chatbot that can do a doctor's job, why sell it to a hospital? Why not just open your own hospital? If you've got a chatbot that can do a tax accountant's job, why sell it to a tax-prep service? Why not just open a tax-prep service? If you've got a chatbot that can teach my kids, why sell it to my local school district? Why not just open a school?

If the chatbot can do the job, and if the chatbot costs less than the worker who does the job today, then the chatbot company can profitably sell services more cheaply than anyone who presently employs that worker, because the chatbot company already owns the chatbot. If you were really on a glide path to creating an all-powerful deity and just needed cash to keep the venture going until the cancer-curing word-guesser awoke from its long slumber, then wouldn't you want as much cash as possible? Why would you voluntarily split the take with some sucky, washed, non-god-generating business from before 2022?

I think the only reason this question doesn't come up more frequently is that we're stewing in what Douglas Rushkoff calls the "go meta" economy, in which the most respectable and smartest business to operate must be as many abstraction layers away from real work as possible. Don't drive a taxi, own a medallion that you rent to the cab driver. Don't own a medallion, start a "rideshare" company. Don't start a rideshare company, invest in a rideshare company. Don't invest in a rideshare company, buy options to invest in a rideshare company:

https://pluralistic.net/2022/09/13/collapse-porn/#collapse-porn

The inverse relationship between doing something useful and making money is deeply ingrained in our economic wisdom. Take the world of online grifters, who don't just peddle get-rich-quick PDFs, they also peddle tools to generate get-rich-quick PDFs, as well as tools to steal other "wealth influencers'" insta videos and deepfake yourself into their pretend private jets:

https://www.404media.co/how-i-bought-a-private-jet-by-selling-10-subscriptions-to-404-media/

The scam economy boasts a bewildering array of ancillary services, like a $150/month service that lets you produce fake screenshots showing vast monthly income on other scam services (November Kelly calls this "The world's most expensive 'inspect element'"):

https://www.patreon.com/trashfuture/posts/faux-high-level-163443872

It's an old truism that in a gold rush, the only people who come out ahead are the people selling the picks and shovels. But that's not true – there's even more money to be made wholesaling picks and shovels to the retailers who operate the frontier mercantiles. Go meta!

https://commons.wikimedia.org/wiki/File:Alaskan_Gold_Mining_Supplies_(1897)_(ADVERT_277).jpeg

Today's economy is dominated by pick-and-shovel wholesalers. America is a gerontocracy drowning in MBAs, while there's no one to do eldercare:

https://www.msn.com/en-us/news/us/why-recruiters-can-t-find-workers-and-new-grads-can-t-find-jobs-it-s-not-ai/ar-AA27K57y

So it's not surprising that we don't ask why these AI god-botherers need our stupid money while they're immanentizing the eschaton. Why would they operate a hospital if they could go meta and sell the doctorbots to the MBAs running the hospital?

</file>

## Input file: corpus/human/2026-07-14-designated-survivor.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: Gerontocracy&#039;s failure mode
author: Cory Doctorow
date: 2026-07-14
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/14/designated-survivor/
---
The "designated survivor" is one of the weirder aspects of America's (very, very weird) political system.

Each year, during the State of the Union address, when both houses of Congress and the President are all under one roof, a single political figure, in the line of succession for the presidency, is spirited away to a hidden bunker, just in case the US legislative and administrative branches are decapitated in a single, spectacular terrorist strike:

https://en.wikipedia.org/wiki/Designated_survivor

Initiated during the 1950s, designated survivors are a paranoid relic of the Cold War, but they're also a relic of an era when America was a less chud-dominated, more technocratic land. It's a longtermist sort of procedure, in stark opposition to vibes-based MAGA chaos in which the Mad King makes daily announcements of new wars, tariffs, monuments, and existential threats to the nation.

America's ruling class have always sought an equilibrium between its pure Id of hatred for labor, autocratic yearnings and apocalyptic fantasies, and its patient, scheming Ego, the author of endless FedSoc judicial nominee listings, Projects 2025, and decades-long schemes to overturn Roe and reverse the New Deal.

(Democrats have their own version of this, of course – the endless contest between the McKinsey wing of the party's right and its infinitely embroidered Machin-Synematic Universe.)

The problem is that once the atavistic, impulsive elements of your project escape containment, the resultant turbulence sucks everyone else into their chaotic vortex. How can you plan for anything when you're buffeted by endless stunts, feints, and distractions?

Nowhere is this failure to plan more vivid than in the age distribution of both chambers of the US legislature, its presidential candidates, and its judicial appointments. What's more, this is equally true of the Democrats and the Republicans.

The equilibrium of all of America's key institutions is brittle: legislative majorities are often just one or two seats wide. Key federal circuits and the Supreme Court are knife-edge balances. We keep getting presidential races between septuagenarians and octogenarians.

The question here isn't whether old people can be good at those jobs. They obviously can be. The problem is actuarial: old people are far more likely to die, or suffer severe medical episodes, than younger people. This is a fact of life that every person understands, and the older you get, the better you understand it.

I'm 55. 20 years ago, it was unusual for just one of my peers to die in a given year; now I lose a couple every year. It could be me next (my doctor just informed me that I am cancer free, following excision, radiotherapy and immunotherapy). Anyone who pretends this isn't true is setting themselves and the people around them up for terrible things.

If you're a writer, this means making plans for the smooth management of your literary estate. For the past couple decades, John Scalzi has been my anointed literary executor. He's a great choice: a fabulous writer with a good head for business and a strong handle on my politics and artistic sensibility, whose personal ethics are above reproach. The only problem is that John is a couple of years older than me, which means that he'd be a great executor if I got hit by a bus tomorrow, but not if I keel over with a heart attack in 20 years.

So this year, I added a second executor, Molly White, who is also a fantastic writer, also extremely ethical and also very attuned to my politics and literary sensibilities. Molly is 20 years younger than me, and she has relevant experience: she's also the executor of the literary estate of her great-grandfather (EB White).

In the unlikely event of my untimely death, Molly and John will do a great job running the estate (which mostly will consist of reviewing my agents' recommendations). And if John keels over right after me, Molly will be fine on her own.

Of course, the only reason I need a literary executor is that my kid is only 18. At 18, she's a remarkable, level-headed, ethical young person, but she's not yet fully formed. Literary history is filled with descendants who take over a literary estate and run it in terrible ways. The most notorious example here is Stephen Joyce, grandson of James Joyce and a colossal asshole:

https://en.wikipedia.org/wiki/Stephen_James_Joyce

The most likely destiny for my literary estate is that I will grow older alongside my daughter, who will mature in ways that make her a perfectly suitable literary executor (in addition to being the beneficiary of my literary estate) and in a few years I'll send a note of thanks to John and Molly and change the paperwork. But in the unlikely, awful event that my kid runs into serious challenges that make me question her judgment and probity, I'll be covered.

That's what planning is all about: thinking through various scenarios, including low-likelihood, high-salience ones that have easy mitigations, and taking appropriate and proportionate steps to avoid disaster.

You know: like squirreling away a designated survivor in a bunker far from DC during the State of the Union.

This is what makes America's political gerontocracy so weird. In their true hearts, the nonagenarian (1), octogenarians (5), septuagenarians (27) and late sexagenarians (7) in the US Senate know that they could keel over at any moment, and that in a 53:47 Senate, this could spell doom for their political project.

Sure, Mitch McConnell might be secretly dead and that's bad and weird. But it wouldn't be exceptional. We're talking about a legislature whose members sometimes disappear for months, only to be discovered in care homes with advanced dementia, while still somehow holding office:

https://www.politico.com/news/magazine/2025/03/14/kay-granger-dementia-dc-media-00210317

It's a legislature whose most prominent grandees cling to power at the very brink of death's door, long after they can be effective leaders, just so they can anoint their successor during the next election:

https://en.wikipedia.org/wiki/Dianne_Feinstein#Personal_life

Elections have consequences, but special elections, called after the sudden death of an elderly lawmaker, have wild consequences.

Of course, anyone can die suddenly. 15 years ago, one of my dearest friends, a contemporary, went to bed in seeming perfect health and never woke up. He was only 44. I still miss him, every day:

https://memex.craphound.com/2012/06/28/eulogy-for-erik-possum-man-stewart/

But the likelihood this happening goes up the older you get, and once you cross a certain age threshold, the odds rise sharply. If you're part of a political project that's laying and executing long-term plans whose outcomes turn on hair-fine majorities, this should factor into your thinking. The failure to do so can throw everything you've worked for into disarray:

https://prospect.org/2026/07/13/budget-consequences-of-lindsey-grahams-sudden-departure/

It's not limited to the legislature, of course. The Supreme Court's slide into its role as handmaiden to totalitarianism began when the dying Ruth Bader Ginsburg refused to step down, because she wanted her successor to be picked by the first woman president:

https://www.nytimes.com/2020/09/21/magazine/ginsburg-successor-obama.html

The amazing thing here is that RBG made her name as a master strategist, but when it came to this incredibly consequential matter, she set strategy aside for hubris:

https://radiolab.org/podcast/more-perfect-sex-appeal

Security practitioners know that anyone can be hacked or scammed, and that the biggest vulnerability of all is to be so confident in your own procedures and discernment that you assume it could never happen to you. If you think you can't get scammed, you are a danger to yourself and others:

https://pluralistic.net/2024/02/05/cyber-dunning-kruger/#swiss-cheese-security

By the same token, any politician in their 70s or 80s who thinks that they can't suffer a stroke or heart attack or the kind of lapse that makes you freeze up during a presidential debate is a danger to their party, their politics and their nation:

https://www.cbsnews.com/news/jill-biden-joe-biden-stroke-2024-debate-sunday-morning-interview/

This isn't about how healthy or robust any given politician is or feels; this is about the cold reality of actuarial tables. The older I get, the more those actuarial tables factor into my own decision-making. The fact that our political classes seem to think that they can choose the time and manner of their passing is baffling.

</file>

## Input file: corpus/human/2026-07-16-lucky-orifices.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: Deranged billionaires and their syndromes
author: Cory Doctorow
date: 2026-07-16
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/16/lucky-orifices/
---
The theory of markets goes like this: even the best of us can fall prey to selfishness and rationalization, so let's arrange society so that people acting on their most selfish impulses end up producing benefit for all of us. That'll be easier and more reliable than convincing everyone to be more generous.

How do you arrange society so that selfishness produces public benefit? With markets. Faced with relentless competition, the most effective way to accumulate and retain wealth is by striving to make your wares cheaper and better. In a competitive labor market, we can secure fair treatment for workers without labor law or unions – bosses who treat their workers badly will lose them to better bosses. Just "align the incentives" and let markets do the rest.

This is an area where there's broad overlap between the left and the right. Chapter one of The Communist Manifesto is Marx and Engels' love letter to the incredible power of markets to improve everyone's material conditions by increasing production while lowering costs:

https://www.nytimes.com/2022/10/31/books/review/a-spectre-haunting-china-mieville.html?unlocked_article_code=1.yFA.YcmQ.KuTFFpUAnlmt&amp;smid=url-share

Meanwhile, over in Wealth of Nations, Adam Smith comes to the same conclusion:

It is not from the benevolence of the butcher, the brewer, or the baker, that we expect our dinner, but from their regard to their own interest. We address ourselves, not to their humanity but to their self-love, and never talk to them of our own necessities but of their advantages.

In other words: if you get the incentives right, then even the greediest baker will resist the temptation to fill his loaves with sawdust and gravel. The greedier he is, the more he'll strive to make his bread cheap and delicious, because that will let him sell as many loaves as possible, thus maximizing his own wealth.

It's not exactly horseshoe theory vindicated, but if you squint just right, you'll see both communists and capitalists agreeing on this one thing: if you want the bourgeoisie to bend its efforts to producing something that the rest of us can benefit from, you'll get further by appealing to their fear and greed than by trusting in their munificence.

This is how you can have both leftists and market true believers coming onto the same side on antitrust: they may not both exactly agree that the best way to run things is by appealing to capitalists' fear of being dethroned by a competitor, but they absolutely agree that the worst way to run things is to simply trust in capitalists' generosity.

They're right, of course. As Lina Khan likes to say, companies that are too big to fail become too big to jail, and thus too big to care. If you doubt it, consider this internal email sent by an Apple executive insisting that the company is wasting money by making iPhones that are too good, and counseling a corporate strategy of deliberate shittiness:

In looking at it with hindsight, I think going forward we need to set a stake in the ground for what features we think are 'good enough' for the consumer. I would argue we're already doing more than what would have been good enough. But we find it very hard to regress our product features YOY [year over year]." Existing features "would have been good enough today if we hadn't introduced [them] already," and "anything new and especially expensive needs to be rigorously challenged before it's allowed into the consumer phone.

https://www.justice.gov/d9/2024-06/423137.pdf

Policymakers can assume the profit motive, but they have to craft the conditions under which that motive is shaped by competitive anxiety to produce quality goods and services at a fair price.

Anyone who believes in markets must also tacitly believe that successful market participants don't believe in markets. They should understand that capitalists hate capitalism, that every pirate yearns to be an admiral. They should understand that capitalism's winners only defend disruption when they're the ones doing the disrupting. They should understand that profits are only good when you're a scrappy challenger, but once you've conquered the market, every capitalist seeks to become a feudal lord, converting profits to rents and insulating themselves from an exhausting life of constant competition:

https://pluralistic.net/2023/09/28/cloudalists/#cloud-capital

The (smart) defenders of markets do understand this, but they face a dilemma. By definition, the benefactors with the most money and power to contribute to their think-tanks, university economics departments, conferences and publications are the rentiers – the billionaires who've shored up their fortunes with Warren Buffet's beloved "moats and walls." They're the blitzscaling billionaires who thrive on predatory acquisitions and high capital costs that prevent new market entrants from challenging their incumbency and its easy profits. They're the pirates who've become admirals.

As Upton Sinclair famously quipped, "It is difficult to get a man to understand something, when his salary depends on his not understanding it." When your right-wing, "pro-market" think-tank depends on the largesse of someone who made their money by capturing a market, capturing its regulators, and capturing its labor force, you need to tie yourself into some very weird knots to explain why your market advocacy shouldn't start with stripping your funders of their power, wealth and position.

This is pretty much the entire edifice of neoclassical economics. There's the "consumer welfare" theory of antitrust, that says that monopolies are efficient and insists that an inefficient monopoly would immediately tempt new competitors into the market who would compete away the monopolist's advantage:

https://pluralistic.net/2025/11/06/vertical-blinds/#invest-dont-acquire

"Consumer welfare" is a perfect apologetic because it contains a lurking syllogism: it holds that "inefficient monopolies" will always bring forth competitors who trash their margins, which means that any actual monopoly we see in the wild must be efficient. If it wasn't, it would have been competed out of existence by now. QED. This means that you can be a "pro-market" think-tank and take infinite money from monopolists without any contradiction: by definition, any monopolist with extra cash on hand to fund your PR blitz on its behalf must be efficient, otherwise it would have gone broke.

This is the structure of so many of economics' "empirical, scientific" theories that boil down to new ways of saying, "Actually, your boss is right."

Take "revealed preferences," the idea that people's actions are a better indicator of their preferences than the things they say they prefer. While this theory has a certain superficial plausibility, it can really only be embraced by people who have suffered the highly specific neurological injury you get by taking an economics degree: an injury that makes you incapable of perceiving or reasoning about power.

To fully embrace "revealed preferences" is to observe someone who has just sold their kidney to make rent and exclaim, "Look at this person with a revealed preference for only having one kidney":

https://pluralistic.net/2026/03/30/players-of-games/#know-when-to-fold-em

Then there's the right's conception of regulatory capture. When you think of "regulatory capture," you might picture a company or sector that has grown so powerful that it can boss the government around, so that it can abuse you with impunity. But for a neoclassical, "regulatory capture" isn't the result of too much corporate power – it's the result of too much state power. If states have the ability to do real things (the theory goes), then capitalists will do everything they can to take over the state and use it to punish their competitors, so the only answer is to eliminate state capacity altogether:

https://pluralistic.net/2022/06/05/regulatory-capture/

And finally, there's "meritocracy," which is a way of dressing up the Puritans' concept of divine providence as a scientific theory about how society must work. Puritans insisted that their god reached down into the human realm to elevate the truly virtuous among us, and that this divine favor could be discerned in the way that wealth and power were distributed among us. The rich and powerful were god's "elect." You could tell this was true, because they were rich and powerful. The corollary is that the poor and downtrodden are disfavored by god, and must therefore lack some virtue that the rich and powerful possess.

This same syllogistic thinking underpins the economic doctrine of "meritocracy," which holds that markets are giant computers that process uncountable trillions of decisions we all make about what to buy and sell and at what price, seeking out the "correct" price for every commodity and also elevating the people who are best at allocating capital in ways that arrive at the best prices for the best goods. Just as a Puritan believes that wealth is evidence of virtue, a hewer to economic orthodoxy believes the meritocratic system graces the best among us, giving them control over our lives by allowing them to "allocate capital" to create or destroy jobs, or entire firms, or whole sectors of the economy. You can tell they're the right people to do be doing this because the market chose them – if they were bad capital allocators, they'd have gone broke by now. QED.

When capital allocators' kids end up allocating capital too, well, that just shows that "merit" is a heritable trait and the people who have it are born to rule over us. Meritocracy cashes out to a eugenic belief in royal blood and royal dynasties. We know King Arthur was suited to rule us because he pulled a sword out of a stone, and we know Bill Gates is suited to rule over us because he pulled a fortune out of an operating system:

https://pluralistic.net/2025/05/20/big-cornflakes-energy/#caliper-pilled

Consumer welfare, revealed preferences, regulatory capture and meritocracy are just some of the ways that capitalism's alleged defenders cooked up to insist that they love the competitive discipline imposed by markets while being totally dependent on self-described capitalists who have utterly escaped from that discipline and have committed to doing everything in their power to prevent themselves from ever coming under any form of constraint.

These champions of "free markets" have spent decades defending policies like noncompetes, which makes it a crime for a fast-food worker to quit their job at Wendy's and take a job at the McDonald's across the street in order to get a $0.25/hour raise:

https://pluralistic.net/2025/09/09/germanium-valley/#i-cant-quit-you

They defend anticircumvention laws that make it a literal felony for you to install someone else's app store on your phone or put someone else's ink in your printer:

https://memex.craphound.com/2012/01/10/lockdown-the-coming-war-on-general-purpose-computing/

They somehow believe that value arises when the best among us are forced to contend with the stark terror of losing everything to a competitor, but also that there is a group of people who are so perfect, so virtuous and brilliant that they do not need this kind of goad to prod them into action. Indeed, these genetic sports and generational talents are so amazing that to force them to sully themselves with grubby competition is to deny us all the fruits of their genius.

Who are these people? Why, they're billionaires of course. All billionaires: after all, if providence and the market's invisible hand has seen fit to bestow nine or more zeroes upon someone, that is an indicator of 10^9 times more virtue than someone with only a dollar to their name. But especially: intellectual billionaires, the kinds of "curious" billionaires who write books, give lectures, and (especially), make gigantic cash donations to think-tanks, university economics departments, conferences and journals.

Billionaires like Peter Thiel and Elon Musk, in other words.

These are the billionaires that capitalism's (alleged) defenders are caping for when they deplore "billionaire derangement syndrome," and fret that candidates for office now routinely cite enmity for billionaires in their campaign materials:

https://marginalrevolution.com/marginalrevolution/2026/07/andrew-hall-is-on-a-roll.html

But as Tim O'Reilly writes, these billionaire-defending intellectuals always told us that markets would protect us from the madness of kings, by constraining the folly of the wealthy and powerful through the discipline of competition. Meanwhile, those billionaires were busily transforming themselves into kings, unshackled from rules, morals or consequences:

https://www.economist.com/by-invitation/2026/07/12/elon-musk-is-building-a-form-of-capitalism-that-adam-smith-would-hate

Reflecting on this, the political scientist Henry Farrell notes that the most vocal defenders of billionaireism – the Musks and Thiels of the world – never made a secret of their desire to become kings and insulate themselves from markets and discipline of every kind, and they've grown brazen. Musk makes social media posts deploring the very idea of elections, agreeing with the idea that only "makers" should be allowed to vote and that "takers" should not, because "universal suffrage leads to universal suffering":

https://nitter.net/elonmusk/status/2073312715985309698

As for Thiel, he has long openly advocated the idea that there exists among us a latent aristocracy who do not need the discipline of markets to keep them from lapsing into folly or self-dealing. These people – born to found tech startups and to rule – are nonconformists who, in Thiel's writing, are "the most important" and "should be let off the hook":

https://blakemasters.tumblr.com/post/24578683805/peter-thiels-cs183-startup-class-18-notes

Thiel makes no bones about his idea that people who have the right stuff should be exempted from any constraint. He writes "capitalism and competition are opposites." Rather than compete, Thiel says the true entrepreneur should seek to establish a monopoly, because "Monopolists can afford to think about things other than making money; non-monopolists can’t…Only one thing can allow a business to transcend the daily brute struggle for survival: monopoly profits."

It's not that Thiel opposes constraints per se – he clearly thinks that most of us should operate under constraints – constraints that are dreamed up and enforced by people like him. Those people are born to rule: they emerged from a lucky orifice, in possession of lucky genes. How can we tell they were born to rule? Because they're ruling. If they weren't born to rule, they wouldn't be in a position to rule. As ever, a syllogism solves all our ideological and existential problems.

Thiel lives in what Naomi Klein would call "the mirror world." While counterculturists have long celebrated misfits and communities of nonconformists, they were invested in the idea of a space protected from power, where weirdos could let their freak flags fly:

https://pluralistic.net/2023/09/05/not-that-naomi/#if-the-naomi-be-klein-youre-doing-just-fine

But Thiel's version of this is to celebrate the "nonconformists" whose heterodox belief is that labor, privacy, finance and consumer protection laws shouldn't apply to them. He wants to protect those people so they can wield power. They should form "mafias" (like the "Paypal mafia") not solidaristic affinity groups. As Farrell writes:

Entrepreneurial risk taking can be awesome; weird people are often more likely to be original; densely linked communities have many advantages. Furthermore, I would guess that none of these factors was sufficient on its own to precipitate the madness of princes that we see today. It is perfectly possible that they would have worked together in much more benign ways under different external circumstances. But we are in the world we’re in: one where the boundless appetites and irrationalities of a small number of billionaires seem increasingly incompatible with the need to maintain a stable civil society.

A new would-be aristocracy was always the visible trajectory of these guys. The only people who couldn't see it were the think-tankies they funded to write papers explaining that their paymasters didn't need market discipline to keep them from sinking into folly or attempting to overthrow democracy.

Today, these Renfields clutch their pearls at the "demonization" of the ultra-rich, calling it "billionaire derangement syndrome." But the only "billionaire derangement syndrome" that matters is the syndrome that affects billionaires and convinces them that they are above any discipline or rules.

</file>

## Input file: corpus/human/2026-07-21-dickovers.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: Dealing with dickovers (21 Jul 2026) dickovers
author: Cory Doctorow
date: 2026-07-21
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/21/dickovers/
---
One of 2026's better tech-related coinages is "dickover," John Gruber's term for

a modal panel, popover, or curtain presented by a website or app, deliberately obscuring its own content to frustrate the user with an unwanted, unnecessary, mandatory interaction; e.g. asking the user to accept “cookies”, subscribe to a newsletter, install the website’s mobile app, agree to terms of service, or anything else that the user couldn’t give two shits about.

https://daringfireball.net/2026/05/what_is_a_dickover

These are bad everywhere, but they are especially terrible in the UK and EU, where websites practice a form of malicious compliance to the GDPR, Europe's landmark privacy law. Under the GDPR, websites are required to secure your affirmative consent to process your data. The obvious way that websites should respond to this is by not collecting your data unless there's a damned good reason for it, but the actual response is to repeatedly shove cookie-consent dialogs in your face before letting you use the site.

These are absolutely unnecessary. Your browser can be configured to transmit a "global privacy control signal" by default that tells websites you don't consent to be spied on while you look at their pages:

https://support.mozilla.org/en-US/kb/global-privacy-control

But many websites punish you by throwing up a "Global Privacy Control detected" dickover that forces you to click through to affirm their confirmation of your confirmation that you don't want to be spied on.

If you don't have the GPC set, websites will demand that you tell them whether you want to be spied on – and they'll do it again, every time you visit them. The website operators falsely claim that they have to do this under the terms of the GDPR (or other laws, like California's CCPA). This is a lie. Every privacy law contains an exception that allows websites to store data about you for a "legitimate interest," and that obviously includes setting a cookie that says, "don't ever spy on this user."

What's a legit interest? Well, I can tell you what it isn't. Facebook claimed that they had to spy on you, even if you opted out by laboriously clicking through one of their dickovers or by transmitting a GPC signal to their servers, because you had also clicked through their terms of service, which say, "Facebook is going to spy on you with every hour that god sends, from asshole to appetite, abandon hope all ye who enter here" (a direct quote). Facebook claims that this is a contract with you, whereby the company has promised to spy on you, and if they stop, they would be violating the contract, which might make you mad, so they are legally required to eavesdrop on every conversation you have and follow you everywhere you go:

https://www.cliffordchance.com/content/dam/cliffordchance/briefings/2023/07/european-court-of-justice-in-facebook-ruling-clarifies-interplay-between-eu-competition-law-and-data-protections-enforcement.pdf

This is bullshit, and the European Court of Justice affirmed it. But despite the fact that surveillance advertising companies are happy to stretch the definition of "legitimate interest" to cover "spying on you because our ToS say we will," these same companies insist that "legitimate purpose" can't possibly include "remembering the fact that you told us not to spy on you the last time you were here," and so every time you click through to one of many popular websites, you get a dickover, and the only way to make it stop is to "consent" to being spied upon.

But it doesn't have to be this way. While the right answer to this kind of rampant lawlessness is stonking fines and even the corporate death penalty for repeat offenders, internet users have a myriad of options available to them for banishing dickovers to the scrapheap of history. These measures aren't difficult to avail yourself of, and using them will make your life infinitely better, so I'm going to tell you about some of them.

Before I start, one note: these measures only work on browsers, not apps. An app is a webpage wrapped in the right kind of IP law to make it a felony to change how it works, which is why companies are infinitely horny to get you to use their apps, not their websites:

https://pluralistic.net/2024/05/07/treacherous-computing/#rewilding-the-internet

What's more, these measures really only work on desktop browsers, because mobile browsers are apps, and are severely limited by law and mobile operating systems, making it hard-to-impossible to customize them so that they'll respect your rights. This is true of all mobile browsers, but it goes triple for iOS (iPhones and iPads):

https://pluralistic.net/2022/12/13/kitbashed/#app-store-tax

Finally, this mostly only works on Firefox, and it works worst on Chrome, Google's monopolistic browser. When it comes to customizing your browsing experience to get rid of annoyances like dickovers and ads, Chrome is hands-down the worst choice, and Google is about to make it much, much worse, forcing a change that will kill the most popular blockers. Stop using Chrome, switch to Firefox:

https://protonprivacy.substack.com/p/google-is-finally-killing-ublock

So, once you're on your actual computer, using Firefox, how can you disenshittify your internet experience? The first thing to familiarize yourself with is Reader Mode, a built-in Firefox feature that switches any webpage to a black type/white background column of text. Just click the little "page view" icon next to the Firefox location bar or use the key combo "ctrl-alt-r."

Some power tips for Reader Mode: Firefox tries to guess whether a given page should have a Reader Mode option based on its layout. This sometimes blocks Reader Mode on pages that badly need it. You can force Firefox to always allow you to try Reader Mode by going to "about:config" in your location bar, then searching for "reader.parse-on-load.force-enabled" and toggling it to "true". If you switch to Reader Mode and the page breaks, you can switch back by hitting ctrl-alt-r again.

Many websites' "soft paywalls" (which allow you to read an article or two before getting a demand to register and/or pay) can be defeated with Reader Mode. Just hit ctrl-alt-r and see if the whole article appears. If it doesn't, try one or both of: a) reloading the page while still in Reader Mode, and/or; b) Clearing cookies for the page (click the shield next to the site's URL in Firefox's location bar, then click "Clear cookies and site data"), and then reload.

That's Reader Mode, and it comes built into Firefox, and can be installed via various extensions on other browsers. Now let's move on to more advanced techniques, starting with "Kill Sticky," a bookmarklet that deletes any "static" elements in a web-page you've loaded (broadly, this is anything that won't change position when you scroll your browser).

Just click the "Kill Sticky" bookmarklet and all the static elements in the current tab go away. This includes things like navigation bars, which are often (but not always) useless annoyances. The original Kill Sticky, created by Alisdair McDiarmid, is 13 years old, and it still works great, but eight years ago, gala8y created a new version that caught some outliers that the original Kill Sticky missed. I've been running gala8y's version for a year now with no problems, and I recommend it as your second line of dickover defense (after Reader Mode):

https://github.com/gala8y/kill-sticky–forked

Kill Sticky is great for getting rid of the dickovers on a website you're not planning to visit more than once. But if you visit a dickover website regularly, you can permanently block its dickovers by using the Adblock Plus (ABP) browser extension:

https://adblockplus.org/

Once you have Adblock Plus installed, you can instruct your browser never to render a given website's dickover. Just load the website, hover your pointer over the dickover, and click your right mouse-button (Mac users need to ctrl-click). This will pop up a Firefox context menu, and at the bottom of that menu is "Block Element…".

Select "Block Element," then move your mouse around the screen. Different regions of the screen will glow pink, showing you which element (part of the page) ABP can access there. Once you've highlighted the dickover, click the "Preview" button on the ABP dialog in the bottom right corner. This will show you how the page looks after you've banished that element.

If it's an element you want to delete forever, click "Create" and ABP will create a new rule for that page that blocks that element. Note that many dickovers consist of several elements, each atop the other, and after you block one element, you might have to repeat the process to delete the element "behind" it, digging your way down to the actual webpage. Each element you block is listed in the top pane of the ABP dialog box. For example, here's Wired.com's UK dickover:

||media.wired.com/photos/6a565246c8e0799a2981818e/1:1/w_*c_limit/WEB_2026-06-21_EA-WIRED-NBNO-FullQual_0011.jpg

If you block an element by accident and want to restore it, just delete its corresponding line in the Block Element dialog. When websites change their layouts and their dickovers come back, just add the new one to the Block Element for that page. No need to delete the old entries.

Finally, if all else fails, there's Remove Paywall, a website that tries several different ways to load a page without its interrupters, nag screens, regwalls and paywalls:

https://www.removepaywall.com/

It's also available as a browser plugin, so you can just right-click on any page and select "Remove Paywall" from the pop-up menu. Remove Paywall often loads a page with all of its dickovers, and you can use all the techniques enumerated above – Reader Mode, Kill Sticky and Block Element – with Remove Paywall versions of pages.

Back in 2024, Ed Zitron tried an experiment: he bought Amazon's bestselling laptop and tried to use it, discovering it to be a horror-show of shovelware, including processor-devouring preinstalled spyware that rendered it all but unusable:

https://www.wheresyoured.at/never-forgive-them/

Zitron's (excellent) point is that technically proficient people have better computers than most users, and these computers are configured in better ways, and as a result, we participate in a fundamentally different internet to the one that normies are forced to use.

It's an excellent observation, and Zitron's point – that these laptops were actively enshittified by hardware makers and OS vendors – is an important one (the essay is called "Never Forgive Them").

But to this point, I would like to add another: we have a duty and obligation to the people we love to show them how to seize the means of computation. The normies in your life need the tips and tricks I lay out in this article more than anyone. Sure, it takes some doing to install Firefox, Kill Sticky, Adblock Plus and Bypass Paywalls; it takes a minute to figure out Reader Mode.

But if you install these tools for the people you love and show them how to use them (or just reconfigure the sites they visit most frequently to block dickovers and other annoyances), you will permanently improve their internet experience, clawing back hours of annoyances every week, while also protecting their privacy.

Anyone who is confused by switching to Firefox is also going to be confused by the deceptive language and practices that go along with dickovers. By leaving your unsophisticated loved ones exposed to dickovers, you're not decreasing the amount of technological confusion they're likely to experience in a day – you're vastly increasing the amount of danger they face as a result of that confusion.

There's never been a better time to disenshittify your cherished normies' computers. The AI companies' illegal monopolization of the memory market has sent the price of new computers, RAM and storage skyrocketing:

https://www.youtube.com/watch?v=BORRBce5TGw

All of us – but especially normies – are having to do more with less. The best way to squeeze extra performance out of any computer (but especially an aged and underpowered computer) is by switching to a free/open operating system like GNU/Linux and replacing your proprietary, resource-gobbling apps with free/open alternatives:

https://www.fosslinux.com/158206/linux-on-older-hardware-revival-guide.htm

Seizing the means of computation isn't theft, it's bargaining. Commercial surveillance companies will tell you that by spying on you, they are simply engaged in a marketplace exchange in which you swap your privacy for access to online services. But they are running a very curious sort of market: it's a "market" where as soon as you stop to browse someone's wares, the stallholder gets to reach into your pocket and clean out your wallet. In "markets," prices are announced and bargained over, not set unilaterally and extracted from anyone unwise enough to cross the threshold.

Adblocking, dickover blocking and other customizations are a way for you to bargain back, to answer the opening bid of "How about you give me all of your data forever and let me do anything I want with it?" with "How about 'nah?'"

https://www.eff.org/deeplinks/2019/07/adblocking-how-about-nah

Dickovers are companies' illegal response to privacy laws. Privacy laws are the public response to companies' out-of-control data theft and weaponization. They call us thieves, but they're the ones who embarked upon a generation-long campaign of unrestricted data plunder. What they call "theft" is just self-defense.

A generation ago, publishers and advertisers fell in love with pop-up ads. Early pop-ups were virulent in ways that are hardly imaginable today: visiting a website summoned dozens of pop-ups, some of them employing dirty tricks like spawning as an invisible 1×1 pixel, or running away from your cursor when you tried to close them. They auto-played sound and music. They were Satanic.

We got rid of pop-ups by installing pop-up blockers. Browser vendors (starting with Opera, then Mozilla) blocked pop-ups by default. Soon, pop-ups simply ceased to exist for the majority of internet users, and at that point, the same companies who'd insisted that they would go out of business unless they could fill your screen with pop-ups quietly gave up on them and found another way to advertise.

No one should ever have to look at another dickover. If dickovers become invisible for everyone on the web, there won't be any dickovers. Companies claim they need dickovers to survive. It's bullshit. They want dickovers, but if dickovers cease to be rendered on their target audience's screens, they'll switch to less invasive tactics, just like they've always done.

(Image: Kanerva T, CC BY 4.0, modified)

</file>

## Input file: corpus/human/2026-07-22-table-flipper.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: Trump&#039;s America can&#039;t even win a rigged game
author: Cory Doctorow
date: 2026-07-22
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/22/table-flipper/
---
Here's a sentence that stopped me in my tracks last week: "The statement that 'the cemeteries are full of indispensable people' is just as true of nations, and in particular the US":

https://crookedtimber.org/2026/07/16/55382/

The writer is John Quiggin, writing about the fact that, under Trump, the world has raced through a series of seismic shifts in how it organizes itself, rushing to fill an America-shaped void in its dealings.

This is a subject that's very much on my mind. As November Kelly says, Trump inherited a poker game rigged in his favor and then flipped the table over because he resented having to pretend to play at all. The "international rules-based order" that gave America oversight and control over the world's militaries, finances, trade, and communications was always a better deal for America than it was for the rest of the world.

The long persistence of this system doesn't mean that other countries liked it. The reason the American century endured for as long as it did was that the toll that America extracted from the world was always lower than the cost of making a new system. Just as people stay on Facebook because they love their friends more than they hate Mark Zuckerberg, the nations of the world let America control their systems because they feared the cost and difficulty of building a new system more than they resented letting America dictate and tax every part of their politics and economies.

That's where Trump comes in. The price of doing business with Trump is, effectively, infinity. If you buck Trump, he doubles down and demands twice as much. If you capitulate to Trump, he interprets it as weakness and comes back for three times as much. There are no deals to be made with Trump, only temporary measures that last until his next Fox and Friends binge or chance encounter with a ridiculous conspiracy theory.

Take Canada: in 2018, Trump tore up NAFTA – the deal that Bush Sr and Clinton crammed down Mexico and Canada's throats – and replaced it with USMCA, a trade treaty that was even more advantageous to America. Then, within months of his 2024 election, Trump tore up USMCA and replaced it with a chaotic series of tariffs that swung around wildly from 25% to 100% to (as of this week) 50%:

https://www.whitehouse.gov/fact-sheets/2026/07/fact-sheet-president-donald-j-trump-imposes-additional-tariffs-on-canada/

Trump has no coherent reason for this new tariff. Canada has bent over backwards to give Trump everything he wants and more. Despite some high-minded words at Davos about the need for "middle powers" to decouple from the USA, PM Mark Carney has given Trump everything he could ask for. Carney allowed Palantir – a company that makes no bones about being an agent of Trump's will – inside the most sensitive parts of the Canadian military. Carney dropped his plan to charge US tech companies a 3% tax. Carney is firing tens of thousands of civil servants and replacing them with chatbots, the majority of which will be operated by US companies, running on US servers.

Sure, Canada's imposed some retaliatory tariffs on US products, but that's just a way of making everything Canadians buy more expensive, which is a weird way of punishing America. It's like punching yourself in the face as hard as you can in the hopes that the downstairs neighbour says "ouch." Meanwhile, Carney has consistently ignored US interference in Canadian politics, including the tsunami of dark money pouring into the Alberta separatist movement – a bid by Trump to literally steal an entire province.

Give Trump everything he asks for and he'll demand more. Deny Trump anything and he'll demand more. Sign a contract with Trump and he'll break it. Send Trump an invoice and he'll stiff you. For Trump, "the art of the deal" can be summed up in one word: renege.

This is why – as David Dayen writes – there will likely be no peace deal in Iran for so long as Trump is in office. Why would the Iranians sign any deal with Trump when they know Trump will break it?

https://prospect.org/2026/07/10/aftermath-wars-on/

Last Christmas, I gave a speech in Hamburg about "the post-American internet" that the rest of the world has the chance to build now that Trump has zeroed-out all the value it used to get from playing by America's tech policy rules, even as Trump has weaponized US tech companies to attack world officials who buck his agenda:

https://pluralistic.net/2026/01/01/39c3/#the-new-coalition

After that speech, I wrote a book (The Post-American Internet) that Farrar, Straus and Giroux will publish in August 2027. In the book, I describe the role that "trusted third parties" (T3P) play in complex transactions. Think of an escrow agent who holds onto the deed for the house you're buying from the seller until you hand over the money, and then forwards the deed to you and the money to the seller.

The more complex a transaction is, the more it needs a T3P. For most of the past century, the US has been the world's T3P. Most of the world's transoceanic fiber optic lines make landfall in the US and interconnect to one another in US data centres. Most of the world's international transactions are conducted in dollars and are cleared through US-controlled platforms like SWIFT. Through its aid programs, the US sets the health and public services agenda for billions of non-Americans, and the US has military installations in more than 100 countries. The US trains the world's militaries, it supplies (and withholds) information from the world's intelligence agencies, and it runs the IT infrastructure powering the world's government agencies and critical infrastructure, from tractors to medical equipment.

Right from the start, the US was never an entirely trustworthy "trusted third party." There were plenty of instances where the US abused its control over its "neutral" platforms to serve the American national interest at the expense of the countries that relied on those platforms.

But those violations were either covert or carried out under some kind of legal rubric ("the rules-based international order"). You'd probably continue to trust an escrow agent that obeyed court orders to hold onto the money after handing over the deed. That trust might persist even if the escrow agent withheld the money on the say-so of a DA or sheriff, even without a court order. You might even continue to trust the escrow agent if they sometimes said, "I'm going to hang onto this money for 72 hours because I think there might be something weird in this deal."

Same goes for the escrow agent who has a secret side-hustle with the local land-registry office and realtors that lets them skim a few points off every deal and scoop up the best properties through a shell company. Provided you never find out about this, you'll happily hire that escrow agent to handle your property deal.

Trump is the escrow agent who keeps the money and the deed, then announces he did it because the seller was a fentanyl dealer and the buyer was a lizard-person; and then publishes a long screed on Truth Social calling everyone who criticises him a terrorist, promising to do it again next time.

Even if you need to sell your house, and even if Trump is the only escrow agent you can find, you're just not going to trust him with your deed or the money. As GW Bush says, "Fool me once, shame on…shame on you. Fool me – you can't get fooled again."

Back to Quiggin: the US was the world's indispensable nation, and the cemeteries of history are full of indispensable nations. As Quiggin writes, Europe and Ukraine have largely given up on US military protection from Russia and are building their own capacity, already surpassing the US in drone and artillery capabilities. The US can no longer credibly provide missiles and anti-missile defenses, not after Trump used up America's stockpiles in his pointless, endless war in Iran.

Quiggin notes that the consensus case against the EU as a military power held that Europe "lacks the capacity to project power globally" and that it is "too disunited to act effectively." Per Quiggin, these only matter if you believe that the post-American military order will look and act like the American system that Trump just trashed. Trump has a chud "Secretary of War" who kidnaps foreign leaders and can't reliably get oil through the Strait of Hormuz – if that's the dividend from "unity" and "projecting power," you can keep it.

On finance, Quiggin notes that the EU is racing to break its reliance on SWIFT, Visa and Mastercard, and the more Trump weaponizes these against institutions like the International Criminal Court, the faster this transition will go.

America's load-bearing private institutions – like the Big Four accounting firms and the bond rating agencies – have self-immolated, thanks to decades of lax regulation by successive US administrations through scandal after scandal. Quiggin points out that there's no reason to replace these giant, structurally important (but terrifyingly unreliable) cartels with trustworthy versions. It's cheaper and more robust to rebuild our economy so that it no longer serves the finance system, returning finance to "its pre-1970s role as a provider of a relatively limited set of services to the real economy."

On manufacturing, Quiggin points to the twin facts of Trump's chaotic tariffs and China's "economic nationalism," which have put the EU in the centre of a new trade order. Here, too, we're getting something new, not a Made-in-Europe version of "the failed globalist dream of the WTO" nor "Trump’s attempts to extort surplus through bilateral bullying":

https://www.nytimes.com/2026/07/12/opinion/america-trump-nato-europe-world.html

As I said, Quiggin's article has been rattling around in my mind ever since I read it last week, but there's one area where I think Quiggin's got it wrong: the relative difficulty of building a post-American internet.

First, because Quiggin says that the real challenge is building a post-American AI. Sovereign AI is, frankly, nonsense. If Trump turns off all of your country's chatbots, nothing changes. If Trump orders Microsoft to shut off your country's access to Office 365 (as he did to the International Criminal Court and a Brazilian judge who pissed him off), your country would simply cease to function:

https://pluralistic.net/2026/06/18/their-trillions-our-billions/#eyes-on-the-prize

And if Trump orders John Deere to brick all the tractors in your country, you're gonna starve to death:

https://pluralistic.net/2022/05/08/about-those-kill-switched-ukrainian-tractors/

In the face of these real, non-speculative, immediate, grave threats, focusing on AI – the money-losingest technology in human history, which has consistently underperformed relative to its boosters' promises – is just misguided. If you really want an "AI strategy" for your country, it should be this: wait for the bubble to burst, then buy hardware and talent at fire-sale prices in the wave of ensuing bankruptcies, and use them to extract more performance from free, open source models.

The real digital challenge is building apps and data centres to run everyday administrative, telecoms and e-commerce software on, and then moving your country's, ministries', companies' and households' data over to the new platforms. The hardware and software are challenging, but ultimately straightforward. Raising capital for data centres is just a matter of convincing people to invest in being a kind of landlord, which is among the easier sells to make (and there's plenty of investors who are looking for real alternatives to getting sucked into the AI bubble).

Getting the apps is hard, but there's an army of technologists who are ready for more, after decades of doing fake startups for a Big Tech company to "acqui-hire" and/or toiling to improve ad click-throughs. These people yearn to follow Steve Jobs's injunction to "make a dent in the universe" and they are being chased out of Silicon Valley by ICE chuds who want to send them to Salvadoran slave-labor camps.

There's plenty of talent and capital for the taking.

The real hard part isn't writing or running the code – it's extracting the data, replacing the firmware, and bridging new systems – like post-American social media platforms – into the existing ones. This part is hard because every country in the world has agreed to a trade deal with America wherein they agreed to make it illegal to reverse-engineer US tech exports, in exchange for tariff-free access to US markets. Trump has made the case for abandoning these deals better than I ever could have:

https://pluralistic.net/2026/04/20/praxis/#acceleration

</file>

## Input file: corpus/human/2026-07-23-drop-a-dime.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: California&#039;s privacy obstacle course
author: Cory Doctorow
date: 2026-07-23
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/23/drop-a-dime/
---
Data brokers are a cancer. There's a direct line from the unrestricted collection, retention and processing of our data to a host of evils, from deepfake porn to phishing scams; from racial discrimination in hiring to ICE roundups of migrants; from targeted election interference to identity theft:

https://pluralistic.net/2023/12/06/privacy-first/#but-not-just-privacy

Why do data brokers exist? Because we let them. Congress hasn't passed a new federal consumer privacy law since 1988, when they made it illegal for video stores to disclose your VHS rentals. All other acts of consumer surveillance are legal. Data brokers spy on us for the same reason your dog licks its balls: because they can, and we don't stop them:

https://pluralistic.net/2026/03/10/ice-tech/#foreseeable-outcomes

Getting rid of data brokers wouldn't solve all our problems, but it sure would go a long way to solving many of them. Rather than legally requiring platforms to spy on kids (to exclude them from being targeted by platforms' algorithms), we could prohibit platforms from spying on anyone, including kids, meaning kids couldn't be identified (much less targeted) by algorithms or ads:

https://pluralistic.net/2026/06/23/destroy-the-village/#to-save-it

Data brokers produce mountains of raw material used for every form of scam and torture. It's data brokers who power the gig economy's "algorithmic wage discrimination" system, where nurses and other workers are offered less pay based on how much credit card debt they're carrying:

https://pluralistic.net/2024/12/18/loose-flapping-ends/#luigi-has-a-point

Banning data brokers would make great sense, which is why Biden's CFPB banned data brokers (only to have Trump un-ban them):

https://pluralistic.net/2025/05/15/asshole-to-appetite/#ssn-for-sale

So the feds (both Congress and the executive branch) have surrendered, and that leaves states alone on the battlefield fighting the privacy wars alone. State legislatures have taken some big steps, but – crucially – they've stopped short of banning data brokers from operating within their borders. Having taken a ban on data brokers off the table, states are left with complex, often unworkable "compromises" that go nowhere.

This is where DROP comes in. DROP stands for "Delete Request and Opt-out Platform," and it's a new phase of California's privacy regime that kicks off next month. Under DROP, you fill in some paperwork and then the state requires every data brokerage operating in California to delete your data, as well as any inferences they've made about you based on that data:

https://www.eff.org/deeplinks/2026/07/what-you-need-know-about-californias-drop-tool

Implementing DROP is nowhere near as good as banning data brokers. The idea that data brokers should be able to collect, retain and process your data unless you tell them not to implies that everyone starts off wanting to be spied on, and therefore data brokers should assume that unless they hear otherwise, we're delighted to be the subject of commercial surveillance. This is an incredibly stupid supposition, contradicted by all available evidence. For example, when Apple offered iPhone owners a one-click option to block Facebook from spying on them, 96% of iPhone owners clicked the button:

https://applescoop.org/story/facebook-must-inflict-pain-on-apple-says-mark-zuckerberg

Indeed, given this fact, one wonders why Apple bothers with the "don't spy on me" button at all. Why not have a "do spy on me" button that is unchecked by default, and leave users to dig through their settings to find the option to opt in to being surveilled? Of course, then it would make the fact that Apple spies on its customers and uses the data to target ads (with no way to opt out) a little awkward:

https://pluralistic.net/2022/11/14/luxury-surveillance/#liar-liar

In the absence of a ban on surveillance without explicit, opt-in consent, we are left with the bizarre fiction that most of us want to be spied on, a fiction that pervades the DROP process, making the entire procedure nearly impossible to complete.

To start the DROP process, you are recommended to create a Login.gov ID. This is an incredibly invasive process that involves photographing multiple pieces of ID and taking several selfies using special apps and webpages that hijack your device's camera and processor in a bid to prevent bad actors from spoofing the process. There's a plausible reason for this rigmarole: Login.gov is the authentication system for multiple federal, state and local IT systems in the US, so a fake or stolen Login.gov ID could be used to access your IRS, Social Security, and other very sensitive accounts.

The corollary of this is the promise of Login.gov: once you create your ID (a lengthy, multi-stage process) you won't have to jump through lots of painful bureaucratic hoops to access a wide variety of government services.

DROP didn't get the memo.

After you log in to DROP via Login.gov, you are sent a text message – to the phone number in your Login.gov profile – with a link to access a "secure" website that takes over your camera to let you take a "secure" photo of the front and back of your California driver's license or your US passport.

Note that these are the same credentials you have to supply to get the Login.gov ID that you've just used to get to this step in the process. In other words, in order to get to the stage where they ask you to photograph your driver's license, you have to have already photographed and validated your driver's license.

Once you complete this (pointless, redundant) step, you're directed back to your computer, where the process continues. Here, you must fill in all kinds of biographical detail, as well as specialized pieces of information, including your car's VIN. This is a piece of information that most people don't have – but which the California DMV does have and could auto-feed into the system, given that you've repeatedly affirmatively identified yourself to the service.

You also have to provide your mobile advertising identifier, a long, unique number that you may or may not be able to extract from your phone, depending on the model and the OS version. If you can't get it that way, you can install an app like AAID, which comes with a long list of – you guessed it – permissions to extract, store and process your private information.

Here's the thing: the whole point of a mobile ad identifier is that apps can access it (this is how they identify and track you). That step, where the system made you switch to your phone and use your camera to photograph your driver's license? That step could have automatically pulled this data off your device. That's the whole fucking point of this exercise: that web-pages and apps can request your mobile ad identifier.

Instead, DROP wants users to dig through their phone's deepest settings and/or install an app to retrieve a 32-digit number, which they then must key into a webform on their computer or in a different app on their phone.

Once you've done this, you must fill in another page of biographical information, including information that you've already provided to Login.gov and information you've already filled in on previous screens.

On this screen, you must also verify your phone number by sending yourself a text and then pasting in a unique number the system sends to you. But remember how this whole thing started? The first step is that you authenticate with Login.gov, which sends a text to your phone so you can take a (redundant) picture of your driver's license. There is no way you could get this far in the process unless you controlled the phone number you've just "verified" with the system.

Next, you must verify your email address, by receiving an email with a unique code in it and keying or pasting that into the webform, too. Again, remember how this process started: with you logging in with Login.gov, using your email address, which the system has already treated as verified since the very start of this (very) long and (very) complicated process.

This whole thing is terrible, and it is predicated on the absurd premise that Californians have to be defended from the threat of strangers who pretend to be them in order to sneakily opt them out of surveillance. DROP requires stronger authentication than any other US government system I've ever interacted with. I file my tax returns with fewer authentication steps. I renew my car's DMV registration with fewer authentication steps. I became a US citizen with fewer authentication steps.

This is either a system with no coherent threat model, or (far more probably), its threat model is that people will use it. This is California's answer to "a locked filing cabinet stuck in a disused lavatory with a sign on the door saying 'Beware of the Leopard'":

https://en.wikiquote.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy

It's especially instructive to compare this process to the steps you have to take in order to "opt in" to having a data broker open a file on you and stuff it full of your sensitive, personal information, which is then sold to all comers:

Step one: Exist.

Step two: There is no step two.

It's also instructive to compare this process to the steps a data broker has to take to spy on you and sell your data:

Step one: Exist.

Step two: There is no step two.

Though there are many obvious ways this could be made better, I want to stress here that you shouldn't have to do this at all. It's entirely backwards. The process for not being spied on should look like this:

Step one: Exist.

Step two: There is no step two.

If anyone is going to be forced to jump through hoops to participate in the mass collection and catastrophic mishandling of private data, it should be the data brokers, not the people they spy on.

This kind of malicious compliance is the inevitable outcome of a process that starts by taking the obvious best measure off the table. The answer to the problem of data brokers is banning data brokers, not creating a demented hairball of form-filling that maintains the fiction that data broker surveillance is consensual.

In its own way, this process reminds me of the whole "carbon credit" fiasco. The answer to too many carbon emissions is to democratically decide to ban certain kinds of carbon emissions. But that would require states to do things, rather than simply "nudging" a process that is guided by "the market." So we end up with these junk "credits" that companies manufacture by promising not to log forests, many of which are already wildlife preserves and/or subsequently burn down:

https://pluralistic.net/2023/10/31/carbon-upsets/#big-tradeoff

The best critique of this whole thing came in 2021 from the Climate Ad Project, who produced a short video in which people were allowed to kill one another provided they purchased "murder offsets":

https://pluralistic.net/2021/04/14/for-sale-green-indulgences/#killer-analogy

In a state of nature, murder exists. We, as a society, have decided this is bad. Rather than creating "incentives" not to murder, we just banned murder. Admittedly, we still get some murders, but when these happen, we don't treat it as "a mispricing of the anti-murder incentive" – we treat it as a crime.

The commercial surveillance industry may not be a criminal enterprise (yet), but it is the source of a torrent of crime, a flood of crime, a tsunami of crime. Every piece of your information that a data broker possesses exposes you to the risk of being victimized by a criminal. For this reason, I strongly believe that you should go through the tedious, performatively difficult DROP process:

https://consumer.drop.privacy.ca.gov/

But let's not pretend that this is good – or even adequate. There is no demand for being spied on. There is no basis for taking such enormous care in making sure people aren't maliciously removed from surveillance databases. If these databases exist at all (they should not), then we should make spies go through all this paperwork, to prove that you do want to be spied on, and unless they manage it, then spying on us should be treated as the crime it is.

</file>

## Input file: corpus/human/2026-07-24-supplemental-income.txt

<file>
---
source: pluralistic.net (Cory Doctorow)
title: AI solipsists and AI cynics
author: Cory Doctorow
date: 2026-07-24
human_authored: true
license: CC-BY-4.0
permalink: https://pluralistic.net/2026/07/24/supplemental-income/
---
As a technology, AI isn't exceptional. It's not exceptionally wicked. It's not exceptionally good. Take away the accompanying, galactic-scale stock-swindle, and we'd call AI's applications "plug-ins" and we'd use them and abuse them in the same way that we've used every other technology:

https://www.normaltech.ai/

As a destructive economic pathology, AI is extraordinary. AI boosters have spent a baffling and terrifying sum of money – over $1.4T, most of that in the past year – on the promise of making as many workers unemployed as possible, while lowering the wages of the meager survivors of this jobspocalypse. To make things worse, AI can't do the jobs it's replacing: AI is predicated on the premise that the monopolies, duopolies and cartels that control the global economy can deliberately worsen their products without suffering economic or regulatory consequences, because they're the only game in town.

In service to this bubble, AI companies have suborned regional governments into running roughshod over environmental and planning review in order to build endless acres of data centers, many of which will likely end up casualties of the imminent bubble-pop, never to be switched on or even completed. What an indignity to have your farm or house seized through eminent domain, only to see it razed and replaced by a weed-choked empty field, a lonely foundation slab, or an abandoned empty building that could only ever be repurposed for laser-tag or an ICE concentration-camp:

https://gizmodo.com/trump-on-data-centers-you-cant-fight-it-you-have-to-go-with-it-2000790014

This is just one of the many negative effects of AI that can be traced to the scale of the bubble. Were it not for the imperative to turn more than a trillion dollars of losses into a profit, we would not have the aggressive, site-destroying scraping epidemic. Nor would we see AI crammed into every part of every product and service we use. And of course, in the absence of the investment bubble, businesses wouldn't be firing productive workers and replacing them with defective chatbots.

The single most salient fact about AI is the investment bubble, not the technical characteristics of chatbots or recent advances in statistical inference. AI's investor story is an incoherent tangle of predictions about AI's future, ranging from the outlandish ("Once we spend enough money, AI will become God and solve all our problems, including our profitability crisis") to the dystopian ("The majority of jobs in the economy will be done by our chatbots, and the employers who previously employed those workers will split the wage savings with us").

None of these stories are plausible, which raises an urgent question: why have the world's wealthiest investors been so eager to hand over trillions to finance this bubble?

I have previously written about one reason that billionaires find the AI story so compelling: at root, many billionaires just don't believe most other people are actually, fully real. How could they? Achieving billionairehood requires that you inflict pain on vast numbers of people. If you truly believed that those people were as real as you are, you'd never be able to look yourself in the mirror. Whether it's Leona Helmsley's claim that "only the little people pay taxes," or Elon Musk's habit of calling people who disagree with him "NPCs," the whole ideological project of billionaireism is shot through with a kind of solipsism:

https://pluralistic.net/2026/01/05/fisher-price-steering-wheel/#billionaire-solipsism

This is true even in one-on-one encounters: for the Epstein Class, the children raped on his island weren't fully real – certainly not as real as their own children. It's even more true for the people that billionaires experience as statistical artifacts, such as Jeff Bezos's vast army of drivers and warehouse workers, with their sky-high on-the-job injury rates and the everyday indignity of their piss-bottles. It gets worse for social media bosses like Mark Zuckerberg, for whom AI's principal appeal is the prospect of ending socializing on social media, swapping your mulish friends for pliable chatbots who will organize their interactions with you to maximize your platform usage and thus the number of ads you see:

https://pluralistic.net/2026/01/19/billionaire-solipsism/#sirius-cybernetics

I think billionaire solipsism can account for much of the malinvestment in this obvious bubble, but I don't think it's the whole story. Rather, I think there's a whole cohort of investors who don't believe in AI, but believe that other people will believe in AI.

This is a well-established investment principle. As Keynes wrote, the point of investing isn't necessarily to pick the most beautiful contestant to win the beauty contest – it's to pick the contestant that the other judges will hand the crown to:

https://en.wikipedia.org/wiki/Keynesian_beauty_contest

In other words, you don't get rich from stock speculation by identifying the businesses whose profitability will grow the most – you get rich by identifying the businesses that other investors will pile into, pushing the price up. All you need to do is sell your shares after the price spike, but before anyone else figures out that the business is a turkey. It's like that old joke: "I don't need to run faster than the bear (market), I just have to run faster than you."

From the perspective of a cynical AI investor, the question isn't, "Can AI do your job?" The question is, "Can an AI salesman convince your boss that an AI can do your job?" So long as enough bosses are convinced to fire workers and replace them with AI, AI valuation will continue to climb, and if they time the market right, they can get out before those valuations crash. This proposition gets even sweeter if the CEO of the AI company is in bed with financial regulators and stock exchanges, and can force your financial advisor to buy his worthless AI stock with "little people's" retirement savings:

https://fortune.com/2026/06/13/spacex-stock-index-funds-passive-investing-401k-nasdaq-100-russell/

A bet that bosses will fire workers and replace them with AI is a good wager. Bosses are absolute suckers for this scam. Bosses hate the fact that they can't translate their plans into action without first having a series of ego-shattering confrontations with workers who actually know how to do things, who insist that those plans are illegal, stupid, impossible or will kill people:

https://pluralistic.net/2026/03/12/normal-technology/#bubble-exceptionalism

For these bosses, AI is the chance to wire the toy steering wheel they play with all day directly into the corporate drive-train. With enough AI slaves, the boss can run the company all on their own:

https://pluralistic.net/2026/07/10/posthuman-as-in-no-humans/#hell-is-other-people

In other words, you don't need to be a solipsist to bet on AI. It is sufficient to believe that bosses are solipsists, who can be relied upon to empty the corporate coffers in exchange for worker-replacing magic beans.

This is true in many scam sectors. I'm sure that most of the people who finance the supplements that Andrew Tate and Joe Rogan hawk understand that they're just a way to give yourself very expensive piss. They don't have to believe supplements work to believe that there is an army of desperate and credulous young men who will give anything for the promise they dangle.

Likewise, you don't have to believe that Gwyneth Paltrow can help women "regulate their periods" and "correct their hormonal imbalances" by selling them rocks to stuff in their vaginas. You just have to believe that between patriarchy-induced body shame and patriarchy-driven medical neglect, there's an army of desperate women out there who will buy those rocks and risk their lives by sticking them inside their bodies:

https://web.archive.org/web/20181225035739/https://www.vogue.com/article/goop-jade-yoni-egg-lawsuit-gwyneth-paltrow-vaginal-pelvic-floor-health

AI is even worse than vagina-rocks, of course. When the bubble bursts, when the seven AI companies that make up 35% of the S&P 500 tank, when a third of the US stock market is vaporized overnight, our governments will reflexively turn to austerity, the go-to response to every financial crisis. Austerity is fascism's best recruiting tool:

https://pluralistic.net/2026/04/12/always-great/#our-nhs

When the AI bubble bursts, the defective chatbots that replaced skilled workers will disappear with it, leaving us scrambling to get that work done after the workers who understood it have retrained, retired, or exited the workforce. AI is the asbestos we're shoveling into the walls of our civilization and our descendants will be digging it out for generations:

https://pluralistic.net/2026/04/08/process-knowledge-vs-bosses/#wash-dishes-cut-wood

Long after the AI bubble bursts, we'll be dealing with its catastrophic carbon emissions. The Second Law of Thermodynamics isn't up for debate. Once we sink enough therms into the sea, we are losing the ice-caps.

AI is an ordinary technology, but the AI bubble is extraordinary: extraordinarily toxic and extraordinarily dangerous. The source of that danger is financiers, and they are motivated by a mix of solipsism and a belief in other people's solipsism. For them, the most exciting investment hypothesis is that "hell is other people":

https://locusmag.com/feature/commentary-cory-doctorow-hell-is-other-people/

(Image: Cryteria, CC BY 3.0, modified)

</file>


Complete the renderer's refusal checks now.
This locked corpus is expected to be renderable; if it is not, state the refusal
rather than inventing evidence.
Otherwise emit voice-profile-source/3 exactly as described by the system prompt.
Fill every deterministic measured slot below with semantic prose. Supply supporting
filenames and qualitative frequencies for the remaining qualitative dimensions, and
fill every required unresolved reason. Do not copy counts, rates, support
fractions, rules, observation IDs, coverage statuses, or final profile fields; the
portable deterministic assembler owns those. Return the structured object only.

Deterministic measured slots (the key, dimensions, section, and polarity are fixed):
- second-person-family -> person-reader-stance; section address; counted positive.
- first-person-plural-family -> person-reader-stance; section address; counted positive.
- contractions -> contraction-negation; section cadence; counted positive.
- uncontracted-negatives -> contraction-negation; section absences; counted absence.
- profanity-vulgarity -> profanity-vulgarity; section register-range; counted positive.
- first-person-singular-family -> self-reference-biography; section register-range; counted positive.
- question-marks -> questions-imperatives-vocatives; section address; counted positive.
- round-parenthetical-spans -> interruption-punctuation; section cadence; counted positive.
- em-dashes -> interruption-punctuation; section absences; counted absence.
- en-dashes -> interruption-punctuation; section cadence; counted positive.

Qualitative dimensions: qualification-hedging, opponents-allies-sources, figures-analogy, openings-endings-closure.
Return 0–4 qualitative observations.
Required unresolved dimensions: none.

Mechanical absence availability:
- second-person-family is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.
- first-person-plural-family is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.
- contractions is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.
- uncontracted-negatives is a sparse counterpart and will be an absence with measured replacement contractions; the assembler may reuse that positive observation across dimensions.
- profanity-vulgarity is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.
- first-person-singular-family is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.
- question-marks is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.
- round-parenthetical-spans is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.
- em-dashes is a sparse counterpart and will be an absence with measured replacement en-dashes or round-parenthetical-spans; the assembler may reuse that positive observation across dimensions.
- en-dashes is not sparse relative to an allowed measured replacement; it is positive and the assembler derives its fixed frequency.

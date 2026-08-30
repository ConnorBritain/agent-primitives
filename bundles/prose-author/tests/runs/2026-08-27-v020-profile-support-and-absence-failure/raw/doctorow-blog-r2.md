```markdown
<!-- voice-profile/2:profile -->
# Voice profile — doctorow-blog

## 1. Cadence

The dominant move is accumulation followed by a short verdict. A paragraph builds across several clauses and then stops on a sentence of six words or fewer that delivers the finding flat — 10/10 samples. `2026-07-10`: *"There's only one kind of person you get to treat like this: a slave."* `2026-07-23`: *"DROP didn't get the memo."* `2026-07-16`: *"This is bullshit."* Reproduce this: let the argument run until the case is made, then cut. The verdict sentence should have a subject and a verb and nothing decorative.

Claims are made without hedges — 10/10 samples (`2026-07-23`: *"Data brokers are a cancer."*; `2026-07-24`: *"As a technology, AI isn't exceptional."*). When a concessive clause appears, it is followed immediately by an unmodified restatement: `2026-07-14`: *"Of course, anyone can die suddenly. [...] But the likelihood this happening goes up the older you get."* The concession yields; the main claim does not. If a sentence is about to soften a verdict, cut the softening.

## 2. How a piece opens

Three shapes appear, none warming up — 10/10 samples open directly on the subject. "Here's [noun/situation]:" appears in 2/10 samples (`2026-07-11`: *"Here's an irony"*; `2026-07-22`: *"Here's a sentence that stopped me in my tracks last week"*). A single declarative verdict appears in 3/10 samples (`2026-07-23`: *"Data brokers are a cancer."*; `2026-07-24`: *"As a technology, AI isn't exceptional."*). A setup clause naming the subject appears in 5/10 samples (`2026-07-16`: *"The theory of markets goes like this:"*; `2026-07-14`: *"The 'designated survivor' is one of the weirder aspects of America's (very, very weird) political system."*). The author's feelings about the subject do not appear in any opening.

## 3. How a piece closes

Closings deliver the thesis in its sharpest form or turn the opponent's own language back — 10/10 samples. `2026-07-21`: *"What they call 'theft' is just self-defense."* `2026-07-09`: *"Politics aren't about who rules — it's about whether we are ruled at all, or whether we are free."* `2026-07-24`: *"For them, the most exciting investment hypothesis is that 'hell is other people'."* The closing sentence is the shortest in its closing paragraph. Write the close before drafting the body; it names the destination the whole piece is aiming at.

## 4. Who is being addressed, and how

The reader is addressed directly throughout. [measurement:second-person-family] Count case-insensitive whole-word tokens you, your, yours, you're, you've, you'd, and you'll in the extracted sample bodies: 385 tokens, 21.94 per 1,000 words — 10/10 samples, throughout. The *you* is not generic; it names the specific person whose job is threatened, whose data is sold, whose browser is being abused. Use it to walk the reader through scenarios they inhabit, not scenarios they observe.

Running alongside *you* is an inclusive *we*. [measurement:first-person-plural-family] Count case-sensitive whole-word tokens we, We, us, our, Our, ours, Ours, and the listed contracted we forms in the extracted sample bodies; uppercase US is excluded: 127 tokens, 7.24 per 1,000 words — 10/10 samples, throughout. This *we* positions writer and reader on the same side against a named opponent. *You* activates; *we* recruits.

First-person singular — [measurement:first-person-singular-family] Count case-insensitive whole-word tokens I, me, my, mine, and myself in the extracted sample bodies — runs at 113 tokens, 6.44 per 1,000 words, 10/10 samples, throughout. *I* carries the argument; it does not confide.

Contractions are the default form. [measurement:contractions] Count whole-word n't, 're, 've, 'll, 'd, and 'm forms plus 's only for the closed elision hosts it, that, there, here, who, what, where, when, how, why, he, she, let, one, nothing, everything, something, somebody, nobody, and this; possessive 's is excluded: 300 tokens, 17.09 per 1,000 words — 10/10 samples. Against those 300 contractions, uncontracted negatives — [measurement:uncontracted-negatives] Count case-insensitive whole phrases do not, does not, did not, is not, are not, was not, were not, cannot, could not, would not, should not, will not, have not, has not, and had not in the extracted sample bodies — return only 9 tokens across the full corpus, 0.51 per 1,000 words, with 5/10 samples having none at all. Default to the contracted form everywhere. An uncontracted negative at the corpus rate arrives roughly once per 2,000 words; anything higher reads as a different register entirely.

Profanity lands at moments of maximum contempt or absurdity, not as decoration. [measurement:profanity-vulgarity] Count only the case-insensitive whole-word profanity and vulgarity forms enumerated by the prose-author corpus-rates profanity rule; coined words containing a rude root are excluded: 26 tokens, 1.48 per 1,000 words — 10/10 samples, once or twice per piece. `2026-07-09`: *"you can just give them away and tell the cartel to fuck off"*; `2026-07-11`: *"holy shit, is Uber's investor relations site seriously serving ASPX pages in 2026?!"* Use it at the moment the argument reaches its charge, not before.

Rhetorical questions expose the opponent's absurd implicit premise and let the reader complete the logic — [measurement:question-marks] Count every literal question-mark character in the extracted sample bodies — 38 tokens, 2.17 per 1,000 words, 10/10 samples, several times per piece. `2026-07-13`: *"If you've got a chatbot that can do a doctor's job, why sell it to a hospital? Why not just open your own hospital?"* They are never genuine; they are the premise stated aloud.

## 5. Figures

Analogies come from everyday commerce and bodily life — restaurants, escrow agents, gold rushes, bears and runners, bladders, orifices — 10/10 samples. The vehicle is never an abstraction; every figure is a transaction or a physical act the reader has encountered. An analogy runs for a paragraph, gets extended once or twice, then is dropped as the prose returns to the argument. `2026-07-22`: the escrow-agent analogy runs five consecutive paragraphs before the pivot back to Quiggin. Do not begin a second analogy before the first is complete.

## 6. Register range

The home register is polemical: sustained argument addressed to an intelligent adversary — 10/10 samples. Against it, an explanatory register (slower, single-clause sentences walking through a mechanism) appears in 8/10 samples. A biographical register — a personal stake named and attached to a civic argument — appears in 2/10 samples (`2026-07-14`: cancer treatment, a friend who died, a literary executor; `2026-07-11`: the author on gig-economy data). The biographical disclosure earns its place by doing argumentative work: it is not personal by default.

Parentheses carry live commentary — qualifications, jokes, corrections, sarcastic asides — throughout. [measurement:round-parenthetical-spans] Count each non-nested pair of round brackets whose contents stay on one line in the extracted sample bodies: 97 tokens, 5.53 per 1,000 words — 10/10 samples, throughout. These are not citations; they are a second voice running alongside the main argument. En-dashes perform the same function inside running prose — [measurement:en-dashes] Count every literal en-dash character in the extracted sample bodies: 73 tokens, 4.16 per 1,000 words, 10/10 samples, several times per piece. Em-dashes are absent: [measurement:em-dashes] Count every literal em-dash character in the extracted sample bodies — 0 tokens, 0.00 per 1,000 words, 0/10 samples. Use en-dashes; leave em-dashes out entirely.

## 7. What the corpus never does

Argumentative structure is carried inside the prose, not above it. A topic shift opens a new paragraph on the new subject's name or first claim — 10/10 samples (`2026-07-22`: *"Back to Quiggin:"*; `2026-07-11`: *"Back to algorithmic pricing:"*). Nothing in the corpus uses a header, numbered section, or bulleted list to organize an argument. Paragraph-opening words do the work that headers would otherwise do.

Named opponents are dispatched by name, never by unnamed abstraction — 10/10 samples. Where a group gets a coined collective epithet (*"broccoli-haired brownshirts," "AI hucksters," "Renfields"*), the coinage is immediately followed by explanation or illustration. Contempt is always aimed at a specific *who*.

## 8. What this profile could not determine

**Voice card:** Not filled in; all findings derive from the corpus alone.

**Self-referential disclosure:** Biographical material appears in 2/10 samples. Both instances attach a personal stake to a civic-scale argument, but the corpus is too thin here to support a reproducible instruction about when this register is appropriate.

**Qualification and hedging in detail:** The corpus shows near-total flatness; the concessive-then-restatement pattern appears in several samples but not in a form stable enough to constitute a counting rule.

**Dropped observations (4):** Coined neologism vocabulary — no enumerable counting rule separates a coinage from a technical term without a stated word list. Colon-as-verdict construction — visible across samples but absent from measurements.json; no counting rule a stranger would reproduce. "Of course" concessive — present but not systematically counted. Imperative register — confined to one sample (`2026-07-21`) and register-dependent, not a corpus-wide habit.

**Typographic note:** This corpus is contemporary, untranslated, and drawn from the author's own blog. No editorial layer sits between the writer and the page. All punctuation findings are reported as the author's.
<!-- voice-profile/2:record -->
{
  "schema": "voice-profile/2",
  "profile": "doctorow-blog",
  "confidence": "full",
  "corpus_words": 17549,
  "samples_used": [
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
  "samples_excluded": [],
  "voice_card": "empty",
  "observations": [
    { "id": "o01", "section": "cadence", "support": 10, "of": 10 },
    { "id": "o02", "section": "cadence", "support": 10, "of": 10 },
    { "id": "o03", "section": "openings", "support": 10, "of": 10 },
    { "id": "o04", "section": "closings", "support": 10, "of": 10 },
    { "id": "o05", "section": "address", "support": 10, "of": 10,
      "rate": { "count": 385, "per_1000_words": 21.94,
        "counting_rule": "[measurement:second-person-family] Count case-insensitive whole-word tokens you, your, yours, you're, you've, you'd, and you'll in the extracted sample bodies." } },
    { "id": "o06", "section": "address", "support": 10, "of": 10,
      "rate": { "count": 127, "per_1000_words": 7.24,
        "counting_rule": "[measurement:first-person-plural-family] Count case-sensitive whole-word tokens we, We, us, our, Our, ours, Ours, and the listed contracted we forms in the extracted sample bodies; uppercase US is excluded." } },
    { "id": "o07", "section": "address", "support": 10, "of": 10,
      "rate": { "count": 113, "per_1000_words": 6.44,
        "counting_rule": "[measurement:first-person-singular-family] Count case-insensitive whole-word tokens I, me, my, mine, and myself in the extracted sample bodies." } },
    { "id": "o08", "section": "address", "support": 10, "of": 10,
      "rate": { "count": 300, "per_1000_words": 17.09,
        "counting_rule": "[measurement:contractions] Count whole-word n't, 're, 've, 'll, 'd, and 'm forms plus 's only for the closed elision hosts it, that, there, here, who, what, where, when, how, why, he, she, let, one, nothing, everything, something, somebody, nobody, and this; possessive 's is excluded." } },
    { "id": "o09", "section": "address", "support": 10, "of": 10,
      "rate": { "count": 9, "per_1000_words": 0.51,
        "counting_rule": "[measurement:uncontracted-negatives] Count case-insensitive whole phrases do not, does not, did not, is not, are not, was not, were not, cannot, could not, would not, should not, will not, have not, has not, and had not in the extracted sample bodies." } },
    { "id": "o10", "section": "address", "support": 10, "of": 10,
      "rate": { "count": 26, "per_1000_words": 1.48,
        "counting_rule": "[measurement:profanity-vulgarity] Count only the case-insensitive whole-word profanity and vulgarity forms enumerated by the prose-author corpus-rates profanity rule; coined words containing a rude root are excluded." } },
    { "id": "o11", "section": "address", "support": 10, "of": 10,
      "rate": { "count": 38, "per_1000_words": 2.17,
        "counting_rule": "[measurement:question-marks] Count every literal question-mark character in the extracted sample bodies." } },
    { "id": "o12", "section": "figures", "support": 10, "of": 10 },
    { "id": "o13", "section": "register-range", "support": 10, "of": 10 },
    { "id": "o14", "section": "register-range", "support": 10, "of": 10,
      "rate": { "count": 97, "per_1000_words": 5.53,
        "counting_rule": "[measurement:round-parenthetical-spans] Count each non-nested pair of round brackets whose contents stay on one line in the extracted sample bodies." } },
    { "id": "o15", "section": "register-range", "support": 10, "of": 10,
      "rate": { "count": 73, "per_1000_words": 4.16,
        "counting_rule": "[measurement:en-dashes] Count every literal en-dash character in the extracted sample bodies." } },
    { "id": "o16", "section": "register-range", "support": 10, "of": 10,
      "rate": { "count": 0, "per_1000_words": 0.00,
        "counting_rule": "[measurement:em-dashes] Count every literal em-dash character in the extracted sample bodies." } },
    { "id": "o17", "section": "absences", "support": 10, "of": 10 },
    { "id": "o18", "section": "absences", "support": 10, "of": 10 }
  ],
  "coverage": [
    { "dimension": "person-reader-stance", "status": "rated",
      "observation_ids": ["o05", "o06", "o07"] },
    { "dimension": "contraction-negation", "status": "absent-paired",
      "observation_ids": ["o08", "o09"],
      "positive_observation_id": "o08",
      "absence_observation_id": "o09" },
    { "dimension": "qualification-hedging", "status": "described",
      "observation_ids": ["o02"] },
    { "dimension": "questions-imperatives-vocatives", "status": "rated",
      "observation_ids": ["o11"] },
    { "dimension": "opponents-allies-sources", "status": "described",
      "observation_ids": ["o18"] },
    { "dimension": "profanity-vulgarity", "status": "rated",
      "observation_ids": ["o10"] },
    { "dimension": "self-reference-biography", "status": "unresolved",
      "unresolved_reason": "Biographical disclosure appears in 2/10 samples; too thin to constitute a reproducible instruction about when or how to deploy the biographical register." },
    { "dimension": "interruption-punctuation", "status": "absent-paired",
      "observation_ids": ["o15", "o16"],
      "positive_observation_id": "o15",
      "absence_observation_id": "o16" },
    { "dimension": "figures-analogy", "status": "described",
      "observation_ids": ["o12"] },
    { "dimension": "openings-endings-closure", "status": "described",
      "observation_ids": ["o03", "o04"] }
  ],
  "observations_dropped": 4,
  "multiple_voices_suspected": false
}
```

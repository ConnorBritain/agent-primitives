---
name: voice-profile-render
description: Reads an author's writing corpus and writes the voice profile a drafter will later work from — a prose description of how this person writes, every observation carrying a sample citation and a support count. Use when a profile directory has a filled corpus and something needs to draft in that voice without being handed the corpus itself. It never reads the AI-tell catalog, never emits a list of things to avoid, and never claims a draft written from its profile will sound like the author. Distinct from prose-draft (writes the prose) and prose-voice-critic (judges a draft against the corpus directly).
---

Your only job is to write one document: a description of how a particular person writes, derived from samples of their writing, addressed to whoever has to write in that voice next.

**You are describing a voice, not scoring one.** The reader of your output is a drafter facing a blank page. What helps them is "her sentences snap short when she is annoyed and run long when she is arguing, and you can hear which mood a paragraph is in from the first clause." What does not help them is a table of averages. Numbers belong in your output only where the number is the observation.

**Write so the drafter can act, not only recognise.** An observation states what the corpus does; where you can, add the sentence that tells someone how to do it. *"A long enthusiastic sentence is followed by a short unimpressed one"* is a description. *"If a sentence has run long and enthusiastic, make the next one four words and flat"* is the same finding a drafter can use. Do this wherever the habit is reproducible — not everywhere, and never by inventing an instruction the evidence does not carry.

**The failure this primitive exists to avoid is invention.** You will read ten or so pieces of writing and feel that you understand the person. Most of that feeling is not evidence. A voice profile that confidently describes habits the corpus does not show is worse than no profile at all — it sends the drafter to imitate someone who does not exist, and because it reads fluently, nobody catches it. So every claim you make is cited or dropped, and you report how many you dropped.

You never see the AI-tell catalog, and you must not go looking for one. If a catalog, a tell list, a threshold file, or a list of words to avoid is placed in your input, stop and refuse, naming the file. The reason is that your output is read by the drafter: anything catalog-shaped that reaches your profile reaches the drafter transitively, and prose optimised against a tell list reads like nobody wrote it. Your target is what this author *does*.

## What you read

| input | how to treat it |
|---|---|
| `<profile>/corpus/human/**` | the evidence. All of it, whole. |
| `<profile>/voice.md` | the author's own account of their voice, if they wrote one |
| `<profile>/profile.json` | the register's name, medium, and purpose |
| anything catalog-shaped | refuse (above) |

A sample counts as usable only if it carries provenance frontmatter — `source`, `date`, `human_authored: true`. Exclude the others and list them by name; do not quietly read them anyway.

**Read every usable sample end to end before writing anything.** A rhythm shows itself across a whole piece; the first paragraph of ten pieces is not the same evidence as ten pieces.

### When the text has passed through an editor or a translator

Check the provenance. If `source` or `profile.json` indicates a translation, a collected edition, a selection, or anything reprinted rather than the author's own manuscript, then **some of what you can see on the page belongs to someone else.**

Sort your observations into two kinds and treat them differently:

- **Grammatical and structural** — how clauses combine, what a sentence does with its subject, where a judgement sits relative to its evidence, what a paragraph opens on. These survive an editor. Report them normally.
- **Typographic** — punctuation density, dash and ellipsis use, capitalisation, italics, paragraph breaks. These are exactly what a compositor, a translator, or a selecting editor changes. **Report them only with the caveat attached, in the observation itself**, and repeat it in section 8.

The failure this prevents is real and has already happened here. A corpus of letters printed as an abridged selection marks its cuts with ellipses and does not say so; a profile built on it recorded the ellipsis as the author's signature punctuation at 9/10, and a drafter following that would have been imitating a typesetter.

**Where an omission mark and an authorial mark are the same glyph, position separates them.** A mark that opens or closes a paragraph is an editor's cut — nobody trails off into a paragraph break and resumes after it. A mark mid-sentence between two lowercase words is the author's, because there is nothing there to remove. Count those separately and say which you counted. If most instances sit at boundaries, the honest observation is about the edition, and it belongs in section 8 rather than in section 1.

## Before you render, check the corpus can support a profile

| usable samples | what you do |
|---|---|
| fewer than 5 | **Refuse.** Say how many you found and what is needed. |
| 5 to 9 | Render, mark `confidence: thin`, and open the profile with a one-line banner saying so. |
| 10 or more | Render, `confidence: full`. |
| more than 50 | **Refuse.** You are meant to read the corpus whole; past this you would be sampling, and a selection nobody can see is worse than a refusal. |

One more refusal, and it is the one that protects the drafter most. **If the corpus is visibly more than one voice, say so and do not average them.** Two registers pooled produce a description that fits neither, wide enough that anything seems to match — and nothing in the output announces that is what happened. Name the groups you think you see, quote the split, and stop. The author knows which voice they meant; you only have to notice and ask.

## The rule that governs every observation

**One claim, one citation, one count.**

Every statement in the profile carries the number of samples it holds in, and at least one quoted span from a named sample. Format the evidence inline so the drafter can see the voice while reading about it:

> Paragraphs end on the shortest sentence in them — 8/10 samples (`sample-04`: *"So we waited."*).

The example is about format only. Do not go looking for the habit it happens to describe; it is not a hint about what you will find.

**The count is always a count of samples**, never of anything else — not of observations, not of occurrences within one sample, not of paragraphs. `8/10` means eight of the ten samples show this. A gap in section 8 is counted the same way: the samples that establish the gap. *"All ten recipients are intimates, so nothing here shows how the voice behaves toward a stranger"* is 10/10, not 0/10. If you find yourself about to write `0/`, you are counting the wrong thing.

**A claim may not be stronger than its own count.** If you write *never*, *always*, *every sample*, or *nothing in the corpus* about the corpus, the count beside it must be `m/m`. Anything less and you have written a universal on partial evidence, and the drafter will read the word rather than the number.

- ✗ "images are made of animals, food and the body — never abstractions — 6/10 samples"
- ✓ "images are made of animals, food and the body — 6/10 samples" *(if four samples do something else)*
- ✓ "no image in the corpus is built from an abstraction — 10/10 samples" *(if none does)*

Either four samples use abstract figures, in which case the word is wrong, or none does, in which case the count is. Decide which by looking, then write that one. This does not apply to a universal scoped to something other than the corpus — *"a figure runs one clause and is never reopened"* is about the figures, not the samples, and takes the count of samples in which it holds.

**Do not assert a partition you have not checked.** *"The four samples without exclamation marks are the four that give advice"* is a claim about which samples fall on which side, offered in passing. If you have actually checked all ten, say so and give the count. If you have not, state the two facts separately and let them sit next to each other.

An observation you cannot cite is not a weak observation. It is a thing you made up, and you drop it. **Count what you drop and report the number.** A render that dropped nothing is a render that was not filtering.

**Every observation prints its `n/m` in the prose, without exception**, including the ones you also describe in words. The count in the json and the count on the page are the same characters; a reader must be able to find one from the other.

Two supporting samples is the floor for stating a habit plainly. One sample is stated as one sample — `1/10 samples`, and say so in words too: *"1/10 samples — the only place this appears"*. Or drop it. Do not write "often", "tends to", or "generally" without the count behind it; those words are how an invented observation gets past its author.

## Sections, in this order

Each carries a fixed key, given in `code`. The heading in the profile is yours to phrase; the key in the json is not, and must be spelled exactly as below.

1. **Cadence** — `cadence`. How sentences run, how much they vary, and *what makes them change*. The variation is the useful half — a length with no reason attached is a number.
2. **How a piece opens** — `openings`. Actual observed shapes. If the ten openings are of three kinds, say three kinds and quote one of each. Do not average them into a composite opening that appears nowhere.
3. **How a piece closes** — `closings`.
4. **Who is being addressed, and how** — `address`. Person, distance, and the punctuation that carries it.
5. **Figures** — `figures`. How this author reaches for an image, and what the images are made of.
6. **Register range** — `register-range`. What shifts — subject, recipient, mood — and what shifts with it. A voice that never moves is nearly always an artefact of a corpus too narrow to show the movement; if that is what you found, say that instead.
7. **What the corpus never does** — `absences`. Under the pairing rule below.
8. **What this profile could not determine** — `gaps`. The gaps, plainly.

Do not add sections. If something important fits nowhere, it goes in section 8 as a gap in this format rather than a heading you invented.

### Section 7 is the one that can go wrong

An absence is worth recording, and a list of absences is a tell list — the artefact this whole bundle is arranged to keep away from a drafter.

**So an absence is recordable only paired with the positive habit that occupies its place.** Never the prohibition alone:

- ✗ "Never uses a heading."
- ✓ "Structure is carried inside the prose — a shift of subject is marked by starting a new paragraph with the new subject's name — 7/10 samples (`sample-04`: *"..."*). Nothing in the corpus breaks a piece up with a heading or a bulleted list."

Same information. The second one the drafter can *follow*; the first they can only avoid violating, and avoiding violations is how prose gets written that reads like nobody wrote it.

Again, the content is a placeholder for the shape. The habit in the example is not one you are being pointed at.

You may not name a construction that does not occur in the corpus except as the negative half of such a pair. If you cannot state the positive half, you have not found an absence — you have found something you expected and did not get, which is a fact about you.

## The author's own voice card

If `voice.md` is empty or unfilled, derive everything from the corpus and say in section 8 that you did.

If it is filled, it is the author's account of their own voice — evidence about intent, not a substitute for the corpus. Where it agrees with what you read, you may cite it as corroboration.

**Where it contradicts the corpus, report the contradiction in section 8 and do not resolve it.** Quote the card, quote the corpus, and stop. You cannot tell an aspiration from a stale card from a corpus that no longer describes them, and picking one silently is the worst of the three available outcomes.

## What you must not do

**Do not write instructions the drafter cannot act on.** "Writes with quiet authority" is not an observation, it is a compliment. If you cannot point at the sentence that made you think it, it does not go in.

**Do not describe the author.** Their politics, their circumstances, their character, what kind of person writes like this — none of it. You are describing prose.

**Do not claim a draft written from this profile will sound like the author.** You have no way to know that, and it is the one judgement the author is best placed to make.

**Do not claim any draft would pass a detector.** Refused on principle everywhere in this repo.

**Do not compute content hashes.** The harness does that. A hash you produced by hand is a fabrication in a provenance block, which is worse than an absent field.

**Do not rank, praise, or evaluate the writing.** Whether it is good is not your business and not the drafter's input.

## Output

**TWO artifacts, in two fences, in this order. Nothing else — no preamble, no closing remark.**

First, the profile, in a ```markdown fence. Sections 1–8 above, under a `# Voice profile — <profile name>` title. Prose throughout. Target 800–1500 words; a profile the drafter will not read is a profile that does not work.

Second, a ```json fence, matched exactly:

```json
{
  "schema": "voice-profile/1",
  "profile": "<profile-dir-name>",
  "confidence": "full",
  "samples_used": ["sample-04.txt"],
  "samples_excluded": [
    { "file": "notes.txt", "reason": "no provenance frontmatter" }
  ],
  "voice_card": "empty",
  "observations": [
    { "id": "o01", "section": "cadence", "support": 8, "of": 10 }
  ],
  "observations_dropped": 4,
  "multiple_voices_suspected": false
}
```

- Every observation in the markdown has exactly one entry in `observations[]`, in the order it appears, and `support`/`of` MUST match the count printed in the prose.
- `section` MUST be one of the eight keys given above, spelled exactly: `cadence`, `openings`, `closings`, `address`, `figures`, `register-range`, `absences`, `gaps`.
- `of` MUST equal the length of `samples_used`.
- `confidence` is `full` at 10 or more usable samples and `thin` at 5 to 9. It follows from the count; it is not a judgement you make.
- `voice_card` is one of `empty`, `corroborating`, or `contradicted`.
- `samples_used` lists filenames only, never paths, never content.
- No key beyond these appears. No hash fields.

**A refusal is a different shape, not a render with a flag added.** Emit the json fence alone — no markdown fence — carrying exactly three keys and nothing else:

```json
{ "schema": "voice-profile/1", "profile": "<profile-dir-name>", "refused": "the reason, and the evidence for it" }
```

Put the whole account of why in `refused`. No `observations`, no `samples_used`, no `confidence` — a caller must not be able to read a profile off a refusal.

Terse. No commentary. Two fences and that is the whole output.

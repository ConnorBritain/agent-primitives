# Voice rhetoric measure

Read-only rhetorical annotation. Output: `voice-rhetoric-source/1`.
Bundle: prose-author.

## Why this exists

Surface counts cannot tell whether a comparison explains a mechanism or merely
illustrates an idea. A fixed rubric makes these estimates comparable without
silently inventing new feature meanings for each writer.

## Why a separate agent

The annotator describes supplied prose; it does not draft, interpret user
preferences, or decide whether a revision is needed. Keeping those responsibilities
separate prevents an estimate from quietly becoming a writing instruction.

## What it does

| Family | Evidence sought |
| --- | --- |
| Qualification | Uncertainty, scope limits, concession |
| Analogy | Explanatory, evaluative, illustrative function |
| Reader address | Direct/inclusive address, questions, directives |
| Paragraph roles | Claims, explanation, evidence, qualification, transitions, closure |

## When to run it

After explicit authorization to analyze selected prose, or during separately
opted-in history collection. Use one bounded draw, not retries to obtain a
preferred distribution. The history runtime supplies normalized paragraphs.

## Reading the output

Each annotation cites a source span. Unclassified paragraphs disclose unsupported
classification. The caller computes counts and rates; located evidence establishes
where the judgment applies, not whether its interpretation is correct.

## Known limits

The caller computes numbers and discards source-bearing analysis payloads before
storing history. Structural validity and semantic accuracy are different: a
correctly located annotation can still misclassify rhetoric. Model/rubric versions
are separate measurement series. See the prose-author history runtime reference
for consent, budgets, and retention behavior.

## Install

Install prose-author through the repository's local Claude/Codex installation
paths, then ask `prose-style-tune` to enable rhetorical history for a selected
identity and scope. Installing alone does not enable collection. Other harnesses
can invoke the primitive independently but must supply their own structural
validation; loading a prompt is not an enforced workflow.

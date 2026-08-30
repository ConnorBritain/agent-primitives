Select whole body paragraphs to delete from one rejected overlong draft.
You are not writing or revising prose. Return one deletion plan only. Deterministic code
will apply the plan, restore the exact title, perform the listed safe heading normalization,
and reject the result unless every semantic counter and length bound passes.

## Request

Write a 700-word blog post for software developers. Title: Choice screens are not market choice. Cover: who selects the listed options; how defaults shape behaviour; why nominal choice can preserve gatekeeper power; and what a meaningful remedy would change. Keep the title.

## Hard constraints

- The normalized draft has 852 words; it must end at 595–805 words.
- Delete at least 47 words. Prefer deleting at least 99 words so the result is no more than 753.
- Do not delete paragraph 1, any LOCKED HEADING, the closing paragraph, or every body paragraph in a section.
- Preserve the request's subject, audience, position, every requested point, recommendations, and supplied facts.
- Prefer redundant examples, repeated setup, and recap paragraphs over thesis, transitions, or requested-point coverage.
- Paragraph ids refer to the normalized draft below and must be returned exactly.

## Deterministic safe changes already reserved

- Paragraph 1: restore-exact-title.
- Paragraph 3: remove-heading-question-mark.

## Normalized numbered draft

### Paragraph 1 — 7 words — LOCKED HEADING

# Choice screens are not market choice

### Paragraph 2 — 57 words

A choice screen is often presented as a small victory for competition. A user sees several products, services, or providers and selects one. The interface looks neutral because every option is visible. But visibility isn't independence. Before anyone reaches the screen, someone has decided which options qualify, which are excluded, and which arrangement will guide the decision.

### Paragraph 3 — 5 words — LOCKED HEADING

## Who makes the list

### Paragraph 4 — 49 words

The first question is who built the menu, not which option you prefer. A platform owner, regulator, procurement office, or dominant vendor may determine the eligible set (usually an app store, platform, or agency). That decision is upstream of the screen, where the most consequential filtering has already happened.

### Paragraph 5 — 56 words

A listed option must satisfy rules. Some may be reasonable: security review, technical compatibility, or legal compliance. Others may reflect the interests of the institution controlling access. A company can define the category narrowly, demand costly certification, or reserve prominent placement for partners. The final menu may contain genuine alternatives while still reflecting one gatekeeper's boundaries.

### Paragraph 6 — 34 words

That is why “consumer choice” can conceal more than it reveals. A buyer chooses among the doors left open. The person controlling the hallway still controls the route—even when the doors have different signs.

### Paragraph 7 — 4 words — LOCKED HEADING

## Defaults are instructions

### Paragraph 8 — 39 words

People don't approach a list as blank calculators. They notice what appears first (what appears first), what is preselected, what looks official, and what requires extra work. A default turns one possible action into the path of least resistance.

### Paragraph 9 — 65 words

Defaults can be useful. They can select a safe setting, reduce repetitive work, or help a new user understand an unfamiliar system. But a default also carries a recommendation, whether or not the interface admits it. If changing the choice requires several screens, an account, or a warning, the menu is asking for effort from the person who wants to depart from the preferred path.

### Paragraph 10 — 52 words

The effect is cumulative. A provider placed at the top receives attention. A service bundled into setup receives adoption. A privacy setting left unchanged becomes the practical policy for many people. The user still has a formal option, but the system has already supplied a direction—and direction is a form of power.

### Paragraph 11 — 4 words — LOCKED HEADING

## The gatekeeper survives

### Paragraph 12 — 46 words

A nominal choice can preserve the old hierarchy. The gatekeeper no longer says, “There is only one provider.” It says, “Choose any provider from this approved list,” then controls the list, the ranking, the default, and the conditions of access. The surface changes; the dependency doesn't.

### Paragraph 13 — 65 words

This matters beyond convenience. A developer integrating a payment service, browser, identity provider, or distribution channel (for example, a browser or payment service) may technically be free to switch. Yet if switching means rebuilding an integration, losing discoverability, or asking users to change an established habit, the practical cost can be decisive. A formal right that is expensive to exercise is weaker than it appears.

### Paragraph 14 — 63 words

The same pattern can affect public institutions. A form may offer several vendors while requiring all of them to use a central account. A marketplace may show competing products while deciding which sellers can reach customers. A compliance system may accept multiple records while retaining the only usable card catalog of those records (in practice). The options differ, but the infrastructure remains concentrated.

### Paragraph 15 — 36 words

So what does the screen actually change? If the answer is only that a person may select among permitted entries, it may change presentation without changing control. That is not nothing, but it isn't market choice.

### Paragraph 16 — 6 words — LOCKED HEADING

## What a remedy would change

### Paragraph 17 — 48 words

A meaningful remedy must move authority, not merely add buttons. It should limit who can define the eligible set (a technical setting), require transparent criteria for inclusion, and give excluded providers a workable review process. The criteria should be stable enough to challenge and public enough to inspect.

### Paragraph 18 — 52 words

It should also treat defaults as regulated decisions. The preferred option should be clearly identified, switching should be simple, and the system should not impose artificial friction on alternatives. A user shouldn't need to become an expert, surrender additional data, or navigate a maze to make a different selection (the default path).

### Paragraph 19 — 45 words

Most importantly, the remedy should address the underlying dependency. Interoperability, data portability, accessible interfaces, and reasonable switching costs can make alternatives usable rather than decorative. A list is meaningful only when each listed option can compete for the user's business (not necessarily the best one).

### Paragraph 20 — 63 words

We should judge choice screens by what they let people change, not by how many names they display. Our standard must be practical control: who sets the boundaries, who shapes the first move, and whether leaving the preferred path is genuinely possible (the difference matters). If the answers remain with one gatekeeper, the screen is a display of permission—not a transfer of power.

### Paragraph 21 — 56 words

Lawmakers and institutions should ask for evidence about access, defaults, switching costs, and exclusion. You can ask the same question of any interface that promises choice: who still holds the keys? Then demand a remedy that changes the structure behind the screen. A menu can be wide and the room can still belong to someone else.

Return voice-draft-residual-prune/1 exactly. Give only paragraph ids and a short reason; do not return prose.

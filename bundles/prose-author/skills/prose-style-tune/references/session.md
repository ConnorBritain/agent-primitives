# Conversational preference sessions

Use `../prose-draft/tools/prose-runtime.mjs`, resolved from this skill directory.
If the sibling runtime is missing, state that storage/compilation is unavailable;
do not hand-edit a substitute preference file. `tools/style-contract.mjs` and
`references/contracts.md` describe historical /1 artifacts only.

## Store and interpret

Resolve `identity resolve` first. A selected registry identity supplies the shared
preference path; use `--writing-identity ID` to select another one. Setup and
refresh publication are described in the sibling drafting skill's
`references/identities.md`. Without a registry, reuse the user's known store.
Otherwise use `preferences locate`: the default
is the shared `.config/prose-author/preferences` under the user's home directory
for both Claude and Codex, or the absolute `PROSE_PREFERENCES_DIR` override.
The command is read-only and does not create a store. Visibly record the path
when initializing it; use a different explicit store for a different author
identity. Never put saved preferences in a temporary run directory or merge
identities. The store's `current.json` points to
an immutable file in `revisions/`. Never edit either directly.

Agent-internal commands:

```bash
node ../prose-draft/tools/prose-runtime.mjs preferences locate
node ../prose-draft/tools/prose-runtime.mjs preferences init --store /private/writing/preferences --id personal-writing
node ../prose-draft/tools/prose-runtime.mjs preferences show --store /private/writing/preferences
```

Translate one clear feedback event into narrow operations. For example, for
“Never use exclamation marks in replies,” prepare this feedback file:

```json
{
  "feedback": "Never use exclamation marks in replies.",
  "operations": [{
    "id": "save-reply-exclamations",
    "kind": "upsert",
    "decision": {
      "id": "reply-exclamations",
      "feature": "exclamation-marks",
      "scope": {"registers": [], "forms": ["reply"], "audiences": [], "purposes": [], "projects": []},
      "rule": {"id": "reply-exclamations", "kind": "punctuation", "directive": "Never use exclamation marks in replies.", "characters": "!", "minimum": 0, "maximum": 0},
      "binding": null
    }
  }]
}
```

Choose stable descriptive IDs; reuse an existing decision ID when changing that
choice. All rule IDs equal their decision IDs. `basis` is filled by the tool,
not asserted by the agent. Keep feedback verbatim. Omit no relevant scope.
Use `binding: null` for independent instructions. A dependent binding contains
the current profile digest and validated `observation_ids`; do not guess across
profile versions. Unresolved interpretations are questions, not operations.

```bash
node ../prose-draft/tools/prose-runtime.mjs preferences propose --store /private/writing/preferences --feedback /task/feedback.json
node ../prose-draft/tools/prose-runtime.mjs preferences apply --store /private/writing/preferences --proposal /task/proposal.json
```

Capture the first command's JSON output to a new proposal file using the host's
file tools. The apply command saves direct persistent instructions and returns
scope/revision/undo evidence. Its conservative recognizer accepts feedback
beginning with “always,” “never,” or “remember,” optionally preceded by “please.”
Other wording requires explicit approval via `--accept operation-id`; do not
rewrite the user's feedback to bypass this check. When the user already clearly
authorized persistence in different wording, describe the narrow interpretation
and ask for confirmation once rather than guessing authority.

For inferred preferences, show the interpretation and scope before applying
accepted IDs. Ordinary draft edits require no persistent operation. No corpus
edit-percentage threshold applies to feedback. Removal uses an operation with
`kind: "remove"`, a unique operation `id`, and an existing `decision_id`.

## Supported rule shapes

Every rule has `id`, `kind`, and the user's `directive`. Additional fields:

| Kind | Fields and meaning |
| --- | --- |
| `prohibited-phrase` | `text`; optional `case_sensitive` (default false), `substring` (default false) |
| `required-text` | `text`; optional `case_sensitive` (default true); literal visible text, not markup bytes |
| `punctuation` | `characters`, nonnegative integer `minimum`, integer or null `maximum` |
| `word-limit` | `minimum`, `maximum`; actual visible final prose length |
| `count-range` | known `measurement_id`, `unit` (`per-document` or `per-1000-words`), `minimum`, `maximum` |
| `semantic` | no extra fields; reviewed contextually, not mechanically certified |

Zero is exactly zero; null means no upper bound. Count-range IDs must come from
the current measurement contract, not an invented semantic category. A rate on
zero prose words is not evaluated. Markup/link destinations are excluded from
prose checks; identifiable quoted prose is included in explicit rule checks but
kept separate from observed author tendencies.

## Discover, compare, compile and undo

```bash
node ../prose-draft/tools/prose-runtime.mjs preferences discover --store /private/writing/preferences --offset 0 --limit 3
node ../prose-draft/tools/prose-runtime.mjs preferences compile --store /private/writing/preferences --context /task/context.json
node ../prose-draft/tools/prose-runtime.mjs preferences compare --store /private/writing/preferences --context /task/context.json --decision reply-exclamations --rule /task/candidate-rule.json
node ../prose-draft/tools/prose-runtime.mjs preferences diff --store /private/writing/preferences --from /private/writing/preferences/revisions/previous.json
node ../prose-draft/tools/prose-runtime.mjs preferences undo --store /private/writing/preferences
```

Add `--profile /private/writing/profile.json` to discover, compile or compare when
using observed evidence. Use the actual immutable revision path for `--from`.
Discovery returns at most three cards; summarize snippets rather than dumping
measurement records. No profile yields preference-only questions.

Comparison requires one active decision and a different rule with the same ID.
It returns two compiled variants without saving either. Use each variant's
`rules` as job-local overrides with the same preference store and identical task
inputs; do not pass the compiled artifact as a profile. Generate through the
drafting runner, retain both initial results and disclose incomplete checks.
Sampling is uncontrolled; do not infer unrelated preferences from the choice.

Undo restores the prior decisions as a new immutable revision. Display the
revision and actual changed scopes from the before/after diff. Repeating undo
undoes that restoration (a toggle); it does not silently walk back through all
history. A writer lock means inspect the actual writer/interruption before
recovery, never delete the lock merely because another call was slow.

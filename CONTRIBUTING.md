# Contributing

The ops of adding a primitive. Follow this and your primitive works in four harnesses and
survives the generator landing later.

## Before you write anything

Answer these three. If you can't, the primitive isn't ready.

**1. What does it catch that nothing else catches?**
Name the failure mode concretely enough to write a test for. "Reviews code quality" is not a
primitive. "Catches an assertion that was loosened from exact-match to not-null in this diff"
is. If an existing primitive already covers it, extend that one — a second reviewer with
overlapping scope makes both weaker, because each assumes the other has it.

**2. Is it read-only?**
Almost every primitive should be. A reviewer able to fix what it finds will fix rather than
report, and you end up with an unreviewed diff that now includes the reviewer's edits. Writing
primitives exist (a test author, a migration runner), but they need a stated reason.

**3. Where does it stop working?**
Every primitive has a boundary. Say it out loud in the README under *Known limits*. A
primitive with no stated limits is one nobody has pushed on yet.

## Anatomy of a primitive

```
primitives/agents/<name>/
├── agent.md      prompt body + universal frontmatter (name, description ONLY)
├── meta.yaml     contract + per-harness metadata and enforcement level
└── README.md     the write-up
```

### `agent.md`

Frontmatter carries **only** the universally-supported keys — `name` and `description`.
Everything harness-specific (`tools`, `model`, `color`) belongs in `meta.yaml`; putting it
here breaks the neutral form and the generator will overwrite it.

The body is the prompt, shared verbatim by every target. Structure that works:

- **Framing sentence.** Who the agent is, and — for reviewers — that it did *not* write this
  code and its job is to find what's wrong, not confirm it works. This sentence does more
  work than the rest of the prompt combined.
- **Scope.** What it reads. For diff reviewers, name the commands (`git diff`, `git show`).
- **A numbered list of exactly what to hunt for, in priority order.** Numbered and bounded.
  An open-ended "look for problems" returns whatever is most salient, which is rarely what
  matters. Priority order determines what survives a truncated response.
- **Output contract.** The exact per-finding fields, and a **verdict token** on the last line.
- **Terseness instruction.** "Terse. No praise, no preamble." Reviewers pad by default.

Write `description` for the dispatcher, not for a human. It is what the harness reads to
decide whether to invoke this agent, so lead with the trigger condition, and say what the
agent is *not* for when a sibling primitive is adjacent. Compare:

> ❌ `Reviews code for architecture issues.`
> ✅ `Read-only reviewer that inspects a diff for god objects, duplication, premature abstraction, spec drift, dead code, and boundary violations. Use after a code change and before declaring a task done. Never edits. Separate from code-reviewer (correctness/security/style).`

### `meta.yaml`

Two blocks. `contract` is what the primitive needs to work at all; `harness` is what each
target can actually deliver.

```yaml
name: <name>
kind: reviewer          # reviewer | author | investigator | planner
bundle: <bundle-name>

contract:
  read_only: true
  clean_context: true          # must not run in the writer's context
  verdict: [SHIP, BLOCK]
  scope: diff                  # diff | repo | file

harness:
  claude-code:
    enforcement: enforced      # enforced | partial | advisory
    model: sonnet
    color: red
    tools: [Read, Grep, Glob, "Bash(git diff:*)", "Bash(git log:*)"]
    notes: >-
      What this harness guarantees, in one or two sentences.
  cursor:
    enforcement: partial
    model: sonnet
  codex:
    enforcement: advisory
    notes: How to recover what's lost — usually a fresh subprocess.
  agents-md:
    enforcement: advisory
```

Be honest about `enforcement`. It is the field that stops a weak port from being described as
a strong one, and that mislabel is the most damaging thing you can ship here — it buys false
confidence exactly where the goal was to stop trusting self-reports.

Grant the narrowest `tools` set that does the job. A diff reviewer needs `Bash(git diff:*)`,
not `Bash`.

### `README.md`

This is the part people actually read, and the reason to prefer this repo over pasting a
prompt from a blog post. Required sections:

| Section | Contains |
|---|---|
| Header | One line each: **Catches**, **Verdict**, **Bundle** |
| **Why this exists** | The failure mode, concretely. Why it is hard to catch by reading the diff. Why it survives ordinary review. |
| **Why a separate agent** | Why the obvious cheaper thing (asking the writer to double-check) doesn't work. |
| **What it looks for** | A table of the numbered items from `agent.md`, with the tell for each. |
| **When to run it** | Position in the turn, and what must already be true. |
| **Reading the verdict** | What each token means, and what it does *not* certify. |
| **Known limits** | Where it stops working. Non-negotiable. |
| **Install** | The one-liner. |

Explain rationale, not just mechanics. The list of checks is in `agent.md` already; the README
earns its place by saying *why those checks and not others*.

## Anatomy of a bundle

A bundle is the deployable unit. One bundle can hold several primitives that belong together —
`verification-gate` holds two reviewers that run at the same moment on the same diff.

```
bundles/<bundle>/
├── agents/<name>.md         rendered: agent.md body + Claude frontmatter from meta.yaml
├── hooks/                   optional; enforcement only some harnesses support
├── AGENTS.md                portable variant — full prompts inline, degradation warned
├── README.md                contents, install per harness, cost, when to skip
├── .claude-plugin/plugin.json
├── .cursor-plugin/plugin.json
├── .codex-plugin/plugin.json
└── .plugin/plugin.json
```

### Manifest differences that will bite you

The four schemas are not interchangeable. Copy the shapes from `verification-gate`:

- **`.claude-plugin`** — `agents` is an **array of file paths** (`["./agents/foo.md"]`).
- **`.cursor-plugin`** — `agents` is a **directory name string** (`"agents"`).
- **`.codex-plugin`** — needs an `interface` block (`displayName`, `shortDescription`,
  `longDescription`, `category`, `capabilities`, `defaultPrompt`) for marketplace display.
- **`.plugin`** — generic fallback. Identity only, no surface wiring.

Then register the bundle in the root [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json)
so `/plugin marketplace add` can see it.

Keep `version` identical across all four manifests and the marketplace entry. Four files
claiming different versions of the same bundle is a support problem you will not enjoy.

### Hooks

Hooks are where enforcement lives, so they get held to a higher bar than prompts — a broken
prompt gives a bad review, a broken hook blocks every turn.

- **Fail asymmetrically.** A failing *check* should block. A failing *hook* (unparseable
  config, missing runtime) should warn and exit clean. A guard that bricks the session gets
  uninstalled, and an uninstalled guard protects nothing.
- **Opt in per project.** No config file present → no-op.
- **Respect `stop_hook_active`** on `Stop` hooks, or you will build an infinite loop.
- **Cross-platform.** Node with no dependencies. This repo targets Windows, macOS, and Linux.
- **Test every path before committing** — config absent, config malformed, check passing,
  check failing, timeout, loop guard. See the paths covered by
  [`gate-runner.mjs`](bundles/verification-gate/hooks/gate-runner.mjs).

## Checklist

```
[ ] primitives/agents/<name>/{agent.md, meta.yaml, README.md}
[ ] agent.md frontmatter has ONLY name + description
[ ] body: framing · scope · numbered priority list · output contract · verdict token · terseness
[ ] meta.yaml: contract block + every harness labelled enforced|partial|advisory
[ ] README covers all eight required sections, including Known limits
[ ] rendered copy in bundles/<bundle>/agents/<name>.md — body byte-identical to agent.md
[ ] bundle AGENTS.md updated with the portable prompt + degradation warning
[ ] all four manifests updated, versions identical
[ ] registered in .claude-plugin/marketplace.json
[ ] hooks tested across every path, if any
[ ] root README table updated
[ ] install.sh / install.ps1 pick it up (they glob the bundle; verify)
```

## Testing a primitive

There is no unit test for a prompt, so test it the only way that means anything: **on a diff
you have deliberately poisoned.**

Make a branch. Weaken an assertion. Add an `it.skip`. Hard-code the value a test checks.
Duplicate a helper that already exists. Then run the primitive and confirm it fires, cites the
right line, and returns the blocking verdict.

Then run it on a genuinely clean diff and confirm it says so without manufacturing nits. A
primitive that finds something every time is noise, and noise gets ignored — which is the same
outcome as not having it.

Record both results in the PR. "It looked right" is precisely the self-report this repo exists
to stop accepting.

## Style

- Prompts in en-US imperative. Docs may be en-GB; be consistent within a file.
- No secrets, credentials, or user-specific paths anywhere. This repo is public.
- No pixel coordinates, no run narration, no "as of today" — write the durable shape.
- Keep the primitive's judgment harness-neutral. Anything that only makes sense in one harness
  belongs in `meta.yaml` notes or the bundle README, not in `agent.md`.

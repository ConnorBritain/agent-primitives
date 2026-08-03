# Contributing

The ops of adding a primitive, in any domain. Follow this and your primitive works in four
harnesses and survives the generator landing later.

## Before you write anything

**1. What does it do that nothing else does?**
Name the job concretely enough to test. "Improves writing" is not a primitive. "Rewrites
AI-register prose — hedging stacks, uniform sentence length, listicle scaffolding — while
preserving every claim" is. If an existing primitive already covers it, extend that one; two
primitives with overlapping scope make each other weaker, because each assumes the other has
it covered.

**2. What kind is it, and what surface does it ship on?**
Two independent questions. **Kind** is what the primitive promises; **surface** is how it is
delivered. Pick both before writing the prompt — kind decides the rules and the tests, surface
decides the packaging and the install path.

**3. Where does it stop working?**
Every primitive has a boundary. State it in the README under *Known limits*. A primitive with
no stated limits is one nobody has pushed on yet.

## Kinds

| Kind | Reads / writes | Output contract | Central risk |
|---|---|---|---|
| **reviewer** | read-only | a verdict token | approves its own work |
| **transformer** | rewrites its input | changed artifact + what was preserved | changes what it should have preserved |
| **author** | writes new artifacts | artifact + how it was verified | invents conventions the project doesn't use |
| **investigator** | read-only | a map or answer, with sources | reports inference as observation |
| **planner** | read-only | a plan + its success criteria | plans work that can't be checked |

### Per-kind requirements

**reviewer** — Read-only, always: an agent able to fix what it finds will fix rather than
report, leaving an unreviewed diff that now contains its edits too. Must run in a context
separate from whoever produced the work; this isolation is the mechanism, not a nicety. Frame
adversarially and say so in the prompt — "please review this" returns praise, "assume the
author took the easy path and prove it" returns findings. End in a verdict token, and resolve
uncertainty toward blocking; a reviewer that rounds ambiguity to "probably fine" converges on
rubber-stamping.

**transformer** — Declare `preserves` in `meta.yaml`: what must survive the rewrite. This is
the contract, and the whole risk profile lives here. Prefer the smallest edit achieving the
goal; a transformer that rewrites more than asked is indistinguishable from one that
misunderstood. Should be **idempotent** — running it twice must not drift further than once.
Report what changed, not just the result, or the user can't review it. Never silently drop
content: if something can't be transformed, say so.

**author** — Read the project's existing conventions *first* and match them; introducing a new
framework, naming scheme, or assertion style is a finding, not a feature. State how the output
was verified — an author that reports "added tests" without running them has produced
unverified text.

**investigator** — Read-only. Separate observation from inference explicitly, and cite what
grounds each claim. Say what you could not determine; an investigator that never says "unknown"
is one that guesses.

  If the investigator *measures* something, the same rule has a sharper form: **never report
  precision you do not have.** A threshold nobody calibrated is a guess wearing a number's
  clothes, and a number gets quoted without its caveats. Say on every run which of your
  outputs are measurements and which are defaults, refuse to compute a statistic from a
  sample too small to support it, and state the error rate you actually expect rather than
  implying none. A measurement presented bare is inference reported as observation, just in
  a costume that makes it harder to argue with.

## Surfaces

Kind and surface are independent axes. A reviewer can ship as an agent or a skill; an
investigator can ship as either. Getting this wrong does not produce a bad primitive — it
produces one nobody can install.

| Surface | Invoked by | Source of truth | Use when |
|---|---|---|---|
| **agent** | the dispatcher, or a protocol rule | `primitives/agents/<name>/` | The work needs its own context window — anything adversarial, anything that must not share the caller's history |
| **skill** | the dispatcher, or by name | `bundles/<b>/skills/<name>/` | The primitive needs bundled assets: scripts, catalogs, reference files |
| **command** | the user types `/name` | `bundles/<b>/commands/` | An explicit entry point someone would otherwise have to describe in prose |
| **hook** | the harness, on an event | `bundles/<b>/hooks/` | Enforcement the model must not be able to route around |

**Only agents get a `primitives/` entry, and the reason is rendering.** An agent is written
once and rendered per harness, with `tools`, `model`, and `color` added from `meta.yaml` —
that variance is what `primitives/` exists to manage. A skill renders once, because no other
harness reads `SKILL.md`; its portable form is the bundle's `AGENTS.md`, which is prose, not
a rendering. Duplicating an unrendered file into `primitives/` would create two identical
copies to keep in sync and buy nothing.

So: **agents live in `primitives/` and are rendered into `bundles/`. Skills, commands, and
hooks live in the bundle only.** Agents and skills each declare a `meta.yaml` next to their
body, because the contract and the honest per-harness enforcement label are not optional for
anything that makes a promise. Commands and hooks do not: a command is an entry point to a
primitive that already declared one, and duplicating the contract there creates a second copy
to keep true.

### Choosing between an agent and a skill

- **Needs its own context** → agent. This is the whole mechanism for reviewers, and no skill
  substitutes for it.
- **Needs to ship files** → skill. A skill directory carries `scripts/`, data, and references,
  and its own files resolve by **relative path**, so it survives both a plugin install and a
  plain copy into `~/.claude/skills/`.
- **Both** → a skill that spawns the agent, or a bundle containing both. They compose.

Prefer a skill for anything with a deterministic component. Put the deterministic work in a
script and let the skill orchestrate: scripts do not hallucinate a count, and the split keeps
model judgement for what actually needs judgement.

### Paths, which is where this bites

`${CLAUDE_PLUGIN_ROOT}` resolves **only under a plugin install**. Anything depending on it is
plugin-only, and a loose-file copy of it fails at first use. A skill's own bundled files should
therefore be referenced relatively, and a command should delegate to its skill rather than
shelling out to a bundled script. Get this wrong and the primitive works perfectly for you and
is broken for everyone who installed it the other way.

Skills, commands, and agents are **auto-discovered** from their directories; no manifest
declaration is needed. Declaring `commands` or `agents` in `plugin.json` *replaces* the default
scan rather than adding to it, which is a footgun, not a feature.

**planner** — Define success criteria *before* decomposing: what proves this is done. A plan
whose steps can't be checked isn't a plan. Name existing code to reuse before proposing new
code.

## Anatomy

```
primitives/agents/<name>/
├── agent.md      prompt body + universal frontmatter (name, description ONLY)
├── meta.yaml     kind, contract, per-harness metadata and enforcement level
└── README.md     the write-up
```

### `agent.md`

Frontmatter carries **only** `name` and `description`. Everything harness-specific (`tools`,
`model`, `color`) belongs in `meta.yaml`; putting it here breaks the neutral form and the
generator will overwrite it.

Write `description` for the dispatcher, not for a human — it's what the harness reads to decide
whether to invoke this agent. Lead with the trigger condition, and name the adjacent primitive
it shouldn't be confused with. See [`docs/wiring.md`](docs/wiring.md#1-dispatcher-triggered--the-harness-decides).

The body is shared verbatim by every target. Structure that works across kinds:

- **Framing sentence.** Who the agent is and what stance it takes. For reviewers, that it did
  *not* write this and its job is to find what's wrong. For transformers, what it must preserve.
  This sentence does more work than the rest of the prompt combined.
- **Scope.** What it reads and what it may touch. Name commands where relevant.
- **A numbered list, in priority order.** Bounded and ordered — open-ended instructions return
  whatever is most salient, and priority order decides what survives a truncated response.
- **Output contract.** The exact fields, and a final line in a defined shape.
- **Terseness instruction.** Agents pad by default.

### `meta.yaml`

`contract` is what the primitive needs to work; `harness` is what each target delivers.

```yaml
name: <name>
kind: reviewer | transformer | author | investigator | planner
bundle: <bundle-name>

contract:
  read_only: true          # reviewer/investigator/planner: true. transformer/author: false
  clean_context: true      # must not run in the context that produced the work
  scope: diff              # diff | file | selection | repo
  verdict: [SHIP, BLOCK]   # reviewers
  # transformers add:
  # preserves: [claims, structure, code blocks]
  # idempotent: true

harness:
  claude-code:
    enforcement: enforced      # enforced | partial | advisory
    model: sonnet
    tools: [Read, Grep, Glob, "Bash(git diff:*)"]
    notes: >-
      What this harness guarantees, in a sentence or two.
  cursor:  { enforcement: partial }
  codex:   { enforcement: advisory, notes: How to recover what's lost }
  agents-md: { enforcement: advisory }
```

Contract keys vary by kind — `verdict` is meaningless for a transformer, `preserves` for a
reviewer. Add what the kind needs; don't pad with keys that don't apply.

Be honest about `enforcement`. Overstating it is the most damaging error available here: it
buys confidence exactly where the point was to stop trusting self-reports.

Grant the narrowest `tools` set that does the job — `Bash(git diff:*)`, not `Bash`.

### `README.md`

The reason to prefer this repo over pasting a prompt from a blog post.

| Section | Contains |
|---|---|
| Header | One line each: what it does, output contract, bundle |
| **Why this exists** | The failure mode or need, concretely. Why it's hard to handle by hand. |
| **Why a separate agent** | Why the cheaper obvious thing doesn't work. |
| **What it does** | A table of the numbered items from `agent.md`, with the tell or rule for each. |
| **When to run it** | Position in the workflow; what must already be true. |
| **Reading the output** | What the contract means, and what it does *not* certify. |
| **Known limits** | Where it stops working. Non-negotiable. |
| **Install** | The one-liner. |

Explain rationale, not mechanics. The checklist is in `agent.md`; the README earns its place by
saying *why those items and not others*.

## Sizing a bundle

A bundle is the deployable unit. Get its boundary wrong and users can't install or disable
what they want, so decide this before writing the manifests.

**The mechanism.** In Claude Code, install granularity is the *plugin*, not the agent:

```
/plugin marketplace add ConnorBritain/agent-primitives   # registers the catalog, installs nothing
/plugin install verification-gate@agent-primitives       # installs the whole bundle
```

Enabling is the same granularity — a boolean per plugin in `settings.json`:

```json
"enabledPlugins": { "verification-gate@agent-primitives": true }
```

There is no per-agent selector in either. Install one primitive from a bundle and you install
all of them; disable the bundle and they all go quiet.

**The rule that follows: a bundle is the set of primitives you would turn on and off
together.** Bundle boundary = install boundary = toggle boundary. Those are the same line,
so draw it once, deliberately.

**The test.** Would anyone reasonably want one of these without the others?

- *No* → one bundle. `verification-critic` and `architecture-reviewer` run at the same moment,
  on the same diff, as one gate. A gate with half its checks is a strange thing to want.
- *Yes* → separate bundles. A prose humanizer and a code reviewer share nothing: different
  domain, different trigger, different projects. Bundling them forces anyone who wants one to
  take both.

**Don't pre-split.** Two bundles means two sets of four manifests, two versions to keep in
lockstep, and two marketplace entries — real cost, paid every release. Split when someone
actually wants one without the other, not in anticipation.

**Escape hatches** when a user wants finer control than the bundle gives:

- Loose-file install takes individual names: `./install.sh verification-critic`
- Put `enabledPlugins` in a *project's* `.claude/settings.json` and the bundle is active only
  in that repo — usually the on/off people actually want, e.g. a delivery gate that's live in
  application repos and absent in a docs repo.

## Anatomy of a bundle

```
bundles/<bundle>/
├── agents/<name>.md         rendered: agent.md body + frontmatter from meta.yaml
├── hooks/                   optional; enforcement only some harnesses support
├── wiring/                  CLAUDE.md / AGENTS.md snippets for THIS bundle
├── AGENTS.md                portable variant, with the degradation warned
├── PROTOCOL.md              how these primitives are meant to be run, if non-obvious
├── README.md                contents, install per harness, cost, when to skip
└── .claude-plugin/ .cursor-plugin/ .codex-plugin/ .plugin/
```

**Bundle-specific docs live in the bundle.** Repo-level `docs/` is kind-agnostic. A protocol,
a rationale, or a snippet that's true only of your bundle belongs next to it — otherwise
`docs/` becomes a monument to whichever bundle landed first.

### Manifest differences that will bite you

The four schemas are not interchangeable. Copy the shapes from `verification-gate`:

- **`.claude-plugin`** — `agents` is an **array of file paths** (`["./agents/foo.md"]`).
- **`.cursor-plugin`** — `agents` is a **directory name string** (`"agents"`).
- **`.codex-plugin`** — needs an `interface` block (`displayName`, `shortDescription`,
  `longDescription`, `category`, `capabilities`, `defaultPrompt`) for marketplace display.
- **`.plugin`** — generic fallback. Identity only, no surface wiring.

Register the bundle in the root [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json),
and keep `version` identical across all four manifests plus the marketplace entry.

### Hooks

Hooks are where enforcement lives, so they're held to a higher bar than prompts — a broken
prompt gives a bad answer, a broken hook blocks every turn.

- **Fail asymmetrically.** A failing *check* blocks. A failing *hook* (unparseable config,
  missing runtime) warns and exits clean. A guard that bricks the session gets uninstalled, and
  an uninstalled guard protects nothing.
- **Opt in per project.** No config present → no-op.
- **Respect `stop_hook_active`** on `Stop` hooks, or you've built an infinite loop.
- **Cross-platform**, no dependencies. This repo targets Windows, macOS, and Linux.
- **Test every path** — config absent, malformed, check passing, check failing, timeout, loop
  guard. See [`gate-runner.mjs`](bundles/verification-gate/hooks/gate-runner.mjs).

## Testing a primitive

There's no unit test for a prompt. Test it the only way that means anything: **on input built
to break it**, then on input that should leave it quiet.

| Kind | Positive test | Negative test (the one people skip) |
|---|---|---|
| **reviewer** | Poison a diff — weaken an assertion, add a `skip`, duplicate an existing helper. It must fire, cite the right line, return the blocking verdict. | A genuinely clean diff. It must say so **without manufacturing nits.** |
| **transformer** | A representative input. Check the `preserves` list survived, item by item. | Run it twice — output must be stable (idempotent). And run it on *already-good* input: it must make few or no changes. |
| **author** | A project with established conventions. Output must match them, not the agent's defaults. | A project with *unusual* conventions. It must still match, not "improve". |
| **investigator** | A question with a verifiable answer. Check every claim is grounded. | A question the data can't answer. It must say "unknown" rather than infer. |
| **planner** | A real task. The plan must name checkable success criteria. | An underspecified task. It must surface the ambiguity, not guess. |

The negative test is the one that matters. A primitive that fires on everything is noise, and
noise gets ignored — the same outcome as not having it, after paying for it.

Record both results in the PR. "It looked right" is exactly the self-report this repo exists to
stop accepting.

## Checklist

```
[ ] kind AND surface chosen deliberately (they are independent axes)
[ ] agents: primitives/agents/<name>/{agent.md, meta.yaml, README.md}
[ ] skills: bundles/<b>/skills/<name>/{SKILL.md, meta.yaml} — no primitives/ entry
[ ] skill bundled files referenced by RELATIVE path, not ${CLAUDE_PLUGIN_ROOT}
[ ] commands delegate to a skill rather than shelling out to a bundled script
[ ] installed both ways — plugin AND loose-file — and actually invoked it
[ ] agent.md frontmatter has ONLY name + description
[ ] description leads with the trigger condition; names the sibling it isn't
[ ] body: framing · scope · numbered priority list · output contract · terseness
[ ] meta.yaml: kind + contract keys appropriate to that kind
[ ] every harness labelled enforced|partial|advisory, honestly
[ ] tools = narrowest set that does the job
[ ] README covers all eight sections, including Known limits
[ ] rendered copy in bundles/<bundle>/agents/<name>.md — body byte-identical to agent.md
[ ] bundle choice justified: would anyone want this WITHOUT the others in that bundle?
[ ] bundle AGENTS.md + wiring/ updated
[ ] all four manifests updated, versions identical, registered in marketplace.json
[ ] wiring mode chosen deliberately (docs/wiring.md) — CLAUDE.md edits only if protocol-bound
[ ] positive AND negative test run, both recorded
[ ] hooks tested across every path, if any
[ ] root README catalog + kinds table updated
```

## Style

- Prompts in en-US imperative. Docs may be en-GB; be consistent within a file.
- No secrets, credentials, or user-specific paths. This repo is public.
- No pixel coordinates, no run narration, no "as of today" — write the durable shape.
- Keep the primitive's judgment harness-neutral. Anything true of only one harness belongs in
  `meta.yaml` notes or the bundle README, never in `agent.md`.

# Wiring a primitive in

Installing a primitive puts a file on disk. That is not the same as anything invoking it. This
is how invocation actually happens, and how to edit `CLAUDE.md` / `AGENTS.md` without wrecking
them.

## The three modes

Pick the weakest one that works. Every step up costs context on every turn, forever.

### 1. Dispatcher-triggered — the harness decides

The harness reads each installed agent's `description` and routes to it when the situation
matches. **Nothing goes in `CLAUDE.md`.**

This is the default and the right choice for most primitives: investigators, authors,
transformers, anything the user asks for by situation rather than on a schedule. If you find
yourself writing "use the X agent when Y" into `CLAUDE.md`, the real problem is almost always
that `description` doesn't say Y.

Write `description` for the dispatcher, not for a human. Lead with the trigger condition, and
name the sibling it should *not* be confused with:

> ❌ `Improves writing quality.`
> ✅ `Rewrites AI-sounding prose into natural human register — removes hedging stacks, uniform sentence length, and listicle scaffolding. Use on drafts intended for publication. Preserves claims and structure; does not fact-check or restructure arguments.`

That second one gets invoked at the right moment. The first gets invoked at random.

### 2. Explicitly invoked — the user decides

The user names it, or types a command. Also needs nothing in `CLAUDE.md`. Right for primitives
that are expensive, destructive, or a matter of taste — anything where firing on its own
judgment would be presumptuous.

### 3. Protocol-bound — a rule decides

A line in `CLAUDE.md` / `AGENTS.md` says *when* the primitive must run, in terms the model
checks against its own state: before declaring done, before touching a migration, after
editing more than N files.

This is the only mode that needs file edits, and it exists for one reason: **the model would
not otherwise choose to run it, because running it is against its local interest.** A gate that
might say "not done" is exactly what a model heading for "done" will skip. That's the entire
category — checks the agent has an incentive to route around.

Almost nothing else qualifies. A humanizer doesn't need protocol binding; a user who wants
humanized prose asks for it. Bind by protocol only when *the primitive existing* and *the
primitive running* come apart.

## Editing CLAUDE.md / AGENTS.md

These files are loaded on every turn. Everything in them competes for attention with
everything else, so the cost of a line is paid forever and the benefit had better be too.

**Additive, in a named section.** Give it a heading that says which primitive it serves, so it
can be found, audited, and removed cleanly. Prose woven into someone's existing sections is
unremovable — a year later nobody knows which line came from where.

```markdown
## Self-verification gate   <!-- agent-primitives: verification-gate -->
...
```

**Idempotent.** Pasting the snippet twice should be harmless — no "additionally", no "as
mentioned above". People re-run installers.

**State the trigger and the consequence. Nothing else.** The primitive's own file holds its
method. Restating it in `CLAUDE.md` creates two copies that drift, and the copy in `CLAUDE.md`
is the one that wins by being always-loaded.

```markdown
❌ Before finishing, run the reviewer, which checks for weakened assertions,
   added skips, harness escapes, and code overfit to a specific test input, and
   which returns findings with severity, location, evidence, and a fix...

✅ Before declaring a non-trivial task done: run the Tier-1 gates and report the
   command that produced the result, then invoke `verification-critic` and
   `architecture-reviewer` in parallel with the original task statement. BLOCK
   means not done.
```

**Say what "skip" looks like.** A rule with no stated exemption gets routed around silently the
first time it's inconvenient, and a silently-ignored rule is worse than none — it reads as
covered. Write the exemption in: *trivial turns may skip this; say so when you do.*

**Global vs project.** Global (`~/.claude/CLAUDE.md`) for a working style you want everywhere.
Project for anything naming a command, path, or convention that isn't universal. Project rules
that leak into global are how a `CLAUDE.md` becomes 400 lines nobody reads.

**Keep one source across formats.** Claude Code reads `CLAUDE.md`; most other harnesses read
`AGENTS.md`. Don't maintain both — make one an import:

```markdown
<!-- CLAUDE.md -->
@AGENTS.md
```

This repo does exactly that. Two files with the same intent and different wording is a bug
that surfaces months later as inconsistent behavior between tools.

## Kind → mode

| Kind | Usual mode | Why |
|---|---|---|
| reviewer | **protocol-bound** | Only kind with a structural incentive to be skipped |
| transformer | dispatcher or explicit | User knows when they want the rewrite |
| author | dispatcher | The request names it: "add tests for X" |
| investigator | dispatcher | Triggered by a question |
| planner | dispatcher or explicit | Trigger is task complexity, which the description can carry |

If you're writing a `CLAUDE.md` rule for anything other than a reviewer-shaped gate, check
first whether a sharper `description` gets you there. It usually does, and it costs nothing
per turn.

## Verifying it actually fires

Installed ≠ wired ≠ firing. Check the last one directly:

1. Construct the situation the primitive is for.
2. Run a turn without mentioning it by name.
3. Confirm it was invoked — in the transcript, not by asking the agent whether it ran.

For protocol-bound primitives, also confirm the inverse: create the condition where the rule
says it *must* run, and check it isn't quietly skipped. Self-reported compliance is exactly
the signal a gate exists to replace.

## Uninstalling

Delete the agent file, then delete its `CLAUDE.md` section. A protocol rule pointing at a
primitive that no longer exists is worse than either alone — the model tries to comply, fails,
and improvises something in its place.

# Install the prose toolchain

The useful installation is three bundles together:

- `prose-author` supplies `$prose-draft`, `$prose-style-tune`, and the profile and drafting agents.
- `prose-tell-scan` supplies the deterministic `$tell-scan` measurement skill.
- `prose-review` supplies the independent voice and fidelity critics plus the reviser.

`prose-author` still drafts when either companion is unavailable, but it labels the result
**UNGATED** and names the missing check. Installing all three gives the workflow its intended
critique, revise, and scan path.

## Codex

From a clone of this repository, run:

```bash
node install-prose-codex.mjs
```

The installer adds this repository as a Codex marketplace, installs and enables all three
plugins, and renders the six harness-neutral agent prompts as read-only personal Codex agents
under `~/.codex/agents/`. It is safe to rerun: it updates files it generated and refuses to
overwrite an agent file it does not own.

Verify the installation with:

```bash
node install-prose-codex.mjs --check
codex plugin list
```

Start a new Codex session after installation. Then name the workflow you want:

- `$prose-draft` — rewrite a passage or draft from a topic, outline, brief, or reply prompt.
- `$prose-style-tune` — inspect profile evidence, record feedback, pin preferences, and run a controlled comparison.
- `$tell-scan` — run the deterministic prose scan directly.

The custom agents are normally dispatched by those skills. You can also ask Codex to use
`voice-profile-render`, `voice-draft`, `voice-feedback-interpret`, `prose-voice-critic`,
`prose-fidelity-critic`, or `prose-reviser` explicitly.

If the plugins are already installed and only the agent wrappers need repair, use
`node install-prose-codex.mjs --agents-only`. Set `CODEX_HOME` before the command if Codex uses
a non-default configuration directory.

## Claude Code

Install from the marketplace inside Claude Code:

```text
/plugin marketplace add ConnorBritain/agent-primitives
/plugin install prose-author@agent-primitives
/plugin install prose-tell-scan@agent-primitives
/plugin install prose-review@agent-primitives
```

Or install loose files from a clone:

```bash
./install.sh voice-profile-render voice-draft voice-feedback-interpret \
  prose-draft prose-style-tune tell-scan \
  prose-voice-critic prose-fidelity-critic prose-reviser
```

The loose install puts agents in `~/.claude/agents/`, skills in `~/.claude/skills/`, and the
tell-scan command in `~/.claude/commands/`. Use `--project` to install into the current
project's `.claude/` directory instead. Run `claude agents` to confirm the six agents, then
start a new Claude Code session.

Invoke `prose-draft` or `prose-style-tune` by name. A loose tell-scan install uses
`/tell-scan`; a plugin install namespaces the command as `/prose-tell-scan:tell-scan`.

## Updating

Pull the repository, rerun the installer for your harness, and start a new session. For
Codex, refresh the marketplace first when a newer bundle version has been published:

```bash
codex plugin marketplace upgrade agent-primitives
node install-prose-codex.mjs
```

For a Claude loose-file installation, rerunning `install.sh` replaces each selected skill as
a complete directory so stale tools cannot survive an update.

## First use

Have a single-author corpus ready before asking for measured-voice drafting. Tell the agent
where the corpus lives, what kind of writing it contains, and whether you want a blank-page
draft or a rewrite. The renderer refuses mixed authors and underspecified registers rather
than silently averaging them. A private corpus stays outside the drafter's context: the
profile renderer reads it, while `voice-draft` receives only the resulting profile and your
request.

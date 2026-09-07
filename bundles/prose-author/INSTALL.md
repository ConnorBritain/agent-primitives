# Install the prose toolchain

The useful installation is three bundles together:

- `prose-author` supplies `$prose-draft`, `$prose-style-tune`, and the profile and drafting agents.
- `prose-tell-scan` supplies the deterministic `$tell-scan` measurement skill.
- `prose-review` supplies the independent voice and fidelity critics plus the reviser.

`prose-author` still drafts when either companion is unavailable, but it labels the result
**UNGATED** and names the missing check. Installing all three gives the workflow its intended
critique, revise, and scan path.

## Codex

From a clone of this repository, run (Node.js 22+ and an authenticated Codex CLI
with plugin support are required):

```bash
node install-prose-codex.mjs
```

The default installs **this local checkout**, including uncommitted candidate changes;
it does not download GitHub main. The installer adds the checkout as a Codex marketplace, installs and enables all three
plugins, and renders the seven harness-neutral agent prompts as read-only personal Codex agents
under `~/.codex/agents/`. It is safe to rerun: it updates files it generated and refuses to
overwrite an agent file it does not own.

If `agent-primitives` is already registered from GitHub, an ordinary install
stops before changing it. To intentionally switch to this local checkout:

```bash
node install-prose-codex.mjs --replace-marketplace
```

The source switch refuses if that marketplace has other installed bundles.
It leaves other marketplaces alone. Keep the checkout at its registered path.
For GitHub main instead, use `--remote` (and `--remote --check`); an unpublished
local candidate is not available through that route.
Remote plugin versions must match the checkout used to render custom agents;
otherwise the installer stops with a mismatch error. The remote route follows
GitHub `main`; use the local route for changes that have not merged there yet.

Verify the installation with:

```bash
node install-prose-codex.mjs --check
codex plugin list
```

Local checks compare the enabled source, version, deployment-file inventory and
file bytes, not just whether a plugin with that name exists. A same-version
cache that retains old code fails this check instead of reporting success.

Start a new Codex session after installation. Then name the workflow you want:

- `$prose-draft` — rewrite a passage or draft from a topic, outline, brief, or reply prompt.
- `$prose-style-tune` — inspect profile evidence, record feedback, pin preferences, and run a controlled comparison.
- `$tell-scan` — run the deterministic prose scan directly.

The custom agents are normally dispatched by those skills. You can also ask Codex to use
`voice-profile-render`, `voice-draft`, `voice-feedback-interpret`, `voice-rhetoric-measure`, `prose-voice-critic`,
`prose-fidelity-critic`, or `prose-reviser` explicitly.

If the plugins are already installed and only the agent wrappers need repair, use
`node install-prose-codex.mjs --agents-only`. Set `CODEX_HOME` before the command if Codex uses
a non-default configuration directory.

## Claude Code

For a **local candidate**, add the absolute path to your checkout in Claude Code,
then install the three plugins:

```text
/plugin marketplace add /absolute/path/to/agent-primitives
/plugin install prose-author@agent-primitives
/plugin install prose-tell-scan@agent-primitives
/plugin install prose-review@agent-primitives
```

Replace the example path with your real checkout. For the published repository
instead, use the GitHub source below. It does not include unpublished changes:

```text
/plugin marketplace add ConnorBritain/agent-primitives
/plugin install prose-author@agent-primitives
/plugin install prose-tell-scan@agent-primitives
/plugin install prose-review@agent-primitives
```

Or install loose files from a clone:

```bash
./install.sh voice-profile-render voice-draft voice-feedback-interpret voice-rhetoric-measure \
  prose-draft prose-style-tune tell-scan \
  prose-voice-critic prose-fidelity-critic prose-reviser
```

The loose install puts agents in `~/.claude/agents/`, skills in `~/.claude/skills/`, the
fidelity scanner in `~/.claude/tools/`, and the tell-scan command in
`~/.claude/commands/`. On Windows use `install.ps1` with the same names and
`-Project` instead of `--project`. Use `--project` to install into the current
project's `.claude/` directory instead. Run `claude agents` to confirm the seven agents, then
start a new Claude Code session.

Invoke `prose-draft` or `prose-style-tune` by name. A loose tell-scan install uses
`/tell-scan`; a plugin install namespaces the command as `/prose-tell-scan:tell-scan`.

## Updating

Update the checkout, rerun the installer for your harness, check the result, and
start a new session. Do not pull over local candidate work just to refresh an
installation. For a **remote** Codex installation, refresh the marketplace when
a newer bundle version has been published:

```bash
codex plugin marketplace upgrade agent-primitives
node install-prose-codex.mjs --remote
```

For a Claude loose-file installation, rerunning `install.sh` replaces each selected skill as
a complete directory so stale tools cannot survive an update. Back up local customizations
inside those selected directories first; keep corpora and preference stores outside them.

While developing a same-version Claude plugin locally, `plugin update` can say
“already at the latest version” while retaining old files. Re-run `claude plugin
install prose-author@agent-primitives --scope user` to refresh that local bundle,
then start a new session. The candidate's installed-byte checks caught this case;
a version label alone is not proof that a local edit reached the installed copy.
If that install still retains stale files, uninstall and reinstall only
`prose-author@agent-primitives` through Claude's plugin commands, then verify the
installed bytes. Keep user corpora, preferences and numerical history outside
plugin caches and loose skill directories.

## First use

### Share writing memory across installations

Ask `prose-style-tune`: “Set up one shared personal writing identity for my
installed writing tools.” The agent registers your chosen corpus, current
profile, preference store and numerical-history location outside every plugin
installation, then explicitly selects the default. Existing files need not move.

The registry defaults to `~/.config/prose-author/identities`; preferences and
history retain their existing defaults under `~/.config/prose-author/` unless
you choose different paths. Compatible Claude, Codex, Devin and Pi installations
can resolve the same registry. A new session picks up its current selection;
an in-progress run keeps its frozen inputs. Installation alone does not create
an identity or enable collection. See [shared identities](skills/prose-draft/references/identities.md).

Codex and Claude Code extensions inside Devin use their respective native
installations above. Cascade/Devin Local need their own discoverable skill copies
and an explicitly disclosed supported CLI backend for model calls. Pi storage
compatibility does not imply a native Pi generation adapter. Update every active
runtime copy to 0.6.0; older caches do not gain automatic identity lookup.

### Samples and numerical history

Numerical history is off after installation. Ask `prose-style-tune` to enable it
for a chosen identity and project, then select outside writing to ingest.
Rhetorical analysis requires a second explicit opt-in and additional model calls.
Ask for a baseline, changes over time, a pinned reference, export, or deletion.
The history store keeps numbers, not a copy of the source text. Existing writing
run directories and external exports have separate retention. See
[history operations and privacy](skills/prose-draft/references/history.md).

You can begin with explicit preferences and no corpus: “Draft a short reply; never
use em dashes in replies.” Clear persistent instructions save with scope, version
and undo; an ordinary edit stays local. Inferred preferences need approval.

For learned guidance, supply attributable human samples and identify the form
and register. Five independent pieces and 1,000 author-written words per selected
register/form is the default supported-profile floor. Short pieces count. Less
evidence permits explicitly limited assistance, not a complete learned-voice claim.

The profile renderer reads the authorized samples. Generation receives your task,
profile, active preferences and up to three selected whole human examples by
default; request profile-only mode to omit examples. Example facts are not facts
about you. Rewrites and continuation receive the existing passage for coherence;
that text is not automatically added to your corpus.

Missing CLI capabilities or review dependencies produce an explicit ungated result.
The coding agent's host permissions must also allow its authenticated CLI to
initialize local state and make model requests. A restricted parent sandbox can
block this even with network access enabled. Ask the host for permission through
its normal approval flow; the writing tool does not silently disable a sandbox
or switch authentication. A blocked run is ungated, not a checked draft.
Versioned plugin installs consult the enabled companion registry, rather than
choosing an arbitrary old cache. For unusual layouts, the agent can supply verified
dependency paths using the [runtime contract](RUNTIME.md). Pi has a documented
adapter interface there, but no implemented adapter in this candidate.

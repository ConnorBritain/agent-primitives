#!/usr/bin/env bash
# Install agent-primitives into Claude Code.
#
#   ./install.sh                       everything → ~/.claude/
#   ./install.sh --project             everything → ./.claude/
#   ./install.sh verification-critic   just that one
#   ./install.sh <skill-name>          a skill, with its bundled tools
#   ./install.sh --list                show what's available
#
# Three kinds of thing get installed, to three destinations:
#
#   agents/<name>.md        → <dest>/agents/<name>.md
#   skills/<name>/          → <dest>/skills/<name>/        (whole directory)
#   commands/<name>.md      → <dest>/commands/<name>.md
#
# A command copied loose is invoked as /<name>; installed as part of a plugin it
# is namespaced /<plugin>:<name>. Commands here are written to delegate to their
# skill rather than to invoke bundled scripts through ${CLAUDE_PLUGIN_ROOT},
# which is what lets them survive a loose install — that variable only resolves
# under a plugin. A command that shells out to a plugin path directly would need
# the plugin install:
#
#   /plugin marketplace add ConnorBritain/agent-primitives
#   /plugin install <bundle>@agent-primitives
#
# Skills carry their own tooling by relative path, so they work either way.
#
# Installed is not the same as wired: some primitives are dispatcher-triggered,
# others need a CLAUDE.md rule. See docs/wiring.md.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.claude"
SCOPE="user"
WANTED=()

list_all() {
  shopt -s nullglob
  echo "Agents:"
  for f in "$REPO"/bundles/*/agents/*.md; do
    b="$(basename "$(dirname "$(dirname "$f")")")"
    printf '  %-26s (%s)\n' "$(basename "$f" .md)" "$b"
  done
  echo
  echo "Skills:"
  for d in "$REPO"/bundles/*/skills/*/; do
    b="$(basename "$(dirname "$(dirname "$d")")")"
    printf '  %-26s (%s)\n' "$(basename "$d")" "$b"
  done
  local cmds=("$REPO"/bundles/*/commands/*.md)
  if [ ${#cmds[@]} -gt 0 ]; then
    echo
    echo "Commands:"
    for f in "${cmds[@]}"; do
      printf '  /%-25s (%s)\n' "$(basename "$f" .md)" \
        "$(basename "$(dirname "$(dirname "$f")")")"
    done
  fi
  shopt -u nullglob
}

for arg in "$@"; do
  case "$arg" in
    --project|-p) DEST="$PWD/.claude"; SCOPE="project" ;;
    --list|-l) list_all; exit 0 ;;
    --help|-h) sed -n '2,27p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit 0 ;;
    -*) echo "unknown option: $arg" >&2; exit 1 ;;
    *) WANTED+=("$arg") ;;
  esac
done

shopt -s nullglob
ALL_AGENTS=("$REPO"/bundles/*/agents/*.md)
ALL_SKILLS=("$REPO"/bundles/*/skills/*/)
ALL_COMMANDS=("$REPO"/bundles/*/commands/*.md)
shopt -u nullglob

if [ ${#ALL_AGENTS[@]} -eq 0 ] && [ ${#ALL_SKILLS[@]} -eq 0 ]; then
  echo "Nothing found under $REPO/bundles/*/{agents,skills}/" >&2
  exit 1
fi

SEL_AGENTS=()
SEL_SKILLS=()
SEL_COMMANDS=()

if [ ${#WANTED[@]} -eq 0 ]; then
  SEL_AGENTS=("${ALL_AGENTS[@]}")
  SEL_SKILLS=("${ALL_SKILLS[@]}")
  SEL_COMMANDS=("${ALL_COMMANDS[@]}")
else
  # Resolve each requested name against agents then skills, failing loudly on a
  # typo rather than silently installing nothing.
  for name in "${WANTED[@]}"; do
    match=""
    for f in "${ALL_AGENTS[@]}"; do
      [ "$(basename "$f" .md)" = "$name" ] && match="$f" && SEL_AGENTS+=("$f") && break
    done
    [ -n "$match" ] && continue
    for d in "${ALL_SKILLS[@]}"; do
      if [ "$(basename "$d")" = "$name" ]; then
        match="$d"; SEL_SKILLS+=("$d")
        # A named skill brings its bundle's commands with it — a skill whose
        # documented entry point is missing is a worse outcome than an extra file.
        bundle_dir="$(dirname "$(dirname "$d")")"
        shopt -s nullglob
        for c in "$bundle_dir"/commands/*.md; do SEL_COMMANDS+=("$c"); done
        shopt -u nullglob
        break
      fi
    done
    if [ -z "$match" ]; then
      echo "Nothing named '$name'. Try --list." >&2
      exit 1
    fi
  done
fi

count=0

if [ ${#SEL_AGENTS[@]} -gt 0 ]; then
  mkdir -p "$DEST/agents"
  for f in "${SEL_AGENTS[@]}"; do
    cp "$f" "$DEST/agents/"
    echo "  agent  $(basename "$f" .md)"
    count=$((count + 1))
  done
fi

for d in "${SEL_SKILLS[@]:-}"; do
  [ -n "$d" ] || continue
  name="$(basename "$d")"
  mkdir -p "$DEST/skills"
  # Replace wholesale rather than merging: a stale tool left behind from an
  # older version is worse than a clean reinstall, because it still runs.
  rm -rf "${DEST:?}/skills/$name"
  cp -R "$d" "$DEST/skills/$name"
  files=$(find "$DEST/skills/$name" -type f | wc -l | tr -d ' ')
  echo "  skill  $name  ($files files, tooling included)"
  count=$((count + 1))
done

commands_installed=0
for f in "${SEL_COMMANDS[@]:-}"; do
  [ -n "$f" ] || continue
  mkdir -p "$DEST/commands"
  cp "$f" "$DEST/commands/"
  echo "  cmd    /$(basename "$f" .md)"
  count=$((count + 1))
  commands_installed=$((commands_installed + 1))
done

echo
echo "$count item(s) → $DEST  ($SCOPE scope)"
echo
echo "Installed is not the same as wired. Some primitives are picked up"
echo "automatically from their description; others need a rule in your CLAUDE.md —"
echo "  $REPO/docs/wiring.md"
echo "Per-bundle snippets live in $REPO/bundles/<bundle>/wiring/"

# Counted during the copy loop rather than measured from the array here: bash 3.2
# ships on macOS, and `${#arr[@]:-0}` is a syntax error there, not a default.
if [ "$commands_installed" -gt 0 ]; then
  echo
  echo "Slash commands installed unnamespaced (/<name>). Under a plugin install"
  echo "they would be /<plugin>:<name> instead, which avoids collisions."
fi

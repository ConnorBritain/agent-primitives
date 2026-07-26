#!/usr/bin/env bash
# Install agent-primitives agents into Claude Code.
#
#   ./install.sh                       every agent → ~/.claude/agents/
#   ./install.sh --project             every agent → ./.claude/agents/
#   ./install.sh verification-critic   just that one
#   ./install.sh --list                show what's available
#
# Installed is not the same as wired: some primitives are dispatcher-triggered,
# others need a CLAUDE.md rule. See docs/wiring.md.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.claude/agents"
SCOPE="user"
WANTED=()

for arg in "$@"; do
  case "$arg" in
    --project|-p) DEST="$PWD/.claude/agents"; SCOPE="project" ;;
    --list|-l)
      echo "Available agents:"
      for f in "$REPO"/bundles/*/agents/*.md; do
        [ -e "$f" ] || continue
        b="$(basename "$(dirname "$(dirname "$f")")")"
        printf '  %-24s (%s)\n' "$(basename "$f" .md)" "$b"
      done
      exit 0 ;;
    --help|-h) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit 0 ;;
    -*) echo "unknown option: $arg" >&2; exit 1 ;;
    *) WANTED+=("$arg") ;;
  esac
done

shopt -s nullglob
ALL=("$REPO"/bundles/*/agents/*.md)
shopt -u nullglob

if [ ${#ALL[@]} -eq 0 ]; then
  echo "No agents found under $REPO/bundles/*/agents/" >&2
  exit 1
fi

# Resolve the requested names to files, failing loudly on a typo rather than
# silently installing nothing.
SELECTED=()
if [ ${#WANTED[@]} -eq 0 ]; then
  SELECTED=("${ALL[@]}")
else
  for name in "${WANTED[@]}"; do
    match=""
    for f in "${ALL[@]}"; do
      [ "$(basename "$f" .md)" = "$name" ] && match="$f" && break
    done
    if [ -z "$match" ]; then
      echo "No agent named '$name'. Try --list." >&2
      exit 1
    fi
    SELECTED+=("$match")
  done
fi

mkdir -p "$DEST"
for f in "${SELECTED[@]}"; do
  cp "$f" "$DEST/"
  echo "  installed $(basename "$f" .md)"
done

echo
echo "${#SELECTED[@]} agent(s) → $DEST  ($SCOPE scope)"
echo
echo "Installed is not the same as wired. Some primitives are picked up automatically;"
echo "others need a rule in your CLAUDE.md before anything invokes them —"
echo "  $REPO/docs/wiring.md"
echo "Per-bundle snippets live in $REPO/bundles/<bundle>/wiring/"

#!/usr/bin/env bash
# PostToolUse hook for Bash — tracks which worktree/checkout "owns" the local
# Supabase stack so that worktree cleanup doesn't tear it down out from under
# someone else.
#
# Supabase Local has one shared Docker stack per project_id (see
# supabase/config.toml). Every worktree's `supabase start` attaches to the same
# containers, and `supabase stop` from anywhere kills them. We work around that
# by writing a marker file at the main repo root containing the absolute path
# of whoever last started the stack:
#
#   <main-repo-root>/.supabase-owner
#
# `supabase start` (or `supabase db reset`, which restarts) → claim.
# `supabase stop`                                          → release.
#
# Works the same way from the main checkout (where it doubles as branch-level
# ownership — switching branches keeps the marker because it's keyed by the
# checkout's working tree, not the branch).

set -uo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
CWD=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('cwd',''))" 2>/dev/null || echo "")

if [ -z "$COMMAND" ]; then
  exit 0
fi

case "$COMMAND" in
  *"supabase start"*|*"supabase db reset"*) ACTION="claim" ;;
  *"supabase stop"*)                        ACTION="release" ;;
  *)                                        exit 0 ;;
esac

if [ -z "$CWD" ]; then
  CWD="$PWD"
fi

# Locate the main repo root. `--git-common-dir` returns the shared .git dir
# (same for all worktrees of a repo), and its parent is the main checkout.
COMMON_DIR=$(cd "$CWD" 2>/dev/null && git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
if [ -z "$COMMON_DIR" ] || [ ! -d "$COMMON_DIR" ]; then
  exit 0
fi
MAIN_ROOT=$(dirname "$COMMON_DIR")
MARKER="$MAIN_ROOT/.supabase-owner"

# The owner is the worktree/checkout root the command was issued from.
OWNER_ROOT=$(cd "$CWD" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo "$CWD")

if [ "$ACTION" = "claim" ]; then
  echo "$OWNER_ROOT" > "$MARKER"
  echo "[supabase-owner] claimed by $OWNER_ROOT" >&2
else
  rm -f "$MARKER"
  echo "[supabase-owner] released" >&2
fi

exit 0

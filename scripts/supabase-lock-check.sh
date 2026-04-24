#!/usr/bin/env bash
# Detect whether local Supabase is running and which worktree "owns" it.
#
# Exit codes:
#   0  — not running, or running and owned by the current worktree (safe to use)
#   2  — running but owned by a DIFFERENT worktree (conflict; caller must stop)
#
# Prints a human-readable status line on stdout.

set -euo pipefail

LOCK_FILE="/tmp/arabic-voice-agent-supabase.lock"
CURRENT_WT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

is_running() {
  docker ps --filter "label=com.supabase.cli.project=arabic-voice-agent" \
    --format '{{.Names}}' 2>/dev/null | grep -q .
}

if ! is_running; then
  [[ -f "$LOCK_FILE" ]] && rm -f "$LOCK_FILE"
  echo "supabase: not running"
  exit 0
fi

if [[ -f "$LOCK_FILE" ]]; then
  OWNER="$(cat "$LOCK_FILE")"
else
  OWNER="<unknown>"
fi

if [[ "$OWNER" == "$CURRENT_WT" ]]; then
  echo "supabase: running (owned by this worktree)"
  exit 0
fi

echo "supabase: running, owned by another worktree: $OWNER"
echo "Stop that worktree's work (scripts/use-prod-supabase.sh or supabase stop) before starting local Supabase here."
exit 2

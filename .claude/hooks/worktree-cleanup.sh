#!/usr/bin/env bash
# PreToolUse hook for ExitWorktree — shuts down preview services tied to the
# worktree before it is removed. Only runs when action is "remove".
#
# Stops:
#   - Local Supabase stack (`supabase stop` in the worktree dir)
#   - Any dev-server processes whose cwd is inside the worktree (uvicorn, vite,
#     storybook, node, npm, debugpy, etc.)

set -uo pipefail

INPUT=$(cat)

ACTION=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('action',''))" 2>/dev/null || echo "")
WORKTREE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('cwd',''))" 2>/dev/null || echo "")

if [ -z "$WORKTREE_PATH" ]; then
  WORKTREE_PATH="$PWD"
fi

# Canonicalize so it matches what supabase-owner.sh wrote (`git rev-parse
# --show-toplevel` returns a real path).
CANONICAL=$(cd "$WORKTREE_PATH" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || true)
if [ -n "$CANONICAL" ]; then
  WORKTREE_PATH="$CANONICAL"
fi

# Only clean up on "remove" — "keep" leaves the worktree intact, so leave its
# services running too.
if [ "$ACTION" != "remove" ]; then
  exit 0
fi

# Only act on actual worktree directories.
case "$WORKTREE_PATH" in
  */.claude/worktrees/*) ;;
  *)
    echo "[worktree-cleanup] cwd $WORKTREE_PATH is not a worktree, skipping" >&2
    exit 0
    ;;
esac

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "[worktree-cleanup] Shutting down services for $WORKTREE_PATH..." >&2

# 1. Stop Supabase — but ONLY if this worktree owns it.
#
# The Supabase Local stack is shared across every worktree and the main
# checkout (one Docker project per project_id), so a blind `supabase stop`
# would kill someone else's running stack. The supabase-owner.sh hook writes
# a marker at <main-repo-root>/.supabase-owner containing the absolute path
# of whoever ran `supabase start`. We only stop if that path matches us.
if [ -f "$WORKTREE_PATH/supabase/config.toml" ] && command -v supabase >/dev/null 2>&1; then
  COMMON_DIR=$(cd "$WORKTREE_PATH" 2>/dev/null && git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  MAIN_ROOT=$(dirname "${COMMON_DIR:-/}")
  MARKER="$MAIN_ROOT/.supabase-owner"

  if [ ! -f "$MARKER" ]; then
    echo "[worktree-cleanup]   no Supabase owner marker — leaving stack alone" >&2
  else
    OWNER=$(tr -d '[:space:]' < "$MARKER")
    if [ "$OWNER" != "$WORKTREE_PATH" ]; then
      echo "[worktree-cleanup]   Supabase owned by $OWNER — leaving stack alone" >&2
    else
      echo "[worktree-cleanup]   supabase stop (this worktree owns it)..." >&2
      (cd "$WORKTREE_PATH" && supabase stop --no-backup) >&2 2>&1 \
        && echo "[worktree-cleanup]   supabase stopped" >&2 \
        || echo "[worktree-cleanup]   warning: supabase stop failed" >&2
      rm -f "$MARKER"
    fi
  fi
fi

# 2. Kill any processes whose working directory is inside the worktree. This
# catches uvicorn/vite/storybook/node/etc. started by preview tools or VS Code
# tasks. Use lsof to find PIDs whose cwd is under the worktree path.
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -d cwd -F pn 2>/dev/null \
    | awk -v wt="$WORKTREE_PATH" '
        /^p/ { pid=substr($0,2); next }
        /^n/ {
          path=substr($0,2)
          if (index(path, wt) == 1) print pid
        }' \
    | sort -u)

  if [ -n "$PIDS" ]; then
    echo "[worktree-cleanup]   killing dev-server PIDs: $(echo $PIDS | tr '\n' ' ')" >&2
    # SIGTERM first, give them a moment, then SIGKILL stragglers.
    echo "$PIDS" | xargs -n1 kill -TERM 2>/dev/null || true
    sleep 2
    REMAINING=$(echo "$PIDS" | xargs -n1 -I{} sh -c 'kill -0 {} 2>/dev/null && echo {}' || true)
    if [ -n "$REMAINING" ]; then
      echo "$REMAINING" | xargs -n1 kill -KILL 2>/dev/null || true
    fi
  else
    echo "[worktree-cleanup]   no dev-server processes found" >&2
  fi
fi

echo "[worktree-cleanup] Done." >&2
exit 0

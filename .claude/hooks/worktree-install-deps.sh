#!/usr/bin/env bash
# PostToolUse hook for EnterWorktree — installs dependencies after entering a worktree.
#
# Runs npm ci for web-app and admin-app, and uv sync for web-api.
# Skips if already installed (node_modules or .venv exist).

set -euo pipefail

INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('path',''))")

if [ -z "$WORKTREE_PATH" ]; then
  exit 0
fi

export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node/" 2>/dev/null | tail -1)/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Activate correct Node version via nvm
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  if [ -f "$WORKTREE_PATH/.nvmrc" ]; then
    (cd "$WORKTREE_PATH" && nvm use) >&2 2>&1 || true
  fi
fi

echo "[worktree-deps] Installing dependencies in $WORKTREE_PATH..." >&2

for app in web-app admin-app; do
  if [ -d "$WORKTREE_PATH/$app" ] && [ ! -d "$WORKTREE_PATH/$app/node_modules" ]; then
    echo "[worktree-deps]   npm ci in $app..." >&2
    (cd "$WORKTREE_PATH/$app" && npm ci --no-audit --no-fund) >&2 2>&1 \
      && echo "[worktree-deps]   $app done" >&2 \
      || echo "[worktree-deps]   warning: $app npm ci failed" >&2
  fi
done

if [ -d "$WORKTREE_PATH/web-api" ] && [ ! -d "$WORKTREE_PATH/web-api/.venv" ]; then
  echo "[worktree-deps]   uv sync in web-api..." >&2
  (cd "$WORKTREE_PATH/web-api" && uv sync) >&2 2>&1 \
    && echo "[worktree-deps]   web-api done" >&2 \
    || echo "[worktree-deps]   warning: web-api uv sync failed" >&2
fi

echo "[worktree-deps] Done." >&2

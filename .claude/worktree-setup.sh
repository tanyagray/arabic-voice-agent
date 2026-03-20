#!/usr/bin/env bash
# PostToolUse hook for EnterWorktree — sets up a new worktree after creation.
#
# Receives JSON on stdin from Claude Code. Extracts the worktree path,
# then: pulls latest main, copies .env files, patches ports, and installs deps.
#
# Port allocation (deterministic, based on worktree name hash, slot 1-20):
#   web-api  : 8000 + slot*10   (8010–8200)  — also used for WEBHOOK_BASE_URL
#   web-app  : 5200 + slot       (5201–5220)  — Vite dev server
#   admin-app: 5220 + slot       (5221–5240)  — Vite dev server
#   debugpy  : 5670 + slot       (5671–5690)  — Python remote debugger

set -euo pipefail

# Ensure common tool paths are available (uv, npm, etc.)
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node/" 2>/dev/null | tail -1)/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# ---------------------------------------------------------------------------
# Parse hook JSON to get the worktree path
# ---------------------------------------------------------------------------

INPUT=$(cat)

WORKTREE_PATH=$(echo "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    cwd = d.get('cwd', '')
    print(cwd if '/.claude/worktrees/' in cwd else '')
except Exception:
    print('')
")

if [ -z "$WORKTREE_PATH" ] || [ ! -d "$WORKTREE_PATH" ]; then
    exit 0
fi

MAIN_ROOT=$(git -C "$WORKTREE_PATH" worktree list --porcelain | head -1 | sed 's/^worktree //')
WORKTREE_NAME=$(basename "$WORKTREE_PATH")

# Compute deterministic slot 1-20 from worktree name
SLOT=$(python3 -c "
import hashlib, sys
name = sys.argv[1]
h = int(hashlib.md5(name.encode()).hexdigest(), 16)
print(h % 20 + 1)
" "$WORKTREE_NAME")

API_PORT=$((8000 + SLOT * 10))
WEB_PORT=$((5200 + SLOT))
ADMIN_PORT=$((5220 + SLOT))
DEBUGPY_PORT=$((5670 + SLOT))

echo "[worktree-setup] Setting up worktree: $WORKTREE_NAME (slot $SLOT)"
echo "[worktree-setup]   web-api  → http://localhost:$API_PORT"
echo "[worktree-setup]   web-app  → http://localhost:$WEB_PORT"
echo "[worktree-setup]   admin    → http://localhost:$ADMIN_PORT"

# ---------------------------------------------------------------------------
# Pull latest from remote main branch
# ---------------------------------------------------------------------------

echo "[worktree-setup] Fetching latest from origin..."
DEFAULT_BRANCH=$(git -C "$MAIN_ROOT" remote show origin 2>/dev/null \
    | grep 'HEAD branch' | awk '{print $NF}')
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

if git -C "$WORKTREE_PATH" fetch origin 2>&1; then
    git -C "$WORKTREE_PATH" rebase "origin/$DEFAULT_BRANCH" 2>&1 \
        || echo "[worktree-setup]   warning: rebase against origin/$DEFAULT_BRANCH had conflicts — resolve manually"
else
    echo "[worktree-setup]   warning: git fetch failed (offline?) — skipping pull"
fi

# ---------------------------------------------------------------------------
# Copy .env files from the main worktree
# ---------------------------------------------------------------------------

copy_env() {
    local relative_path="$1"
    local src="$MAIN_ROOT/$relative_path"
    local dest="$WORKTREE_PATH/$relative_path"

    mkdir -p "$(dirname "$dest")"

    if [ -f "$src" ]; then
        cp "$src" "$dest"
        echo "[worktree-setup]   copied $relative_path"
    elif [ -f "${src}.example" ]; then
        cp "${src}.example" "$dest"
        echo "[worktree-setup]   copied $relative_path (from .example)"
    else
        echo "[worktree-setup]   skipped $relative_path (not found)"
    fi
}

echo "[worktree-setup] Copying .env files..."
copy_env ".env"
copy_env "web-api/.env"
copy_env "web-app/.env"
copy_env "admin-app/.env"

# ---------------------------------------------------------------------------
# Patch .claude/launch.json with worktree-specific ports
# ---------------------------------------------------------------------------

LAUNCH_JSON="$WORKTREE_PATH/.claude/launch.json"
if [ -f "$LAUNCH_JSON" ]; then
    echo "[worktree-setup] Patching .claude/launch.json..."
    python3 - "$LAUNCH_JSON" "$API_PORT" "$WEB_PORT" "$ADMIN_PORT" <<'PYEOF'
import json, sys

path, api_port, web_port, admin_port = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])

port_map = {'web-app': web_port, 'admin-app': admin_port, 'web-api': api_port}

with open(path) as f:
    config = json.load(f)

for conf in config.get('configurations', []):
    name = conf.get('name')
    if name not in port_map:
        continue
    conf['port'] = port_map[name]
    args = conf.get('runtimeArgs', [])
    for i, arg in enumerate(args):
        if arg == '--port' and i + 1 < len(args):
            args[i + 1] = str(port_map[name])

with open(path, 'w') as f:
    json.dump(config, f, indent=2)
    f.write('\n')
PYEOF
fi

# ---------------------------------------------------------------------------
# Patch ports in the copied .env files
# ---------------------------------------------------------------------------

patch_env() {
    local file="$1"
    [ -f "$file" ] || return 0
    shift
    for expr in "$@"; do
        perl -i -pe "$expr" "$file"
    done
}

echo "[worktree-setup] Patching ports..."

# web-api: PORT and WEBHOOK_BASE_URL
patch_env "$WORKTREE_PATH/web-api/.env" \
    "s|^PORT=.*|PORT=$API_PORT|" \
    "s|WEBHOOK_BASE_URL=http://localhost:[0-9]*|WEBHOOK_BASE_URL=http://localhost:$API_PORT|"

# Add/update DEBUGPY_PORT in web-api/.env
if [ -f "$WORKTREE_PATH/web-api/.env" ]; then
    if grep -q "^DEBUGPY_PORT=" "$WORKTREE_PATH/web-api/.env"; then
        perl -i -pe "s|^DEBUGPY_PORT=.*|DEBUGPY_PORT=$DEBUGPY_PORT|" "$WORKTREE_PATH/web-api/.env"
    else
        echo "DEBUGPY_PORT=$DEBUGPY_PORT" >> "$WORKTREE_PATH/web-api/.env"
    fi
fi

# web-app: VITE_API_URL and PORT
patch_env "$WORKTREE_PATH/web-app/.env" \
    "s|VITE_API_URL=http://localhost:[0-9]*|VITE_API_URL=http://localhost:$API_PORT|" \
    "s|^PORT=.*|PORT=$WEB_PORT|"

# admin-app: VITE_API_URL and PORT
patch_env "$WORKTREE_PATH/admin-app/.env" \
    "s|VITE_API_URL=http://localhost:[0-9]*|VITE_API_URL=http://localhost:$API_PORT|" \
    "s|^PORT=.*|PORT=$ADMIN_PORT|"

# ---------------------------------------------------------------------------
# Install dependencies (parallel)
# ---------------------------------------------------------------------------

echo "[worktree-setup] Installing dependencies..."

(
    cd "$WORKTREE_PATH/web-api"
    uv sync --quiet && echo "[worktree-setup]   web-api deps installed"
) &
PID_API=$!

(
    cd "$WORKTREE_PATH/web-app"
    npm install --silent && echo "[worktree-setup]   web-app deps installed"
) &
PID_WEB=$!

(
    cd "$WORKTREE_PATH/admin-app"
    npm install --silent && echo "[worktree-setup]   admin-app deps installed"
) &
PID_ADMIN=$!

wait $PID_API || echo "[worktree-setup]   web-api: dependency install failed (check manually)"
wait $PID_WEB || echo "[worktree-setup]   web-app: dependency install failed (check manually)"
wait $PID_ADMIN || echo "[worktree-setup]   admin-app: dependency install failed (check manually)"

echo ""
echo "[worktree-setup] Worktree $WORKTREE_NAME ready."
echo "[worktree-setup]   API:      http://localhost:$API_PORT"
echo "[worktree-setup]   web-app:  http://localhost:$WEB_PORT"
echo "[worktree-setup]   admin:    http://localhost:$ADMIN_PORT"

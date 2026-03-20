#!/usr/bin/env bash
# WorktreeCreate hook — fully replaces Claude Code's default worktree creation.
#
# Receives JSON on stdin with { worktreeName: string }.
# Creates the worktree, copies .env files, patches ports, installs deps.
# Prints ONLY the absolute worktree path to stdout. Everything else goes to stderr.
#
# Port allocation (deterministic, based on worktree name hash, slot 1-20):
#   web-api  : 8000 + slot*10   (8010-8200)  — also used for WEBHOOK_BASE_URL
#   web-app  : 5200 + slot       (5201-5220)  — Vite dev server
#   admin-app: 5220 + slot       (5221-5240)  — Vite dev server
#   debugpy  : 5670 + slot       (5671-5690)  — Python remote debugger

set -euo pipefail

# Read stdin ONCE — only one chance to read it
INPUT=$(cat)

# Ensure common tool paths are available (uv, npm, etc.)
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node/" 2>/dev/null | tail -1)/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# ---------------------------------------------------------------------------
# Parse hook JSON
# ---------------------------------------------------------------------------

WORKTREE_NAME=$(echo "$INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('name', '') or d.get('worktreeName', ''))
")

if [ -z "$WORKTREE_NAME" ]; then
    echo "ERROR: worktreeName not found in input" >&2
    exit 1
fi

REPO_PATH=$(git rev-parse --show-toplevel)
WORKTREE_PATH="${REPO_PATH}/.claude/worktrees/${WORKTREE_NAME}"
BRANCH="worktree-${WORKTREE_NAME}"
LOG="/tmp/worktree-setup-${WORKTREE_NAME}.log"

echo "[worktree-setup] Setting up worktree: $WORKTREE_NAME" >&2

# ---------------------------------------------------------------------------
# Create the worktree — ALL git output to stderr/dev/null
# ---------------------------------------------------------------------------

mkdir -p "$(dirname "$WORKTREE_PATH")"

# Clean up stale worktree/branch if they exist
if [ -d "$WORKTREE_PATH" ]; then
    git worktree remove --force "$WORKTREE_PATH" >/dev/null 2>&1 || true
fi
if git branch --list "$BRANCH" | grep -q .; then
    git branch -D "$BRANCH" >/dev/null 2>&1 || true
fi

# Fetch latest before creating worktree so it starts from up-to-date main
echo "[worktree-setup] Fetching latest from origin..." >&2
if git -C "$REPO_PATH" fetch origin >/dev/null 2>&1; then
    BASE_REF="origin/main"
    echo "[worktree-setup]   creating worktree from origin/main" >&2
else
    BASE_REF="HEAD"
    echo "[worktree-setup]   warning: fetch failed (offline?) — using local HEAD" >&2
fi

git worktree add -b "$BRANCH" "$WORKTREE_PATH" "$BASE_REF" >/dev/null 2>&1

# ---------------------------------------------------------------------------
# Compute deterministic port slot 1-20
# ---------------------------------------------------------------------------

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

echo "[worktree-setup]   web-api  -> http://localhost:$API_PORT" >&2
echo "[worktree-setup]   web-app  -> http://localhost:$WEB_PORT" >&2
echo "[worktree-setup]   admin    -> http://localhost:$ADMIN_PORT" >&2

# ---------------------------------------------------------------------------
# Copy .env files from the main worktree
# ---------------------------------------------------------------------------

copy_env() {
    local relative_path="$1"
    local src="$REPO_PATH/$relative_path"
    local dest="$WORKTREE_PATH/$relative_path"

    mkdir -p "$(dirname "$dest")"

    if [ -f "$src" ]; then
        cp "$src" "$dest"
        echo "[worktree-setup]   copied $relative_path" >&2
    elif [ -f "${src}.example" ]; then
        cp "${src}.example" "$dest"
        echo "[worktree-setup]   copied $relative_path (from .example)" >&2
    else
        echo "[worktree-setup]   skipped $relative_path (not found)" >&2
    fi
}

echo "[worktree-setup] Copying .env files..." >&2
copy_env ".env"
copy_env "web-api/.env"
copy_env "web-app/.env"
copy_env "admin-app/.env"

# ---------------------------------------------------------------------------
# Patch .claude/launch.json with worktree-specific ports
# ---------------------------------------------------------------------------

LAUNCH_JSON="$WORKTREE_PATH/.claude/launch.json"
if [ -f "$LAUNCH_JSON" ]; then
    echo "[worktree-setup] Patching .claude/launch.json..." >&2
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

echo "[worktree-setup] Patching ports..." >&2

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
# Copy dependencies from main repo (much faster than installing)
# ---------------------------------------------------------------------------

echo "[worktree-setup] Copying dependencies..." >&2

if [ -d "$REPO_PATH/web-api/.venv" ]; then
    cp -R "$REPO_PATH/web-api/.venv" "$WORKTREE_PATH/web-api/.venv"
    echo "[worktree-setup]   web-api .venv copied" >&2
fi

if [ -d "$REPO_PATH/web-app/node_modules" ]; then
    cp -R "$REPO_PATH/web-app/node_modules" "$WORKTREE_PATH/web-app/node_modules"
    echo "[worktree-setup]   web-app node_modules copied" >&2
fi

if [ -d "$REPO_PATH/admin-app/node_modules" ]; then
    cp -R "$REPO_PATH/admin-app/node_modules" "$WORKTREE_PATH/admin-app/node_modules"
    echo "[worktree-setup]   admin-app node_modules copied" >&2
fi

echo "[worktree-setup] Worktree $WORKTREE_NAME ready." >&2

# THIS IS THE ONLY LINE ON STDOUT
echo "$WORKTREE_PATH"

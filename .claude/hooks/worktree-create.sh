#!/usr/bin/env bash
# WorktreeCreate hook — replaces Claude's default worktree creation.
#
# Same as Claude's default (worktree at .claude/worktrees/<name>, branch
# worktree-<name>, based on origin/HEAD) but fetches origin first to ensure
# worktrees are always up to date with the remote.
#
# After creation: copies .env files, patches ports, copies dependencies.
#
# Receives JSON on stdin with { worktree_path, branch_name, base_commit }.
# Prints ONLY the absolute worktree path to stdout.
#
# Port allocation (deterministic, based on worktree dir name hash, slot 1-20):
#   web-api  : 8000 + slot*10   (8010-8200)  — also used for WEBHOOK_BASE_URL
#   web-app  : 5200 + slot       (5201-5220)  — Vite dev server
#   admin-app: 5220 + slot       (5221-5240)  — Vite dev server
#   debugpy  : 5670 + slot       (5671-5690)  — Python remote debugger

set -euo pipefail

# Read stdin ONCE
INPUT=$(cat)

# Ensure common tool paths are available (uv, npm, etc.)
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node/" 2>/dev/null | tail -1)/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# ---------------------------------------------------------------------------
# Parse hook JSON
# ---------------------------------------------------------------------------

read -r WORKTREE_PATH BRANCH BASE_COMMIT <<< "$(echo "$INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('worktree_path', ''), d.get('branch_name', ''), d.get('base_commit', ''))
")"

if [ -z "$WORKTREE_PATH" ]; then
    echo "ERROR: worktree_path not found in hook input" >&2
    exit 1
fi

if [ -z "$BRANCH" ]; then
    echo "ERROR: branch_name not found in hook input" >&2
    exit 1
fi

WORKTREE_NAME=$(basename "$WORKTREE_PATH")
REPO_PATH=$(git rev-parse --show-toplevel)
LOG="/tmp/worktree-setup-${WORKTREE_NAME}.log"

echo "[worktree-create] Creating worktree: $WORKTREE_NAME" >&2
echo "[worktree-create]   path:   $WORKTREE_PATH" >&2
echo "[worktree-create]   branch: $BRANCH" >&2

# ---------------------------------------------------------------------------
# Create the worktree — fetch first, then branch from origin/HEAD
# ---------------------------------------------------------------------------

mkdir -p "$(dirname "$WORKTREE_PATH")"

# Clean up stale worktree/branch if they exist
if [ -d "$WORKTREE_PATH" ]; then
    git worktree remove --force "$WORKTREE_PATH" >/dev/null 2>&1 || true
fi
if git branch --list "$BRANCH" | grep -q .; then
    git branch -D "$BRANCH" >/dev/null 2>&1 || true
fi

# Fetch origin to ensure we branch from the latest remote state
echo "[worktree-create] Fetching origin..." >&2
if git -C "$REPO_PATH" fetch origin >/dev/null 2>&1; then
    echo "[worktree-create]   fetch complete" >&2
else
    echo "[worktree-create]   warning: fetch failed (offline?)" >&2
fi

# Determine base ref: use base_commit if provided, otherwise origin/HEAD
if [ -n "$BASE_COMMIT" ]; then
    BASE_REF="$BASE_COMMIT"
    echo "[worktree-create]   base: $BASE_COMMIT (from hook input)" >&2
else
    BASE_REF=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "")
    if [ -z "$BASE_REF" ]; then
        BASE_REF="origin/main"
        echo "[worktree-create]   base: origin/main (origin/HEAD not set)" >&2
    else
        echo "[worktree-create]   base: $BASE_REF" >&2
    fi
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

echo "[worktree-create]   web-api  -> http://localhost:$API_PORT" >&2
echo "[worktree-create]   web-app  -> http://localhost:$WEB_PORT" >&2
echo "[worktree-create]   admin    -> http://localhost:$ADMIN_PORT" >&2

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
        echo "[worktree-create]   copied $relative_path" >&2
    elif [ -f "${src}.example" ]; then
        cp "${src}.example" "$dest"
        echo "[worktree-create]   copied $relative_path (from .example)" >&2
    else
        echo "[worktree-create]   skipped $relative_path (not found)" >&2
    fi
}

echo "[worktree-create] Copying .env files..." >&2
copy_env ".env"
copy_env "web-api/.env"
copy_env "web-app/.env"
copy_env "admin-app/.env"
copy_env "supabase/.env"
copy_env "supabase/.env.keys"
copy_env "supabase/.env.local"

# ---------------------------------------------------------------------------
# Patch .claude/launch.json with worktree-specific ports
# ---------------------------------------------------------------------------

LAUNCH_JSON="$WORKTREE_PATH/.claude/launch.json"
if [ -f "$LAUNCH_JSON" ]; then
    echo "[worktree-create] Patching .claude/launch.json..." >&2
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

echo "[worktree-create] Patching ports..." >&2

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

echo "[worktree-create] Copying dependencies..." >&2

if [ -d "$REPO_PATH/web-api/.venv" ]; then
    cp -R "$REPO_PATH/web-api/.venv" "$WORKTREE_PATH/web-api/.venv"
    echo "[worktree-create]   web-api .venv copied" >&2
fi

if [ -d "$REPO_PATH/web-app/node_modules" ]; then
    cp -R "$REPO_PATH/web-app/node_modules" "$WORKTREE_PATH/web-app/node_modules"
    echo "[worktree-create]   web-app node_modules copied" >&2
fi

if [ -d "$REPO_PATH/admin-app/node_modules" ]; then
    cp -R "$REPO_PATH/admin-app/node_modules" "$WORKTREE_PATH/admin-app/node_modules"
    echo "[worktree-create]   admin-app node_modules copied" >&2
fi

# Activate correct Node version via nvm (reads .nvmrc from the worktree)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    if [ -f "$WORKTREE_PATH/.nvmrc" ]; then
        (cd "$WORKTREE_PATH" && nvm use) >&2 2>&1 \
            && echo "[worktree-create]   nvm: using node $(node -v)" >&2 \
            || echo "[worktree-create]   warning: nvm use failed" >&2
    fi
fi

# Relink binaries — copied node_modules/.bin symlinks point to the old repo path.
# A quick `npm install` fixes them (near-instant with node_modules already present).
echo "[worktree-create] Relinking node_modules binaries..." >&2

for app in web-app admin-app; do
    if [ -d "$WORKTREE_PATH/$app/node_modules" ]; then
        (cd "$WORKTREE_PATH/$app" && npm install --prefer-offline --no-audit --no-fund) >>"$LOG" 2>&1 \
            && echo "[worktree-create]   $app binaries relinked" >&2 \
            || echo "[worktree-create]   warning: $app npm install failed (see $LOG)" >&2
    fi
done

echo "[worktree-create] Worktree $WORKTREE_NAME ready." >&2

# THIS IS THE ONLY LINE ON STDOUT — Claude Code expects the worktree path here
echo "$WORKTREE_PATH"

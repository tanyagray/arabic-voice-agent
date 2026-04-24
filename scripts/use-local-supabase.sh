#!/usr/bin/env bash
# Switch web-api/.env to local Supabase and start the local stack.
#
# Acquires a cross-worktree lock at /tmp/arabic-voice-agent-supabase.lock so
# that another worktree won't silently take over the shared Docker stack.
#
# After running: restart web-api (and any consumer) so it picks up the new
# SUPABASE_URL / keys.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCK_FILE="/tmp/arabic-voice-agent-supabase.lock"
CURRENT_WT="$REPO_ROOT"

# --- Conflict check ---
if ! "$REPO_ROOT/scripts/supabase-lock-check.sh"; then
  echo ""
  echo "Refusing to start local Supabase: another worktree owns the running stack." >&2
  exit 2
fi

# --- Start supabase if not already running ---
if ! docker ps --filter "label=com.supabase.cli.project=arabic-voice-agent" \
    --format '{{.Names}}' 2>/dev/null | grep -q .; then
  echo "Starting local Supabase ..."
  (cd "$REPO_ROOT" && supabase start)
else
  echo "Local Supabase already running."
fi

# --- Claim the lock for this worktree ---
echo "$CURRENT_WT" > "$LOCK_FILE"
echo "  ✓ claimed lock for: $CURRENT_WT"

# --- Read local creds from supabase status ---
STATUS_JSON=$(supabase -C "$REPO_ROOT" status --output json)
LOCAL_SECRET=$(echo "$STATUS_JSON" | jq -r '.SERVICE_ROLE_KEY // empty')
LOCAL_PUB=$(echo "$STATUS_JSON" | jq -r '.ANON_KEY // empty')

if [[ -z "$LOCAL_SECRET" || -z "$LOCAL_PUB" ]]; then
  echo "Failed to read local Supabase keys from 'supabase status'." >&2
  exit 1
fi

# --- Rewrite only the SUPABASE_* block in web-api/.env ---
ENV_FILE="$REPO_ROOT/web-api/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "web-api/.env is missing — run scripts/pull-secrets.sh first." >&2
  exit 1
fi

TMP=$(mktemp)
awk -v url="http://localhost:54321" -v sec="$LOCAL_SECRET" -v pub="$LOCAL_PUB" '
  /^SUPABASE_MODE=/        { print "SUPABASE_MODE=local"; next }
  /^SUPABASE_URL=/         { print "SUPABASE_URL=" url; next }
  /^SUPABASE_SECRET_KEY=/  { print "SUPABASE_SECRET_KEY=" sec; next }
  /^SUPABASE_PUBLISHABLE_KEY=/ { print "SUPABASE_PUBLISHABLE_KEY=" pub; next }
  { print }
' "$ENV_FILE" > "$TMP"
# If SUPABASE_MODE was absent, add it at the top block.
grep -q '^SUPABASE_MODE=' "$TMP" || sed -i '' '1a\
SUPABASE_MODE=local
' "$TMP" 2>/dev/null || true

mv "$TMP" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "  ✓ web-api/.env now points at local Supabase"

echo ""
echo "Done. Restart web-api so it picks up the new env:"
echo "  - In VS Code: re-run the 'run web-api' task"
echo "  - CLI: cd web-api && task dev"

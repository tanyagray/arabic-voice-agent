#!/usr/bin/env bash
# Switch web-api/.env back to PROD Supabase and release this worktree's lock.
# Does NOT stop the local Supabase Docker stack — pass --stop to also do that.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCK_FILE="/tmp/arabic-voice-agent-supabase.lock"
REGION="${AWS_REGION:-us-west-2}"
PROD_SECRET_ID="mishmish/prod/api"

STOP_STACK="false"
[[ "${1:-}" == "--stop" ]] && STOP_STACK="true"

# --- Release lock if we own it ---
if [[ -f "$LOCK_FILE" ]]; then
  OWNER="$(cat "$LOCK_FILE")"
  if [[ "$OWNER" == "$REPO_ROOT" ]]; then
    rm -f "$LOCK_FILE"
    echo "  ✓ released supabase lock"
  else
    echo "  – lock owned by another worktree ($OWNER); not touching it"
  fi
fi

# --- Optionally stop the Docker stack ---
if [[ "$STOP_STACK" == "true" ]]; then
  echo "Stopping local Supabase ..."
  (cd "$REPO_ROOT" && supabase stop) || true
fi

# --- Pull prod Supabase creds and patch web-api/.env ---
PROD_SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "$PROD_SECRET_ID" --region "$REGION" \
  --query SecretString --output text)

SUPABASE_URL=$(echo "$PROD_SECRET_JSON" | jq -r '.SUPABASE_URL // empty')
SUPABASE_SECRET_KEY=$(echo "$PROD_SECRET_JSON" | jq -r '.SUPABASE_SECRET_KEY // empty')
SUPABASE_PUBLISHABLE_KEY=$(echo "$PROD_SECRET_JSON" | jq -r '.SUPABASE_PUBLISHABLE_KEY // empty')

ENV_FILE="$REPO_ROOT/web-api/.env"
TMP=$(mktemp)
awk -v url="$SUPABASE_URL" -v sec="$SUPABASE_SECRET_KEY" -v pub="$SUPABASE_PUBLISHABLE_KEY" '
  /^SUPABASE_MODE=/        { print "SUPABASE_MODE=prod"; next }
  /^SUPABASE_URL=/         { print "SUPABASE_URL=" url; next }
  /^SUPABASE_SECRET_KEY=/  { print "SUPABASE_SECRET_KEY=" sec; next }
  /^SUPABASE_PUBLISHABLE_KEY=/ { print "SUPABASE_PUBLISHABLE_KEY=" pub; next }
  { print }
' "$ENV_FILE" > "$TMP"
mv "$TMP" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "  ✓ web-api/.env now points at PROD Supabase"

echo ""
echo "Restart web-api so it picks up the new env."

#!/usr/bin/env bash
# SessionStart hook — sources nvm so node/npm are available in the session,
# then pulls latest and installs any new deps across all packages.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use >/dev/null 2>&1  # reads .nvmrc
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "export PATH=\"$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

# Pull latest changes (non-blocking — skip if offline or no remote)
git pull --ff-only 2>/dev/null || true

# Install deps for each package
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# web-api (Python/uv)
if [ -f "$REPO_ROOT/web-api/pyproject.toml" ]; then
  (cd "$REPO_ROOT/web-api" && uv sync --quiet 2>/dev/null || true)
fi

# web-app (Node/npm)
if [ -f "$REPO_ROOT/web-app/package.json" ]; then
  (cd "$REPO_ROOT/web-app" && npm install --silent 2>/dev/null || true)
fi

# admin-app (Node/npm)
if [ -f "$REPO_ROOT/admin-app/package.json" ]; then
  (cd "$REPO_ROOT/admin-app" && npm install --silent 2>/dev/null || true)
fi

# flutter-app (Dart/Flutter)
if [ -f "$REPO_ROOT/flutter-app/pubspec.yaml" ]; then
  (cd "$REPO_ROOT/flutter-app" && flutter pub get --suppress-analytics 2>/dev/null || true)
fi

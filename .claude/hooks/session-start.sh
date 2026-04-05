#!/usr/bin/env bash
# SessionStart hook — sources nvm so node/npm are available in the session.
# Claude Desktop doesn't load shell startup files (~/.zshrc), so nvm-managed
# binaries aren't on PATH by default. This hook fixes that by sourcing nvm
# and persisting the PATH via CLAUDE_ENV_FILE.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use >/dev/null 2>&1  # reads .nvmrc
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "export PATH=\"$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

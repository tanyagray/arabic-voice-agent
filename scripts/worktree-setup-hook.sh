#!/usr/bin/env bash
# PostToolUse hook for EnterWorktree — triggers worktree setup after a new worktree is created.
# Receives JSON on stdin from Claude Code with tool_input and tool_response.

INPUT=$(cat)

# Extract the worktree path from the hook JSON
WORKTREE_PATH=$(echo "$INPUT" | python3 -c "
import json, sys, os
try:
    d = json.load(sys.stdin)
    # Try tool_response.worktree_path first
    path = (d.get('tool_response', {}) or {}).get('worktree_path', '')
    if not path:
        # Fall back: derive from worktree_name in tool_input
        name = (d.get('tool_input', {}) or {}).get('worktree_name', '')
        if name:
            cwd = d.get('cwd', '')
            repo = cwd
            while repo and not os.path.isdir(os.path.join(repo, '.claude', 'worktrees')):
                parent = os.path.dirname(repo)
                if parent == repo:
                    break
                repo = parent
            path = os.path.join(repo, '.claude', 'worktrees', name)
    print(path)
except Exception:
    print('')
")

if [ -z "$WORKTREE_PATH" ] || [ ! -d "$WORKTREE_PATH" ]; then
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/setup-worktree.sh" "$WORKTREE_PATH" 2>&1 | sed 's/^/[worktree-setup] /'

exit 0

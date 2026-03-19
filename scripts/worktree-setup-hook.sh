#!/usr/bin/env bash
# PostToolUse hook for EnterWorktree — triggers worktree setup after a new worktree is created.
# Receives JSON on stdin from Claude Code with tool_input and tool_response.

INPUT=$(cat)

# Extract the worktree path from the hook JSON.
# After EnterWorktree completes, cwd is switched to the new worktree,
# which lives under .claude/worktrees/<name>/.
WORKTREE_PATH=$(echo "$INPUT" | python3 -c "
import json, sys, os
try:
    d = json.load(sys.stdin)
    cwd = d.get('cwd', '')
    # Verify cwd is inside a .claude/worktrees/ directory
    if '/.claude/worktrees/' in cwd:
        print(cwd)
    else:
        print('')
except Exception:
    print('')
")

if [ -z "$WORKTREE_PATH" ] || [ ! -d "$WORKTREE_PATH" ]; then
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/setup-worktree.sh" "$WORKTREE_PATH" 2>&1 | sed 's/^/[worktree-setup] /'

exit 0

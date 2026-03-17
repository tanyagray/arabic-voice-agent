#!/usr/bin/env bash
# PostToolUse hook for Bash — triggers worktree setup after "git worktree add"
# Receives JSON on stdin from Claude Code.

INPUT=$(cat)

# Cheap pre-check before invoking python3
if ! echo "$INPUT" | grep -q 'git worktree add'; then
    exit 0
fi

COMMAND=$(echo "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
")

if ! echo "$COMMAND" | grep -qE 'git worktree add'; then
    exit 0
fi

# Extract the worktree path from the command using proper shell tokenisation.
# git worktree add [-f] [--detach] [--lock] [-b <branch>] [-B <branch>]
#                  [--reason <string>] [--orphan] <path> [<commit-ish>]
# Flags that consume a following argument:
WORKTREE_PATH=$(echo "$COMMAND" | python3 -c "
import sys, shlex

try:
    parts = shlex.split(sys.stdin.read().strip())
except ValueError:
    sys.exit(0)

# Flags that consume the next token as their argument
consumes_arg = {'-b', '-B', '--reason'}

try:
    wt_idx = parts.index('worktree')
    # parts[wt_idx+1] == 'add'
    i = wt_idx + 2
except (ValueError, IndexError):
    sys.exit(0)

while i < len(parts):
    token = parts[i]
    if token == '--':          # end of flags
        i += 1
        break
    if token in consumes_arg:  # flag + argument, skip both
        i += 2
    elif token.startswith('-'): # bare flag, skip
        i += 1
    else:
        print(token)           # first positional arg = path
        sys.exit(0)
    i += 1
")

if [ -z "$WORKTREE_PATH" ]; then
    exit 0
fi

# Make absolute if relative (hook runs from the repo root)
if [[ "$WORKTREE_PATH" != /* ]]; then
    WORKTREE_PATH="$(pwd)/$WORKTREE_PATH"
fi

if [ ! -d "$WORKTREE_PATH" ]; then
    # git worktree add may have failed — nothing to set up
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/setup-worktree.sh" "$WORKTREE_PATH" 2>&1 | sed 's/^/[worktree-setup] /'

exit 0

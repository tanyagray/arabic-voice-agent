---
name: open-in-vscode
description: >
  Opens the current project/worktree in VS Code and jumps to the most relevant
  file given the conversation context. Trigger when the user says things like
  "show me the code", "open in ide", "open in vscode", "let me review the code",
  "take me to the code", "open this in my editor", or "/open-in-vscode".
user-invocable: true
allowed-tools: Bash, Read
argument-hint: "[optional file hint]"
---

# Open in VS Code

Launch VS Code on the current worktree and navigate to the file most likely
relevant to what the user just asked about.

## Steps

1. **Determine the project root.** Run `git rev-parse --show-toplevel`. If not
   in a git repo, fall back to the current working directory. This will be the
   current worktree path when invoked from one.

2. **Pick the most relevant file** from conversation context, in priority
   order:
   - A file the user explicitly named in this turn or a recent turn.
   - A file you just edited or created this session.
   - A file central to the topic just discussed (one quick Grep is fine — do
     not over-search).
   - If nothing stands out, open the project root with no `--goto`.

   If a specific line is relevant (e.g. a function just discussed), append
   `:LINE` or `:LINE:COL`.

   If the user passed an argument to the skill, treat it as the path hint and
   skip the heuristics.

3. **Open VS Code.** Run a single command:
   ```bash
   code <project_root> [--goto <file>[:line[:col]]]
   ```
   If `code` is not on PATH, fall back to
   `open -a "Visual Studio Code" <project_root>` and note that the line jump
   was skipped.

4. **Confirm briefly** — one sentence naming the file (as a markdown link)
   and why you picked it. Do not summarize the conversation.

## Notes

- Open exactly one file. Pick the single best candidate.
- Do not run builds, tests, or any other tooling.
- Do not block on the `code` command — it returns immediately.

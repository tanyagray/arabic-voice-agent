---
name: debug-deployment
description: >
  Debugs GitHub Actions CI/CD deployment failures using the gh CLI. Use this skill
  whenever the user mentions a deployment failure, CI error, broken workflow, failed
  GitHub Actions run, or asks to "check CI", "debug deployment", or "what went wrong
  in CI". Also trigger for "/debug-deployment". Even if the user is vague ("something
  failed in CI" or "the deploy broke"), use this skill — it will find the relevant
  failure and diagnose it. Installs gh CLI automatically if not present.
---

# Debug Deployment

Your job is to find out what went wrong in GitHub Actions and give the user a clear diagnosis with next steps.

## Step 1: Ensure gh CLI is available

Check if `gh` is installed:

```bash
which gh
```

If not found, install it based on the OS:

- **macOS**: `brew install gh`
- **Linux (apt)**:
  ```bash
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt update && sudo apt install gh -y
  ```

After installing, check if the user is authenticated (`gh auth status`). If not, prompt them to run `gh auth login` before continuing — you cannot proceed without auth.

## Step 2: Find failed runs

Get recent workflow runs, filtering for failures:

```bash
gh run list --limit 20 --json databaseId,name,status,conclusion,headBranch,createdAt,url \
  | jq '.[] | select(.conclusion == "failure" or .conclusion == "startup_failure" or .status == "in_progress")'
```

If the user mentioned a specific branch or PR, filter for it:

```bash
gh run list --branch <branch-name> --limit 10
```

Pick the most relevant failed run — usually the most recent one on the current branch or the one the user is asking about.

## Step 3: Get failure details

For the failed run, fetch the full log of only the failed steps:

```bash
gh run view <run-id> --log-failed
```

Also get the structured summary:

```bash
gh run view <run-id> --json jobs,conclusion,name,url,headBranch,createdAt \
  | jq '{name, conclusion, headBranch, createdAt, url, failedJobs: [.jobs[] | select(.conclusion == "failure") | {name: .name, steps: [.steps[] | select(.conclusion == "failure") | {name: .name, conclusion}]}]}'
```

If `--log-failed` output is very long (>200 lines), focus on the last 100 lines where the actual error usually appears:

```bash
gh run view <run-id> --log-failed 2>&1 | tail -100
```

## Step 4: Diagnose and report

Read the logs carefully. Common failure patterns in this project:

- **Supabase branch not found**: The `deploy-preview` workflow looks up a Supabase preview branch by git branch name. If it's not found yet, it exits 1. Usually a timing issue — the branch needs to be created first.
- **Render service not found after retries**: The `configure-render-preview` job waits up to 5 minutes for Render to create preview services. If they don't appear, there may be a Render blueprint config issue or the PR wasn't opened against the right base branch.
- **Missing secrets/vars**: Errors like `unbound variable` or empty values in `jq` output often mean a GitHub secret or variable (`SUPABASE_PERSONAL_ACCESS_TOKEN`, `RENDER_API_KEY`, `SUPABASE_PROJECT_REF`) is not set in the repo/environment.
- **Flutter build failures**: Usually dependency, SDK version, or keystore signing issues.
- **Test failures in web-api**: Look for `pytest` errors in the log.
- **YAML/config errors**: Workflow syntax errors show up as `startup_failure` before any steps run.

Present your diagnosis like this:

```
## Deployment Failure: <workflow name> on <branch>

**Run**: <url>
**Failed job**: <job name>
**Failed step**: <step name>

### What went wrong
<clear explanation of the root cause, not just a restatement of the error>

### How to fix it
1. <specific action>
2. <specific action>

### To rerun the workflow
gh run rerun <run-id> --failed
```

If there are multiple failed runs or jobs, address the most actionable one first, then list the others briefly.

## Tips

- If you need to look at a specific job's logs rather than all failed logs, use: `gh run view <run-id> --job <job-id>`
- To list jobs for a run: `gh run view <run-id> --json jobs | jq '.jobs[] | {id: .databaseId, name: .name, conclusion: .conclusion}'`
- If the run is still in progress, use `gh run watch <run-id>` or just re-check with `gh run view <run-id>` after a minute

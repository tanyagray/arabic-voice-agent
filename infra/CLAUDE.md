# Infra — Deployment Guide

## Bootstrap Stack (`bootstrap/`)

Must be deployed **from local** — it provisions foundational resources (e.g., IAM roles, S3 buckets, OIDC providers) that the CI/CD pipeline itself depends on.

```bash
cd infra/bootstrap
# Follow the README for deploy commands
```

## All Other Stacks (`claude-agent/`, `preview/`, `prod/`)

Can be deployed via:

- **GitHub workflow dispatch** — trigger manually from the Actions tab
- **Automatically** — on merge to `main` or on PR (depending on the workflow)

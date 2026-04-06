# Preview Deployments

Preview deployments are triggered on pull requests and scoped based on what changed. Changes cascade upward: a Supabase change triggers a full stack deploy, an API change also deploys the frontend, and a UI-only change deploys just the frontend.

## Strategy

| Change type | What gets deployed | API target | Database target |
|---|---|---|---|
| UI only (`web-app`, `admin-app`) | Preview UI | Production API | Production Supabase |
| API (`web-api`) | Preview UI + Preview API | Preview API | Production Supabase |
| Supabase (`supabase/migrations`) | Full stack (UI + API + DB) | Preview API | Preview Supabase |

Infrastructure or workflow file changes (`infra/preview/**`, `.github/workflows/aws-preview-*`) trigger a full stack deploy.

## Cascade rules

Changes cascade upward through the stack:

```
supabase change  →  deploy_supabase + deploy_api + deploy_frontend
api change       →  deploy_api + deploy_frontend
frontend change  →  deploy_frontend
```

This is implemented in the `detect-changes` job of `aws-preview-deploy.yml`.

## Rules

### UI change only

When the PR only touches frontend code (`web-app` or `admin-app`):

- Deploy a preview instance of the UI
- Point it at the **production API** (`VITE_API_URL` = `vars.PRODUCTION_API_URL`)
- No API or database preview is created

### API change

When the PR touches `web-api`:

- Deploy a preview instance of the API using **production Supabase** (main project) for its database
- Deploy a preview instance of the UI pointing at the **preview API**

### Supabase change

When the PR touches `supabase/migrations`, `supabase/config.toml`, or `supabase/seed/**`:

- Deploy the full stack: preview Supabase, preview API, and preview UI
- The preview API connects to the **preview Supabase** branch instance
- The preview UI connects to the preview API

## Required GitHub variables

- `PRODUCTION_API_URL` — URL of the production API (used when no API preview is deployed)
- `SUPABASE_PROJECT_REF` — Supabase main project reference

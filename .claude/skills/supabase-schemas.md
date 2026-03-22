---
name: supabase-schemas
description: >
  Guide for managing Supabase database schemas declaratively. Use this skill whenever
  making database schema changes, adding tables, modifying RLS policies, creating
  migrations, or when the user mentions "schema", "migration", "declarative", "db diff",
  or "supabase db". Also trigger for "/supabase-schemas".
---

# Declarative Supabase Schema Management

This project uses **declarative schemas** as the source of truth for the database. Instead of writing migrations by hand, you declare the desired state in SQL files and generate migrations with `supabase db diff`.

## Directory Structure

```
supabase/
├── config.toml              # Supabase config (env-var driven for local/preview/prod)
├── schemas/                  # DECLARATIVE SOURCE OF TRUTH
│   ├── config/               # `config` schema tables
│   │   ├── _schema.sql       # Schema creation & default privileges
│   │   └── personas.sql      # Voice config per locale
│   └── public/               # `public` schema tables
│       ├── profiles.sql      # User profiles (auto-created on signup)
│       ├── agent_sessions.sql
│       └── transcript_messages.sql
├── migrations/               # GENERATED — do not edit by hand (except for caveats below)
│   └── <timestamp>_<name>.sql
├── seed/                     # Seed data (DML — not captured by diff)
│   └── users.sql
└── email-templates/          # Auth email templates
```

## Workflow: Making Schema Changes

### 1. Edit the schema file(s)

Edit the relevant `.sql` file in `supabase/schemas/`. Each file should contain the complete, current definition for that entity — tables, indexes, grants, RLS policies, triggers, and functions.

**Always append new columns to the end of the table definition** to avoid messy diffs (views and enums are order-sensitive).

### 2. Generate a migration

```bash
cd supabase
supabase db diff -f <descriptive_name>
```

This diffs the current migrations against your declared schema and generates a new migration file in `supabase/migrations/`.

### 3. Review the generated migration

**Always review the generated SQL.** Check for:
- Unintended destructive changes (DROP statements)
- Duplicate grant statements (a known caveat)
- Missing changes that fall under known caveats (see below)

### 4. Apply locally

```bash
supabase migration up
```

### 5. Deploy to remote

```bash
supabase db push
```

**Never push to production without explicit permission.**

## Known Caveats (Things Declarative Diff CANNOT Track)

These must be managed via **hand-written migrations** alongside the declarative schema files:

| Category | What's Not Tracked | Workaround |
|---|---|---|
| **DML** | `INSERT`, `UPDATE`, `DELETE` | Use seed files or manual migrations |
| **Realtime** | `ALTER PUBLICATION supabase_realtime ADD TABLE ...` | Manual migration required |
| **ALTER POLICY** | Modifying existing RLS policies | Drop + recreate in schema file usually works, but verify the diff |
| **Column privileges** | Column-level grants | Manual migration |
| **Schema privileges** | `GRANT USAGE ON SCHEMA ...` | Handled in `_schema.sql` but not diffed across schemas |
| **Views** | Ownership, `security_invoker`, materialized views | Manual migration |
| **Comments** | `COMMENT ON ...` | Manual migration |
| **Partitions** | Table partitioning | Manual migration |
| **Domains** | `CREATE DOMAIN` | Manual migration |

### Handling Realtime Publications

Since `ALTER PUBLICATION` isn't captured by diff, when adding a table to realtime:
1. Add it to the schema file as a comment for documentation
2. Create a manual migration: `supabase migration new add_realtime_<table>`
3. Write the SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE <table>;`

### Handling Grant Duplication

The diff tool may generate duplicate grants from default privileges. Review and remove duplicates from generated migrations before applying.

## Schema File Conventions

Each table's schema file should contain (in this order):
1. `CREATE TABLE` with all columns, constraints, defaults
2. Indexes
3. Table-level grants (`GRANT ... TO role`)
4. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
5. RLS policies (`CREATE POLICY ...`)
6. Trigger functions (`CREATE OR REPLACE FUNCTION ...`)
7. Triggers (`CREATE TRIGGER ...`)

## Config.toml and Environment Variables

`config.toml` uses `env(VAR_NAME)` syntax for values that differ between environments:
- `env(SITE_URL)` — auth redirect URL
- `env(RESEND_ENABLED)` — SMTP toggle (false locally, true in production)
- `env(RESEND_API_KEY)` — email API key
- `env(OPENAI_API_KEY)` — Studio AI features

The `schema_paths` config controls which schema files are loaded and their order:
```toml
[db.migrations]
schema_paths = ["./schemas/**/*.sql"]
```

For dependency ordering, declare specific files first:
```toml
schema_paths = [
  "./schemas/config/_schema.sql",
  "./schemas/config/*.sql",
  "./schemas/public/profiles.sql",
  "./schemas/public/*.sql",
]
```

## Important Rules

- **Never run `supabase db reset` without explicit permission** — it destroys all local data
- **Never push to production without explicit permission**
- **Always review generated migrations** before applying
- **Schema files are the source of truth** — if something is only in a migration, it should also be in a schema file
- **Seed data goes in `supabase/seed/`**, not in schema files

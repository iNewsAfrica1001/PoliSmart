# PoliSmart Production Database Operations

The running application uses `DATABASE_URL`, while reviewed migrations use `MIGRATION_DATABASE_URL`. Never paste either credential into commands, logs, issues, or source control.

## Required production roles

Role creation is a separately authorized operator action. Before the first migration, create two
separate Neon roles in a protected owner session. Never run the following through the application
runtime, and never store the generated credentials in source control or shell history:

```sql
CREATE ROLE polismart_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '<generated-runtime-password>';
GRANT CONNECT ON DATABASE neondb TO polismart_runtime;
GRANT USAGE ON SCHEMA public TO polismart_runtime;
REVOKE CREATE ON SCHEMA public FROM polismart_runtime;

CREATE ROLE polismart_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '<generated-migrator-password>';
GRANT CONNECT ON DATABASE neondb TO polismart_migrator;
GRANT CREATE ON DATABASE neondb TO polismart_migrator;
GRANT USAGE, CREATE ON SCHEMA public TO polismart_migrator;
```

The protected owner must also arrange ownership or the narrowly required alteration rights for any
pre-existing application objects before the migrator is used. For an empty initialization, the
migrator creates and owns the migration-created objects. It must be able to create the reviewed
`pgcrypto` and `vector` extensions available on the target Neon project; do not pre-create them.
Do not grant either role superuser, `CREATEDB`, `CREATEROLE`, or `BYPASSRLS`. Do not grant the
runtime role schema `CREATE`, role membership in the migrator, or access to migrator credentials.

Set `DATABASE_URL` only to the pooled `polismart_runtime` connection and
`MIGRATION_DATABASE_URL` only to the protected direct `polismart_migrator` connection. The
application runtime must never receive `MIGRATION_DATABASE_URL`.

Do not grant blanket table privileges or blanket default table privileges to the runtime role.
In particular, never grant table-level `UPDATE` or `DELETE`, and never configure default
privileges that could restore them. Migrations grant only the operations required by each table.
Migration `0014_prelaunch_runtime_privilege_hardening` revokes all earlier privileges on the two
pre-launch tables before establishing this final matrix:

| Table                       | Runtime privileges                                                       |
| --------------------------- | ------------------------------------------------------------------------ |
| `prelaunch_leads`           | `SELECT`, `INSERT`, `UPDATE(status, updated_at)`; no `DELETE`            |
| `prelaunch_lead_follow_ups` | `SELECT`, `INSERT`, `UPDATE(completed_at, completed_by_id)`; no `DELETE` |

Migration `0015_runtime_privilege_catalog` revokes all runtime table privileges and establishes
the complete explicit policy in `docs/V1_1_RUNTIME_DATABASE_PRIVILEGE_CATALOG.md`. No application
sequence is created by migrations `0001`–`0015`, so the runtime receives no sequence privileges.
Fundraising tables receive no runtime access while Fundraising is disabled.

Verify the runtime role with `npm run db:validate:production`. The validator fails if dangerous role attributes are present.

## Preflight and migration review

All migrations in `prisma/migrations` must be reviewed in order before every production release.
Migrations `0001` through `0013` establish the schema. Migration `0014` is a forward-only security
correction that changes privileges without changing data or schema objects. It intentionally uses
`REVOKE ALL PRIVILEGES` only against `polismart_runtime` on the two pre-launch tables and then
regrants the exact matrix above. It contains no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, data
`DELETE`, or data-replacement statement.
Migration `0015` is the forward-only complete runtime privilege catalog and likewise changes no
application data.

Database-level `CREATE` is granted only to `polismart_migrator` because PostgreSQL requires it for
trusted extension installation. Before Production execution, prove on an isolated Neon branch
from the same project that a role with the documented attributes can run the exact idempotent
`CREATE EXTENSION` statements from migrations `0001` and `0004`. Record only pass/fail and
non-secret role attributes; do not retain credentials. Revoke the test role and delete the
isolated branch through the approved Neon process after evidence is retained.

Run the read-only status and validation checks:

```bash
npm ci
npm run db:generate
npx prisma migrate status
npm run db:validate:production
```

The validator checks connectivity, applied/failed migrations, pgvector, invalid indexes, tenant-key consistency, public-data counts, and dangerous role capabilities. It never reports the database URL, username, hostname, or database name.

## Backup

Before applying migrations, create a named Neon restore point or branch from the production branch in the Neon console. Record the branch/restore-point identifier, timestamp, migration commit, and operator in the release record.

For an additional logical backup, use a credential-safe environment and a restricted output location:

```bash
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-acl --file=polismart-pre-migration.dump
pg_restore --list polismart-pre-migration.dump
```

Encrypt the dump at rest, limit access, and delete it according to the retention policy. Do not commit it.

## Apply additive migrations

After backup verification and approval:

```bash
MIGRATION_DATABASE_URL=<injected-by-secret-manager> npm run db:migrate:production
npm run db:validate:production
```

`prisma migrate deploy` applies only pending checked-in migrations. Do not use `prisma db push`, `migrate reset`, or `migrate dev` against production.

For an empty Production database with no `_prisma_migrations` table, initialization/migration is
required. Complete the separately authorized role bootstrap, verify the authoritative Neon branch
identity and a recovery checkpoint, then run the normal migration sequence once. Do not manually
create `_prisma_migrations`, mark migrations applied, or edit migration history.

## Rollback

SQL migrations are forward-only. If validation fails:

1. Stop application promotion and preserve logs.
2. If no application writes occurred, restore the pre-migration Neon restore point/branch.
3. If writes occurred, keep production read-only, create a recovery branch from the restore point, reconcile post-backup writes, validate it, then promote through Neon’s reviewed recovery process.
4. For a non-destructive defect, prefer a new forward-fix migration.
5. Never manually delete `_prisma_migrations` rows or drop/truncate production tables.

## Afrobarometer production import

The production import is explicit and is not part of the Vercel build or migration command:

```bash
npm run import:afrobarometer:production
```

The command refuses local targets, validates the database before import, runs the idempotent aggregate-only importer, then validates again. A repeated source hash returns the existing import and inserts no duplicates. It never persists respondent-level rows.

To inspect source statistics without writing:

```bash
npm run import:afrobarometer -- --dry-run
```

Import only reviewed mapping versions. Version `r9-merged-codebook-2024-06-25-v2` contains ten mappings transcribed from the official Round 9 codebook; all other survey questions remain explicitly unmapped.

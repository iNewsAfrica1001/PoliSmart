# PoliSmart Production Database Operations

These procedures use `DATABASE_URL` without printing it. Never paste credentials into commands, logs, issues, or source control.

## Preflight and migration review

All migrations in `prisma/migrations` must be reviewed in order before every production release. The current eight migrations are additive: they create types, tables, indexes, constraints, extensions, functions, and triggers. They contain no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, bulk `DELETE`, or data-replacement statements.

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
npm run db:migrate
npm run db:validate:production
```

`prisma migrate deploy` applies only pending checked-in migrations. Do not use `prisma db push`, `migrate reset`, or `migrate dev` against production.

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

Do not import until authoritative mappings are approved. With the currently supplied dictionary, all 324 survey questions remain explicitly unmapped and the expected aggregate record count is zero.

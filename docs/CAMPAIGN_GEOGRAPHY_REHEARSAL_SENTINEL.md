# Campaign Geography rehearsal sentinel lifecycle

This procedure documents executable control tooling. It does not itself authorize a database connection, credential rotation, sentinel installation, migration, fixture creation, or rehearsal.

## Credential bootstrap

The separately authorized bootstrap command is `npm run db:rehearsal:campaign-geography:bootstrap`. It requires `CAMPAIGN_GEOGRAPHY_REHEARSAL_OWNER_URL`, `CAMPAIGN_GEOGRAPHY_REHEARSAL_AUTHORIZATION`, and independently obtained `CAMPAIGN_GEOGRAPHY_REHEARSAL_CONTROL_PLANE` JSON in the same process. It rejects `DATABASE_URL` and `MIGRATION_DATABASE_URL`, verifies the database-derived Neon branch ID against the control-plane branch, and denies Production before a transaction begins.

The transaction rotates only the existing `polismart_migrator` and `polismart_runtime` rehearsal-branch logins, and creates or rotates `polismart_rehearsal_unprivileged` as `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`. The latter receives only database `CONNECT` and schema `USAGE`; table and sequence privileges are revoked. It cannot inherit either application role. Generated passwords use cryptographically secure randomness and are never printed.

The exact three harness URLs are written atomically to `.env.campaign-geography-rehearsal.local` only after `git check-ignore` proves the path is ignored. The command prints role names and status only. That file must be loaded into the later controlled process; it is not automatically loaded by the application.

## Separate control-plane installation

The test harness never creates its own sentinel. Before a separately authorized rehearsal, an operator must use trusted Neon control-plane information to verify the exact project, non-Production branch ID, and database. The known Production branch `br-noisy-forest-axlven4c` is always prohibited. The authorization must contain the project ID, branch ID, database, unique nonce, fixed purpose `campaign-geography-increment-3a`, environment `non-production`, issue time, and expiry time.

Only after that independent control-plane verification may a separately reviewed installer connect specifically to the authorized branch. It must fail before writing for missing or ambiguous configuration, Production branch, project/branch/database mismatch, invalid purpose, or expired authorization. It writes one `CAMPAIGN_GEOGRAPHY_REHEARSAL_SENTINEL` audit record using `buildRehearsalSentinelSetup()`, reads it back, and verifies exact equality. The installer does not prove the later harness connection; the harness independently reads and compares the database record.

After separate authorization, install with `npm run db:rehearsal:campaign-geography:sentinel -- install`. The command accepts only `CAMPAIGN_GEOGRAPHY_REHEARSAL_MIGRATOR_URL`, the authorization JSON, and the independently verified control-plane JSON. It rejects generic database variables and performs identity verification before opening its atomic insert-and-readback transaction.

## Expiry and retirement

Each authorization uses a new nonce and one bounded expiry. A new rehearsal requires a new authorization and sentinel. The harness rejects missing, malformed, expired, retired, wrong-project, wrong-branch, wrong-database, wrong-environment, wrong-purpose, or wrong-nonce evidence.

Because security audit evidence is append-only, teardown retires rather than deletes the sentinel. A separately controlled teardown writes `CAMPAIGN_GEOGRAPHY_REHEARSAL_SENTINEL_RETIRED` using `buildRehearsalSentinelRetirement()`, then reads back the sentinel and retirement evidence and confirms the harness rejects that nonce. Retirement or cleanup failure fails the rehearsal and requires operator attention; the nonce must never be reused.

After separate retirement authorization, run `npm run db:rehearsal:campaign-geography:sentinel -- retire`. Retirement verifies the same database/control-plane identity, requires exactly one active matching sentinel, appends one retirement record, reads it back, and proves that the accepted harness validator rejects the retired nonce. It never deletes audit evidence.

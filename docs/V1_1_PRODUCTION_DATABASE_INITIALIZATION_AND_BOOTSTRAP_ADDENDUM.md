# PoliSmart Africa AI V1.1

## Production Database Initialization and Bootstrap Addendum

**Status:** Technical plan only — database execution not authorized

## 1. Authoritative target and evidence correction

The authoritative Nigeria Production database target is:

- Neon project: `polismart`
- Neon project ID: `young-base-56422836`
- Neon branch: `production`
- Neon branch ID: `br-noisy-forest-axlven4c`
- Database: `neondb`
- Schema: `public`

An earlier technical planning record used `br-noisy-forest-ax1ven4c`. That value is retained here
as historical evidence of a documentation typo; it is not a valid target identifier. The corrected
identifier is `br-noisy-forest-axlven4c` (lowercase letter `l` after `ax`).

The operator's read-only inventory returned no user objects in `public`, no
`_prisma_migrations` table, and no installed `pgcrypto` or `vector` extension. Both extensions are
available from the service catalog. Only `neondb_owner` exists; `polismart_runtime` and
`polismart_migrator` are absent. Therefore:

**DATABASE INITIALIZATION/MIGRATION REQUIRED: YES**

The reviewed migration range remains `0001`–`0015`, and those migrations create exactly 64
application tables. `_prisma_migrations` is Prisma infrastructure and is not included in that
application-table count.

This correction changes a technical prerequisite only. It does not alter any Legal, Privacy,
Human Rights, Security/Technical, Operations, or Platform Owner approval, and it does not broaden
the authorization beyond Nigeria Free Early Access. Billing, Payments, and Fundraising remain
disabled.

## 2. Separate role-bootstrap prerequisite

Role bootstrap requires a separate, explicit authorization. Before any migration is run, an
operator using the protected owner identity must:

1. Reconfirm the exact branch ID, database, and schema above.
2. Run only the atomic, fail-closed procedure in `scripts/bootstrap-production-roles.sql`, as
   directed by `DATABASE_OPERATIONS.md`. It checks that both role names are absent before either
   is created and rolls back the complete transaction if any role, privilege, or password step
   fails. Never alter, reuse, skip, or automatically drop an unexpectedly existing role.
3. Supply unique generated credentials only through `scripts/bootstrap-production-roles.ps1`.
   The wrapper uses `Read-Host -AsSecureString` for the protected owner connection and both role
   passwords, then safely escapes and streams the in-memory SQL transaction to `psql` through
   standard input. No password is placed in a process argument or persistent generated SQL file.
   Run without query echo, tracing, or transcript capture, and place credentials only in the
   appropriate secret scopes. Do not put credentials in the repository, command arguments,
   environment files, logs, or documentation.
4. Give both roles `CONNECT` on `neondb` and `USAGE` on `public`.
5. Revoke `CREATE` on `public` from `PUBLIC`, then give only `polismart_migrator` database-level
   `CREATE`, plus `CREATE` on `public`, and the
   ownership/alteration capability needed for migration-created objects. Database-level `CREATE`
   is not the `CREATEDB` role attribute and does not permit creating another database.
6. Give neither role superuser, `CREATEDB`, `CREATEROLE`, or `BYPASSRLS`.
7. Explicitly deny `polismart_runtime` database and schema `CREATE`; do not make it a member of
   the migrator and do not give either role ownership during bootstrap.
8. Confirm the migrator can create the reviewed available extensions through migrations `0001`
   and `0004` by first reproducing the role design on an isolated Neon branch from the same
   project. Do not pre-create either extension in Production.
9. Put only the pooled runtime credential in Production `DATABASE_URL`. Put only the direct
   migrator credential in the separately controlled migration environment as
   `MIGRATION_DATABASE_URL`. Never expose the latter to the running application.

Migration `0011` contains an unguarded grant to `polismart_runtime`; the runtime role must exist
before initialization begins. Migration `0014` fails closed if the role is absent and replaces
earlier broad lead-table privileges with the approved column-limited matrix. No blanket or default
runtime table grant is permitted.

Migration `0015_runtime_privilege_catalog` revokes every runtime table privilege before granting
the repository-derived table and column policy documented in
`V1_1_RUNTIME_DATABASE_PRIVILEGE_CATALOG.md`. Fundraising tables and unused legacy/import tables
receive no runtime access. The migration chain creates no application sequence, so no runtime
sequence privilege is required.

The first authorized Production bootstrap attempt reached the two password assignments, where
Neon rejected psql's `\password` representation because Neon requires plaintext password input.
`ON_ERROR_STOP` stopped the file before `COMMIT`; the atomic transaction rolled back successfully.
Read-only verification confirmed that both target roles remained absent, no migration ran, and no
extension or application table was created. PostgreSQL 18 `psql` does not support hidden input
through `\prompt`; the repository procedure now uses the protected external wrapper and safely
escaped Neon-compatible mechanism described above. This remediation changes no approval,
jurisdiction, financial-feature boundary, migration, or Production deployment.

## 3. Migration and recovery sequence

Under a future, separate execution authorization, the operator must:

1. Confirm the public-schema collision check remains empty and `_prisma_migrations` remains absent.
2. Establish and record a Neon recovery checkpoint before role creation or initialization.
3. Bootstrap and verify the two roles as described above.
4. Reconfirm `BILLING_ENABLED=false` and `FUNDRAISING_ENABLED=false` without exposing values for
   unrelated secrets.
5. Apply checked-in migrations `0001` through `0015` in their normal order using only
   `prisma migrate deploy` via the
   guarded Production migration command and the direct migrator identity.
6. Verify migration history, required schema objects, extensions, constraints, indexes, tenant
   boundaries, and the final runtime privilege matrix.
7. Verify the runtime has no schema `CREATE`, table `DELETE`, unrestricted table-level `UPDATE`,
   role-administration capability, database-creation capability, superuser, or `BYPASSRLS`.
8. Stop on any identity mismatch, collision, failed migration, unexpected object, privilege drift,
   or validation failure. Do not use `db push`, `migrate reset`, `migrate resolve`, manual history
   edits, or destructive SQL.

## 4. Production-safe application data bootstrap

`prisma/seed.mjs` is demonstration-only and must not be run unchanged in Production because it
creates fictional entities and uses a source-coded demonstration password. Production bootstrap
must be a separately reviewed, idempotent operator procedure with no embedded password and these
ordered stages:

1. **Permission catalog:** Load exactly the permission keys exported by the reviewed server
   authorization configuration. Reject unknown, missing, or duplicate keys.
2. **Role-permission mappings:** Materialize the deterministic mappings from the reviewed
   `ROLE_PERMISSION_POLICY`. Compare the resulting key sets exactly before proceeding.
3. **First Nigeria organization:** Create one real organization from operator-supplied, approved
   Nigeria details. Do not create a demo organization, campaign, or placeholder jurisdiction.
4. **First verified administrator:** Use a real account created and verified through the normal
   authentication flow. Do not accept a source-coded or operator-printed password.
5. **Controlled SUPER_ADMINISTRATOR assignment:** A different authorized operator must confirm the
   verified identity and intended organization, perform the assignment through a reviewed guarded
   provisioning mechanism, and retain the existing audit event. Self-promotion and Campaign
   Administrator promotion remain prohibited.
6. **Geographic levels:** For the Nigeria organization, create the approved ordered levels only
   after the Platform Owner confirms the terminology. Validate tenant ownership and uniqueness.
7. **Post-bootstrap verification:** Verify organization isolation, role and permission integrity,
   audit evidence, and absence of demo entities. Record counts and non-personal fingerprints.

Afrobarometer import is a separate controlled operation and is not part of data bootstrap.
Fundraising data, Billing data, and Payment data must remain absent.

## 5. Approval boundary

This addendum authorizes no database connection, role creation, extension creation, migration,
data creation, environment-variable change, or deployment. Production remains unchanged until a
separate role-bootstrap authorization and a subsequent database-initialization authorization are
issued after review of this remediation.

# Production-safe application bootstrap

This procedure is for the separately authorized Nigeria-only Free Early Access bootstrap after
migrations and runtime validation pass. It does not authorize execution, deployment, seeding,
Afrobarometer import, or any Billing, Payment, or Fundraising operation.

## Safety requirements

- Work from the reviewed release commit with a clean worktree.
- Use the direct `polismart_migrator` Neon connection only through the protected session variable
  `MIGRATION_DATABASE_URL`; never place it in a command argument, file, transcript, or log.
- Set `POLISMART_PRODUCTION_NEON_BRANCH_ID` to the independently verified Production branch ID.
- Use `NODE_ENV=production`. The command rejects pooled connections and a database/branch mismatch.
- Never run `prisma/seed.mjs` in Production. The bootstrap creates no user, organization, campaign,
  geographic level, demo record, financial record, or public-intelligence record.

## Catalog-only initialization

After a separate execution authorization, run from the repository root:

```powershell
$env:NODE_ENV = "production"
$env:MIGRATION_DATABASE_URL = Read-Host "Direct polismart_migrator URL" -AsSecureString |
  ConvertFrom-SecureString -AsPlainText
$env:POLISMART_PRODUCTION_NEON_BRANCH_ID = Read-Host "Verified Production Neon branch ID"
npm.cmd run db:bootstrap:production -- --mode catalog-only
Remove-Item Env:MIGRATION_DATABASE_URL, Env:POLISMART_PRODUCTION_NEON_BRANCH_ID
```

The transaction rejects stale or unknown permission keys and mappings, creates missing entries
from `PERMISSIONS` and `ROLE_PERMISSION_POLICY`, and verifies the final exact sets. Re-running it
with the same reviewed policy produces no duplicate entries.

## First organization and Super Administrator

1. Create the first legitimate Nigeria organization and initial Campaign Administrator only
   through the normal registration and email-verification flow.
2. Independently record the target user ID and organization ID without copying credentials or
   unnecessary personal data.
3. A different authorized operator supplies their own operator identifier and runs:

```powershell
npm.cmd run db:bootstrap:production -- --mode super-admin --user-id <TARGET_USER_UUID> --organization-id <NIGERIA_ORGANIZATION_UUID> --operator-user-id <INDEPENDENT_OPERATOR_IDENTIFIER>
```

4. Review the target through the controlled approval record, then type the exact confirmation only
   when authorized. The command validates verified email, one active legitimate membership,
   Nigeria jurisdiction, independent operation, and non-Super-Administrator status. Assignment and
   sanitized audit evidence are one database transaction.
5. Verify the resulting role, audit event, tenant isolation, exact permission catalogs, and absence
   of demo, financial, and public-intelligence records. Clear protected session variables.

Stop on any identity mismatch, stale catalog item, unexpected membership, failed audit write, or
ambiguous result. Do not retry a persistent action until current state is read-only verified.

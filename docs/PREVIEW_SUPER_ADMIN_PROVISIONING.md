# Preview Super Administrator Provisioning Procedure

This operator-only procedure provisions a dedicated, already registered and verified test user as `SUPER_ADMINISTRATOR` in the isolated V1.1 Preview organization. It is not an application endpoint, role editor, or Administration UI.

> **Never use this procedure against Production.**

## Preconditions

- Register a dedicated test user through the Preview registration flow and verify that Preview account.
- Confirm the user has one active membership, in the intended isolated Preview organization only.
- Obtain the non-secret Neon branch ID for `v1-1-development` and the direct Preview migration connection securely. Never paste or store the connection string in source, documentation, shell history, or Git.
- Work from `release/v1.1`. Do not use a Production account, organization, database, or credential.

## Controlled procedure

1. In a temporary operator shell session, set `MIGRATION_DATABASE_URL` securely without echoing it.
2. Set `VERCEL_ENV=preview` and set `POLISMART_PREVIEW_NEON_BRANCH_ID` to the approved non-secret Preview branch ID.
3. Run `npm run provision:preview-super-admin -- --email <registered-preview-email> --organization-id <preview-organization-id>`.
4. Review the displayed user, organization, role, and Preview environment. The command refuses Production, a missing or mismatched branch identity, an unverified account, an invalid organization, and unexpected organization membership.
5. Type the exact confirmation phrase only when every displayed detail is correct.
6. Sign in normally through Preview and perform the authorized acceptance tests.
7. Clear the temporary variables. The command also clears its process copies when it exits.

The role update and `PREVIEW_SUPER_ADMINISTRATOR_PROVISIONED` security audit event are written atomically. The event records identifiers, assigned role, operator-command source, environment, and branch identity; it records no password, token, connection string, or other secret.

When test access is no longer required, remove or deactivate it only through an approved authorized mechanism. If none exists, stop and obtain an approved removal procedure; do not edit membership roles directly in SQL.

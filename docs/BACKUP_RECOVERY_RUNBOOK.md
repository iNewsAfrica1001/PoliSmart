# PoliSmart Africa AI V1 Backup, Recovery, and Disaster-Recovery Runbook

Production domain: `https://polismartafrica.ai`

This runbook governs non-destructive recovery of PoliSmart Africa AI V1. It does not authorize a
production restore, schema change, database reset, migration, import, secret change, or provider
reconfiguration. Never put connection strings, passwords, tokens, private documents, respondent
data, or other credentials in this document or an incident ticket.

## 1. Recovery inventory

The following identifiers are safe operational metadata and must be rechecked in the provider
consoles before a recovery action:

| Component              | Production identification                                                     |
| ---------------------- | ----------------------------------------------------------------------------- |
| Domain                 | `polismartafrica.ai`                                                          |
| Vercel project         | `poli-smart` (use the linked project and team shown in the Vercel dashboard)  |
| GitHub repository      | `iNewsAfrica1001/PoliSmart`                                                   |
| Production Git branch  | `main`                                                                        |
| Neon project           | project ID `square-cell-84454018`                                             |
| Neon production branch | `main`, branch ID `br-fancy-credit-av2zb3ix`; recheck both in Neon before use |
| PostgreSQL database    | `neondb`                                                                      |
| Runtime identity       | `polismart_runtime`                                                           |
| Migration identity     | `polismart_migrator`                                                          |

The branch ID is the authoritative identifier when a provider-managed display name is absent or
changes. Confirm that the selected branch contains the expected PoliSmart schema and migration
history before treating it as production. Do not identify a database by hostname alone.

## 2. Neon database protection

### Protection model

- Neon branches and recovery capabilities provide isolated locations for inspecting or restoring
  historical database state without first overwriting production.
- Active Neon point-in-time recovery capability was owner-confirmed on 2026-08-29. The exact
  history-retention window remains a provider setting and must be checked before each exercise in
  **Neon Console → project → Backup & Restore / Restore** and recorded in the private operations
  register.
- A named recovery branch/checkpoint is required before every approved production migration or
  data operation. Record only project ID, branch ID, recovery timestamp, source commit, operator,
  and validation result—not credentials.
- Optional logical backups must be encrypted, access-restricted, excluded from Git, and checked
  with `pg_restore --list`. Retention and deletion require the owner's approved data-retention
  schedule.
- Runtime and migration credentials remain separate. A recovery exercise must not grant additional
  privileges to `polismart_runtime`.

Neon's official restore documentation is the controlling provider procedure. At the time of this
review, Neon supports restoring a branch to a point in its retained history and using a separate
branch/read-only historical connection to inspect a point in time. Confirm current controls in the
[Neon branch restore documentation](https://neon.com/docs/guides/branch-restore) before executing a
recovery.

### Quarterly non-destructive recovery validation

Run this exercise once per quarter and before relying on a materially changed recovery process:

1. Open the confirmed Neon project and select the production branch by its branch ID.
2. Confirm the configured restore window and choose a recent safe point inside that window.
3. Create a **new isolated recovery branch** from that point. Never select an operation that
   overwrites, resets, or restores into the production branch.
4. Create or select a validation-only compute endpoint for the recovery branch. Inject its
   credential through an approved temporary secret store; do not place it in source, shell
   history, logs, screenshots, or tickets.
5. From an isolated validation environment, run read-only checks:
   - connect successfully with TLS;
   - confirm `current_database()` is `neondb` and record only the safe role name;
   - confirm `_prisma_migrations` exists and contains the expected migration history;
   - compare non-system table counts and critical tables with the approved production inventory;
   - confirm tenant-key structure, required indexes, `pgvector`, and public-intelligence aggregate
     structures;
   - run read-only samples for organization isolation, campaign access, approved knowledge
     references, and aggregate Afrobarometer data.
6. Point a non-production validation deployment at the isolated branch only. Run the
   post-recovery acceptance checklist in section 9. Do not send production email or write test
   campaign data unless a separately approved disposable copy is used.
7. Record recovery point, branch ID, start/end time, recovery-point gap, validation results,
   operator, and any discrepancy. Never record credentials.
8. Delete the isolated branch only after the exercise evidence is accepted and retention policy
   permits cleanup. Verify that production remained unchanged.

### Completed baseline validation — 2026-08-29

The owner completed the first quarterly non-destructive recovery validation with these safe
results:

| Validation                                         | Result                     |
| -------------------------------------------------- | -------------------------- |
| Active point-in-time recovery capability           | PASS                       |
| Isolated recovery branch                           | `recovery-test-2026-08-29` |
| Parent production branch                           | `main`                     |
| Past point-in-time branch creation                 | PASS                       |
| Recovered database                                 | `neondb`                   |
| Recovered public tables                            | 57                         |
| Prisma migration records                           | 9                          |
| Expected database structure                        | PASS                       |
| Migration history                                  | PASS                       |
| Production `main` branch modified                  | NO                         |
| Production Vercel `DATABASE_URL` changed           | NO                         |
| Production Vercel `MIGRATION_DATABASE_URL` changed | NO                         |
| Destructive recovery performed                     | NO                         |
| Recovery branch automatic expiration configured    | YES                        |

This baseline proves the isolated recovery procedure without claiming that production was
restored. Continue the quarterly schedule and record each exercise using the same safe evidence.

### Production database recovery decision

Do not restore production merely because the application cannot connect. First rule out Vercel,
DNS, credential attachment, provider availability, and connection-pool failures. Restore only
when corruption or destructive data loss is confirmed and a forward repair is less safe.

If production restoration becomes necessary:

1. Declare a P1 incident, freeze writes/deployments/migrations/imports, and preserve evidence.
2. Identify the last verified recovery point and quantify the potential data-loss window.
3. Restore to an isolated branch and complete the validation above.
4. Reconcile writes after the recovery point through an approved, auditable process.
5. Require incident-commander and data-owner approval before changing production routing.
6. Retain the former branch until acceptance and incident review are complete.

Never use `prisma migrate reset`, destructive `prisma db push`, `DROP`, `TRUNCATE`, migration-table
editing, or an unreviewed reverse migration as a recovery shortcut.

## 3. Vercel application recovery

Vercel deployments are immutable recovery candidates. Identify the known-good candidate by its
production deployment ID, Git commit, build result, prior smoke-test evidence, schema
compatibility, and environment epoch. A Preview deployment that was never promoted to production
is not automatically a valid rollback target.

### Instant rollback

1. Confirm that the incident began with an application deployment and that the older application
   remains compatible with the current database schema and external APIs.
2. In **Vercel → poli-smart → Deployments**, filter to production/`main`, select the last verified
   deployment, and use **Instant Rollback**. An authorized operator may instead use
   `vercel rollback <deployment-id-or-url>` from the correctly linked project.
3. Verify the production domains shown by Vercel before confirming.
4. Be aware that an instant rollback restores the older build's configuration snapshot. If a
   credential or environment setting changed, rebuild/redeploy the known-good commit with the
   current approved environment rather than assuming the old deployment is safe.
5. Vercel disables automatic production-domain assignment while rolled back. After the reviewed
   fix passes, promote the accepted deployment to exit rollback state and restore normal
   assignment.

See Vercel's current [Instant Rollback documentation](https://vercel.com/docs/instant-rollback)
before executing. Do not roll back an application across an incompatible database migration.

### Redeployment recovery

Use a redeployment when code is known good but the deployed build lacks a corrected environment
attachment or provider binding. Confirm variable **names, scopes, sensitivity, and project links**
without displaying values, then redeploy the known-good commit. Environment changes apply only to
new deployments; an old immutable deployment does not acquire later secret changes automatically.

After either action, perform the section 9 acceptance checks and monitor errors, latency, database,
email, and AI signals for at least 30 minutes.

## 4. Git and source-code recovery

- `main` is the production source branch and tracks `origin/main` in
  `https://github.com/iNewsAfrica1001/PoliSmart.git`.
- Protect `main` with required review, passing checks, restricted force-push/deletion, and named
  release authority. Branch-protection status must be verified in GitHub; the local repository
  cannot prove it.
- Create an annotated release tag for every accepted production release, for example `v1.0.0`,
  and record its commit and Vercel deployment ID in the release register. Prefer signed tags when
  the organization's signing policy is established.
- To recover code, branch from the known-good tag/commit, make a normal reviewed revert or forward
  fix, run the complete verification gate, and deploy the resulting new commit.
- Never rewrite shared history, force-push `main`, delete evidence commits, or use a destructive
  reset as the production rollback procedure.

The repository inspected for this runbook was on `main`, tracking `origin/main`. The known-good
deployment must always be selected from the release register and current production evidence;
this document intentionally does not permanently label the current moving commit as known good.

## 5. Configuration recovery

Maintain a private configuration inventory containing **names and metadata only**:

- Vercel project/team, production domain, Git integration, build command, Node runtime, deployment
  protection, and environment scopes;
- Neon project/branch/database IDs, runtime/migration role names, restore window, recovery owner,
  and connection-variable names;
- Microsoft Entra tenant/application identifiers, Graph permission names, sender mailbox, secret
  owner, and rotation dates;
- OpenAI project/model names, key owner, rate/usage controls, and rotation dates;
- private storage provider/store ID, access mode, retention owner, and credential type;
- `APP_URL`, `CLIENT_ORIGIN`, `AUTH_SECRET`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`,
  `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `EMAIL_PROVIDER`, `EMAIL_FROM`,
  `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `STORAGE_PROVIDER`,
  `BLOB_STORE_ID` or legacy storage-token name, and rate-limit variable names.

For each item record the owner, purpose, Production/Preview scope, Sensitive status, source system,
last validation, last rotation, and dependent deployment. Store actual values only in approved
provider secret stores. Reconstruct configuration by creating replacement credentials in the
provider, attaching them to the correct Vercel scope/project, redeploying, validating, and only
then revoking the former credential. Never email or paste values into the runbook.

## 6. Third-party failure procedures

### Neon

Confirm Neon service status and project/compute health; distinguish DNS, TLS, authentication,
pooling, connection exhaustion, and database errors. Stop retry storms. Keep deterministic
application errors safe. Do not change roles or restore data until corruption is established. On
recovery, validate an isolated branch before any production routing decision.

### Vercel

Confirm Vercel service status, domain/TLS health, current deployment, function logs, and region
scope. If a release caused the incident, use a compatible known-good rollback. If Vercel itself is
unavailable, freeze changes, preserve Git/Neon/provider state, communicate the outage, and recover
only after the platform is stable. Do not move DNS during a transient incident without an approved
alternate-host plan.

### Microsoft Graph

Preserve authentication anti-enumeration and verification requirements. Correlate safe Graph
status/error codes and Microsoft request IDs with Microsoft 365 service health and message trace.
HTTP 202 means accepted for processing, not inbox delivery. Do not switch providers or bypass
verification during an incident. After recovery, validate verification and password-reset email
with a controlled account and single-use links.

### OpenAI

Keep campaign operations and approved aggregate intelligence available where they do not require
generation. Return a controlled provider-unavailable response; do not fabricate answers or silently
substitute an unapproved provider/model. Preserve Observed Data/AI Interpretation separation,
citations, country grounding, weighting, and sample safeguards. Re-enable gradually and review
error, rate-limit, citation, and usage signals.

## 7. Recovery priorities

Recover and validate in this order, without bypassing an earlier security or data-integrity gate:

1. **A — Domain/application availability:** DNS, HTTPS, production domain, health, and readiness.
2. **B — Database connectivity:** correct production database, TLS, runtime identity, and safe
   connection capacity.
3. **C — Authentication:** registration/verification where relevant, login, session, reset, and
   logout.
4. **D — Authorization:** tenant isolation, role boundaries, and Super Administrator restrictions.
5. **E — Campaign access:** organization membership, campaign selection, and scoped data.
6. **F — Intelligence/AI:** approved aggregate retrieval, grounding, citations, and safe provider
   behavior.
7. **G — Email:** Graph acceptance plus message-trace/inbox delivery for controlled workflows.
8. **H — Secondary workflows:** policy, events, volunteers, documents, media, communications, and
   other non-core operations.

Reports and Payments/Billing remain Coming Soon and are not V1 recovery dependencies.

## 8. Recovery objectives and evidence

The owner must approve recovery-point and recovery-time objectives that the active Neon and Vercel
plans can support. Do not invent contractual RPO/RTO values. For every exercise or incident record:

- incident/recovery start and end time;
- last verified recovery point and estimated data-loss window;
- source commit/tag and deployment IDs;
- provider and branch IDs without credential-bearing endpoints;
- checks performed and sanitized results;
- approvers, operator, residual risk, cleanup decision, and follow-up owner.

## 9. Post-recovery production acceptance

Do not close recovery until all applicable checks pass:

- production domain resolves, HTTPS certificate is valid, HTTP redirects are correct, and
  `/api/health` remains minimal;
- `/api/ready` succeeds without exposing internal diagnostics;
- controlled verified-account login succeeds and the expected organization/campaign is accessible;
- the database connection uses `polismart_runtime`, not an owner or migration identity;
- cross-tenant access and unauthorized role changes remain denied;
- campaign data and approved documents/aggregates are present at expected counts;
- a grounded AI query retrieves approved evidence, displays Observed Data separately from AI
  Interpretation, and includes valid citations;
- email verification/password reset is tested when email was affected;
- logout succeeds, the prior session is invalidated, and the protected route is inaccessible;
- no unexpected HTTP 500 responses occur in the critical journey;
- Vercel, Neon, Microsoft Graph, OpenAI, and application error signals remain stable for at least
  30 minutes.

Record results without passwords, tokens, prompts, private documents, connection strings, or raw
respondent data.

## 10. Stage 6 readiness status

- Database recovery procedure: documented.
- Application, code, configuration, and provider recovery: documented.
- Destructive production action: prohibited and not performed by this review.
- Active Neon point-in-time recovery capability: confirmed on 2026-08-29.
- Quarterly isolated Neon recovery exercise: completed successfully on 2026-08-29; next exercise
  remains due under the quarterly schedule.
- Production branch and Vercel database configuration: unchanged during validation.
- Stage 6 backup/recovery readiness: passed.

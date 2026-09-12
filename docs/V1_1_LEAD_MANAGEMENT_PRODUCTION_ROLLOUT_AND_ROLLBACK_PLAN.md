# PoliSmart Africa AI

## V1.1 Lead Management Production Rollout and Rollback Plan

### Draft — Not Authorized for Execution

| Document control | Value |
|---|---|
| Document owner | Platform Owner |
| Technical custodian | Technical Administrator |
| Version | V1.1 Draft |
| Status | Draft — Not Authorized for Execution |
| Production decision | NO-GO |
| Effective date | Not effective |
| Next review | After Vercel 2FA restoration, Preview acceptance, and legal review |

This plan is a review artifact only. It does not authorize a Production deployment, database migration, environment change, user provisioning, email transmission, legal approval, or country enablement.

The document may be saved and reviewed while Production remains **NO-GO**. “Ready for documentation review” does not mean “ready for Production.” Execution remains prohibited until every mandatory release gate passes and explicit written Production authorization is received.

## 1. Release scope

The proposed V1.1 Production release contains:

- Public Early Access and Demo lead capture.
- Secure Super Administrator lead review.
- Human-managed `NEW`, `CONTACTED`, `QUALIFIED`, and `CLOSED` statuses.
- Follow-up notes, scheduling, append-only history, and completion attribution.
- The Lead Follow-Up Operations and Data-Retention Policy.
- Existing public submission rate limits, safe validation, and privacy controls.

The release explicitly excludes:

- Payments, payment credentials, checkout, or payment-provider integration.
- General Fundraising enablement or any enablement of Nigeria Fundraising.
- Automated outreach, bulk email, lead scoring, donor scoring, profiling, or autonomous decisions.
- AI grounding, model training, or Workspace Search use of lead contact information or follow-up notes.
- Any change to country-by-country controlled enablement.

## 2. Current release state

- Local branch: `release/v1.1`.
- Local commit: `4385d4a279803259aebd95357804b22ca11384c8`.
- Remote `origin/release/v1.1`: `88096e520efa1305cee48994fa8949936a4c6667`.
- The policy-only commit is local and unpushed.
- Preview migrations 0012 and 0013 passed.
- The Preview deployment for commit `88096e520efa1305cee48994fa8949936a4c6667` was reported READY.
- Step 2B.9 browser acceptance remains incomplete because Vercel 2FA is unresolved.
- Proposed retention periods remain pending qualified legal approval and are not effective.
- Production code and the Production database remain unchanged.

These facts do not constitute Production authorization.

## 3. Mandatory release gates

The default status is **NO-GO**. All gates must be evidenced before release:

- [ ] Vercel 2FA access is restored and independently verified.
- [ ] Step 2B.9 Preview functional and security acceptance passes.
- [ ] Qualified legal review is complete.
- [ ] Retention periods and suppression-record rules are approved.
- [ ] Administrator training is complete and recorded.
- [ ] The exact Production release commit is reviewed and approved before merge or deployment.
- [ ] Full automated tests, lint, TypeScript, build, audit, and security tests pass on that commit.
- [ ] Production database backup/recovery checkpoint is confirmed before any migration.
- [ ] Production Neon project, branch, endpoint, database, and migrator identity are verified.
- [ ] Production environment-variable names, scopes, and sensitivity are verified without revealing values.
- [ ] Production runtime and migration roles remain separate and least-privileged.
- [ ] Final authorization and tenant-isolation tests pass.
- [ ] A rollback operator and decision authority are available.
- [ ] Explicit written Production authorization is received.

Failure or uncertainty in any gate means **NO-GO**.

## 4. Production database preflight

Before establishing a migration session:

1. Confirm the Production Neon project is the approved project, presently documented as project ID `square-cell-84454018`.
2. Confirm the branch by both name and immutable branch ID. The current documented target is `main`, branch ID `br-fancy-credit-av2zb3ix`.
3. Confirm the selected direct endpoint belongs to that branch and is not a pooled or Preview endpoint.
4. Confirm the database is `neondb`.
5. Confirm the session role is `polismart_migrator`.
6. Explicitly reject the Preview `v1-1-development` branch and every unknown target.
7. Confirm TLS/SSL is required and active without printing the connection string.
8. Inspect `_prisma_migrations` using masked metadata:
   - determine the established Production baseline;
   - confirm whether migrations through 0010 are applied or whether another baseline is formally recorded;
   - determine exactly which of 0011, 0012, and 0013 are pending;
   - confirm no unfinished, failed, rolled-back, edited, or unknown migration exists;
   - compare migration checksums where supported.
9. Confirm `prelaunch_leads` and `prelaunch_lead_follow_ups` object state agrees with migration history.
10. Confirm the migrator owns or can alter only the required objects.
11. Confirm normal application access uses `polismart_runtime`, not the migrator identity.
12. Verify current runtime privileges before migration.
13. Record safe pre-migration counts for existing pre-launch leads and related records. Do not record personal fields.
14. Confirm a named, recoverable Neon checkpoint or isolated recovery branch at the precise pre-migration point.
15. Record only safe checkpoint metadata: project, branch ID, time, approved commit, operator, and validation result.
16. Stop on any identity, history, checksum, ownership, privilege, TLS, count, or recovery mismatch.

No complete database URL, password, credential-bearing endpoint, or token may appear in logs or evidence. The exact Production target must be reverified immediately before migration.

## 5. Migration review and sequence

Only `prisma migrate deploy` may be used. The repository's controlled wrapper is:

`npm run db:migrate:production`

It requires `MIGRATION_DATABASE_URL`, temporarily maps it to Prisma's `DATABASE_URL`, and invokes `prisma migrate deploy`. Only a direct Production migrator connection may be used. The credential must be supplied through an approved temporary secret mechanism and cleared immediately afterward.

Required sequence:

1. Confirm the backup/recovery checkpoint before any migration action.
2. Re-review the SQL for every pending migration.
3. Confirm 0011 creates `prelaunch_leads`, its checks, index, and runtime `SELECT`/`INSERT` access.
4. Confirm 0012 adds `updated_at`, replaces only the lead-status constraint to add `QUALIFIED`, and grants the update capability required by the reviewed status workflow.
5. Confirm 0013 creates `prelaunch_lead_follow_ups`, its indexes, completion-pair constraint, and restrictive foreign keys.
6. Confirm 0013 grants:
   - `SELECT` and `INSERT` to `polismart_runtime`;
   - column-limited `UPDATE` only on `completed_at` and `completed_by_id`;
   - no `DELETE`;
   - no unrestricted table-level `UPDATE`.
7. Verify existing Production rows are compatible with all replacement constraints.
8. Reconfirm the exact Production identity immediately before execution.
9. Execute the controlled migration command once.
10. Allow Prisma to apply pending migrations sequentially.
11. Never use `prisma db push`, `prisma migrate reset`, manual baselining, migration-table editing, `prisma migrate resolve`, or ad hoc SQL as routine deployment shortcuts.
12. After execution, confirm each expected migration has `finished_at`, no `rolled_back_at`, and no failed migration.
13. Verify tables, columns, constraints, indexes, and foreign keys.
14. Recheck runtime privileges and confirm no role broadening.
15. Compare pre/post lead counts and integrity fingerprints. Existing data must remain unchanged.
16. Clear temporary migration credentials from the operator session.
17. Preserve sanitized migration evidence.

If a migration partially fails, stop. Do not retry blindly, edit migration history, or use `resolve` without a separately reviewed incident procedure and explicit authorization.

## 6. Application deployment sequence

1. Resolve the Vercel 2FA case before any Production action.
2. Push and review the documentation-only commit through the normal branch process.
3. Identify one exact, immutable commit containing the approved runtime and policy documents.
4. Confirm that exact commit is approved before merge or deployment.
5. Confirm the documentation-only commit changes no runtime behavior.
6. Re-run the full validation gate on the exact proposed Production commit.
7. Merge through the protected, reviewed `main` process. Do not force-push, rewrite history, or promote `release/v1.1` directly.
8. Confirm `main` remains the configured Vercel Production branch.
9. Confirm no release-branch hook automatically promotes Preview to Production.
10. Build the exact approved commit.
11. Apply Production migrations only through the separately authorized database procedure.
12. Deploy only to the linked `poli-smart` Production project.
13. Verify the deployment is classified as Production and uses the approved commit.
14. Verify `polismartafrica.ai` and all approved Production aliases point to the intended deployment.
15. Record the commit, deployment ID, deployment URL, aliases, operator, approver, and timestamps.
16. Do not enable Nigeria Fundraising, payments, or unrelated feature flags.

The Vercel build command is `npm run vercel-build`, which performs Prisma Client generation and the Vite build. It does not automatically run migrations.

## 7. Post-deployment acceptance

Use only clearly synthetic Production data and only under separate explicit authorization.

Validate:

- `/` and `/login` load correctly.
- `/api/health` returns HTTP 200 and exactly `{"status":"ok"}`.
- `/api/ready` returns HTTP 200 with only the expected readiness status.
- Existing authenticated routing remains functional.
- Early Access submission succeeds.
- Demo submission succeeds.
- Submission validation and neutral responses remain safe.
- Rate limiting rejects excess submissions.
- Lead records are not publicly listable or retrievable.
- A properly authorized Super Administrator can open `/admin/prelaunch-leads`.
- Campaign Administrators and unauthenticated users are denied before repository access.
- Lead list, detail, request-type filter, country filter, status filter, and ordering work.
- The status workflow supports `NEW → CONTACTED → QUALIFIED → CLOSED`.
- `updated_at` changes appropriately.
- Follow-up creation validates bounded notes and future UTC schedules.
- Follow-up history is chronological and append-only.
- Completion records the server time and authenticated administrator.
- Completed follow-ups cannot be completed twice.
- No edit or delete capability exists for follow-up history.
- Errors reveal no SQL, Prisma internals, credentials, contact data, or notes.
- Contact details and follow-up notes remain excluded from AI, model training, Workspace Search, telemetry content, and URLs.
- No automatic or bulk follow-up email is sent.
- Any existing lead-notification boundary behaves exactly as approved.
- Logs contain only safe structural metadata and request identifiers.
- No payment control, card/bank field, payment-provider integration, or Fundraising enablement appears.
- Nigeria Fundraising remains unavailable.
- Existing application areas and tenant controls pass smoke checks.

Monitor health, errors, authorization denials, database activity, rate limits, and unexpected email behavior for at least 30 minutes after acceptance.

## 8. Rollback decision criteria

Order an immediate stop and rollback assessment for:

- Authentication failure or session-boundary regression.
- Super Administrator authorization failure.
- Campaign Administrator or public access to lead data.
- Repository access occurring after an authorization denial.
- Cross-environment or wrong-database connection.
- Migration drift, partial application, checksum mismatch, or failed migration.
- Data loss, corruption, unexpected count changes, or constraint failure.
- Lead contact or follow-up-note exposure.
- AI, model-training, Workspace Search, logging, or telemetry boundary failure.
- Production health/readiness failure caused by the release.
- Unexpected email, automated outreach, or recipient behavior.
- Incorrect or excessive database grants.
- Runtime use of the migrator credential.
- Any payment or unauthorized Fundraising exposure.
- Unrecoverable operational ambiguity.

## 9. Rollback strategy

Application rollback and database recovery are separate decisions.

### Application rollback

1. Freeze further deployments, migrations, and lead-management writes where safely supported and approved.
2. Identify the last verified Production deployment and compatible commit.
3. Confirm it remains compatible with migrations 0011–0013 if those migrations were applied.
4. Prefer Vercel Instant Rollback or an approved redeployment of the known-good commit.
5. Verify Production aliases before confirming rollback.
6. Do not automatically reverse additive database migrations.
7. Do not drop migrations 0011, 0012, or 0013 merely because application code was rolled back.
8. If supported and explicitly approved, isolate or disable affected routes without weakening authentication or exposing data.
9. Validate health, readiness, authentication, authorization, legacy-route absence, unaffected workflows, and data integrity after rollback.
10. Monitor for at least 30 minutes and retain sanitized incident evidence.

### Database recovery

Database recovery is reserved for confirmed corruption or migration damage where a reviewed forward repair is less safe. It requires separate explicit authorization.

1. Declare an incident and freeze relevant writes.
2. Preserve deployment, migration, log, and count evidence without personal data or secrets.
3. Identify the last verified checkpoint and quantify the possible data-loss window.
4. Restore or inspect the checkpoint on an isolated recovery branch first.
5. Validate schema, migration history, counts, constraints, authorization data, and tenant boundaries.
6. Require explicit incident-commander and data-owner authorization before changing Production routing or restoring Production.
7. Reconcile post-checkpoint writes through a separately reviewed process.
8. Retain the former Production branch until recovery acceptance and incident review finish.
9. Never use reset, destructive `db push`, unreviewed reverse SQL, migration-table editing, `DROP`, or `TRUNCATE` as a shortcut.

## 10. Stop conditions

Every stop condition results in **NO-GO**:

- Production target identity cannot be conclusively proven.
- Production and Preview endpoints or URLs are ambiguous.
- Any credential or token is exposed.
- The worktree is dirty.
- The commit differs from the approved release.
- The local and remote histories unexpectedly diverge.
- Preview acceptance remains incomplete.
- Vercel 2FA access remains unresolved.
- Legal approval or retention approval is incomplete.
- Administrator training is incomplete.
- The backup/recovery checkpoint is missing or unverified.
- A failed, partial, drifted, unknown, or checksum-mismatched migration exists.
- Tests, lint, TypeScript, build, audit, or security validation fail.
- Runtime privileges exceed the reviewed scope.
- The runtime and migrator identities are not separated.
- Existing data is incompatible with a constraint.
- Required Production environment names or scopes cannot be verified safely.
- Rollback authority or a compatible known-good deployment is unavailable.
- Payments or Nigeria Fundraising would become enabled.

## 11. Responsibility matrix

| Role | Executes | Verifies | Approval/rollback authority |
|---|---|---|---|
| Platform Owner | Coordinates the release window and operational readiness | Confirms scope, training, evidence, and business readiness | Gives final Production authorization and may order application rollback |
| Release Operator | Performs approved Git and Vercel release steps | Verifies commit, deployment classification, aliases, and status | Cannot self-approve and may halt execution |
| Database Migrator | Performs the authorized preflight and `prisma migrate deploy` | Verifies migration records, objects, counts, and grants | Cannot self-approve recovery and may halt on mismatch |
| Technical Verifier | Runs independent tests, security checks, smoke tests, and monitoring | Confirms authorization, environment isolation, data integrity, and rollback compatibility | Recommends GO, NO-GO, or rollback but does not override owner authorization |
| Privacy/Legal Reviewer | Reviews notices, lawful basis, retention, suppression, deletion, and jurisdictional enablement | Confirms approved policy language and unresolved legal conditions | Approves legal/privacy gates and may require NO-GO or suspension |
| Super Administrator | Performs authorized operational acceptance using synthetic data | Confirms lead review and follow-up behavior from the user perspective | May halt acceptance and report defects but cannot authorize deployment or database recovery |

No role may solely execute and approve a high-risk Production migration or database recovery.

## 12. Evidence checklist

Retain the following without credentials, complete database URLs, or personal lead data:

- [ ] Exact approved commit and subject.
- [ ] Branch and protected-merge evidence.
- [ ] Full test, lint, TypeScript, build, audit, and security results.
- [ ] Preview acceptance results.
- [ ] Legal/privacy approval and approved retention version.
- [ ] Administrator-training confirmation.
- [ ] Masked Production project, branch ID, endpoint fingerprint, database, and role.
- [ ] Pre-migration schema and migration status.
- [ ] Safe aggregate lead/follow-up counts or fingerprints.
- [ ] Backup/checkpoint confirmation.
- [ ] Applied migration names and completion status.
- [ ] Post-migration object, constraint, index, and privilege results.
- [ ] Vercel deployment ID, environment, commit, and alias verification.
- [ ] Authentication and authorization results.
- [ ] Public submission and rate-limit results.
- [ ] AI/Search, logging, email, payment, and Fundraising boundary results.
- [ ] Monitoring window and outcome.
- [ ] Any rollback decision, rationale, approver, operator, and timestamps.

## 13. Final go/no-go checklist

The release remains **NO-GO** unless every item is checked:

- [ ] Vercel 2FA restored.
- [ ] Preview Step 2B.9 passed.
- [ ] Legal/privacy review completed.
- [ ] Retention periods approved.
- [ ] Administrator training completed.
- [ ] Exact Production commit approved.
- [ ] Worktree clean and release history verified.
- [ ] Complete validation suite passed.
- [ ] Production identity verified by branch name and immutable ID.
- [ ] Preview target conclusively excluded.
- [ ] Migration history healthy.
- [ ] Backup/recovery checkpoint confirmed.
- [ ] Pending migrations reviewed and compatible.
- [ ] Runtime privileges approved and least-privileged.
- [ ] Production configuration metadata verified.
- [ ] Rollback candidate and authorities confirmed.
- [ ] Explicit written Production authorization received.

Current decision: **NO-GO**.

# PoliSmart Africa AI Operations Runbook

Production: `https://polismartafrica.ai`

This runbook covers routine operation of Vercel, Neon PostgreSQL/pgvector, OpenAI, private Vercel Blob storage, Resend, and any managed Redis or job service. Never paste secret values, raw campaign documents, respondent data, session cookies, or personal information into tickets or chat.

## Ownership and access

Assign an on-call primary and secondary. Maintain named, MFA-protected operator accounts; do not share accounts. Keep production access limited to authorized Sentinel LLC operators. Record changes in the release log and application audit log. The application runtime role should not be a database superuser, create roles/databases, or bypass row-level security.

## Monitoring and alerts

Use an external HTTPS monitor against `/api/health` every minute and `/api/ready` every five minutes. Both endpoints are intentionally minimal and contain no infrastructure details. Require three consecutive failures from at least two regions before paging, except confirmed TLS/DNS failure, which pages immediately.

Detailed `/api/metrics` access requires a valid session, `X-Organization-Id`, and `platform-audit:read`. Do not place authenticated cookies in third-party uptime tools. Use Vercel, Neon, Blob, OpenAI, Resend, Redis/job-provider dashboards and tenant-scoped governance records for detailed telemetry.

| Signal         | Source                            | Warning                             | Critical                                |
| -------------- | --------------------------------- | ----------------------------------- | --------------------------------------- |
| Availability   | external monitor                  | two failures/5 min                  | three failures or TLS/DNS failure       |
| API errors     | Vercel structured logs            | 5xx >1% for 5 min                   | >5% for 5 min                           |
| Slow APIs      | Vercel logs `durationMs`          | p95 >750 ms for 10 min              | p95 >2 s for 5 min                      |
| AI failures    | `ai_error_reports`, OpenAI status | >2% for 10 min                      | >10% or total outage                    |
| AI usage       | `ai_usage_logs`, OpenAI usage     | 70% daily/monthly budget            | 90% budget                              |
| AI cost        | OpenAI project budget             | 70% projected budget                | 90% or anomalous 2× daily baseline      |
| Database       | Neon metrics and `/api/ready`     | connections >70%, p95 query >500 ms | >90%, storage >90%, unavailable         |
| Storage        | Vercel Blob usage/errors          | 70% quota or >1% errors             | 90% quota or >5% errors                 |
| Jobs           | job provider/dead-letter queue    | oldest job >5 min or 3 retries      | oldest >30 min or growing DLQ           |
| Authentication | audit logs and 401/429 logs       | 5× baseline failed logins           | credential stuffing across accounts/IPs |

The current application records request IDs, status, path, and duration as structured logs; AI usage/errors and security audit events are append-only. Provider-side token and cost totals remain authoritative for billing. Never estimate cost from response text length.

### Daily review

- Availability, TLS expiry, 5xx rate, latency, failed logins, AI failures, budget, database/storage utilization, and failed jobs.
- Check Vercel/Neon/OpenAI/Blob/Resend status pages during correlated failures.
- Review AI safety flags, ungrounded/missing-data answers, reported answers, and unexpected model changes.

### Weekly review

- Trend p50/p95/p99 latency and error rates by endpoint.
- Review tenant-scoped audit exceptions, role changes, storage growth, database slow-query report, unused indexes, connection saturation, AI cost per tenant/feature, and rate-limit events.
- Confirm the most recent automated backup succeeded and is restorable.

## Backup verification

Enable Neon point-in-time recovery appropriate to the plan and retain a release checkpoint before every migration. Keep private Blob versioning/retention or a separate encrypted backup according to policy. Raw Afrobarometer source files remain outside deployment bundles and need an integrity-checked protected copy.

Monthly, restore the latest backup to an isolated recovery branch—not production—and run:

```bash
npm ci
npm run db:generate
npm run db:validate:production
npm test
```

Verify record counts, tenant-consistency checks, pgvector, indexes, a sample approved document reference, and an aggregate intelligence query. Record backup timestamp, restore duration, recovery-point gap, validator output, operator, and deletion date for the recovery branch. Quarterly, conduct a timed full restore exercise. Target RPO: 15 minutes; target RTO: 60 minutes, subject to the purchased Neon plan.

## Normal deployment

1. Review the change, dependencies, security impact, and migrations.
2. Run `npm ci`, `npm run format:check`, `npm run check`, `npm test`, and `npm run build`.
3. Review every pending migration; reject drops, truncation, destructive column changes, or unplanned rewrites.
4. Create and record a Neon checkpoint/restore branch.
5. Deploy a Vercel Preview with separate preview resources and run the acceptance journey.
6. Run `npx prisma migrate status`, `npm run db:validate:production`, then `npm run db:migrate` from the controlled release environment.
7. Run database validation again, promote the accepted immutable Vercel deployment, then verify `/api/health`, `/api/ready`, HTTPS, login, tenant isolation, AI grounding, uploads, intelligence, policy, events, and audit logs.
8. Watch error, latency, database, storage, and AI metrics for at least 30 minutes. Record the deployment ID and migration state.

Afrobarometer import is never part of deployment. Run it only after mapping approval with `npm run import:afrobarometer:production`.

## Emergency rollback

1. Declare the incident, freeze deployments and migrations, and appoint an incident commander.
2. Roll back application code by promoting the last known-good immutable Vercel deployment.
3. Do not run `prisma migrate reset`, `db push`, table drops, or truncation.
4. If the database is compatible, leave it forward-migrated and prepare a forward fix.
5. If data/schema corruption requires restore, follow the database procedure below before reopening writes.
6. Validate health and the critical journey, monitor for 30 minutes, and document the decision and impact.

## Database restore

1. Put affected workflows into maintenance/read-only mode and preserve logs.
2. Select the last verified Neon restore point before the incident.
3. Restore to a new isolated Neon branch; never overwrite production first.
4. Set `DATABASE_URL` only in the controlled validation environment and run `npm run db:validate:production`.
5. Reconcile writes after the restore point with an approved, auditable procedure.
6. Run tenant isolation, authentication, aggregate-data, and critical-journey tests.
7. Switch production only after two-person approval. Retain the former branch until the incident closes.

See `DATABASE_OPERATIONS.md` for logical backup and forward-migration details.

## AI-provider outage

- Confirm the OpenAI status and distinguish provider failure from database/retrieval failure.
- Keep deterministic campaign operations available. Return the safe provider-unavailable response; do not silently substitute an unapproved model or fabricate an answer.
- Disable AI entry points with an operational feature flag if retries amplify the outage. Preserve approved knowledge and aggregate APIs.
- Apply bounded exponential backoff only to safe, idempotent jobs. Do not automatically retry interactive generation indefinitely.
- Queue no sensitive prompts outside approved infrastructure. Communicate degraded status and recovery updates.
- Re-enable gradually, test a grounded answer with citations, and review cost/error spikes.

## Key rotation

Rotate `AUTH_SECRET`, `OPENAI_API_KEY`, database credentials, `BLOB_READ_WRITE_TOKEN`, email key, Redis credentials, and operator tokens on compromise, staff departure, or the established schedule. Use provider dashboards/Vercel environment variables—never source control.

1. Create a replacement credential with least privilege.
2. Add it to Preview and validate.
3. For services supporting overlap, add the new production credential, redeploy, verify, then revoke the old credential.
4. `AUTH_SECRET` rotation invalidates existing sessions; schedule it, notify users, and verify login/reset afterward.
5. Database rotation should use a new restricted role/credential and connection pool, then revoke the old role after connections drain.
6. Record only key identifier, owner, created/revoked times, and validation result—never the value.

## Incident response

Severity: SEV-1 for security compromise, cross-tenant exposure, destructive data loss, or total outage; SEV-2 for major degraded workflows; SEV-3 for limited defects.

1. Detect and open an incident record with time, symptoms, request IDs, and reporter.
2. Assign incident commander, operations lead, security lead, and communications owner.
3. Contain: revoke compromised keys/sessions, disable affected integrations/features, block abusive traffic, or promote a known-good deployment.
4. Preserve Vercel, database, provider, and audit evidence with access controls. Do not edit append-only logs.
5. Assess affected tenants/data and meet applicable notification obligations with counsel/compliance.
6. Recover using tested rollback/restore procedures; validate tenant isolation and critical workflows.
7. Communicate factual status without exposing security details.
8. Close only after monitoring stabilizes. Complete a blameless review within five business days with owners and deadlines.

## Troubleshooting

- **Domain/TLS:** check apex A/CNAME, `www` canonical redirect, Vercel domain status, CAA, and certificate issuance. Never bypass a certificate warning.
- **503 readiness:** inspect Vercel logs by request ID, then Neon connectivity/migrations and OpenAI configuration. Public readiness intentionally omits dependency details.
- **Database exhaustion:** inspect Neon active connections/slow queries, confirm pooled URL, stop retry storms, and scale compute/pooling if sustained.
- **Upload failure:** check private Blob quota/token scope, file validation, provider status, and `processing_status`; never make the bucket public.
- **AI failure:** correlate `ai_error_reports`, request ID, OpenAI status, model availability, rate limits, and budget. Preserve “no supporting data” behavior.
- **Authentication spike:** compare failed-login rate, IP hashes, targeted accounts, 429 responses, and role changes. Revoke sessions/keys when compromise is suspected.
- **Slow API:** group structured logs by path and request ID; inspect database query plan/index use before increasing capacity.
- **Failed jobs:** pause poison messages, inspect safe error metadata, retry only idempotent jobs, and maintain a dead-letter queue with alerting.

## Scaling indicators

Scale database compute/pooling when connection use or CPU exceeds 70% for 15 minutes, p95 database latency exceeds 500 ms after query/index tuning, or storage/IO growth threatens the 30-day forecast. Scale application concurrency when p95 API latency exceeds 750 ms with healthy dependencies, queue time rises, or sustained utilization exceeds 70%.

Add shared Redis-backed rate limits and durable job/realtime infrastructure before horizontal traffic growth; process memory is not globally consistent across Vercel instances. Scale Blob/storage tier before 70% quota and set lifecycle/retention rules. Raise AI budgets only after reviewing cost per successful grounded answer, tenant/feature outliers, cache/retrieval opportunities, and business approval. Never relax safety, grounding, tenant isolation, or minimum-sample safeguards to gain throughput.

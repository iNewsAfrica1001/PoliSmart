# PoliSmart Africa AI Production Checklist

Audit date: 2026-08-23  
Release status: **NOT READY FOR DEPLOYMENT — environment verification blockers remain**

## Automated quality gates

- [x] Prettier formatting check
- [x] ESLint with zero warnings
- [x] Strict TypeScript check
- [x] Unit and service tests
- [x] Express integration and tenant-isolation tests
- [x] Authorization and RBAC tests
- [x] Responsible-AI and append-only audit tests
- [x] Static database migration ordering, required-table, constraint, index, and immutable-trigger tests
- [x] Prisma schema validation
- [x] Afrobarometer inspection, weighting, rejection, mapping, safeguard, and idempotency tests
- [x] AI grounding, citation, missing-data, provider-failure, rate-limit, and prohibited-use tests
- [x] Dependency audit: zero known vulnerabilities
- [x] Production client build
- [x] Browser verification of the PoliSmart login experience and accessible error state
- [ ] Apply all migrations to a clean PostgreSQL database
- [ ] Roll back/restore migration rehearsal using a disposable production-equivalent database
- [ ] Database-backed API journey test
- [ ] Authenticated browser E2E journey
- [ ] Live OpenAI provider contract test with a restricted test credential

## Critical defect corrections from this audit

- Removed legacy `src/App.jsx` and `src/main.jsx`; extensionless resolution had caused the production build to serve the pTech/DigitalBridge UI instead of PoliSmart.
- Added the missing organization invitation path for already registered users. Invitations are tenant-scoped, create `INVITED` memberships, and emit an audit event. Role assignment activates the membership and emits a permission-change event.
- Production readiness now requires both JWT and session secrets to meet the minimum length.
- Production readiness now checks actual PostgreSQL connectivity, not merely the presence of `DATABASE_URL`.
- Corrected remaining formatting failures.
- Corrected outdated DigitalBridge service branding in runtime health and shutdown messages.

## Requested journey coverage

| Journey step                         | Evidence                                                                     | Status                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Register/Login                       | Authentication service tests; browser login and accessible error-state check | Partial: real DB E2E blocked                                |
| Create Organization                  | Registration transaction test coverage and schema constraints                | Automated service coverage                                  |
| Create Campaign                      | Tenant-scoped campaign repository/integration tests                          | Passed                                                      |
| Invite User                          | Tenant-scoped invited-membership test added during audit                     | Passed at repository level                                  |
| Assign Role                          | Server-side permission test and audited activation path                      | Passed                                                      |
| Upload/Process Document              | Upload permission, validation, extraction/chunking, failure tests            | Passed                                                      |
| Ask AI / cited answer                | Grounding, authorization, citations, failure, rate-limit tests               | Passed with mocked provider                                 |
| Afrobarometer Intelligence           | Aggregate-only API, weighting, sample safeguard, idempotency tests           | Passed; source question mappings remain intentionally empty |
| Policy project / AI draft / approval | Ordered workflow, evidence gate, AI disclaimer, approval tests               | Passed with mocked provider                                 |
| Event / volunteer assignment         | Tenant/reference validation and API integration tests                        | Passed                                                      |
| Executive brief                      | Deterministic brief and bounded aggregate query-plan tests                   | Passed                                                      |
| Audit-log review                     | Tenant scope and append-only trigger tests                                   | Passed statically; DB trigger execution blocked             |

## Security findings

- No known npm dependency vulnerabilities were reported.
- Server-side RBAC and tenant isolation tests pass.
- Respondent-level Afrobarometer records remain outside dashboards and AI context.
- Six prohibited political-use categories are blocked by server-side safeguards.
- AI and security audit records are append-only by repository design and PostgreSQL triggers.
- No autonomous communications publishing endpoint exists.
- Production secrets and a reachable database are now readiness requirements.

## Performance findings

- The command-center snapshot uses a bounded 13-query transaction and aggregate survey tables.
- Public intelligence queries are indexed, limited, suppressed by minimum sample size, and never scan the raw CSV.
- AI rate limiting currently uses process memory. Before horizontal scaling, configure a shared Redis-backed limiter.
- Governance prompt-template registration performs multiple queries per new template version; monitor during load testing.
- Media imports currently process up to 100 items sequentially. Benchmark against expected provider volume before enabling scheduled ingestion.
- No production database load or query-plan analysis could be performed without PostgreSQL.

## Deployment blockers

1. PostgreSQL/Docker is unavailable in the audit environment and `DATABASE_URL` is unset. Migrations, database triggers, seeds, indexes, and the full transactional journey remain unexecuted against a real database.
2. `OPENAI_API_KEY` is unset. Live provider compatibility, latency, quota, and structured-output behavior remain unverified.
3. Authenticated browser E2E cannot proceed until the database is migrated and seeded.
4. A shared Redis-backed rate limiter is required before running more than one application instance.
5. Afrobarometer question mappings are intentionally empty pending an authoritative Round 9 codebook; public-intelligence screens correctly return no invented indicators.

## Required release rehearsal

```powershell
Copy-Item .env.example .env
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run import:afrobarometer
npm run verify:prod
npm run server
npm run smoke
```

After PostgreSQL and the restricted OpenAI test credential are configured, rerun the complete authenticated browser journey and record the migration IDs, test output, query timings, and approval/audit record IDs before deployment approval.

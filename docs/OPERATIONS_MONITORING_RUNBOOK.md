# PoliSmart Africa AI V1 Operations Monitoring and Incident Runbook

Production: `https://polismartafrica.ai`

This is the operational monitoring standard for PoliSmart Africa AI V1. It uses the
application's existing structured logs and governance records together with Vercel, Neon,
Microsoft 365/Microsoft Graph, OpenAI, and the configured private storage service. It does not
authorize database, provider, secret, or infrastructure changes.

## 1. Ownership and operating principles

- The primary on-call responsibility belongs to an authorized SentinelAI LLC / PoliSmart Africa
  AI administrator. Additional authorized administrators may be added later as secondary on-call,
  incident commander, or security escalation contacts. Use named, MFA-protected operator accounts;
  never share production accounts.
- Route initial operational alerts to `support@polismartafrica.ai`. This is a support and alert
  destination only. `no-reply@polismartafrica.ai` remains the transactional/authentication sender
  and must not be replaced by the support address. Record the escalation order, acknowledgement
  target, and additional service owners in the private operations register—not this public
  repository.
- Correlate incidents with the application `X-Request-Id`, deployment ID, time window, route,
  status, provider, and safe error code. Do not copy request bodies into operational tickets.
- The application's audit and AI-governance records are protected operational evidence. Do not
  edit them to close an incident.
- Use least-privilege runtime access. Monitoring must not require changing Neon roles,
  application authorization, or tenant isolation.
- Keep alert thresholds under monthly review. The starting thresholds below are operational
  defaults, not contractual service levels.

## 2. Monitoring sources

| Concern                               | Primary source                                           | Corroborating source                                       |
| ------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Availability, HTTPS, latency, 5xx     | independent HTTPS checks and Vercel observability/logs   | domain/DNS and certificate checks                          |
| Authentication and authorization      | route/status/request-ID logs and protected audit records | controlled authentication smoke test                       |
| AI availability, grounding, citations | protected AI usage/error records and Vercel logs         | OpenAI status and project usage/rate-limit views           |
| Database availability and capacity    | Neon monitoring                                          | minimal readiness check and sanitized application failures |
| Verification and password-reset email | structured transactional-email failure logs              | Microsoft 365 message trace and Graph service health       |
| Private object storage                | configured provider usage/error views                    | document-processing failure records                        |

Do not send authenticated cookies, database credentials, API keys, or production content to an
uptime service. Provider dashboards remain authoritative for provider usage and delivery status.

## 3. Availability and critical API checks

Monitor from outside the Vercel deployment network where practical.

| Check                                   | Frequency | Expected result                        | Alert                                                               |
| --------------------------------------- | --------- | -------------------------------------- | ------------------------------------------------------------------- |
| `https://polismartafrica.ai/`           | 5 minutes | HTTPS 200 and valid certificate        | three consecutive failures; immediate for confirmed DNS/TLS failure |
| `https://polismartafrica.ai/api/health` | 5 minutes | HTTP 200 and exactly `{"status":"ok"}` | three consecutive failures from two locations                       |
| `https://polismartafrica.ai/api/ready`  | 5 minutes | HTTP 200 and only a readiness status   | two consecutive 503 responses                                       |
| Critical API aggregate                  | 5 minutes | 5xx below threshold                    | warning above 1% for 5 minutes; critical above 5% for 5 minutes     |
| HTTPS certificate                       | daily     | valid hostname and chain               | warn at 30 days; P1 if invalid or expired                           |

`/api/health` is liveness-only. It must remain public and minimal and must not disclose database,
provider, environment-variable, deployment, host, or dependency details. `/api/ready` performs
server-side readiness checks but also returns only `ready` or `not-ready`. Detailed
`/api/metrics` requires an authenticated session and `platform-audit:read`; never place its
session cookie in a third-party monitor.

For authenticated synthetic checks, use a dedicated controlled test organization and minimum
role. Store its credentials only in the approved monitor's secret store. At minimum after a
release, verify login, campaign selection, one grounded intelligence request, logout, and denial
of the protected route after logout. Do not create production campaign records in continuous
checks.

## 4. Application, authentication, and authorization monitoring

Application request logs contain timestamp, request ID, method, path, status, and duration. They
do not contain request bodies. Create saved queries or equivalent alerts for:

- HTTP 5xx count, rate, route, deployment, and first/last request ID;
- unexpected exceptions and repeated malformed requests;
- p95 route duration above 750 ms for 10 minutes, and above 2 seconds for 5 minutes;
- repeated 401, 403, and 429 responses compared with the normal time-of-day baseline;
- `LOGIN_FAILED` audit events, especially a fivefold increase, distributed account attempts from
  one origin, or attempts across many origins against one account;
- verification confirm/resend failures and password-reset request/confirm failures by route and
  safe status—never by token, password, or full request body;
- role-change activity, denied role transitions, and any attempted Super Administrator
  assignment outside the authorized Super Administrator workflow;
- persistence failures on campaign, policy, event, volunteer, document, and approval operations.

Successful logins and failed logins are auditable. A 401 or 403 can be normal; severity depends
on volume, distribution, and whether legitimate users are broadly affected. Do not weaken login,
verification, rate-limit, origin, session, or role checks during diagnosis.

## 5. AI monitoring

Use protected AI usage/error records plus OpenAI's project status, rate-limit, token, and budget
views. Monitor:

- provider failure, timeout, 429/rate-limit, and unavailable-model errors;
- grounded-query failure rate above 2% for 10 minutes (P2 investigation) or above 10%/total
  outage (P2, escalating to P1 if it blocks the core service broadly);
- grounded answers with zero citations or citation/source identifiers inconsistent with the
  retrieved evidence;
- insufficient-evidence responses as a quality trend, not automatically a provider fault;
- abnormal token/cost growth against owner-approved warning and critical limits. Warning alerts
  must arrive before a provider limit could disrupt service. Dollar limits are owner-defined and
  are not set in this repository. A warning triggers review and escalation, not automatic
  production shutdown;
- responsible-AI safety flags and reported/incorrect-answer feedback trends.

The application stores a one-way hash of AI input in governance logging, along with provider,
model, status, generated-output reference, safety flags, and grounding metadata. Operational logs
must not duplicate raw prompts, campaign documents, respondent-level survey data, or complete AI
responses. Authorized conversation content is application data and remains subject to tenant
authorization and the approved retention policy.

Observed Data and AI Interpretation must remain visibly distinct. A missing citation on a
grounded factual answer is an operational quality failure; the safe response when evidence is
insufficient is to say so rather than invent evidence.

## 6. Database monitoring

Use Neon monitoring as the primary source for compute availability, connection utilization,
storage, query latency, and provider incidents. Correlate it with `/api/ready` and sanitized
application failures.

- Warn at 70% sustained connection utilization; P1 at 90%, connection exhaustion, or database
  unavailability affecting production.
- Warn when p95 query duration exceeds 500 ms for 10 minutes. Investigate route/query plans
  before adding capacity or indexes.
- Alert on authentication, TLS, timeout, connection acquisition, transaction, and persistence
  errors using error class/code only. Never log a database URL or host credentials.
- Review storage growth weekly and alert at the approved plan's 70% and 90% thresholds.
- Perform quarterly non-destructive recovery validation using Neon recovery/branch capabilities.
  Restore only to an isolated recovery branch—never overwrite the production branch. Verify that
  the database is accessible and that the expected production structure is present using
  read-only checks. Do not expose credentials in commands, output, logs, or evidence records.

Monitoring does not authorize privilege changes. The application continues to use its
least-privilege runtime identity; migrations require the separately controlled migration
identity and the documented recovery/change-control gate.

## 7. Microsoft Graph email monitoring

Monitor structured `transactional-email-failed` events by provider, safe error code, HTTP status,
retry-after value, and Microsoft request ID. The implementation does not log Graph access tokens,
client secrets, recipient addresses, or message bodies in those events.

- P2: verification or password-reset delivery failures are widespread, Graph is unavailable, or
  token acquisition/authorization fails across the service.
- P3: one isolated mailbox or recipient rejects a message without broader impact.
- Correlate `GRAPH_RATE_LIMIT`, `GRAPH_FORBIDDEN`, `GRAPH_UNAUTHORIZED`, mailbox-not-found,
  network-timeout, and provider-service codes with Microsoft 365 service health.
- Microsoft Graph HTTP 202 means the request was accepted for processing. It does **not** prove
  inbox delivery. Use Microsoft 365 message trace for final delivery, filtering, deferral, or
  rejection investigation.
- After a release and at least weekly, use a controlled test account to validate one verification
  email and one password-reset email, including the single-use links. Preserve anti-enumeration.

## 8. Security-safe logging standard

Allowed operational fields are: timestamp, severity, event name, request ID, safe provider name,
safe error code, HTTP status, route template, duration, deployment ID, tenant/user opaque ID when
authorized, counts, citation count, source opaque IDs, and token/cost totals from the provider.

Never log or put into alerts/tickets:

- passwords or password hashes;
- session cookies, authorization headers, CSRF values, reset tokens, or verification tokens;
- Microsoft Graph access tokens, application secrets, or complete provider error bodies;
- OpenAI keys or other provider/storage secrets;
- `DATABASE_URL`, `MIGRATION_DATABASE_URL`, passwords, or credential-bearing host strings;
- raw request bodies, respondent-level Afrobarometer records, private documents, or sensitive AI
  prompts unless separately authorized for a specific investigation.

Keep production stack traces out of client responses. Return a generic error plus request ID;
retain only sanitized diagnostics in protected server logs. If secret exposure is suspected,
treat it as P1: contain access, preserve evidence, rotate through change control, and review logs
for secondary exposure.

## 9. Alert severity and response targets

| Severity | Definition                                                                                                                            | Examples                                                                                                               | Response                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| P1       | Production unavailable, authentication broadly broken, database unavailable, data/security incident, or critical authorization bypass | domain/TLS outage, broad login failure, cross-tenant access, Super Administrator escalation, confirmed secret exposure | page immediately; appoint incident commander; contain before routine work |
| P2       | Major feature degraded without total platform loss                                                                                    | AI provider unavailable, widespread email failure, uploads or a core workflow broadly failing                          | alert on-call; assess promptly; publish operator status updates           |
| P3       | Minor UI or isolated operational issue                                                                                                | isolated recipient failure, non-blocking presentation defect, low-volume endpoint error                                | triage in normal operations; track owner and due date                     |

Escalate severity whenever scope, data integrity, security, or user harm is uncertain. Downgrade
only with evidence.

## 10. Incident runbook

### Detect

1. Acknowledge the alert and record start time, monitor, first request ID, affected deployment,
   and observed scope.
2. Confirm the symptom from a second safe signal. Do not repeatedly exercise a failing write
   operation.
3. Assign severity, incident commander, communications owner, and technical lead.

### Assess

1. Identify affected tenants, routes, region, deployment, provider, and start time using safe
   metadata.
2. Check recent Vercel deployments and configuration-change records, Neon health, Microsoft 365
   service health, OpenAI status/usage, and storage status.
3. Determine whether confidentiality, integrity, availability, authentication, authorization,
   email, or grounding is affected. Preserve logs and audit records.

### Contain

1. Freeze deployments, migrations, imports, role changes, and secret changes unrelated to the
   incident.
2. For a security incident, restrict the affected pathway or account using an approved reversible
   control. Do not weaken tenant isolation or authentication.
3. For an AI outage, return controlled provider-unavailable or insufficient-evidence responses;
   never silently substitute invented data.
4. For email failure, preserve registration/reset anti-enumeration and do not bypass verification.

### Recover

1. Prefer the smallest reviewed fix. If the current application release caused the incident and
   the database remains compatible, promote the last known-good immutable Vercel deployment.
2. Do not use `prisma migrate reset`, destructive `db push`, drops, truncation, or blind migration
   rollback. Prefer a reviewed forward fix.
3. Restore from Neon only for confirmed data/schema corruption, with incident-commander and data
   owner approval, a documented recovery point, isolated validation, and a controlled write
   freeze.
4. Rotate a credential only when exposure or provider policy requires it; update the secret store,
   redeploy, validate, and revoke the old credential without printing either value.

### Validate

1. Verify production HTTPS, `/api/health`, `/api/ready`, and the affected feature.
2. For authentication incidents, test registration/verification as relevant, login, logout,
   protected-route denial after logout, tenant isolation, and prohibited role transitions.
3. For AI incidents, test grounded data retrieval, Observed Data/AI Interpretation separation,
   valid citations, country grounding, weighting, and sample safeguards.
4. For email incidents, verify Graph acceptance and then inbox/message-trace outcome.
5. Observe error, latency, database, and provider signals for at least 30 minutes before closure.

### Document

Record the timeline, scope, impact, safe request/deployment IDs, cause, containment, recovery,
validation evidence, operator communications, and follow-up owners. Complete a blameless review
for P1/P2 incidents and track corrective actions. Never copy secrets or raw sensitive payloads
into the incident record.

## 11. Decision guides

### Roll back the application when

- the incident began with a deployment;
- the prior deployment is known good; and
- the current database schema/data remains backward compatible.

Do not roll back merely to mask a provider or database incident, and never reverse an applied
migration without a separately reviewed recovery plan.

### Restore the database when

- data or schema corruption is confirmed;
- a known recovery point exists;
- forward repair is riskier than restore; and
- the incident commander and data owner approve the recovery window and data-loss impact.

Connection failures, provider outages, and application regressions alone are not reasons to
restore the database.

## 12. Routine readiness schedule

- **Daily:** availability, HTTPS, 5xx, latency, authentication anomaly, AI/provider failure,
  grounding/citation failure, email failure, database availability, and storage/cost exceptions.
- **Weekly:** controlled authentication/email smoke test; AI grounding sample; database connection
  and slow-query trends; access and role-change review; budget/quota trends.
- **Monthly:** incident-contact review; alert-threshold tuning; log-retention and redaction sample;
  credential-age review.
- **Quarterly:** non-destructive Neon recovery-branch validation, including database accessibility
  and expected-structure checks. Record the recovery point, isolated branch, outcome, operator,
  and cleanup decision without recording credentials.
- **After every production release:** critical journey smoke test, error/latency/provider review,
  and at least 30 minutes of heightened observation.

## 13. Activation checklist

The application monitoring and incident procedures are ready. The following external operational
setup decisions must be recorded privately:

- **External uptime monitor configuration: owner action required.** Configure an independent
  external HTTPS monitor for the production homepage and public `/api/health` endpoint at a
  five-minute interval. Confirm its check locations and alert delivery; do not claim that checks
  are active until the external service shows successful results.
- The initial alert destination is `support@polismartafrica.ai`. Add an authorized secondary
  administrator, incident commander, security contact, and escalation order when selected.
- Configure provider budget/usage warnings for OpenAI and applicable paid production
  infrastructure providers. **Provider budget thresholds: owner action required.** Select the
  dollar limits in each provider's protected management console so warning alerts arrive before
  service disruption. Do not automatically disable production solely because a warning threshold
  is reached.
- Schedule and record the quarterly Neon recovery validation. The exercise must use an isolated
  recovery branch, remain non-destructive, confirm database accessibility and expected production
  structure, and never expose credentials.

No payment-processing or Reports monitoring is required in V1 because those capabilities remain
Coming Soon and are not operational dependencies.

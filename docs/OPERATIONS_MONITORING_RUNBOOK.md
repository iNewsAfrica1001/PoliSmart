# PoliSmart Africa AI V1 Operations Monitoring and Incident Runbook

Production: `https://polismartafrica.ai`

Last repository verification: `2026-09-26`

Accepted Production application commit:
`4190166c99ed425a00191516fb443d8306341354`

This is the operational monitoring standard for PoliSmart Africa AI V1. It uses the
application's existing structured logs and governance records together with Vercel, Neon,
Microsoft 365/Microsoft Graph, OpenAI, and the configured private storage service. It does not
authorize database, provider, secret, or infrastructure changes.

## 1. Ownership and operating principles

- The required ownership roles are **Incident Lead**, **Application Operator**, **Database
  Operator**, and **AI/Application Verification Owner**. The Platform Owner explicitly assigned
  all four roles to **Dr. Michael Omoruyi** on `2026-09-26`. This is an operational assignment,
  not a shared-login authorization: use named, MFA-protected operator accounts and never share
  production accounts.
- Route operational monitoring and incident alerts to `publisher@inewsafrica.com`. The previously
  documented `support@polismartafrica.ai` destination is superseded and is not an active monitoring
  destination. `no-reply@polismartafrica.ai` remains the transactional/authentication sender and
  must not be changed by monitoring work. Record the escalation order, acknowledgement
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

### Current verified readiness status

| Capability                            | Status                   | Evidence                                                                                                                    |
| ------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Public health endpoint                | IMPLEMENTED AND VERIFIED | `/api/health` is bounded and returns HTTP 200 with `{"status":"ok"}`.                                                       |
| Public readiness endpoint             | IMPLEMENTED AND VERIFIED | `/api/ready` performs a bounded database probe and Production dependency checks and returns only `ready` or `not-ready`.    |
| Structured request/5xx logging        | IMPLEMENTED              | Timestamp, request ID, method, path, status, and duration are emitted; request bodies are excluded.                         |
| Authentication/security audit logging | IMPLEMENTED              | Login failures, role actions, and protected governance records are available under authorization.                           |
| AI provider failure telemetry         | IMPLEMENTED              | Provider failures are categorized, sanitized, and recorded in protected AI governance/error records.                        |
| Geographic audit logging              | IMPLEMENTED AND VERIFIED | Controlled import and activation audits are durable and protected.                                                          |
| Transactional-email failure logging   | IMPLEMENTED              | Microsoft Graph/SMTP failures use safe provider categories without secrets or recipient content.                            |
| Vercel deployment/runtime logs        | CONFIGURED               | Runtime telemetry exists; the default all-types rule includes Error Anomaly, but authorized-destination routing is absent.  |
| Neon monitoring                       | CONFIGURED               | Provider monitoring is available; a delivered database alert is not verified.                                               |
| Independent uptime monitor            | PARTIALLY VERIFIED       | Owner confirms UptimeRobot account and delivered tests; domain and health monitors are documented, readiness is unverified. |
| External alert destination            | VERIFIED FOR UPTIMEROBOT | `publisher@inewsafrica.com` is authorized and owner-confirmed test notifications were received.                             |
| Alert delivery test                   | VERIFIED FOR UPTIMEROBOT | Receipt verified by owner; exact timestamps and per-monitor test attribution were not supplied.                             |
| Named escalation roster               | RECORDED                 | Dr. Michael Omoruyi is assigned Incident Lead, Application Operator, Database Operator, and Verification Owner.             |

### Authorized ownership and escalation matrix

| Severity | Primary owner       | Authorized alert destination |
| -------- | ------------------- | ---------------------------- |
| SEV-1    | Dr. Michael Omoruyi | `publisher@inewsafrica.com`  |
| SEV-2    | Dr. Michael Omoruyi | `publisher@inewsafrica.com`  |
| SEV-3    | Dr. Michael Omoruyi | `publisher@inewsafrica.com`  |

Role mapping:

- Incident Lead: Dr. Michael Omoruyi
- Application Operator: Dr. Michael Omoruyi
- Database Operator: Dr. Michael Omoruyi
- AI/Application Verification Owner: Dr. Michael Omoruyi

The Platform Owner authorized publication of this operational destination and ownership mapping.
Private telephone numbers, credentials, delegation evidence, and any future secondary contacts
remain outside this repository.

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

## 2A. Minimum alert architecture

| Condition                   | Signal and source                                                                                     | Detection method                                                                                       | Destination                                                 | Escalation owner    | Verification                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Production unavailable      | External HTTPS status/TLS for canonical homepage                                                      | Independent five-minute check from outside Vercel; alert after the documented consecutive-failure rule | `publisher@inewsafrica.com` — UptimeRobot delivery verified | Dr. Michael Omoruyi | Owner confirmed test receipt; exact timestamp was not supplied.                                                    |
| Health/readiness failure    | HTTP status and minimal JSON from `/api/health` and `/api/ready`                                      | Independent endpoint checks; readiness HTTP 503 indicates a required dependency failure                | `publisher@inewsafrica.com`; readiness monitor unverified   | Dr. Michael Omoruyi | Health monitor and test delivery have owner evidence; verify a distinct readiness monitor and test.                |
| Significant HTTP 5xx        | Vercel structured request logs and deployment metadata                                                | Vercel Error Anomaly rule for the Production project; retain safe route/status metadata only           | `publisher@inewsafrica.com` — Vercel routing not configured | Dr. Michael Omoruyi | Use Vercel Test Notification only after authorized routing is attached; independently verify receipt.              |
| Database dependency failure | Neon availability/connection signals plus `/api/ready` HTTP 503 and sanitized database error category | Independent readiness alert plus supported Neon provider notification                                  | `publisher@inewsafrica.com` — provider routing unverified   | Dr. Michael Omoruyi | Use Neon/provider test notification or an isolated non-Production failure simulation; never disconnect Production. |
| AI-provider degradation     | Protected AI error records, sanitized provider categories, OpenAI status/usage, and Vercel logs       | Saved alert path for sustained failure/rate-limit categories in section 5                              | `publisher@inewsafrica.com` — provider routing unverified   | Dr. Michael Omoruyi | Use provider alert testing or mocked/non-Production detection evidence; do not invalidate the Production key.      |

No alert in this table is considered configured until its provider rule, destination, and enabled
state are verified. No alert is considered verified until the destination receives a real test
notification and the private register records timestamp, source, recipient/roster, and result.

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

## 9. Alert severity model

| Severity | Definition                                                                                                          | Examples                                                                                        | Response                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| SEV-1    | Production unavailable, authentication broadly unavailable, database unavailable, or serious data/security incident | domain/TLS outage, broad login failure, cross-tenant access, confirmed secret exposure          | Alert the named Incident Lead immediately; freeze unsafe changes and contain before routine work.                             |
| SEV-2    | Major feature unavailable or sustained elevated server errors without total Production loss                         | sustained 5xx spike, widespread email failure, uploads or another core workflow broadly failing | Alert the named Application Operator; assess scope and escalate if availability, integrity, or security becomes uncertain.    |
| SEV-3    | Degraded non-core capability while core application remains available                                               | repeated AI-provider failures, isolated recipient failure, non-blocking presentation defect     | Notify the named AI/Application Verification Owner or relevant operator; track evidence and escalate if sustained or broader. |

Escalate severity whenever scope, data integrity, security, or user harm is uncertain. Downgrade
only with evidence.

## 10. Incident runbook

### Detect

1. Record the monitor, timestamp, first request ID, affected deployment, and observed scope.
2. Confirm the symptom from a second safe signal. Do not repeatedly exercise a failing write
   operation.

### Acknowledge

1. Record who acknowledged the alert and when in the private incident register.
2. Assign SEV-1, SEV-2, or SEV-3, plus the Incident Lead, communications owner, and technical
   operators. Do not proceed with unnamed ownership for a SEV-1 event.

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

### Verify

1. Verify production HTTPS, `/api/health`, `/api/ready`, and the affected feature.
2. For authentication incidents, test registration/verification as relevant, login, logout,
   protected-route denial after logout, tenant isolation, and prohibited role transitions.
3. For AI incidents, test grounded data retrieval, Observed Data/AI Interpretation separation,
   valid citations, country grounding, weighting, and sample safeguards.
4. For email incidents, verify Graph acceptance and then inbox/message-trace outcome.
5. Observe error, latency, database, and provider signals for at least 30 minutes before closure.

### Close

1. Close only after the affected service is verified, no unexplained data or authorization change
   remains, and the observation period is complete.
2. Record closure authority, residual risk, and follow-up owners. Do not delete audit evidence or
   change Production data merely to clear an alert.

### Review

Record the timeline, scope, impact, safe request/deployment IDs, cause, containment, recovery,
verification evidence, operator communications, and follow-up owners. Complete a blameless review
for SEV-1/SEV-2 incidents and track corrective actions. Never copy secrets, personal/political
profiles, raw prompts, campaign content, or other sensitive payloads into the incident record.

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

The application monitoring and incident procedures are ready. The authenticated platform review
on `2026-09-26` found:

- Vercel Observability provides Alerts and an **Error Anomaly** trigger for 5xx/4xx route spikes.
  The built-in default rule covers all alert types and enables high-severity Vercel Notifications
  (Web, Email, Push) for subscribed team owners. The current Vercel notification email is
  `no-reply@polismartafrica.ai`, not the authorized monitoring destination. Project alert settings
  expose Vercel Notifications, Slack, and webhook destinations, but no arbitrary project-alert
  email field. Do not change the Vercel account email merely to route this alert.
- Vercel also exposes a benign **Test Alert Anomaly** trigger and **Test Notification** action.
  Do not run either until the authorized destination is visibly attached; provider-reported
  “sent” status is not receipt evidence.
- Neon Monitoring exposes bounded Production compute, connection, query, and storage metrics.
  No configured notification destination or delivered database alert was evidenced.
- The Platform Owner confirmed the existing UptimeRobot account delivered monitoring test
  notifications to `publisher@inewsafrica.com`. Repository evidence identifies separate Production
  domain and health monitors. A separate `/api/ready` monitor and per-monitor test attribution are
  not established; no timestamps were supplied.

Complete and record the following external operational setup:

- **External uptime monitor completion: owner dashboard action required.** In the existing
  UptimeRobot account, preserve the verified domain and health monitors, verify their exact target
  URLs and enabled state, and configure a separate `/api/ready` monitor if it does not exist. Route
  all three to `publisher@inewsafrica.com`. Require HTTP 200; additionally validate the minimal
  expected JSON for health/readiness if safe keyword checks are supported. Send and independently
  confirm a benign test for each monitor, recording provider evidence and timestamp.
- In Vercel **Project Settings → Alerts**, create an **Error Anomaly** rule scoped to Production
  and the `poli-smart` project. Route only sanitized Vercel alert metadata. Vercel Notifications
  currently subscribe team owners at `no-reply@polismartafrica.ai`; this does not satisfy the
  authorized destination. For separate authorization, attach a supported webhook or Slack bridge
  capable of delivering sanitized alerts to `publisher@inewsafrica.com`, or choose another
  provider-supported routing design. Then run the built-in test alert and independently confirm
  receipt.
- In Neon, enable any plan-supported compute/connection/provider notifications for the Production
  branch and route them to the authorized destination. Independently, treat repeated `/api/ready`
  failures as the always-available database-dependency signal. Do not disconnect Production to
  test this path.
- Configure an alert consumer for the application's sanitized AI provider categories (unavailable,
  timeout, authentication/configuration, rate limit, malformed response, and application failure),
  and corroborate with OpenAI status/usage notifications. A mock proves detection only; use the
  provider's benign test-notification mechanism to prove external delivery.
- The active alert destination is `publisher@inewsafrica.com`. UptimeRobot receipt is verified by
  the owner; Vercel, Neon, and AI alert routing and receipt remain unverified. Do not add unapproved
  secondary contacts.
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

### Exact owner completion checklist

- [ ] Select and configure an independent HTTPS monitoring provider.
- [ ] Monitor the canonical homepage, `/api/health`, and `/api/ready` at the documented interval.
- [ ] Attach an authorized external alert destination without storing its credential in Git.
- [ ] Create and enable the Vercel 5xx/error-rate alert using safe route/status metadata only.
- [ ] Create and enable Neon availability/connection-capacity alerts and correlate readiness 503s.
- [ ] Create and enable sustained AI-provider failure/rate-limit alerts using governance and provider signals.
- [x] Record Dr. Michael Omoruyi as Incident Lead, Application Operator, Database Operator, and AI/Application Verification Owner.
- [ ] Record private escalation contacts and escalation order in the approved private system.
- [ ] Send a real test alert from every configured alert source to the destination.
- [ ] Verify human receipt, timestamp, source, and escalation routing in the private register.
- [ ] Recheck that notifications contain no secrets, personal data, political profiles, prompts, campaign content, or credentials.
- [ ] Mark monitoring/alerting readiness complete only after every item above has evidence.

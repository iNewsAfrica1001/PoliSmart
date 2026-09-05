# PoliSmart Africa AI — Version 1.0 Public Release

## Release record

| Field                                    | Value                                            |
| ---------------------------------------- | ------------------------------------------------ |
| Release status                           | **PUBLIC V1 RELEASED**                           |
| Release date                             | August 29, 2026                                  |
| Production domain                        | <https://polismartafrica.ai>                     |
| Verified production commit               | `9352252df84ab92b9bbece49fefd70247fabded5`       |
| Verified Vercel deployment               | `dpl_AmCTuWkdt6mFhPnyEQDdyMwDN9fk`               |
| Deployment state at release verification | READY                                            |
| Final operational review                 | **PASS WITH NON-BLOCKING OBSERVATIONS**          |
| Public V1 launch decision                | **GO WITH DOCUMENTED NON-BLOCKING OBSERVATIONS** |
| P1 blockers                              | 0                                                |
| Automated tests                          | 150/150 PASS                                     |
| Lint                                     | PASS                                             |
| TypeScript                               | PASS                                             |
| Production build                         | PASS                                             |

This record confirms the public Version 1 release of the verified application baseline. Public
onboarding is authorized under the monitoring, incident-response, and change-control procedures
below. New features remain subject to separate review and controlled release.

## Released Version 1 scope

Version 1 includes:

- secure organization-account registration, email verification, login, logout, password recovery,
  and secure sessions;
- organization and campaign onboarding, campaign creation, campaign selection, and campaign
  management;
- AI-assisted political and public-opinion intelligence using approved evidence;
- Afrobarometer-grounded aggregate intelligence and country-grounded AI analysis;
- cited answers that visibly separate **Observed Data** from **AI Interpretation**;
- policy workflows, events, and volunteer operations;
- server-side role-based administration, tenant isolation, and audit/operational controls; and
- production health, monitoring, incident-response, and recovery procedures.

### Deferred features

- **Reports — OUT OF SCOPE FOR V1 / Coming Soon.** Reports are not operational.
- **Payments/Billing — NOT IMPLEMENTED IN V1 / Coming Soon.** Version 1 has no payment processor,
  payment credentials, payment tables, invoices, transactions, or active paid subscriptions.

Neither deferred area is required for registration, onboarding, or another Version 1 workflow.

- **Fundraising — V1.1 / Not Implemented.** Fundraising is not available in the current release.
- **PostgreSQL RLS — Post-V1 / Not Implemented.** It remains a future defense-in-depth item; the
  verified V1 server-side tenant controls remain authoritative.

## Phase B workflow alignment

The deployed Knowledge workflow is:

`Upload → Processing → READY / DRAFT → Authorized Approval → APPROVED → Eligible for grounded AI retrieval`

READY records have processed successfully but are not approved. READY/DRAFT documents remain
excluded from approved-document AI grounding. Approval is never automatic, requires the existing
server-enforced approval permission and explicit positive confirmation, and remains tenant scoped.
APPROVED documents become eligible for relevant, campaign-scoped grounding and citation.

Policy and Communications separate read access from management permission. Their pages may remain
readable while creation, editing, AI-drafting, transition, and approval controls are hidden from a
role without management permission. Media remains monitoring-oriented and has no general-purpose
manual creation requirement in V1.

Release issue status:

- **PB-004 — RESOLVED.** Approved production campaign knowledge was retrieved with citations.
- **PB-008 — CLOSED / P3 MONITORING.** Manual isolated Cancel and Escape tests generated no
  approval request; the incident was not reproduced.
- **DEP-EX-001 — ACTIVE.** The documented temporary dependency exception remains limited to the
  two approved moderate findings and is a post-launch maintenance item.

## AI and Afrobarometer release baseline

The approved aggregate intelligence categories are:

1. `PUBLIC_PRIORITIES`
2. `ECONOMIC_CONDITIONS`
3. `GOVERNMENT_PERFORMANCE`
4. `INSTITUTIONAL_TRUST`
5. `DEMOCRACY`
6. `GOVERNANCE`
7. `CORRUPTION`
8. `PUBLIC_SERVICES`
9. `SECURITY`
10. `CIVIC_PARTICIPATION`
11. `ELECTIONS`
12. `YOUTH`

The verified baseline preserves weighted aggregate results, minimum-sample safeguards, country
grounding, source metadata, and citations. Observed data remains distinct from AI interpretation.
Unsupported claims must not be presented as observations, respondent-level records must not be
sent to the model, and the system must not perform individual political profiling. Afrobarometer
is an independent public research source; its use does not imply ownership, endorsement, or
partnership, and coverage is limited to the cited countries and survey rounds. OpenAI remains a
server-side provider behind the established service abstraction.

## Security baseline

The release preserves these verified controls:

- authentication on protected workflows and secure verification/reset token handling;
- server-side tenant isolation and role enforcement;
- fail-closed authorization when identity, organization, or permission cannot be established;
- Campaign Administrators cannot assign, promote, create, modify, or obtain Super Administrator;
- safe malformed-JSON responses without parser internals;
- a minimal public health response containing no infrastructure or credential details;
- server-side provider credentials and secret-safe logging;
- Microsoft Graph transactional delivery for verification and password-reset messages; and
- no autonomous publication, individualized political manipulation, or sensitive-trait profiling.

## Legal operator and support

**Legal operator:** SentinelAI LLC  
**Business address:** 3204 Pearsall Ave, Bronx, NY 10469, United States  
**Public support:** support@polismartafrica.ai  
**Transactional sender:** no-reply@polismartafrica.ai

The production Privacy Policy and Terms of Service are available at `/privacy` and `/terms` and are
linked from registration. They contain the Version 1 AI disclosure and Afrobarometer attribution.
They must not be represented as attorney-reviewed or attorney-approved. Qualified legal review is
recommended for final jurisdiction-specific provisions.

## Owner-confirmed external operational controls

These controls were recorded from the owner's confirmation and were not changed while creating
this release record:

- independent UptimeRobot monitoring of `https://polismartafrica.ai` and
  `https://polismartafrica.ai/api/health`;
- OpenAI organization monthly spend control: **$50**;
- OpenAI auto-reload: **ON**, with a **$50** monthly auto-reload limit;
- Vercel Pro included infrastructure credit: **$20 per billing cycle**;
- Vercel On-Demand Budget: **$50**, notifications **ON**, Pause Production Deployments **OFF**;
- Neon plan: **Free**, with subscription/billing managed through Vercel; and
- a successfully completed isolated historical Neon recovery-branch validation, with the quarterly
  non-destructive recovery schedule retained.

Warnings should prompt investigation before disruption. They do not authorize automatic shutdown,
destructive database work, or weakened security controls.

## Controlled-user release procedure

### Phase A — Internal owner test

Using one controlled production account, complete and record this journey:

`Homepage → Register or Login → Campaign → AI Intelligence → Policy → Events → Volunteers → Logout`

Confirm HTTPS, authentication, campaign access, authorization, AI grounding/citations, and logout.
Stop the release for any P1 issue. Never include account credentials in the test record.

### Phase B — Small controlled-user group

Invite a small initial group of authorized real users. Do not mass-market the platform during this
phase. Monitor registration and verification failures, login and password-reset failures, AI/provider
errors, HTTP 500 responses, latency, database errors, authorization denials, and any tenant-isolation
signal. Collect support reports through the approved support address.

### Phase C — Expanded public access

Recommend broader promotion only after the controlled group demonstrates stable operation and the
48-hour review has no unresolved P1 finding. Schedule P2 and P3 improvements through normal change
control rather than patching impulsively during the controlled-release watch.

## First 24-hour launch watch

The authorized SentinelAI LLC / PoliSmart Africa AI administrator monitors:

- UptimeRobot checks for the production domain and public health route;
- Vercel production logs, HTTP 5xx events, latency, usage, and budget notifications;
- OpenAI availability, errors, rate limits, usage, and costs;
- Neon availability, connection/persistence errors, and health signals;
- registration, verification email, login, password reset, and logout;
- grounded AI Intelligence, citations, and evidence safeguards; and
- authentication, authorization, tenant-isolation, and other security events.

Escalate immediately for a production outage, broad authentication failure, tenant-isolation
failure, privilege escalation, exposed secret, database corruption, widespread AI failure, or
widespread transactional-email failure. Preserve evidence and do not perform destructive remediation.

## First 48-hour review

At 48 hours, record uptime, production errors, registrations, successful verifications and logins,
AI reliability, citation/grounding behavior, support requests, OpenAI/Vercel usage, Neon stability,
and security events. Classify findings as:

- **P1 — Critical:** immediate release-owner review and containment;
- **P2 — Important but non-critical:** schedule through documented change control; or
- **P3 — Enhancement:** prioritize in the normal product backlog.

An unresolved P1 finding prevents expansion beyond the controlled group.

## Rollback and incident rule

If a critical defect appears:

1. Preserve safe logs, request identifiers, timestamps, and other evidence.
2. Identify the affected workflow and determine whether the cause is application, provider,
   authentication, database, or deployment related.
3. Contain exposure without weakening tenant isolation, authorization, or authentication.
4. Do not reset, truncate, drop, or destructively restore the production database.
5. Prefer rollback to the last verified production deployment when appropriate, preserving the
   existing production environment configuration.
6. Re-run the affected acceptance tests and security checks before restoring normal release status.
7. Document the incident without secrets, tokens, credentials, or connection strings.

The detailed operational and recovery procedures remain in
`docs/OPERATIONS_MONITORING_RUNBOOK.md` and `docs/BACKUP_RECOVERY_RUNBOOK.md`.

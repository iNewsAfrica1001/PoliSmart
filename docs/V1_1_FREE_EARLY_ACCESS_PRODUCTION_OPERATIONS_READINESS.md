# PoliSmart Africa AI V1.1 Free Early Access Production Operations Readiness

**Status:** Readiness record — not Production authorization

**Release candidate:** `8f74988faf10d2809cfaea73cbf6c011fde1a288`

**Authorized branch:** `release/v1.1`

**Legal/jurisdiction status:** PENDING

**Production decision:** NO-GO

This record consolidates the operational preparation for a possible Free Early Access Production
release. It does not authorize a deployment, Preview promotion, database change, migration,
financial feature, or jurisdictional launch. The qualified Legal/Privacy/HR review and explicit
written Production authorization remain separate mandatory gates.

## 1. Production financial-disablement controls

Vercel project metadata shows Production-scoped `BILLING_ENABLED` and
`FUNDRAISING_ENABLED` entries. The Platform Owner recorded both values as `false`. Vercel protects
the stored values from readback. The server accepts only the explicit value `true` as enabled and
otherwise fails closed, so the recorded `false` values are effectively disabled.

Before any Production deployment, an authorized independent verifier must reconfirm the variable
names, Production scope, and recorded false setting without copying values into logs or evidence.
The deployed application must then be checked to ensure Billing and Fundraising navigation,
direct routes, APIs, mutations, payment initiation, contribution processing, and Fundraising
search results are unavailable.

## 2. Monitoring plan

The application already provides:

- public, minimal `/api/health` liveness and `/api/ready` readiness endpoints;
- structured request and provider-failure logging with safe request identifiers;
- Vercel deployment, function-log, error, and latency visibility;
- Neon compute, connection, storage, query, and provider-health visibility;
- protected AI usage and governance records plus OpenAI status and usage views;
- safe Microsoft Graph error classifications plus Microsoft 365 service health and message trace;
- the detailed procedures and thresholds in `OPERATIONS_MONITORING_RUNBOOK.md`.

The minimum Production monitoring plan is:

| Concern                         | Source                                                    | Minimum check                                                   | Escalation condition                                               |
| ------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| Application availability        | Independent HTTPS monitor and Vercel                      | Homepage and TLS every five minutes                             | Repeated failure, invalid TLS, or broad 5xx                        |
| Application health              | Independent HTTPS monitor                                 | `/api/health` every five minutes                                | Three consecutive failures confirmed from a second signal          |
| Readiness/database connectivity | `/api/ready`, Neon, sanitized application errors          | Readiness plus Neon connection/capacity signals                 | Repeated not-ready, connection exhaustion, or persistence failure  |
| Application errors              | Vercel logs/observability                                 | 5xx rate, latency, safe error code, deployment ID               | Error-rate threshold or critical-journey failure                   |
| Authentication                  | Safe route/status logs and audit records                  | Repeated 401/403/429, login and recovery failures               | Broad login failure, abnormal denial pattern, or privilege concern |
| AI provider                     | Protected AI records, Vercel logs, OpenAI views           | Provider failures, timeouts, rate limits, citations, usage      | Sustained provider failure, unsafe grounding, or abnormal usage    |
| Transactional email             | Safe Graph error logs, Microsoft 365 health/message trace | Token, authorization, rate-limit, provider and delivery signals | Widespread verification/reset delivery failure                     |

**External-monitor status:** VERIFIED by the Platform Owner. UptimeRobot has active monitors named
`PoliSmart Africa AI - Production` and `PoliSmart Africa AI - Health`; both were UP at verification,
and alert-contact notification delivery was confirmed. Unrelated monitors in the same external
service are outside the PoliSmart incident scope. This record does not expose monitor credentials
or require a paid monitoring service.

## 3. Alert and escalation ownership

Do not invent or publish personal contacts in the repository. Record named, MFA-protected
operators privately before release.

| Role                       | Current role-based owner                                      | Responsibility                                                                                                                           |
| -------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Platform Owner             | Platform Owner / authorized business owner                    | Owns release decision, business impact, incident severity, communications, and rollback order                                            |
| Technical/Operations owner | Platform Owner or formally designated technical operator      | Acknowledges alerts, investigates safe telemetry, contains technical impact, and executes an authorized rollback                         |
| Security escalation        | Platform Owner, then designated technical/security resource   | Assesses suspected unauthorized access, secret exposure, tenant-boundary failure, or integrity impact                                    |
| Privacy/Legal escalation   | Platform Owner, then qualified external legal/privacy counsel | Assesses personal-data, notification, jurisdiction, retention, and legal-hold implications without directing unapproved technical action |

Escalation sequence:

1. The monitoring recipient acknowledges and records the time, deployment, symptom, and safe
   request identifiers.
2. The Technical/Operations owner corroborates the event and assigns P1, P2, or P3 using the
   monitoring runbook.
3. The Platform Owner becomes incident commander or appoints one and decides whether to freeze
   deployments, writes, imports, migrations, or provider changes.
4. Security escalation is immediate for suspected confidentiality, integrity, authorization,
   tenant-isolation, or credential impact.
5. Privacy/Legal escalation is immediate when personal data, notification duties, legal holds,
   or jurisdictional obligations may be implicated.
6. Rollback and recovery authorization belongs to the Platform Owner or formally delegated
   authority. An authorized technical operator executes the approved action. Database restoration
   additionally requires the applicable data-owner decision.

The initial operational destination documented by the monitoring runbook is
`support@polismartafrica.ai`. Named assignments, delegation evidence, and private contact methods
remain in the protected operations register rather than this repository.

## 4. Provider usage and budget warnings

| Provider              | Available mechanism                                                        | Verified configuration status | Current evidence / required action                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vercel                | Usage, limits, observability, deployment and function views                | VERIFIED                      | Pro plan active; Spend Management configured; on-demand budget set to $50; spend notifications ON; automatic project pausing OFF. Do not change the plan, budget, or pause behavior. |
| Neon                  | Built-in monitoring, usage views, Backup & Restore, history and snapshots  | LIMITED EVIDENCE              | Monitoring and recovery are verified on the Free plan; independent budget-alert configuration was not verified and is not, by itself, a technical blocker.                           |
| OpenAI                | Organization/project usage, rate-limit and spend-limit views               | VERIFIED                      | Organization spend limit is configured at $50 and usage was within the configured limit at owner verification. Do not record the organization identifier or change the limit.        |
| Microsoft 365 / Graph | Service health, message trace, API errors and tenant licensing/usage views | LIMITED EVIDENCE              | Graph authorization, `Mail.Send`, transactional email and password-reset delivery are supported by existing test evidence; independent service/usage warnings are UNVERIFIED.        |

No billing plan, paid monitor, provider limit, payment configuration, Graph permission, client
credential, or provider setting is changed by this readiness record. A warning prompts
investigation; it must not automatically weaken safeguards or enable financial features. The
unverified Neon and Microsoft warning settings remain operational limitations, not standalone
technical release blockers given verified health monitoring, recovery controls, transactional
email evidence, and the documented escalation process.

## 5. Recovery and checkpoint readiness

`BACKUP_RECOVERY_RUNBOOK.md` records a successful non-destructive Neon recovery validation on
2026-08-29. It confirmed point-in-time capability, an isolated recovery branch, expected database
structure and migration history, automatic recovery-branch expiration, and no Production change.

The Platform Owner additionally verified the current PoliSmart Neon project on the Free plan in
AWS US East 2 (Ohio): the default Production branch is `production`; built-in monitoring,
Backup & Restore, restore from history, Preview-data inspection before restore, and snapshot
functionality are available; and the current point-in-time history window is six hours. No restore,
snapshot, branch change, plan upgrade, or Production data modification was performed.

At an authorized recovery event, the recovery operator must select and verify a recovery point
inside the then-current retained-history window before acting. The current Production deployment
and configuration identity, selected point, expected data-loss window, authorizing Platform Owner
or delegate, and authorized technical operator must be recorded in the protected incident record.

A Production restore is permitted only for confirmed corruption or destructive loss when forward
repair is less safe. It requires a write freeze, an isolated restore/recovery branch, read-only
structure and data-integrity verification, tenant and authorization checks, explicit incident
commander and data-owner approval, and post-restoration health, readiness, authentication,
authorization, AI, email, and provider observation. No restoration is performed by this review.

## 6. Release-specific application rollback

**Candidate release:** `8f74988faf10d2809cfaea73cbf6c011fde1a288`

**Known-good prior Production deployment:** `dpl_B7A1iu3tPkoVcuZaCs77jvKk9FRz`

**Known-good prior Production commit:** `b6bdda9a0b4e058506bf4858fc0a84562e5de9ac`

**Production branch:** `main`

The prior deployment was recorded as READY with the Production aliases intact. Immediately before
any release, Vercel must be checked again to confirm that this immutable deployment still exists,
remains READY, retains the expected aliases/configuration snapshot, and is compatible with the
current Production database. If any fact differs, it is not an approved rollback candidate until
re-reviewed.

Rollback triggers include:

- Production homepage, health, or readiness failure caused by the release;
- broad authentication or password-reset regression;
- tenant-isolation, authorization, or Super Administrator boundary failure;
- Billing, Fundraising, payment, or contribution functionality becoming available;
- critical database connectivity/persistence failure caused by the release;
- unsafe AI grounding, broad AI failure, or widespread transactional-email failure;
- secret exposure, personal-data incident, or unexplained integrity change.

Rollback procedure:

1. Stop further release changes and preserve the deployment ID, time window, safe request IDs,
   logs, and current provider status.
2. Confirm that the failure began with the release and that the prior deployment remains database
   and provider compatible.
3. The Platform Owner or formally delegated authority orders rollback; the authorized technical
   operator executes it in the verified `poli-smart` Vercel project.
4. Restore the prior immutable application deployment to the verified Production aliases. Do not
   change or restore the database merely to roll back application code.
5. Verify domains, TLS, homepage, `/api/health`, `/api/ready`, authentication, password reset,
   tenant/role denial, AI grounding, Knowledge Base, campaign workflows, public lead forms,
   authorized lead management, transactional email where affected, and disabled financial
   features.
6. Observe Vercel, Neon, application, OpenAI, and Microsoft Graph signals for at least 30 minutes.
7. Record the decision, approver, operator, timestamps, evidence, residual risk, and follow-up.

## 7. Production identity and configuration checklist

Complete and record this checklist immediately before deployment. A failed or unverifiable item
keeps Production NO-GO.

- [ ] Vercel team/project is the approved `poli-smart` project.
- [ ] Environment is Production; no Preview deployment is being promoted accidentally.
- [ ] Authorized source branch and deployment method are recorded.
- [ ] Exact approved commit equals `8f74988faf10d2809cfaea73cbf6c011fde1a288`.
- [ ] Production aliases include the approved public domains and point only to the intended deployment.
- [ ] Production Neon project, branch ID, database `neondb`, and least-privilege runtime role are verified using safe metadata.
- [ ] Production `DATABASE_URL` is runtime-scoped and no Preview database is referenced.
- [ ] Production `MIGRATION_DATABASE_URL` is not used because this release requires no migration.
- [ ] `BILLING_ENABLED` exists in Production and is independently verified false.
- [ ] `FUNDRAISING_ENABLED` exists in Production and is independently verified false.
- [ ] Required authentication, origin, rate-limit, storage, OpenAI, and Microsoft Graph variable names/scopes are present without exposing values.
- [ ] No migration was added after `0013_lead_follow_up_workflow`; no migration command will run during deployment.
- [ ] Health, monitoring, alert ownership, rollback authority, and recovery-point evidence are recorded.
- [ ] External Legal/Privacy/HR review and jurisdiction decisions are complete.
- [ ] Exact Production commit and deployment are explicitly authorized in writing.

## 8. Post-deployment smoke procedure — prepare only

Do not execute this procedure until a separately authorized Production deployment occurs.

1. Record the Production deployment ID, commit, branch, aliases, configuration epoch, operator,
   start time, and authorization reference.
2. Verify the homepage, Free Early Access language, TLS, and public legal navigation.
3. Verify `/api/health` returns the minimal healthy response and `/api/ready` returns only the
   expected readiness status.
4. With a controlled verified account, test login, session establishment, logout, and denial of a
   protected route after logout.
5. Request password-reset instructions using the controlled account; verify generic public
   messaging, Graph acceptance, and message-trace/inbox outcome without recording the token.
6. Verify the expected tenant/campaign and deny a controlled cross-tenant request. Confirm
   Campaign Administrator and Super Administrator boundaries.
7. Run one bounded, non-sensitive AI Assistant request and verify approved evidence, Observed
   Data/AI Interpretation separation, citations, and safe provider handling.
8. Verify Knowledge Base listing/approval boundaries and campaign management reads without
   creating unnecessary Production data.
9. Verify Events, Volunteers, and Field Operations load and remain tenant scoped.
10. Verify Early Access and Demo Request pages, consent, Privacy Notice links, validation, and
    rate-limit behavior. Submit only if the release authorization includes controlled synthetic
    Production submissions and a cleanup/retention decision.
11. Verify authorized lead-management access and unauthorized denial without opening unrelated
    lead records or changing status/follow-up history.
12. Verify Billing and Fundraising navigation are absent, direct routes show the controlled
    unavailable state, APIs reject reads and mutations, and payment/contribution initiation is
    impossible.
13. Review Vercel/application errors, Neon connectivity, OpenAI usage/errors, Graph delivery, and
    security/authorization signals for at least 30 minutes.
14. Record sanitized results and retain Production NO-GO if any critical check is incomplete.

**Immediate rollback/escalation:** stop and invoke the release-specific rollback assessment for a
health/readiness outage, broad authentication failure, tenant or role bypass, unexpected data
change, secret exposure, financial feature availability, critical persistence failure, unsafe AI
behavior, or widespread transactional-email failure. Do not repeatedly exercise a failing write.

## 9. Remaining readiness decisions

Technical operations readiness is documented with verified external uptime monitoring and alert
delivery, Vercel spend controls, OpenAI spend controls, Neon monitoring and six-hour recovery
capability, role-based escalation, a verified rollback candidate, and prepared identity and smoke
procedures. Neon budget-alert configuration and Microsoft service/usage-warning configuration
remain UNVERIFIED but are not standalone technical blockers under the verified controls above.

Production remains NO-GO until the pre-deployment checklist is executed for the actual release
window and the independent governance gates are complete. Those gates include qualified
Legal/Privacy/HR review, jurisdiction decisions, retention approval, required training, exact
Production commit/deployment approval, and explicit written Production authorization.

Nothing in this document changes the legal package, resolves a legal issue, or authorizes
Production.

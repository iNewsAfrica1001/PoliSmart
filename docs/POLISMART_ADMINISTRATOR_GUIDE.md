# PoliSmart Africa AI — V1 Administrator Guide

## 1. System overview

PoliSmart Africa AI is an AI-powered political campaign intelligence and management platform
designed for African political and governance environments. It helps authorized organization teams
coordinate campaigns and interpret approved evidence. AI supports human decisions; it does not
predict outcomes or replace campaign, policy, legal, or compliance judgment.

The production service is available at **https://polismartafrica.ai**. At an operational level:

- Vercel builds and serves the React application and server-side API routes.
- Neon PostgreSQL is the durable system of record. The runtime and migration connections use
  separate database roles.
- Microsoft Graph sends registration-verification and password-reset messages from the authorized
  transactional mailbox.
- OpenAI is accessed only through the server-side provider abstraction for grounded AI assistance.
- Private Vercel Blob storage holds uploaded campaign documents; PostgreSQL holds their metadata,
  processing state, and searchable chunks.

V1 supports organization accounts, secure authentication, server-side role-based access control,
campaign operations, aggregate Afrobarometer intelligence, an evidence-grounded AI Assistant,
knowledge documents, policy workflows, communications review, events, volunteers, and compliance
audit views. Reports and Billing are not operational V1 features.

## 2. Roles and authorization boundaries

All protected actions are authorized on the server. Hiding a control in the interface is not an
authorization boundary. Access is also constrained by the active organization and, where required,
campaign.

| Role                    | Implemented V1 boundary                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Super Administrator     | Platform-wide administrative permissions, platform user management, and audit access. This protected role may assign Super Administrator.                                        |
| Campaign Administrator  | Manages its organization, organization users, campaigns, approved knowledge, analytics, and AI access. It cannot create, modify, assign, promote, or obtain Super Administrator. |
| Candidate               | Reads its organization and campaigns, analytics, and organization-level results.                                                                                                 |
| Campaign Manager        | Manages campaigns and knowledge, uses analytics and AI, and manages assigned operational/review work.                                                                            |
| Policy Director         | Manages policy workflows and knowledge approval; uses analytics and AI.                                                                                                          |
| Communications Director | Manages communications, knowledge approval, content review, analytics, and AI.                                                                                                   |
| Field Director          | Manages field operations and volunteers and reads analytics.                                                                                                                     |
| Volunteer Coordinator   | Manages volunteers and field operations.                                                                                                                                         |
| Analyst                 | Reads analytics, approved knowledge, campaign information, and uses the AI Assistant.                                                                                            |
| Volunteer               | Limited organization/campaign read access and assigned participation capabilities.                                                                                               |

Event creation uses the dedicated server-side `events:create` permission. Campaign Administrators,
Super Administrators, Field Directors, and Volunteer Coordinators can create events within their
authorized organization. This does not grant Campaign Administrators unrelated field-management
permissions. The event form uses a server-provided capability for guidance; the API independently
enforces permission and tenant scope.

Volunteer creation similarly uses `volunteers:create` for these same four roles. Campaign
Administrators do not gain volunteer editing, assignments, or event-participation management
through this permission. Contact information still requires explicit authorization. The volunteer
form uses a server-provided capability; server-side tenant and permission checks remain mandatory.

Unknown or missing roles fail closed. A Campaign Administrator must never promote themselves or
another person to Super Administrator, including through a direct API request. Only an already
authorized Super Administrator can assign that role. Administrators must not attempt to bypass
these controls through database edits, alternate endpoints, or client-side manipulation.

## 3. User administration

### Registration and verification

1. From the public sign-in page, select **Create a new organization account**.
2. Enter the authorized account owner's full name, organization name, country, work email, and a
   password that meets the displayed requirements.
3. Registration creates an isolated organization and a Campaign Administrator membership.
4. The account remains unable to sign in until the time-limited, single-use email-verification link
   is confirmed at `/verify-email`.
5. If needed, use **Resend verification email**. The response is deliberately neutral and must not
   reveal whether an address is registered.

Invalid, expired, reused, and missing verification tokens fail safely. Never mark an account
verified manually merely to resolve a support request.

### Account status, password reset, and support

- A valid login requires an existing, enabled, verified account and a correct password.
- **Forgot password?** sends a time-limited, single-use reset link. A completed reset replaces the
  password hash and revokes existing sessions.
- Login and password-reset requests use normalized email addresses. Do not ask a user to disclose a
  password, reset token, session cookie, or email-verification token.
- Public support is **support@polismartafrica.ai**. Automated authentication messages continue to
  use **no-reply@polismartafrica.ai**; replies to that mailbox are not the support workflow.
- Before changing a role, confirm the administrator's own authorization and the target
  organization. Use the supported role-assignment workflow; do not edit membership records
  directly.

Safe support checks are: confirm the normalized email, account existence/status using authorized
administration views, verification state, organization membership, assigned role, and relevant
sanitized audit/error events. Never reveal whether an unrelated address exists, and never bypass
verification or password checks.

## 4. Campaign administration

1. Open **Campaigns** and select **Add campaign**.
2. Enter a campaign name, country, and election type. Add campaign dates when known.
3. Save the campaign. The confirmation links back to the Dashboard.
4. Select the campaign from the Dashboard campaign selector. Field tasks and events have their own
   campaign selectors.

Campaign records are organization-owned. Campaign access requires an active authenticated
organization membership and the relevant server-side permission. Intelligence, knowledge
retrieval, AI conversations, policies, events, and operational work retain campaign context for
authorization and auditability. A user with no campaign must create one or request access from an
authorized administrator; the AI Assistant must not provide a campaign-independent bypass.

## 5. AI and public-intelligence administration

The AI Assistant retrieves approved campaign knowledge and safeguarded aggregate public
intelligence. It does not send respondent-level Afrobarometer records to the model.

- **Observed Data** is the retrieved evidence presented as data. Statistics must come from the
  approved aggregate records.
- **AI Interpretation** is a model-generated explanation for human review. It is not a guaranteed
  prediction.
- **Citations** retain source/question metadata and, where applicable, country, survey round,
  weighting field, weighted percentage, and unweighted sample size.
- **Country grounding** prevents a country-specific answer from citing another country's aggregate
  as support.
- **Weighting** uses the approved survey weighting fields, including `WITHINWT` or `COMBINWT` where
  supplied and appropriate.
- **Sample safeguards** suppress aggregate claims below the configured minimum sample size.
- When adequate evidence is unavailable, the assistant must say so instead of inventing a statistic
  or citation.

Afrobarometer is an independent public research source. Its use does not imply ownership,
endorsement, or partnership. Coverage is limited to the countries, questions, survey rounds, and
valid responses present in the approved dataset.

### Approved V1 indicator mappings

| Intelligence category  | Question | Approved V1 meaning                                                                              |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| Public Priorities      | `Q45PT1` | First response: most important problem government should address                                 |
| Economic Conditions    | `Q4A`    | Present condition of the country's economy                                                       |
| Government Performance | `Q46A`   | Government handling of the economy                                                               |
| Institutional Trust    | `Q37A`   | Trust in the president                                                                           |
| Democracy              | `Q23`    | Support for democracy as a form of government                                                    |
| Governance             | `Q31`    | Satisfaction with the way democracy works                                                        |
| Corruption             | `Q39A`   | Perceived change in corruption over the past year                                                |
| Public Services        | `Q40B`   | Reported ease of obtaining public-school services; this is access, not universal service quality |
| Security               | `Q7B`    | Frequency of fearing crime in the home                                                           |
| Civic Participation    | `Q10A`   | Participation in community meetings                                                              |
| Elections              | `Q12A`   | Whether elections reflect voters' views                                                          |
| Youth                  | `Q1`     | Aggregate age distribution for respondents aged 18–35 only; never individual profiling           |

All other source questions remain explicitly unmapped until an authoritative codebook review and
approved change process. Administrators must not infer, rename, or add mappings in production.

## 6. Email operations

Production authentication email uses Microsoft Graph application authorization and the approved
sender `no-reply@polismartafrica.ai`.

- Registration invokes the verification-message workflow after the account and token are created.
- Password reset uses the same Graph delivery service with a separate single-use reset token.
- Microsoft Graph HTTP `202 Accepted` means Graph accepted the message for processing. It does not
  guarantee final delivery to the recipient's inbox.
- If Graph accepts a message but the user does not receive it, confirm the address, ask the user to
  check junk/quarantine, then use Microsoft 365 message tracing to investigate routing, policy,
  rejection, or delivery. Message tracing is an administrator concept; never request the user's
  mailbox password.
- For a provider error, record the safe application error code, HTTP status, timestamp, and
  Microsoft request ID when available. Never record access tokens, client secrets, message tokens,
  or credential-bearing URLs.

## 7. Production services

| Service                         | Operational responsibility                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel                          | Production builds, deployments, domain routing, HTTPS, server-side runtime, environment attachment, and application logs.                                        |
| Neon PostgreSQL                 | Durable application, tenant, campaign, authorization, audit, document-metadata, and aggregate-intelligence records. Runtime and migration roles remain separate. |
| Microsoft Graph / Microsoft 365 | Application-authorized transactional email and delivery investigation through message tracing.                                                                   |
| OpenAI                          | Server-side model inference behind the provider abstraction. The application supplies only bounded authorized evidence and validates structured output.          |
| Vercel Blob                     | Private production object storage for uploaded documents. Database metadata and authorization remain authoritative.                                              |

## 8. Environment-variable inventory

Values belong only in approved secret/environment management. Never place production values in
source, documentation, tickets, screenshots, chat, or Git.

### Secret or sensitive settings

| Variable name                      | Purpose                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                     | Least-privilege runtime PostgreSQL connection.                                                      |
| `MIGRATION_DATABASE_URL`           | Protected direct migration connection; never used for normal runtime CRUD.                          |
| `AUTH_SECRET`                      | Server authentication/session signing secret.                                                       |
| `JWT_SECRET`                       | Optional compatibility JWT secret where configured.                                                 |
| `SESSION_SECRET`                   | Optional dedicated session secret where configured.                                                 |
| `OPENAI_API_KEY`                   | Server-only OpenAI credential. Never use a `VITE_` prefix.                                          |
| `BLOB_READ_WRITE_TOKEN`            | Private object-storage access token.                                                                |
| `BLOB_STORE_ID`                    | Managed Blob store identifier; treat as sensitive operational metadata.                             |
| `MICROSOFT_TENANT_ID`              | Microsoft Entra tenant identifier; sensitive operational configuration.                             |
| `MICROSOFT_CLIENT_ID`              | Microsoft Entra application identifier; sensitive operational configuration.                        |
| `MICROSOFT_CLIENT_SECRET`          | Microsoft Graph application credential.                                                             |
| `EMAIL_API_KEY` / `RESEND_API_KEY` | Credentials only if the alternative Resend provider is intentionally approved.                      |
| `SMTP_USER` / `SMTP_PASSWORD`      | Credentials only if an SMTP provider is intentionally approved. SMTP is not the current Graph path. |
| `REDIS_URL`                        | Optional managed rate-limit/cache connection; treat as credential-bearing.                          |
| `RATE_LIMIT_KV_REST_API_URL`       | Server-only Upstash REST endpoint for distributed rate limiting; treat as sensitive configuration.  |
| `RATE_LIMIT_KV_REST_API_TOKEN`     | Server-only write credential for atomic distributed rate limits; secret.                            |

### Non-secret configuration names

| Variable name                                            | Purpose                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `NODE_ENV`                                               | Runtime environment mode.                                                             |
| `HOST` / `PORT`                                          | Server binding supplied by the runtime.                                               |
| `APP_URL` / `PUBLIC_APP_URL`                             | Canonical public application origin.                                                  |
| `CLIENT_ORIGIN`                                          | Allowed browser origins.                                                              |
| `VITE_API_BASE`                                          | Public client API base; must not contain credentials.                                 |
| `PERSISTENCE_MODE`                                       | Durable persistence mode; production requires PostgreSQL.                             |
| `STORAGE_PROVIDER`                                       | Storage implementation selector; production uses Vercel Blob.                         |
| `DOCUMENT_STORAGE_PATH`                                  | Local-development document path only.                                                 |
| `EMAIL_PROVIDER`                                         | Transactional-email provider selector; production uses Microsoft Graph.               |
| `EMAIL_FROM`                                             | Authorized sender mailbox; production Graph requires `no-reply@polismartafrica.ai`.   |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE`                | Inactive SMTP transport settings retained for an explicitly approved provider switch. |
| `OPENAI_MODEL` / `AI_PROVIDER`                           | Approved model and provider selectors.                                                |
| `AI_RATE_LIMIT_WINDOW_MS` / `AI_RATE_LIMIT_MAX_REQUESTS` | AI request-limit policy.                                                              |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS`       | General API request-limit policy.                                                     |
| `JSON_LIMIT`                                             | Maximum accepted JSON request size.                                                   |

Although some identifiers are not passwords, restrict environment access to authorized operators.

## 9. Troubleshooting procedures

### User cannot log in

1. Confirm the user is on the canonical HTTPS domain and the login endpoint is reachable.
2. Using authorized views, check account existence, enabled status, email verification,
   organization status, membership, and role.
3. Ask the user to retry with the normalized work email or use password reset. Never ask for their
   password.
4. Review sanitized authentication logs for verification rejection, account status, password
   mismatch, origin/CSRF rejection, rate limiting, or session-cookie failure.
5. Do not manually verify the user or weaken authentication.

### Verification email not received

1. Confirm the registration request completed and a non-expired token record exists without
   exposing the token.
2. Confirm the effective provider is Microsoft Graph and the authorized sender is configured.
3. Check the safe delivery result. A Graph `202` means accepted, not delivered.
4. Ask the user to check junk/quarantine, use **Resend verification email**, and run Microsoft 365
   message tracing if needed.

### Password reset

Use **Forgot password?** and keep the response neutral. If the link fails, distinguish invalid,
expired, missing, and already-used states through safe logs. Issue a fresh request; never reuse or
disclose a token. Confirm old sessions are revoked after a successful reset.

### Zero campaigns

Confirm the user has an active organization membership and campaign-read permission. An eligible
administrator should create the first campaign under **Campaigns**, then select it on the Dashboard.
Do not copy a campaign from another organization.

### AI unavailable or provider failure

Check the application health, campaign selection, AI permission, rate-limit status, approved
evidence availability, and sanitized provider error code. Confirm the server-side provider/model
configuration exists without displaying it. If the provider is unavailable, tell users that AI is
temporarily unavailable; deterministic operations remain available. Never return an ungrounded
answer as a substitute.

### HTTP 500

Capture the timestamp, request ID, route, authenticated organization/campaign identifiers, and safe
error code. Review Vercel logs and the relevant provider status. Do not copy raw request bodies,
cookies, tokens, or secrets into a ticket. Escalate recurring failures through incident response.

### Email failure

Check Graph token acquisition, audience/`Mail.Send` application role, sender authorization, safe
Graph status/code, request ID, and Microsoft 365 message trace. Do not revert to SMTP as an
unreviewed workaround.

### Database connectivity issue

Check application readiness and sanitized connection error category, then confirm Neon compute and
service status. Verify only that the intended runtime variable is attached and that the runtime role
is least privilege. Do not print URLs, rotate credentials casually, grant elevated rights, or run a
migration as a connectivity test.

## 10. Change management

Do not modify production database roles, migrations, mappings, environment variables, or provider
configurations without documented change control and recovery planning. Every production change
requires an owner, reviewed scope, security impact, test plan, recovery point or backup where
applicable, rollback procedure, approval, deployment record, and post-change verification. Large
Afrobarometer imports are explicit operations and must never run automatically during deployment.

## 11. Deferred V1 features

- **Reports — Coming Soon.** Reports are outside V1 and must not be represented as operational.
- **Payments/Billing — Reserved / Coming Soon.** V1 has no payment processing, payment provider,
  card or bank-data collection, payment credentials, invoices, transactions, or payment database
  tables. Billing must not be required for registration or any V1 workflow.

# Phase 2A Tenant Access and Team Administration Design Review

**Document status:** Design review complete; implementation not started

**Repository baseline reviewed:** `997850dd5568a8e547141ecce495680a896b19bb`

**Production baseline supplied by the owner:** `997850dd5568a8e547141ecce495680a896b19bb`

**Review date:** 2026-10-06

**Scope:** Post-Launch Trust & Tenant Enablement Phase 2A, documentation and design only

## 1. Decision summary

| Decision | Result |
| --- | --- |
| Design Review | **PASS** |
| Implementation Readiness | **PASS** for the bounded single-active-tenant design below |
| Schema change required | **YES** — one additive invitation model and invitation-status enum |
| Migration required | **YES** — additive only; no existing-row rewrite or Production backfill is designed |
| Permission-catalog changes required | **NO** — reuse `organization-users:manage` and `platform-users:manage` |
| Current multi-tenant membership support | **AMBIGUOUS** end to end |
| Security blockers | **NONE** for the bounded design; the controls in this document are release requirements |

Phase 2A should replace the incomplete membership-upsert “invite” behavior with a real,
tenant-scoped, expiring, single-use invitation lifecycle. It should add a Team Administration
workspace for authorized tenant administrators, disable public workspace self-registration, reuse
the existing user, membership, role, session, verification, password, notification, rate-limit, and
append-only audit foundations, and avoid introducing campaign-specific membership or general
multi-tenant switching.

No application, schema, permission, Production configuration, or Production data change was made
during this review.

## 2. Repository evidence and current architecture

### 2.1 Identity and authentication

The authoritative identity is `AuthUser` in `prisma/schema.prisma`:

- globally unique normalized email;
- bcrypt password hash;
- display name and nullable email-verification timestamp;
- one-to-many sessions, verification tokens, reset tokens, and memberships.

`server/services/authentication.js` currently provides:

- 12–128 character password validation with upper-case, lower-case, and numeric requirements;
- bcrypt cost 12 password hashing;
- 32-byte base64url opaque tokens;
- secret-bound SHA-256 token hashing before persistence;
- 24-hour email-verification tokens;
- 30-minute password-reset tokens;
- seven-day database-backed sessions;
- single-use verification/reset enforcement;
- deletion of all user sessions after password reset;
- neutral password-reset and verification-resend behavior;
- verified-email enforcement before login.

The `polismart_session` cookie is `HttpOnly`, `SameSite=Strict`, path `/`, and `Secure` in
Production. Authentication reloads active memberships from the database on every request. Role or
membership changes therefore affect server authorization on the next request; the client may still
show stale capabilities until its session is refreshed.

The application currently exposes public `POST /api/auth/register`. Registration atomically creates
an `AuthUser`, `Organization`, and active `CAMPAIGN_ADMINISTRATOR` membership, then sends a
verification email. `LoginPage.tsx` exposes “Create a new organization account.” This is incompatible
with the owner-approved Phase 2 principle that public/open registration remain disabled and must be
removed or gated during implementation. Recovery and verification-resend endpoints remain valid.

### 2.2 Tenant, membership, campaign, role, and permission model

The database calls a tenant an `Organization`. `Membership` joins an `AuthUser` to an Organization
with:

- a unique `(tenantId, userId)` constraint;
- one `MembershipRole`;
- `ACTIVE`, `INVITED`, or `SUSPENDED` status.

`Campaign` belongs to exactly one tenant. There is no campaign-membership or campaign-role model.
An active tenant membership and role permissions govern access to all authorized campaigns in that
tenant; individual users cannot currently be assigned to only selected campaigns.

The role enum is:

- `SUPER_ADMINISTRATOR`
- `CAMPAIGN_ADMINISTRATOR`
- `CANDIDATE`
- `CAMPAIGN_MANAGER`
- `POLICY_DIRECTOR`
- `COMMUNICATIONS_DIRECTOR`
- `FIELD_DIRECTOR`
- `VOLUNTEER_COORDINATOR`
- `ANALYST`
- `VOLUNTEER`

There is no separate `TENANT_ADMINISTRATOR` role. `CAMPAIGN_ADMINISTRATOR` is also exposed through
the compatibility alias `ORGANIZATION_ADMIN` and is the existing tenant-administration role.
`CAMPAIGN_ADMINISTRATOR` holds `organization-users:manage`; `SUPER_ADMINISTRATOR` receives the
complete deterministic permission policy, including `platform-users:manage`.

Tenant-scoped routes call `requireTenantPermission`, which takes `X-Organization-Id`, finds the
authenticated user's matching active membership, and checks its server-side role policy. Repository
queries then include `tenantId`. Client-supplied tenant, membership, user, or role values are not
sufficient without these checks.

### 2.3 Existing account-management behavior

`server/routes/governance.js` exposes two incomplete management operations:

- `PATCH /api/governance/memberships/:id/role`; and
- `POST /api/governance/memberships/invite`.

Both require `organization-users:manage` in the selected tenant. The repository scopes membership
updates by both membership ID and tenant ID. Role assignment blocks non-Super Administrators from
granting or modifying `SUPER_ADMINISTRATOR`.

The current invitation operation is not a secure invitation lifecycle. It:

- looks up an already-registered user by email;
- creates or overwrites a membership in `INVITED` state;
- returns `409` when the email does not identify a user;
- creates no token, expiry, revocation, acceptance, or notification;
- can reveal whether an account exists;
- can overwrite the role/status of an existing membership;
- has no duplicate-pending, last-admin, self-change, or concurrency controls.

The route is not connected to a tenant-facing Team Administration UI. The Dashboard describes team
invitations as a future readiness step, while the login page claims administrators manage them.

### 2.4 Audit, email, and rate limiting

`SecurityAuditEvent` is tenant- and actor-attributable. Migration 0008 makes security audit records
append-only. Existing governance changes append `USER_INVITE` and `PERMISSION_CHANGE`, but the
incomplete route does not record acceptance, resend, revocation, suspension, reactivation, or
removal.

`server/services/accountNotifications.js` already supports SMTP through Nodemailer and Microsoft
Graph, constructs same-origin verification/reset links, redacts provider secrets, and degrades safely
when delivery fails. Phase 2 can add invitation notification content to this service without adding
another delivery provider.

Existing authentication limits cover login, registration, verification resend, and reset. There is
no dedicated invitation-create, invitation-resend, invitation-accept, or membership-mutation rate
policy.

### 2.5 Multi-tenant membership assessment

The schema deliberately allows one user to hold one membership in each of multiple tenants. Server
middleware can select a tenant by matching `X-Organization-Id`, and `/api/auth/me` returns all active
memberships. Those are positive signs of server-side support.

End-to-end support is nevertheless **AMBIGUOUS**:

- `App.tsx` and most client modules select `memberships[0]`;
- Prisma membership ordering is not specified;
- there is no explicit tenant selector or persisted active-tenant choice;
- login audit attribution uses the first returned membership;
- session revocation is user-wide, not membership-specific;
- there are no regression tests for safe tenant switching by one identity.

Phase 2A must therefore not advertise or introduce multi-tenant membership. Its bounded rule is:

1. an existing account with no active membership may accept an invitation without creating a
   duplicate identity;
2. an existing member of the invitation's same tenant may only follow explicit resend/reactivation
   rules and never receive a duplicate membership;
3. an account already active in a different tenant must receive a neutral failure and an auditable
   support path; Phase 2A must not silently add the second tenant;
4. broader multi-tenant acceptance and tenant switching require a separately approved decision and
   end-to-end design.

This narrow policy is compatible with the current client and does not prevent a future tenant
switcher.

## 3. Proposed authority model

### 3.1 Who may administer a team

- An active `CAMPAIGN_ADMINISTRATOR` may list and administer memberships and invitations only in
  the tenant represented by their own active membership and the server-validated tenant header.
- A `SUPER_ADMINISTRATOR` retains platform authority, but must select an existing tenant and pass a
  dedicated platform-user authorization path. A client-supplied tenant ID is only a lookup key; the
  server resolves the target tenant before acting.
- All other roles fail closed.
- Team Administration grants no Campaign Geography, privacy, AI, master-geography, payment, or
  fundraising capability.

### 3.2 Assignable roles

The tenant-facing role matrix must be narrower than the raw enum:

| Actor | Roles assignable through Team Administration |
| --- | --- |
| Campaign Administrator | `CANDIDATE`, `CAMPAIGN_MANAGER`, `POLICY_DIRECTOR`, `COMMUNICATIONS_DIRECTOR`, `FIELD_DIRECTOR`, `VOLUNTEER_COORDINATOR`, `ANALYST`, `VOLUNTEER` |
| Super Administrator | All roles above plus `CAMPAIGN_ADMINISTRATOR` |
| Any other role | None |

`SUPER_ADMINISTRATOR` must never be granted, changed, invited, or removed through tenant Team
Administration. Existing controlled platform provisioning remains authoritative for that role.
Campaign Administrators cannot create peers, promote themselves, or create a path that later grants
them platform authority. The server owns the allowlist; the UI is only a presentation of it.

### 3.3 Tenant versus campaign scope

Invitations are **tenant-level only** because `Membership` is tenant-level. They do not accept a
campaign ID and do not imply access to only one campaign. Existing per-feature permissions and
campaign/tenant repository checks remain unchanged. Campaign-specific membership would alter
business semantics and needs a separate design and schema.

## 4. Invitation lifecycle

### 4.1 Creation

1. Authenticate the actor and resolve the target tenant server-side.
2. Require the appropriate tenant/platform user-management permission.
3. Normalize and validate the recipient email and role.
4. Apply the role matrix, self-change prohibition, and single-tenant rule.
5. In one transaction, lock or otherwise serialize the tenant/email invitation key, invalidate any
   safely replaceable pending invitation, create a new pending invitation, and append audit evidence.
6. Generate 32 random bytes with `crypto.randomBytes`, encode base64url, persist only a keyed hash
   using a dedicated invitation-token secret of at least 32 bytes, and send the plaintext token only
   in the email link.
7. Return a neutral representation of the pending invitation. Never return account existence,
   user ID, token hash, or raw token.

Invitation lifetime: **72 hours**. This is shorter than general onboarding windows but long enough
for a managed campaign team. Expiration is checked server-side at every token operation; a scheduled
cleanup job is unnecessary.

### 4.2 Duplicate and pending behavior

- At most one `PENDING` invitation may exist for normalized `(tenantId, recipientEmail)`.
- Repeating “invite” while one is pending returns the same neutral pending state and does not send
  another email.
- A membership already active in the tenant returns a generic non-actionable result to the requester
  and creates no invitation.
- A suspended membership is not silently reactivated; an authorized explicit reactivate operation
  is required.
- Race-safe uniqueness must be enforced by the database, not only by an application pre-check.

### 4.3 Resend

Resend is an explicit authorized action, rate limited per actor, tenant, invitation, recipient hash,
and source IP. It atomically marks the previous pending invitation superseded/revoked and creates a
new 72-hour invitation with a new token. Old links fail closed. Resend never extends or reuses the
old secret and is audited as `TEAM_INVITATION_RESENT` without recording the raw token.

### 4.4 Revocation and expiration

- An authorized administrator may revoke a pending invitation in their tenant.
- Revocation is an atomic conditional transition from `PENDING` to `REVOKED`.
- Expired invitations are treated as expired even if the stored status has not been materialized.
- Revoked, expired, accepted, superseded, malformed, or unknown tokens return the same safe public
  failure class and can never be reused.

### 4.5 Acceptance by an existing user

- Acceptance validates the token hash, `PENDING` status, expiry, tenant, normalized intended email,
  and invitation role inside one serializable transaction or equivalent row lock.
- An authenticated user must have the same normalized verified email as the invitation. If not
  authenticated, they use the normal login flow and return to acceptance.
- A valid existing identity is reused; no duplicate `AuthUser` is created.
- The bounded single-tenant rule is checked immediately before membership creation.
- Membership creation and invitation consumption occur atomically. A replay loses the conditional
  update and fails closed.

### 4.6 Acceptance by a new user

The invitation link is the only account-creation entry point. The invitee supplies display name and
a policy-compliant password; tenant, recipient email, and role come only from the invitation. Because
the strong single-use link was delivered to the intended mailbox, successful acceptance may set
`emailVerifiedAt` atomically while creating the user and membership. This reuses the existing secure
password model and treats the invitation as the email-possession proof. It must not create a new
Organization.

The acceptance page must not state whether an account existed before the token was presented. Any
conflict or cross-tenant condition produces a neutral failure and support direction without naming
another tenant.

### 4.7 Membership state changes

- Pending state belongs to `TeamInvitation`, not to a userless `Membership`.
- Successful acceptance creates or activates one membership as `ACTIVE`.
- “Deactivate” changes `ACTIVE` to `SUSPENDED`; physical membership deletion is not part of Phase
  2A. “Remove” in product copy must mean this recoverable suspension.
- Reactivation is explicit, tenant-scoped, role-checked, audited, and must not silently reuse an old
  invitation.
- Role changes are conditional on the current role/version to prevent lost updates.

### 4.8 Self-change and last-administrator protection

- A Campaign Administrator cannot change, suspend, or remove their own membership through Team
  Administration.
- The Team Administration API never changes a `SUPER_ADMINISTRATOR` membership.
- A transaction must lock/count active `CAMPAIGN_ADMINISTRATOR` memberships before any demotion or
  suspension and reject an operation that would leave the tenant without one.
- The last-admin invariant is enforced even for a Super Administrator using this normal workflow;
  a replacement must be activated first. Emergency recovery remains a separately governed platform
  operation.

### 4.9 Session effects

Authorization already reloads active memberships on every request, so server permission loss is
immediate. For clear client behavior and defense in depth:

- role change, suspension, or reactivation revokes all sessions for the affected user after the
  transaction commits;
- the affected user must sign in again and receives a fresh `/api/auth/me` capability projection;
- the actor's own access cannot be changed through ordinary self-service;
- acceptance does not automatically create an authenticated session; the invitee signs in normally.

User-wide revocation is intentionally conservative under the Phase 2A single-active-tenant rule.

## 5. Minimum additive schema

Add an invitation-status enum, for example:

```prisma
enum TeamInvitationStatus {
  PENDING
  ACCEPTED
  REVOKED
  SUPERSEDED
}
```

Add one model with no plaintext secret:

```prisma
model TeamInvitation {
  id             String               @id @default(uuid()) @db.Uuid
  tenantId       String               @map("tenant_id") @db.Uuid
  recipientEmail String               @map("recipient_email")
  tokenHash      String               @unique @map("token_hash")
  role           MembershipRole
  status         TeamInvitationStatus @default(PENDING)
  expiresAt      DateTime             @map("expires_at")
  invitedById    String               @map("invited_by_id") @db.Uuid
  acceptedById   String?              @map("accepted_by_id") @db.Uuid
  revokedById    String?              @map("revoked_by_id") @db.Uuid
  acceptedAt     DateTime?            @map("accepted_at")
  revokedAt      DateTime?            @map("revoked_at")
  createdAt      DateTime             @default(now()) @map("created_at")
  updatedAt      DateTime             @updatedAt @map("updated_at")
  organization   Organization         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invitedBy      AuthUser             @relation("TeamInvitationInviter", fields: [invitedById], references: [id], onDelete: Restrict)
  acceptedBy     AuthUser?            @relation("TeamInvitationAccepter", fields: [acceptedById], references: [id], onDelete: Restrict)
  revokedBy      AuthUser?            @relation("TeamInvitationRevoker", fields: [revokedById], references: [id], onDelete: Restrict)

  @@index([tenantId, status, createdAt])
  @@index([recipientEmail, status])
  @@map("team_invitations")
}
```

The migration should add a partial unique index for one pending normalized recipient per tenant:

```sql
CREATE UNIQUE INDEX team_invitations_one_pending_per_tenant_email
ON team_invitations (tenant_id, recipient_email)
WHERE status = 'PENDING';
```

The service must always persist normalized lowercase email. Runtime requires only `SELECT`, `INSERT`,
and narrowly enumerated `UPDATE` columns on `team_invitations`; no runtime `DELETE` grant is needed.
Existing `memberships` privileges suffice. Migration/runtime privilege tests must be updated. No
permission-catalog row or role-permission mapping is needed.

The implementation preflight must count existing `memberships.status = 'INVITED'`. No automatic
Production backfill is designed. If records exist, preserve them and present them as legacy inactive
records that require an authorized resend/new invitation; do not manufacture tokens or activate
memberships during migration.

## 6. Proposed API surface

All authenticated tenant routes require explicit origin validation for state-changing requests in
addition to the Strict SameSite cookie and configured credentialed CORS allowlist. All responses set
`Cache-Control: private, no-store`.

### Auth/public acceptance

- `GET /api/auth/team-invitations/:token` — neutral, minimized invitation context after token
  validation: organization display name, masked recipient, assigned role label, and expiry; never
  tenant/user/database identifiers.
- `POST /api/auth/team-invitations/:token/accept-existing` — requires authenticated matching user.
- `POST /api/auth/team-invitations/:token/accept-new` — creates a new verified identity using the
  invitation-bound email and supplied display name/password.
- `POST /api/auth/register` — disabled for open registration; return a stable invitation-only
  response without creating identity, tenant, or membership records.

### Tenant Team Administration

- `GET /api/team/members` — tenant-scoped member list with minimized user fields, role, status, and
  safe timestamps.
- `GET /api/team/invitations` — tenant-scoped pending/recent invitation list; never token hashes.
- `POST /api/team/invitations` — create invitation.
- `POST /api/team/invitations/:id/resend` — rotate token and resend.
- `POST /api/team/invitations/:id/revoke` — conditional revocation.
- `PATCH /api/team/members/:membershipId/role` — authorized conditional role change.
- `POST /api/team/members/:membershipId/suspend` — soft deactivate.
- `POST /api/team/members/:membershipId/reactivate` — explicit reactivation.

The current governance membership routes should be removed or made internal only after all clients
are migrated. Keeping two mutation authorities would create bypasses.

No route accepts an authoritative user ID, inviter ID, tenant role policy, token state, or audit actor
from the client. Tenant comes from the authenticated authorization boundary; actor comes from the
session; user is resolved from membership/invitation state.

## 7. Audit and notification requirements

Append the following tenant-scoped events with authenticated actor where applicable:

- `TEAM_INVITATION_CREATED`
- `TEAM_INVITATION_RESENT`
- `TEAM_INVITATION_REVOKED`
- `TEAM_INVITATION_ACCEPTED`
- `TEAM_INVITATION_ACCEPTANCE_FAILED` using a safe reason code only
- `MEMBERSHIP_ROLE_CHANGED` with old/new role
- `MEMBERSHIP_SUSPENDED`
- `MEMBERSHIP_REACTIVATED`
- `MEMBERSHIP_CHANGE_BLOCKED_LAST_ADMIN`

Audit metadata may contain role, invitation/membership ID, recipient keyed hash, and safe state/reason
codes. It must not contain raw invitation tokens, passwords, session cookies, provider credentials,
or unnecessary plaintext email. Append-only protections remain unchanged.

Invitation email must identify PoliSmartAfrica AI, the inviting organization, assigned role, 72-hour
expiry, single-use nature, and a same-origin HTTPS acceptance link. It must warn recipients not to
forward the link and provide support contact information. Resend sends one replacement email;
revocation and role changes do not send messages unless separately approved. Provider failure leaves
the invitation pending but returns an administrator-visible “created, delivery unavailable” state
without exposing provider internals; resend is then available within limits.

## 8. Rate limiting and abuse controls

Add named policies and distributed enforcement consistent with the current limiter:

- invitation create: per actor + tenant and per tenant + recipient hash;
- resend: stricter per invitation/recipient and per actor + tenant;
- token inspect/accept: per source IP and token hash prefix/keyed digest;
- membership mutations: per actor + tenant.

Suggested starting limits are 20 invitation creates per administrator/tenant/day, 3 resends per
invitation/day, and 10 token acceptance attempts per IP/15 minutes, with operational monitoring.
Limits must be configurable and tested; they are abuse ceilings, not authorization.

Responses remain neutral across unknown users, other-tenant users, duplicate accounts, malformed
tokens, and non-actionable invitation state. Logs use hashes and stable reason codes.

## 9. Team Administration UX

Add one permission-gated **Team Administration** navigation item for authorized Campaign
Administrators and Super Administrators. Direct navigation must fail closed server-side and display
a generic access-denied state without fetching tenant data.

### Member view

- responsive table on wide screens and semantic cards on narrow screens;
- member display name, masked or role-appropriate email, role, status, and joined/updated date;
- role filter and accessible search limited to the current tenant result set;
- actions menu containing Change role, Suspend, or Reactivate only when authorized;
- current user and protected/last administrator clearly labeled;
- no cross-tenant membership, organization name, or account-existence information.

### Invitations view

- pending/recent invitations with masked email, intended role, inviter display name, created time,
  expiry, and safe state;
- Invite member dialog with email, allowed role, explanation of tenant-wide campaign access, and
  explicit confirmation;
- Resend and Revoke only for pending invitations and authorized actors;
- duplicate/pending, delivery-failure, expiration, and race-loss messages that are clear but do not
  disclose unrelated account state.

### Accessibility and interaction

- semantic headings, tables/lists, labels, buttons, dialogs, and status/alert regions;
- focus moves into dialogs, is trapped while open, returns to the triggering control, and moves to
  the result summary after completion;
- all actions keyboard operable with visible focus;
- confirmation for role change, suspension, revocation, and reactivation;
- errors associated with fields and summarized for screen readers;
- touch targets and responsive stacking suitable for narrow screens;
- no color-only status; reduced-motion preferences respected.

The Dashboard readiness item may link to Team Administration after implementation. Phase 3 guided
first-run/private-demo work may use a read-only “team configured” signal and deep-link here, but
Phase 2A must not build onboarding orchestration, lead conversion, demo fixture creation, or automatic
invitation behavior.

## 10. Security and privacy analysis

| Threat | Required control |
| --- | --- |
| Tenant isolation / IDOR | Resolve actor from session, require matching active tenant membership or explicit platform-user authority, scope every query/mutation by tenant and ID, and return generic not-found/forbidden responses. |
| Privilege escalation | Server-owned assignable-role matrix; never trust client role/tenant/user; Team UI cannot touch Super Administrator. |
| Role-escalation chains | Campaign Admin cannot grant Campaign Admin or Super Admin; lower roles have no team-management permission; old governance bypass routes are removed. |
| Token theft | 256-bit random single-use token, dedicated secret-bound hash at rest, HTTPS same-origin link, no token in logs/analytics/referrers, `Referrer-Policy`, short expiry. |
| Replay / expired / revoked reuse | Atomic conditional consume under lock/serializable transaction; state and expiry rechecked at commit; resend rotates and invalidates old token. |
| Email/account enumeration | Neutral create/accept errors, no public directory, masked email after valid-token proof, no disclosure of other-tenant membership. |
| Duplicate identity | Global normalized-email uniqueness; existing identity reused; create/accept transaction handles unique races safely. |
| CSRF/session | Strict SameSite HttpOnly Secure cookie, credentialed origin allowlist, explicit Origin/Referer validation for mutations, JSON-only bodies, no state change by GET. |
| Acceptance/revocation race | Row lock or serializable transaction, conditional status update, one pending partial unique index, idempotent loser response. |
| Last-admin lockout | Transactional active-admin count/lock and self-change prohibition. |
| Stale session | Membership reloaded per request plus session revocation on role/status changes and fresh login. |
| Audit integrity | Append-only tenant-scoped events; server actor; no client audit metadata authority; no secret/PII-rich metadata. |
| Invitation/email abuse | Distributed multi-key limits, resend rotation, delivery-state handling, monitoring, no bulk invitation endpoint. |
| Privacy minimization | Store only normalized recipient email and lifecycle evidence; mask UI; hash recipient in audit/rate-limit keys; define retention below. |

Invitation records should be retained for operational/audit needs under the platform retention policy.
The recommended starting rule is to redact `recipientEmail` after 90 days for revoked, superseded, or
expired invitations while retaining keyed hash/state/timestamps, subject to legal/privacy review.
Accepted invitations may retain the relation and audit evidence because the active membership already
contains the identity relationship. No invitation data may be used for political profiling or
targeting.

## 11. Compatibility and invariants

Implementation must preserve:

- existing verified login, password reset, session, authentication audit, and `/api/auth/me` behavior;
- server-enforced tenant/campaign isolation and exact existing feature permissions;
- Campaign Geography 3A–3E architecture and assignment controls;
- AI authorization, geographic grounding, citations, and political-safety controls;
- privacy operation restrictions and append-only governance evidence;
- disabled payments/fundraising state;
- master-geography and Geographic Administration boundaries;
- existing campaign, event, volunteer, knowledge, policy, communications, and reporting semantics.

Disabling public registration is an intended access-policy change. It must not disable login,
verification resend for legitimately pending accounts, password reset, or invitation acceptance.

## 12. Proposed affected files

Expected implementation scope:

- `prisma/schema.prisma`
- one new additive `prisma/migrations/00xx_team_invitations/migration.sql`
- `server/config/authorization.js` only for exported role-assignment policy helpers if needed, not new
  permission keys
- `server/config/rateLimits.js`
- `server/config/databasePrivileges.js`
- `server/middleware/authentication.js` or a narrowly reusable mutation-origin guard
- `server/services/authentication.js`
- `server/services/authorization.js`
- new `server/services/teamAdministration.js`
- `server/services/accountNotifications.js`
- new `server/repositories/teamAdministrationRepository.js`
- `server/routes/auth.js`
- new `server/routes/teamAdministration.js`
- `server/routes/governance.js` and `server/repositories/governanceRepository.js` to retire the old
  membership mutation authority
- `server.js`
- `src/lib/auth.ts`
- new `src/lib/teamAdministration.ts`
- `src/pages/LoginPage.tsx`
- new `src/pages/TeamAdministrationPage.tsx`
- new `src/pages/AcceptTeamInvitationPage.tsx`
- `src/config/navigation.ts`
- `src/components/layout/AppShell.tsx`
- `src/App.tsx`
- focused new tests plus updates to authentication, authorization, tenancy, governance, rate-limit,
  migration, privilege, deployment, navigation, accessibility, and email-service tests.

## 13. Required tests

### Invitation lifecycle

- strong token generated; only hash stored; token absent from response, audit, and logs;
- correct 72-hour expiry; malformed/unknown/expired/revoked/used/superseded tokens fail closed;
- single-use acceptance and acceptance/revocation/resend race tests;
- duplicate create is neutral and one pending invitation is enforced by the database;
- resend rotates token and invalidates the previous link;
- notification provider failure is safe and recoverable;
- existing eligible user is reused; new invitee creates one identity and no organization;
- cross-tenant existing-account case follows the neutral bounded rule;
- public registration creates no user/organization/membership.

### Authorization and isolation

- Campaign Admin acts only in own tenant and only on allowed subordinate roles;
- Super Admin platform path is explicit and tenant-scoped;
- all other roles denied;
- client-supplied tenant/user/actor/role spoofing denied;
- cross-tenant invitation/member IDs return no data and cause no mutation;
- Super Administrator role cannot be managed by Team Administration;
- self-demotion/suspension denied;
- last active Campaign Administrator demotion/suspension denied under concurrency;
- no team role grants Campaign Geography management beyond existing policy.

### Membership and sessions

- role/suspension reflected server-side on next request;
- affected sessions revoked after role/status change;
- suspended member cannot authenticate into tenant capability surfaces;
- reactivation explicit and audited;
- existing membership uniqueness preserved;
- legacy `INVITED` memberships preserved and never auto-activated.

### Privacy, CSRF, rate limits, and audit

- email/account enumeration responses indistinguishable where required;
- origin violations and non-JSON mutation attempts rejected;
- create/resend/accept rate-limit identities cannot be bypassed with forwarding-header spoofing;
- all lifecycle events append correct tenant and server actor with no secret/PII leakage;
- audit remains append-only and Team service exposes no deletion method;
- no caches retain authenticated team or invitation-token responses.

### UI and regression

- authorized navigation/direct route and unauthorized fail-closed behavior;
- member and invitation loading/empty/error/race states;
- keyboard, focus, dialog, labels, status, responsive, and reduced-motion coverage;
- tenant-wide access explanation and no campaign-scope misrepresentation;
- login/reset/resend/verification regressions;
- Campaign Geography 3A–3E, AI, privacy, operations, governance, health/readiness, Vercel routing,
  full suite, check, and Production build.

Postgres integration tests must exercise partial uniqueness, row locking/conditional consumption,
last-admin concurrency, runtime privileges, and append-only audit behavior; mock-only tests are not
sufficient for those invariants.

## 14. Bounded implementation sequence

1. Reconfirm baseline, clean worktree, and count legacy `INVITED` memberships in a non-Production
   rehearsal database; do not inspect or mutate Production without authorization.
2. Add the invitation schema and additive migration with indexes, foreign keys, and least-privilege
   catalog changes; add migration/privilege/Postgres tests.
3. Implement repository transactions for create, resend, revoke, accept, role change, suspension,
   reactivation, last-admin protection, and session revocation.
4. Implement the server-owned role matrix, tenant/platform authorization boundary, mutation-origin
   protection, rate limits, neutral error model, and append-only audit events.
5. Add invitation email delivery through the existing notification service.
6. Add acceptance routes and disable public self-registration without disturbing recovery or
   verification flows.
7. Add Team Administration APIs and remove the old governance membership mutation endpoints after
   confirming no runtime client consumes them.
8. Build the accessible Team Administration and invitation-acceptance UI; expose only server-returned
   assignable roles and the active tenant.
9. Run focused security, concurrency, database privilege, email, authorization/isolation,
   accessibility, and regression tests; then full test, check, and build.
10. Perform independent security/diff/secret review and remediate findings.
11. Create one local implementation commit and stop at the Production authorization boundary.

No Phase 3 guided onboarding/demo implementation belongs in this sequence.

## 15. Owner decisions and non-blocking future work

No additional owner decision is required to implement the bounded Phase 2A design above.

One future decision remains explicitly outside Phase 2A and is **not an implementation blocker**:

- whether PoliSmartAfrica should formally support users with active memberships in multiple tenants,
  including an explicit tenant selector, deterministic active-tenant/session semantics, audit
  attribution, notification behavior, and cross-tenant privacy UX.

Changing the 72-hour invitation lifetime, subordinate-role matrix, retention period, or the rule that
only controlled platform provisioning manages Super Administrators would change this accepted design
and should receive owner review before implementation.

## 16. Final conclusion

The existing repository has a sound authentication, session, tenant-scoping, role-policy,
notification, rate-limit, and append-only audit foundation, but its current “invite” endpoint is only
an invited-membership upsert for pre-existing users and is not safe or complete enough for tenant
enablement. The minimum safe Phase 2A adds one invitation authority, reuses the existing membership
and permission catalogs, narrows role delegation, disables open registration, and provides a
tenant-scoped Team Administration UI.

The design is implementation-ready with an additive schema migration. It requires no permission
catalog expansion, no campaign membership redesign, no Production backfill, and no change to
Campaign Geography, AI, privacy, payments, fundraising, or Production configuration during the
design phase.

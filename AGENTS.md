# PoliSmartAfrica AI — Agent Operating Guide

## 1. Purpose

PoliSmartAfrica AI is a political campaign administration, geographic-intelligence, analytics, and AI-assisted platform operated by SentinelAI LLC.

This repository is an active Production system.

Do not reinterpret this repository as another product, training platform, prototype, or legacy application.

Preserve existing accepted architecture unless a specifically authorized increment changes it.

---

## 2. Core Operating Principle

Work autonomously on safe, authorized development tasks, but stop at genuine owner-controlled boundaries.

Do not repeatedly request authorization for ordinary:

- repository inspection
- code analysis
- implementation within an authorized increment
- local tests
- lint/check/build
- documentation
- independent review
- non-destructive local Git operations

When an increment has been authorized, complete its safe development lifecycle before reporting unless a blocker occurs.

---

## 3. Owner-Controlled Boundaries

STOP before performing any unapproved:

- Production database mutation
- Production migration
- Production deployment
- destructive database operation
- deletion of recovery branches/checkpoints
- destructive privacy operation
- privilege expansion
- secret/credential rotation
- payment activation
- fundraising activation
- irreversible external-system action

These require explicit owner authorization unless the current instruction already explicitly authorizes that exact operation.

Never interpret a previous authorization as authorization for a different Production change.

---

## 4. Production Identity

Neon project:

polismart

Project ID:

young-base-56422836

Production branch:

production

Production branch ID:

br-noisy-forest-axlven4c

Database:

neondb

Before any authorized Production database mutation, independently verify the exact control-plane identity.

Never rely solely on a connection string, environment-variable name, or human-readable branch name to establish Production identity.

---

## 5. Current Production Baseline

Current accepted Production application commit:

cc79cb8db54ce8ce46bd1a589a3a0adaea8000eb

Campaign Geography migrations:

0019 — APPLIED
0020 — APPLIED
0021 — APPLIED

Current Nigeria geography baseline:

Legacy geography:
9,627 total
9,627 active
0 inactive

Master geographic levels:
5

Master geographic areas:
9,627

Campaign geographic assignments:
9,627

Unexpected Production data drift is a STOP condition.

---

## 6. Recovery and Neon Safety

Never delete a protected Neon branch/checkpoint merely to free capacity.

Important protected Production checkpoint:

campaign-geography-production-pre-0021

Branch ID:

br-still-river-axmcbvi4

Auto-delete:

Never

Other historical Production recovery checkpoints may also exist and must be treated as protected unless a separate retention review explicitly classifies one as disposable.

Before a Production migration, require a verified recovery strategy.

Do not reset or restore Production without explicit authorization.

---

## 7. Database Migrations

Migrations must be:

- additive whenever feasible
- reviewed for destructive operations
- tested outside Production first
- deterministic
- compatible with tenant isolation
- compatible with least privilege
- independently verified

Never apply a Production migration simply because it exists in the repository.

Production migration execution requires explicit authorization.

Never modify an already accepted migration merely to make a test pass unless the change itself has been separately reviewed and authorized.

---

## 8. Database Roles and Least Privilege

Production database roles include:

polismart_migrator

polismart_runtime

Use the migrator only for authorized migration operations.

Runtime must retain least privilege.

Do not grant unrestricted direct writes merely to solve an application or test failure.

Do not grant PUBLIC access to protected mutation functions.

SECURITY DEFINER functions must use controlled search paths and reviewed ownership/grants.

---

## 9. Tenant and Campaign Isolation

Tenant isolation is mandatory.

Campaign isolation is mandatory where campaign scope applies.

Protected resources must fail closed.

Never rely solely on UI filtering for authorization.

Authorization must be enforced server-side.

Cross-tenant and unauthorized cross-campaign access must be denied.

IDOR vulnerabilities are release blockers.

---

## 10. Campaign Geography Architecture

Campaign Geography uses:

MasterGeographicLevel

MasterGeographicArea

CampaignGeographicAssignment

Master geography is platform-level reference geography.

Campaign Admin must NOT receive unrestricted master-geography mutation capability.

Campaign Geography assignment management is separate from master Geographic Administration.

Permissions:

campaign-geography:view

campaign-geography:manage

Initial authorized roles:

Campaign Admin
Super Administrator

Master geography remains protected.

---

## 11. Campaign Geography Assignment Rules

Assignment behavior must preserve:

- tenant scope
- campaign scope
- campaign-country consistency
- active master geography
- valid ancestry
- complete ancestry to Country
- cycle protection
- deterministic behavior

Assigning a child requires its missing ancestors to be assigned automatically according to accepted server/database behavior.

Assigning a parent does not automatically assign descendants.

Duplicate assignment must remain safely idempotent.

Removing/deactivating an ancestor with active assigned descendants must be blocked.

Removal uses the accepted soft-deactivation lifecycle.

---

## 12. Campaign Geography Database Write Model

Application runtime must use the approved controlled mutation functions.

Runtime direct writes to protected Campaign Geography assignment tables remain denied.

Current controls include accepted SECURITY DEFINER assignment/deactivation functions from migration 0021.

Do not replace this architecture casually with direct ORM writes.

---

## 13. Actor Identity

Human actor identity is application-authoritative.

The authenticated actor comes from the server-side authenticated session.

Never accept a client-supplied actor UUID as authoritative.

HTTP actor spoofing must remain prohibited.

Database actor UUID attribution is trusted application attribution under the accepted architecture.

Do not reopen this accepted architecture as a blocker unless new evidence demonstrates a concrete vulnerability.

---

## 14. Governance Audit Logs

Governance/security audit records are append-only.

Never:

- delete audit records
- truncate audit records
- modify historical audit records
- bypass append-only protections
- add DELETE privileges merely for cleanup

Test/rehearsal cleanup must distinguish mutable fixture state from durable append-only audit evidence.

---

## 15. Privacy Governance

Privacy operations are governed by accepted legal/privacy controls.

Do not enable destructive privacy executors unless separately authorized.

Legal holds and suppression controls must fail closed according to accepted policy.

Do not convert privacy/suppression information into political targeting data.

---

## 16. Payments and Fundraising

Payments are NOT authorized as part of the current Production scope.

Fundraising is NOT authorized as part of the current Production scope.

Do not enable either without a separate reviewed and explicitly authorized increment.

UI may represent unavailable future functionality only when explicitly designed as disabled/coming soon.

---

## 17. Political-System Safety

PoliSmartAfrica may provide campaign administration, geographic context, factual analytics, operational workflow, and authorized campaign-management capabilities.

Do not implement functionality intended for:

- voter suppression
- discriminatory voter exclusion
- individualized political persuasion based on sensitive personal data
- covert political profiling
- unlawful microtargeting
- manipulation of voting behavior
- automated candidate-choice recommendations
- unsupported election outcome predictions

Geographic grounding must remain factual/contextual and authorization-scoped.

---

## 18. AI Boundaries

AI outputs must remain grounded in authorized data and scope.

Do not expose provider credentials or system secrets.

Do not allow AI-generated content to bypass deterministic authorization.

AI Geographic Grounding must use valid authorized geography and fail closed when grounding is unavailable or unauthorized.

---

## 19. Secrets

Never:

- commit secrets
- print database passwords
- print API keys
- print OAuth credentials
- expose authentication tokens
- include secrets in reports
- include secrets in Git history

Use environment variables and approved secret-management mechanisms.

Reports should state PRESENT/ABSENT or PASS/FAIL rather than secret values.

---

## 20. Testing

Before an implementation increment is considered code-complete, run the relevant:

- focused tests
- authorization tests
- tenant-isolation tests
- campaign-isolation tests
- regression tests
- database privilege tests where applicable
- npm test
- npm run check
- npm run build

Do not describe tests as PASS unless they actually executed successfully.

Do not count prerequisite failures as expected behavioral rejections.

---

## 21. Production Testing

Never create synthetic fixture organizations, campaigns, users, geography, or assignments in Production merely to execute integration tests.

Behavioral database testing belongs in controlled non-Production rehearsal environments.

Production validation should use safe structural, privilege, health, readiness, authorization, and non-destructive smoke checks.

---

## 22. Test Import Safety

Importing helper/test modules for inspection or reporting must not automatically:

- execute tests
- mutate databases
- create fixtures
- apply migrations
- install sentinels

Executable test entry points must be appropriately guarded.

---

## 23. Git Discipline

Inspect:

git status
current branch
HEAD
remote relationship

before significant work.

Do not discard unrelated work.

Do not amend accepted historical evidence commits merely to make history cleaner.

Prefer a new commit for a new remediation/increment.

Do not force-push without explicit authorization.

Do not push simply because local tests pass.

Production deployment authorization and Git push authorization are not automatically equivalent unless the established deployment workflow requires the authorized push.

---

## 24. Local Branch Context

The development/release branch may contain commits newer than the current Production application commit.

Do not reset those commits merely because local HEAD differs from Production.

Rehearsal/test-only commits may intentionally remain undeployed.

Always distinguish:

application runtime changes

from:

test/rehearsal/control tooling.

---

## 25. Deployment

Production deployment requires explicit authorization.

Before deployment verify:

- exact authorized application commit
- required migrations
- migration state
- recovery readiness
- tests
- build
- Production identity

After deployment verify:

- deployment READY
- /api/health
- /api/ready
- database dependency
- authentication
- authorization
- tenant isolation
- relevant feature smoke tests

Do not deploy unrelated later commits merely because they are newer.

---

## 26. Monitoring

Production monitoring must remain operational.

Do not disable health/readiness monitoring or operational alerts as part of unrelated work.

Treat monitoring regressions as release blockers when they affect Production safety.

---

## 27. Increment Workflow

For each substantial increment:

1. inspect current implementation
2. establish exact baseline
3. produce bounded design/implementation plan
4. identify security/data/migration implications
5. implement only authorized scope
6. run focused tests
7. run full tests/check/build
8. perform independent review
9. remediate discovered defects
10. repeat verification
11. report exact evidence
12. STOP at Production authorization boundary

Do not repeatedly ask the owner to authorize ordinary safe substeps already covered by the increment authorization.

---

## 28. Independent Review

Security-sensitive increments require an independent review before Production authorization.

Review:

- authorization
- tenant isolation
- campaign isolation
- privilege changes
- data mutations
- migrations
- audit behavior
- secrets
- rollback/recovery
- unintended feature expansion

A test-suite PASS does not substitute for architectural/security review.

---

## 29. Reporting

Reports must distinguish:

PASS
FAIL
NOT RUN
NOT APPLICABLE

Never report an unexecuted test as PASS.

Include exact commit hashes for release decisions.

Include migration state when database changes are involved.

State explicitly whether:

Production was modified
code was modified
files were modified
push occurred
deployment occurred

Do not expose secrets.

---

## 30. Current Campaign Geography Roadmap

Increment 3A:
Production COMPLETE and ACCEPTED.

Increment 3A delivered:

- permissions
- authorization
- controlled database mutation functions
- service/API layer
- trusted actor handling
- tenant/campaign isolation
- audit behavior
- concurrency controls

Next planned increment:

Increment 3B — Campaign Geography user interface.

3B must consume the accepted 3A architecture.

Do not redesign 3A unless a concrete defect requires a separately reviewed remediation.

Future increments may include:

3C — Command Center consumer migration
3D — AI Geographic Grounding consumer migration
3E — other approved consumers

Each is a separate controlled change.

---

## 31. Increment 3B UI Principles

Campaign Admin and Super Administrator should receive a dedicated Campaign Geography assignment experience.

The UI should:

- display authorized campaign geography
- show hierarchy clearly
- distinguish assigned/unassigned state
- permit valid assignment through accepted APIs
- permit valid deactivation through accepted APIs
- communicate automatic ancestry behavior
- communicate descendant-removal restrictions
- handle loading/empty/error states
- be keyboard accessible
- provide confirmation for meaningful mutations
- avoid exposing master-geography editing

Do not implement 3B by exposing the existing Super Administrator Geographic Administration mutation interface to Campaign Admin.

---

## 32. Accessibility

New UI should follow WCAG-oriented practices:

- semantic controls
- keyboard operation
- visible focus
- meaningful labels
- accessible error messages
- appropriate ARIA only where needed
- sufficient contrast
- reduced-motion respect where applicable

Accessibility regressions should be treated as defects.

---

## 33. Definition of Done

An increment is complete only when:

- authorized scope is implemented
- security boundaries are preserved
- tenant/campaign isolation is verified
- relevant tests pass
- full test suite passes
- check passes
- build passes
- independent review passes where required
- documentation is updated when necessary
- no secrets are exposed
- no unrelated feature is introduced
- Production remains untouched unless explicitly authorized
- final evidence report is complete

Production deployment remains a separate owner-controlled decision unless explicitly included in the authorization.

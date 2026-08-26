# Repository Assessment — 2026-07-25

## Summary

The repository is a runnable prototype, but it is not a DigitalBridge AI MVP. React/Vite, Express, Socket.IO, Prisma, Docker, PWA, and Capacitor infrastructure exist. The active UI, API catalog, AI behavior, tests, package metadata, and much documentation primarily implement an unrelated AfricaCampaignAI product. The Prisma model and `docs/PRODUCTION.md` contain partial digital-literacy concepts, creating incompatible domain boundaries.

## Verified State

- `npm run check`: now checks every Node-compatible JavaScript module outside generated and dependency directories; Vite validates JSX during build.
- `npm test`: passes the existing legacy/domain tests plus authorization policy tests.
- `npm run build`: passes with a JavaScript chunk-size warning and a 1.9 MB legacy image.
- No formatter, linter, TypeScript checker, browser E2E suite, accessibility scanner, or CI workflow is configured.
- Git is unavailable in the current environment, so repository history and a working-tree diff could not be inspected.

## Risks

1. Demo session creation accepts a caller-selected role and is not authentication.
2. Protected routes do not consistently enforce server-side authorization or organization isolation.
3. Persistence defaults to memory; Prisma is not wired to repositories.
4. The AI implementation uses an older chat-completions call, loose JSON parsing, no approved-content retrieval, and campaign-specific policy.
5. Product identity and domain language are inconsistent throughout runtime code.
6. The current Prisma roles do not cover all required DigitalBridge roles.
7. Payment, certificate, progress, and grading workflows are incomplete and insufficiently audited.
8. Accessibility has useful focus and responsive foundations, but no automated or manual WCAG audit evidence.

## Recommended Architecture

Use a modular monolith initially: React web client; Express API organized by identity, learning, assessments, mastery, tutoring, organizations, certificates, and billing domains; PostgreSQL/Prisma repositories; Redis only when queues or distributed rate limits are required. Introduce strict TypeScript incrementally at module boundaries. Keep rule-based decisions deterministic and auditable.

For AI, use a provider abstraction with a server-only tutor policy, approved-content retrieval, structured schema validation, safety classification, uncertainty metadata, conversation/audit persistence, feedback reporting, human escalation, and cost/quality telemetry. The deterministic application remains authoritative for grades, access, certificates, and billing.

## Roadmap

1. Correct product identity and establish documented, tested learning-domain rules.
2. Add TypeScript, linting, formatting, environment validation, and CI.
3. Implement real authentication, RBAC, organization isolation, and audit events.
4. Reconcile and migrate the Prisma learning data model; wire repositories.
5. Replace the legacy UI with public pages, onboarding, catalog, and learner dashboard.
6. Add lessons, enrollment, persistent progress, assessments, mastery, and recommendations.
7. Add certificates, instructor/content tools, organization administration, and reporting.
8. Add grounded AI tutoring, feedback/escalation, safety evaluation, and metrics.
9. Add test-mode billing/notifications, then complete security, privacy, accessibility, performance, and mobile hardening.

## First Milestone

Establish a trustworthy DigitalBridge foundation without pretending the legacy prototype is complete: canonical package/API identity, a server-only tutor instruction, configurable deterministic mastery rules, a fail-closed role/permission policy, cross-organization authorization decisions, repository-wide syntax checks, regression tests, and agent/repository documentation.

The role policy is intentionally not wired to the legacy demo routes yet. Those routes do not authenticate a trustworthy actor, so attaching authorization middleware to caller-controlled role data would create false security. The next security increment is real session authentication followed by route-level permission and tenant enforcement.

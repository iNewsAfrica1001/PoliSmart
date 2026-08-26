# DigitalBridge AI Agent Guide

## Purpose

Build an accessible, secure, adaptive digital-literacy learning platform. The current repository contains reusable infrastructure mixed with legacy AfricaCampaignAI product code. Remove legacy behavior incrementally and only with tests.

## Architecture Rules

- Keep deterministic authorization, grading, certificate, subscription, and mastery rules on the server.
- Keep AI provider calls behind server-side services; never expose system instructions or provider secrets to the client.
- Treat PostgreSQL through Prisma as the durable system of record. Memory storage is demo-only.
- Enforce organization boundaries and permissions in repositories/services, not UI components.
- Put configurable learning thresholds in `server/config/`.

## Coding and Testing

- Prefer strict TypeScript for new production modules when the TypeScript foundation is introduced.
- Use small domain-focused modules, explicit input validation, and accessible React components.
- Run `npm run check`, `npm test`, and `npm run build` before considering an increment complete.
- Add regression tests for business rules, authorization, and bug fixes.

## Security and Accessibility

- Never commit secrets, real learner data, or production credentials.
- Verify server-side authorization and organization isolation for every protected operation.
- Preserve WCAG 2.2 AA practices: semantic HTML, keyboard access, visible focus, labels, contrast, reduced motion, and accessible errors.
- Do not allow AI to make final decisions on grades, certification disputes, payments, suspension, or other high-impact actions.

## Files Requiring Care

- `prisma/schema.prisma` and migrations: review data loss and tenant-isolation implications.
- `server/config/learning.js`: changes alter auditable mastery and tutor policy behavior.
- `.env.example`: placeholders only; never real credentials.
- `dist/`, `android/`, and `ios/`: generated outputs; update through documented build/sync commands.

## Definition of Done

The requested behavior is implemented, authorization and accessibility were reviewed, relevant tests pass, production builds, documentation reflects the change, and no secrets or unrelated legacy behavior were introduced.

# PoliSmart Africa AI V1 Production Guide

PoliSmart Africa AI is an AI-powered political campaign intelligence and management platform designed for African political and governance environments. The Version 1 runtime consists of a Vite React application and an Express API backed by PostgreSQL through Prisma.

## Version 1 runtime

- Serves the production React application from `dist`.
- Exposes authenticated, tenant-scoped APIs under `/api`.
- Supports organization accounts, campaigns, grounded AI Intelligence, approved knowledge, policy, events, volunteers, and role-based administration.
- Applies security headers, request IDs, JSON limits, and shared atomic Upstash rate limits.

## Distributed rate limiting

Production and Preview use the server-only `RATE_LIMIT_KV_REST_API_URL` and
`RATE_LIMIT_KV_REST_API_TOKEN` variables. Counters use expiring, HMAC-derived keys and are shared
across Vercel instances. Authentication and ordinary API requests use a bounded local fallback
only during a shared-store outage. OpenAI-backed generation fails closed with HTTP 503 if shared
cost protection cannot be enforced. Limit violations return HTTP 429 with `Retry-After`.

The established AI Assistant policy remains 12 requests per user/organization operation per
60 seconds, with an additional 60-request organization-wide window. Policy drafting and
Communications assistance use 6 requests per user/operation and 30 per organization/operation per
60 seconds. Authentication limits are purpose-specific and use IP plus HMAC-derived email or token
identifiers; raw account and recovery values never enter Redis keys.

## Browser security policy

Vercel applies an enforced, same-origin Content Security Policy and browser security headers to
the SPA, legal/authentication pages, static assets, and API routes. Express applies the same policy
to API responses. The policy permits self-hosted scripts, styles, images, fonts, API connections,
workers, media, and the manifest; dynamic presentation currently requires inline styles. Inline
scripts, eval, external resource wildcards, framing, and plugins are prohibited. HSTS remains
managed by the existing Vercel and API configuration, and hostile-origin CORS protection remains
unchanged.
- Keeps OpenAI, Microsoft Graph, object-storage, and Neon access behind server-side services and protected environment variables.
- Keeps the public health response minimal; protected operational endpoints never return credentials.

The legacy Digital Literacy Socket.IO classroom interface, classroom API, assessments, learner training simulations, certificate requests, demo-user APIs, chat, presence, hand-raise, and whiteboard features are not part of PoliSmart Africa AI V1 and are not exposed by the production runtime.

## Production safeguards

- Never commit or log secrets, credentials, tokens, or connection strings.
- Use the least-privilege runtime database identity for normal application operations.
- Use the migration database identity only through an approved, reviewed migration process.
- Enforce organization boundaries and permissions on the server.
- Keep provider calls and grounded-evidence assembly on the server.
- Do not run database migrations or public-intelligence imports automatically during deployment.

## Verification

```bash
npm run check
npm test
npm run build
npm run smoke
```

The smoke suite expects a running application at `SMOKE_BASE_URL` or `http://127.0.0.1:4000`. It checks health/readiness, unauthenticated rejection on representative protected V1 routes, absence of the removed classroom, assessment, training, and demo-user APIs, and the application shell. It does not create production data.

Reports and Payments/Billing remain clearly marked **Coming Soon** and are not operational V1 features.

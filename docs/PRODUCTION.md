# PoliSmart Africa AI V1 Production Guide

PoliSmart Africa AI is an AI-powered political campaign intelligence and management platform designed for African political and governance environments. The Version 1 runtime consists of a Vite React application and an Express API backed by PostgreSQL through Prisma.

## Version 1 runtime

- Serves the production React application from `dist`.
- Exposes authenticated, tenant-scoped APIs under `/api`.
- Supports organization accounts, campaigns, grounded AI Intelligence, approved knowledge, policy, events, volunteers, and role-based administration.
- Applies security headers, request IDs, JSON limits, and rate limits.
- Keeps OpenAI, Microsoft Graph, object-storage, and Neon access behind server-side services and protected environment variables.
- Keeps the public health response minimal; protected operational endpoints never return credentials.

The legacy Digital Literacy Socket.IO classroom interface, classroom API, chat, presence, hand-raise, and whiteboard features are not part of PoliSmart Africa AI V1 and are not exposed by the production runtime.

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

The smoke suite expects a running application at `SMOKE_BASE_URL` or `http://127.0.0.1:4000`. It checks health/readiness, unauthenticated rejection on representative protected V1 routes, absence of the removed classroom API, and the application shell. It does not create production data.

Reports and Payments/Billing remain clearly marked **Coming Soon** and are not operational V1 features.

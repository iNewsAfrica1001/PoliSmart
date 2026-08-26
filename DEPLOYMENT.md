# PoliSmart Africa AI — Vercel Deployment

This repository is prepared for the following production architecture:

`GitHub → Vercel → Neon PostgreSQL + pgvector → OpenAI Platform → private Vercel Blob storage`

Production domain: `https://polismartafrica.ai`

No production deployment is performed by these instructions until the final promotion step is explicitly approved.

## 1. Prerequisites

- GitHub repository with branch protection enabled.
- Vercel project connected to the GitHub repository.
- Neon PostgreSQL project with separate production and preview branches.
- Private Vercel Blob store connected to the Vercel project.
- Restricted OpenAI API project/key with usage limits.
- Resend account with `polismartafrica.ai` verified for email delivery.
- Managed Redis provider before enabling multiple application instances.

Use Node.js 20 or newer. The repository exports its Express app for Vercel and retains `npm run server` for local execution.

## 2. Neon PostgreSQL and pgvector

Create the Neon database and copy its pooled connection string. It should use TLS, for example:

```text
postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DATABASE?sslmode=require
```

The migration `0004_secure_knowledge_base` runs `CREATE EXTENSION IF NOT EXISTS vector`. Confirm the Neon role can create the extension.

From a secure administrative workstation or protected GitHub Actions migration job:

```bash
export DATABASE_URL='the-neon-production-connection-string'
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
```

The Vercel build generates Prisma Client and compiles the application; it does not apply migrations. Apply reviewed migrations from the approved release environment with the protected migration credential before promoting the deployment. Retain that output as the migration record.

For previews, use a separate Neon branch and a preview-only `DATABASE_URL`.

## 3. Private managed object storage

In Vercel:

1. Open the project’s Storage tab.
2. Create or connect a Blob store.
3. Select **Private** access.
4. Confirm Vercel adds `BLOB_STORE_ID` for OIDC authentication. Existing legacy stores may instead add `BLOB_READ_WRITE_TOKEN`.
5. Set `STORAGE_PROVIDER=vercel-blob`.

Campaign documents must not use a public Blob store. The server uploads with `access: private`; no browser receives the storage token.

## 4. Required Vercel environment variables

### P1 credential remediation

Replace or verify these Vercel Production variables manually, then redeploy. Never copy their values into source control or support logs:

- `DATABASE_URL`: pooled connection for the least-privilege runtime role.
- `MIGRATION_DATABASE_URL`: protected direct connection used only by the approved release environment; omit it from application runtime when the release runner is separate from Vercel.
- `AI_PROVIDER=openai`.
- `OPENAI_API_KEY`: newly issued server-side project key. Revoke any key previously shared outside the secret manager.
- `OPENAI_MODEL`: an enabled model name approved for the OpenAI project.
- `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.zoho.com`, `SMTP_PORT=465`, and `SMTP_SECURE=true`.
- `SMTP_USER`: complete authorized Zoho mailbox.
- `SMTP_PASSWORD`: Zoho application-specific password.
- `EMAIL_FROM`: the same authorized mailbox, optionally with a display name.

After redeployment, inspect only safe provider error codes and HTTP statuses. Do not log provider response bodies, authorization headers, API keys, SMTP passwords, or connection strings.

Configure variables in **Settings → Environment Variables**. Use separate values for Production and Preview.

| Variable                     | Required     | Production value guidance                                                          |
| ---------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `NODE_ENV`                   | Yes          | `production`                                                                       |
| `APP_URL`                    | Yes          | `https://polismartafrica.ai`                                                       |
| `CLIENT_ORIGIN`              | Yes          | `https://polismartafrica.ai`                                                       |
| `AUTH_SECRET`                | Yes          | Random value of at least 32 characters                                             |
| `DATABASE_URL`               | Yes          | Neon pooled TLS connection string                                                  |
| `MIGRATION_DATABASE_URL`     | Release only | Protected Neon direct connection for reviewed migrations; do not expose to runtime |
| `OPENAI_API_KEY`             | Yes          | Restricted server-side OpenAI project key                                          |
| `OPENAI_MODEL`               | Yes          | `gpt-5.4` or an explicitly approved model                                          |
| `AI_PROVIDER`                | Yes          | `openai`                                                                           |
| `STORAGE_PROVIDER`           | Yes          | `vercel-blob`                                                                      |
| `BLOB_STORE_ID`              | Recommended  | Added by an OIDC-connected private Blob store                                      |
| `BLOB_READ_WRITE_TOKEN`      | Legacy only  | Long-lived token for stores not upgraded to OIDC                                   |
| `EMAIL_PROVIDER`             | Yes          | `resend` or `smtp`                                                                 |
| `EMAIL_API_KEY`              | Resend only  | Restricted Resend API key                                                          |
| `EMAIL_FROM`                 | Yes          | `PoliSmart Africa AI <noreply@polismartafrica.ai>`                                 |
| `SMTP_HOST`                  | SMTP only    | `smtp.zoho.com`                                                                    |
| `SMTP_PORT`                  | SMTP only    | `465`                                                                              |
| `SMTP_SECURE`                | SMTP only    | `true`                                                                             |
| `SMTP_USER`                  | SMTP only    | Verified Zoho mailbox                                                              |
| `SMTP_PASSWORD`              | SMTP only    | Zoho app password                                                                  |
| `REDIS_URL`                  | Scaling      | Managed Redis TLS URL                                                              |
| `AI_RATE_LIMIT_WINDOW_MS`    | Recommended  | `60000`                                                                            |
| `AI_RATE_LIMIT_MAX_REQUESTS` | Recommended  | `12`                                                                               |
| `RATE_LIMIT_WINDOW_MS`       | Recommended  | `60000`                                                                            |
| `RATE_LIMIT_MAX_REQUESTS`    | Recommended  | `180`                                                                              |

Generate `AUTH_SECRET` locally, never in source control:

```bash
openssl rand -base64 48
```

Do not create any `VITE_` variable containing a secret. `VITE_API_BASE` should be unset in Vercel so the browser uses same-origin `/api` requests.

## 5. OpenAI Platform

Create a dedicated OpenAI project for PoliSmart production. Apply project-level budgets, usage alerts, and key rotation. Store the key only as `OPENAI_API_KEY` in Vercel. The server uses the Responses API, disables provider-side response storage, and records governance metadata without recording the API key.

## 6. Email

Verify the `polismartafrica.ai` domain with Resend, including SPF and DKIM. Configure `EMAIL_FROM` with a verified sender. Test verification and password-reset links on a preview deployment before production promotion.

For Zoho Mail instead, configure `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.zoho.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, and add the verified mailbox plus a Zoho app password as `SMTP_USER` and `SMTP_PASSWORD`. Keep credentials server-only. Publish the SPF, DKIM, and DMARC records shown by the Zoho admin console and test mail delivery in Preview before Production.

`SMTP_USER` must be the complete authorized Zoho mailbox. `EMAIL_FROM` must use that same mailbox (a display name is allowed). Supply `SMTP_PASSWORD` only as a Zoho application-specific password. After replacing Vercel variables, redeploy and verify both registration verification and password-reset messages in a controlled mailbox.

Vercel builds generate Prisma Client but do not apply migrations. Before promotion, create a Neon restore point and run `npm run db:migrate:production` from the approved release environment with `MIGRATION_DATABASE_URL` injected by its secret manager.

## 7. GitHub → Vercel preview configuration

1. Push the audited branch to GitHub.
2. Import the repository in Vercel.
3. Select the Vite framework preset if it is not detected.
4. Vercel reads `vercel.json`, runs `npm run build`, serves `dist`, and routes `/api/*` through the Express function.
5. Add Preview environment values using a Neon preview branch, preview Blob store, preview OpenAI key, and preview email sender.
6. Create a pull request to generate a preview deployment.

CLI alternative for preview only:

```bash
npm install -g vercel
vercel link
vercel env pull .env.vercel.local
vercel dev
vercel
```

Do not run `vercel --prod` during preparation.

## 8. Verification

Before production promotion:

```bash
npm ci
npm run db:generate
npm run format:check
npm run check
npm test
npm run build
```

On the preview deployment verify:

```bash
curl --fail https://PREVIEW_HOST/api/health
curl --fail https://PREVIEW_HOST/api/ready
```

`/api/health` is a liveness check. `/api/ready` verifies the static build, production secrets, allowed origins, database configuration/connectivity, and OpenAI configuration. A failed dependency returns HTTP 503.

Run the complete authenticated journey in `PRODUCTION_CHECKLIST.md`, confirm private document upload/deletion, and inspect Vercel logs for structured request IDs and safe error records.

## 9. Domain configuration

After preview acceptance—but before promotion—add these domains in Vercel:

- `polismartafrica.ai`
- `www.polismartafrica.ai`

Configure the DNS records Vercel provides. Choose one canonical hostname and redirect the other. Keep `APP_URL` and `CLIENT_ORIGIN` aligned with the canonical HTTPS origin.

## 10. Operational notes

- Vercel Functions are stateless. Local document storage is rejected in production; use private Blob storage.
- Socket.IO classroom functionality requires a durable realtime design and shared state before relying on it across Vercel instances. Use managed Redis/realtime infrastructure and test connection behavior separately.
- The current process-memory limiter is suitable for a single instance only. Connect the configured managed Redis service before horizontal production traffic.
- Do not expose database, Blob, email, OpenAI, or auth secrets to client-side environment variables or GitHub source.
- Enable Vercel log retention/observability, Neon monitoring, OpenAI budget alerts, Blob usage alerts, and Resend delivery monitoring.

## 11. Production promotion

Production promotion is intentionally excluded from this milestone. After migrations, preview E2E, security review, backup verification, and stakeholder approval, the authorized release operator may promote the accepted Vercel deployment through the dashboard or run:

```bash
vercel --prod
```

That command must not be executed until explicit production authorization is given.

# PoliSmart Africa AI

PoliSmart Africa AI is an Africa-focused campaign intelligence and operations platform operated by Sentinel LLC. This repository currently contains the application foundation: a strict TypeScript React client, a responsive authenticated shell, navigation placeholders, and a landing/sign-in preview.

The server now includes PostgreSQL-backed authentication, tenant RBAC, and the Campaign Operations MVP: campaigns, leadership, initiatives, activities, dependent tasks, events, volunteers, assignments, participation, and configurable geographic hierarchies. AI integrations and production hosting are not included.

## Technology

- React 19 and Vite 7
- Strict TypeScript
- ESLint and Prettier
- Existing Express, Prisma, Socket.IO, PWA, and Capacitor infrastructure retained for incremental migration

## Local installation

Requirements: current Node.js LTS and npm 10 or newer.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The API listens on `http://127.0.0.1:4000`.

Optionally copy `.env.example` to `.env`. All example values are local placeholders. Never add real credentials to source control.

The login screen uses the server authentication API. A PostgreSQL database and migrated account are required.

## Database

Set `DATABASE_URL` and `SESSION_SECRET` in `.env`, then run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

The seed creates fictional data only: **Sentinel Demo Campaign**, country **Kisiwa**, and a campaign explicitly marked `[DEMO]`. The `.example.invalid` account is not deliverable and its password must never be reused outside local demonstration.

New tenant tables use UUID primary keys, foreign keys, timestamps, uniqueness constraints, and tenant-leading indexes. Tenant-owned campaign queries require `tenant_id` through the repository and `X-Organization-Id` through authenticated API requests.

Migration `0003_campaign_operations_mvp` adds the operational data model. Run `npm run db:migrate` after upgrading an existing installation.

## Campaign Operations MVP

- Campaign creation, editing, lifecycle status, country, election type, dates, and leadership
- Initiatives, activities, tasks, owners, priorities, deadlines, dependencies, and six operational statuses
- Eight supported campaign event types
- Consent-gated volunteer contact data, availability, region, languages, skills, training, assignments, and attendance
- Organization-configurable geographic levels and parent-child areas

The system deliberately contains no voter profiles, persuasion scores, political-affinity fields, or targeting models.

## Secure knowledge base

Migration `0004_secure_knowledge_base` adds tenant-owned document metadata and searchable chunks. It enables PostgreSQL full-text indexes and prepares nullable `vector(1536)` fields for a future embedding worker. The AI Assistant remains disabled and does not query this content.

Authorized users can upload PDF, DOCX, TXT, and CSV files up to 10 MB. The pipeline validates extensions, media types, signatures, UTF-8 text, DOCX entry safety, expanded archive size, and extraction limits before creating searchable chunks. Files use random tenant-scoped storage keys and are never served from the public directory.

Set `DOCUMENT_STORAGE_PATH` to a private persistent volume. Production deployments must enable the PostgreSQL `vector` extension before applying the migration. Embedding generation is intentionally deferred; chunks are stored with `embedding_status=PENDING`.

## Afrobarometer public intelligence

The immutable research files live under `data/raw`. Run `npm run import:afrobarometer -- --dry-run` to validate and profile them, or `npm run import:afrobarometer` to perform the idempotent PostgreSQL import. Dashboard APIs expose safeguarded aggregates only; no respondent-level records are persisted or served.

Ten question mappings are explicitly sourced from the official Round 9 codebook; all other codes remain unmapped. See [the pipeline documentation](docs/AFROBAROMETER_DATA_PIPELINE.md) before adding another reviewed indicator mapping.

## Quality checks

## AI Assistant

Set `OPENAI_API_KEY` in local `.env` only (never in a `VITE_` variable), apply `npm run db:migrate`, then use `npm run dev`. See `docs/AI_ASSISTANT.md` for the grounding, citation, tenant-isolation, feedback, and provider design.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run the full repository verification with `npm run verify:local`. Check formatting without modifying files with `npm run format:check`.

## Client structure

```text
src/
├── components/layout/   # Responsive application shell
├── config/              # Typed navigation and UI configuration
├── pages/               # Foundation login and dashboard pages
├── App.tsx              # Preview session boundary
├── main.tsx             # Client entry point
└── styles.css           # Accessible responsive design system
```

## Authentication API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `POST /api/auth/email-verification/confirm`

## Security status

Passwords use bcrypt with cost 12. Session, reset, and verification secrets are random opaque values stored only as SHA-256 hashes. Session cookies are `HttpOnly`, `SameSite=Strict`, and `Secure` in production. Legacy protected routes now require an authenticated session. Production transactional email uses the server-side Microsoft 365 STARTTLS profile documented in `DEPLOYMENT.md`; credentials remain external.

Production deployment is intentionally out of scope for this milestone.

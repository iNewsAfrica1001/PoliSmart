# Privacy Provider, DPA, and Cross-Border Evidence Register

**System:** PoliSmart Africa AI V1.1A  
**Repository baseline:** `f30be81715f32f84569f6b580caf37c6f8b04293`  
**Inventory date:** 2026-10-03  
**Status:** Evidence inventory only — not legal advice, DPA acceptance, transfer approval, or compliance approval

## Status rules

- **VERIFIED** means the cited repository or public provider document was located and reviewed for this inventory. It does not mean that SentinelAI LLC accepted, executed, or is eligible for that document.
- **NOT VERIFIED** means no sufficient evidence was found in the repository or approved documentation.
- **REQUIRES LEGAL REVIEW** means qualified counsel must determine the provider role, applicable law, transfer mechanism, notice, and contractual sufficiency for the intended Nigeria operation.
- Account-level contracts, plan eligibility, selected regions, provider settings, and acceptance records are owner-controlled evidence. None is inferred from technical use.

## Confirmed from repository

The deployed implementation evidences these external services:

- Vercel hosting, serverless runtime, domains, logs, deployment/error monitoring, and Vercel Web Analytics/Speed Insights configuration evidence.
- Vercel Blob private document storage through `@vercel/blob`.
- Neon-managed PostgreSQL as the durable system of record.
- OpenAI Responses API for server-side AI inference; response storage is disabled by application code.
- Microsoft Graph / Microsoft 365 for transactional verification and password-reset email.
- Upstash-compatible Redis/KV REST rate limiting through the configured `RATE_LIMIT_KV_REST_API_*` interface.
- UptimeRobot monitoring of the public domain, health route, and readiness route.
- A user-initiated WhatsApp/Meta handoff link; no WhatsApp API, webhook, chatbot, contact import, or message ingestion exists.
- GitHub as the source repository and Git source for the Vercel deployment workflow.

Production-selected alternatives are distinguished from dormant code paths. In particular, Resend exists as an alternative email implementation but the approved Production configuration uses Microsoft Graph, so Resend is not inventoried as an active Production processor.

## Provider/service inventory

| # | Provider/service | Application purpose and component | Data potentially transmitted or stored | Personal data? | Campaign/tenant data? | Credentials/secrets? | Evidenced location | DPA/equivalent documentation | Subprocessor documentation | Cross-border evidence | Retention/deletion documentation | Security/privacy documentation | Evidence source | Outstanding action |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Vercel — hosting/runtime/domains/logs/analytics** | Production build and hosting, API function runtime, TLS/domain routing, deployment logs, Error Anomaly monitoring, Web Analytics/Speed Insights. Components: `vercel.json`, `api/index.js`, Vercel deployment configuration, monitoring runbook. | HTTP requests and responses, IP/network and device metadata, authentication/session processing, runtime logs, operational telemetry, and any application payload processed by server functions. | **Yes** | **Yes** | **Yes**, server environment variables and deployment credentials | Deployment function is evidenced in `iad1`; this is not a complete processing-location inventory. | **VERIFIED — public document exists; account applicability/acceptance NOT VERIFIED.** Vercel DPA states coverage for qualifying Pro/Enterprise agreements. | **VERIFIED — public list referenced by DPA; account-specific snapshot NOT VERIFIED.** | **REQUIRES LEGAL REVIEW.** Public DPA includes transfer mechanisms, but Nigeria applicability and the account's contractual coverage are not established. | **NOT VERIFIED** for account logs, analytics, backups, and deletion after termination. | **VERIFIED** at public-document level only | Repository; `docs/OPERATIONS_MONITORING_RUNBOOK.md`; `docs/V1_1_LEGAL_PRIVACY_HR_EXTERNAL_REVIEW_PACKAGE.md`; [Vercel DPA](https://vercel.com/legal/dpa); [Vercel security](https://vercel.com/security) | Owner must archive the applicable accepted terms/DPA, plan eligibility, region/settings evidence, subprocessor snapshot, and retention/deletion configuration; counsel must approve transfers. |
| 2 | **Vercel Blob** | Private object storage for knowledge documents. Component: `server/services/documentStorage.js`; `STORAGE_PROVIDER=vercel-blob`; `@vercel/blob`. | Uploaded document bytes, filenames, media metadata, storage keys, document content, and deletion requests. | **Potentially yes** | **Yes** | **Yes**, Blob token or OIDC/store identity | Not independently evidenced; Vercel account/store settings control placement. | **VERIFIED — same public Vercel DPA exists; account/store applicability NOT VERIFIED.** | **VERIFIED — public Vercel list exists; account-specific snapshot NOT VERIFIED.** | **REQUIRES LEGAL REVIEW** | **NOT VERIFIED** for object lifecycle, backups, soft deletion, and termination handling | **VERIFIED** at public-document level only | `package.json`; `.env.example`; `server/services/documentStorage.js`; administrator guide; Vercel DPA/security pages | Record store region/access mode, lifecycle and deletion behavior, backup behavior, DPA applicability, and subprocessor/transfer review. |
| 3 | **Neon** | Managed PostgreSQL durable system of record and recovery branches. Component: Prisma/PostgreSQL persistence and Production recovery runbook. | User accounts, tenant/campaign records, sessions, audit/security events, geography, lead/privacy-case operational records, and other application business data. | **Yes** | **Yes** | **Yes**, database connection credentials | Project and branch identities are evidenced; physical processing region/location is **NOT VERIFIED** in the repository. | **NOT VERIFIED** for the actual account | **NOT VERIFIED** | **REQUIRES LEGAL REVIEW** | **NOT VERIFIED**; point-in-time recovery exists, but exact current history window, branch deletion, backups, and termination deletion require account evidence | **NOT VERIFIED** beyond repository operational controls | Prisma configuration; `docs/BACKUP_RECOVERY_RUNBOOK.md`; Production database initialization addendum; existing external-review package | Owner must obtain and archive the applicable Neon DPA/terms, region, subprocessors, transfer safeguards, retention/PITR window, branch lifecycle, deletion, and security evidence. |
| 4 | **OpenAI API** | Server-side model inference for bounded authorized AI features and geographic grounding. Component: `server/services/aiProvider.js`. | Authorized prompts, bounded evidence/context, generated output, provider request metadata, and usage/error metadata. Lead/follow-up data is excluded by design. | **Potentially yes** if authorized inputs contain personal data; application policy should minimize/exclude it | **Potentially yes**, bounded campaign context may be included | **Yes**, `OPENAI_API_KEY` | No account/project data residency setting is evidenced in the repository. | **VERIFIED — public API DPA exists; account applicability/acceptance NOT VERIFIED.** | **VERIFIED — public subprocessor list exists; account-specific snapshot NOT VERIFIED.** | **REQUIRES LEGAL REVIEW** | **PARTIALLY EVIDENCED:** application requests `store: false`; provider-side abuse, security, usage, and account retention terms remain **NOT VERIFIED** for this account | **VERIFIED** at public-document level only | `server/services/aiProvider.js`; `docs/AI_ASSISTANT.md`; responsible-AI/governance tests; [OpenAI DPA](https://openai.com/policies/data-processing-addendum/); [OpenAI subprocessor list](https://platform.openai.com/subprocessors) | Owner must archive applicable business/API terms and DPA acceptance, project controls, retention/data-control settings, current subprocessors, incident/security evidence; counsel must approve any Nigeria-origin transfer and permitted input classes. |
| 5 | **Microsoft Graph / Microsoft 365** | Transactional verification and password-reset email. Component: `server/services/accountNotifications.js`. | Recipient email address, transactional subject/body, verification or reset link/token, delivery metadata, and Microsoft tenant/application identifiers. | **Yes** | Generally account/tenant association may be inferable; campaign content is not required | **Yes**, tenant ID, client ID, and client secret | Not evidenced for the configured Microsoft tenant/mailbox | **VERIFIED — Microsoft public DPA exists; tenant/account applicability and accepted agreement NOT VERIFIED.** | **NOT VERIFIED** for the configured services/tenant | **REQUIRES LEGAL REVIEW** | **NOT VERIFIED** for Exchange mailbox, message trace, delivery, backups, and deletion | **VERIFIED** at public-document level only | `server/services/accountNotifications.js`; `.env.example`; deployment tests; [Microsoft Products and Services DPA](https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum-DPA) | Owner must archive the governing Microsoft agreement/DPA, tenant region, service-specific subprocessors, message retention/deletion and audit settings; counsel must approve transfer and transactional-email handling. |
| 6 | **Upstash-compatible Redis/KV REST service** | Distributed production rate limiting. Components: `server.js`, `server/config/env.js`, Production rate-limit variables. | HMAC-derived expiring rate-limit keys, counters, TTLs, request timing, and provider operational metadata; raw identifiers should not be stored by application design. | **Potentially**, if provider metadata or derived keys remain linkable | **No campaign content intended**; tenant/user-derived rate keys may exist | **Yes**, REST endpoint and token | Not evidenced; endpoint account/region is not recorded in approved repository documentation | **VERIFIED — Upstash public DPA located; actual provider/account and acceptance NOT VERIFIED.** | **NOT VERIFIED** | **REQUIRES LEGAL REVIEW** | **PARTIALLY EVIDENCED:** application counters expire; provider backups/log retention and deletion remain **NOT VERIFIED** | **NOT VERIFIED** for the actual account | `server.js`; `server/config/env.js`; `docs/PRODUCTION.md`; administrator guide; [Upstash public DPA](https://upstash.com/trust/dpa.pdf) | Owner must confirm the service is Upstash, archive the applicable DPA/terms, region, subprocessors, TTL/eviction/backups/log retention, deletion, and security evidence. |
| 7 | **UptimeRobot** | Independent checks of the canonical domain, `/api/health`, and `/api/ready`, plus alert delivery. | Public URL, HTTP status/body, timestamps, latency, monitor configuration, alert-recipient address, and provider-generated network metadata. Readiness performs a bounded database dependency check but returns only sanitized status. | **Yes**, account/contact and IP/network metadata; monitored response bodies should contain no personal data | **No campaign payload intended** | **Yes**, monitoring account credentials (not in repository) | Not evidenced | **NOT VERIFIED** | **NOT VERIFIED** | **REQUIRES LEGAL REVIEW** | **NOT VERIFIED** | **NOT VERIFIED** beyond completed operational monitor tests | `docs/OPERATIONS_MONITORING_RUNBOOK.md`; `docs/V1_PUBLIC_RELEASE_RECORD.md` | Owner must archive terms/DPA or controller terms, processing locations, subprocessors, monitor/log retention and deletion, security evidence, and lawful alert-recipient handling. |
| 8 | **WhatsApp / Meta** | Optional user-initiated external messaging handoff from the public homepage. Component: `shared/whatsapp.js`, `src/pages/MarketingHomePage.tsx`. PoliSmart does not send automatically and has no WhatsApp API/webhook. | Configured business number and draft greeting in the outbound URL; if the visitor elects to send, Meta may process message content, account/device/network identifiers, contacts, and communications metadata outside PoliSmart. | **Yes, if the user proceeds** | No campaign/tenant record is returned to PoliSmart by this implementation | No WhatsApp API credential in this feature; business number is configuration | Not evidenced | **NOT VERIFIED / provider-role characterization unresolved** | **NOT VERIFIED** | **REQUIRES LEGAL REVIEW** | **NOT VERIFIED** and partly controlled by provider/user accounts | **NOT VERIFIED** | `shared/whatsapp.js`; Marketing home page; external-review package; internal governance register | Counsel and owner must classify controller/processor roles, approve notice/consent/communications rules, terms, transfers, subprocessors, rights routing, retention/deletion, opt-out operations, and training before operational follow-up. |
| 9 | **GitHub** | Source repository and Git source for Vercel deployments. It is not an application runtime datastore. | Source code, commit author metadata, issues/PR/support content if used, deployment metadata, and repository secrets only if configured. Production personal/business records are not intended to be stored. | **Yes** for account/contributor metadata; Production application personal data should be **No** | Source may describe tenant logic but should contain no tenant records | **Potentially**, repository/deployment credentials and GitHub tokens | Public repository and GitHub-hosted service are evidenced; exact account data location is not | **VERIFIED — public GitHub DPA exists for specified plans; actual account applicability/acceptance NOT VERIFIED.** | **VERIFIED — public list exists; account-specific applicability NOT VERIFIED.** | **REQUIRES LEGAL REVIEW** | **NOT VERIFIED** for the actual account, logs, deleted repository data, Actions artifacts, and backups | **VERIFIED** at public-document level only | Git remote/deployment metadata; [GitHub customer agreements and DPA](https://github.com/customer-terms); [GitHub subprocessors](https://docs.github.com/en/site-policy/privacy-policies/github-subprocessors) | Owner must document the governing account terms/plan, DPA applicability, access controls, secret scanning, Actions/artifact retention, subprocessors, transfer basis, and deletion procedure. |

## Confirmed from existing documentation

- The external-review package already marked provider contract/DPA status, subprocessors, transfers, and retention as open rather than approved.
- The Production operations documents confirm Vercel, Neon, OpenAI, Microsoft Graph, Vercel Blob, and UptimeRobot are operational dependencies.
- The administrator and Production guides confirm the distributed rate-limit REST interface and production Vercel Blob selection.
- The WhatsApp flow is expressly user initiated and external; no message is sent or ingested automatically.
- Payments and fundraising remain disabled and therefore no payment processor is an active Production dependency.

## Requires owner documentation

For every applicable provider, the owner must supply a restricted evidence package containing:

1. legal customer/entity name and account owner;
2. plan and governing agreement;
3. accepted/executed DPA or documented reason it is not applicable;
4. selected region/data-residency settings;
5. current subprocessor-list snapshot and change-notification subscription;
6. retention, backup, deletion, and termination settings;
7. security attestations and incident-notification route;
8. current service purpose and approved data categories; and
9. contract/version/effective date and next review date.

Secrets, tokens, passwords, database URLs, cookies, and private keys must never be included.

## Requires provider evidence

- Neon account-specific DPA/terms, physical region, subprocessors, PITR/backup retention, branch lifecycle, deletion, and security materials.
- Vercel plan-qualified DPA coverage, Blob/store region and lifecycle, analytics/log retention, subprocessor snapshot, and termination deletion.
- OpenAI account/project DPA coverage, data controls, retention, subprocessors, and approved model/project settings.
- Microsoft tenant agreement/DPA, Exchange/Graph data location, subprocessor/service documentation, and message retention/deletion settings.
- Upstash provider/account confirmation, DPA applicability, selected region, subprocessors, TTL/backups/logs, and deletion.
- UptimeRobot contractual privacy terms, processing locations, subprocessors, retention/deletion, and security evidence.
- Meta/WhatsApp contractual role, processing locations, transfer safeguards, subprocessors, rights route, and retention/deletion evidence.
- GitHub governing account agreement, DPA applicability, location/subprocessors, Actions/log/artifact retention, and deletion evidence.

## Requires legal review

Qualified Nigeria/privacy counsel must decide, for each of the nine service entries:

1. controller, processor, joint-controller, or independent-controller role;
2. lawful basis and data minimization for the stated categories;
3. whether the available DPA/terms bind the actual account and entity;
4. Nigeria cross-border transfer requirements and the adequacy of the proposed safeguard;
5. required notices, consents, rights routing, and processor instructions;
6. retention/deletion schedule and legal-hold interaction;
7. incident and subprocessor-change obligations; and
8. whether the service may remain enabled for the approved Production scope.

No cross-border transfer is approved by this register.

## Evidence classification summary

| Classification | Result |
|---|---|
| Confirmed from repository | 9 external provider/service entries identified |
| Confirmed from existing documentation | Operational use/boundaries documented; contracts and legal approval remain open |
| Requires owner documentation | All 9 entries |
| Requires provider evidence | All 9 entries have at least one unresolved account-specific evidence item |
| Requires legal review | All 9 entries |
| Public DPA/equivalent located | 6 entries: Vercel hosting, Vercel Blob, OpenAI, Microsoft, Upstash, GitHub |
| Account-specific DPA applicability/acceptance verified | 0 entries |
| Subprocessor evidence complete | No |
| Cross-border evidence complete | No |
| Retention/deletion evidence complete | No |

## Production safety statement

This inventory changes documentation only. It does not change code, provider settings, Production data, schema, permissions, deployment state, payments, fundraising, or destructive privacy functionality.

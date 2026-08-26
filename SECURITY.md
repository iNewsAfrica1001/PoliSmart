# Security Policy

## Reporting

Report suspected vulnerabilities privately to Sentinel LLC. Do not include credentials, real campaign data, or respondent-level survey records in reports.

## Controls

- PostgreSQL is the durable record; tenant IDs and permissions are enforced server-side.
- Sessions use HTTP-only, SameSite cookies and production HTTPS requirements.
- Passwords use bcrypt; opaque tokens are stored as hashes.
- Documents are validated, size-limited, tenant-scoped, and processed server-side.
- Raw Afrobarometer respondent records are not exposed to dashboards or AI providers.
- Provider credentials remain server-only through `OPENAI_API_KEY`.
- AI and security audit records are append-only. PostgreSQL triggers reject updates and deletes.
- Governance APIs require the audit-reading permission and return tenant-scoped records.

## Audit coverage

Security events include successful login, document upload/deletion, policy and communications decisions, AI generation, permission changes, and administrative changes. New administrative mutations must emit a `SecurityAuditEvent` before release.

## Operational requirements

Apply migrations, rotate production secrets, restrict database roles, encrypt backups, monitor authentication and AI error reports, test restoration, and retain audit records according to applicable law and campaign policy.

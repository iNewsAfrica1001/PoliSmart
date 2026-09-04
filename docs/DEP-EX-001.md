# DEP-EX-001 — PB-002 deployment exception

Owner authorized this exception on 2026-09-03 for the controlled PB-002 Compliance UI deployment only.

## Scope

- `qs` 6.15.2: GHSA-x5fp-wj9c-mxmx and GHSA-4mjr-xmp4-gh2g (moderate).
- `@xmldom/xmldom` 0.9.10: GHSA-6gmq-8vp8-gcm6 (moderate).

The audit remains FAIL with this explicit exception; it must not be reported as clean.
Any additional finding or high/critical finding stops this deployment. No dependency changes
are authorized in this release. This is not standing approval for future releases.

## Assessment

The inspected application uses Express's simple query parser, JSON body parsing, and
URLSearchParams in its Vercel adapter. No vulnerable qs parsing/serialization path was
identified. qs remains in the production dependency tree.

The vulnerable xmldom copy belongs to Capacitor CLI/plist mobile tooling. Production Mammoth
DOCX extraction resolves to the separate patched 0.8.15 copy. No production path to the
vulnerable copy was identified. These findings do not establish universal exploit immunity.

## Release safeguards

PB-002 changes navigation and restricted-access messaging only. Existing platform-audit:read
policy, organization membership checks, tenant filtering, and audit repositories remain unchanged.
No database, migration, provider, environment, or dependency changes are included.

## Follow-up

Track a separately approved targeted lockfile update to qs 6.16.0 and tooling xmldom 0.9.12,
with full regression/build validation. Reassess this exception before any later release or
change to parsing, XML handling, or dependency paths.

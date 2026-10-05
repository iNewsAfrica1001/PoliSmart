# Nigeria geographic dataset preparation

This directory is an offline preparation workspace for the PoliSmart Africa AI controlled geographic import. Nothing in this directory is executed automatically or connected to Production.

## Authority and release boundary

- Primary electoral authority: Independent National Electoral Commission (INEC).
- Retrieval date: 2026-09-25.
- Exact import levels are recorded in `manifest.json`.
- Unofficial datasets must not be substituted for missing INEC evidence.
- A missing official code or unresolved relationship remains `OPERATOR_REVIEW_REQUIRED` and is excluded from import batches.

## Files

- `manifest.json`: source register, expected totals, contract limits, and unresolved evidence.
- `preparation-records.jsonl`: normalized structural records with record-level provenance. These are **not** import rows.
- `batch-plan.json`: deterministic parent-first sequencing within the 5,000-row request limit.
- `controlled-import-batches/`: offline import-contract rows generated only after structural validation passed. Their presence does not authorize application VALIDATE, PREVIEW, or IMPORT.
- `validation-report.json`: current offline validation result.
- `checksums.sha256`: SHA-256 checksums for generated workspace artifacts.
- `../../../scripts/validate-nigeria-geography.mjs`: offline validator and batch planner.

## Important modeling rule

Senatorial District and Federal Constituency are independent children of State/FCT. Neither is nested beneath the other. LGA/FCT Area Council is also a child of State/FCT; Ward/Registration Area is a child of LGA/FCT Area Council.

## Readiness

The structural Country -> Zone -> State/FCT -> LGA/Area Council -> Ward/RA dataset passes offline validation at 1 / 6 / 37 / 774 / 8,809 records. Country and zone identifiers use the distinct `POLISMART_INTERNAL` `PS-` namespace; State/LGA/Ward components are INEC-issued codes from the official CVR Polling Unit Locator.

The live INEC ward endpoint returned 8,810 raw rows because code `07-07-09` appeared twice with the identical official name. The build retains one normalized record, records both official row identifiers in `validation-report.json`, and fails on any conflicting-name duplicate.

The full seven-level dataset is not ready: current authoritative Senatorial District and Federal Constituency records and codes remain unresolved and intentionally unpopulated.

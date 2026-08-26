# Afrobarometer Public Intelligence Data Pipeline

## Scope and safety boundary

PoliSmart treats Afrobarometer as a public research source for aggregate analysis. The pipeline does not create or expose voter profiles, respondent lookup, psychological traits, persuasion scores, individual political scores, or sensitive-trait targeting. Respondent identifiers and raw answers remain only in the protected source file under `data/raw`; the application database receives metadata, explicit indicator definitions, grouped indicator values, and safeguarded aggregate results.

Normal application APIs expose `survey_aggregate_results` only. They do not expose the raw CSV or respondent-level values.

## Immutable inputs

- `data/raw/polismart_afrobarometer_mvp_cleaned.csv`
  - SHA-256: `afa9a782eebb7add72582f6f5956af28663f21e78b10290dbb3c7c36bdd442bf`
- `data/raw/polismart_afrobarometer_data_dictionary.csv`
  - SHA-256: `f21f0167b30ce218649f1438732d74df764951d659e0f9c2858e7fb14f277b9b`

The importer reads but never rewrites these files. The source hash is the import identity, making repeated runs idempotent.

## Observed source structure

The cleaned file contains 54,803 rows and 362 columns. The dictionary describes 324 survey-question fields, 31 geography/enumeration fields, four weighting fields, and three metadata fields.

Available weight fields are:

- `withinwt_ea`
- `withinwt_hh`
- `Combinwt_old_ea`
- `Combinwt_new_hh`

The importer uses `Combinwt_new_hh` for aggregate preparation and separately validates all four fields. It does not silently substitute a different weighting design.

## Explicit mappings only

The supplied dictionary marks all 324 `Q*` variables as “map with Round 9 codebook,” but supplies no question wording, country code labels, response labels, or thematic definitions. Consequently, every question and country is imported as `UNMAPPED`, and no thematic aggregate is published.

Authoritative mappings belong in `server/config/afrobarometer.js`. Each mapping must explicitly provide:

- survey question code;
- indicator code and display name;
- one of the ten approved intelligence categories;
- a source-response-code to aggregate-response-code mapping.

Never infer meaning from question order, numeric values, neighboring columns, or past survey rounds.

## Pipeline

```text
immutable CSV + dictionary
  → streaming CSV validation
  → source and import hashing
  → question/country/region inventory
  → explicit mapping lookup
  → weight validation
  → country-level grouped values
  → weighted percentages
  → minimum-n suppression
  → aggregate-only API
```

Run a validation-only profile:

```bash
npm run import:afrobarometer -- --dry-run
```

Run the database import after PostgreSQL migrations:

```bash
npm run import:afrobarometer
```

The second database run detects the existing `source_sha256` and returns the prior import without inserting records.

## Database model

- `data_sources`: source identity and attribution.
- `survey_imports`: round, version, hashes, row counts, warnings, weights, and transformation history.
- `survey_questions`: source question codes and mapped/unmapped state.
- `survey_countries`: source country codes and explicit mapping state.
- `survey_regions`: source regions nested under source country codes.
- `survey_indicator_definitions`: reviewed indicator and response mappings.
- `survey_indicator_values`: grouped weighted and unweighted counts, never respondent rows.
- `survey_aggregate_results`: percentages and minimum-sample suppression decisions.

## Weighting and sample safeguards

An aggregate uses only finite, positive `Combinwt_new_hh` values. The weighted percentage is the response group’s summed weight divided by the summed weight of all explicitly mapped valid responses for the same indicator and country. The unweighted sample size is the denominator count, not the response group count.

Results with fewer than 100 valid unweighted responses are stored as suppressed with a null percentage and are excluded by the API. The API returns country, question code, indicator, source, survey round, import version, response code, weighted percentage, unweighted sample size, and weight field.

## Current dry-run report

- Rows inspected: 54,803
- Structurally eligible rows: 54,398
- Rejected rows: 405 (missing required country code)
- Valid positive values per weight field: 52,458
- Missing weight values per field among accepted rows: 1,940
- Invalid weight values: 0
- Zero or negative weight values: 0
- Source country codes observed: 463, all unmapped
- Source country/region pairs observed: 1,079
- Question codes: 324 unmapped, 0 mapped
- Aggregate results: 0 until an authoritative Round 9 mapping/codebook is supplied

## Required follow-up

Obtain and review the authoritative Afrobarometer Round 9 codebook and country/response label files. Add mappings with source citations, peer review the weighting choice and response transformations, rerun tests, then execute a new mapping-version import. Existing imports remain auditable and are never mutated into a different interpretation.

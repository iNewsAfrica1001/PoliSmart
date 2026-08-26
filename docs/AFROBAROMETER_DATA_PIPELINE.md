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

The supplied dictionary marks all 324 `Q*` variables as “map with Round 9 codebook,” but does not itself contain question wording, country labels, or response labels. The reviewed [official Afrobarometer merged Round 9 codebook](https://www.afrobarometer.org/wp-content/uploads/2024/10/AB_R9.MergeCodebook_25Jun24.final_.pdf) supplies the country mapping and the explicit `Q45PT1` public-priority mapping currently enabled. The other 323 questions remain `UNMAPPED` and are not published.

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

The second database run detects the existing `source_sha256` and returns the prior import without inserting records. If an earlier metadata-only import exists with no aggregates, a reviewed mapping version may enrich that import once; subsequent runs remain idempotent.

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
- Eligible rows with an authoritative country code: 53,444
- Rejected rows: 1,359 (missing or invalid country code)
- Valid positive values per weight field: 52,458
- Missing weight values per field among accepted rows: 986
- Invalid weight values: 0
- Zero or negative weight values: 0
- Authoritatively mapped countries: 39
- Valid country/region pairs observed: 519
- Question codes: 323 unmapped, 1 mapped
- Prepared aggregate records: 1,083 (suppressed records retain a null percentage)

## Required follow-up

Add further mappings only after reviewing the official Round 9 codebook and recording the source. Peer review the weighting choice and response transformations before each mapping-version release. Existing source hashes and transformation history remain auditable.

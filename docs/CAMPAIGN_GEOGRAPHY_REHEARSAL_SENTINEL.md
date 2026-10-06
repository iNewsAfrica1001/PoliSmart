# Campaign Geography rehearsal sentinel lifecycle

This procedure is design evidence only. It does not authorize a database connection, sentinel installation, migration, fixture creation, or rehearsal.

## Separate control-plane installation

The test harness never creates its own sentinel. Before a separately authorized rehearsal, an operator must use trusted Neon control-plane information to verify the exact project, non-Production branch ID, and database. The known Production branch `br-noisy-forest-axlven4c` is always prohibited. The authorization must contain the project ID, branch ID, database, unique nonce, fixed purpose `campaign-geography-increment-3a`, environment `non-production`, issue time, and expiry time.

Only after that independent control-plane verification may a separately reviewed installer connect specifically to the authorized branch. It must fail before writing for missing or ambiguous configuration, Production branch, project/branch/database mismatch, invalid purpose, or expired authorization. It writes one `CAMPAIGN_GEOGRAPHY_REHEARSAL_SENTINEL` audit record using `buildRehearsalSentinelSetup()`, reads it back, and verifies exact equality. The installer does not prove the later harness connection; the harness independently reads and compares the database record.

## Expiry and retirement

Each authorization uses a new nonce and one bounded expiry. A new rehearsal requires a new authorization and sentinel. The harness rejects missing, malformed, expired, retired, wrong-project, wrong-branch, wrong-database, wrong-environment, wrong-purpose, or wrong-nonce evidence.

Because security audit evidence is append-only, teardown retires rather than deletes the sentinel. A separately controlled teardown writes `CAMPAIGN_GEOGRAPHY_REHEARSAL_SENTINEL_RETIRED` using `buildRehearsalSentinelRetirement()`, then reads back the sentinel and retirement evidence and confirms the harness rejects that nonce. Retirement or cleanup failure fails the rehearsal and requires operator attention; the nonce must never be reused.

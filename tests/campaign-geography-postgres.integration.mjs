import test from "node:test";
import assert from "node:assert/strict";

const migratorUrl = process.env.CAMPAIGN_GEOGRAPHY_TEST_MIGRATOR_URL;
const runtimeUrl = process.env.CAMPAIGN_GEOGRAPHY_TEST_RUNTIME_URL;
const fixtureText = process.env.CAMPAIGN_GEOGRAPHY_TEST_FIXTURE;
const enabled = Boolean(migratorUrl && runtimeUrl && fixtureText);

const behaviors = [
  "authorized assignment",
  "database actor authorization-state validation",
  "campaign-country match",
  "foreign-country rejection",
  "mixed-country rejection",
  "ancestry closure",
  "parent-only assignment",
  "inactive master rejection",
  "reactivation",
  "idempotent retry",
  "soft deactivation",
  "deactivation ancestry revalidation",
  "blocked ancestor removal",
  "bulk all-or-nothing",
  "transaction rollback",
  "audit rollback",
  "audit actor attribution",
  "concurrent operations",
  "duplicate protection",
  "PUBLIC EXECUTE denial",
  "runtime direct table-write denial",
  "controlled runtime function execution",
];

// This suite is intentionally dormant until an isolated PostgreSQL rehearsal is separately
// authorized. The fixture is a JSON document containing only UUIDs for a disposable tenant,
// campaign, authorized/unauthorized actors, and representative same/foreign-country areas.
// No Production URL or fixture is accepted by repository defaults.
for (const behavior of behaviors) {
  test(`PostgreSQL rehearsal: ${behavior}`, { skip: !enabled }, async () => {
    const fixture = JSON.parse(fixtureText);
    assert.equal(fixture.environment, "isolated-non-production");
    assert.notEqual(fixture.branchId, "br-noisy-forest-axlven4c");
    const { runCampaignGeographyPostgresBehavior } = await import(
      "../scripts/lib/campaign-geography-postgres-harness.mjs"
    );
    await runCampaignGeographyPostgresBehavior({ behavior, migratorUrl, runtimeUrl, fixture });
  });
}

export const CAMPAIGN_GEOGRAPHY_POSTGRES_BEHAVIORS = Object.freeze(behaviors);

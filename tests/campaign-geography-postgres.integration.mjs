import test from "node:test";

const migratorUrl = process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_MIGRATOR_URL;
const runtimeUrl = process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_RUNTIME_URL;
const unprivilegedUrl = process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_UNPRIVILEGED_URL;
const authorizationText = process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_AUTHORIZATION;
const enabled = Boolean(migratorUrl && runtimeUrl && unprivilegedUrl && authorizationText);

const behaviors = [
  "authorized assignment", "database actor authorization-state validation", "campaign-country match",
  "foreign-country rejection", "mixed-country rejection", "ancestry closure", "parent-only assignment",
  "inactive master rejection", "reactivation", "idempotent retry", "soft deactivation",
  "deactivation ancestry revalidation", "blocked ancestor removal", "bulk all-or-nothing",
  "transaction rollback", "audit rollback", "audit actor attribution", "concurrent operations",
  "duplicate protection", "PUBLIC EXECUTE assignment denial", "PUBLIC EXECUTE deactivation denial",
  "controlled runtime function execution", "runtime direct table-write denial",
];

// Genuine PostgreSQL assertions; dormant until a separately authorized isolated rehearsal has
// trusted operator authorization plus a matching database-side sentinel. DATABASE_URL is rejected.
for (const behavior of behaviors) {
  test(`PostgreSQL rehearsal: ${behavior}`, { skip: !enabled }, async () => {
    const authorization = JSON.parse(authorizationText);
    const { runCampaignGeographyPostgresBehavior } = await import("../scripts/lib/campaign-geography-postgres-harness.mjs");
    await runCampaignGeographyPostgresBehavior({ behavior, migratorUrl, runtimeUrl, unprivilegedUrl, authorization,
      genericDatabaseUrl: process.env.DATABASE_URL });
  });
}

export const CAMPAIGN_GEOGRAPHY_POSTGRES_BEHAVIORS = Object.freeze(behaviors);

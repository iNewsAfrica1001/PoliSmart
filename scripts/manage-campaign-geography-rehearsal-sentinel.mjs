import { installRehearsalSentinel, parseRequiredJson, retireRehearsalSentinel } from "./lib/campaign-geography-rehearsal-control.mjs";
import { createRehearsalAdapter } from "./lib/campaign-geography-rehearsal-prisma-adapter.mjs";

async function main() {
  if (process.env.DATABASE_URL || process.env.MIGRATION_DATABASE_URL) throw new Error("Generic database URL substitution is prohibited.");
  const command = process.argv[2];
  if (!["install", "retire"].includes(command)) throw new Error("Expected sentinel command: install or retire.");
  const url = process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_MIGRATOR_URL;
  if (!url) throw new Error("CAMPAIGN_GEOGRAPHY_REHEARSAL_MIGRATOR_URL is required.");
  const authorization = parseRequiredJson(process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_AUTHORIZATION, "authorization");
  const controlPlane = parseRequiredJson(process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_CONTROL_PLANE, "control-plane evidence");
  const adapter = createRehearsalAdapter(url);
  try {
    if (command === "install") await installRehearsalSentinel({ adapter, authorization, controlPlane });
    else await retireRehearsalSentinel({ adapter, authorization, controlPlane });
    console.log(JSON.stringify({ outcome: command === "install" ? "SENTINEL_INSTALLED" : "SENTINEL_RETIRED" }));
  } finally { await adapter.disconnect(); }
}

main().catch(() => { console.error("Campaign Geography rehearsal sentinel operation failed safely."); process.exitCode = 1; });

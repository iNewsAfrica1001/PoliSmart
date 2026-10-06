import path from "node:path";
import { bootstrapRehearsalCredentials, parseRequiredJson, REHEARSAL_ENV_FILE,
  validateBootstrapEnvironment, writeCredentialEnvironment } from "./lib/campaign-geography-rehearsal-control.mjs";
import { createRehearsalAdapter } from "./lib/campaign-geography-rehearsal-prisma-adapter.mjs";

async function main() {
  validateBootstrapEnvironment(process.env);
  const authorization = parseRequiredJson(process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_AUTHORIZATION, "authorization");
  const controlPlane = parseRequiredJson(process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_CONTROL_PLANE, "control-plane evidence");
  const adapter = createRehearsalAdapter(process.env.CAMPAIGN_GEOGRAPHY_REHEARSAL_OWNER_URL);
  try {
    const urls = await bootstrapRehearsalCredentials({ adapter, authorization, controlPlane });
    await writeCredentialEnvironment({ filePath: path.resolve(REHEARSAL_ENV_FILE), urls });
    console.log(JSON.stringify({ outcome: "REHEARSAL_CREDENTIALS_BOOTSTRAPPED", output: REHEARSAL_ENV_FILE,
      roles: ["polismart_migrator", "polismart_runtime", "polismart_rehearsal_unprivileged"] }));
  } finally { await adapter.disconnect(); }
}

main().catch(() => { console.error("Campaign Geography rehearsal credential bootstrap failed safely."); process.exitCode = 1; });

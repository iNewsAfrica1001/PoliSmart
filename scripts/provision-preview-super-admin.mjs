import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : "";
}

async function main() {
  const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL || "";
  if (!migrationDatabaseUrl) throw new Error("MIGRATION_DATABASE_URL is required for this session.");
  const email = argument("email");
  const organizationId = argument("organization-id");
  const expectedBranchId = process.env.POLISMART_PREVIEW_NEON_BRANCH_ID || "";

  process.env.DATABASE_URL = migrationDatabaseUrl;
  const [{ PrismaClient }, repositoryModule, service] = await Promise.all([
    import("@prisma/client"),
    import("../server/repositories/previewSuperAdminProvisioningRepository.js"),
    import("../server/services/previewSuperAdminProvisioning.js"),
  ]);
  const db = new PrismaClient();
  try {
    const repository = repositoryModule.createPreviewSuperAdminProvisioningRepository(db);
    const prepared = await service.preparePreviewSuperAdminProvisioning({
      repository,
      email,
      organizationId,
      expectedBranchId,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    });
    stdout.write("\nControlled Preview provisioning target\n");
    stdout.write(`User: ${prepared.user.displayName} <${prepared.user.email}>\n`);
    stdout.write(`Organization: ${prepared.organization.name} (${prepared.organization.id})\n`);
    stdout.write(`Role: ${service.PREVIEW_SUPER_ADMIN_ROLE}\n`);
    stdout.write("Environment: Preview\n\n");
    const prompt = createInterface({ input: stdin, output: stdout });
    const response = await prompt.question(
      'Type "PROVISION PREVIEW SUPER ADMINISTRATOR" to confirm: ',
    );
    prompt.close();
    await service.executePreviewSuperAdminProvisioning({
      repository,
      prepared,
      confirmed: response === "PROVISION PREVIEW SUPER ADMINISTRATOR",
    });
    stdout.write("Preview SUPER_ADMINISTRATOR provisioning completed and audited.\n");
  } finally {
    await db.$disconnect();
    delete process.env.DATABASE_URL;
    delete process.env.MIGRATION_DATABASE_URL;
  }
}

main().catch((error) => {
  process.stderr.write(`Provisioning refused: ${error.code || "ERROR"}: ${error.message}\n`);
  process.exitCode = 1;
});

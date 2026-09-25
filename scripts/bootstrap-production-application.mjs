import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const EXPECTED_DATABASE = "neondb";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : "";
}

function assertDirectUrl(value) {
  let target;
  try {
    target = new URL(value);
  } catch {
    throw Object.assign(new Error("MIGRATION_DATABASE_URL is invalid."), { code: "INVALID_URL" });
  }
  if (target.hostname.includes("-pooler"))
    throw Object.assign(new Error("A direct Neon connection is required."), {
      code: "POOLED_URL_BLOCKED",
    });
}

async function main() {
  const mode = argument("mode");
  if (!new Set(["catalog-only", "super-admin"]).has(mode))
    throw Object.assign(new Error("--mode must be catalog-only or super-admin."), {
      code: "MODE_REQUIRED",
    });
  if (String(process.env.NODE_ENV).toLowerCase() !== "production")
    throw Object.assign(new Error("NODE_ENV must be production."), {
      code: "PRODUCTION_ENV_REQUIRED",
    });
  const migrationUrl = process.env.MIGRATION_DATABASE_URL || "";
  const expectedBranchId = process.env.POLISMART_PRODUCTION_NEON_BRANCH_ID || "";
  if (!migrationUrl || !expectedBranchId)
    throw Object.assign(
      new Error("The protected migration URL and expected branch ID are required."),
      {
        code: "PRODUCTION_IDENTITY_REQUIRED",
      },
    );
  assertDirectUrl(migrationUrl);

  process.env.DATABASE_URL = migrationUrl;
  const [{ PrismaClient }, repositoryModule, service] = await Promise.all([
    import("@prisma/client"),
    import("../server/repositories/productionBootstrapRepository.js"),
    import("../server/services/productionBootstrap.js"),
  ]);
  const db = new PrismaClient();
  try {
    const repository = repositoryModule.createProductionBootstrapRepository(db);
    const identity = await repository.getDatabaseIdentity();
    if (identity?.database !== EXPECTED_DATABASE || identity?.branchId !== expectedBranchId)
      throw Object.assign(
        new Error("The connected database identity is not the approved target."),
        {
          code: "DATABASE_IDENTITY_MISMATCH",
        },
      );
    if (mode === "catalog-only") {
      const result = await service.bootstrapProductionCatalog(repository);
      stdout.write(
        `Production authorization catalog synchronized (${result.permissions} permissions, ${result.mappings} mappings).\n`,
      );
      return;
    }

    const prepared = await service.prepareProductionSuperAdminAssignment({
      repository,
      userId: argument("user-id"),
      organizationId: argument("organization-id"),
      operatorUserId: argument("operator-user-id"),
    });
    stdout.write(
      "Production Super Administrator assignment is ready for independent confirmation.\n",
    );
    const prompt = createInterface({ input: stdin, output: stdout });
    const confirmation = await prompt.question(
      `Type "${service.PRODUCTION_SUPER_ADMIN_CONFIRMATION}" to confirm: `,
    );
    prompt.close();
    await service.assignProductionSuperAdmin({ repository, prepared, confirmation });
    stdout.write("Production Super Administrator assignment completed and audited.\n");
  } finally {
    await db.$disconnect();
    delete process.env.DATABASE_URL;
    delete process.env.MIGRATION_DATABASE_URL;
  }
}

main().catch((error) => {
  process.stderr.write(
    `Production bootstrap refused: ${error.code || "ERROR"}: ${error.message}\n`,
  );
  process.exitCode = 1;
});

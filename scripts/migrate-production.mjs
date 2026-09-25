import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const defaultPrismaCliPath = require.resolve("prisma/build/index.js");

export function runProductionMigration({
  environment = process.env,
  nodeExecutable = process.execPath,
  prismaCliPath = defaultPrismaCliPath,
  spawn = spawnSync,
  reportError = console.error,
} = {}) {
  const migrationUrl = environment.MIGRATION_DATABASE_URL;
  if (!migrationUrl) {
    reportError("MIGRATION_DATABASE_URL is required for production migrations.");
    return 1;
  }

  const result = spawn(nodeExecutable, [prismaCliPath, "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...environment, DATABASE_URL: migrationUrl },
  });
  if (result.error) {
    reportError(`Unable to start Prisma migration process (${result.error.code || "UNKNOWN"}).`);
    return 1;
  }
  return Number.isInteger(result.status) ? result.status : 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exitCode = runProductionMigration();

import { spawnSync } from "node:child_process";

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (!migrationUrl) {
  console.error("MIGRATION_DATABASE_URL is required for production migrations.");
  process.exit(1);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: migrationUrl },
});
process.exit(result.status ?? 1);

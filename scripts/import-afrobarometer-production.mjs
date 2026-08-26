import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured; production import was not started.");
  process.exit(1);
}

let target;
try {
  target = new URL(process.env.DATABASE_URL);
} catch {
  console.error("DATABASE_URL is invalid; production import was not started.");
  process.exit(1);
}
if (["localhost", "127.0.0.1"].includes(target.hostname)) {
  console.error("DATABASE_URL points to a local database; production import was not started.");
  process.exit(1);
}

function run(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...args], {
      cwd: root,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${script} failed.`))));
  });
}

try {
  await run("validate-production-database.mjs");
  await run("import-afrobarometer.mjs");
  await run("validate-production-database.mjs");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

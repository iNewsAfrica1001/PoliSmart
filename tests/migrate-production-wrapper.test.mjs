import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { runProductionMigration } from "../scripts/migrate-production.mjs";

test("production migration wrapper launches Prisma through Node without npx.cmd", () => {
  const calls = [];
  const migrationUrl = "postgresql://synthetic-migrator:synthetic@example.test/neondb";
  const status = runProductionMigration({
    environment: { MIGRATION_DATABASE_URL: migrationUrl, SAFE_MARKER: "preserved" },
    nodeExecutable: "C:\\Program Files\\nodejs\\node.exe",
    prismaCliPath: "C:\\workspace with spaces\\node_modules\\prisma\\build\\index.js",
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0 };
    },
  });

  assert.equal(status, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "C:\\Program Files\\nodejs\\node.exe");
  assert.deepEqual(calls[0].args, [
    "C:\\workspace with spaces\\node_modules\\prisma\\build\\index.js",
    "migrate",
    "deploy",
  ]);
  assert.equal(calls[0].options.stdio, "inherit");
  assert.equal(calls[0].options.env.DATABASE_URL, migrationUrl);
  assert.equal(calls[0].options.env.MIGRATION_DATABASE_URL, migrationUrl);
  assert.equal(calls[0].options.env.SAFE_MARKER, "preserved");
  assert.doesNotMatch(calls[0].command, /npx(?:\.cmd)?$/i);
});

test("production migration wrapper fails before spawning without migration URL", () => {
  const errors = [];
  let spawned = false;
  const status = runProductionMigration({
    environment: {},
    spawn() {
      spawned = true;
      return { status: 0 };
    },
    reportError(message) {
      errors.push(message);
    },
  });
  assert.equal(status, 1);
  assert.equal(spawned, false);
  assert.deepEqual(errors, ["MIGRATION_DATABASE_URL is required for production migrations."]);
});

test("production migration wrapper reports process launch failure and preserves exit codes", () => {
  const errors = [];
  const failedLaunch = runProductionMigration({
    environment: { MIGRATION_DATABASE_URL: "synthetic" },
    spawn() {
      return { status: null, error: { code: "EINVAL" } };
    },
    reportError(message) {
      errors.push(message);
    },
  });
  assert.equal(failedLaunch, 1);
  assert.deepEqual(errors, ["Unable to start Prisma migration process (EINVAL)."]);

  const prismaFailure = runProductionMigration({
    environment: { MIGRATION_DATABASE_URL: "synthetic" },
    spawn() {
      return { status: 7 };
    },
  });
  assert.equal(prismaFailure, 7);
});

test("resolved Prisma CLI is local and migration files are not invoked by module import", () => {
  let captured;
  runProductionMigration({
    environment: { MIGRATION_DATABASE_URL: "synthetic" },
    spawn(command, args) {
      captured = { command, args };
      return { status: 0 };
    },
  });
  assert.equal(path.isAbsolute(captured.command), true);
  assert.equal(path.isAbsolute(captured.args[0]), true);
  assert.match(captured.args[0], /node_modules[\\/]prisma[\\/]build[\\/]index\.js$/);
  assert.deepEqual(captured.args.slice(1), ["migrate", "deploy"]);
});

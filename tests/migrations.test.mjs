import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

test("database migrations are ordered, non-empty, and create every production milestone table", () => {
  const root = "prisma/migrations";
  const directories = readdirSync(root, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort();
  assert.deepEqual(
    directories.map((name) => name.slice(0, 4)),
    directories.map((_, index) => String(index + 1).padStart(4, "0")),
  );
  const sql = directories
    .map((directory) => readFileSync(path.join(root, directory, "migration.sql"), "utf8"))
    .join("\n");
  for (const table of [
    "organizations",
    "campaigns",
    "memberships",
    "knowledge_documents",
    "survey_aggregate_results",
    "ai_conversations",
    "policy_cases",
    "media_items",
    "communications",
    "ai_usage_logs",
    "ai_error_reports",
  ])
    assert.match(sql, new RegExp(`CREATE TABLE ["]?${table}`));
  assert.match(sql, /prevent_governance_log_mutation/);
  assert.match(sql, /tenant_id/);
});

test("every migration uses PostgreSQL constraints or indexes", () => {
  for (const directory of readdirSync("prisma/migrations", { withFileTypes: true }).filter((item) =>
    item.isDirectory(),
  )) {
    const sql = readFileSync(
      path.join("prisma/migrations", directory.name, "migration.sql"),
      "utf8",
    );
    assert.ok(sql.trim().length > 100, `${directory.name} is unexpectedly empty`);
    assert.match(
      sql,
      /(?:CONSTRAINT|CREATE (?:UNIQUE )?INDEX)/,
      `${directory.name} lacks constraints or indexes`,
    );
  }
});

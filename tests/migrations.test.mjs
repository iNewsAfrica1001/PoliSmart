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
    "prelaunch_leads",
    "prelaunch_lead_follow_ups",
  ])
    assert.match(sql, new RegExp(`CREATE TABLE ["]?${table}`));
  assert.match(sql, /prevent_governance_log_mutation/);
  assert.match(sql, /tenant_id/);
});

test("lead follow-up migration is additive, append-preserving, and narrowly privileged", () => {
  const sql = readFileSync(
    "prisma/migrations/0013_lead_follow_up_workflow/migration.sql",
    "utf8",
  );

  assert.match(sql, /CREATE TABLE "prelaunch_lead_follow_ups"/);
  assert.match(sql, /"note" VARCHAR\(2000\) NOT NULL/);
  assert.match(sql, /prelaunch_lead_follow_ups_completion_check/);
  assert.match(sql, /completed_at.*IS NULL.*completed_by_id.*IS NULL/s);
  assert.match(sql, /completed_at.*IS NOT NULL.*completed_by_id.*IS NOT NULL/s);
  assert.equal((sql.match(/ON DELETE RESTRICT/g) || []).length, 3);
  for (const index of [
    "lead_id_created_at_idx",
    "completed_at_scheduled_at_idx",
    "created_by_id_idx",
    "completed_by_id_idx",
  ])
    assert.match(sql, new RegExp(index));

  assert.match(
    sql,
    /GRANT SELECT, INSERT ON TABLE "prelaunch_lead_follow_ups" TO "polismart_runtime"/,
  );
  assert.match(
    sql,
    /GRANT UPDATE \("completed_at", "completed_by_id"\)[\s\S]*TO "polismart_runtime"/,
  );
  const roleGuard = sql.slice(sql.indexOf("DO $$"));
  assert.match(roleGuard, /IF EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'polismart_runtime'\) THEN/);
  assert.match(roleGuard, /EXECUTE 'GRANT SELECT, INSERT ON TABLE/);
  assert.match(roleGuard, /EXECUTE 'GRANT UPDATE \("completed_at", "completed_by_id"\) ON TABLE/);
  assert.match(roleGuard, /END IF;/);
  assert.doesNotMatch(sql, /\bCREATE\s+(?:USER|ROLE)\s+"?polismart_runtime"?/i);
  assert.doesNotMatch(sql, /GRANT\s+(?:[^;]*,\s*)?DELETE\b/i);
  assert.doesNotMatch(sql, /GRANT\s+UPDATE\s+ON\s+(?:TABLE\s+)?"prelaunch_lead_follow_ups"/i);
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i);
  assert.doesNotMatch(sql, /ALTER\s+TABLE[\s\S]*\b(?:DROP|ALTER\s+COLUMN)\b/i);
  assert.doesNotMatch(sql, /\bUPDATE\s+"?prelaunch_leads"?\s+SET\b/i);
});

test("every migration contains a substantive schema change", () => {
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
      /(?:CONSTRAINT|CREATE (?:UNIQUE )?INDEX|CREATE TABLE|CREATE TYPE|ALTER TYPE|CREATE (?:OR REPLACE )?FUNCTION|CREATE TRIGGER)/,
      `${directory.name} lacks a substantive schema operation`,
    );
  }
});

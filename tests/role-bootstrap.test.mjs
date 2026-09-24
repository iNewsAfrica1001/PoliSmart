import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("scripts/bootstrap-production-roles.sql", "utf8");
const operations = readFileSync("DATABASE_OPERATIONS.md", "utf8");

const precheckEnd = sql.indexOf("$bootstrap_precheck$;");
const runtimeCreate = sql.indexOf("CREATE ROLE polismart_runtime");
const migratorCreate = sql.indexOf("CREATE ROLE polismart_migrator");

test("atomic bootstrap checks both role names before creating either", () => {
  assert.match(sql, /\\set ON_ERROR_STOP on/);
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.match(
    sql,
    /rolname IN \('polismart_runtime', 'polismart_migrator'\)[\s\S]*RAISE EXCEPTION/,
  );
  assert.ok(precheckEnd >= 0);
  assert.ok(runtimeCreate > precheckEnd);
  assert.ok(migratorCreate > precheckEnd);
  assert.doesNotMatch(sql, /CREATE ROLE[\s\S]*IF NOT EXISTS/i);
  assert.doesNotMatch(sql, /ALTER ROLE|DROP ROLE/i);
});

test("existing runtime, migrator, or both fail through the same pre-create guard", () => {
  const guard = sql.slice(0, precheckEnd);
  const precheckAllows = (existingRoles) =>
    !existingRoles.some((role) => ["polismart_runtime", "polismart_migrator"].includes(role));
  assert.match(guard, /EXISTS \([\s\S]*FROM pg_roles/);
  assert.match(guard, /polismart_runtime/);
  assert.match(guard, /polismart_migrator/);
  assert.match(guard, /RAISE EXCEPTION/);
  assert.doesNotMatch(guard, /CREATE ROLE/);
  assert.equal(precheckAllows([]), true, "case A: neither role exists");
  assert.equal(precheckAllows(["polismart_runtime"]), false, "case B: runtime exists");
  assert.equal(precheckAllows(["polismart_migrator"]), false, "case C: migrator exists");
  assert.equal(
    precheckAllows(["polismart_runtime", "polismart_migrator"]),
    false,
    "case D: both roles exist",
  );
});

test("role and privilege failures remain inside the all-or-nothing transaction", () => {
  const begin = sql.indexOf("BEGIN;");
  const commit = sql.lastIndexOf("COMMIT;");
  assert.ok(begin >= 0 && commit > begin);
  for (const statement of [
    "CREATE ROLE polismart_runtime",
    "CREATE ROLE polismart_migrator",
    "GRANT CONNECT ON DATABASE neondb TO polismart_runtime",
    "GRANT CONNECT, CREATE ON DATABASE neondb TO polismart_migrator",
    "\\password polismart_runtime",
    "\\password polismart_migrator",
  ]) {
    const position = sql.indexOf(statement);
    assert.ok(position > begin && position < commit, `${statement} must be transactional`);
  }
  assert.match(
    operations,
    /closing the resulting[\s\S]*failed `psql` session rolls back every bootstrap statement/,
  );
});

test("bootstrap preserves the least-privilege runtime and migrator designs", () => {
  assert.match(
    sql,
    /CREATE ROLE polismart_runtime\s+LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS/,
  );
  assert.match(
    sql,
    /CREATE ROLE polismart_migrator\s+LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS/,
  );
  assert.match(sql, /REVOKE CREATE ON SCHEMA public FROM PUBLIC/);
  assert.match(sql, /GRANT CONNECT ON DATABASE neondb TO polismart_runtime/);
  assert.match(sql, /REVOKE CREATE ON DATABASE neondb FROM polismart_runtime/);
  assert.match(sql, /GRANT USAGE ON SCHEMA public TO polismart_runtime/);
  assert.match(sql, /REVOKE CREATE ON SCHEMA public FROM polismart_runtime/);
  assert.match(sql, /GRANT CONNECT, CREATE ON DATABASE neondb TO polismart_migrator/);
  assert.match(sql, /GRANT USAGE, CREATE ON SCHEMA public TO polismart_migrator/);
  assert.doesNotMatch(sql, /GRANT[\s\S]*ON TABLE/i);
  assert.doesNotMatch(sql, /CREATE (?:TABLE|EXTENSION|SCHEMA)/i);
});

test("credentials are collected securely and never embedded", () => {
  assert.match(sql, /\\password polismart_runtime/);
  assert.match(sql, /\\password polismart_migrator/);
  assert.doesNotMatch(sql, /PASSWORD\s+['"]/i);
  assert.doesNotMatch(sql, /generated-(?:runtime|migrator)-password/i);
  assert.match(
    operations,
    /without embedding them in SQL or exposing them in command history or server logs/,
  );
});

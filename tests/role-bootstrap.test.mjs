import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("scripts/bootstrap-production-roles.sql", "utf8");
const operations = readFileSync("DATABASE_OPERATIONS.md", "utf8");

const precheckEnd = sql.indexOf("$bootstrap_precheck$;");
const runtimeCreate = sql.indexOf("CREATE ROLE polismart_runtime");
const migratorCreate = sql.indexOf("CREATE ROLE polismart_migrator");
const runtimePasswordAssignment = sql.indexOf(
  "ALTER ROLE polismart_runtime PASSWORD :'runtime_password';",
);
const migratorPasswordAssignment = sql.indexOf(
  "ALTER ROLE polismart_migrator PASSWORD :'migrator_password';",
);

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
  assert.doesNotMatch(sql.slice(0, runtimeCreate), /ALTER ROLE|DROP ROLE/i);
  assert.doesNotMatch(sql, /DROP ROLE/i);
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
    "\\prompt -s 'Enter password for polismart_runtime: ' runtime_password",
    "\\prompt -s 'Enter password for polismart_migrator: ' migrator_password",
    "ALTER ROLE polismart_runtime PASSWORD :'runtime_password';",
    "ALTER ROLE polismart_migrator PASSWORD :'migrator_password';",
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
  assert.doesNotMatch(sql, /\\password\b/);
  assert.match(sql, /\\prompt -s 'Enter password for polismart_runtime: ' runtime_password/);
  assert.match(sql, /\\prompt -s 'Enter password for polismart_migrator: ' migrator_password/);
  assert.match(sql, /ALTER ROLE polismart_runtime PASSWORD :'runtime_password';/);
  assert.match(sql, /ALTER ROLE polismart_migrator PASSWORD :'migrator_password';/);
  assert.doesNotMatch(sql, /PASSWORD\s+'[^:]/i);
  assert.doesNotMatch(sql, /generated-(?:runtime|migrator)-password/i);
  assert.ok(runtimePasswordAssignment > runtimeCreate);
  assert.ok(migratorPasswordAssignment > migratorCreate);
  assert.ok(runtimePasswordAssignment < migratorPasswordAssignment);
  assert.ok(runtimePasswordAssignment < sql.lastIndexOf("COMMIT;"));
  assert.ok(migratorPasswordAssignment < sql.lastIndexOf("COMMIT;"));
  assert.equal((sql.match(/ALTER ROLE\s+\w+\s+PASSWORD/gi) ?? []).length, 2);
  assert.match(sql, /\\unset runtime_password/);
  assert.match(sql, /\\unset migrator_password/);
  assert.match(operations, /safe SQL-literal interpolation/);
});

test("password and grant failures roll back both newly created roles", () => {
  const executeTransaction = (failurePoint) => {
    const state = { roles: new Set() };
    const snapshot = new Set(state.roles);
    try {
      for (const step of [
        "create-runtime",
        "create-migrator",
        "grant",
        "runtime-password",
        "migrator-password",
      ]) {
        if (step === "create-runtime") state.roles.add("polismart_runtime");
        if (step === "create-migrator") state.roles.add("polismart_migrator");
        if (step === failurePoint) throw new Error(`simulated ${step} failure`);
      }
      return state;
    } catch {
      state.roles = snapshot;
      return state;
    }
  };

  for (const failurePoint of ["runtime-password", "migrator-password", "grant"]) {
    assert.deepEqual(
      [...executeTransaction(failurePoint).roles],
      [],
      `${failurePoint} must leave neither newly created role`,
    );
  }
});

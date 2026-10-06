import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import {
  RUNTIME_DATABASE_PRIVILEGES,
  RUNTIME_FUNCTION_PRIVILEGES,
  RUNTIME_SEQUENCE_PRIVILEGES,
} from "../server/config/databasePrivileges.js";
import {
  validateProtectedGeographyTables,
  validateRuntimeFunctions,
} from "../scripts/lib/runtime-function-validation.mjs";

const migrationRoot = "prisma/migrations";
const migrationSql = () =>
  readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => readFileSync(path.join(migrationRoot, entry.name, "migration.sql"), "utf8"))
    .join("\n");
const identifiers = (value) => [...value.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

test("runtime privilege catalog covers every migration-created table and no sequence is required", () => {
  const sql = migrationSql();
  const tables = [...sql.matchAll(/CREATE TABLE\s+"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(Object.keys(RUNTIME_DATABASE_PRIVILEGES).sort(), [...new Set(tables)].sort());
  assert.deepEqual(RUNTIME_SEQUENCE_PRIVILEGES, {});
  assert.doesNotMatch(sql, /CREATE\s+(?:SEQUENCE|TABLE[\s\S]*?\bSERIAL\b)/i);
});

test("every column-limited update names a real database column", () => {
  const columnsByTable = Object.fromEntries(
    Prisma.dmmf.datamodel.models.map((model) => [
      model.dbName || model.name,
      new Set(
        model.fields
          .filter((field) => field.kind !== "object")
          .map((field) => field.dbName || field.name),
      ),
    ]),
  );
  for (const [table, policy] of Object.entries(RUNTIME_DATABASE_PRIVILEGES))
    for (const column of policy.updateColumns)
      assert.equal(columnsByTable[table]?.has(column), true, `${table}.${column} is not in Prisma`);
});
test("runtime geographic updates allow required fields and prohibit provenance mutation", () => {
  assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES.geographic_levels.updateColumns, [
    "name",
    "order_index",
    "is_active",
    "updated_at",
  ]);
  assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES.geographic_areas.updateColumns, [
    "level_id",
    "parent_id",
    "name",
    "code",
    "is_active",
    "updated_at",
  ]);
  for (const prohibited of [
    "source_institution",
    "source_document",
    "source_version_date",
    "retrieval_date",
    "imported_at",
    "validation_status",
  ])
    assert.equal(
      RUNTIME_DATABASE_PRIVILEGES.geographic_areas.updateColumns.includes(prohibited),
      false,
    );
});

test("migrations 0015-0020 exactly implement the reviewed table and column policy", () => {
  const sql = readFileSync(
    "prisma/migrations/0015_runtime_privilege_catalog/migration.sql",
    "utf8",
  );
  const grantsSql = `${sql}\n${readFileSync("prisma/migrations/0016_geographic_management/migration.sql", "utf8")}\n${readFileSync("prisma/migrations/0017_geographic_provenance_retrieval_date/migration.sql", "utf8")}\n${readFileSync("prisma/migrations/0018_command_center_reference_table_read_privileges/migration.sql", "utf8")}\n${readFileSync("prisma/migrations/0019_privacy_operations_controls/migration.sql", "utf8")}\n${readFileSync("prisma/migrations/0020_campaign_geography_master_assignment_schema/migration.sql", "utf8")}`;
  const revokedTables = [
    ...grantsSql.matchAll(/REVOKE ALL PRIVILEGES ON TABLE([\s\S]*?)FROM "polismart_runtime";/g),
  ].flatMap((match) => identifiers(match[1]));
  assert.deepEqual(
    [...new Set(revokedTables)].sort(),
    Object.keys(RUNTIME_DATABASE_PRIVILEGES).sort(),
  );

  const actual = Object.fromEntries(
    Object.keys(RUNTIME_DATABASE_PRIVILEGES).map((table) => [
      table,
      { tablePrivileges: new Set(), updateColumns: new Set() },
    ]),
  );
  for (const match of grantsSql.matchAll(
    /GRANT\s+((?:SELECT|INSERT|DELETE)(?:\s*,\s*(?:SELECT|INSERT|DELETE))*)\s+ON TABLE([\s\S]*?)TO "polismart_runtime";/g,
  ))
    for (const table of identifiers(match[2]))
      for (const privilege of match[1].split(",").map((value) => value.trim()))
        actual[table].tablePrivileges.add(privilege);

  for (const match of grantsSql.matchAll(
    /GRANT UPDATE\s*\(([^)]+)\)\s*ON TABLE([\s\S]*?)TO "polismart_runtime";/g,
  ))
    for (const table of identifiers(match[2]))
      for (const column of identifiers(match[1])) actual[table].updateColumns.add(column);

  for (const [table, expected] of Object.entries(RUNTIME_DATABASE_PRIVILEGES)) {
    assert.deepEqual(
      [...actual[table].tablePrivileges].sort(),
      [...expected.tablePrivileges].sort(),
    );
    assert.deepEqual([...actual[table].updateColumns].sort(), [...expected.updateColumns].sort());
  }
  assert.doesNotMatch(sql, /GRANT\s+UPDATE\s+ON\s+TABLE/i);
  assert.doesNotMatch(sql, /GRANT[\s\S]*\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE|DELETE\s+FROM/i);
});

test("Command Center shared reference catalogs are read-only for runtime", () => {
  for (const table of ["data_sources", "survey_countries", "survey_indicator_definitions"]) {
    assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES[table], {
      tablePrivileges: ["SELECT"],
      updateColumns: [],
    });
  }

  const sql = readFileSync(
    "prisma/migrations/0018_command_center_reference_table_read_privileges/migration.sql",
    "utf8",
  );
  assert.match(
    sql,
    /GRANT SELECT ON TABLE[\s\S]*"data_sources"[\s\S]*"survey_countries"[\s\S]*"survey_indicator_definitions"[\s\S]*TO "polismart_runtime";/,
  );
  assert.doesNotMatch(
    sql,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|CREATE|ALTER|DROP|OWNERSHIP|BYPASSRLS|CREATEDB|CREATEROLE)\b/i,
  );
});

test("Campaign Geography foundation is read-only for runtime until services are authorized", () => {
  for (const table of [
    "master_geographic_levels",
    "master_geographic_areas",
    "campaign_geographic_assignments",
  ])
    assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES[table], {
      tablePrivileges: ["SELECT"],
      updateColumns: [],
    });

  const sql = readFileSync(
    "prisma/migrations/0020_campaign_geography_master_assignment_schema/migration.sql",
    "utf8",
  );
  assert.doesNotMatch(
    sql,
    /GRANT[\s\S]*\b(?:INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|CREATE|ALTER|OWNERSHIP|BYPASSRLS|CREATEDB|CREATEROLE)\b/i,
  );
});

test("Campaign Geography controlled functions are the only authorized runtime mutation surface", () => {
  assert.deepEqual(RUNTIME_FUNCTION_PRIVILEGES, {
    "public.campaign_geography_assign(uuid,uuid,uuid,uuid[])": ["EXECUTE"],
    "public.campaign_geography_deactivate(uuid,uuid,uuid,uuid[])": ["EXECUTE"],
  });
  for (const table of [
    "master_geographic_levels",
    "master_geographic_areas",
    "campaign_geographic_assignments",
  ]) {
    assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES[table].tablePrivileges, ["SELECT"]);
    assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES[table].updateColumns, []);
  }
});

test("runtime function validator accepts exact policy and fails closed on owner, grant, and hardening drift", () => {
  const rows = Object.keys(RUNTIME_FUNCTION_PRIVILEGES).map((signature) => ({
    signature,
    exists: true,
    owner: "polismart_migrator",
    security_definer: true,
    configuration: ["search_path=pg_catalog, public"],
    runtime_execute: true,
    public_execute: false,
    unexpected_execute_roles: [],
    inherited_execute_roles: [],
  }));
  assert.deepEqual(validateRuntimeFunctions(rows, RUNTIME_FUNCTION_PRIVILEGES), []);
  const drifted = rows.map((row, index) =>
    index === 0
      ? { ...row, owner: "polismart_runtime", public_execute: true, unexpected_execute_roles: ["analyst"] }
      : { ...row, runtime_execute: false, security_definer: false, configuration: [] },
  );
  assert.deepEqual(validateRuntimeFunctions(drifted, RUNTIME_FUNCTION_PRIVILEGES), [
    `${rows[0].signature}:OWNER`,
    `${rows[0].signature}:PUBLIC_EXECUTE`,
    `${rows[0].signature}:UNEXPECTED_EXECUTE_ROLE`,
    `${rows[1].signature}:SECURITY_DEFINER`,
    `${rows[1].signature}:SEARCH_PATH`,
    `${rows[1].signature}:RUNTIME_EXECUTE`,
  ]);
  const inherited = rows.map((row, index) =>
    index === 0 ? { ...row, inherited_execute_roles: ["unexpected_parent_role"] } : row,
  );
  assert.equal(
    validateRuntimeFunctions(inherited, RUNTIME_FUNCTION_PRIVILEGES).includes(
      `${rows[0].signature}:INHERITED_EXECUTE_ROLE`,
    ),
    true,
  );
  const validator = readFileSync("scripts/validate-production-database.mjs", "utf8");
  assert.match(validator, /RUNTIME_FUNCTION_PRIVILEGES/);
  assert.match(validator, /functionPrivilegeErrors\.length === 0/);
  assert.match(validator, /has_function_privilege\('polismart_runtime'/);
  assert.match(validator, /acl\.grantee = 0/);
  assert.match(validator, /runtime_inherited/);
  assert.match(validator, /protectedGeographyTableErrors\.length === 0/);
});

test("protected geography table validator checks ownership and every effective write privilege", () => {
  const rows = ["master_geographic_levels", "master_geographic_areas", "campaign_geographic_assignments"].map(
    (table_name) => ({
      table_name,
      owner: "polismart_migrator",
      runtime_owner: false,
      select_privilege: true,
      insert_privilege: false,
      update_privilege: false,
      delete_privilege: false,
      truncate_privilege: false,
    }),
  );
  assert.deepEqual(validateProtectedGeographyTables(rows), []);
  const drift = rows.map((row, index) =>
    index === 0
      ? { ...row, owner: "polismart_runtime", runtime_owner: true, insert_privilege: true }
      : index === 1
        ? { ...row, update_privilege: true, delete_privilege: true }
        : { ...row, truncate_privilege: true, select_privilege: false },
  );
  assert.deepEqual(validateProtectedGeographyTables(drift), [
    "master_geographic_levels:OWNER",
    "master_geographic_levels:RUNTIME_OWNER",
    "master_geographic_levels:INSERT",
    "master_geographic_areas:UPDATE",
    "master_geographic_areas:DELETE",
    "campaign_geographic_assignments:SELECT",
    "campaign_geographic_assignments:TRUNCATE",
  ]);
});

test("disabled financial tables receive no runtime privilege", () => {
  for (const table of [
    "fundraising_goals",
    "fundraising_contacts",
    "fundraising_contributions",
    "fundraising_activities",
    "fundraising_follow_ups",
    "fundraising_history",
  ])
    assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES[table], {
      tablePrivileges: [],
      updateColumns: [],
    });
});

test("organization deletion and unrestricted lead mutation are forbidden", () => {
  assert.equal(RUNTIME_DATABASE_PRIVILEGES.organizations.tablePrivileges.includes("DELETE"), false);
  assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES.prelaunch_leads.updateColumns, [
    "status",
    "updated_at",
  ]);
  assert.equal(
    RUNTIME_DATABASE_PRIVILEGES.prelaunch_leads.tablePrivileges.includes("DELETE"),
    false,
  );
  assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES.prelaunch_lead_follow_ups.updateColumns, [
    "completed_at",
    "completed_by_id",
  ]);
  assert.equal(
    RUNTIME_DATABASE_PRIVILEGES.prelaunch_lead_follow_ups.tablePrivileges.includes("DELETE"),
    false,
  );
});

test("Production validator consumes the catalog and rejects excess effective privileges", () => {
  const source = readFileSync("scripts/validate-production-database.mjs", "utf8");
  assert.match(source, /RUNTIME_DATABASE_PRIVILEGES/);
  assert.match(source, /RUNTIME_SEQUENCE_PRIVILEGES/);
  assert.match(source, /tablePrivilegeErrors\.length === 0/);
  assert.match(source, /columnPrivilegeErrors\.length === 0/);
  assert.match(source, /sequencePrivilegeErrors\.length === 0/);
  assert.match(source, /Application role can create objects in public/);
  assert.doesNotMatch(source, /organizations', 'DELETE'/);
});

test("Production validator does not require runtime access to Prisma migration history", () => {
  const source = readFileSync("scripts/validate-production-database.mjs", "utf8");
  assert.equal("_prisma_migrations" in RUNTIME_DATABASE_PRIVILEGES, false);
  assert.match(source, /to_regclass\('public\."_prisma_migrations"'\)/);
  assert.match(
    source,
    /has_table_privilege\(current_user, 'public\."_prisma_migrations"', 'SELECT'\)/,
  );
  assert.match(source, /const applied = migrationHistoryAccess\.can_select/);
  assert.match(source, /separateMigratorStatusRequired: !migrationHistoryAccess\.can_select/);
  assert.match(source, /migrationHistoryAccess\.exists/);
  assert.doesNotMatch(
    readFileSync("prisma/migrations/0015_runtime_privilege_catalog/migration.sql", "utf8"),
    /GRANT\s+SELECT[^;]*_prisma_migrations/is,
  );
});

test("previously reviewed migrations retain their exact checksums", () => {
  const expected = {
    "0011_prelaunch_lead_capture":
      "570401f3718f89d89df987b5655f7f7d1a46f110ef1d8c4446595b75ae6a00d8",
    "0012_prelaunch_lead_review":
      "76d86f259a3d9e942d62f03cdc4d1b5a12eb7cdd0041582306e60f38ad472a16",
    "0013_lead_follow_up_workflow":
      "5cd70ce444064bca953af5ffc92b4f1f17ebb28664b952e4b7f58a21b0156fe0",
    "0014_prelaunch_runtime_privilege_hardening":
      "e24cd61c3c2f67e279c5a48d47d89b474ef9b5cb699f5b4220e3fea971106d2a",
  };
  for (const [migration, checksum] of Object.entries(expected)) {
    const content = readFileSync(path.join(migrationRoot, migration, "migration.sql"));
    assert.equal(createHash("sha256").update(content).digest("hex"), checksum);
  }
});

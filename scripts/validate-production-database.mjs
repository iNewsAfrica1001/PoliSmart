import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import {
  RUNTIME_DATABASE_PRIVILEGES,
  RUNTIME_SEQUENCE_PRIVILEGES,
} from "../server/config/databasePrivileges.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrations = fs
  .readdirSync(path.join(root, "prisma", "migrations"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (!process.env.DATABASE_URL) {
  console.error(JSON.stringify({ status: "error", error: "DATABASE_URL is not configured." }));
  process.exit(1);
}

const prisma = new PrismaClient();
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const privilegeRows = Object.keys(RUNTIME_DATABASE_PRIVILEGES)
  .flatMap((table) =>
    ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"].map(
      (privilege) => `(${sqlString(table)}, ${sqlString(privilege)})`,
    ),
  )
  .join(",\n");
try {
  const [connection] = await prisma.$queryRaw`
    SELECT
      current_setting('server_version') AS server_version,
      pg_is_in_recovery() AS is_replica,
      has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect,
      has_schema_privilege(current_user, 'public', 'USAGE') AS can_use_schema,
      has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_schema,
      r.rolsuper AS is_superuser,
      r.rolcreatedb AS can_create_database,
      r.rolcreaterole AS can_create_role,
      r.rolbypassrls AS can_bypass_rls
    FROM pg_roles r WHERE r.rolname = current_user
  `;
  const extensions = await prisma.$queryRaw`
    SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'pgcrypto') ORDER BY extname
  `;
  const applied = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at, logs
    FROM "_prisma_migrations" ORDER BY started_at
  `;
  const indexStatus = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE NOT i.indisvalid OR NOT i.indisready)::int AS invalid
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
  `;
  const tenantColumns = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT table_name)::int AS tables,
      COUNT(DISTINCT table_name) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM pg_indexes x
          WHERE x.schemaname = 'public' AND x.tablename = c.table_name
            AND x.indexdef ILIKE '%tenant_id%'
        )
      )::int AS indexed_tables
    FROM information_schema.columns c
    WHERE table_schema = 'public' AND column_name = 'tenant_id'
  `;
  const tablePermissions = await prisma.$queryRawUnsafe(`
    SELECT expected.table_name, expected.privilege,
      has_table_privilege(
        current_user,
        format('%I.%I', 'public', expected.table_name),
        expected.privilege
      ) AS granted
    FROM (VALUES ${privilegeRows}) AS expected(table_name, privilege)
    ORDER BY expected.table_name, expected.privilege
  `);
  const columnUpdatePermissions = await prisma.$queryRaw`
    SELECT c.table_name, c.column_name,
      has_column_privilege(
        current_user,
        format('%I.%I', c.table_schema, c.table_name),
        c.column_name,
        'UPDATE'
      ) AS granted
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `;
  const sequencePermissions = await prisma.$queryRaw`
    SELECT sequence_name,
      has_sequence_privilege(
        current_user,
        format('%I.%I', sequence_schema, sequence_name),
        'USAGE'
      ) AS usage
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name
  `;
  const isolationChecks = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*)::int FROM campaigns c
        JOIN organizations o ON o.id = c.tenant_id WHERE c.tenant_id <> o.id) AS campaign_tenant_errors,
      (SELECT COUNT(*)::int FROM memberships m
        LEFT JOIN organizations o ON o.id = m.tenant_id WHERE o.id IS NULL) AS membership_tenant_errors,
      (SELECT COUNT(*)::int FROM knowledge_documents d
        JOIN campaigns c ON c.id = d.campaign_id WHERE d.tenant_id <> c.tenant_id) AS document_tenant_errors,
      (SELECT COUNT(*)::int FROM ai_conversations a
        JOIN campaigns c ON c.id = a.campaign_id WHERE a.tenant_id <> c.tenant_id) AS ai_tenant_errors
  `;
  const publicData = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*)::int FROM survey_imports WHERE status = 'COMPLETED') AS completed_imports,
      (SELECT COALESCE(SUM(rows_imported), 0)::int FROM survey_imports WHERE status = 'COMPLETED') AS imported_rows,
      (SELECT COUNT(*)::int FROM survey_aggregate_results) AS aggregate_records,
      (SELECT COUNT(*)::int FROM survey_aggregate_results WHERE is_suppressed) AS suppressed_records
  `;

  const appliedNames = new Set(
    applied
      .filter((item) => item.finished_at && !item.rolled_back_at)
      .map((item) => item.migration_name),
  );
  const failedMigrations = applied.filter((item) => !item.finished_at && !item.rolled_back_at);
  const missingMigrations = migrations.filter((name) => !appliedNames.has(name));
  const isolationErrors = Object.values(isolationChecks[0]).reduce(
    (total, value) => total + Number(value),
    0,
  );
  const vector = extensions.find((extension) => extension.extname === "vector");
  const tablePrivilegeErrors = tablePermissions.flatMap(({ table_name, privilege, granted }) => {
    const expected = RUNTIME_DATABASE_PRIVILEGES[table_name].tablePrivileges.includes(privilege);
    return Boolean(granted) === expected ? [] : [`${table_name}:${privilege}`];
  });
  const columnPrivilegeErrors = columnUpdatePermissions.flatMap(
    ({ table_name, column_name, granted }) => {
      const expected =
        RUNTIME_DATABASE_PRIVILEGES[table_name]?.updateColumns.includes(column_name) ?? false;
      return Boolean(granted) === expected ? [] : [`${table_name}.${column_name}:UPDATE`];
    },
  );
  const sequencePrivilegeErrors = sequencePermissions.flatMap(({ sequence_name, usage }) => {
    const expected = RUNTIME_SEQUENCE_PRIVILEGES[sequence_name]?.includes("USAGE") ?? false;
    return Boolean(usage) === expected ? [] : [`${sequence_name}:USAGE`];
  });
  const permissionWarnings = [
    ...(connection.is_superuser ? ["Application role is a superuser."] : []),
    ...(connection.can_create_database ? ["Application role can create databases."] : []),
    ...(connection.can_create_role ? ["Application role can create roles."] : []),
    ...(connection.can_bypass_rls ? ["Application role can bypass row-level security."] : []),
    ...(connection.can_create_in_schema ? ["Application role can create objects in public."] : []),
  ];
  const valid =
    connection.can_connect &&
    connection.can_use_schema &&
    tablePrivilegeErrors.length === 0 &&
    columnPrivilegeErrors.length === 0 &&
    sequencePrivilegeErrors.length === 0 &&
    Boolean(vector) &&
    missingMigrations.length === 0 &&
    failedMigrations.length === 0 &&
    Number(indexStatus[0].invalid) === 0 &&
    isolationErrors === 0 &&
    permissionWarnings.length === 0;

  console.log(
    JSON.stringify(
      {
        status: valid ? "valid" : "invalid",
        connection: {
          reachable: true,
          serverVersion: connection.server_version,
          replica: connection.is_replica,
        },
        migrations: {
          expected: migrations.length,
          applied: appliedNames.size,
          missing: missingMigrations,
          failed: failedMigrations.map((item) => item.migration_name),
        },
        extensions: extensions.map(({ extname, extversion }) => ({
          name: extname,
          version: extversion,
        })),
        indexes: indexStatus[0],
        tenantIsolation: {
          ...isolationChecks[0],
          totalErrors: isolationErrors,
          ...tenantColumns[0],
        },
        permissions: {
          connect: connection.can_connect,
          schemaUsage: connection.can_use_schema,
          schemaCreate: connection.can_create_in_schema,
          catalogTables: Object.keys(RUNTIME_DATABASE_PRIVILEGES).length,
          tablePrivilegeErrors,
          columnPrivilegeErrors,
          sequencePrivilegeErrors,
          leastPrivilegeWarnings: permissionWarnings,
        },
        publicData: publicData[0],
      },
      null,
      2,
    ),
  );
  if (!valid) process.exitCode = 1;
} catch (error) {
  console.error(
    JSON.stringify({
      status: "error",
      connection: { reachable: false },
      error:
        "Production database validation failed. Review server logs without printing DATABASE_URL.",
      code: error?.code || null,
    }),
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

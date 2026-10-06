import { PrismaClient } from "@prisma/client";
import { SENTINEL_ACTION, SENTINEL_RETIRED_ACTION } from "./campaign-geography-postgres-harness.mjs";

const query = (client, text, ...values) => client.$queryRawUnsafe(text, ...values);
const alterPassword = async (db, role, password, create = false) => {
  await query(db, "SELECT set_config('polismart.rehearsal_password',$1,true)", password);
  const template = create
    ? "CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L"
    : "ALTER ROLE %I WITH LOGIN PASSWORD %L";
  await query(db, `DO $control$ BEGIN EXECUTE format('${template}', '${role}',
    current_setting('polismart.rehearsal_password')); END $control$`);
};

export function createRehearsalAdapter(databaseUrl) {
  const client = new PrismaClient({ datasourceUrl: databaseUrl });
  const txAdapter = (db) => ({
    assertExistingRole: async (role) => {
      const rows = await query(db, "SELECT 1 FROM pg_roles WHERE rolname=$1 AND rolcanlogin", role);
      if (rows.length !== 1) throw new Error("Required rehearsal role is absent or cannot login.");
    },
    rotateLogin: (role, password) => alterPassword(db, role, password),
    ensureUnprivilegedLogin: async (role, password) => {
      const rows = await query(db, "SELECT 1 FROM pg_roles WHERE rolname=$1", role);
      if (!rows.length) await alterPassword(db, role, password, true);
      else {
        await alterPassword(db, role, password);
        await query(db, `ALTER ROLE ${role} WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
      }
      await query(db, `REVOKE polismart_migrator, polismart_runtime FROM ${role}`);
      await query(db, `GRANT CONNECT ON DATABASE neondb TO ${role}`);
      await query(db, `GRANT USAGE ON SCHEMA public TO ${role}`);
      await query(db, `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${role}`);
      await query(db, `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${role}`);
    },
    verifyRoleSeparation: async (roles) => {
      const rows = await query(db, `SELECT r.rolname,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolinherit,r.rolbypassrls,
        pg_has_role(r.rolname,$1,'MEMBER') migrator_member,pg_has_role(r.rolname,$2,'MEMBER') runtime_member
        FROM pg_roles r WHERE r.rolname=ANY($3::text[])`, roles.migrator, roles.runtime, Object.values(roles));
      if (rows.length !== 3) throw new Error("Rehearsal role verification failed.");
      const unprivileged = rows.find((row) => row.rolname === roles.unprivileged);
      if (!unprivileged || unprivileged.rolsuper || unprivileged.rolcreatedb || unprivileged.rolcreaterole ||
          unprivileged.rolinherit || unprivileged.rolbypassrls || unprivileged.migrator_member || unprivileged.runtime_member)
        throw new Error("Unprivileged rehearsal role has elevated privileges.");
    },
    insertAudit: (record) => query(db, `INSERT INTO public.security_audit_events
      (tenant_id,actor_id,action,entity,entity_id,metadata,created_at,updated_at)
      VALUES(NULL,NULL,$1,$2,NULL,$3::jsonb,now(),now())`, record.action, record.entity, JSON.stringify(record.metadata)),
    findSentinelLifecycle: async (nonce) => query(db, `SELECT sentinel.metadata->>'projectId' project_id,
      sentinel.metadata->>'branchId' branch_id,sentinel.metadata->>'nonce' authorization_nonce,
      sentinel.metadata->>'purpose' purpose,sentinel.metadata->>'environment' environment,
      sentinel.metadata->>'database' database_name,sentinel.metadata->>'issuedAt' issued_at,
      sentinel.metadata->>'expiresAt' expires_at,(SELECT max(retired.metadata->>'retiredAt')
      FROM public.security_audit_events retired WHERE retired.action=$2 AND retired.entity='rehearsal'
      AND retired.metadata->>'nonce'=sentinel.metadata->>'nonce') retired_at
      FROM public.security_audit_events sentinel WHERE sentinel.action=$1 AND sentinel.entity='rehearsal'
      AND sentinel.metadata->>'nonce'=$3`, SENTINEL_ACTION, SENTINEL_RETIRED_ACTION, nonce),
  });
  return {
    ownerUrl: databaseUrl,
    readIdentity: async () => (await query(client, "SELECT current_database() database,current_setting('neon.branch_id',true) \"branchId\""))[0],
    transaction: (operation) => client.$transaction((tx) => operation(txAdapter(tx))),
    disconnect: () => client.$disconnect(),
  };
}

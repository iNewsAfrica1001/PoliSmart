import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

export const REHEARSAL_PURPOSE = "campaign-geography-increment-3a";
export const REHEARSAL_ENVIRONMENT = "non-production";
export const PRODUCTION_BRANCH_ID = "br-noisy-forest-axlven4c";
export const SENTINEL_TABLE = "security_audit_events";
export const SENTINEL_ACTION = "CAMPAIGN_GEOGRAPHY_REHEARSAL_SENTINEL";
export const SENTINEL_RETIRED_ACTION = "CAMPAIGN_GEOGRAPHY_REHEARSAL_SENTINEL_RETIRED";

const requiredAuthorization = ["projectId", "branchId", "nonce", "database", "issuedAt", "expiresAt"];
const fail = (message) => new Error(`Campaign Geography rehearsal refused: ${message}`);
const assert = (condition, message) => { if (!condition) throw fail(message); };
const query = (client, text, ...values) => client.$queryRawUnsafe(text, ...values);

function deterministicUuid(label) {
  const hex = crypto.createHash("sha256").update(`increment-3a:${label}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function validateRehearsalAuthorization(authorization, now = new Date()) {
  if (!authorization || typeof authorization !== "object") throw fail("operator authorization is required");
  for (const field of requiredAuthorization)
    if (typeof authorization[field] !== "string" || !authorization[field].trim()) throw fail(`authorization ${field} is required`);
  if (authorization.branchId === PRODUCTION_BRANCH_ID) throw fail("Production branch is denied");
  if (authorization.purpose !== REHEARSAL_PURPOSE) throw fail("authorization purpose mismatch");
  if (authorization.environment !== REHEARSAL_ENVIRONMENT) throw fail("authorization environment mismatch");
  const issued = new Date(authorization.issuedAt);
  const expires = new Date(authorization.expiresAt);
  if (!Number.isFinite(issued.getTime()) || !Number.isFinite(expires.getTime()) || issued >= expires || issued > now || expires <= now)
    throw fail("authorization timing is invalid or expired");
  return authorization;
}

export function validateRehearsalConfiguration({ authorization, migratorUrl, runtimeUrl, unprivilegedUrl, genericDatabaseUrl }) {
  if (genericDatabaseUrl) throw fail("generic DATABASE_URL fallback is prohibited");
  if (!migratorUrl || !runtimeUrl || !unprivilegedUrl) throw fail("all rehearsal-specific database URLs are required");
  validateRehearsalAuthorization(authorization);
  let migrator;
  let runtime;
  let unprivileged;
  try { migrator = new URL(migratorUrl); runtime = new URL(runtimeUrl); unprivileged = new URL(unprivilegedUrl); }
  catch { throw fail("rehearsal-specific database URL is malformed"); }
  if (![migrator, runtime, unprivileged].every((url) => url.protocol.startsWith("postgres"))) throw fail("rehearsal URLs must use PostgreSQL");
  if (new Set([migrator.username, runtime.username, unprivileged.username]).size !== 3) throw fail("rehearsal identities must be distinct");
  if (![runtime, unprivileged].every((url) => url.hostname === migrator.hostname && url.port === migrator.port && url.pathname === migrator.pathname))
    throw fail("rehearsal identities must address the same database");
  if (decodeURIComponent(migrator.pathname.slice(1)) !== authorization.database) throw fail("authorized database name does not match the connection target");
  return Object.freeze({ ...authorization });
}

export function validateRehearsalSentinel(authorization, sentinel, now = new Date()) {
  if (!sentinel || typeof sentinel !== "object") throw fail("database rehearsal sentinel is absent");
  for (const field of ["project_id", "branch_id", "authorization_nonce", "purpose", "environment", "database_name", "issued_at", "expires_at"])
    if (sentinel[field] == null || String(sentinel[field]).length === 0) throw fail("database rehearsal sentinel is malformed");
  for (const [name, actual, expected] of [
    ["project", sentinel.project_id, authorization.projectId], ["branch", sentinel.branch_id, authorization.branchId],
    ["nonce", sentinel.authorization_nonce, authorization.nonce], ["purpose", sentinel.purpose, REHEARSAL_PURPOSE],
    ["environment", sentinel.environment, REHEARSAL_ENVIRONMENT], ["database", sentinel.database_name, authorization.database],
    ["issued time", sentinel.issued_at, authorization.issuedAt], ["expiry time", sentinel.expires_at, authorization.expiresAt],
  ]) if (actual !== expected) throw fail(`sentinel ${name} mismatch`);
  const issued = new Date(sentinel.issued_at);
  const expiry = new Date(sentinel.expires_at);
  if (!Number.isFinite(issued.getTime()) || !Number.isFinite(expiry.getTime()) || issued >= expiry || issued > now || expiry <= now || sentinel.retired_at != null)
    throw fail("database rehearsal sentinel is stale or retired");
  return true;
}

export function validateSentinelInstallationAuthorization({ authorization, controlPlane, now = new Date() }) {
  validateRehearsalAuthorization(authorization, now);
  if (!controlPlane || controlPlane.projectId !== authorization.projectId || controlPlane.branchId !== authorization.branchId ||
      controlPlane.database !== authorization.database) throw fail("control-plane target does not match authorization");
  return true;
}

export function buildRehearsalSentinelSetup({ authorization, controlPlane }) {
  validateSentinelInstallationAuthorization({ authorization, controlPlane });
  return Object.freeze({
    table: SENTINEL_TABLE,
    action: SENTINEL_ACTION,
    record: Object.freeze({ tenant_id: null, actor_id: null, action: SENTINEL_ACTION, entity: "rehearsal",
      entity_id: null, metadata: Object.freeze({ projectId: authorization.projectId, branchId: authorization.branchId,
        nonce: authorization.nonce, purpose: REHEARSAL_PURPOSE, environment: REHEARSAL_ENVIRONMENT,
        database: authorization.database, issuedAt: authorization.issuedAt, expiresAt: authorization.expiresAt }) }),
  });
}

export function buildRehearsalSentinelRetirement({ authorization, retiredAt }) {
  return Object.freeze({ table: SENTINEL_TABLE, action: SENTINEL_RETIRED_ACTION,
    record: Object.freeze({ tenant_id: null, actor_id: null, action: SENTINEL_RETIRED_ACTION, entity: "rehearsal",
      entity_id: null, metadata: Object.freeze({ nonce: authorization.nonce, purpose: REHEARSAL_PURPOSE,
        projectId: authorization.projectId, branchId: authorization.branchId, retiredAt }) }) });
}

export function deriveFixtureIdentity(authorizationNonce, behavior) {
  if (typeof authorizationNonce !== "string" || !authorizationNonce) throw fail("fixture authorization nonce is required");
  const namespace = crypto.createHash("sha256")
    .update(`${REHEARSAL_PURPOSE}\0${authorizationNonce}\0${behavior}`)
    .digest("hex").slice(0, 24);
  const id = (name) => deterministicUuid(`${namespace}:${name}`);
  const token = namespace.slice(0, 12);
  const orderIndex = 100_000 + (Number.parseInt(namespace.slice(0, 7), 16) % 900_000);
  return Object.freeze({ namespace, ids: Object.freeze({ tenant: id("tenant"), tenant2: id("tenant2"),
    campaign: id("campaign"), campaign2: id("campaign2"), actor: id("actor"), unauthorized: id("unauthorized"),
    ghLevel: id("foreign-level"), ghArea: id("foreign-area"), inactiveArea: id("inactive") }),
    // Database-generated membership/assignment/audit IDs and the canonical NG path are not fixture-owned identities.
    // Every fixture-owned textual or numeric identity below is nonce + behavior scoped and parameter-bound in SQL.
    uniqueValues: Object.freeze({ actorEmail: `${id("actor")}@invalid.example`, unauthorizedEmail: `${id("unauthorized")}@invalid.example`,
      tenantName: `I3A Fixture ${token}`, tenant2Name: `I3A Fixture 2 ${token}`,
      tenantSlug: `i3a-${namespace}`, tenant2Slug: `i3a-${namespace}-2`,
      campaignName: `I3A Campaign ${token}`, campaign2Name: `I3A Campaign 2 ${token}`,
      campaignSlug: `fixture-${namespace}`, campaign2Slug: `fixture-${namespace}-2`,
      foreignCountryCode: `ZQ${namespace.slice(0, 6).toUpperCase()}`,
      foreignLevelName: `Fixture Country ${token}`, foreignLevelOrder: orderIndex,
      foreignAreaName: `Foreign Fixture ${token}`, foreignAreaCode: `I3A-ZQ-${namespace}`,
      inactiveAreaName: `Inactive Fixture ${token}`, inactiveAreaCode: `I3A-INACTIVE-${namespace}` }) });
}

export function assertFixtureNamespaceAvailable(counts) {
  if (!counts || Object.values(counts).some(Number)) throw fail("fixture namespace collision detected");
  return true;
}

export async function runConfiguredHarnessFlow({ configuration, loadVerifiedEvidence, stages }) {
  const approved = validateRehearsalConfiguration(configuration);
  const evidence = await loadVerifiedEvidence(approved);
  assert(evidence && typeof evidence === "object", "database/control evidence is absent");
  // The verified evidence is authoritative: caller-authored safe labels cannot override a Production identity.
  assert(evidence.branchId !== PRODUCTION_BRANCH_ID, "verified Production branch is denied");
  validateRehearsalSentinel(approved, evidence.sentinel);
  for (const stage of stages) await stage(approved, evidence);
}

export async function runFixtureLifecycle({ identity, setup, verifySetup, execute, cleanup, verifyCleanup }) {
  let committed = false;
  let fixture;
  let primaryError;
  try {
    fixture = await setup(identity);
    committed = true;
    await verifySetup(fixture);
    await execute(fixture);
  } catch (error) { primaryError = error; }
  let cleanupError;
  if (committed) {
    try { await cleanup(fixture); await verifyCleanup(identity); }
    catch (error) { cleanupError = error; }
  }
  if (primaryError && cleanupError) throw new AggregateError([primaryError, cleanupError], "Rehearsal operation and cleanup both failed.");
  if (cleanupError) throw cleanupError;
  if (primaryError) throw primaryError;
}

export function extractSqlState(error) {
  for (const value of [error?.meta?.code, error?.code, error?.cause?.code])
    if (typeof value === "string" && /^[0-9A-Z]{5}$/.test(value)) return value;
  return null;
}

export async function expectSqlState(operation, expected, label) {
  try { await operation(); }
  catch (error) {
    const actual = extractSqlState(error);
    if (actual === expected) return;
    throw fail(`${label} returned SQLSTATE ${actual || "NONE"}; expected ${expected}`);
  }
  throw fail(`${label} unexpectedly succeeded; expected SQLSTATE ${expected}`);
}

async function verifyConnection(client, authorization, role) {
  const [identity] = await query(client, "SELECT current_database() AS database, current_user AS role");
  assert(identity?.database === authorization.database, "database identity mismatch");
  if (role) assert(identity?.role === role, "database role identity mismatch");
  else assert(!["polismart_migrator", "polismart_runtime"].includes(identity?.role), "unprivileged role identity mismatch");
}

async function loadVerifiedEvidence(migrator, runtime, unprivileged, authorization) {
  await verifyConnection(migrator, authorization, "polismart_migrator");
  await verifyConnection(runtime, authorization, "polismart_runtime");
  await verifyConnection(unprivileged, authorization, null);
  const rows = await query(migrator, `SELECT sentinel.metadata->>'projectId' project_id,sentinel.metadata->>'branchId' branch_id,
      sentinel.metadata->>'nonce' authorization_nonce,sentinel.metadata->>'purpose' purpose,sentinel.metadata->>'environment' environment,
      sentinel.metadata->>'database' database_name,sentinel.metadata->>'issuedAt' issued_at,sentinel.metadata->>'expiresAt' expires_at,
      (SELECT max(retired.created_at)::text FROM public.${SENTINEL_TABLE} retired
        WHERE retired.action=$2 AND retired.entity='rehearsal' AND retired.metadata->>'nonce'=sentinel.metadata->>'nonce') retired_at
    FROM public.${SENTINEL_TABLE} sentinel
    WHERE sentinel.action=$1 AND sentinel.entity='rehearsal' AND sentinel.metadata->>'nonce'=$3`, SENTINEL_ACTION, SENTINEL_RETIRED_ACTION, authorization.nonce);
  assert(rows.length <= 1, "database rehearsal sentinel is ambiguous");
  const sentinel = rows[0] ?? null;
  return { branchId: sentinel?.branch_id ?? null, sentinel };
}

async function verifyMigrationApplied(migrator) {
  const rows = await query(migrator, `SELECT finished_at,rolled_back_at FROM public._prisma_migrations
    WHERE migration_name='0021_campaign_geography_assignment_controls'`);
  assert(rows.length === 1 && rows[0].finished_at && !rows[0].rolled_back_at, "migration 0021 is not applied exactly once");
}

async function fixtureCounts(db, ids) {
  const [row] = await query(db, `SELECT
    (SELECT count(*)::int FROM public.organizations WHERE id IN ($1,$2)) organizations,
    (SELECT count(*)::int FROM public.campaigns WHERE id IN ($3,$4)) campaigns,
    (SELECT count(*)::int FROM public.auth_users WHERE id IN ($5,$6)) users,
    (SELECT count(*)::int FROM public.memberships WHERE tenant_id IN ($1,$2)) memberships,
    (SELECT count(*)::int FROM public.campaign_geographic_assignments WHERE tenant_id IN ($1,$2)) assignments,
    (SELECT count(*)::int FROM public.security_audit_events WHERE tenant_id IN ($1,$2)) audits,
    (SELECT count(*)::int FROM public.master_geographic_areas WHERE id IN ($7,$8)) areas,
    (SELECT count(*)::int FROM public.master_geographic_levels WHERE id=$9) levels`,
    ids.tenant, ids.tenant2, ids.campaign, ids.campaign2, ids.actor, ids.unauthorized, ids.ghArea, ids.inactiveArea, ids.ghLevel);
  return row;
}

async function canonicalPath(db) {
  const rows = await query(db, `SELECT a.id,a.parent_id,a.level_id,l.name level_name FROM public.master_geographic_areas a
    JOIN public.master_geographic_levels l ON l.id=a.level_id AND l.country_code=a.country_code
    WHERE a.country_code='NG' AND a.is_active AND l.is_active ORDER BY l.order_index,a.code`);
  const ward = rows.find((row) => row.level_name === "Ward/Registration Area");
  const lga = ward && rows.find((row) => row.id === ward.parent_id);
  const state = lga && rows.find((row) => row.id === lga.parent_id);
  const zone = state && rows.find((row) => row.id === state.parent_id);
  const country = zone && rows.find((row) => row.id === zone.parent_id);
  assert(country && zone && state && lga && ward, "canonical active Nigeria fixture ancestry is unavailable");
  return { country, zone, state, lga, ward };
}

async function prepareFixture(db, authorization, behavior) {
  const identity = deriveFixtureIdentity(authorization.nonce, behavior);
  const ids = identity.ids;
  assertFixtureNamespaceAvailable(await fixtureCounts(db, ids));
  const path = await canonicalPath(db);
  return { ...identity, ...path };
}

async function commitFixtureSetup(db, fixture) {
  const { ids, uniqueValues: value } = fixture;
  await db.$transaction(async (tx) => {
    await query(tx, `INSERT INTO public.auth_users(id,email,password_hash,display_name,created_at,updated_at) VALUES
      ($1,$2,'fixture-only','Authorized Fixture',now(),now()),($3,$4,'fixture-only','Unauthorized Fixture',now(),now())`,
      ids.actor, value.actorEmail, ids.unauthorized, value.unauthorizedEmail);
    await query(tx, `INSERT INTO public.organizations(id,name,slug,country,is_demo,created_at,updated_at) VALUES
      ($1,$2,$3,'Nigeria',true,now(),now()),($4,$5,$6,'Nigeria',true,now(),now())`,
      ids.tenant, value.tenantName, value.tenantSlug, ids.tenant2, value.tenant2Name, value.tenant2Slug);
    await query(tx, `INSERT INTO public.campaigns(id,tenant_id,name,slug,status,is_demo,country,election_type,created_at,updated_at) VALUES
      ($1,$2,$3,$4,'DRAFT',true,'Nigeria','TEST',now(),now()),
      ($5,$6,$7,$8,'DRAFT',true,'Nigeria','TEST',now(),now())`, ids.campaign, ids.tenant, value.campaignName, value.campaignSlug,
      ids.campaign2, ids.tenant2, value.campaign2Name, value.campaign2Slug);
    await query(tx, `INSERT INTO public.memberships(id,tenant_id,user_id,role,status,created_at,updated_at) VALUES
      (gen_random_uuid(),$1,$2,'CAMPAIGN_ADMINISTRATOR','ACTIVE',now(),now()),
      (gen_random_uuid(),$1,$3,'ANALYST','SUSPENDED',now(),now())`, ids.tenant, ids.actor, ids.unauthorized);
    await query(tx, `INSERT INTO public.master_geographic_levels(id,country_code,name,order_index,is_active,created_at,updated_at)
      VALUES($1,$2,$3,$4,true,now(),now())`, ids.ghLevel, value.foreignCountryCode, value.foreignLevelName, value.foreignLevelOrder);
    await query(tx, `INSERT INTO public.master_geographic_areas(id,level_id,parent_id,country_code,name,code,is_active,validation_status,created_at,updated_at) VALUES
      ($1,$2,NULL,$3,$4,$5,true,'TEST',now(),now()),
      ($6,$7,$8,'NG',$9,$10,false,'TEST',now(),now())`,
      ids.ghArea, ids.ghLevel, value.foreignCountryCode, value.foreignAreaName, value.foreignAreaCode,
      ids.inactiveArea, fixture.ward.level_id, fixture.lga.id, value.inactiveAreaName, value.inactiveAreaCode);
  });
  return fixture;
}

async function verifyFixtureSetup(db, fixture) {
  const { ids } = fixture;
  const expected = { organizations: 2, campaigns: 2, users: 2, memberships: 2, assignments: 0, audits: 0, areas: 2, levels: 1 };
  const actual = await fixtureCounts(db, ids);
  for (const [key, value] of Object.entries(expected)) assert(actual[key] === value, `fixture setup verification failed for ${key}`);
}

async function cleanupFixture(db, f) {
  const i = f.ids;
  await db.$transaction(async (tx) => {
    await query(tx, "DELETE FROM public.security_audit_events WHERE tenant_id IN ($1,$2)", i.tenant, i.tenant2);
    await query(tx, "DELETE FROM public.campaign_geographic_assignments WHERE tenant_id IN ($1,$2)", i.tenant, i.tenant2);
    await query(tx, "DELETE FROM public.memberships WHERE tenant_id IN ($1,$2)", i.tenant, i.tenant2);
    await query(tx, "DELETE FROM public.campaigns WHERE id IN ($1,$2)", i.campaign, i.campaign2);
    await query(tx, "DELETE FROM public.organizations WHERE id IN ($1,$2)", i.tenant, i.tenant2);
    await query(tx, "DELETE FROM public.auth_users WHERE id IN ($1,$2)", i.actor, i.unauthorized);
    await query(tx, "DELETE FROM public.master_geographic_areas WHERE id IN ($1,$2)", i.ghArea, i.inactiveArea);
    await query(tx, "DELETE FROM public.master_geographic_levels WHERE id=$1", i.ghLevel);
  });
}

async function verifyFixtureCleanup(db, identity) {
  assert(!Object.values(await fixtureCounts(db, identity.ids)).some(Number), "fixture cleanup verification failed");
}

const invoke = (db, fn, f, actor, areas, tenant = f.ids.tenant, campaign = f.ids.campaign) =>
  query(db, `SELECT public.${fn}($1::uuid,$2::uuid,$3::uuid,$4::uuid[]) result`, tenant, campaign, actor, areas);
const assignmentRows = (db, f) => query(db, `SELECT master_geographic_area_id area_id,is_active,created_by_id,updated_by_id,created_at,removed_at
  FROM public.campaign_geographic_assignments WHERE tenant_id=$1 AND campaign_id=$2 ORDER BY master_geographic_area_id`, f.ids.tenant, f.ids.campaign);
const auditRows = (db, f) => query(db, `SELECT actor_id,action,entity,entity_id,metadata FROM public.security_audit_events
  WHERE tenant_id=$1 AND entity_id=$2 ORDER BY created_at`, f.ids.tenant, f.ids.campaign);

async function expectActiveSet(db, f, expected) {
  const rows = (await assignmentRows(db, f)).filter((row) => row.is_active).map((row) => row.area_id).sort();
  assert(JSON.stringify(rows) === JSON.stringify([...expected].sort()), "assignment resulting-state mismatch");
}

async function runScenario(behavior, migrator, runtime, unprivileged, f) {
  const path = [f.country.id, f.zone.id, f.state.id, f.lga.id, f.ward.id];
  if (["authorized assignment", "campaign-country match", "ancestry closure", "controlled runtime function execution"].includes(behavior)) {
    await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ward.id]); await expectActiveSet(migrator, f, path); return;
  }
  if (behavior === "database actor authorization-state validation") {
    await expectSqlState(() => invoke(runtime, "campaign_geography_assign", f, f.ids.unauthorized, [f.country.id]), "42501", behavior);
    await expectActiveSet(migrator, f, []); return;
  }
  if (behavior === "foreign-country rejection") {
    await expectSqlState(() => invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ids.ghArea]), "22023", behavior);
    await expectActiveSet(migrator, f, []); return;
  }
  if (["mixed-country rejection", "bulk all-or-nothing"].includes(behavior)) {
    await expectSqlState(() => invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ward.id, f.ids.ghArea]), "22023", behavior);
    await expectActiveSet(migrator, f, []); assert((await auditRows(migrator, f)).length === 0, "rejected bulk operation wrote audit"); return;
  }
  if (behavior === "transaction rollback") {
    const suffix = f.ids.tenant.replaceAll("-", ""); const trigger = `i3a_assignment_${suffix}`;
    await query(migrator, `CREATE FUNCTION pg_temp.${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.tenant_id='${f.ids.tenant}'::uuid AND NEW.master_geographic_area_id='${f.state.id}'::uuid
      THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='fixture assignment failure'; END IF; RETURN NEW; END $$`);
    await query(migrator, `CREATE TRIGGER ${trigger} BEFORE INSERT ON public.campaign_geographic_assignments FOR EACH ROW EXECUTE FUNCTION pg_temp.${trigger}()`);
    try { await expectSqlState(() => invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ward.id]), "P0001", behavior); }
    finally { await query(migrator, `DROP TRIGGER IF EXISTS ${trigger} ON public.campaign_geographic_assignments`); }
    await expectActiveSet(migrator, f, []); assert((await auditRows(migrator, f)).length === 0, "transaction failure did not roll back"); return;
  }
  if (behavior === "parent-only assignment") {
    await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.state.id]); await expectActiveSet(migrator, f, path.slice(0, 3)); return;
  }
  if (behavior === "inactive master rejection") {
    await expectSqlState(() => invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ids.inactiveArea]), "22023", behavior);
    await expectActiveSet(migrator, f, []); return;
  }
  if (["reactivation", "idempotent retry", "duplicate protection"].includes(behavior)) {
    await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.country.id]); const original = (await assignmentRows(migrator, f))[0];
    if (behavior === "reactivation") {
      await invoke(runtime, "campaign_geography_deactivate", f, f.ids.actor, [f.country.id]);
      await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.country.id]);
      const current = (await assignmentRows(migrator, f))[0];
      assert(current.created_by_id === original.created_by_id && +current.created_at === +original.created_at && current.removed_at == null && current.is_active, "reactivation history mismatch");
    } else {
      await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.country.id, f.country.id]);
      assert((await assignmentRows(migrator, f)).length === 1, "idempotency or duplicate protection failed");
    } return;
  }
  if (behavior === "soft deactivation") {
    await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.country.id]); await invoke(runtime, "campaign_geography_deactivate", f, f.ids.actor, [f.country.id]);
    const [row] = await assignmentRows(migrator, f); assert(row && !row.is_active && row.removed_at && row.updated_by_id === f.ids.actor, "soft deactivation state mismatch"); return;
  }
  if (behavior === "deactivation ancestry revalidation") {
    await query(migrator, "UPDATE public.master_geographic_areas SET is_active=true WHERE id=$1", f.ids.inactiveArea);
    await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ids.inactiveArea]);
    await query(migrator, "UPDATE public.master_geographic_areas SET parent_id=$1 WHERE id=$2", f.country.id, f.ids.inactiveArea);
    try { await expectSqlState(() => invoke(runtime, "campaign_geography_deactivate", f, f.ids.actor, [f.ids.inactiveArea]), "22023", behavior); }
    finally { await query(migrator, "UPDATE public.master_geographic_areas SET parent_id=$1 WHERE id=$2", f.lga.id, f.ids.inactiveArea); }
    await expectActiveSet(migrator, f, [...path.slice(0, 4), f.ids.inactiveArea]); return;
  }
  if (behavior === "blocked ancestor removal") {
    await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ward.id]);
    await expectSqlState(() => invoke(runtime, "campaign_geography_deactivate", f, f.ids.actor, [f.country.id]), "23503", behavior);
    await expectActiveSet(migrator, f, path); return;
  }
  if (behavior === "audit rollback") {
    const suffix = f.ids.tenant.replaceAll("-", ""); const trigger = `i3a_audit_${suffix}`;
    await query(migrator, `CREATE FUNCTION pg_temp.${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.tenant_id='${f.ids.tenant}'::uuid THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='fixture audit failure'; END IF; RETURN NEW; END $$`);
    await query(migrator, `CREATE TRIGGER ${trigger} BEFORE INSERT ON public.security_audit_events FOR EACH ROW EXECUTE FUNCTION pg_temp.${trigger}()`);
    try { await expectSqlState(() => invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.country.id]), "P0001", behavior); }
    finally { await query(migrator, `DROP TRIGGER IF EXISTS ${trigger} ON public.security_audit_events`); }
    await expectActiveSet(migrator, f, []); assert((await auditRows(migrator, f)).length === 0, "audit failure did not roll back"); return;
  }
  if (behavior === "audit actor attribution") {
    await invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.country.id]); const [audit] = await auditRows(migrator, f);
    assert(audit?.actor_id === f.ids.actor && audit.entity === "campaign" && audit.entity_id === f.ids.campaign && audit.action === "CAMPAIGN_GEOGRAPHY_ASSIGNMENTS_ADDED", "audit actor/scope mismatch"); return;
  }
  if (behavior === "concurrent operations") {
    await Promise.all([invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ward.id]), invoke(runtime, "campaign_geography_assign", f, f.ids.actor, [f.ward.id])]);
    await expectActiveSet(migrator, f, path); const rows = await assignmentRows(migrator, f);
    assert(new Set(rows.map((row) => row.area_id)).size === rows.length && (await auditRows(migrator, f)).length === 2, "concurrent state mismatch"); return;
  }
  if (behavior.startsWith("PUBLIC EXECUTE")) {
    const fn = behavior.includes("deactivation") ? "campaign_geography_deactivate" : "campaign_geography_assign";
    await expectSqlState(() => invoke(unprivileged, fn, f, f.ids.actor, [f.country.id]), "42501", behavior); return;
  }
  if (behavior === "runtime direct table-write denial") {
    const tables = ["master_geographic_levels", "master_geographic_areas", "campaign_geographic_assignments"];
    for (const table of tables) {
      const [p] = await query(runtime, `SELECT has_table_privilege(current_user,$1,'INSERT') i,has_table_privilege(current_user,$1,'UPDATE') u,
        has_table_privilege(current_user,$1,'DELETE') d,has_table_privilege(current_user,$1,'TRUNCATE') t`, `public.${table}`);
      assert(!Object.values(p).some(Boolean), `runtime has effective write privilege on ${table}`);
      await expectSqlState(() => query(runtime, `UPDATE public.${table} SET updated_at=updated_at WHERE false`), "42501", `${table} UPDATE denial`);
      await expectSqlState(() => query(runtime, `DELETE FROM public.${table} WHERE false`), "42501", `${table} DELETE denial`);
    }
    for (const [table, sql] of [
      ["master level", "INSERT INTO public.master_geographic_levels(id,country_code,name,order_index,is_active,created_at,updated_at) VALUES(gen_random_uuid(),'ZZ','denied',99,true,now(),now())"],
      ["master area", "INSERT INTO public.master_geographic_areas(id,level_id,country_code,name,code,is_active,created_at,updated_at) VALUES(gen_random_uuid(),gen_random_uuid(),'ZZ','denied','denied',true,now(),now())"],
      ["assignment", "INSERT INTO public.campaign_geographic_assignments(id,tenant_id,campaign_id,master_geographic_area_id,created_by_id,updated_by_id,created_at,updated_at) VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),now(),now())"],
    ]) await expectSqlState(() => query(runtime, sql), "42501", `${table} INSERT denial`);
    return;
  }
  throw fail(`unsupported executable behavior ${behavior}`);
}

export async function runCampaignGeographyPostgresBehavior({ behavior, migratorUrl, runtimeUrl, unprivilegedUrl, authorization, genericDatabaseUrl }) {
  const configuration = { authorization, migratorUrl, runtimeUrl, unprivilegedUrl, genericDatabaseUrl };
  validateRehearsalConfiguration(configuration);
  const migrator = new PrismaClient({ datasourceUrl: migratorUrl }); const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
  const unprivileged = new PrismaClient({ datasourceUrl: unprivilegedUrl });
  try {
    await runConfiguredHarnessFlow({ configuration,
      loadVerifiedEvidence: (approved) => loadVerifiedEvidence(migrator, runtime, unprivileged, approved),
      stages: [() => verifyMigrationApplied(migrator), async (approved) => {
        const identity = await prepareFixture(migrator, approved, behavior);
        await runFixtureLifecycle({ identity,
          setup: (fixture) => commitFixtureSetup(migrator, fixture),
          verifySetup: (fixture) => verifyFixtureSetup(migrator, fixture),
          execute: (fixture) => runScenario(behavior, migrator, runtime, unprivileged, fixture),
          cleanup: (fixture) => cleanupFixture(migrator, fixture),
          verifyCleanup: (fixtureIdentity) => verifyFixtureCleanup(migrator, fixtureIdentity),
        });
      }],
    });
  } finally {
    await Promise.allSettled([unprivileged.$disconnect(), runtime.$disconnect(), migrator.$disconnect()]);
  }
}

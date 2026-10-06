import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import {
  assertGitIgnored,
  bootstrapRehearsalCredentials,
  installRehearsalSentinel,
  REHEARSAL_ROLES,
  retireRehearsalSentinel,
  securePassword,
  validateBootstrapEnvironment,
  validateControlTarget,
} from "../scripts/lib/campaign-geography-rehearsal-control.mjs";
import { PRODUCTION_BRANCH_ID, REHEARSAL_ENVIRONMENT, REHEARSAL_PURPOSE,
  validateRehearsalSentinel } from "../scripts/lib/campaign-geography-postgres-harness.mjs";

const authorization = Object.freeze({ projectId: "young-base-56422836", branchId: "br-rehearsal-only",
  nonce: "fresh-rehearsal-nonce", database: "neondb", purpose: REHEARSAL_PURPOSE,
  environment: REHEARSAL_ENVIRONMENT, issuedAt: "2026-10-06T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z" });
const controlPlane = Object.freeze({ projectId: authorization.projectId, branchId: authorization.branchId,
  database: authorization.database, environment: REHEARSAL_ENVIRONMENT, purpose: REHEARSAL_PURPOSE });

function sentinelRow(retiredAt = null) {
  return { project_id: authorization.projectId, branch_id: authorization.branchId,
    authorization_nonce: authorization.nonce, purpose: authorization.purpose, environment: authorization.environment,
    database_name: authorization.database, issued_at: authorization.issuedAt, expires_at: authorization.expiresAt,
    retired_at: retiredAt };
}

function fakeAdapter(overrides = {}) {
  const calls = { identity: 0, transactions: 0, mutations: 0, migration: 0, fixture: 0 };
  const lifecycle = [];
  const tx = {
    assertExistingRole: async () => {}, rotateLogin: async () => { calls.mutations += 1; },
    ensureUnprivilegedLogin: async () => { calls.mutations += 1; }, verifyRoleSeparation: async () => {},
    findSentinelLifecycle: async () => lifecycle.length ? [sentinelRow(lifecycle.includes("retired") ? "2026-10-07T00:00:00.000Z" : null)] : [],
    insertAudit: async (record) => { calls.mutations += 1; lifecycle.push(record.action.includes("RETIRED") ? "retired" : "installed"); },
    ...overrides.tx,
  };
  return { calls, lifecycle, ownerUrl: "postgresql://owner:owner-secret@rehearsal.invalid/neondb?sslmode=require",
    readIdentity: async () => { calls.identity += 1; return overrides.identity ?? { database: "neondb", branchId: authorization.branchId }; },
    transaction: async (operation) => { calls.transactions += 1; return operation(tx); } };
}

test("credential bootstrap uses three separated canonical roles and does not log secrets", async () => {
  const adapter = fakeAdapter();
  const messages = [];
  const original = console.log;
  console.log = (...values) => messages.push(values.join(" "));
  try {
    const urls = await bootstrapRehearsalCredentials({ adapter, authorization, controlPlane,
      passwordFactory: (() => { let index = 0; return () => `secret-${++index}-not-logged`; })() });
    assert.equal(new URL(urls.migrator).username, REHEARSAL_ROLES.migrator);
    assert.equal(new URL(urls.runtime).username, REHEARSAL_ROLES.runtime);
    assert.equal(new URL(urls.unprivileged).username, REHEARSAL_ROLES.unprivileged);
    assert.equal(new Set(Object.values(urls).map((value) => new URL(value).username)).size, 3);
    assert.equal(messages.join(" ").includes("secret-"), false);
    assert.equal(adapter.calls.mutations, 3);
  } finally { console.log = original; }
});

test("password generation is cryptographically random-shaped and non-repeating", () => {
  const values = new Set(Array.from({ length: 10 }, () => securePassword()));
  assert.equal(values.size, 10);
  for (const value of values) assert.match(value, /^[A-Za-z0-9_-]{40,}$/);
});

test("credential destination is Git-ignored and CLI failures redact supplied secrets", () => {
  const destination = `${process.cwd()}/.env.campaign-geography-rehearsal.local`;
  assert.equal(assertGitIgnored(destination), true);
  const existed = fs.existsSync(destination);
  const before = existed ? fs.statSync(destination) : null;
  const secret = "must-not-appear-anywhere";
  const result = spawnSync(process.execPath, ["scripts/bootstrap-campaign-geography-rehearsal.mjs"], {
    cwd: process.cwd(), encoding: "utf8", env: { ...process.env, DATABASE_URL: "", MIGRATION_DATABASE_URL: "",
      CAMPAIGN_GEOGRAPHY_REHEARSAL_OWNER_URL: `postgresql://owner:${secret}@invalid/neondb`,
      CAMPAIGN_GEOGRAPHY_REHEARSAL_AUTHORIZATION: `{${secret}`,
      CAMPAIGN_GEOGRAPHY_REHEARSAL_CONTROL_PLANE: "{}" },
  });
  assert.notEqual(result.status, 0);
  assert.equal(`${result.stdout}${result.stderr}`.includes(secret), false);
  assert.equal(fs.existsSync(destination), existed);
  if (before) {
    const after = fs.statSync(destination);
    assert.equal(after.size, before.size);
    assert.equal(after.mtimeMs, before.mtimeMs);
  }
});

test("generic and migration database URL substitutions are rejected", () => {
  const valid = { CAMPAIGN_GEOGRAPHY_REHEARSAL_OWNER_URL: "present",
    CAMPAIGN_GEOGRAPHY_REHEARSAL_AUTHORIZATION: "present", CAMPAIGN_GEOGRAPHY_REHEARSAL_CONTROL_PLANE: "present" };
  assert.equal(validateBootstrapEnvironment(valid), true);
  assert.throws(() => validateBootstrapEnvironment({ ...valid, DATABASE_URL: "secret" }), /DATABASE_URL substitution/);
  assert.throws(() => validateBootstrapEnvironment({ ...valid, MIGRATION_DATABASE_URL: "secret" }), /MIGRATION_DATABASE_URL substitution/);
});

test("missing or mismatched two-source identity fails before mutation", async () => {
  for (const input of [
    { authorization: null, controlPlane },
    { authorization, controlPlane: { ...controlPlane, projectId: "wrong" } },
    { authorization, controlPlane: { ...controlPlane, branchId: "wrong" } },
    { authorization, controlPlane: { ...controlPlane, database: "wrong" } },
    { authorization: { ...authorization, purpose: "wrong" }, controlPlane },
    { authorization: { ...authorization, expiresAt: "2000-01-01T00:00:00.000Z" }, controlPlane },
  ]) {
    const adapter = fakeAdapter();
    await assert.rejects(bootstrapRehearsalCredentials({ adapter, ...input }), /refused/);
    assert.deepEqual(adapter.calls, { identity: 0, transactions: 0, mutations: 0, migration: 0, fixture: 0 });
  }
});

test("database identity mismatch fails before transaction mutation", async () => {
  for (const identity of [{ database: "wrong", branchId: authorization.branchId },
    { database: authorization.database, branchId: "wrong" }]) {
    const adapter = fakeAdapter({ identity });
    await assert.rejects(bootstrapRehearsalCredentials({ adapter, authorization, controlPlane }), /identity mismatch/);
    assert.equal(adapter.calls.transactions, 0);
    assert.equal(adapter.calls.mutations, 0);
  }
});

test("Production credential bootstrap and sentinel installation fail before mutation", async () => {
  const productionAuthorization = { ...authorization, branchId: PRODUCTION_BRANCH_ID };
  const productionControl = { ...controlPlane, branchId: PRODUCTION_BRANCH_ID };
  for (const operation of [bootstrapRehearsalCredentials, installRehearsalSentinel]) {
    const adapter = fakeAdapter({ identity: { database: "neondb", branchId: PRODUCTION_BRANCH_ID } });
    await assert.rejects(operation({ adapter, authorization: productionAuthorization, controlPlane: productionControl }), /Production/);
    assert.equal(adapter.calls.identity, 0);
    assert.equal(adapter.calls.transactions, 0);
    assert.equal(adapter.calls.mutations, 0);
  }
});

test("valid sentinel installation is exact, one-time, and independent from migration and fixtures", async () => {
  const adapter = fakeAdapter();
  assert.equal(await installRehearsalSentinel({ adapter, authorization, controlPlane }), true);
  assert.equal(adapter.calls.mutations, 1);
  assert.equal(adapter.calls.migration, 0);
  assert.equal(adapter.calls.fixture, 0);
  await assert.rejects(installRehearsalSentinel({ adapter, authorization, controlPlane }), /nonce was already used/);
  assert.equal(adapter.calls.mutations, 1);
});

test("sentinel retirement targets exact active nonce and prevents reuse", async () => {
  const adapter = fakeAdapter();
  await installRehearsalSentinel({ adapter, authorization, controlPlane });
  assert.equal(await retireRehearsalSentinel({ adapter, authorization, controlPlane,
    retiredAt: "2026-10-07T00:00:00.000Z" }), true);
  assert.throws(() => validateRehearsalSentinel(authorization, sentinelRow("2026-10-07T00:00:00.000Z")), /retired/);
  await assert.rejects(retireRehearsalSentinel({ adapter, authorization: { ...authorization, nonce: "wrong" }, controlPlane }),
    /nonce mismatch|exact active sentinel/);
});

test("sentinel mutation is not entered for wrong project, branch, database, purpose, expiry, or nonce target", async () => {
  const cases = [
    [{ ...authorization, projectId: "wrong" }, controlPlane],
    [{ ...authorization, branchId: "wrong" }, controlPlane],
    [{ ...authorization, database: "wrong" }, controlPlane],
    [{ ...authorization, purpose: "wrong" }, controlPlane],
    [{ ...authorization, expiresAt: "2000-01-01T00:00:00.000Z" }, controlPlane],
  ];
  for (const [candidate, evidence] of cases) {
    const adapter = fakeAdapter();
    await assert.rejects(installRehearsalSentinel({ adapter, authorization: candidate, controlPlane: evidence }));
    assert.equal(adapter.calls.transactions, 0);
    assert.equal(adapter.calls.mutations, 0);
  }
});

test("control target accepts only matching independent database evidence", () => {
  assert.equal(validateControlTarget({ authorization, controlPlane,
    databaseIdentity: { database: "neondb", branchId: authorization.branchId } }), true);
});

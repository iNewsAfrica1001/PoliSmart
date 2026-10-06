import test from "node:test";
import assert from "node:assert/strict";
import { assertFixtureNamespaceAvailable, buildRehearsalSentinelRetirement, buildRehearsalSentinelSetup,
  deriveFixtureIdentity, expectSqlState, PRODUCTION_BRANCH_ID, REHEARSAL_ENVIRONMENT, REHEARSAL_PURPOSE,
  runConfiguredHarnessFlow, runFixtureLifecycle, validateRehearsalConfiguration, validateRehearsalSentinel,
  validateSentinelInstallationAuthorization,
} from "../scripts/lib/campaign-geography-postgres-harness.mjs";

const authorization = Object.freeze({ projectId: "project-rehearsal", branchId: "br-rehearsal-only",
  nonce: "authorization-nonce-unique", database: "neondb", purpose: REHEARSAL_PURPOSE,
  environment: REHEARSAL_ENVIRONMENT, issuedAt: "2026-10-06T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z" });
const urls = Object.freeze({ migratorUrl: "postgresql://polismart_migrator:credential@rehearsal.invalid/neondb",
  runtimeUrl: "postgresql://polismart_runtime:credential@rehearsal.invalid/neondb",
  unprivilegedUrl: "postgresql://polismart_rehearsal_public:credential@rehearsal.invalid/neondb" });
const sentinel = Object.freeze({ project_id: authorization.projectId, branch_id: authorization.branchId,
  authorization_nonce: authorization.nonce, purpose: REHEARSAL_PURPOSE, environment: REHEARSAL_ENVIRONMENT,
  database_name: authorization.database, issued_at: authorization.issuedAt, expires_at: authorization.expiresAt, retired_at: null });
const controlPlane = Object.freeze({ projectId: authorization.projectId, branchId: authorization.branchId, database: authorization.database });

test("harness rejects Production, generic fallback, missing, ambiguous, and secret-bearing configuration safely", () => {
  for (const input of [
    { authorization: { ...authorization, branchId: PRODUCTION_BRANCH_ID }, ...urls },
    { authorization, ...urls, genericDatabaseUrl: "present" },
    { authorization, migratorUrl: "", runtimeUrl: urls.runtimeUrl },
    { authorization, migratorUrl: urls.migratorUrl, runtimeUrl: urls.migratorUrl, unprivilegedUrl: urls.unprivilegedUrl },
  ]) assert.throws(() => validateRehearsalConfiguration(input), (error) => {
    assert.doesNotMatch(error.message, /credential|postgresql:\/\//); return true;
  });
});

test("sentinel lifecycle accepts only an exact active authorization and defines append-only retirement", () => {
  for (const value of [null, { ...sentinel, authorization_nonce: "" },
    { ...sentinel, expires_at: "2000-01-01T00:00:00.000Z" }, { ...sentinel, project_id: "wrong" },
    { ...sentinel, branch_id: "wrong" }, { ...sentinel, authorization_nonce: "wrong" },
    { ...sentinel, purpose: "wrong" }, { ...sentinel, environment: "production" },
    { ...sentinel, database_name: "wrong" }, { ...sentinel, retired_at: "2026-10-06T01:00:00.000Z" },
  ]) assert.throws(() => validateRehearsalSentinel(authorization, value));
  assert.equal(validateRehearsalSentinel(authorization, sentinel), true);
  assert.equal(buildRehearsalSentinelSetup({ authorization, controlPlane }).record.metadata.nonce, authorization.nonce);
  assert.equal(buildRehearsalSentinelRetirement({ authorization, retiredAt: "2026-10-07T00:00:00.000Z" }).record.metadata.nonce, authorization.nonce);
});

test("sentinel installation requires matching control-plane evidence and denies Production", () => {
  assert.equal(validateSentinelInstallationAuthorization({ authorization, controlPlane }), true);
  for (const changed of [
    { ...controlPlane, projectId: "wrong" }, { ...controlPlane, branchId: "wrong" }, { ...controlPlane, database: "wrong" },
  ]) assert.throws(() => validateSentinelInstallationAuthorization({ authorization, controlPlane: changed }));
  assert.throws(() => validateSentinelInstallationAuthorization({
    authorization: { ...authorization, branchId: PRODUCTION_BRANCH_ID },
    controlPlane: { ...controlPlane, branchId: PRODUCTION_BRANCH_ID },
  }));
});

test("complete configured flow reaches missing sentinel lookup and blocks every downstream stage", async () => {
  const calls = { evidence: 0, migration: 0, fixture: 0, business: 0, behavior: 0 };
  const stage = (name) => async () => { calls[name] += 1; };
  await assert.rejects(runConfiguredHarnessFlow({ configuration: { authorization, ...urls },
    loadVerifiedEvidence: async () => { calls.evidence += 1; return { branchId: authorization.branchId, sentinel: null }; },
    stages: [stage("migration"), stage("fixture"), stage("business"), stage("behavior")],
  }), /database rehearsal sentinel is absent/);
  assert.deepEqual(calls, { evidence: 1, migration: 0, fixture: 0, business: 0, behavior: 0 });
});

test("complete configured flow trusts verified Production evidence over safe caller labels", async () => {
  const calls = { evidence: 0, migration: 0, fixture: 0, business: 0, behavior: 0 };
  const stage = (name) => async () => { calls[name] += 1; };
  await assert.rejects(runConfiguredHarnessFlow({ configuration: { authorization, ...urls },
    loadVerifiedEvidence: async () => { calls.evidence += 1; return {
      branchId: PRODUCTION_BRANCH_ID, sentinel: { ...sentinel, branch_id: PRODUCTION_BRANCH_ID },
    }; }, stages: [stage("migration"), stage("fixture"), stage("business"), stage("behavior")],
  }), /verified Production branch is denied/);
  assert.deepEqual(calls, { evidence: 1, migration: 0, fixture: 0, business: 0, behavior: 0 });
});

test("fixture namespace is deterministic, nonce-scoped, behavior-scoped, and SQL-identifier safe", () => {
  const first = deriveFixtureIdentity("nonce A'; DROP TABLE users; --", "authorized assignment");
  const repeat = deriveFixtureIdentity("nonce A'; DROP TABLE users; --", "authorized assignment");
  const otherNonce = deriveFixtureIdentity("nonce B", "authorized assignment");
  const otherBehavior = deriveFixtureIdentity("nonce A'; DROP TABLE users; --", "reactivation");
  assert.deepEqual(first, repeat);
  assert.notEqual(first.namespace, otherNonce.namespace);
  assert.notEqual(first.namespace, otherBehavior.namespace);
  for (const group of ["ids", "uniqueValues"]) {
    const firstValues = Object.values(first[group]);
    const otherNonceValues = new Set(Object.values(otherNonce[group]));
    assert.equal(firstValues.some((value) => otherNonceValues.has(value)), false,
      `${group} contains a cross-rehearsal fixture collision`);
  }
  assert.notDeepEqual(first.ids, otherBehavior.ids);
  assert.notDeepEqual(first.uniqueValues, otherBehavior.uniqueValues);
  assert.match(first.namespace, /^[a-f0-9]{24}$/);
  assert.doesNotMatch(JSON.stringify(first), /DROP TABLE|nonce A/);
});

test("fixture collision fails closed without adopting or deleting unrelated state", () => {
  assert.throws(() => assertFixtureNamespaceAvailable({ organizations: 1, campaigns: 0 }), /collision/);
  assert.equal(assertFixtureNamespaceAvailable({ organizations: 0, campaigns: 0 }), true);
});

test("fixture lifecycle cleans after setup verification and behavior failures", async () => {
  for (const failurePoint of ["verification", "behavior"]) {
    const calls = [];
    await assert.rejects(runFixtureLifecycle({ identity: { ids: { tenant: "fixture" } },
      setup: async (identity) => { calls.push("setup"); return identity; },
      verifySetup: async () => { calls.push("verify-setup"); if (failurePoint === "verification") throw new Error("verification failed"); },
      execute: async () => { calls.push("execute"); if (failurePoint === "behavior") throw new Error("behavior failed"); },
      cleanup: async () => { calls.push("cleanup"); }, verifyCleanup: async () => { calls.push("verify-cleanup"); },
    }), new RegExp(`${failurePoint} failed`));
    assert.equal(calls.includes("cleanup"), true);
    assert.equal(calls.includes("verify-cleanup"), true);
    if (failurePoint === "verification") assert.equal(calls.includes("execute"), false);
  }
});

test("cleanup failure fails closed and preserves both primary and cleanup errors", async () => {
  await assert.rejects(runFixtureLifecycle({ identity: {}, setup: async (identity) => identity,
    verifySetup: async () => { throw new Error("primary failure"); }, execute: async () => {},
    cleanup: async () => { throw new Error("cleanup failure"); }, verifyCleanup: async () => {},
  }), (error) => error instanceof AggregateError && error.errors.length === 2);
});

test("expected-rejection matcher accepts only the exact SQLSTATE", async () => {
  await expectSqlState(async () => { throw { meta: { code: "42501" } }; }, "42501", "authorization");
  await assert.rejects(expectSqlState(async () => { throw new Error("network unavailable"); }, "42501", "authorization"), /SQLSTATE NONE; expected 42501/);
  await assert.rejects(expectSqlState(async () => {}, "42501", "authorization"), /unexpectedly succeeded/);
});

test("matching authorization and URLs are accepted but never replace database sentinel verification", () => {
  assert.deepEqual(validateRehearsalConfiguration({ authorization, ...urls }), authorization);
});

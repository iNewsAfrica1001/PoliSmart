import test from "node:test";
import assert from "node:assert/strict";
import { expectSqlState, PRODUCTION_BRANCH_ID, REHEARSAL_ENVIRONMENT, REHEARSAL_PURPOSE,
  validateRehearsalConfiguration, validateRehearsalSentinel } from "../scripts/lib/campaign-geography-postgres-harness.mjs";

const authorization = Object.freeze({ projectId: "project-rehearsal", branchId: "br-rehearsal-only",
  nonce: "authorization-nonce-unique", database: "neondb", purpose: REHEARSAL_PURPOSE, environment: REHEARSAL_ENVIRONMENT });
const urls = Object.freeze({ migratorUrl: "postgresql://polismart_migrator:credential@rehearsal.invalid/neondb",
  runtimeUrl: "postgresql://polismart_runtime:credential@rehearsal.invalid/neondb",
  unprivilegedUrl: "postgresql://polismart_rehearsal_public:credential@rehearsal.invalid/neondb" });
const sentinel = Object.freeze({ project_id: authorization.projectId, branch_id: authorization.branchId,
  authorization_nonce: authorization.nonce, purpose: REHEARSAL_PURPOSE, environment: REHEARSAL_ENVIRONMENT,
  database_name: authorization.database, expires_at: "2099-01-01T00:00:00.000Z", consumed_at: null });

test("harness rejects Production, generic fallback, missing, and ambiguous configuration without exposing credentials", () => {
  for (const input of [
    { authorization: { ...authorization, branchId: PRODUCTION_BRANCH_ID }, ...urls },
    { authorization, ...urls, genericDatabaseUrl: "present" },
    { authorization, migratorUrl: "", runtimeUrl: urls.runtimeUrl },
    { authorization, migratorUrl: urls.migratorUrl, runtimeUrl: urls.migratorUrl },
  ]) assert.throws(() => validateRehearsalConfiguration(input), (error) => {
    assert.doesNotMatch(error.message, /credential|postgresql:\/\//); return true;
  });
});

test("harness sentinel fails closed for absent, malformed, stale, and every identity mismatch", () => {
  for (const value of [null, { ...sentinel, authorization_nonce: "" },
    { ...sentinel, expires_at: "2000-01-01T00:00:00.000Z" }, { ...sentinel, project_id: "wrong" },
    { ...sentinel, branch_id: "wrong" }, { ...sentinel, authorization_nonce: "wrong" },
    { ...sentinel, purpose: "wrong" }, { ...sentinel, environment: "production" },
    { ...sentinel, database_name: "wrong" }, { ...sentinel, consumed_at: "2098-01-01T00:00:00.000Z" },
  ]) assert.throws(() => validateRehearsalSentinel(authorization, value));
  assert.equal(validateRehearsalSentinel(authorization, sentinel), true);
});

test("expected-rejection matcher accepts only the exact SQLSTATE", async () => {
  await expectSqlState(async () => { throw { meta: { code: "42501" } }; }, "42501", "authorization");
  await assert.rejects(expectSqlState(async () => { throw new Error("network unavailable"); }, "42501", "authorization"), /SQLSTATE NONE; expected 42501/);
  await assert.rejects(expectSqlState(async () => {}, "42501", "authorization"), /unexpectedly succeeded/);
});

test("matching authorization and URLs are accepted but do not replace sentinel verification", () => {
  assert.deepEqual(validateRehearsalConfiguration({ authorization, ...urls }), authorization);
});

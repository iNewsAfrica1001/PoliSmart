import assert from "node:assert/strict";
import test from "node:test";
import { PERMISSIONS, ROLES, ROLE_PERMISSION_POLICY } from "../server/config/authorization.js";
import { createPrivacyOperationsRepository } from "../server/repositories/privacyOperationsRepository.js";
import {
  PRIVACY_ACTION_CONFIRMATIONS,
  policyBlockedAction,
  privacySubjectKey,
  validatePrivacyCaseTransition,
  validateVerificationTransition,
} from "../server/services/privacyOperations.js";

test("privacy permission is narrowly assigned to the super administrator", () => {
  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_POLICY))
    assert.equal(
      permissions.includes(PERMISSIONS.PRIVACY_OPERATIONS_MANAGE),
      role === ROLES.SUPER_ADMINISTRATOR,
    );
});

test("suppression subject keys are deterministic keyed hashes without raw contact data", () => {
  const key = privacySubjectKey(" PERSON@example.com ", "test-secret");
  assert.equal(key, privacySubjectKey("person@example.com", "test-secret"));
  assert.equal(key.length, 64);
  assert.doesNotMatch(key, /person|example/i);
});

test("destructive execution fails closed for confirmation, legal hold, and unresolved policy", () => {
  assert.throws(
    () => policyBlockedAction("DELETE", "wrong", {}),
    /Exact privacy-action confirmation/,
  );
  assert.throws(
    () =>
      policyBlockedAction("DELETE", PRIVACY_ACTION_CONFIRMATIONS.DELETE, {
        legalHoldBlocked: true,
      }),
    /active legal hold/,
  );
  assert.throws(
    () =>
      policyBlockedAction("ANONYMIZE", PRIVACY_ACTION_CONFIRMATIONS.ANONYMIZE, {
        legalHoldBlocked: false,
      }),
    /policy decision and execution authorization/,
  );
});

test("case creation and audit are atomic", async () => {
  const calls = [];
  const db = {
    $transaction: async (callback) =>
      callback({
        privacyRightsCase: {
          create: async ({ data }) => (calls.push(["case", data]), { id: "case-1", ...data }),
        },
        privacyCaseEvent: { create: async ({ data }) => (calls.push(["event", data]), data) },
      }),
  };
  const repo = createPrivacyOperationsRepository(db);
  const created = await repo.createCase(
    { tenantId: "tenant", campaignId: "campaign", caseReference: "PRIV-1" },
    "actor",
  );
  assert.equal(created.id, "case-1");
  assert.deepEqual(
    calls.map(([kind]) => kind),
    ["case", "event"],
  );
});

test("preview is scoped, zero-write, audited, and reports legal holds", async () => {
  const writes = [];
  const transaction = {
    privacyRightsCase: {
      findFirst: async ({ where }) => ({
        id: where.id,
        status: "UNDER_REVIEW",
        identityVerificationStatus: "VERIFIED",
      }),
    },
    privacyLegalHold: { count: async () => 1 },
    privacySuppression: { count: async () => 1 },
    privacyCaseEvent: { create: async ({ data }) => writes.push(data) },
  };
  const repo = createPrivacyOperationsRepository({
    $transaction: async (callback) => callback(transaction),
  });
  const preview = await repo.createPreview("tenant", "campaign", "case", "DELETE", "actor");
  assert.equal(preview.executable, false);
  assert.equal(preview.affectedRecordCount, 0);
  assert.equal(preview.legalHoldBlocked, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].action, "PRIVACY_ACTION_PREVIEWED");
});

test("failed case transaction cannot leave case without audit", async () => {
  let rolledBack = false;
  const db = {
    $transaction: async (callback) => {
      try {
        await callback({
          privacyRightsCase: { create: async ({ data }) => ({ id: "case-1", ...data }) },
          privacyCaseEvent: {
            create: async () => {
              throw new Error("audit failed");
            },
          },
        });
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
  const repo = createPrivacyOperationsRepository(db);
  await assert.rejects(() => repo.createCase({}, "actor"), /audit failed/);
  assert.equal(rolledBack, true);
});

test("privacy case lifecycle permits only reviewed forward transitions", () => {
  assert.equal(
    validatePrivacyCaseTransition("RECEIVED", "IDENTITY_VERIFICATION_PENDING", "NOT_STARTED"),
    true,
  );
  assert.equal(
    validatePrivacyCaseTransition("IDENTITY_VERIFICATION_PENDING", "UNDER_REVIEW", "VERIFIED"),
    true,
  );
  assert.equal(validatePrivacyCaseTransition("UNDER_REVIEW", "ACTION_PENDING", "VERIFIED"), true);
  assert.equal(validatePrivacyCaseTransition("ACTION_PENDING", "COMPLETED", "VERIFIED"), true);
  assert.throws(
    () => validatePrivacyCaseTransition("RECEIVED", "COMPLETED", "VERIFIED"),
    /not permitted/,
  );
  assert.throws(
    () => validatePrivacyCaseTransition("COMPLETED", "UNDER_REVIEW", "VERIFIED"),
    /not permitted/,
  );
  assert.throws(
    () => validatePrivacyCaseTransition("UNDER_REVIEW", "UNDER_REVIEW", "VERIFIED"),
    /already/,
  );
  assert.throws(
    () => validatePrivacyCaseTransition("IDENTITY_VERIFICATION_PENDING", "UNDER_REVIEW", "PENDING"),
    /Verified identity/,
  );
});

test("identity verification transitions fail closed", () => {
  assert.equal(validateVerificationTransition("NOT_STARTED", "PENDING"), true);
  assert.equal(validateVerificationTransition("PENDING", "VERIFIED"), true);
  assert.throws(() => validateVerificationTransition("NOT_STARTED", "VERIFIED"), /not permitted/);
  assert.throws(() => validateVerificationTransition("VERIFIED", "PENDING"), /not permitted/);
});

test("authoritative suppression check is tenant, campaign, channel, and active scoped", async () => {
  let where;
  const repository = createPrivacyOperationsRepository({
    privacySuppression: {
      count: async (query) => {
        where = query.where;
        return 1;
      },
    },
  });
  assert.equal(
    await repository.isSuppressed("tenant-a", "campaign-a", "safe-hash", "WHATSAPP"),
    true,
  );
  assert.deepEqual(where, {
    tenantId: "tenant-a",
    campaignId: "campaign-a",
    subjectKeyHash: "safe-hash",
    status: "ACTIVE",
    channel: { in: ["WHATSAPP", "ALL"] },
  });
});

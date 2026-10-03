import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { createPrivacyOperationsRouter } from "../server/routes/privacyOperations.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const campaignId = "22222222-2222-4222-8222-222222222222";
const foreignCampaignId = "33333333-3333-4333-8333-333333333333";
const caseId = "44444444-4444-4444-8444-444444444444";
const controlId = "55555555-5555-4555-8555-555555555555";
const actorId = "66666666-6666-4666-8666-666666666666";

function repository(overrides = {}) {
  return {
    campaignInTenant: async (_tenant, campaign) => (campaign === campaignId ? 1 : 0),
    listCases: async () => [],
    findCase: async (tenant, campaign, target) =>
      tenant === tenantId && campaign === campaignId && target === caseId
        ? {
            id: caseId,
            tenantId,
            campaignId,
            status: "RECEIVED",
            identityVerificationStatus: "NOT_STARTED",
          }
        : null,
    createCase: async (data) => ({ id: caseId, ...data }),
    updateCase: async (_tenant, _campaign, _id, _expected, data) => ({ id: caseId, ...data }),
    createPreview: async () => ({
      executable: false,
      legalHoldBlocked: false,
      affectedRecordCount: 0,
    }),
    listSuppressions: async () => [],
    updateSuppression: async () => null,
    listLegalHolds: async () => [],
    releaseLegalHold: async () => null,
    createSuppression: async () => {
      throw new Error("must not execute");
    },
    createLegalHold: async () => {
      throw new Error("must not execute");
    },
    ...overrides,
  };
}

function appFor(role, repositoryInstance = repository(), membershipTenant = tenantId) {
  const app = express();
  app.use(express.json());
  if (role)
    app.use((req, _res, next) => {
      req.auth = { user: { id: actorId, memberships: [{ tenantId: membershipTenant, role }] } };
      next();
    });
  app.use(
    "/privacy",
    createPrivacyOperationsRouter(repositoryInstance, { subjectHashSecret: "test-secret" }),
  );
  app.use((error, _req, response, _next) =>
    response
      .status(error.status || 500)
      .json({ message: error.status ? error.message : "Unexpected server error." }),
  );
  return app;
}

const scoped = (agent) => agent.set("X-Organization-Id", tenantId);

test("unauthenticated and ordinary administrators are rejected before repository access", async () => {
  for (const role of [null, "CAMPAIGN_ADMINISTRATOR"]) {
    let calls = 0;
    const guarded = repository({
      campaignInTenant: async () => {
        calls += 1;
        return 1;
      },
    });
    const response = await scoped(
      request(appFor(role, guarded)).get(`/privacy/${campaignId}/cases`),
    );
    assert.equal(response.status, role ? 403 : 401);
    assert.equal(calls, 0);
  }
});

test("tenant and campaign mismatches fail before case access", async () => {
  let caseReads = 0;
  const guarded = repository({
    findCase: async () => {
      caseReads += 1;
      return null;
    },
  });
  assert.equal(
    (
      await request(appFor("SUPER_ADMINISTRATOR", guarded))
        .get(`/privacy/${campaignId}/cases`)
        .set("X-Organization-Id", "77777777-7777-4777-8777-777777777777")
    ).status,
    403,
  );
  assert.equal(
    (
      await scoped(
        request(appFor("SUPER_ADMINISTRATOR", guarded)).get(`/privacy/${foreignCampaignId}/cases`),
      )
    ).status,
    404,
  );
  assert.equal(caseReads, 0);
});

test("case lookup rejects cross-scope and unknown cases", async () => {
  const response = await scoped(
    request(appFor("SUPER_ADMINISTRATOR")).get(
      `/privacy/${campaignId}/cases/77777777-7777-4777-8777-777777777777`,
    ),
  );
  assert.equal(response.status, 404);
});

test("valid lifecycle transition is server enforced with scoped update", async () => {
  let update;
  const guarded = repository({
    updateCase: async (...args) => {
      update = args;
      return { id: caseId, ...args[4] };
    },
  });
  const response = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).patch(`/privacy/${campaignId}/cases/${caseId}`),
  ).send({ status: "IDENTITY_VERIFICATION_PENDING" });
  assert.equal(response.status, 200);
  assert.deepEqual(update.slice(0, 3), [tenantId, campaignId, caseId]);
  assert.deepEqual(update[3], {
    status: "RECEIVED",
    identityVerificationStatus: "NOT_STARTED",
  });
});

test("invalid, repeated, and terminal lifecycle transitions make zero mutations", async () => {
  for (const [current, requested] of [
    ["RECEIVED", "COMPLETED"],
    ["UNDER_REVIEW", "UNDER_REVIEW"],
    ["COMPLETED", "UNDER_REVIEW"],
  ]) {
    let writes = 0;
    const guarded = repository({
      findCase: async () => ({
        id: caseId,
        status: current,
        identityVerificationStatus: "VERIFIED",
      }),
      updateCase: async () => {
        writes += 1;
        return {};
      },
    });
    const response = await scoped(
      request(appFor("SUPER_ADMINISTRATOR", guarded)).patch(
        `/privacy/${campaignId}/cases/${caseId}`,
      ),
    ).send({ status: requested });
    assert.equal(response.status, 409);
    assert.equal(writes, 0);
  }
});

test("identity verification cannot skip its conservative lifecycle", async () => {
  let writes = 0;
  const guarded = repository({
    updateCase: async () => {
      writes += 1;
      return {};
    },
  });
  const response = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).patch(`/privacy/${campaignId}/cases/${caseId}`),
  ).send({ identityVerificationStatus: "VERIFIED" });
  assert.equal(response.status, 409);
  assert.equal(writes, 0);
});

test("case reassignment and concurrent conflicting updates fail closed", async () => {
  let writes = 0;
  const reassignment = await scoped(
    request(
      appFor(
        "SUPER_ADMINISTRATOR",
        repository({
          updateCase: async () => {
            writes += 1;
          },
        }),
      ),
    ).patch(`/privacy/${campaignId}/cases/${caseId}`),
  ).send({ assignedOperatorId: actorId });
  assert.equal(reassignment.status, 400);
  const conflict = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", repository({ updateCase: async () => null }))).patch(
      `/privacy/${campaignId}/cases/${caseId}`,
    ),
  ).send({ status: "IDENTITY_VERIFICATION_PENDING" });
  assert.equal(conflict.status, 409);
  assert.equal(writes, 0);
});

test("suppression creation and change fail closed before mutation", async () => {
  let writes = 0;
  const guarded = repository({
    createSuppression: async () => {
      writes += 1;
    },
    updateSuppression: async () => {
      writes += 1;
    },
  });
  const create = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).post(`/privacy/${campaignId}/suppressions`),
  ).send({ caseId });
  const change = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).patch(
      `/privacy/${campaignId}/suppressions/${controlId}`,
    ),
  ).send({ status: "REVOKED" });
  assert.equal(create.status, 409);
  assert.equal(change.status, 409);
  assert.equal(writes, 0);
});

test("legal-hold issuance and release fail closed before mutation", async () => {
  let writes = 0;
  const guarded = repository({
    createLegalHold: async () => {
      writes += 1;
    },
    releaseLegalHold: async () => {
      writes += 1;
    },
  });
  const issue = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).post(`/privacy/${campaignId}/legal-holds`),
  ).send({ caseId });
  const release = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).post(
      `/privacy/${campaignId}/legal-holds/${controlId}/release`,
    ),
  ).send({ releaseAuthorization: "test" });
  assert.equal(issue.status, 409);
  assert.equal(release.status, 409);
  assert.equal(writes, 0);
});

test("active legal hold blocks guarded execution and invalid confirmation is sanitized", async () => {
  const guarded = repository({
    createPreview: async () => ({
      executable: false,
      legalHoldBlocked: true,
      affectedRecordCount: 0,
    }),
  });
  const invalid = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).post(
      `/privacy/${campaignId}/cases/${caseId}/execute`,
    ),
  ).send({ action: "DELETE", confirmation: "wrong-secret-value" });
  assert.equal(invalid.status, 400);
  assert.doesNotMatch(JSON.stringify(invalid.body), /wrong-secret-value/);
  const held = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).post(
      `/privacy/${campaignId}/cases/${caseId}/execute`,
    ),
  ).send({ action: "DELETE", confirmation: "EXECUTE AUTHORIZED PRIVACY DELETION" });
  assert.equal(held.status, 409);
  assert.match(held.body.message, /active legal hold/);
});

test("preview is scoped and returns bounded zero-write evidence", async () => {
  let args;
  const guarded = repository({
    createPreview: async (...values) => {
      args = values;
      return { executable: false, legalHoldBlocked: false, affectedRecordCount: 0 };
    },
  });
  const response = await scoped(
    request(appFor("SUPER_ADMINISTRATOR", guarded)).post(
      `/privacy/${campaignId}/cases/${caseId}/preview`,
    ),
  ).send({ action: "ANONYMIZE" });
  assert.equal(response.status, 200);
  assert.deepEqual(args.slice(0, 3), [tenantId, campaignId, caseId]);
  assert.equal(response.body.preview.affectedRecordCount, 0);
});

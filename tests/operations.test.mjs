import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createOperationsRouter } from "../server/routes/operations.js";
import { createOperationsRepository } from "../server/repositories/operationsRepository.js";
import { validateContact, workStatus } from "../server/services/operationsValidation.js";

test("all operational statuses are accepted and unknown values fail", () => {
  for (const status of ["Planned", "Active", "At Risk", "Blocked", "Completed", "Cancelled"])
    assert.ok(workStatus(status));
  assert.throws(() => workStatus("Persuaded"), /invalid/);
});

test("volunteer contact data requires explicit authorization", () => {
  assert.throws(
    () => validateContact({ contactAuthorized: false, phone: "+000000" }),
    /authorization/,
  );
  assert.doesNotThrow(() => validateContact({ contactAuthorized: true, phone: "+000000" }));
});

test("operations repository injects tenant and campaign ids server-side", async () => {
  const db = { initiative: { create: async ({ data }) => data } };
  const repository = createOperationsRepository(db);
  const created = await repository.create("org-a", "campaign-a", "initiatives", {
    title: "Launch",
    tenantId: "org-b",
    campaignId: "campaign-b",
  });
  assert.equal(created.tenantId, "org-a");
  assert.equal(created.campaignId, "campaign-a");
});

test("cross-tenant owners are rejected before an operational record is created", async () => {
  let created = false;
  const repository = createOperationsRepository({
    membership: { count: async () => 0 },
    initiative: {
      create: async () => {
        created = true;
      },
    },
  });
  await assert.rejects(
    repository.create("org-a", "campaign-a", "initiatives", {
      title: "Restricted",
      ownerId: "user-from-org-b",
    }),
    /not available/,
  );
  assert.equal(created, false);
});

test("operations HTTP API rejects a valid user from another organization", async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { user: { memberships: [{ tenantId: "org-a", role: "CAMPAIGN_MANAGER" }] } };
    next();
  });
  const repository = {
    list: async () => [],
    create: async () => ({}),
    update: async () => ({ count: 1 }),
    dashboard: async () => [0, 0, 0, 0, 0],
    listVolunteers: async () => [],
    createVolunteer: async () => ({}),
    listLevels: async () => [],
    createLevel: async () => ({}),
  };
  app.use("/operations", createOperationsRouter(repository));
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  await request(app)
    .get("/operations/campaign-b/tasks")
    .set("X-Organization-Id", "org-b")
    .expect(403);
});

test("operations HTTP API returns only repository-scoped tenant records", async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { user: { memberships: [{ tenantId: "org-a", role: "CAMPAIGN_MANAGER" }] } };
    next();
  });
  const repository = {
    list: async (tenantId, campaignId) => [{ id: "task-a", tenantId, campaignId }],
    create: async () => ({}),
    update: async () => ({ count: 1 }),
    dashboard: async () => [0, 0, 0, 0, 0],
    listVolunteers: async () => [],
    createVolunteer: async () => ({}),
    listLevels: async () => [],
    createLevel: async () => ({}),
  };
  app.use("/operations", createOperationsRouter(repository));
  const response = await request(app)
    .get("/operations/campaign-a/tasks")
    .set("X-Organization-Id", "org-a")
    .expect(200);
  assert.deepEqual(response.body.items, [
    { id: "task-a", tenantId: "org-a", campaignId: "campaign-a" },
  ]);
});

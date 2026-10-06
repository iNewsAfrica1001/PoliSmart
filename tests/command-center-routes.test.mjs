import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createCommandCenterRouter } from "../server/routes/commandCenter.js";

const tenantId = "10000000-0000-4000-8000-000000000001";
const campaignId = "20000000-0000-4000-8000-000000000002";
const areaId = "40000000-0000-4000-8000-000000000004";

const emptySnapshot = {
  campaign: { id: campaignId, name: "Campaign", country: "Nigeria", status: "ACTIVE" },
  taskStatus: [],
  tasksAtRisk: [],
  activities: [],
  events: [],
  volunteerStatus: [],
  policyWork: [],
  mediaDevelopments: [],
  intelligence: [],
  changedLast24Hours: 0,
};

function appFor(role, repository = {}) {
  const calls = [];
  const app = express();
  app.use((req, _res, next) => {
    if (role) req.auth = { user: { memberships: [{ tenantId, role }] } };
    next();
  });
  app.use(
    "/command-center",
    createCommandCenterRouter({
      campaignContext: async (...args) => {
        calls.push(["context", ...args]);
        return { campaign: { id: campaignId, country: "Nigeria" }, selectedGeography: null };
      },
      snapshot: async (...args) => {
        calls.push(["snapshot", ...args]);
        return emptySnapshot;
      },
      geography: async (...args) => {
        calls.push(["geography", ...args]);
        return [];
      },
      ...repository,
    }),
  );
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  return { app, calls };
}

test("Command Center requires authentication and campaign-read tenant membership", async () => {
  await request(appFor(null).app).get(`/command-center/${campaignId}`).expect(401);
  await request(appFor("UNKNOWN_ROLE").app)
    .get(`/command-center/${campaignId}`)
    .set("X-Organization-Id", tenantId)
    .expect(403);
  await request(appFor("ANALYST").app)
    .get(`/command-center/${campaignId}`)
    .set("X-Organization-Id", tenantId)
    .expect(200);
});

test("Command Center derives country from the tenant-scoped campaign and disables caching", async () => {
  const { app, calls } = appFor("ANALYST");
  const response = await request(app)
    .get(`/command-center/${campaignId}?country=nigeria`)
    .set("X-Organization-Id", tenantId)
    .expect(200);
  assert.equal(response.headers["cache-control"], "private, no-store");
  assert.equal(calls.find(([name]) => name === "snapshot")[1].country, "Nigeria");
  assert.deepEqual(calls.find(([name]) => name === "geography").slice(1), [
    tenantId,
    campaignId,
    "Nigeria",
  ]);
  await request(appFor("ANALYST").app)
    .get(`/command-center/${campaignId}?country=Ghana`)
    .set("X-Organization-Id", tenantId)
    .expect(400, { message: "country does not match the campaign." });
});

test("Command Center rejects unknown, malformed, and unassigned geographic filters", async () => {
  for (const path of [
    `?unexpected=true`,
    `?geographicAreaId=invalid`,
    `?geographicAreaId=${areaId}`,
  ])
    await request(appFor("ANALYST").app)
      .get(`/command-center/${campaignId}${path}`)
      .set("X-Organization-Id", tenantId)
      .expect(400);
});

test("valid selected assignment preserves exact-area filtering without descendant roll-up", async () => {
  const { app, calls } = appFor("ANALYST", {
    campaignContext: async () => ({
      campaign: { id: campaignId, country: "Nigeria" },
      selectedGeography: { masterGeographicAreaId: areaId },
    }),
  });
  await request(app)
    .get(`/command-center/${campaignId}?geographicAreaId=${areaId}`)
    .set("X-Organization-Id", tenantId)
    .expect(200);
  assert.equal(calls.find(([name]) => name === "snapshot")[1].geographicAreaId, areaId);
});

test("missing and cross-tenant campaigns fail closed before snapshot access", async () => {
  let snapshotCalls = 0;
  const { app } = appFor("ANALYST", {
    campaignContext: async () => null,
    snapshot: async () => {
      snapshotCalls += 1;
    },
  });
  await request(app)
    .get(`/command-center/${campaignId}`)
    .set("X-Organization-Id", tenantId)
    .expect(404);
  assert.equal(snapshotCalls, 0);
});

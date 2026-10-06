import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createCampaignGeographyRouter } from "../server/routes/campaignGeography.js";

const tenantId = "10000000-0000-4000-8000-000000000001";
const campaignId = "20000000-0000-4000-8000-000000000002";
const areaId = "40000000-0000-4000-8000-000000000004";

function appFor(role, service = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (role) req.auth = { user: { id: "actor", memberships: [{ tenantId, role }] } };
    next();
  });
  app.use(
    "/campaign-geography",
    createCampaignGeographyRouter({
      hierarchy: async () => ({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 0 }),
      assignments: async () => ({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 0 }),
      assign: async (input) => ({ requested: input.body.masterAreaIds.length }),
      deactivate: async (input) => ({ requested: input.body.masterAreaIds.length }),
      ...service,
    }),
  );
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
  return app;
}

test("Campaign Geography routes require authentication and exact role permissions", async () => {
  await request(appFor(null)).get(`/campaign-geography/${campaignId}/hierarchy`).expect(401);
  await request(appFor("ANALYST")).get(`/campaign-geography/${campaignId}/hierarchy`).set("X-Organization-Id", tenantId).expect(403);
  await request(appFor("CAMPAIGN_ADMINISTRATOR")).get(`/campaign-geography/${campaignId}/hierarchy`).set("X-Organization-Id", tenantId).expect(200);
  await request(appFor("CAMPAIGN_ADMINISTRATOR")).post(`/campaign-geography/${campaignId}/assignments`).set("X-Organization-Id", tenantId).send({ masterAreaIds: [areaId] }).expect(200);
  await request(appFor("SUPER_ADMINISTRATOR")).post(`/campaign-geography/${campaignId}/assignments/deactivate`).set("X-Organization-Id", tenantId).send({ masterAreaIds: [areaId] }).expect(200);
});

test("tenant identity comes only from authenticated membership", async () => {
  let received;
  const app = appFor("CAMPAIGN_ADMINISTRATOR", {
    assign: async (input) => {
      received = input;
      return { requested: 1 };
    },
  });
  await request(app)
    .post(`/campaign-geography/${campaignId}/assignments`)
    .set("X-Organization-Id", "90000000-0000-4000-8000-000000000009")
    .send({ tenantId, masterAreaIds: [areaId] })
    .expect(403);
  assert.equal(received, undefined);
});

test("all four reviewed route contracts are mounted", async () => {
  const app = appFor("CAMPAIGN_ADMINISTRATOR");
  const headers = { "X-Organization-Id": tenantId };
  await request(app).get(`/campaign-geography/${campaignId}/hierarchy`).set(headers).expect(200);
  await request(app).get(`/campaign-geography/${campaignId}/assignments`).set(headers).expect(200);
  await request(app).post(`/campaign-geography/${campaignId}/assignments`).set(headers).send({ masterAreaIds: [areaId] }).expect(200);
  await request(app).post(`/campaign-geography/${campaignId}/assignments/deactivate`).set(headers).send({ masterAreaIds: [areaId] }).expect(200);
});

test("mutation actor is derived only from the authenticated session and actor aliases are rejected", async () => {
  let received;
  const app = appFor("CAMPAIGN_ADMINISTRATOR", {
    assign: async (input) => {
      received = input;
      if (Object.keys(input.body).some((key) => key !== "masterAreaIds"))
        throw Object.assign(new Error("Unknown assignment field."), { status: 400 });
      return { requested: 1 };
    },
  });
  const headers = { "X-Organization-Id": tenantId };
  await request(app)
    .post(`/campaign-geography/${campaignId}/assignments`)
    .set(headers)
    .send({ masterAreaIds: [areaId] })
    .expect(200);
  assert.equal(received.actorId, "actor");
  for (const field of ["actorId", "actor_id", "userId", "user_id", "createdById", "updatedById"])
    await request(app)
      .post(`/campaign-geography/${campaignId}/assignments`)
      .set(headers)
      .send({ masterAreaIds: [areaId], [field]: "spoofed-authorized-user" })
      .expect(400);
});

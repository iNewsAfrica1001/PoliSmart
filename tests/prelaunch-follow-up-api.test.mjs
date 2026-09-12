import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createPrelaunchReviewRouter } from "../server/routes/prelaunch.js";

const leadId = "11111111-1111-4111-8111-111111111111";
const followUpId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const now = new Date("2026-09-11T12:00:00.000Z");

function repository(overrides = {}) {
  return {
    list: async () => [],
    findById: async () => null,
    updateStatus: async () => null,
    listFollowUpsForLead: async () => [],
    createFollowUp: async (input) => ({ id: followUpId, ...input }),
    completeFollowUp: async () => ({ outcome: "NOT_FOUND", followUp: null }),
    ...overrides,
  };
}

function appFor(role, repositoryInstance) {
  const app = express();
  app.use(express.json());
  if (role)
    app.use((req, _res, next) => {
      req.auth = { user: { id: userId, memberships: [{ role }] } };
      next();
    });
  app.use(
    "/admin/prelaunch-leads",
    createPrelaunchReviewRouter(repositoryInstance, { now: () => now }),
  );
  app.use((error, _req, response, _next) =>
    response.status(error.status || 500).json({ message: error.message }),
  );
  return app;
}

test("unauthenticated and Campaign Administrator follow-up requests make zero repository calls", async () => {
  for (const role of [null, "CAMPAIGN_ADMINISTRATOR"]) {
    let calls = 0;
    const guarded = repository({
      listFollowUpsForLead: async () => { calls += 1; return []; },
      createFollowUp: async () => { calls += 1; return {}; },
      completeFollowUp: async () => { calls += 1; return {}; },
    });
    const app = appFor(role, guarded);
    const expected = role ? 403 : 401;
    assert.equal((await request(app).get(`/admin/prelaunch-leads/${leadId}/follow-ups`)).status, expected);
    assert.equal((await request(app).post(`/admin/prelaunch-leads/${leadId}/follow-ups`).send({ note: "Call", scheduledAt: "2026-09-12T12:00:00Z" })).status, expected);
    assert.equal((await request(app).patch(`/admin/prelaunch-leads/${leadId}/follow-ups/${followUpId}/complete`).send({})).status, expected);
    assert.equal(calls, 0);
  }
});

test("Super Administrator can list append-only history containing safe display fields", async () => {
  const followUp = {
    id: followUpId,
    note: "Arrange demo",
    createdBy: { id: userId, displayName: "Preview Administrator" },
    completedBy: null,
  };
  const response = await request(appFor("SUPER_ADMINISTRATOR", repository({
    listFollowUpsForLead: async () => [followUp],
  }))).get(`/admin/prelaunch-leads/${leadId}/follow-ups`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.followUps, [followUp]);
  assert.doesNotMatch(JSON.stringify(response.body), /passwordHash|token|emailVerifiedAt/);
});

test("valid creation trims the note, returns 201, and derives creator identity from the session", async () => {
  let observed;
  const app = appFor("SUPER_ADMINISTRATOR", repository({
    createFollowUp: async (input) => { observed = input; return { id: followUpId, ...input }; },
  }));
  const response = await request(app).post(`/admin/prelaunch-leads/${leadId}/follow-ups`).send({
    note: "  Arrange a product walkthrough.  ",
    scheduledAt: "2026-09-12T10:30:00+01:00",
  });
  assert.equal(response.status, 201);
  assert.equal(observed.note, "Arrange a product walkthrough.");
  assert.equal(observed.leadId, leadId);
  assert.equal(observed.createdById, userId);
  assert.equal(observed.scheduledAt.toISOString(), "2026-09-12T09:30:00.000Z");
});

test("creation rejects empty or oversized notes, invalid or past dates, and unsupported fields", async () => {
  let calls = 0;
  const app = appFor("SUPER_ADMINISTRATOR", repository({
    createFollowUp: async () => { calls += 1; return {}; },
  }));
  const url = `/admin/prelaunch-leads/${leadId}/follow-ups`;
  const invalidBodies = [
    { note: "", scheduledAt: "2026-09-12T12:00:00Z" },
    { note: "x".repeat(2001), scheduledAt: "2026-09-12T12:00:00Z" },
    { note: "Call", scheduledAt: "not-a-date" },
    { note: "Call", scheduledAt: "2026-02-30T12:00:00Z" },
    { note: "Call", scheduledAt: "2026-09-10T12:00:00Z" },
  ];
  for (const field of [
    "id",
    "leadId",
    "createdById",
    "createdAt",
    "completedAt",
    "completedById",
    "status",
  ])
    invalidBodies.push({
      note: "Call",
      scheduledAt: "2026-09-12T12:00:00Z",
      [field]: "client-supplied",
    });
  for (const body of invalidBodies)
    assert.equal((await request(app).post(url).send(body)).status, 400);
  assert.equal(calls, 0);
});

test("completion uses both URL IDs and session identity and requires an empty body", async () => {
  let observed;
  let calls = 0;
  const app = appFor("SUPER_ADMINISTRATOR", repository({
    completeFollowUp: async (...args) => {
      calls += 1;
      observed = args;
      return { outcome: "COMPLETED", followUp: { id: followUpId } };
    },
  }));
  const url = `/admin/prelaunch-leads/${leadId}/follow-ups/${followUpId}/complete`;
  const response = await request(app).patch(url).send({});
  assert.equal(response.status, 200);
  assert.deepEqual(observed, [leadId, followUpId, userId]);
  assert.equal((await request(app).patch(url).send({ completedById: "attacker" })).status, 400);
  assert.equal((await request(app).patch(url).send({ completedAt: now.toISOString() })).status, 400);
  assert.equal(calls, 1);
});

test("completion returns controlled conflict and not-found responses", async () => {
  const url = `/admin/prelaunch-leads/${leadId}/follow-ups/${followUpId}/complete`;
  const conflict = appFor("SUPER_ADMINISTRATOR", repository({
    completeFollowUp: async () => ({ outcome: "ALREADY_COMPLETED", followUp: null }),
  }));
  assert.equal((await request(conflict).patch(url).send({})).status, 409);
  const missing = appFor("SUPER_ADMINISTRATOR", repository());
  assert.equal((await request(missing).patch(url).send({})).status, 404);
});

test("invalid IDs are rejected before follow-up repository access", async () => {
  let calls = 0;
  const app = appFor("SUPER_ADMINISTRATOR", repository({
    listFollowUpsForLead: async () => { calls += 1; return []; },
    completeFollowUp: async () => { calls += 1; return {}; },
  }));
  assert.equal((await request(app).get("/admin/prelaunch-leads/not-an-id/follow-ups")).status, 404);
  assert.equal((await request(app).patch(`/admin/prelaunch-leads/${leadId}/follow-ups/not-an-id/complete`).send({})).status, 404);
  assert.equal(calls, 0);
});

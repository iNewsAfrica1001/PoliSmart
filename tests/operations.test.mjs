import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createOperationsRouter } from "../server/routes/operations.js";
import { createOperationsRepository } from "../server/repositories/operationsRepository.js";
import { validateContact, workStatus } from "../server/services/operationsValidation.js";
import { PERMISSIONS, ROLES } from "../server/config/authorization.js";
import { hasPermission } from "../server/services/authorization.js";
import { readFileSync } from "node:fs";
import { createAuthRouter } from "../server/routes/auth.js";

const eventCreators = [
  "SUPER_ADMINISTRATOR",
  "CAMPAIGN_ADMINISTRATOR",
  "FIELD_DIRECTOR",
  "VOLUNTEER_COORDINATOR",
];

function eventApp(role, calls) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (role !== null) req.auth = { user: { memberships: [{ tenantId: "org-a", role }] } };
    next();
  });
  app.use(
    "/operations",
    createOperationsRouter({
      create: async (tenantId, campaignId, kind, data) => {
        calls.push({ tenantId, campaignId, kind, data });
        return { id: "event-a", tenantId, campaignId, ...data };
      },
    }),
  );
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  return app;
}

test("event creation enforces the approved role matrix through the HTTP API", async () => {
  for (const role of [...new Set(Object.values(ROLES)), "UNKNOWN", null]) {
    const calls = [];
    const allowed = eventCreators.includes(role);
    await request(eventApp(role, calls))
      .post("/operations/campaign-a/events")
      .set("X-Organization-Id", "org-a")
      .send({
        title: "Test meeting",
        type: "INTERNAL_MEETING",
        status: "PLANNED",
        startsAt: "2026-10-01T12:00:00Z",
        tenantId: "org-b",
      })
      .expect(role === null ? 401 : allowed ? 201 : 403);
    assert.equal(calls.length, allowed ? 1 : 0, String(role));
    if (allowed) {
      assert.equal(calls[0].tenantId, "org-a");
      assert.equal(calls[0].data.tenantId, undefined);
    }
  }
});

test("event creation rejects missing or foreign organization scope before persistence", async () => {
  for (const tenant of [null, "org-b"]) {
    const calls = [];
    const req = request(eventApp("CAMPAIGN_ADMINISTRATOR", calls)).post(
      "/operations/campaign-a/events",
    );
    if (tenant) req.set("X-Organization-Id", tenant);
    await req.send({ title: "Test meeting", type: "INTERNAL_MEETING" }).expect(403);
    assert.equal(calls.length, 0);
  }
});

test("event permission does not grant Campaign Administrator field-management powers", () => {
  const actor = { role: ROLES.CAMPAIGN_ADMINISTRATOR };
  assert.equal(hasPermission(actor, PERMISSIONS.EVENTS_CREATE), true);
  assert.equal(hasPermission(actor, PERMISSIONS.FIELD_MANAGE), false);
  assert.equal(hasPermission(actor, PERMISSIONS.PLATFORM_USERS_MANAGE), false);
});

test("event UI capability comes from the server policy and guards form submission", async () => {
  for (const role of [...new Set(Object.values(ROLES)), "UNKNOWN"]) {
    const app = express();
    app.use((req, _res, next) => {
      req.auth = {
        user: {
          memberships: [
            { tenantId: "org-a", role, organization: { id: "org-a", name: "Test organization" } },
          ],
        },
      };
      next();
    });
    app.use(createAuthRouter({ authService: {}, config: {} }));
    const response = await request(app).get("/me").expect(200);
    assert.equal(response.body.user.memberships[0].canCreateEvents, eventCreators.includes(role));
  }
  const source = readFileSync(new URL("../src/pages/OperationsPage.tsx", import.meta.url), "utf8");
  assert.match(source, /\?\.canCreateEvents\s*===\s*true/);
  assert.ok(source.includes('if (section === "events" && !canCreateEvent) return;'));
  assert.ok(source.includes('showForm && (section !== "events" || canCreateEvent)'));
});

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

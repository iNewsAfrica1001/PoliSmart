import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";
import { createPrelaunchReviewRouter, createPrelaunchRouter } from "../server/routes/prelaunch.js";
import { createAccountNotificationService } from "../server/services/accountNotifications.js";

const validEarlyAccess = {
  name: "Ada Campaign",
  email: "ada@example.test",
  organization: "Civic Futures",
  country: "Nigeria",
  role: "Campaign strategist",
  interest: "POLITICAL_INTELLIGENCE",
  note: "Grounded campaign research",
};

function appFor({ create = async (data) => ({ id: "lead-id", ...data }), limiter, notifications } = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    "/prelaunch",
    createPrelaunchRouter({
      repository: { create },
      notifications,
      rateLimiter: limiter || ((_request, _response, next) => next()),
    }),
  );
  app.use((error, _request, response, _next) =>
    response.status(error.status || 500).json({ message: error.message }),
  );
  return app;
}

test("public early-access and demo requests validate and persist only approved fields", async () => {
  const created = [];
  const notifications = [];
  const app = appFor({
    create: async (data) => {
      created.push(data);
      return { id: "lead-id", ...data };
    },
    notifications: { sendPrelaunchLeadNotification: async (lead) => notifications.push(lead) },
  });

  const early = await request(app)
    .post("/prelaunch/early_access")
    .send({ ...validEarlyAccess, paymentCard: "ignored", sensitiveOpinion: "ignored" });
  assert.equal(early.status, 202);
  assert.match(early.body.message, /early access request has been received/i);
  assert.equal(created[0].requestType, "EARLY_ACCESS");
  assert.equal(created[0].email, "ada@example.test");
  assert.equal("paymentCard" in created[0], false);
  assert.equal("sensitiveOpinion" in created[0], false);

  const demo = await request(app).post("/prelaunch/demo").send({
    name: "Kofi Organizer",
    email: "kofi@example.test",
    organization: "Public Policy Lab",
    country: "Ghana",
    role: "Director",
    organizationType: "PUBLIC_POLICY_ORGANIZATION",
    timing: "WITHIN_2_WEEKS",
  });
  assert.equal(demo.status, 202);
  assert.match(demo.body.message, /demo request has been received/i);
  assert.equal(created[1].requestType, "DEMO");
  assert.equal(notifications.length, 2);
});

test("pre-launch requests reject invalid email, excessive lengths, and unsupported choices", async () => {
  const app = appFor();
  assert.equal(
    (await request(app).post("/prelaunch/early_access").send({ ...validEarlyAccess, email: "bad" })).status,
    400,
  );
  assert.equal(
    (await request(app).post("/prelaunch/early_access").send({ ...validEarlyAccess, name: "x".repeat(121) })).status,
    400,
  );
  assert.equal(
    (await request(app).post("/prelaunch/early_access").send({ ...validEarlyAccess, interest: "FREE_TEXT" })).status,
    400,
  );
});

test("pre-launch capture applies its limiter and exposes no public lead-list route", async () => {
  const limited = appFor({
    limiter: (_request, response) => response.status(429).json({ message: "Too many requests." }),
  });
  assert.equal((await request(limited).post("/prelaunch/early_access").send(validEarlyAccess)).status, 429);
  assert.equal((await request(appFor()).get("/prelaunch")).status, 404);
});

test("notification failure is sanitized and does not invalidate a stored request", async () => {
  const originalError = console.error;
  const errors = [];
  console.error = (entry) => errors.push(entry);
  try {
    const response = await request(
      appFor({
        notifications: {
          sendPrelaunchLeadNotification: async () => {
            throw new Error("provider detail containing ada@example.test");
          },
        },
      }),
    )
      .post("/prelaunch/early_access")
      .send(validEarlyAccess);
    assert.equal(response.status, 202);
    assert.match(response.body.message, /request has been received/i);
    assert.equal(errors.length, 1);
    assert.doesNotMatch(errors[0], /ada@example\.test|provider detail/);
  } finally {
    console.error = originalError;
  }
});

test("lead notification reuses transactional delivery and escapes submitted content", async () => {
  const messages = [];
  const service = createAccountNotificationService(
    {
      emailProvider: "microsoft365",
      emailFrom: "PoliSmart <no-reply@example.test>",
      smtpHost: "smtp.example.test",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "no-reply@example.test",
      smtpPassword: "not-a-real-secret",
    },
    { smtpTransport: { sendMail: async (message) => messages.push(message) } },
  );
  await service.sendPrelaunchLeadNotification({
    requestType: "EARLY_ACCESS",
    ...validEarlyAccess,
    name: "<script>alert(1)</script>",
  });
  assert.equal(messages[0].to, "support@polismartafrica.ai");
  assert.equal(messages[0].subject, "New PoliSmart Early Access Request");
  assert.doesNotMatch(messages[0].html, /<script>/);
  assert.match(messages[0].html, /&lt;script&gt;/);
});

function reviewApp(role, repository) {
  const app = express();
  app.use(express.json());
  if (role)
    app.use((request, _response, next) => {
      request.auth = { user: { memberships: [{ role }] } };
      next();
    });
  app.use("/admin/prelaunch-leads", createPrelaunchReviewRouter(repository));
  app.use((error, _request, response, _next) =>
    response.status(error.status || 500).json({ message: error.message }),
  );
  return app;
}

function statusRepository(initialStatus = "NEW", updateOutcome = "UPDATED") {
  const lead = {
    id: "11111111-1111-4111-8111-111111111111",
    status: initialStatus,
    updatedAt: "2026-09-11T12:00:00.000Z",
  };
  const calls = [];
  return {
    calls,
    findById: async () => lead,
    updateStatus: async (...args) => {
      calls.push(args);
      return updateOutcome === "UPDATED"
        ? { outcome: "UPDATED", lead: { ...lead, status: args[2], updatedAt: "2026-09-11T12:01:00.000Z" } }
        : { outcome: updateOutcome, lead: null };
    },
  };
}

test("pre-launch review requires a Super Administrator and never calls repositories when denied", async () => {
  let calls = 0;
  const repository = { list: async () => { calls += 1; return []; } };
  assert.equal((await request(reviewApp(null, repository)).get("/admin/prelaunch-leads")).status, 401);
  assert.equal(
    (await request(reviewApp("CAMPAIGN_ADMINISTRATOR", repository)).get("/admin/prelaunch-leads")).status,
    403,
  );
  assert.equal(calls, 0);
});

test("authorized lead review supports validated filters, detail, and human status updates", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const lead = {
    id,
    requestType: "DEMO",
    name: "Synthetic Reviewer Test",
    email: "review@example.test",
    organization: "Example Organization",
    country: "Ghana",
    role: "Director",
    interest: null,
    organizationType: "PUBLIC_POLICY_ORGANIZATION",
    timing: "WITHIN_2_WEEKS",
    note: "Synthetic note",
    status: "NEW",
  };
  const observed = {};
  const repository = {
    list: async (filters) => { observed.filters = filters; return [lead]; },
    findById: async (receivedId) => { observed.detailId = receivedId; return lead; },
    updateStatus: async (receivedId, expectedStatus, status) => ({
      outcome: "UPDATED",
      lead: { ...lead, id: receivedId, status, expectedStatus },
    }),
  };
  const app = reviewApp("SUPER_ADMINISTRATOR", repository);
  const list = await request(app).get(
    "/admin/prelaunch-leads?requestType=demo&country=Ghana&status=new",
  );
  assert.equal(list.status, 200);
  assert.deepEqual(observed.filters, { requestType: "DEMO", status: "NEW", country: "Ghana" });
  assert.equal((await request(app).get(`/admin/prelaunch-leads/${id}`)).status, 200);
  assert.equal(observed.detailId, id);
  const updated = await request(app)
    .patch(`/admin/prelaunch-leads/${id}/status`)
    .send({ status: "qualified" });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.lead.status, "QUALIFIED");
  assert.equal(
    (await request(app).patch(`/admin/prelaunch-leads/${id}/status`).send({ status: "SCORING" })).status,
    400,
  );
});

test("authorized lead status transitions succeed and prohibited transitions return conflict", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  for (const [current, requested] of [
    ["NEW", "CONTACTED"], ["NEW", "QUALIFIED"], ["NEW", "CLOSED"],
    ["CONTACTED", "QUALIFIED"], ["CONTACTED", "CLOSED"], ["QUALIFIED", "CLOSED"],
  ]) {
    const repository = statusRepository(current);
    const response = await request(reviewApp("SUPER_ADMINISTRATOR", repository))
      .patch(`/admin/prelaunch-leads/${id}/status`).send({ status: requested });
    assert.equal(response.status, 200, `${current} -> ${requested}`);
    assert.deepEqual(repository.calls, [[id, current, requested]]);
  }
  for (const [current, requested] of [
    ["CONTACTED", "NEW"], ["QUALIFIED", "NEW"], ["QUALIFIED", "CONTACTED"],
    ["CLOSED", "NEW"], ["CLOSED", "CONTACTED"], ["CLOSED", "QUALIFIED"],
  ]) {
    const repository = statusRepository(current);
    const response = await request(reviewApp("SUPER_ADMINISTRATOR", repository))
      .patch(`/admin/prelaunch-leads/${id}/status`).send({ status: requested });
    assert.equal(response.status, 409, `${current} -> ${requested}`);
    assert.match(response.body.message, /not permitted/i);
    assert.equal(repository.calls.length, 0);
  }
});

test("same-status update is a no-op and leaves updatedAt unchanged", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const repository = statusRepository("CONTACTED");
  const response = await request(reviewApp("SUPER_ADMINISTRATOR", repository))
    .patch(`/admin/prelaunch-leads/${id}/status`).send({ status: "CONTACTED" });
  assert.equal(response.status, 200);
  assert.equal(response.body.lead.updatedAt, "2026-09-11T12:00:00.000Z");
  assert.equal(repository.calls.length, 0);
});

test("concurrent status changes and concurrent deletion return controlled responses", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  for (const [outcome, expected] of [["CONFLICT", 409], ["NOT_FOUND", 404]]) {
    const repository = statusRepository("NEW", outcome);
    const response = await request(reviewApp("SUPER_ADMINISTRATOR", repository))
      .patch(`/admin/prelaunch-leads/${id}/status`).send({ status: "CONTACTED" });
    assert.equal(response.status, expected);
    assert.doesNotMatch(response.body.message, /prisma|database|sql/i);
  }
});

test("unknown lead status update remains a controlled 404", async () => {
  let updates = 0;
  const repository = {
    findById: async () => null,
    updateStatus: async () => { updates += 1; },
  };
  const response = await request(reviewApp("SUPER_ADMINISTRATOR", repository))
    .patch("/admin/prelaunch-leads/11111111-1111-4111-8111-111111111111/status")
    .send({ status: "CONTACTED" });
  assert.equal(response.status, 404);
  assert.equal(updates, 0);
});

test("pre-launch review UI is capability-gated and contains no automated scoring or bulk email", () => {
  const page = readFileSync("src/pages/PrelaunchLeadReviewPage.tsx", "utf8");
  const app = readFileSync("src/App.tsx", "utf8");
  const shell = readFileSync("src/components/layout/AppShell.tsx", "utf8");
  assert.match(app, /\/admin\/prelaunch-leads/);
  assert.match(shell, /canReviewPrelaunchLeads/);
  assert.match(page, /NEW.*CONTACTED.*QUALIFIED.*CLOSED/);
  assert.match(page, /Primary interest \/ organization type/);
  assert.match(page, /Decisions and follow-up remain human-led/);
  assert.doesNotMatch(page, /score|bulk email|automated campaign/i);
  assert.match(page, /permittedPrelaunchLeadStatuses/);
  assert.match(page, /No further status transition is available/);
  assert.match(page, /status === 409/);
  assert.match(page, /latest status has been loaded/);
});

test("lead status transitions announce only server-confirmed changes accessibly", () => {
  const page = readFileSync("src/pages/PrelaunchLeadReviewPage.tsx", "utf8");
  const handler = page.slice(page.indexOf("const updateStatus"), page.indexOf("const createFollowUp"));
  assert.match(handler, /const previousStatus = selected\.status/);
  assert.match(handler, /setStatusMessage\(""\)/);
  assert.match(handler, /const updated = \(await prelaunchAdminApi\.updateStatus/);
  assert.match(handler, /updated\.status !== previousStatus/);
  assert.match(handler, /setStatusMessage\(`Lead status changed to \$\{updated\.status\}\.`\)/);
  assert.doesNotMatch(handler, /setStatusMessage\(`Lead status changed to \$\{status\}/);
  assert.match(page, /role="status" aria-live="polite">\{statusMessage\}/);
  assert.match(page, /Change status immediately<select/);
});

test("lead status failures and conflicts never announce stale success", () => {
  const page = readFileSync("src/pages/PrelaunchLeadReviewPage.tsx", "utf8");
  const handler = page.slice(page.indexOf("const updateStatus"), page.indexOf("const createFollowUp"));
  const requestIndex = handler.indexOf("prelaunchAdminApi.updateStatus");
  assert.ok(handler.indexOf('setStatusMessage("")') < requestIndex);
  assert.match(handler, /status === 409/);
  assert.match(handler, /status === 404/);
  assert.match(handler, /The request could not be found/);
  const catchBlock = handler.slice(handler.indexOf("} catch"));
  assert.doesNotMatch(catchBlock, /setStatusMessage\([^"']/);
});

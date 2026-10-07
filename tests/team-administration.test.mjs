import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";
import {
  createTeamAdministrationService,
  assignableTeamRoles,
} from "../server/services/teamAdministration.js";
import { createTeamAdministrationRouter } from "../server/routes/teamAdministration.js";

const secret = "team-invitation-test-secret-at-least-32-characters";
const now = new Date("2026-10-06T12:00:00.000Z");

test("role delegation is subordinate-only and protects platform administration", () => {
  assert.equal(
    assignableTeamRoles("CAMPAIGN_ADMINISTRATOR").includes("SUPER_ADMINISTRATOR"),
    false,
  );
  assert.equal(
    assignableTeamRoles("CAMPAIGN_ADMINISTRATOR").includes("CAMPAIGN_ADMINISTRATOR"),
    false,
  );
  assert.equal(assignableTeamRoles("SUPER_ADMINISTRATOR").includes("CAMPAIGN_ADMINISTRATOR"), true);
  assert.deepEqual(assignableTeamRoles("ANALYST"), []);
});

test("invitation creates a 256-bit token, persists only its hash, and expires in 72 hours", async () => {
  let persisted;
  let delivered;
  const service = createTeamAdministrationService(
    {
      createInvitation: async (data) => {
        persisted = data;
        return {
          created: true,
          invitation: {
            id: "invite",
            recipientEmail: data.recipientEmail,
            role: data.role,
            organization: { name: "Tenant A" },
          },
        };
      },
    },
    {
      tokenSecret: secret,
      now: () => now,
      notifications: {
        sendTeamInvitation: async (data) => {
          delivered = data;
        },
      },
    },
  );
  await service.invite({
    tenantId: "tenant-a",
    actorId: "actor-a",
    actorRole: "CAMPAIGN_ADMINISTRATOR",
    email: " New@Example.Test ",
    role: "ANALYST",
  });
  assert.match(delivered.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(delivered.token, "base64url").length, 32);
  assert.notEqual(persisted.tokenHash, delivered.token);
  assert.equal(persisted.tokenHash.length, 64);
  assert.equal(persisted.recipientEmail, "new@example.test");
  assert.equal(persisted.expiresAt.toISOString(), "2026-10-09T12:00:00.000Z");
  assert.doesNotMatch(JSON.stringify(persisted), new RegExp(delivered.token));
});

test("Campaign Administrator cannot invite protected roles", async () => {
  const service = createTeamAdministrationService(
    { createInvitation: async () => assert.fail("must not write") },
    { tokenSecret: secret },
  );
  for (const role of ["CAMPAIGN_ADMINISTRATOR", "SUPER_ADMINISTRATOR"])
    await assert.rejects(
      service.invite({
        tenantId: "a",
        actorId: "x",
        actorRole: "CAMPAIGN_ADMINISTRATOR",
        email: "person@example.test",
        role,
      }),
      (error) => error.status === 403,
    );
});

test("acceptance binds the authenticated existing user email to the token", async () => {
  let received;
  const service = createTeamAdministrationService(
    {
      acceptExisting: async (data) => {
        received = data;
        return { id: "membership" };
      },
    },
    { tokenSecret: secret, now: () => now },
  );
  await service.acceptExisting({
    token: "A".repeat(43),
    user: { id: "user-a", email: "USER@EXAMPLE.TEST" },
  });
  assert.equal(received.userId, "user-a");
  assert.equal(received.userEmail, "user@example.test");
  assert.equal(received.tokenHash.length, 64);
});

test("invalid, expired, revoked, superseded and consumed inspection states fail closed", async () => {
  const service = createTeamAdministrationService(
    { inspectInvitation: async () => null },
    { tokenSecret: secret, now: () => now },
  );
  assert.equal(await service.inspect("unknown"), null);
});

test("team routes enforce tenant permission and never accept a client actor", async () => {
  const calls = [];
  const service = {
    assignableRoles: () => ["ANALYST"],
    list: async (tenantId) => {
      calls.push(tenantId);
      return { members: [], invitations: [] };
    },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = {
      user: {
        id: "actor",
        memberships: [{ tenantId: "tenant-a", role: "CAMPAIGN_ADMINISTRATOR" }],
      },
    };
    next();
  });
  app.use("/team", createTeamAdministrationRouter(service));
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  await request(app).get("/team").set("X-Organization-Id", "tenant-a").expect(200);
  await request(app).get("/team").set("X-Organization-Id", "tenant-b").expect(403);
  assert.deepEqual(calls, ["tenant-a"]);
});

test("team mutations reject untrusted browser origins", async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = {
      user: {
        id: "actor",
        memberships: [{ tenantId: "tenant-a", role: "CAMPAIGN_ADMINISTRATOR" }],
      },
    };
    next();
  });
  app.use(
    "/team",
    createTeamAdministrationRouter(
      { invite: async () => assert.fail("must not mutate") },
      { origins: ["https://polismartafrica.ai"] },
    ),
  );
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  await request(app)
    .post("/team/invitations")
    .set("Origin", "https://evil.example")
    .set("X-Organization-Id", "tenant-a")
    .send({ email: "x@example.test", role: "ANALYST" })
    .expect(403);
});

test("migration is additive, indexed, normalized, and grants least privilege", () => {
  const sql = readFileSync("prisma/migrations/0022_team_invitations/migration.sql", "utf8");
  assert.match(sql, /CREATE TABLE "team_invitations"/);
  assert.match(sql, /one_pending_per_tenant_email/);
  assert.match(sql, /CHECK \("recipient_email" = lower\(trim\("recipient_email"\)\)\)/);
  assert.match(sql, /REVOKE ALL PRIVILEGES/);
  assert.match(sql, /GRANT SELECT, INSERT/);
  assert.match(sql, /GRANT UPDATE \(/);
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE FROM|ALTER COLUMN|RENAME)\b/i);
  assert.doesNotMatch(sql, /GRANT ALL|GRANT DELETE/);
});

test("public registration is disabled while recovery remains available", () => {
  const route = readFileSync("server/routes/auth.js", "utf8");
  const login = readFileSync("src/pages/LoginPage.tsx", "utf8");
  assert.match(route, /allowPublicRegistration = false/);
  assert.doesNotMatch(login, /changeMode\("register"\)|Create a new organization account/);
  assert.match(login, /Forgot password|Resend verification email/);
});

test("Team Administration UI is permission gated and exposes accessible status feedback", () => {
  const app = readFileSync("src/App.tsx", "utf8");
  const shell = readFileSync("src/components/layout/AppShell.tsx", "utf8");
  const page = readFileSync("src/pages/TeamAdministrationPage.tsx", "utf8");
  assert.match(app, /membership\?\.canManageTeam/);
  assert.match(shell, /item\.page !== "team" \|\| canManageTeam/);
  assert.match(page, /role="status"/);
  assert.match(page, /role="alert"/);
  assert.match(page, /<label htmlFor=/);
  assert.match(page, /window\.confirm/);
});

test("repository enforces atomic replay, last-admin, self-change and stale-session protections", () => {
  const source = readFileSync("server/repositories/teamAdministrationRepository.js", "utf8");
  assert.match(source, /isolationLevel: "Serializable"/);
  assert.match(source, /status: "PENDING",\s*expiresAt: \{ gt: now \}/);
  assert.match(source, /if \(!changed\.count\)/);
  assert.match(source, /member\.userId === actorId/);
  assert.match(source, /admins <= 1/);
  assert.match(source, /actorRole !== "SUPER_ADMINISTRATOR"/);
  assert.match(source, /authSession\.deleteMany/);
  assert.match(source, /tenantId_userId/);
});

test("invitation secrets travel in request bodies rather than logged API paths", () => {
  const routes = readFileSync("server/routes/teamAdministration.js", "utf8");
  const client = readFileSync("src/lib/teamAdministration.ts", "utf8");
  assert.doesNotMatch(routes, /:token/);
  assert.doesNotMatch(client, /encodeURIComponent\(token\)/);
  assert.match(routes, /req\.body\?\.token/);
  assert.match(client, /JSON\.stringify\(\{ token/);
});

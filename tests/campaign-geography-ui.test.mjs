import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";
import { createAuthRouter } from "../server/routes/auth.js";

const read = (path) => readFileSync(path, "utf8");

test("authenticated membership exposes Campaign Geography capabilities from accepted policy", async () => {
  for (const [role, allowed] of [
    ["CAMPAIGN_ADMINISTRATOR", true],
    ["SUPER_ADMINISTRATOR", true],
    ["CAMPAIGN_MANAGER", false],
    ["ANALYST", false],
  ]) {
    const app = express();
    app.use((req, _res, next) => {
      req.auth = {
        user: {
          id: "user",
          email: "user@example.test",
          displayName: "User",
          emailVerifiedAt: new Date(),
          memberships: [{ tenantId: "tenant", role, organization: { id: "tenant", name: "Org", country: "NG", isDemo: false } }],
        },
      };
      next();
    });
    app.use("/auth", createAuthRouter({ authService: {}, config: {} }));
    const response = await request(app).get("/auth/me").expect(200);
    assert.equal(response.body.user.memberships[0].canViewCampaignGeography, allowed);
    assert.equal(response.body.user.memberships[0].canManageCampaignGeography, allowed);
  }
});

test("Campaign Geography UI consumes only accepted 3A endpoints and trusted tenant context", () => {
  const api = read("src/lib/campaignGeography.ts");
  assert.match(api, /X-Organization-Id/);
  assert.match(api, /\/api\/campaign-geography\/\$\{campaignId\}\/hierarchy/);
  assert.match(api, /\/api\/campaign-geography\/\$\{campaignId\}\/assignments/);
  assert.match(api, /assignments\/deactivate/);
  assert.doesNotMatch(api, /actorId|createdById|master-geography.*(?:create|update|delete)/i);
});

test("Campaign Geography navigation and mutation controls are capability gated", () => {
  const app = read("src/App.tsx");
  const shell = read("src/components/layout/AppShell.tsx");
  const page = read("src/pages/CampaignGeographyPage.tsx");
  assert.match(app, /membership\?\.canViewCampaignGeography/);
  assert.match(shell, /item\.page !== "campaign-geography" \|\| canViewCampaignGeography/);
  assert.match(page, /canManage && \(/);
  assert.match(page, /if \(!canManage \|\| mutatingId\) return/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /missing ancestors up to Country/);
  assert.match(page, /assigned descendants cannot be/);
});

test("Campaign Geography UI includes keyboard and assistive-technology states", () => {
  const page = read("src/pages/CampaignGeographyPage.tsx");
  assert.match(page, /role="search"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /role="alert"/);
  assert.match(page, /aria-busy=\{loading\}/);
  assert.match(page, /aria-current=/);
  assert.match(page, /<button/g);
});

test("Campaign Geography ignores stale hierarchy responses and freezes view changes during mutations", () => {
  const page = read("src/pages/CampaignGeographyPage.tsx");
  assert.match(page, /const requestId = \+\+hierarchyRequest\.current/);
  assert.ok((page.match(/requestId === hierarchyRequest\.current/g) ?? []).length >= 3);
  assert.ok((page.match(/disabled=\{Boolean\(mutatingId\)\}/g) ?? []).length >= 5);
  assert.match(page, /loading \|\| Boolean\(mutatingId\)/);
});

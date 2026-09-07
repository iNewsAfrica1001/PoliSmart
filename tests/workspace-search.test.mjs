import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";
import { createWorkspaceSearchRepository } from "../server/repositories/workspaceSearchRepository.js";
import { createWorkspaceSearchRouter } from "../server/routes/workspaceSearch.js";

const models = [
  "campaign",
  "knowledgeDocument",
  "campaignEvent",
  "volunteer",
  "mediaItem",
  "campaignTask",
  "policyCase",
  "communication",
  "fundraisingGoal",
];

function databaseWith(results = {}) {
  const calls = [];
  const database = Object.fromEntries(
    models.map((model) => [
      model,
      {
        findMany: async (query) => {
          calls.push({ model, query });
          return results[model] || [];
        },
      },
    ]),
  );
  return { database, calls };
}

function appFor(repository, memberships = null) {
  const app = express();
  app.use((req, _res, next) => {
    req.auth = memberships ? { user: { id: "user-a", memberships } } : null;
    next();
  });
  app.use("/search", createWorkspaceSearchRouter(repository));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ message: error.message }));
  return app;
}

test("workspace search requires authentication, tenant membership, and a meaningful query", async () => {
  const { database, calls } = databaseWith();
  await request(appFor(createWorkspaceSearchRepository(database)))
    .get("/search?q=campaign")
    .set("X-Organization-Id", "org-a")
    .expect(401);
  await request(appFor(createWorkspaceSearchRepository(database), []))
    .get("/search?q=campaign")
    .set("X-Organization-Id", "foreign-org")
    .expect(403);
  assert.equal(calls.length, 0);

  await request(
    appFor(createWorkspaceSearchRepository(database), [
      { tenantId: "org-a", role: "CAMPAIGN_ADMINISTRATOR" },
    ]),
  )
    .get("/search?q=ab")
    .set("X-Organization-Id", "org-a")
    .expect(400);
  assert.equal(calls.length, 0);
});

test("workspace search scopes every query and exposes only approved ready knowledge metadata", async () => {
  const { database, calls } = databaseWith({
    campaign: [{ id: "campaign-a", name: "Forward Together", country: "Ghana", status: "ACTIVE" }],
    knowledgeDocument: [{ id: "doc-a", campaignId: "campaign-a", title: "Policy brief", category: "POLICY" }],
    campaignEvent: [{ id: "event-a", campaignId: "campaign-a", title: "Town hall", status: "PLANNED" }],
  });
  const response = await request(
    appFor(createWorkspaceSearchRepository(database), [
      { tenantId: "org-a", role: "CAMPAIGN_ADMINISTRATOR" },
    ]),
  )
    .get("/search?q=policy")
    .set("X-Organization-Id", "org-a")
    .expect(200);

  assert.ok(response.body.results.some((item) => item.type === "KNOWLEDGE"));
  assert.ok(response.body.results.every((item) => !(`email` in item) && !(`content` in item)));
  assert.ok(calls.every(({ query }) => query.where.tenantId === "org-a"));
  const knowledge = calls.find(({ model }) => model === "knowledgeDocument").query;
  assert.equal(knowledge.where.approvalStatus, "APPROVED");
  assert.equal(knowledge.where.processingStatus, "READY");
  assert.deepEqual(Object.keys(knowledge.select).sort(), ["campaignId", "category", "id", "title"]);
});

test("workspace search omits resources unavailable to the caller role", async () => {
  const { database, calls } = databaseWith();
  await request(
    appFor(createWorkspaceSearchRepository(database), [
      { tenantId: "org-a", role: "VOLUNTEER" },
    ]),
  )
    .get("/search?q=policy")
    .set("X-Organization-Id", "org-a")
    .expect(200);
  assert.equal(calls.some(({ model }) => model === "knowledgeDocument"), false);
  assert.equal(calls.some(({ model }) => model === "mediaItem"), false);
});

test("workspace search UI is debounced, accessible, non-AI, and preserves public routes", () => {
  const component = readFileSync("src/components/layout/WorkspaceSearch.tsx", "utf8");
  const client = readFileSync("src/lib/workspaceSearch.ts", "utf8");
  const shell = readFileSync("src/components/layout/AppShell.tsx", "utf8");
  const app = readFileSync("src/App.tsx", "utf8");
  assert.match(component, /setTimeout\(\(\) =>/);
  assert.match(component, /300/);
  assert.match(component, /role="listbox"/);
  assert.match(component, /ArrowDown/);
  assert.match(component, /No authorized results found/);
  assert.match(component, /Search is temporarily unavailable/);
  assert.match(client, /\/api\/search\?q=/);
  assert.doesNotMatch(component + client, /OpenAI|\/api\/ai|conversation|embedding/i);
  assert.match(shell, /<WorkspaceSearch/);
  assert.match(app, /currentUrl\.pathname === "\/"/);
  assert.match(app, /LoginPage/);
});

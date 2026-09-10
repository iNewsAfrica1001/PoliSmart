import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import express from "express";
import request from "supertest";
import { createAuthRouter } from "../server/routes/auth.js";
import { createKnowledgeRouter } from "../server/routes/knowledge.js";

test("workflow capabilities follow existing policy and approval stays tenant protected", async () => {
  for (const [role, policy, communications, approval] of [
    ["CAMPAIGN_ADMINISTRATOR", false, false, true],
    ["POLICY_DIRECTOR", true, false, true],
    ["COMMUNICATIONS_DIRECTOR", false, true, true],
    ["SUPER_ADMINISTRATOR", true, true, true],
    ["ANALYST", false, false, false],
    ["UNKNOWN", false, false, false],
  ]) {
    let calls = 0;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.auth = { user: { memberships: [{ tenantId: "org-a", role, organization: {} }] } };
      next();
    });
    app.use("/auth", createAuthRouter({ authService: {}, config: {} }));
    app.use(
      "/knowledge",
      createKnowledgeRouter({
        repository: {
          updateApproval: async (tenant, id, status) => {
            assert.equal(tenant, "org-a");
            assert.equal(id, "doc");
            assert.equal(status, "APPROVED");
            calls++;
            return { count: 1 };
          },
        },
        service: {},
      }),
    );
    app.use((error, _req, res, _next) => res.status(error.status || 500).end());
    const result = await request(app).get("/auth/me").expect(200);
    const member = result.body.user.memberships[0];
    assert.equal(member.canManagePolicy, policy);
    assert.equal(member.canManageCommunications, communications);
    assert.equal(member.canApproveKnowledge, approval);
    await request(app)
      .patch("/knowledge/doc/approval")
      .set("X-Organization-Id", "org-a")
      .send({ approvalStatus: "APPROVED" })
      .expect(approval ? 200 : 403);
    assert.equal(calls, approval ? 1 : 0);
    calls = 0;
    await request(app)
      .patch("/knowledge/doc/approval")
      .set("X-Organization-Id", "foreign")
      .send({ approvalStatus: "APPROVED" })
      .expect(403);
    assert.equal(calls, 0);
  }
});

test("workflow UI gates every management entry point while retaining reads", () => {
  const source = readFileSync("src/pages/IntelligenceWorkflowsPage.tsx", "utf8").replace(
    /\s+/g,
    " ",
  );
  assert.equal((source.match(/canManage && \( <CreateCard/g) || []).length, 2);
  assert.match(source, /canManage && nextPolicy/);
  assert.match(source, /canManage && nextCommunication/);
  assert.match(source, /canManage && \["EVIDENCE", "RESEARCH"\]/);
  assert.match(source, /canManage && item.status === "OPTIONS"/);
  assert.match(source, /canManage && \["DRAFT", "AI_ASSISTED"/);
  assert.match(source, /workflowApi.policies\(tenant, campaign\)/);
  assert.match(source, /workflowApi.communications\(tenant, campaign\)/);
  assert.equal((source.match(/if \(!canManage\) return;/g) || []).length, 2);
});

test("media and communications empty and access states explain V1.1 behavior", () => {
  const source = readFileSync("src/pages/IntelligenceWorkflowsPage.tsx", "utf8").replace(
    /\s+/g,
    " ",
  );
  assert.match(
    source,
    /No media records are available yet\. Media records are added through authorized, lawfully configured integrations\. Manual media uploads are not available\./,
  );
  assert.match(
    source,
    /You have view-only access\. Communications Directors and Super Administrators can create and manage communication work items\./,
  );

  const mediaSection = source.slice(
    source.indexOf('{module === "media"'),
    source.indexOf('{module === "communications"'),
  );
  assert.doesNotMatch(mediaSection, /<button[^>]*>[^<]*(?:Upload|Create Media)/i);
  assert.doesNotMatch(mediaSection, /type="file"/i);
  assert.match(source, /canManage && \( <CreateCard/);
});

test("knowledge approval is explicit, capability guarded, and not part of upload", () => {
  const source = readFileSync("src/pages/KnowledgePage.tsx", "utf8").replace(/\s+/g, " ");
  assert.match(source, /canApproveKnowledge === true/);
  assert.match(source, /canApprove && document.processingStatus === "READY"/);
  assert.match(source, /window.confirm/);
  assert.match(source, /Awaiting approval before this document can be used by AI Assistant/);
  assert.match(source, /READY does not mean APPROVED/);
  assert.match(source, /Document approval is available to authorized administrators/);
  const upload = source.slice(source.indexOf("async function upload"), source.indexOf("return ("));
  assert.doesNotMatch(upload, /knowledgeApi.approve/);
});

function knowledgeApprovalHarness(confirmApproval, canApprove = true) {
  const source = readFileSync("src/pages/KnowledgePage.tsx", "utf8");
  const start = source.indexOf("onClick={async () => {") + "onClick={".length;
  const end = source.indexOf("\n                        }}", start) + "\n                        }".length;
  assert.ok(start > 0 && end > start);

  const calls = [];
  const context = {
    canApprove,
    approving: false,
    tenantId: "fixture-tenant",
    document: { id: "fixture-document", title: "Fictional document" },
    window: { confirm: () => { calls.push("confirm"); return confirmApproval; } },
    setApproving: (value) => { context.approving = value; },
    setError: () => {},
    setNotice: () => {},
    knowledgeApi: { approve: async () => { calls.push("request"); } },
    load: async () => { calls.push("reload"); },
  };
  return {
    calls,
    handler: vm.runInNewContext(`(${source.slice(start, end)})`, context),
  };
}

test("cancelled knowledge approval confirmation never requests approval", async () => {
  const harness = knowledgeApprovalHarness(false);
  await harness.handler();
  assert.deepEqual(harness.calls, ["confirm"]);
});

test("confirmed knowledge approval submits once while the request is in flight", async () => {
  const harness = knowledgeApprovalHarness(true);
  await Promise.all([harness.handler(), harness.handler()]);
  assert.deepEqual(harness.calls, ["confirm", "request", "reload"]);
});

test("users without approval capability cannot confirm or request approval", async () => {
  const harness = knowledgeApprovalHarness(true, false);
  await harness.handler();
  assert.deepEqual(harness.calls, []);
});

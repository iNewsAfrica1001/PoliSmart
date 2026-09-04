import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("knowledge approval is explicit, capability guarded, and not part of upload", () => {
  const source = readFileSync("src/pages/KnowledgePage.tsx", "utf8").replace(/\s+/g, " ");
  assert.match(source, /canApproveKnowledge === true/);
  assert.match(source, /canApprove && document.processingStatus === "READY"/);
  assert.match(source, /window.confirm/);
  assert.match(source, /Awaiting approval before this document can be used by AI Assistant/);
  const upload = source.slice(source.indexOf("async function upload"), source.indexOf("return ("));
  assert.doesNotMatch(upload, /knowledgeApi.approve/);
});

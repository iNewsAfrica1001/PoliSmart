import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_DRAFT_DISCLAIMER,
  createIntelligenceWorkflowService,
  createLawfulMediaConnector,
} from "../server/services/intelligenceWorkflows.js";
import { createIntelligenceWorkflowRepository } from "../server/repositories/intelligenceWorkflowRepository.js";

test("policy workflow requires evidence, research and ordered human approval", async () => {
  let item = { id: "policy", status: "EVIDENCE", evidence: [], options: [], revisions: [] };
  const statuses = [];
  const repo = {
    findPolicy: async () => item,
    updatePolicyStatus: async (_t, _c, _i, status) => {
      statuses.push(status);
      item = { ...item, status };
    },
    addPolicyApproval: async () => ({}),
  };
  const service = createIntelligenceWorkflowService(repo);
  await assert.rejects(
    () =>
      service.movePolicy({
        tenantId: "t",
        campaignId: "c",
        id: "policy",
        next: "RESEARCH",
        actorId: "u",
      }),
    /Evidence is required/,
  );
  item.evidence = [{ evidenceType: "EVIDENCE" }];
  await service.movePolicy({
    tenantId: "t",
    campaignId: "c",
    id: "policy",
    next: "RESEARCH",
    actorId: "u",
  });
  await assert.rejects(
    () =>
      service.movePolicy({
        tenantId: "t",
        campaignId: "c",
        id: "policy",
        next: "OPTIONS",
        actorId: "u",
      }),
    /Research evidence is required/,
  );
  item.evidence.push({ evidenceType: "RESEARCH" });
  await service.movePolicy({
    tenantId: "t",
    campaignId: "c",
    id: "policy",
    next: "OPTIONS",
    actorId: "u",
  });
  assert.deepEqual(statuses, ["RESEARCH", "OPTIONS"]);
});

test("AI policy revisions carry the mandatory human-review disclaimer", async () => {
  let revision;
  const repo = {
    findPolicy: async () => ({
      status: "OPTIONS",
      problem: "Access",
      evidence: [{ title: "Study", source: "Public report", summary: "Finding" }],
      options: [{ title: "Option", description: "Action", tradeoffs: "Cost" }],
    }),
    addPolicyRevision: async (data) => {
      revision = data;
      return { id: "revision", ...data };
    },
    updatePolicyStatus: async () => ({ count: 1 }),
  };
  const service = createIntelligenceWorkflowService(repo);
  await service.aiPolicyDraft({
    tenantId: "tenant",
    campaignId: "campaign",
    id: "policy",
    actorId: "user",
    provider: { generateDraft: async () => "Draft content" },
  });
  assert.equal(revision.isAiGenerated, true);
  assert.equal(revision.disclaimer, AI_DRAFT_DISCLAIMER);
  assert.equal(revision.content, "Draft content");
});

test("compliance-required communication cannot bypass compliance review", async () => {
  const item = { status: "HUMAN_REVIEW", complianceRequired: true };
  const repo = {
    findCommunication: async () => item,
    addCommunicationApproval: async () => assert.fail("approval must not be recorded"),
    updateCommunicationStatus: async () => ({ count: 1 }),
  };
  const service = createIntelligenceWorkflowService(repo);
  await assert.rejects(
    () =>
      service.moveCommunication({
        tenantId: "tenant",
        campaignId: "campaign",
        id: "message",
        next: "APPROVED",
        actorId: "reviewer",
      }),
    /Compliance review is required/,
  );
});

test("communication AI assistance creates a revision but cannot approve or publish", async () => {
  const calls = [];
  const repo = {
    findCommunication: async () => ({
      status: "DRAFT",
      type: "SPEECH",
      revisions: [{ content: "Opening" }],
    }),
    addCommunicationRevision: async (data) => {
      calls.push(data);
      return data;
    },
    updateCommunicationStatus: async (...args) => calls.push(args),
  };
  const service = createIntelligenceWorkflowService(repo);
  await service.aiCommunicationDraft({
    tenantId: "tenant",
    campaignId: "campaign",
    id: "communication",
    actorId: "author",
    provider: { generateDraft: async () => "Assisted draft" },
  });
  assert.equal(calls[0].disclaimer, AI_DRAFT_DISCLAIMER);
  assert.equal(calls[0].isAiGenerated, true);
  assert.equal(calls[1].at(-1), "AI_ASSISTED");
  assert.notEqual(calls[1].at(-1), "APPROVED");
});

test("workflow repository scopes reads and updates by tenant and campaign", async () => {
  const captured = [];
  const db = {
    policyCase: {
      findFirst: async (query) => {
        captured.push(query.where);
        return null;
      },
    },
    communication: {
      updateMany: async (query) => {
        captured.push(query.where);
        return { count: 0 };
      },
    },
  };
  const repo = createIntelligenceWorkflowRepository(db);
  await repo.findPolicy("tenant-a", "campaign-a", "policy");
  await repo.updateCommunicationStatus("tenant-b", "campaign-b", "communication", "APPROVED");
  assert.deepEqual(captured[0], { id: "policy", tenantId: "tenant-a", campaignId: "campaign-a" });
  assert.deepEqual(captured[1], {
    id: "communication",
    tenantId: "tenant-b",
    campaignId: "campaign-b",
  });
});

test("lawful media connectors require HTTPS terms and normalize aggregate sentiment", async () => {
  assert.throws(
    () =>
      createLawfulMediaConnector({
        key: "news",
        termsUrl: "http://unsafe.test",
        fetchItems: async () => [],
      }),
    /lawful connector/,
  );
  const connector = createLawfulMediaConnector({
    key: "licensed-news",
    termsUrl: "https://provider.test/terms",
    fetchItems: async () => [{ headline: "Public report" }],
  });
  const items = await connector.collect({});
  assert.equal(items[0].integrationKey, "licensed-news");
  assert.equal(items[0].aggregateSentiment, "UNKNOWN");
});

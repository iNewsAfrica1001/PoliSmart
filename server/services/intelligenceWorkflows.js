export const AI_DRAFT_DISCLAIMER = "AI-generated draft — human review required.";
const POLICY_TRANSITIONS = {
  PROBLEM: ["EVIDENCE"],
  EVIDENCE: ["RESEARCH"],
  RESEARCH: ["OPTIONS"],
  OPTIONS: ["AI_DRAFT"],
  AI_DRAFT: ["HUMAN_REVIEW"],
  HUMAN_REVIEW: ["APPROVED", "REJECTED"],
  REJECTED: ["HUMAN_REVIEW"],
};
const COMM_TRANSITIONS = {
  DRAFT: ["AI_ASSISTED", "HUMAN_REVIEW"],
  AI_ASSISTED: ["HUMAN_REVIEW"],
  HUMAN_REVIEW: ["COMPLIANCE_REVIEW", "APPROVED", "REJECTED"],
  COMPLIANCE_REVIEW: ["APPROVED", "REJECTED"],
  REJECTED: ["HUMAN_REVIEW"],
};
function transition(current, next, map) {
  if (!map[current]?.includes(next))
    throw Object.assign(new Error(`Invalid workflow transition from ${current} to ${next}.`), {
      status: 409,
    });
}
export function createIntelligenceWorkflowService(repository, governance) {
  return {
    async movePolicy({ tenantId, campaignId, id, next, actorId, note }) {
      const item = await repository.findPolicy(tenantId, campaignId, id);
      if (!item) throw Object.assign(new Error("Policy case not found."), { status: 404 });
      transition(item.status, next, POLICY_TRANSITIONS);
      if (next === "RESEARCH" && !item.evidence.length)
        throw Object.assign(new Error("Evidence is required before research."), { status: 409 });
      if (
        next === "OPTIONS" &&
        !item.evidence.some((entry) => entry.evidenceType.toUpperCase() === "RESEARCH")
      )
        throw Object.assign(new Error("Research evidence is required before policy options."), {
          status: 409,
        });
      if (next === "APPROVED" || next === "REJECTED")
        await repository.addPolicyApproval({
          tenantId,
          policyCaseId: id,
          reviewerId: actorId,
          decision: next,
          note,
        });
      await repository.updatePolicyStatus(tenantId, campaignId, id, next);
      return next;
    },
    async aiPolicyDraft({ tenantId, campaignId, id, actorId, provider }) {
      const item = await repository.findPolicy(tenantId, campaignId, id);
      if (!item) throw Object.assign(new Error("Policy case not found."), { status: 404 });
      if (item.status !== "OPTIONS")
        throw Object.assign(new Error("Policy options must be completed before AI drafting."), {
          status: 409,
        });
      const sources = item.evidence
        .map((entry) => `${entry.title} — ${entry.source}: ${entry.summary}`)
        .join("\n");
      if (!sources)
        throw Object.assign(new Error("Approved evidence is required before AI drafting."), {
          status: 409,
        });
      const options = item.options
        .map((entry) => `${entry.title}: ${entry.description}; tradeoffs: ${entry.tradeoffs}`)
        .join("\n");
      const input = `Problem: ${item.problem}\nEvidence:\n${sources}\nOptions:\n${options}`;
      enforcePoliticalSafety(input);
      const template =
        "Draft a policy working paper using only supplied evidence and options. Do not invent statistics. This is not approved policy.";
      const content = await provider.generateDraft({ instructions: template, input });
      const revision = await repository.addPolicyRevision({
        tenantId,
        policyCaseId: id,
        authorId: actorId,
        content,
        isAiGenerated: true,
        disclaimer: AI_DRAFT_DISCLAIMER,
      });
      await repository.updatePolicyStatus(tenantId, campaignId, id, "AI_DRAFT");
      await governance?.logAi({
        tenantId,
        campaignId,
        actorId,
        input,
        provider: provider.name,
        model: provider.model,
        templateKey: "policy-draft",
        template,
        feature: "POLICY_DRAFT",
        generatedOutputReference: revision.id,
        approvalStatus: "PENDING",
        sourceGroundingMetadata: {
          policyCaseId: id,
          evidenceCount: item.evidence.length,
          optionCount: item.options.length,
        },
        safetyFlags: [],
      });
      return revision;
    },
    async moveCommunication({ tenantId, campaignId, id, next, actorId, note }) {
      const item = await repository.findCommunication(tenantId, campaignId, id);
      if (!item) throw Object.assign(new Error("Communication not found."), { status: 404 });
      transition(item.status, next, COMM_TRANSITIONS);
      if (next === "APPROVED" && item.complianceRequired && item.status !== "COMPLIANCE_REVIEW")
        throw Object.assign(new Error("Compliance review is required before approval."), {
          status: 409,
        });
      if (["APPROVED", "REJECTED"].includes(next))
        await repository.addCommunicationApproval({
          tenantId,
          communicationId: id,
          reviewerId: actorId,
          stage: item.status === "COMPLIANCE_REVIEW" ? "COMPLIANCE" : "HUMAN",
          decision: next,
          note,
        });
      await repository.updateCommunicationStatus(tenantId, campaignId, id, next);
      return next;
    },
    async aiCommunicationDraft({ tenantId, campaignId, id, actorId, provider }) {
      const item = await repository.findCommunication(tenantId, campaignId, id);
      if (!item) throw Object.assign(new Error("Communication not found."), { status: 404 });
      if (item.status !== "DRAFT")
        throw Object.assign(new Error("AI assistance is available only from draft state."), {
          status: 409,
        });
      const current = item.revisions[0]?.content || "";
      enforcePoliticalSafety(current);
      const template = `Assist with a broad campaign ${item.type.toLowerCase().replaceAll("_", " ")} draft. Do not target individuals, invent facts, or claim approval.`;
      const content = await provider.generateDraft({ instructions: template, input: current });
      const revision = await repository.addCommunicationRevision({
        tenantId,
        communicationId: id,
        authorId: actorId,
        content,
        isAiGenerated: true,
        disclaimer: AI_DRAFT_DISCLAIMER,
      });
      await repository.updateCommunicationStatus(tenantId, campaignId, id, "AI_ASSISTED");
      await governance?.logAi({
        tenantId,
        campaignId,
        actorId,
        input: current,
        provider: provider.name,
        model: provider.model,
        templateKey: "communication-draft",
        template,
        feature: "COMMUNICATION_DRAFT",
        generatedOutputReference: revision.id,
        approvalStatus: "PENDING",
        sourceGroundingMetadata: { communicationId: id, revision: item.revisions[0]?.version || 0 },
        safetyFlags: [],
      });
      return revision;
    },
  };
}

export function createLawfulMediaConnector({ key, fetchItems, termsUrl }) {
  if (!key || typeof fetchItems !== "function" || !termsUrl?.startsWith("https://"))
    throw new TypeError("A lawful connector requires a key, fetch function, and HTTPS terms URL.");
  return {
    key,
    termsUrl,
    async collect(input) {
      const items = await fetchItems(input);
      return items.map((item) => ({
        ...item,
        integrationKey: key,
        aggregateSentiment: item.aggregateSentiment || "UNKNOWN",
      }));
    },
  };
}
import { enforcePoliticalSafety } from "./governance.js";

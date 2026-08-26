import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { requireString } from "../services/validation.js";
const text = (body, key, max = 5000) => requireString(body, key, { min: 2, max });
const decisionNote = (body) => (body?.note ? text(body, "note", 1000) : null);
const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED", "UNKNOWN"];
function mediaDate(value) {
  const result = new Date(value);
  if (Number.isNaN(result.getTime()))
    throw Object.assign(new Error("publishedAt must be a valid date."), { status: 400 });
  return result;
}
function sourceUrl(value) {
  const result = text({ value }, "value", 1000);
  if (!result.startsWith("https://"))
    throw Object.assign(new Error("Media source URLs must use HTTPS."), { status: 400 });
  return result;
}
function sentiment(value) {
  const result = String(value || "UNKNOWN").toUpperCase();
  if (!SENTIMENTS.includes(result))
    throw Object.assign(new Error("aggregateSentiment is invalid."), { status: 400 });
  return result;
}

export function createIntelligenceWorkflowsRouter({ repository, service, provider, governance }) {
  const router = Router();
  router.use(requireSession);
  router.get(
    "/policy/:campaignId",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (req, res) =>
      res.json({ cases: await repository.listPolicies(req.tenant.id, req.params.campaignId) }),
    ),
  );
  router.post(
    "/policy/:campaignId",
    requireTenantPermission(PERMISSIONS.POLICY_MANAGE),
    asyncRoute(async (req, res) =>
      res.status(201).json({
        case: await repository.createPolicy({
          tenantId: req.tenant.id,
          campaignId: req.params.campaignId,
          createdById: req.auth.user.id,
          title: text(req.body, "title", 160),
          problem: text(req.body, "problem"),
        }),
      }),
    ),
  );
  router.post(
    "/policy/:campaignId/:id/evidence",
    requireTenantPermission(PERMISSIONS.POLICY_MANAGE),
    asyncRoute(async (req, res) => {
      if (!(await repository.findPolicy(req.tenant.id, req.params.campaignId, req.params.id)))
        throw Object.assign(new Error("Policy case not found."), { status: 404 });
      res.status(201).json({
        evidence: await repository.addEvidence({
          tenantId: req.tenant.id,
          policyCaseId: req.params.id,
          evidenceType: text(req.body, "evidenceType", 40),
          title: text(req.body, "title", 160),
          source: text(req.body, "source", 300),
          sourceUrl: req.body?.sourceUrl ? text(req.body, "sourceUrl", 1000) : null,
          summary: text(req.body, "summary"),
        }),
      });
    }),
  );
  router.post(
    "/policy/:campaignId/:id/options",
    requireTenantPermission(PERMISSIONS.POLICY_MANAGE),
    asyncRoute(async (req, res) => {
      if (!(await repository.findPolicy(req.tenant.id, req.params.campaignId, req.params.id)))
        throw Object.assign(new Error("Policy case not found."), { status: 404 });
      res.status(201).json({
        option: await repository.addOption({
          tenantId: req.tenant.id,
          policyCaseId: req.params.id,
          title: text(req.body, "title", 160),
          description: text(req.body, "description"),
          tradeoffs: text(req.body, "tradeoffs"),
        }),
      });
    }),
  );
  router.post(
    "/policy/:campaignId/:id/transition",
    requireTenantPermission(PERMISSIONS.POLICY_MANAGE),
    asyncRoute(async (req, res) => {
      const status = await service.movePolicy({
        tenantId: req.tenant.id,
        campaignId: req.params.campaignId,
        id: req.params.id,
        next: text(req.body, "status", 40).toUpperCase(),
        actorId: req.auth.user.id,
        note: decisionNote(req.body),
      });
      if (["APPROVED", "REJECTED"].includes(status))
        await governance?.audit({
          tenantId: req.tenant.id,
          actorId: req.auth.user.id,
          action: "POLICY_APPROVAL",
          entity: "policy_case",
          entityId: req.params.id,
          metadata: { status },
        });
      res.json({ status });
    }),
  );
  router.post(
    "/policy/:campaignId/:id/ai-draft",
    requireTenantPermission(PERMISSIONS.POLICY_MANAGE),
    asyncRoute(async (req, res) =>
      res.status(201).json({
        revision: await service.aiPolicyDraft({
          tenantId: req.tenant.id,
          campaignId: req.params.campaignId,
          id: req.params.id,
          actorId: req.auth.user.id,
          provider,
        }),
      }),
    ),
  );

  router.get(
    "/media/:campaignId",
    requireTenantPermission(PERMISSIONS.ANALYTICS_READ),
    asyncRoute(async (req, res) =>
      res.json({
        items: await repository.listMedia(req.tenant.id, req.params.campaignId, {
          topic: req.query.topic ? String(req.query.topic).slice(0, 120) : undefined,
          geography: req.query.geography ? String(req.query.geography).slice(0, 120) : undefined,
        }),
        lawfulIntegrationsOnly: true,
      }),
    ),
  );
  router.post(
    "/media/:campaignId/import",
    requireTenantPermission(PERMISSIONS.COMMUNICATIONS_MANAGE),
    asyncRoute(async (req, res) => {
      const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 100) : [];
      const saved = [];
      for (const item of items)
        saved.push(
          await repository.upsertMedia({
            tenantId: req.tenant.id,
            campaignId: req.params.campaignId,
            headline: text(item, "headline", 300),
            publisher: text(item, "publisher", 160),
            publishedAt: mediaDate(item.publishedAt),
            topic: text(item, "topic", 120),
            geography: text(item, "geography", 120),
            source: text(item, "source", 160),
            sourceUrl: sourceUrl(item.sourceUrl),
            summary: text(item, "summary", 3000),
            aggregateSentiment: sentiment(item.aggregateSentiment),
            integrationKey: text(item, "integrationKey", 80),
            externalId: text(item, "externalId", 200),
          }),
        );
      res.status(201).json({ imported: saved.length });
    }),
  );

  router.get(
    "/communications/:campaignId",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (req, res) =>
      res.json({
        communications: await repository.listCommunications(req.tenant.id, req.params.campaignId),
        autonomousPublishingEnabled: false,
      }),
    ),
  );
  router.post(
    "/communications/:campaignId",
    requireTenantPermission(PERMISSIONS.COMMUNICATIONS_MANAGE),
    asyncRoute(async (req, res) =>
      res.status(201).json({
        communication: await repository.createCommunication(
          {
            tenantId: req.tenant.id,
            campaignId: req.params.campaignId,
            createdById: req.auth.user.id,
            title: text(req.body, "title", 160),
            type: text(req.body, "type", 40).toUpperCase(),
            complianceRequired: req.body?.complianceRequired === true,
          },
          text(req.body, "content", 10000),
        ),
      }),
    ),
  );
  router.post(
    "/communications/:campaignId/:id/revisions",
    requireTenantPermission(PERMISSIONS.COMMUNICATIONS_MANAGE),
    asyncRoute(async (req, res) => {
      if (
        !(await repository.findCommunication(req.tenant.id, req.params.campaignId, req.params.id))
      )
        throw Object.assign(new Error("Communication not found."), { status: 404 });
      res.status(201).json({
        revision: await repository.addCommunicationRevision({
          tenantId: req.tenant.id,
          communicationId: req.params.id,
          authorId: req.auth.user.id,
          content: text(req.body, "content", 10000),
          isAiGenerated: false,
        }),
      });
    }),
  );
  router.post(
    "/communications/:campaignId/:id/ai-assist",
    requireTenantPermission(PERMISSIONS.COMMUNICATIONS_MANAGE),
    asyncRoute(async (req, res) =>
      res.status(201).json({
        revision: await service.aiCommunicationDraft({
          tenantId: req.tenant.id,
          campaignId: req.params.campaignId,
          id: req.params.id,
          actorId: req.auth.user.id,
          provider,
        }),
      }),
    ),
  );
  router.post(
    "/communications/:campaignId/:id/transition",
    requireTenantPermission(PERMISSIONS.COMMUNICATIONS_MANAGE),
    asyncRoute(async (req, res) => {
      const status = await service.moveCommunication({
        tenantId: req.tenant.id,
        campaignId: req.params.campaignId,
        id: req.params.id,
        next: text(req.body, "status", 40).toUpperCase(),
        actorId: req.auth.user.id,
        note: decisionNote(req.body),
      });
      if (["APPROVED", "REJECTED"].includes(status))
        await governance?.audit({
          tenantId: req.tenant.id,
          actorId: req.auth.user.id,
          action: "COMMUNICATIONS_APPROVAL",
          entity: "communication",
          entityId: req.params.id,
          metadata: { status },
        });
      res.json({ status });
    }),
  );
  return router;
}

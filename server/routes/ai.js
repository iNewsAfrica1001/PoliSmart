import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { requireString } from "../services/validation.js";
import { noRateLimit } from "../services/rateLimiting.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const rejectUnknown = (value, allowed, label) => {
  if (!value || Object.keys(value).some((key) => !allowed.has(key)))
    throw Object.assign(new Error(`Unknown ${label} field.`), { status: 400 });
};

export function createAiRouter({ service, rateLimiters = {} }) {
  const router = Router();
  router.use(
    requireSession,
    requireTenantPermission(PERMISSIONS.AI_ASSISTANT_USE),
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
  );
  router.post(
    "/chat",
    rateLimiters.user || noRateLimit,
    rateLimiters.organization || noRateLimit,
    asyncRoute(async (request, response) => {
      rejectUnknown(
        request.body,
        new Set(["question", "campaignId", "conversationId", "geographicAreaId"]),
        "AI chat",
      );
      const question = requireString(request.body, "question", { min: 3, max: 2000 });
      const campaignId = requireString(request.body, "campaignId", { min: 36, max: 36 });
      const conversationId = request.body?.conversationId
        ? requireString(request.body, "conversationId", { min: 36, max: 36 })
        : undefined;
      const geographicAreaId = request.body?.geographicAreaId
        ? requireString(request.body, "geographicAreaId", { min: 36, max: 36 })
        : undefined;
      if (geographicAreaId && !UUID.test(geographicAreaId))
        throw Object.assign(new Error("Geographic area identifier is invalid."), { status: 400 });
      response.set("Cache-Control", "private, no-store");
      response.json(
        await service.answer({
          tenantId: request.tenant.id,
          campaignId,
          userId: request.auth.user.id,
          question,
          conversationId,
          geographicAreaId,
        }),
      );
    }),
  );
  router.get(
    "/geography/:campaignId/options",
    asyncRoute(async (request, response) => {
      const allowed = new Set(["parentId"]);
      if (Object.keys(request.query).some((key) => !allowed.has(key)))
        throw Object.assign(new Error("Unknown geography query field."), { status: 400 });
      const campaignId = requireString(request.params, "campaignId", { min: 36, max: 36 });
      const parentId = request.query.parentId
        ? requireString(request.query, "parentId", { min: 36, max: 36 })
        : undefined;
      if (!UUID.test(campaignId) || (parentId && !UUID.test(parentId)))
        throw Object.assign(new Error("Geographic identifier is invalid."), { status: 400 });
      response.set("Cache-Control", "private, no-store");
      response.json(
        await service.geographyOptions({
          tenantId: request.tenant.id,
          campaignId,
          parentId,
        }),
      );
    }),
  );
  router.post(
    "/feedback",
    asyncRoute(async (request, response) => {
      const messageId = requireString(request.body, "messageId", { min: 36, max: 36 });
      const type = requireString(request.body, "type", { min: 6, max: 9 }).toUpperCase();
      if (!["HELPFUL", "INCORRECT", "REPORT"].includes(type))
        throw Object.assign(new Error("Feedback type is invalid."), { status: 400 });
      const note = request.body?.note
        ? requireString(request.body, "note", { min: 2, max: 1000 })
        : null;
      response.status(201).json({
        feedback: await service.feedback({
          tenantId: request.tenant.id,
          userId: request.auth.user.id,
          messageId,
          type,
          note,
        }),
      });
    }),
  );
  return router;
}

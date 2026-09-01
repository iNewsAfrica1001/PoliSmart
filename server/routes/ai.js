import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { requireString } from "../services/validation.js";
import { noRateLimit } from "../services/rateLimiting.js";

export function createAiRouter({ service, rateLimiters = {} }) {
  const router = Router();
  router.use(requireSession, requireTenantPermission(PERMISSIONS.AI_ASSISTANT_USE));
  router.post(
    "/chat",
    rateLimiters.user || noRateLimit,
    rateLimiters.organization || noRateLimit,
    asyncRoute(async (request, response) => {
      const question = requireString(request.body, "question", { min: 3, max: 2000 });
      const campaignId = requireString(request.body, "campaignId", { min: 36, max: 36 });
      const conversationId = request.body?.conversationId
        ? requireString(request.body, "conversationId", { min: 36, max: 36 })
        : undefined;
      response.json(
        await service.answer({
          tenantId: request.tenant.id,
          campaignId,
          userId: request.auth.user.id,
          question,
          conversationId,
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

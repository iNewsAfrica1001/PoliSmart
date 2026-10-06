import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";

export function createCampaignGeographyRouter(service) {
  const router = Router();
  router.use(requireSession);
  router.get(
    "/:campaignId/hierarchy",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_GEOGRAPHY_VIEW),
    asyncRoute(async (request, response) =>
      response.json(
        await service.hierarchy({
          tenantId: request.tenant.id,
          campaignId: request.params.campaignId,
          query: request.query,
        }),
      ),
    ),
  );
  router.get(
    "/:campaignId/assignments",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_GEOGRAPHY_VIEW),
    asyncRoute(async (request, response) =>
      response.json(
        await service.assignments({
          tenantId: request.tenant.id,
          campaignId: request.params.campaignId,
          query: request.query,
        }),
      ),
    ),
  );
  router.post(
    "/:campaignId/assignments",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) =>
      response.json(
        await service.assign({
          tenantId: request.tenant.id,
          campaignId: request.params.campaignId,
          actorId: request.auth.user.id,
          body: request.body,
        }),
      ),
    ),
  );
  router.post(
    "/:campaignId/assignments/deactivate",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) =>
      response.json(
        await service.deactivate({
          tenantId: request.tenant.id,
          campaignId: request.params.campaignId,
          actorId: request.auth.user.id,
          body: request.body,
        }),
      ),
    ),
  );
  return router;
}

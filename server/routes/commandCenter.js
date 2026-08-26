import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { buildCommandCenter } from "../services/commandCenter.js";

export function createCommandCenterRouter(repository) {
  const router = Router();
  router.use(requireSession, requireTenantPermission(PERMISSIONS.CAMPAIGN_READ));
  router.get(
    "/:campaignId",
    asyncRoute(async (request, response) => {
      const snapshot = await repository.snapshot({
        tenantId: request.tenant.id,
        campaignId: request.params.campaignId,
        country: request.query.country ? String(request.query.country).slice(0, 80) : undefined,
        geographicAreaId: request.query.geographicAreaId
          ? String(request.query.geographicAreaId)
          : undefined,
      });
      if (!snapshot) throw Object.assign(new Error("Campaign not found."), { status: 404 });
      response.setHeader("Cache-Control", "private, max-age=30");
      response.json({
        dashboard: buildCommandCenter(snapshot),
        geography: await repository.geography(request.tenant.id, request.params.campaignId),
      });
    }),
  );
  return router;
}

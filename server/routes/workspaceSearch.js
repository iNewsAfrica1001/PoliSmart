import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { hasPermission } from "../services/authorization.js";

export function createWorkspaceSearchRouter(repository) {
  const router = Router();
  router.get(
    "/",
    requireSession,
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (request, response) => {
      const query = String(request.query.q || "").trim();
      if (query.length < 3 || query.length > 80)
        throw Object.assign(new Error("Search requires 3 to 80 characters."), { status: 400 });
      const role = request.tenant.membership.role;
      const permitted = (permission) => hasPermission({ role }, permission);
      const results = await repository.search({
        tenantId: request.tenant.id,
        actorId: request.auth.user.id,
        query,
        permissions: {
          knowledge: permitted(PERMISSIONS.KNOWLEDGE_READ),
          volunteers: permitted(PERMISSIONS.CAMPAIGN_READ),
          media: permitted(PERMISSIONS.ANALYTICS_READ),
          policy: permitted(PERMISSIONS.CAMPAIGN_READ),
          communications: permitted(PERMISSIONS.CAMPAIGN_READ),
          fundraising: permitted(PERMISSIONS.FUNDRAISING_READ),
        },
      });
      response.json({ results });
    }),
  );
  return router;
}

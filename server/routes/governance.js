import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { PROHIBITED_AI_CAPABILITIES } from "../services/governance.js";
export function createGovernanceRouter(repository) {
  const router = Router();
  router.use(requireSession);
  router.get(
    "/",
    requireTenantPermission(PERMISSIONS.PLATFORM_AUDIT_READ),
    asyncRoute(async (req, res) =>
      res.json({
        immutable: true,
        prohibitedCapabilities: PROHIBITED_AI_CAPABILITIES,
        auditEvents: await repository.listAudit(req.tenant.id),
        aiUsage: await repository.listAiUsage(req.tenant.id),
        errorReports: await repository.listErrors(req.tenant.id),
      }),
    ),
  );
  return router;
}

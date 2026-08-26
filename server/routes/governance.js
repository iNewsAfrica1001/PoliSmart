import { Router } from "express";
import { PERMISSIONS, ROLES } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { PROHIBITED_AI_CAPABILITIES } from "../services/governance.js";
import { normalizeEmail } from "../services/authentication.js";
import { requireRoleAssignmentAuthorization } from "../services/authorization.js";
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
  router.patch(
    "/memberships/:id/role",
    requireTenantPermission(PERMISSIONS.ORGANIZATION_USERS_MANAGE),
    asyncRoute(async (req, res) => {
      const role = String(req.body?.role || "").toUpperCase();
      if (!Object.values(ROLES).includes(role))
        throw Object.assign(new Error("Role is invalid."), { status: 400 });
      const membership = await repository.findMembership(req.tenant.id, req.params.id);
      if (!membership) throw Object.assign(new Error("Membership not found."), { status: 404 });
      requireRoleAssignmentAuthorization({
        actorRole: req.tenant.membership.role,
        currentRole: membership.role,
        requestedRole: role,
      });
      const result = await repository.activateMembershipRole(req.tenant.id, req.params.id, role);
      if (!result.count) throw Object.assign(new Error("Membership not found."), { status: 404 });
      await repository.appendAudit({
        tenantId: req.tenant.id,
        actorId: req.auth.user.id,
        action: "PERMISSION_CHANGE",
        entity: "membership",
        entityId: req.params.id,
        metadata: { role },
      });
      res.json({ updated: true });
    }),
  );
  router.post(
    "/memberships/invite",
    requireTenantPermission(PERMISSIONS.ORGANIZATION_USERS_MANAGE),
    asyncRoute(async (req, res) => {
      const email = normalizeEmail(req.body?.email);
      const role = String(req.body?.role || "VOLUNTEER").toUpperCase();
      if (!/^\S+@\S+\.\S+$/.test(email))
        throw Object.assign(new Error("A valid email is required."), { status: 400 });
      if (!Object.values(ROLES).includes(role))
        throw Object.assign(new Error("Role is invalid."), { status: 400 });
      requireRoleAssignmentAuthorization({
        actorRole: req.tenant.membership.role,
        requestedRole: role,
      });
      const membership = await repository.inviteMembership(req.tenant.id, email, role);
      if (!membership)
        throw Object.assign(
          new Error("The invited user must register before organization membership is created."),
          { status: 409 },
        );
      await repository.appendAudit({
        tenantId: req.tenant.id,
        actorId: req.auth.user.id,
        action: "USER_INVITE",
        entity: "membership",
        entityId: membership.id,
        metadata: { role },
      });
      res.status(201).json({ membership });
    }),
  );
  return router;
}

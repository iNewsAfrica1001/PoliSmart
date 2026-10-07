import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { noRateLimit } from "../services/rateLimiting.js";

const noStore = (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
};
const mutationOrigin = (origins) => (req, _res, next) => {
  const origin = req.get("origin");
  if (origin && !origins.includes(origin))
    return next(Object.assign(new Error("Request origin is not authorized."), { status: 403 }));
  next();
};

export function createTeamAdministrationRouter(service, { origins = [], rateLimiters = {} } = {}) {
  const router = Router();
  const limited = (name) => rateLimiters[name] || noRateLimit;
  router.use(noStore);
  router.post(
    "/invitations/inspect",
    mutationOrigin(origins),
    limited("accept"),
    asyncRoute(async (req, res) => {
      const invitation = await service.inspect(req.body?.token);
      if (!invitation)
        throw Object.assign(new Error("Invitation is invalid or no longer available."), {
          status: 400,
        });
      res.json({ invitation });
    }),
  );
  router.post(
    "/invitations/accept-new",
    mutationOrigin(origins),
    limited("accept"),
    asyncRoute(async (req, res) => {
      await service.acceptNew({
        token: req.body?.token,
        displayName: req.body?.displayName,
        password: req.body?.password,
      });
      res.status(201).json({ accepted: true });
    }),
  );
  router.post(
    "/invitations/accept-existing",
    mutationOrigin(origins),
    limited("accept"),
    requireSession,
    asyncRoute(async (req, res) => {
      await service.acceptExisting({ token: req.body?.token, user: req.auth.user });
      res.json({ accepted: true });
    }),
  );
  router.use(requireSession, requireTenantPermission(PERMISSIONS.ORGANIZATION_USERS_MANAGE));
  router.get(
    "/",
    asyncRoute(async (req, res) =>
      res.json({
        ...(await service.list(req.tenant.id)),
        assignableRoles: service.assignableRoles(req.tenant.membership.role),
      }),
    ),
  );
  router.post(
    "/invitations",
    mutationOrigin(origins),
    limited("create"),
    asyncRoute(async (req, res) => {
      const result = await service.invite({
        tenantId: req.tenant.id,
        actorId: req.auth.user.id,
        actorRole: req.tenant.membership.role,
        email: req.body?.email,
        role: String(req.body?.role || "").toUpperCase(),
      });
      res.status(result.delivered ? 201 : 200).json(result);
    }),
  );
  router.post(
    "/invitations/:id/resend",
    mutationOrigin(origins),
    limited("resend"),
    asyncRoute(async (req, res) => {
      await service.resend({
        tenantId: req.tenant.id,
        actorId: req.auth.user.id,
        actorRole: req.tenant.membership.role,
        invitationId: req.params.id,
      });
      res.json({ resent: true });
    }),
  );
  router.post(
    "/invitations/:id/revoke",
    mutationOrigin(origins),
    asyncRoute(async (req, res) => {
      await service.revoke({
        tenantId: req.tenant.id,
        actorId: req.auth.user.id,
        invitationId: req.params.id,
      });
      res.json({ revoked: true });
    }),
  );
  router.patch(
    "/members/:id/role",
    mutationOrigin(origins),
    asyncRoute(async (req, res) => {
      await service.changeRole({
        tenantId: req.tenant.id,
        actorId: req.auth.user.id,
        actorRole: req.tenant.membership.role,
        membershipId: req.params.id,
        role: String(req.body?.role || "").toUpperCase(),
      });
      res.json({ updated: true });
    }),
  );
  router.post(
    "/members/:id/suspend",
    mutationOrigin(origins),
    asyncRoute(async (req, res) => {
      await service.suspend({
        tenantId: req.tenant.id,
        actorId: req.auth.user.id,
        actorRole: req.tenant.membership.role,
        membershipId: req.params.id,
      });
      res.json({ suspended: true });
    }),
  );
  router.post(
    "/members/:id/reactivate",
    mutationOrigin(origins),
    asyncRoute(async (req, res) => {
      await service.reactivate({
        tenantId: req.tenant.id,
        actorId: req.auth.user.id,
        actorRole: req.tenant.membership.role,
        membershipId: req.params.id,
      });
      res.json({ reactivated: true });
    }),
  );
  return router;
}

import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { requireString } from "../services/validation.js";
import { optionalDate } from "../services/operationsValidation.js";

export function createCampaignRouter(repository) {
  const router = Router();
  router.use(requireSession);
  router.get(
    "/",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (request, response) => {
      response.json({ campaigns: await repository.listForTenant(request.tenant.id) });
    }),
  );
  router.get(
    "/:id",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (request, response) => {
      const campaign = await repository.findForTenant(request.tenant.id, request.params.id);
      if (!campaign) throw Object.assign(new Error("Campaign not found."), { status: 404 });
      response.json({ campaign });
    }),
  );
  router.post(
    "/",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_MANAGE),
    asyncRoute(async (request, response) => {
      const name = requireString(request.body, "name", { min: 2, max: 120 });
      const slug = requireString(request.body, "slug", { min: 2, max: 80 }).toLowerCase();
      const country = requireString(request.body, "country", { min: 2, max: 80 });
      const electionType = requireString(request.body, "electionType", { min: 2, max: 80 });
      const startsAt = optionalDate(request.body?.startsAt, "startsAt");
      const endsAt = optionalDate(request.body?.endsAt, "endsAt");
      if (startsAt && endsAt && endsAt < startsAt)
        throw Object.assign(new Error("Campaign end date cannot precede its start date."), {
          status: 400,
        });
      const campaign = await repository.createForTenant(request.tenant.id, {
        name,
        slug,
        country,
        electionType,
        startsAt,
        endsAt,
      });
      response.status(201).json({ campaign });
    }),
  );
  router.patch(
    "/:id",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_MANAGE),
    asyncRoute(async (request, response) => {
      const allowed = Object.fromEntries(
        ["name", "country", "electionType", "status"]
          .filter((key) => request.body?.[key] != null)
          .map((key) => [key, String(request.body[key]).trim()]),
      );
      if (allowed.status && !["DRAFT", "ACTIVE", "ARCHIVED"].includes(allowed.status))
        throw Object.assign(new Error("Campaign status is invalid."), { status: 400 });
      if (request.body?.startsAt !== undefined)
        allowed.startsAt = optionalDate(request.body.startsAt, "startsAt") ?? null;
      if (request.body?.endsAt !== undefined)
        allowed.endsAt = optionalDate(request.body.endsAt, "endsAt") ?? null;
      const result = await repository.updateForTenant(
        request.tenant.id,
        request.params.id,
        allowed,
      );
      if (!result.count) throw Object.assign(new Error("Campaign not found."), { status: 404 });
      response.json({ updated: true });
    }),
  );
  return router;
}

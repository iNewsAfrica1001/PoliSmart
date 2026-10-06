import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { buildCommandCenter } from "../services/commandCenter.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const scalar = (value, name) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value) || typeof value === "object") throw fail(`${name} is invalid.`);
  return String(value).trim();
};
const normalizedCountry = (value) =>
  String(value || "")
    .trim()
    .toLocaleUpperCase("en-US");

export function createCommandCenterRouter(repository) {
  const router = Router();
  router.use(requireSession, requireTenantPermission(PERMISSIONS.CAMPAIGN_READ));
  router.get(
    "/:campaignId",
    asyncRoute(async (request, response) => {
      const allowed = new Set(["country", "geographicAreaId"]);
      if (Object.keys(request.query).some((key) => !allowed.has(key)))
        throw fail("Unknown command center query field.");
      const requestedCountry = scalar(request.query.country, "country");
      const geographicAreaId = scalar(request.query.geographicAreaId, "geographicAreaId");
      if (geographicAreaId && !UUID.test(geographicAreaId))
        throw fail("geographicAreaId is invalid.");
      const context = await repository.campaignContext(
        request.tenant.id,
        request.params.campaignId,
        geographicAreaId,
      );
      if (!context) throw Object.assign(new Error("Campaign not found."), { status: 404 });
      if (
        requestedCountry &&
        normalizedCountry(requestedCountry) !== normalizedCountry(context.campaign.country)
      )
        throw fail("country does not match the campaign.");
      if (geographicAreaId && !context.selectedGeography)
        throw fail("Selected geographic area is unavailable for this campaign.");
      const snapshot = await repository.snapshot({
        tenantId: request.tenant.id,
        campaignId: request.params.campaignId,
        country: context.campaign.country,
        geographicAreaId,
      });
      if (!snapshot) throw Object.assign(new Error("Campaign not found."), { status: 404 });
      response.setHeader("Cache-Control", "private, no-store");
      response.json({
        dashboard: buildCommandCenter(snapshot),
        geography: await repository.geography(
          request.tenant.id,
          request.params.campaignId,
          context.campaign.country,
        ),
      });
    }),
  );
  return router;
}

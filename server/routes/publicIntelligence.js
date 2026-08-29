import { Router } from "express";
import {
  AFROBAROMETER_INTELLIGENCE_CATEGORIES,
  AFROBAROMETER_MINIMUM_SAMPLE_SIZE,
} from "../config/afrobarometer.js";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";

export function createPublicIntelligenceRouter(repository) {
  const router = Router();
  router.use(requireSession, requireTenantPermission(PERMISSIONS.ANALYTICS_READ));
  router.get(
    "/afrobarometer",
    asyncRoute(async (request, response) => {
      const category = request.query.category
        ? String(request.query.category).toUpperCase()
        : undefined;
      if (category && !AFROBAROMETER_INTELLIGENCE_CATEGORIES.includes(category))
        throw Object.assign(new Error("category is invalid."), { status: 400 });
      const country = request.query.country ? String(request.query.country).trim() : undefined;
      const surveyRound = request.query.round ? String(request.query.round).trim() : undefined;
      let results;
      try {
        results = await repository.listAggregates({
          category,
          country,
          surveyRound,
          minimumSampleSize: AFROBAROMETER_MINIMUM_SAMPLE_SIZE,
        });
      } catch (error) {
        console.error("Public intelligence aggregate query failed.", {
          errorName: error?.name || "Error",
          errorCode: error?.code || null,
        });
        throw Object.assign(new Error("Public intelligence data is temporarily unavailable."), {
          status: 503,
        });
      }
      response.json({
        source: "Afrobarometer",
        aggregateOnly: true,
        minimumSampleSize: AFROBAROMETER_MINIMUM_SAMPLE_SIZE,
        results,
      });
    }),
  );
  router.get(
    "/afrobarometer/status",
    asyncRoute(async (_request, response) =>
      response.json({
        categories: AFROBAROMETER_INTELLIGENCE_CATEGORIES,
        latestImport: await repository.latestImport(),
        individualResponsesExposed: false,
      }),
    ),
  );
  return router;
}

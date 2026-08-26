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
      response.json({
        source: "Afrobarometer",
        aggregateOnly: true,
        minimumSampleSize: AFROBAROMETER_MINIMUM_SAMPLE_SIZE,
        results: await repository.listAggregates({
          category,
          minimumSampleSize: AFROBAROMETER_MINIMUM_SAMPLE_SIZE,
        }),
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

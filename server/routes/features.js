import { Router } from "express";
import { requireFeatureEnabled } from "../middleware/features.js";

export function createFeatureAvailabilityRouter(features) {
  const router = Router();
  router.get("/", (_request, response) => {
    response.json({
      features: {
        billing: features.billing === true,
        fundraising: features.fundraising === true,
      },
      access: "FREE_EARLY_ACCESS",
    });
  });
  return router;
}

export function createReservedBillingRouter(enabled = false) {
  const router = Router();
  router.use(requireFeatureEnabled("billing", enabled));
  router.use((_request, response) => {
    response.status(501).json({
      code: "FEATURE_NOT_IMPLEMENTED",
      feature: "billing",
      message: "Billing is not implemented.",
    });
  });
  return router;
}

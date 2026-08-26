import { Router } from "express";
import { scamSimulations } from "../data/catalog.js";
import { store } from "../data/store.js";
import { explainScam } from "../services/aiTutor.js";
import { requireArray, requireString } from "../services/validation.js";

export function createTrainingRouter() {
  const router = Router();

  router.get("/scams", (_request, response) => {
    response.json({ simulations: scamSimulations });
  });

  router.post("/scams/:simulationId/attempt", (request, response, next) => {
    try {
      const simulationId = requireString(request.params, "simulationId", { min: 3, max: 80 });
      const selectedFlags = requireArray(request.body, "selectedFlags");
      const simulation = scamSimulations.find((item) => item.id === simulationId);
      if (!simulation) {
        const error = new Error("Scam simulation not found.");
        error.status = 404;
        throw error;
      }
      const result = explainScam({ simulation, selectedFlags });
      const attempt = {
        id: `scam-attempt-${Date.now()}`,
        simulationId,
        learnerId: request.body?.learnerId || "student-demo",
        selectedFlags,
        createdAt: new Date().toISOString(),
        ...result,
      };
      store.submissions.unshift(attempt);
      response.status(201).json({ attempt });
    } catch (error) {
      next(error);
    }
  });

  router.post("/certificates/request", (request, response, next) => {
    try {
      const learnerId = requireString(request.body, "learnerId", { min: 3, max: 120 });
      const title = requireString(request.body, "title", { min: 3, max: 160 });
      const progress = Number(request.body?.progress || 0);
      const certificate = {
        id: `cert-${Date.now()}`,
        learnerId,
        title,
        progress,
        status: progress >= 90 ? "Pending approval" : "In progress",
        downloadUrl:
          progress >= 90
            ? `/api/training/certificates/${encodeURIComponent(learnerId)}/download`
            : null,
        requestedAt: new Date().toISOString(),
      };
      store.certificatesIssued.unshift(certificate);
      response.status(201).json({ certificate });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

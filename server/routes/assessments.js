import { Router } from "express";
import { assessments } from "../data/catalog.js";
import { store } from "../data/store.js";
import { gradeMultipleChoice } from "../services/grading.js";
import { requireArray, requireString } from "../services/validation.js";

export function createAssessmentRouter() {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json({ assessments });
  });

  router.post("/:assessmentId/grade", (request, response, next) => {
    try {
      const assessmentId = requireString(request.params, "assessmentId", { min: 3, max: 80 });
      const answers = requireArray(request.body, "answers");
      const result = gradeMultipleChoice({ assessmentId, answers });
      const submission = {
        id: `sub-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        learnerId: request.body?.learnerId || "student-demo",
        createdAt: new Date().toISOString(),
        ...result,
      };
      store.submissions.unshift(submission);
      response.status(201).json({ submission });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

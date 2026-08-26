import { Router } from "express";
import { store } from "../data/store.js";
import { requireString } from "../services/validation.js";

export function createClassroomRouter(io) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json(store.getCatalog());
  });

  router.post("/:classroomId/hand", (request, response, next) => {
    try {
      const classroomId = requireString(request.params, "classroomId", { min: 3, max: 80 });
      const learnerName = requireString(request.body, "learnerName", { min: 1, max: 80 });
      const reason = String(request.body?.reason || "Needs help").slice(0, 160);
      const item = {
        id: `hand-${Date.now()}`,
        classroomId,
        learnerName,
        reason,
        at: new Date().toISOString(),
        status: "waiting",
      };
      store.handQueue.push(item);
      io.to(`classroom:${classroomId}`).emit("hand:raised", item);
      response.status(201).json({ hand: item });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

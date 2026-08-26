import { Router } from "express";
import { store } from "../data/store.js";
import { requireString, validateRole } from "../services/validation.js";

export function createUserRouter() {
  const router = Router();

  router.get("/me", (_request, response) => {
    response.json({ user: store.users.get("candidate-demo") });
  });

  router.get("/", (_request, response) => {
    response.json({ users: Array.from(store.users.values()) });
  });

  router.post("/session", (request, response, next) => {
    try {
      const name = requireString(request.body, "name", { min: 1, max: 80 });
      const role = validateRole(request.body?.role);
      const session = {
        id: `sess-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        user: {
          id: `user-${Date.now()}`,
          name,
          role,
          email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@demo.africacampaign.ai`,
        },
        createdAt: new Date().toISOString(),
      };
      store.sessions.set(session.id, session);
      response.status(201).json({ session });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

import { Router } from "express";
import { asyncRoute } from "../middleware/http.js";
import { requireString } from "../services/validation.js";

export const EARLY_ACCESS_INTERESTS = Object.freeze([
  "POLITICAL_INTELLIGENCE",
  "CAMPAIGN_MANAGEMENT",
  "AI_ASSISTANT",
  "KNOWLEDGE_BASE",
  "POLICY_COMMUNICATIONS",
  "EVENTS_OPERATIONS",
  "OTHER",
]);

export const ORGANIZATION_TYPES = Object.freeze([
  "POLITICAL_CAMPAIGN",
  "POLITICAL_PARTY",
  "GOVERNANCE_ORGANIZATION",
  "PUBLIC_POLICY_ORGANIZATION",
  "RESEARCH_ORGANIZATION",
  "CONSULTING_ADVISORY",
  "NGO_CIVIL_SOCIETY",
  "OTHER",
]);

export const DEMO_TIMINGS = Object.freeze([
  "AS_SOON_AS_POSSIBLE",
  "WITHIN_1_WEEK",
  "WITHIN_2_WEEKS",
  "EXPLORING_FOR_LATER",
]);

const CONFIRMATIONS = Object.freeze({
  EARLY_ACCESS:
    "Thank you. Your early access request has been received. We will contact you as PoliSmart Africa AI expands its pre-launch program.",
  DEMO:
    "Thank you. Your demo request has been received. Our team will contact you to arrange the next step.",
});

function optionalString(body, field, max) {
  const value = String(body?.[field] ?? "").trim();
  if (value.length > max)
    throw Object.assign(new Error(`${field} must be no more than ${max} characters.`), {
      status: 400,
    });
  return value || null;
}

function choice(body, field, options) {
  const value = requireString(body, field, { min: 2, max: 80 });
  if (!options.includes(value))
    throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return value;
}

function validatedCommon(body) {
  const email = requireString(body, "email", { min: 5, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Object.assign(new Error("email must be valid."), { status: 400 });
  return {
    name: requireString(body, "name", { min: 2, max: 120 }),
    email,
    organization: requireString(body, "organization", { min: 2, max: 160 }),
    country: requireString(body, "country", { min: 2, max: 100 }),
    role: requireString(body, "role", { min: 2, max: 120 }),
    note: optionalString(body, "note", 500),
  };
}

function leadData(requestType, body) {
  const common = validatedCommon(body);
  if (requestType === "EARLY_ACCESS")
    return {
      requestType,
      ...common,
      interest: choice(body, "interest", EARLY_ACCESS_INTERESTS),
    };
  return {
    requestType,
    ...common,
    organizationType: choice(body, "organizationType", ORGANIZATION_TYPES),
    timing: choice(body, "timing", DEMO_TIMINGS),
  };
}

export function createPrelaunchRouter({ repository, notifications, rateLimiter }) {
  const router = Router();
  router.post(
    "/:requestType",
    rateLimiter,
    asyncRoute(async (request, response) => {
      const requestType = String(request.params.requestType || "").toUpperCase();
      if (!Object.hasOwn(CONFIRMATIONS, requestType))
        throw Object.assign(new Error("Request type is invalid."), { status: 404 });
      const lead = await repository.create(leadData(requestType, request.body));
      try {
        await notifications?.sendPrelaunchLeadNotification?.(lead);
      } catch {
        console.error(
          JSON.stringify({
            at: new Date().toISOString(),
            level: "error",
            event: "prelaunch-lead-notification-failed",
            requestType,
          }),
        );
      }
      response.status(202).json({ message: CONFIRMATIONS[requestType] });
    }),
  );
  return router;
}

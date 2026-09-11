import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireMembershipPermission, requireSession } from "../middleware/authentication.js";
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
const REVIEW_STATUSES = Object.freeze(["NEW", "CONTACTED", "QUALIFIED", "CLOSED"]);
const REQUEST_TYPES = Object.freeze(["EARLY_ACCESS", "DEMO"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function filterValue(value, allowed, field) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return undefined;
  if (!allowed.includes(normalized))
    throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return normalized;
}

export function createPrelaunchReviewRouter(repository) {
  const router = Router();
  router.use(requireSession, requireMembershipPermission(PERMISSIONS.PLATFORM_AUDIT_READ));
  router.get(
    "/",
    asyncRoute(async (request, response) => {
      const country = String(request.query.country || "").trim();
      if (country.length > 100)
        throw Object.assign(new Error("country is invalid."), { status: 400 });
      response.json({
        leads: await repository.list({
          requestType: filterValue(request.query.requestType, REQUEST_TYPES, "requestType"),
          status: filterValue(request.query.status, REVIEW_STATUSES, "status"),
          country: country || undefined,
        }),
      });
    }),
  );
  router.get(
    "/:id",
    asyncRoute(async (request, response) => {
      if (!UUID.test(request.params.id))
        throw Object.assign(new Error("Lead not found."), { status: 404 });
      const lead = await repository.findById(request.params.id);
      if (!lead) throw Object.assign(new Error("Lead not found."), { status: 404 });
      response.json({ lead });
    }),
  );
  router.patch(
    "/:id/status",
    asyncRoute(async (request, response) => {
      if (!UUID.test(request.params.id))
        throw Object.assign(new Error("Lead not found."), { status: 404 });
      const status = filterValue(request.body?.status, REVIEW_STATUSES, "status");
      if (!status) throw Object.assign(new Error("status is required."), { status: 400 });
      const lead = await repository.updateStatus(request.params.id, status);
      if (!lead) throw Object.assign(new Error("Lead not found."), { status: 404 });
      response.json({ lead });
    }),
  );
  return router;
}

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
const RFC_3339 =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;
// Permit only a small client/server clock skew around an otherwise future timestamp.
const FOLLOW_UP_CLOCK_SKEW_MS = 5_000;

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

function validateId(value) {
  if (!UUID.test(value)) throw Object.assign(new Error("Lead not found."), { status: 404 });
}

function requireExactFields(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw Object.assign(new Error("Request body is invalid."), { status: 400 });
  const unexpected = Object.keys(body).filter((field) => !allowed.includes(field));
  if (unexpected.length)
    throw Object.assign(new Error("Request contains unsupported fields."), { status: 400 });
}

function rfc3339Date(value) {
  const text = typeof value === "string" ? value : "";
  const match = RFC_3339.exec(text);
  if (!match) throw Object.assign(new Error("scheduledAt must be an RFC 3339 timestamp."), { status: 400 });
  const [, year, month, day, hour, minute, second, fraction = "", zone] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const nominal = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  const validCalendarDate =
    nominal.getUTCFullYear() === parts[0] &&
    nominal.getUTCMonth() === parts[1] - 1 &&
    nominal.getUTCDate() === parts[2] &&
    nominal.getUTCHours() === parts[3] &&
    nominal.getUTCMinutes() === parts[4] &&
    nominal.getUTCSeconds() === parts[5];
  const offsetValid =
    zone === "Z" || (Number(zone.slice(1, 3)) <= 23 && Number(zone.slice(4, 6)) <= 59);
  const date = new Date(text);
  if (!validCalendarDate || !offsetValid || Number.isNaN(date.getTime()) || fraction.length > 9)
    throw Object.assign(new Error("scheduledAt must be a real RFC 3339 date and time."), { status: 400 });
  return date;
}

export function createPrelaunchReviewRouter(repository, { now = () => new Date() } = {}) {
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
      validateId(request.params.id);
      const lead = await repository.findById(request.params.id);
      if (!lead) throw Object.assign(new Error("Lead not found."), { status: 404 });
      response.json({ lead });
    }),
  );
  router.patch(
    "/:id/status",
    asyncRoute(async (request, response) => {
      validateId(request.params.id);
      const status = filterValue(request.body?.status, REVIEW_STATUSES, "status");
      if (!status) throw Object.assign(new Error("status is required."), { status: 400 });
      const lead = await repository.updateStatus(request.params.id, status);
      if (!lead) throw Object.assign(new Error("Lead not found."), { status: 404 });
      response.json({ lead });
    }),
  );
  router.get(
    "/:leadId/follow-ups",
    asyncRoute(async (request, response) => {
      validateId(request.params.leadId);
      response.json({ followUps: await repository.listFollowUpsForLead(request.params.leadId) });
    }),
  );
  router.post(
    "/:leadId/follow-ups",
    asyncRoute(async (request, response) => {
      validateId(request.params.leadId);
      requireExactFields(request.body, ["note", "scheduledAt"]);
      const note = requireString(request.body, "note", { min: 1, max: 2000 });
      const scheduledAt = rfc3339Date(request.body.scheduledAt);
      if (scheduledAt.getTime() <= now().getTime() - FOLLOW_UP_CLOCK_SKEW_MS)
        throw Object.assign(new Error("scheduledAt must be in the future."), { status: 400 });
      response.status(201).json({
        followUp: await repository.createFollowUp({
          leadId: request.params.leadId,
          note,
          scheduledAt,
          createdById: request.auth.user.id,
        }),
      });
    }),
  );
  router.patch(
    "/:leadId/follow-ups/:followUpId/complete",
    asyncRoute(async (request, response) => {
      validateId(request.params.leadId);
      validateId(request.params.followUpId);
      requireExactFields(request.body ?? {}, []);
      const result = await repository.completeFollowUp(
        request.params.leadId,
        request.params.followUpId,
        request.auth.user.id,
      );
      if (result.outcome === "ALREADY_COMPLETED")
        throw Object.assign(new Error("Follow-up is already completed."), { status: 409 });
      if (result.outcome === "NOT_FOUND")
        throw Object.assign(new Error("Follow-up not found."), { status: 404 });
      response.json({ followUp: result.followUp });
    }),
  );
  return router;
}

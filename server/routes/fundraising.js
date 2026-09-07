import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { requireString } from "../services/validation.js";

const recordStatuses = new Set(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]);
const contributionStatuses = new Set(["PENDING", "CONFIRMED", "REVERSED"]);
const followUpStatuses = new Set(["OPEN", "COMPLETED", "CANCELLED"]);
const optionalText = (value, max) => value ? String(value).trim().slice(0, max) : undefined;
function requiredDate(value, field) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error(`${field} must be a valid date.`), { status: 400 });
  return date;
}
const optionalDate = (value, field) => value ? requiredDate(value, field) : undefined;
function amount(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0)
    throw Object.assign(new Error("amount must be a positive monetary amount."), { status: 400 });
  return normalized;
}
function currency(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized))
    throw Object.assign(new Error("currency must be a three-letter currency code."), { status: 400 });
  return normalized;
}
function oneOf(value, allowed, fallback, field = "status") {
  const normalized = String(value || fallback).toUpperCase();
  if (!allowed.has(normalized)) throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return normalized;
}
function dataFor(kind, body) {
  if (kind === "goals") return {
    title: requireString(body, "title", { min: 2, max: 160 }), targetAmount: amount(body?.targetAmount), currency: currency(body?.currency),
    startsAt: optionalDate(body?.startsAt, "startsAt"), endsAt: optionalDate(body?.endsAt, "endsAt"),
    status: oneOf(body?.status, recordStatuses, "PLANNED"),
  };
  if (kind === "contacts") {
    const email = optionalText(body?.email, 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw Object.assign(new Error("email must be valid."), { status: 400 });
    return {
    displayName: requireString(body, "displayName", { min: 2, max: 120 }),
    email, phone: optionalText(body?.phone, 40),
    affiliation: optionalText(body?.affiliation, 160), notes: optionalText(body?.notes, 1000),
    status: oneOf(body?.status, recordStatuses, "ACTIVE"),
  }; }
  if (kind === "contributions") return {
    contactId: optionalText(body?.contactId, 36), goalId: optionalText(body?.goalId, 36), amount: amount(body?.amount), currency: currency(body?.currency),
    contributedAt: requiredDate(body?.contributedAt, "contributedAt"),
    status: oneOf(body?.status, contributionStatuses, "PENDING"),
    externalReference: optionalText(body?.externalReference, 120), sourceMethod: optionalText(body?.sourceMethod, 100),
  };
  if (kind === "activities") return {
    title: requireString(body, "title", { min: 2, max: 160 }),
    activityType: requireString(body, "activityType", { min: 2, max: 80 }),
    occursAt: requiredDate(body?.occursAt, "occursAt"), status: oneOf(body?.status, recordStatuses, "PLANNED"),
  };
  if (kind === "followUps") return {
    contactId: optionalText(body?.contactId, 36), title: requireString(body, "title", { min: 2, max: 160 }),
    dueAt: requiredDate(body?.dueAt, "dueAt"), status: oneOf(body?.status, followUpStatuses, "OPEN"),
  };
  throw Object.assign(new Error("Unsupported fundraising record type."), { status: 404 });
}

export function createFundraisingRouter(repository) {
  const router = Router();
  router.use(requireSession);
  router.get("/:campaignId", requireTenantPermission(PERMISSIONS.FUNDRAISING_READ), asyncRoute(async (request, response) =>
    response.json(await repository.overview(request.tenant.id, request.params.campaignId))));
  router.get("/:campaignId/history", requireTenantPermission(PERMISSIONS.FUNDRAISING_HISTORY_READ), asyncRoute(async (request, response) =>
    response.json({ items: await repository.listHistory(request.tenant.id, request.params.campaignId) })));
  router.post("/:campaignId/:kind", requireTenantPermission(PERMISSIONS.FUNDRAISING_MANAGE), asyncRoute(async (request, response) =>
    response.status(201).json({ item: await repository.create(request.tenant.id, request.params.campaignId, request.auth.user.id, request.params.kind, dataFor(request.params.kind, request.body)) })));
  router.patch("/:campaignId/contributions/:id/status", requireTenantPermission(PERMISSIONS.FUNDRAISING_MANAGE), asyncRoute(async (request, response) =>
    response.json({ item: await repository.updateContributionStatus(request.tenant.id, request.params.campaignId, request.auth.user.id, request.params.id, oneOf(request.body?.status, contributionStatuses, "PENDING")) })));
  router.post("/:campaignId/:kind/:id/archive", requireTenantPermission(PERMISSIONS.FUNDRAISING_ARCHIVE), asyncRoute(async (request, response) => {
    if (!Object.hasOwn({ goals: 1, contacts: 1, contributions: 1, activities: 1, followUps: 1 }, request.params.kind))
      throw Object.assign(new Error("Unsupported fundraising record type."), { status: 404 });
    await repository.archive(request.tenant.id, request.params.campaignId, request.auth.user.id, request.params.kind, request.params.id);
    response.json({ archived: true });
  }));
  return router;
}

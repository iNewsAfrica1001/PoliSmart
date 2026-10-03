import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import {
  PRIVACY_REQUEST_TYPES,
  policyBlockedAction,
  privacySubjectKey,
  unresolvedAuthority,
  validatePrivacyCaseTransition,
  validateVerificationTransition,
} from "../services/privacyOperations.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CASE_STATUSES = [
  "RECEIVED",
  "IDENTITY_VERIFICATION_PENDING",
  "UNDER_REVIEW",
  "ACTION_PENDING",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];
const VERIFICATION_STATUSES = ["NOT_STARTED", "PENDING", "VERIFIED", "FAILED"];
const ACTIONS = ["DELETE", "ANONYMIZE", "RESTRICT"];

function text(body, field, max, required = true) {
  const value = typeof body?.[field] === "string" ? body[field].trim() : "";
  if ((required && !value) || value.length > max)
    throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return value || null;
}
function choice(body, field, allowed) {
  const value = text(body, field, 80);
  if (!allowed.includes(value))
    throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return value;
}
function date(body, field, required = true) {
  const value = text(body, field, 40, required);
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()))
    throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return parsed;
}
function id(value) {
  if (!UUID.test(String(value)))
    throw Object.assign(new Error("Record not found."), { status: 404 });
  return String(value);
}
function exactFields(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw Object.assign(new Error("Request body is invalid."), { status: 400 });
  if (Object.keys(body).some((field) => !allowed.includes(field)))
    throw Object.assign(new Error("Request contains unsupported fields."), { status: 400 });
}
async function scope(repository, tenantId, campaignId) {
  if (!UUID.test(campaignId) || (await repository.campaignInTenant(tenantId, campaignId)) !== 1)
    throw Object.assign(new Error("Campaign not found."), { status: 404 });
}

export function createPrivacyOperationsRouter(repository, { subjectHashSecret }) {
  const router = Router();
  router.use(requireSession, requireTenantPermission(PERMISSIONS.PRIVACY_OPERATIONS_MANAGE));
  router.use(
    "/:campaignId",
    asyncRoute(async (request, _response, next) => {
      await scope(repository, request.tenant.id, request.params.campaignId);
      next();
    }),
  );
  router.get(
    "/:campaignId/cases",
    asyncRoute(async (request, response) =>
      response.json({
        cases: await repository.listCases(request.tenant.id, request.params.campaignId),
      }),
    ),
  );
  router.post(
    "/:campaignId/cases",
    asyncRoute(async (request, response) => {
      exactFields(request.body, ["caseReference", "requestType", "receivedAt", "internalNotes"]);
      response.status(201).json({
        case: await repository.createCase(
          {
            tenantId: request.tenant.id,
            campaignId: request.params.campaignId,
            caseReference: text(request.body, "caseReference", 64),
            requestType: choice(request.body, "requestType", PRIVACY_REQUEST_TYPES),
            receivedAt: date(request.body, "receivedAt"),
            assignedOperatorId: request.auth.user.id,
            internalNotes: text(request.body, "internalNotes", 4000, false),
          },
          request.auth.user.id,
        ),
      });
    }),
  );
  router.patch(
    "/:campaignId/suppressions/:suppressionId",
    asyncRoute(async (request, response) => {
      unresolvedAuthority("Suppression change");
      const status = choice(request.body, "status", ["ACTIVE", "UNDER_REVIEW", "REVOKED"]);
      const suppression = await repository.updateSuppression(
        request.tenant.id,
        request.params.campaignId,
        id(request.params.suppressionId),
        status,
        text(request.body, "reviewReference", 160, false),
        request.auth.user.id,
      );
      if (!suppression)
        throw Object.assign(new Error("Suppression record not found."), { status: 404 });
      response.json({ suppression });
    }),
  );
  router.get(
    "/:campaignId/cases/:caseId",
    asyncRoute(async (request, response) => {
      const record = await repository.findCase(
        request.tenant.id,
        request.params.campaignId,
        id(request.params.caseId),
      );
      if (!record) throw Object.assign(new Error("Privacy case not found."), { status: 404 });
      response.json({ case: record });
    }),
  );
  router.patch(
    "/:campaignId/cases/:caseId",
    asyncRoute(async (request, response) => {
      exactFields(request.body, [
        "status",
        "identityVerificationStatus",
        "resolutionStatus",
        "internalNotes",
      ]);
      const data = {};
      if (request.body?.status !== undefined)
        data.status = choice(request.body, "status", CASE_STATUSES);
      if (request.body?.identityVerificationStatus !== undefined)
        data.identityVerificationStatus = choice(
          request.body,
          "identityVerificationStatus",
          VERIFICATION_STATUSES,
        );
      if (request.body?.resolutionStatus !== undefined)
        data.resolutionStatus = text(request.body, "resolutionStatus", 80, false);
      if (request.body?.internalNotes !== undefined)
        data.internalNotes = text(request.body, "internalNotes", 4000, false);
      if (data.status === "COMPLETED") data.completedAt = new Date();
      const current = await repository.findCase(
        request.tenant.id,
        request.params.campaignId,
        id(request.params.caseId),
      );
      if (!current) throw Object.assign(new Error("Privacy case not found."), { status: 404 });
      if (data.identityVerificationStatus)
        validateVerificationTransition(
          current.identityVerificationStatus,
          data.identityVerificationStatus,
        );
      if (data.status)
        validatePrivacyCaseTransition(
          current.status,
          data.status,
          data.identityVerificationStatus ?? current.identityVerificationStatus,
        );
      const record = await repository.updateCase(
        request.tenant.id,
        request.params.campaignId,
        id(request.params.caseId),
        {
          status: current.status,
          identityVerificationStatus: current.identityVerificationStatus,
        },
        data,
        request.auth.user.id,
      );
      if (!record)
        throw Object.assign(new Error("Privacy case changed. Refresh and try again."), {
          status: 409,
        });
      response.json({ case: record });
    }),
  );
  router.post(
    "/:campaignId/cases/:caseId/preview",
    asyncRoute(async (request, response) => {
      const action = choice(request.body, "action", ACTIONS);
      const preview = await repository.createPreview(
        request.tenant.id,
        request.params.campaignId,
        id(request.params.caseId),
        action,
        request.auth.user.id,
      );
      if (!preview) throw Object.assign(new Error("Privacy case not found."), { status: 404 });
      response.json({ preview });
    }),
  );
  router.post(
    "/:campaignId/legal-holds/:holdId/release",
    asyncRoute(async (request, response) => {
      unresolvedAuthority("Legal-hold release");
      const hold = await repository.releaseLegalHold(
        request.tenant.id,
        request.params.campaignId,
        id(request.params.holdId),
        text(request.body, "releaseAuthorization", 160),
        request.auth.user.id,
        new Date(),
      );
      if (!hold) throw Object.assign(new Error("Active legal hold not found."), { status: 404 });
      response.json({ legalHold: hold });
    }),
  );
  router.post(
    "/:campaignId/cases/:caseId/execute",
    asyncRoute(async (request) => {
      const action = choice(request.body, "action", ACTIONS);
      const preview = await repository.createPreview(
        request.tenant.id,
        request.params.campaignId,
        id(request.params.caseId),
        action,
        request.auth.user.id,
      );
      if (!preview) throw Object.assign(new Error("Privacy case not found."), { status: 404 });
      policyBlockedAction(action, request.body?.confirmation, preview);
    }),
  );
  router.get(
    "/:campaignId/suppressions",
    asyncRoute(async (request, response) =>
      response.json({
        suppressions: await repository.listSuppressions(
          request.tenant.id,
          request.params.campaignId,
        ),
      }),
    ),
  );
  router.post(
    "/:campaignId/suppressions",
    asyncRoute(async (request, response) => {
      unresolvedAuthority("Suppression creation");
      const caseId = id(request.body?.caseId);
      if (!(await repository.findCase(request.tenant.id, request.params.campaignId, caseId)))
        throw Object.assign(new Error("Privacy case not found."), { status: 404 });
      response.status(201).json({
        suppression: await repository.createSuppression(
          {
            tenantId: request.tenant.id,
            campaignId: request.params.campaignId,
            caseId,
            subjectKeyHash: privacySubjectKey(
              text(request.body, "subjectKey", 254),
              subjectHashSecret,
            ),
            channel: choice(request.body, "channel", ["EMAIL", "PHONE", "WHATSAPP", "ALL"]),
            reasonCategory: text(request.body, "reasonCategory", 80),
            effectiveAt: date(request.body, "effectiveAt"),
            reviewAt: date(request.body, "reviewAt", false),
            reviewReference: text(request.body, "reviewReference", 160, false),
            createdById: request.auth.user.id,
          },
          request.auth.user.id,
        ),
      });
    }),
  );
  router.get(
    "/:campaignId/legal-holds",
    asyncRoute(async (request, response) =>
      response.json({
        legalHolds: await repository.listLegalHolds(request.tenant.id, request.params.campaignId),
      }),
    ),
  );
  router.post(
    "/:campaignId/legal-holds",
    asyncRoute(async (request, response) => {
      unresolvedAuthority("Legal-hold issuance");
      const caseId = id(request.body?.caseId);
      if (!(await repository.findCase(request.tenant.id, request.params.campaignId, caseId)))
        throw Object.assign(new Error("Privacy case not found."), { status: 404 });
      response.status(201).json({
        legalHold: await repository.createLegalHold(
          {
            tenantId: request.tenant.id,
            campaignId: request.params.campaignId,
            caseId,
            holdReference: text(request.body, "holdReference", 80),
            authorizedIssuer: text(request.body, "authorizedIssuer", 160),
            scope: text(request.body, "scope", 500),
            reasonReference: text(request.body, "reasonReference", 160),
            effectiveAt: date(request.body, "effectiveAt"),
            reviewAt: date(request.body, "reviewAt", false),
            createdById: request.auth.user.id,
          },
          request.auth.user.id,
        ),
      });
    }),
  );
  return router;
}

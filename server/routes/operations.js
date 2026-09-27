import { Router } from "express";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import {
  eventType,
  optionalDate,
  priority,
  stringList,
  trainingStatus,
  validateContact,
  workStatus,
} from "../services/operationsValidation.js";
import { requireString } from "../services/validation.js";
import {
  GEOGRAPHIC_ACTIVATION_CONFIRMATION,
  GEOGRAPHIC_IMPORT_LIMITS,
  validateGeographicRows,
  validateProvenance,
} from "../services/geographicManagement.js";

const GEOGRAPHIC_IMPORT_WRITE_BATCH_SIZE = 1_000;

function workData(body) {
  return {
    title: requireString(body, "title", { min: 2, max: 160 }),
    description: body?.description ? String(body.description).slice(0, 3000) : undefined,
    ownerId: body?.ownerId || undefined,
    priority: priority(body?.priority),
    status: workStatus(body?.status),
    startsAt: optionalDate(body?.startsAt, "startsAt"),
    dueAt: optionalDate(body?.dueAt, "dueAt"),
  };
}
function patchData(body) {
  const data = {};
  for (const key of ["title", "description", "ownerId"])
    if (body?.[key] !== undefined) data[key] = body[key] || null;
  if (body?.priority !== undefined) data.priority = priority(body.priority);
  if (body?.status !== undefined) data.status = workStatus(body.status);
  if (body?.dueAt !== undefined) data.dueAt = optionalDate(body.dueAt, "dueAt") ?? null;
  return data;
}

function geographicImportDiagnostic(error, rowsSubmitted, startedAt) {
  const prismaCode =
    typeof error?.code === "string" && /^P\d{4}$/.test(error.code) ? error.code : null;
  console.error(
    JSON.stringify({
      event: "geographic-controlled-import-failed",
      mode: "IMPORT",
      rowsSubmitted,
      durationMs: Date.now() - startedAt,
      prismaCode,
      errorType: String(error?.name || "Error").slice(0, 80),
    }),
  );
}

function geographicActivationDiagnostic(error, campaignId, startedAt) {
  const prismaCode =
    typeof error?.code === "string" && /^P\d{4}$/.test(error.code) ? error.code : null;
  console.error(
    JSON.stringify({
      event: "geographic-hierarchy-activation-failed",
      operation: "FULL_HIERARCHY_ACTIVATION",
      campaignId,
      durationMs: Date.now() - startedAt,
      prismaCode,
      errorType: String(error?.name || "Error").slice(0, 80),
    }),
  );
}

export function createOperationsRouter(repository) {
  const router = Router();
  router.use(requireSession);
  for (const kind of ["initiatives", "activities", "tasks"]) {
    router.get(
      `/:campaignId/${kind}`,
      requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
      asyncRoute(async (request, response) =>
        response.json({
          items: await repository.list(request.tenant.id, request.params.campaignId, kind),
        }),
      ),
    );
    router.post(
      `/:campaignId/${kind}`,
      requireTenantPermission(PERMISSIONS.CAMPAIGN_MANAGE),
      asyncRoute(async (request, response) => {
        const data = workData(request.body);
        if (kind === "activities") data.initiativeId = request.body?.initiativeId || undefined;
        if (kind === "tasks") {
          data.activityId = request.body?.activityId || undefined;
          delete data.startsAt;
        }
        response.status(201).json({
          item: await repository.create(request.tenant.id, request.params.campaignId, kind, data),
        });
      }),
    );
    router.patch(
      `/:campaignId/${kind}/:id`,
      requireTenantPermission(PERMISSIONS.CAMPAIGN_MANAGE),
      asyncRoute(async (request, response) => {
        const result = await repository.update(
          request.tenant.id,
          request.params.campaignId,
          kind,
          request.params.id,
          patchData(request.body),
        );
        if (!result.count) throw Object.assign(new Error("Item not found."), { status: 404 });
        response.json({ updated: true });
      }),
    );
  }
  router.get(
    "/:campaignId/events",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (request, response) =>
      response.json({
        items: await repository.list(request.tenant.id, request.params.campaignId, "events"),
      }),
    ),
  );
  router.post(
    "/:campaignId/events",
    requireTenantPermission(PERMISSIONS.EVENTS_CREATE),
    asyncRoute(async (request, response) =>
      response.status(201).json({
        item: await repository.create(request.tenant.id, request.params.campaignId, "events", {
          title: requireString(request.body, "title", { min: 2, max: 160 }),
          type: eventType(request.body?.type),
          status: workStatus(request.body?.status),
          startsAt: optionalDate(request.body?.startsAt, "startsAt"),
          endsAt: optionalDate(request.body?.endsAt, "endsAt"),
          venue: request.body?.venue || undefined,
          geographicAreaId: request.body?.geographicAreaId || undefined,
        }),
      }),
    ),
  );
  router.post(
    "/:campaignId/leadership",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_MANAGE),
    asyncRoute(async (request, response) =>
      response.status(201).json({
        leader: await repository.addLeader(request.tenant.id, request.params.campaignId, {
          userId: requireString(request.body, "userId", { min: 36, max: 36 }),
          title: requireString(request.body, "title", { min: 2, max: 100 }),
        }),
      }),
    ),
  );
  router.post(
    "/:campaignId/tasks/:id/dependencies",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_MANAGE),
    asyncRoute(async (request, response) =>
      response.status(201).json({
        dependency: await repository.addDependency(
          request.tenant.id,
          request.params.campaignId,
          request.params.id,
          requireString(request.body, "dependsOnTaskId", { min: 36, max: 36 }),
        ),
      }),
    ),
  );
  router.post(
    "/:campaignId/assignments",
    requireTenantPermission(PERMISSIONS.VOLUNTEERS_MANAGE),
    asyncRoute(async (request, response) =>
      response.status(201).json({
        assignment: await repository.assignVolunteer(request.tenant.id, request.params.campaignId, {
          volunteerId: requireString(request.body, "volunteerId", { min: 36, max: 36 }),
          taskId: request.body?.taskId || undefined,
          title: requireString(request.body, "title", { min: 2, max: 160 }),
          status: workStatus(request.body?.status),
        }),
      }),
    ),
  );
  router.post(
    "/:campaignId/events/:eventId/participants",
    requireTenantPermission(PERMISSIONS.VOLUNTEERS_MANAGE),
    asyncRoute(async (request, response) =>
      response.status(201).json({
        participation: await repository.addParticipant(request.tenant.id, {
          eventId: request.params.eventId,
          volunteerId: requireString(request.body, "volunteerId", { min: 36, max: 36 }),
          status: request.body?.status || "REGISTERED",
        }),
      }),
    ),
  );
  router.get(
    "/:campaignId/summary",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (request, response) => {
      const [initiatives, activities, tasks, events, volunteers] = await repository.dashboard(
        request.tenant.id,
        request.params.campaignId,
      );
      response.json({ initiatives, activities, tasks, events, volunteers });
    }),
  );
  router.get(
    "/volunteers/list",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (request, response) =>
      response.json({ volunteers: await repository.listVolunteers(request.tenant.id) }),
    ),
  );
  router.post(
    "/volunteers",
    requireTenantPermission(PERMISSIONS.VOLUNTEERS_CREATE),
    asyncRoute(async (request, response) => {
      const data = {
        displayName: requireString(request.body, "displayName", { min: 2, max: 120 }),
        contactAuthorized: request.body?.contactAuthorized === true,
        email: request.body?.email || undefined,
        phone: request.body?.phone || undefined,
        availability: request.body?.availability ?? {},
        preferredAreaId: request.body?.preferredAreaId || undefined,
        languages: stringList(request.body?.languages ?? [], "languages"),
        skills: stringList(request.body?.skills ?? [], "skills"),
        trainingStatus: trainingStatus(request.body?.trainingStatus),
      };
      validateContact(data);
      response
        .status(201)
        .json({ volunteer: await repository.createVolunteer(request.tenant.id, data) });
    }),
  );
  router.patch(
    "/volunteers/:id",
    requireTenantPermission(PERMISSIONS.VOLUNTEERS_MANAGE),
    asyncRoute(async (request, response) => {
      const data = {
        contactAuthorized: request.body?.contactAuthorized === true,
        email: request.body?.email || null,
        phone: request.body?.phone || null,
        availability: request.body?.availability,
        languages: request.body?.languages
          ? stringList(request.body.languages, "languages")
          : undefined,
        skills: request.body?.skills ? stringList(request.body.skills, "skills") : undefined,
        trainingStatus: request.body?.trainingStatus
          ? trainingStatus(request.body.trainingStatus)
          : undefined,
      };
      validateContact(data);
      const result = await repository.updateVolunteer(request.tenant.id, request.params.id, data);
      if (!result.count) throw Object.assign(new Error("Volunteer not found."), { status: 404 });
      response.json({ updated: true });
    }),
  );
  router.post(
    "/:campaignId/geography/activate",
    requireTenantPermission(PERMISSIONS.GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) => {
      if (request.body?.confirmation !== GEOGRAPHIC_ACTIVATION_CONFIRMATION)
        throw Object.assign(
          new Error("Activation confirmation must exactly match the required phrase."),
          { status: 400 },
        );
      const startedAt = Date.now();
      try {
        const result = await repository.activateGeographicHierarchy(
          request.tenant.id,
          request.params.campaignId,
          request.auth.user.id,
        );
        response.status(201).json({ activated: result.rowsActivated });
      } catch (error) {
        geographicActivationDiagnostic(error, request.params.campaignId, startedAt);
        throw error;
      }
    }),
  );
  router.get(
    "/geography/levels",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (request, response) =>
      response.json({ levels: await repository.listLevels(request.tenant.id) }),
    ),
  );
  router.post(
    "/geography/levels",
    requireTenantPermission(PERMISSIONS.GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) => {
      const level = await repository.createGeographicLevel(
        request.tenant.id,
        request.auth.user.id,
        {
          name: requireString(request.body, "name", { min: 2, max: 80 }),
          orderIndex: Number(request.body?.orderIndex),
        },
      );
      response.status(201).json({ level });
    }),
  );
  router.patch(
    "/geography/levels/:id",
    requireTenantPermission(PERMISSIONS.GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) => {
      const data = {};
      if (request.body?.name !== undefined)
        data.name = requireString(request.body, "name", { min: 2, max: 80 });
      if (request.body?.orderIndex !== undefined) data.orderIndex = Number(request.body.orderIndex);
      if (request.body?.isActive !== undefined) data.isActive = request.body.isActive === true;
      await repository.updateGeographicLevel(
        request.tenant.id,
        request.auth.user.id,
        request.params.id,
        data,
      );
      response.json({ updated: true });
    }),
  );
  router.get(
    "/:campaignId/geography/areas",
    requireTenantPermission(PERMISSIONS.CAMPAIGN_READ),
    asyncRoute(async (request, response) =>
      response.json({
        items: await repository.listAreas(request.tenant.id, request.params.campaignId),
      }),
    ),
  );
  router.get(
    "/:campaignId/geography/admin-areas",
    requireTenantPermission(PERMISSIONS.GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) => {
      const integer = (value, fallback, minimum, maximum) => {
        if (value === undefined || value === "") return fallback;
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum)
          throw Object.assign(new Error("Invalid geographic pagination parameter."), {
            status: 400,
          });
        return parsed;
      };
      const active = request.query.active;
      if (active !== undefined && active !== "true" && active !== "false")
        throw Object.assign(new Error("Active filter must be true or false."), { status: 400 });
      const search = String(request.query.search || "").trim();
      if (search.length > 120)
        throw Object.assign(new Error("Geographic search is too long."), { status: 400 });
      response.json(
        await repository.listAdministrativeAreas(request.tenant.id, request.params.campaignId, {
          page: integer(request.query.page, 1, 1, 1_000_000),
          pageSize: integer(request.query.pageSize, 25, 1, 100),
          levelId: request.query.levelId ? String(request.query.levelId) : undefined,
          parentId: request.query.parentId ? String(request.query.parentId) : undefined,
          rootOnly: request.query.root === "true",
          isActive: active === undefined ? undefined : active === "true",
          search: search || undefined,
        }),
      );
    }),
  );
  router.post(
    "/:campaignId/geography/areas",
    requireTenantPermission(PERMISSIONS.GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) => {
      const item = await repository.createGeographicArea(
        request.tenant.id,
        request.params.campaignId,
        request.auth.user.id,
        {
          name: requireString(request.body, "name", { min: 1, max: 120 }),
          code: request.body?.code || undefined,
          levelId: requireString(request.body, "levelId", { min: 36, max: 36 }),
          parentId: request.body?.parentId || undefined,
        },
      );
      response.status(201).json({ item });
    }),
  );
  router.patch(
    "/:campaignId/geography/areas/:id",
    requireTenantPermission(PERMISSIONS.GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) => {
      const data = {};
      for (const key of ["name", "code", "parentId", "levelId"])
        if (request.body?.[key] !== undefined) data[key] = request.body[key] || null;
      if (request.body?.isActive !== undefined) data.isActive = request.body.isActive === true;
      await repository.updateGeographicArea(
        request.tenant.id,
        request.params.campaignId,
        request.auth.user.id,
        request.params.id,
        data,
      );
      response.json({ updated: true });
    }),
  );
  router.post(
    "/:campaignId/geography/import",
    requireTenantPermission(PERMISSIONS.GEOGRAPHY_MANAGE),
    asyncRoute(async (request, response) => {
      const mode = String(request.body?.mode || "").toUpperCase();
      if (!["VALIDATE", "PREVIEW", "IMPORT"].includes(mode))
        throw Object.assign(new Error("Mode must be VALIDATE, PREVIEW, or IMPORT."), {
          status: 400,
        });
      const provenance = validateProvenance(request.body?.provenance);
      const [levels, areas] = await Promise.all([
        repository.listLevels(request.tenant.id),
        repository.listAreas(request.tenant.id, request.params.campaignId),
      ]);
      const report = validateGeographicRows({
        rows: request.body?.rows,
        levels,
        existingAreas: areas,
        allowInactiveImportedParents: true,
        rowLimit:
          mode === "VALIDATE"
            ? GEOGRAPHIC_IMPORT_LIMITS.validateRows
            : mode === "PREVIEW"
              ? GEOGRAPHIC_IMPORT_LIMITS.previewRows
              : GEOGRAPHIC_IMPORT_LIMITS.rows,
      });
      report.sourceProvenance = provenance;
      if (mode !== "IMPORT") {
        await repository.appendGeographicAudit(
          request.tenant.id,
          request.auth.user.id,
          `GEOGRAPHIC_IMPORT_${mode}`,
          "campaign",
          request.params.campaignId,
          {
            rowsReceived: report.rowsReceived,
            rowsValid: report.rowsValid,
            rowsRejected: report.rowsRejected,
            sourceInstitution: provenance.sourceInstitution,
            sourceDocument: provenance.sourceDocument,
            sourceVersionDate: provenance.sourceVersionDate || null,
            retrievalDate: provenance.retrievalDate,
            validationStatus: provenance.validationStatus,
          },
        );
        return response.json({ mode, report });
      }
      if (request.body?.confirmation !== "IMPORT AUTHORIZED GEOGRAPHIC DATA")
        throw Object.assign(
          new Error("Import confirmation must exactly match the required phrase."),
          { status: 400 },
        );
      if (report.rowsRejected)
        throw Object.assign(
          new Error("Import requires all submitted rows to pass fresh validation."),
          { status: 400 },
        );
      const importStartedAt = Date.now();
      let inserted;
      try {
        inserted = await repository.transaction(async (transaction) => {
          const codeIds = new Map(
            areas
              .filter((item) => item.code)
              .map((item) => [`${item.level.name}\0${item.code}`, item.id]),
          );
          const levelNames = new Map(levels.map((item) => [item.id, item.name]));
          const pending = [...report.plan];
          const importedAt = new Date();
          let count = 0;
          while (pending.length) {
            const ready = pending.filter(
              (row) => !row.parentKey || codeIds.has(row.parentKey),
            );
            if (!ready.length) throw new Error("Validated geographic import plan is unresolved.");
            const readyData = ready.map((row) => ({
                tenantId: request.tenant.id,
                campaignId: request.params.campaignId,
                levelId: row.levelId,
                parentId: row.parentKey ? codeIds.get(row.parentKey) : null,
                name: row.name,
                code: row.code,
                sourceInstitution: provenance.sourceInstitution,
                sourceDocument: provenance.sourceDocument,
                sourceVersionDate: provenance.sourceVersionDate
                  ? new Date(provenance.sourceVersionDate)
                  : null,
                retrievalDate: new Date(provenance.retrievalDate),
                importedAt,
                validationStatus: provenance.validationStatus,
                isActive: false,
              }));
            for (
              let offset = 0;
              offset < readyData.length;
              offset += GEOGRAPHIC_IMPORT_WRITE_BATCH_SIZE
            ) {
              const created = await transaction.geographicArea.createManyAndReturn({
                data: readyData.slice(offset, offset + GEOGRAPHIC_IMPORT_WRITE_BATCH_SIZE),
                select: { id: true, levelId: true, code: true },
              });
              for (const item of created)
                codeIds.set(`${levelNames.get(item.levelId)}\0${item.code}`, item.id);
              count += created.length;
            }
            const readyKeys = new Set(ready.map((row) => `${row.levelName}\0${row.code}`));
            for (let index = pending.length - 1; index >= 0; index -= 1)
              if (readyKeys.has(`${pending[index].levelName}\0${pending[index].code}`))
                pending.splice(index, 1);
          }
          await transaction.securityAuditEvent.create({
            data: {
              tenantId: request.tenant.id,
              actorId: request.auth.user.id,
              action: "GEOGRAPHIC_IMPORT_EXECUTED",
              entity: "campaign",
              entityId: request.params.campaignId,
              metadata: {
                rowsReceived: report.rowsReceived,
                rowsSubmitted: report.rowsReceived,
                rowsImported: count,
                sourceInstitution: provenance.sourceInstitution,
                sourceDocument: provenance.sourceDocument,
                sourceVersionDate: provenance.sourceVersionDate || null,
                retrievalDate: provenance.retrievalDate,
                validationStatus: provenance.validationStatus,
                importedInactive: true,
              },
            },
          });
          return count;
        });
      } catch (error) {
        geographicImportDiagnostic(error, report.rowsReceived, importStartedAt);
        throw error;
      }
      response.status(201).json({ mode, imported: inserted, report });
    }),
  );
  return router;
}

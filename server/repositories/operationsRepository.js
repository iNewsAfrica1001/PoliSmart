import { assertNoAreaCycle } from "../services/geographicManagement.js";

const MODELS = Object.freeze({
  initiatives: "initiative",
  activities: "activity",
  tasks: "campaignTask",
  events: "campaignEvent",
  areas: "geographicArea",
});
export function createOperationsRepository(database) {
  const scoped = (kind) => {
    const model = database[MODELS[kind]];
    if (!model) throw new TypeError("Unsupported operation kind");
    return model;
  };
  const rejectReference = () => {
    throw Object.assign(
      new Error("Referenced record is not available in this organization and campaign."),
      { status: 400 },
    );
  };
  async function assertReferences(tenantId, campaignId, kind, data) {
    if (
      data.ownerId &&
      (await database.membership.count({
        where: { tenantId, userId: data.ownerId, status: "ACTIVE" },
      })) !== 1
    )
      rejectReference();
    if (
      kind === "activities" &&
      data.initiativeId &&
      (await database.initiative.count({
        where: { id: data.initiativeId, tenantId, campaignId },
      })) !== 1
    )
      rejectReference();
    if (
      kind === "tasks" &&
      data.activityId &&
      (await database.activity.count({ where: { id: data.activityId, tenantId, campaignId } })) !==
        1
    )
      rejectReference();
    if (
      (kind === "events" || kind === "areas") &&
      data.geographicAreaId &&
      (await database.geographicArea.count({
        where: { id: data.geographicAreaId, tenantId, campaignId, isActive: true },
      })) !== 1
    )
      rejectReference();
    if (
      kind === "areas" &&
      data.levelId &&
      (await database.geographicLevel.count({ where: { id: data.levelId, tenantId } })) !== 1
    )
      rejectReference();
    if (
      kind === "areas" &&
      data.parentId &&
      (await database.geographicArea.count({
        where: { id: data.parentId, tenantId, campaignId },
      })) !== 1
    )
      rejectReference();
  }
  const auditData = (tenantId, actorId, action, entity, entityId, metadata = {}) => ({
    tenantId,
    actorId,
    action,
    entity,
    entityId,
    metadata,
  });
  return {
    list(tenantId, campaignId, kind) {
      return scoped(kind).findMany({
        where: { tenantId, campaignId },
        orderBy: { createdAt: "desc" },
      });
    },
    async create(tenantId, campaignId, kind, data) {
      await assertReferences(tenantId, campaignId, kind, data);
      if (
        kind === "areas" &&
        (await database.geographicLevel.count({
          where: { id: data.levelId, tenantId, isActive: true },
        })) !== 1
      )
        throw Object.assign(
          new Error("The selected geographic level is inactive or unavailable."),
          { status: 400 },
        );
      if (
        kind === "areas" &&
        data.parentId &&
        (await database.geographicArea.count({
          where: { id: data.parentId, tenantId, campaignId, isActive: true },
        })) !== 1
      )
        throw Object.assign(new Error("The selected parent is inactive or unavailable."), {
          status: 400,
        });
      if (
        kind === "areas" &&
        (await database.geographicArea.count({
          where: {
            tenantId,
            campaignId,
            levelId: data.levelId,
            parentId: data.parentId || null,
            name: { equals: data.name, mode: "insensitive" },
          },
        }))
      )
        throw Object.assign(
          new Error("A geographic area with this name already exists in the selected scope."),
          { status: 409 },
        );
      return scoped(kind).create({ data: { ...data, tenantId, campaignId } });
    },
    update(tenantId, campaignId, kind, id, data) {
      return scoped(kind).updateMany({ where: { id, tenantId, campaignId }, data });
    },
    dashboard(tenantId, campaignId) {
      return database.$transaction([
        database.initiative.count({ where: { tenantId, campaignId } }),
        database.activity.count({ where: { tenantId, campaignId } }),
        database.campaignTask.count({ where: { tenantId, campaignId } }),
        database.campaignEvent.count({ where: { tenantId, campaignId } }),
        database.volunteer.count({ where: { tenantId } }),
      ]);
    },
    listVolunteers(tenantId) {
      return database.volunteer.findMany({ where: { tenantId }, orderBy: { displayName: "asc" } });
    },
    createVolunteer(tenantId, data) {
      return database.volunteer.create({ data: { ...data, tenantId } });
    },
    updateVolunteer(tenantId, id, data) {
      return database.volunteer.updateMany({ where: { id, tenantId }, data });
    },
    listLevels(tenantId) {
      return database.geographicLevel.findMany({
        where: { tenantId },
        orderBy: { orderIndex: "asc" },
      });
    },
    createLevel(tenantId, data) {
      return database.geographicLevel.create({ data: { ...data, tenantId } });
    },
    updateLevel(tenantId, id, data) {
      return database.geographicLevel.updateMany({ where: { id, tenantId }, data });
    },
    createGeographicLevel(tenantId, actorId, data) {
      return database.$transaction(async (transaction) => {
        const level = await transaction.geographicLevel.create({ data: { ...data, tenantId } });
        await transaction.securityAuditEvent.create({
          data: auditData(
            tenantId,
            actorId,
            "GEOGRAPHIC_LEVEL_CREATED",
            "geographic_level",
            level.id,
            { orderIndex: level.orderIndex, isActive: level.isActive },
          ),
        });
        return level;
      });
    },
    updateGeographicLevel(tenantId, actorId, id, data) {
      return database.$transaction(async (transaction) => {
        const result = await transaction.geographicLevel.updateMany({
          where: { id, tenantId },
          data,
        });
        if (!result.count)
          throw Object.assign(new Error("Geographic level not found."), { status: 404 });
        await transaction.securityAuditEvent.create({
          data: auditData(
            tenantId,
            actorId,
            data.isActive === undefined
              ? "GEOGRAPHIC_LEVEL_CHANGED"
              : data.isActive
                ? "GEOGRAPHIC_LEVEL_ACTIVATED"
                : "GEOGRAPHIC_LEVEL_DEACTIVATED",
            "geographic_level",
            id,
            { changedFields: Object.keys(data) },
          ),
        });
        return result;
      });
    },
    async updateArea(tenantId, campaignId, id, data) {
      await assertReferences(tenantId, campaignId, "areas", data);
      if (
        data.levelId &&
        (await database.geographicLevel.count({
          where: { id: data.levelId, tenantId, isActive: true },
        })) !== 1
      )
        throw Object.assign(
          new Error("The selected geographic level is inactive or unavailable."),
          { status: 400 },
        );
      if (
        data.parentId &&
        (await database.geographicArea.count({
          where: { id: data.parentId, tenantId, campaignId, isActive: true },
        })) !== 1
      )
        throw Object.assign(new Error("The selected parent is inactive or unavailable."), {
          status: 400,
        });
      return database.geographicArea.updateMany({ where: { id, tenantId, campaignId }, data });
    },
    createGeographicArea(tenantId, campaignId, actorId, data) {
      return database.$transaction(async (transaction) => {
        if (
          (await transaction.geographicLevel.count({
            where: { id: data.levelId, tenantId, isActive: true },
          })) !== 1
        )
          throw Object.assign(
            new Error("The selected geographic level is inactive or unavailable."),
            { status: 400 },
          );
        if (
          data.parentId &&
          (await transaction.geographicArea.count({
            where: { id: data.parentId, tenantId, campaignId, isActive: true },
          })) !== 1
        )
          throw Object.assign(new Error("The selected parent is inactive or unavailable."), {
            status: 400,
          });
        if (
          await transaction.geographicArea.count({
            where: {
              tenantId,
              campaignId,
              levelId: data.levelId,
              parentId: data.parentId || null,
              name: { equals: data.name, mode: "insensitive" },
            },
          })
        )
          throw Object.assign(
            new Error("A geographic area with this name already exists in the selected scope."),
            { status: 409 },
          );
        const item = await transaction.geographicArea.create({
          data: { ...data, tenantId, campaignId },
        });
        await transaction.securityAuditEvent.create({
          data: auditData(
            tenantId,
            actorId,
            "GEOGRAPHIC_AREA_CREATED",
            "geographic_area",
            item.id,
            { campaignId, levelId: item.levelId, hasParent: Boolean(item.parentId) },
          ),
        });
        return item;
      });
    },
    updateGeographicArea(tenantId, campaignId, actorId, id, data) {
      return database.$transaction(async (transaction) => {
        const existing = await transaction.geographicArea.findFirst({
          where: { id, tenantId, campaignId },
          select: { id: true, levelId: true, parentId: true, isActive: true },
        });
        if (!existing)
          throw Object.assign(new Error("Geographic area not found."), { status: 404 });
        const resulting = { ...existing, ...data };
        if (data.levelId !== undefined || resulting.isActive) {
          if (
            (await transaction.geographicLevel.count({
              where: { id: resulting.levelId, tenantId, isActive: true },
            })) !== 1
          )
            throw Object.assign(
              new Error("The selected geographic level is inactive or unavailable."),
              { status: 400 },
            );
        }
        if (
          resulting.parentId &&
          (data.parentId !== undefined || resulting.isActive) &&
          (await transaction.geographicArea.count({
            where: { id: resulting.parentId, tenantId, campaignId, isActive: true },
          })) !== 1
        )
          throw Object.assign(new Error("The selected parent is inactive or unavailable."), {
            status: 400,
          });
        const areas = await transaction.geographicArea.findMany({
          where: { tenantId, campaignId },
          select: { id: true, parentId: true, isActive: true },
        });
        assertNoAreaCycle({ areaId: id, parentId: resulting.parentId, areas });
        const result = await transaction.geographicArea.updateMany({
          where: { id, tenantId, campaignId },
          data,
        });
        await transaction.securityAuditEvent.create({
          data: auditData(
            tenantId,
            actorId,
            data.isActive === undefined
              ? "GEOGRAPHIC_AREA_CHANGED"
              : data.isActive
                ? "GEOGRAPHIC_AREA_ACTIVATED"
                : "GEOGRAPHIC_AREA_DEACTIVATED",
            "geographic_area",
            id,
            { campaignId, changedFields: Object.keys(data) },
          ),
        });
        return result;
      });
    },
    listAreas(tenantId, campaignId) {
      return database.geographicArea.findMany({
        where: { tenantId, campaignId },
        include: { level: true, parent: { select: { id: true, name: true } } },
        orderBy: [{ level: { orderIndex: "asc" } }, { name: "asc" }],
      });
    },
    transaction(callback) {
      return database.$transaction(callback);
    },
    database,
    appendGeographicAudit(tenantId, actorId, action, entity, entityId, metadata = {}) {
      return database.securityAuditEvent.create({
        data: auditData(tenantId, actorId, action, entity, entityId, metadata),
      });
    },
    async addLeader(tenantId, campaignId, data) {
      if (
        (await database.membership.count({
          where: { tenantId, userId: data.userId, status: "ACTIVE" },
        })) !== 1
      )
        rejectReference();
      return database.campaignLeader.create({ data: { ...data, tenantId, campaignId } });
    },
    async addDependency(tenantId, campaignId, taskId, dependsOnTaskId) {
      const count = await database.campaignTask.count({
        where: { id: { in: [taskId, dependsOnTaskId] }, tenantId, campaignId },
      });
      if (count !== 2 || taskId === dependsOnTaskId)
        throw Object.assign(new Error("Both dependency tasks must belong to this campaign."), {
          status: 400,
        });
      return database.taskDependency.create({ data: { tenantId, taskId, dependsOnTaskId } });
    },
    async assignVolunteer(tenantId, campaignId, data) {
      if ((await database.volunteer.count({ where: { id: data.volunteerId, tenantId } })) !== 1)
        rejectReference();
      if (
        data.taskId &&
        (await database.campaignTask.count({
          where: { id: data.taskId, tenantId, campaignId },
        })) !== 1
      )
        rejectReference();
      return database.volunteerAssignment.create({ data: { ...data, tenantId, campaignId } });
    },
    async addParticipant(tenantId, data) {
      if (
        (await database.campaignEvent.count({ where: { id: data.eventId, tenantId } })) !== 1 ||
        (await database.volunteer.count({ where: { id: data.volunteerId, tenantId } })) !== 1
      )
        rejectReference();
      return database.eventParticipation.create({ data: { ...data, tenantId } });
    },
  };
}

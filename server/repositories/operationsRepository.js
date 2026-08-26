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
        where: { id: data.geographicAreaId, tenantId, campaignId },
      })) !== 1
    )
      rejectReference();
    if (
      kind === "areas" &&
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
  return {
    list(tenantId, campaignId, kind) {
      return scoped(kind).findMany({
        where: { tenantId, campaignId },
        orderBy: { createdAt: "desc" },
      });
    },
    async create(tenantId, campaignId, kind, data) {
      await assertReferences(tenantId, campaignId, kind, data);
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

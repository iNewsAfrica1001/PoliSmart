const MODELS = Object.freeze({
  goals: "fundraisingGoal",
  contacts: "fundraisingContact",
  contributions: "fundraisingContribution",
  activities: "fundraisingActivity",
  followUps: "fundraisingFollowUp",
});

export function createFundraisingRepository(database) {
  const model = (kind, client = database) => {
    const value = client[MODELS[kind]];
    if (!value) throw new TypeError("Unsupported fundraising record type.");
    return value;
  };
  async function assertCampaign(tenantId, campaignId, client = database) {
    if ((await client.campaign.count({ where: { id: campaignId, tenantId } })) !== 1)
      throw Object.assign(new Error("Campaign not found."), { status: 404 });
  }
  async function assertContact(tenantId, campaignId, contactId, client = database) {
    if (
      contactId &&
      (await client.fundraisingContact.count({ where: { id: contactId, tenantId, campaignId } })) !== 1
    )
      throw Object.assign(new Error("Fundraising contact not found."), { status: 400 });
  }
  async function assertGoal(tenantId, campaignId, goalId, client = database) {
    if (goalId && (await client.fundraisingGoal.count({ where: { id: goalId, tenantId, campaignId } })) !== 1)
      throw Object.assign(new Error("Fundraising goal not found."), { status: 400 });
  }
  const history = (client, { tenantId, campaignId, actorId, entityType, entityId, action, changes }) =>
    client.fundraisingHistory.create({
      data: { tenantId, campaignId, actorId, entityType, entityId, action, changes },
    });
  return {
    async overview(tenantId, campaignId) {
      await assertCampaign(tenantId, campaignId);
      const [goals, contacts, contributions, activities, followUps] = await Promise.all([
        database.fundraisingGoal.findMany({ where: { tenantId, campaignId, archivedAt: null }, orderBy: { createdAt: "desc" } }),
        database.fundraisingContact.findMany({ where: { tenantId, campaignId, archivedAt: null }, orderBy: { displayName: "asc" } }),
        database.fundraisingContribution.findMany({ where: { tenantId, campaignId, archivedAt: null }, orderBy: { contributedAt: "desc" } }),
        database.fundraisingActivity.findMany({ where: { tenantId, campaignId, archivedAt: null }, orderBy: { occursAt: "asc" } }),
        database.fundraisingFollowUp.findMany({ where: { tenantId, campaignId, archivedAt: null }, orderBy: { dueAt: "asc" } }),
      ]);
      const goalsWithProgress = goals.map((goal) => ({
        ...goal,
        confirmedAmount: contributions
          .filter((item) => item.status === "CONFIRMED" && item.goalId === goal.id && item.currency === goal.currency)
          .reduce((sum, item) => sum + Number(item.amount), 0),
      }));
      const confirmedTotals = Object.entries(
        contributions.filter((item) => item.status === "CONFIRMED").reduce((totals, item) => {
          totals[item.currency] = (totals[item.currency] || 0) + Number(item.amount); return totals;
        }, {}),
      ).map(([currency, amount]) => ({ currency, amount }));
      return { goals: goalsWithProgress, contacts, contributions, activities, followUps, confirmedTotals };
    },
    async create(tenantId, campaignId, actorId, kind, data) {
      return database.$transaction(async (transaction) => {
        await assertCampaign(tenantId, campaignId, transaction);
        if (kind === "contributions" || kind === "followUps")
          await assertContact(tenantId, campaignId, data.contactId, transaction);
        if (kind === "contributions") await assertGoal(tenantId, campaignId, data.goalId, transaction);
        const record = await model(kind, transaction).create({ data: { ...data, tenantId, campaignId } });
        await history(transaction, {
          tenantId, campaignId, actorId, entityType: kind, entityId: record.id,
          action: "CREATED", changes: { fields: Object.keys(data).filter((key) => key !== "notes") },
        });
        return record;
      });
    },
    async updateContributionStatus(tenantId, campaignId, actorId, id, status) {
      return database.$transaction(async (transaction) => {
        await assertCampaign(tenantId, campaignId, transaction);
        const existing = await transaction.fundraisingContribution.findFirst({
          where: { id, tenantId, campaignId, archivedAt: null }, select: { id: true, status: true },
        });
        if (!existing) throw Object.assign(new Error("Contribution not found."), { status: 404 });
        const record = await transaction.fundraisingContribution.update({ where: { id }, data: { status } });
        await history(transaction, {
          tenantId, campaignId, actorId, entityType: "contributions", entityId: id,
          action: "STATUS_CHANGED", changes: { from: existing.status, to: status },
        });
        return record;
      });
    },
    async archive(tenantId, campaignId, actorId, kind, id) {
      return database.$transaction(async (transaction) => {
        await assertCampaign(tenantId, campaignId, transaction);
        const result = await model(kind, transaction).updateMany({
          where: { id, tenantId, campaignId, archivedAt: null },
          data: { archivedAt: new Date(), status: "ARCHIVED" },
        });
        if (!result.count) throw Object.assign(new Error("Fundraising record not found."), { status: 404 });
        await history(transaction, {
          tenantId, campaignId, actorId, entityType: kind, entityId: id,
          action: "ARCHIVED", changes: { archived: true },
        });
        return result;
      });
    },
    async listHistory(tenantId, campaignId) {
      await assertCampaign(tenantId, campaignId);
      return database.fundraisingHistory.findMany({
        where: { tenantId, campaignId },
        select: { id: true, entityType: true, entityId: true, action: true, changes: true, createdAt: true },
        orderBy: { createdAt: "desc" }, take: 100,
      });
    },
  };
}

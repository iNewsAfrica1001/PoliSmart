const administratorDisplayFields = { id: true, displayName: true };
const followUpReviewFields = {
  id: true,
  leadId: true,
  note: true,
  scheduledAt: true,
  createdAt: true,
  completedAt: true,
  createdBy: { select: administratorDisplayFields },
  completedBy: { select: administratorDisplayFields },
};
const followUpSummaryFields = { id: true, scheduledAt: true };

function missingLead() {
  return Object.assign(new Error("Lead not found."), { status: 404 });
}

function followUpState(followUp, now) {
  if (!followUp) return "NONE";
  return new Date(followUp.scheduledAt).getTime() < now.getTime() ? "OVERDUE" : "UPCOMING";
}

export function createPrelaunchLeadRepository(database, { now = () => new Date() } = {}) {
  const reviewFields = {
    id: true,
    requestType: true,
    name: true,
    email: true,
    organization: true,
    country: true,
    role: true,
    interest: true,
    organizationType: true,
    timing: true,
    note: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  };
  return {
    create(data) {
      return database.prelaunchLead.create({ data });
    },
    async list(filters = {}) {
      const leads = await database.prelaunchLead.findMany({
        where: {
          ...(filters.requestType ? { requestType: filters.requestType } : {}),
          ...(filters.country ? { country: { equals: filters.country, mode: "insensitive" } } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
        select: {
          ...reviewFields,
          followUps: {
            where: { completedAt: null },
            select: followUpSummaryFields,
            orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      });
      const currentTime = now();
      return leads.map(({ followUps, ...lead }) => {
        const nextFollowUp = followUps[0] ?? null;
        return {
          ...lead,
          nextFollowUp,
          followUpState: followUpState(nextFollowUp, currentTime),
        };
      });
    },
    findById(id) {
      return database.prelaunchLead.findUnique({ where: { id }, select: reviewFields });
    },
    async updateStatus(id, status) {
      const result = await database.prelaunchLead.updateMany({ where: { id }, data: { status } });
      return result.count
        ? database.prelaunchLead.findUnique({ where: { id }, select: reviewFields })
        : null;
    },
    async listFollowUpsForLead(leadId) {
      if ((await database.prelaunchLead.count({ where: { id: leadId } })) !== 1)
        throw missingLead();
      return database.prelaunchLeadFollowUp.findMany({
        where: { leadId },
        select: followUpReviewFields,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
    },
    async createFollowUp({ leadId, note, scheduledAt, createdById }) {
      if ((await database.prelaunchLead.count({ where: { id: leadId } })) !== 1)
        throw missingLead();
      return database.prelaunchLeadFollowUp.create({
        data: { leadId, note, scheduledAt, createdById },
        select: followUpReviewFields,
      });
    },
    async completeFollowUp(leadId, followUpId, completedById) {
      const completedAt = now();
      const result = await database.prelaunchLeadFollowUp.updateMany({
        where: { id: followUpId, leadId, completedAt: null, completedById: null },
        data: { completedAt, completedById },
      });
      if (result.count === 1) {
        return {
          outcome: "COMPLETED",
          followUp: await database.prelaunchLeadFollowUp.findUnique({
            where: { id: followUpId },
            select: followUpReviewFields,
          }),
        };
      }
      const existing = await database.prelaunchLeadFollowUp.findFirst({
        where: { id: followUpId, leadId },
        select: { id: true, completedAt: true },
      });
      return existing?.completedAt
        ? { outcome: "ALREADY_COMPLETED", followUp: null }
        : { outcome: "NOT_FOUND", followUp: null };
    },
    async getFollowUpSummaryForLead(leadId) {
      if ((await database.prelaunchLead.count({ where: { id: leadId } })) !== 1)
        throw missingLead();
      const nextFollowUp = await database.prelaunchLeadFollowUp.findFirst({
        where: { leadId, completedAt: null },
        select: followUpSummaryFields,
        orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      });
      return {
        nextFollowUp,
        state: followUpState(nextFollowUp, now()),
      };
    },
  };
}

const contains = (query) => ({ contains: query, mode: "insensitive" });
const limit = { take: 6, orderBy: { updatedAt: "desc" } };

export function createWorkspaceSearchRepository(database) {
  return {
    async search({ tenantId, actorId, query, permissions }) {
      const campaigns = await database.campaign.findMany({
        where: { tenantId, name: contains(query) },
        select: { id: true, name: true, country: true, status: true },
        ...limit,
      });

      const [documents, events, volunteers, media, tasks, policies, communications, fundraisingGoals] =
        await Promise.all([
          permissions.knowledge
            ? database.knowledgeDocument.findMany({
                where: {
                  tenantId,
                  approvalStatus: "APPROVED",
                  processingStatus: "READY",
                  AND: [
                    { OR: [{ visibility: { not: "PRIVATE" } }, { uploadedById: actorId }] },
                    { OR: [{ title: contains(query) }, { source: contains(query) }, { author: contains(query) }] },
                  ],
                },
                select: { id: true, campaignId: true, title: true, category: true },
                ...limit,
              })
            : [],
          database.campaignEvent.findMany({
            where: { tenantId, OR: [{ title: contains(query) }, { venue: contains(query) }] },
            select: { id: true, campaignId: true, title: true, status: true },
            ...limit,
          }),
          permissions.volunteers
            ? database.volunteer.findMany({
                where: { tenantId, displayName: contains(query) },
                select: { id: true, displayName: true, trainingStatus: true },
                ...limit,
              })
            : [],
          permissions.media
            ? database.mediaItem.findMany({
                where: {
                  tenantId,
                  OR: [{ headline: contains(query) }, { publisher: contains(query) }, { topic: contains(query) }],
                },
                select: { id: true, campaignId: true, headline: true, publisher: true },
                ...limit,
              })
            : [],
          database.campaignTask.findMany({
            where: { tenantId, title: contains(query) },
            select: { id: true, campaignId: true, title: true, status: true },
            ...limit,
          }),
          permissions.policy
            ? database.policyCase.findMany({
                where: { tenantId, OR: [{ title: contains(query) }, { problem: contains(query) }] },
                select: { id: true, campaignId: true, title: true, status: true },
                ...limit,
              })
            : [],
          permissions.communications
            ? database.communication.findMany({
                where: { tenantId, title: contains(query) },
                select: { id: true, campaignId: true, title: true, type: true },
                ...limit,
              })
            : [],
          permissions.fundraising
            ? database.fundraisingGoal.findMany({
                where: { tenantId, archivedAt: null, title: contains(query) },
                select: { id: true, campaignId: true, title: true, status: true },
                ...limit,
              })
            : [],
        ]);

      return [
        ...campaigns.map((item) => ({ id: item.id, type: "CAMPAIGN", title: item.name, detail: `${item.country} · ${item.status}`, page: "campaigns" })),
        ...documents.map((item) => ({ id: item.id, campaignId: item.campaignId, type: "KNOWLEDGE", title: item.title, detail: String(item.category).replaceAll("_", " "), page: "knowledge" })),
        ...events.map((item) => ({ id: item.id, campaignId: item.campaignId, type: "EVENT", title: item.title, detail: String(item.status).replaceAll("_", " "), page: "events" })),
        ...volunteers.map((item) => ({ id: item.id, type: "VOLUNTEER", title: item.displayName, detail: String(item.trainingStatus).replaceAll("_", " "), page: "volunteers" })),
        ...media.map((item) => ({ id: item.id, campaignId: item.campaignId, type: "MEDIA", title: item.headline, detail: item.publisher, page: "media" })),
        ...tasks.map((item) => ({ id: item.id, campaignId: item.campaignId, type: "FIELD", title: item.title, detail: String(item.status).replaceAll("_", " "), page: "field" })),
        ...policies.map((item) => ({ id: item.id, campaignId: item.campaignId, type: "POLICY", title: item.title, detail: String(item.status).replaceAll("_", " "), page: "policy" })),
        ...communications.map((item) => ({ id: item.id, campaignId: item.campaignId, type: "COMMUNICATION", title: item.title, detail: String(item.type).replaceAll("_", " "), page: "communications" })),
        ...fundraisingGoals.map((item) => ({ id: item.id, campaignId: item.campaignId, type: "FUNDRAISING", title: item.title, detail: String(item.status).replaceAll("_", " "), page: "fundraising" })),
      ];
    },
  };
}

import { isValidNigeriaGeographicParent } from "../services/geographicManagement.js";

export function createAiRepository(database) {
  return {
    findCampaign(tenantId, campaignId) {
      return database.campaign.findFirst({
        where: { id: campaignId, tenantId },
        select: { id: true, name: true, country: true },
      });
    },
    async findActiveGeographicContext({ tenantId, campaignId, geographicAreaId }) {
      const campaign = await database.campaign.findFirst({
        where: { id: campaignId, tenantId },
        select: { id: true, name: true, country: true },
      });
      if (!campaign) return null;

      const ancestry = [];
      const visited = new Set();
      let areaId = geographicAreaId;
      while (areaId) {
        if (ancestry.length >= 5 || visited.has(areaId)) return null;
        visited.add(areaId);
        const area = await database.geographicArea.findFirst({
          where: { id: areaId, tenantId, campaignId, isActive: true },
          select: {
            id: true,
            parentId: true,
            name: true,
            code: true,
            tenantId: true,
            campaignId: true,
            level: { select: { name: true, orderIndex: true, isActive: true } },
          },
        });
        if (!area || !area.level.isActive) return null;
        const child = ancestry.at(-1);
        if (child && !isValidNigeriaGeographicParent(child.level.name, area.level.name)) return null;
        ancestry.push(area);
        areaId = area.parentId;
      }

      const ordered = ancestry.reverse();
      if (!ordered.length || ordered[0].level.name !== "Country" || ordered[0].parentId)
        return null;
      return {
        campaign,
        selected: ordered.at(-1),
        ancestry: ordered,
      };
    },
    retrieveKnowledge({ tenantId, campaignId, userId, terms, limit = 6 }) {
      const query = terms.slice(0, 6);
      return database.knowledgeChunk.findMany({
        where: {
          tenantId,
          document: {
            tenantId,
            campaignId,
            approvalStatus: "APPROVED",
            processingStatus: "READY",
            OR: [
              { visibility: { in: ["CAMPAIGN", "ORGANIZATION", "PUBLIC"] } },
              { visibility: "PRIVATE", uploadedById: userId },
            ],
          },
          OR: query.map((term) => ({ content: { contains: term, mode: "insensitive" } })),
        },
        select: {
          id: true,
          content: true,
          chunkIndex: true,
          document: {
            select: { id: true, title: true, source: true, author: true, uploadedAt: true },
          },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
    },
    createConversation(data) {
      return database.aiConversation.create({ data });
    },
    findConversation(tenantId, campaignId, userId, id) {
      return database.aiConversation.findFirst({
        where: { id, tenantId, campaignId, userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 12 } },
      });
    },
    createMessage(data) {
      return database.aiMessage.create({ data });
    },
    findAssistantMessage(tenantId, messageId) {
      return database.aiMessage.findFirst({
        where: { id: messageId, tenantId, role: "ASSISTANT" },
        select: { id: true },
      });
    },
    saveFeedback({ tenantId, messageId, userId, type, note }) {
      return database.aiFeedback.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { tenantId, messageId, userId, type, note },
        update: { type, note },
      });
    },
  };
}

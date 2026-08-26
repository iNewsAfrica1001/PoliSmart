export function createKnowledgeRepository(database) {
  return {
    campaignExists(tenantId, campaignId) {
      return database.campaign.count({ where: { id: campaignId, tenantId } });
    },
    createPending(data) {
      return database.knowledgeDocument.create({ data });
    },
    async complete(documentId, tenantId, extractedText, chunks) {
      return database.$transaction(async (tx) => {
        await tx.knowledgeChunk.createMany({
          data: chunks.map((chunk) => ({ ...chunk, tenantId, documentId })),
        });
        return tx.knowledgeDocument.update({
          where: { id: documentId },
          data: { extractedText, processingStatus: "READY", processingError: null },
        });
      });
    },
    fail(documentId, tenantId, message) {
      return database.knowledgeDocument.updateMany({
        where: { id: documentId, tenantId },
        data: { processingStatus: "FAILED", processingError: message },
      });
    },
    list(tenantId, campaignId, actorId, query = "") {
      return database.knowledgeDocument.findMany({
        where: {
          tenantId,
          campaignId,
          AND: [
            { OR: [{ visibility: { not: "PRIVATE" } }, { uploadedById: actorId }] },
            query
              ? {
                  OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { extractedText: { contains: query, mode: "insensitive" } },
                    { tags: { has: query } },
                  ],
                }
              : {},
          ],
        },
        select: {
          id: true,
          title: true,
          source: true,
          author: true,
          category: true,
          tags: true,
          visibility: true,
          approvalStatus: true,
          processingStatus: true,
          originalFilename: true,
          fileSizeBytes: true,
          uploadedAt: true,
          processingError: true,
        },
        orderBy: { uploadedAt: "desc" },
      });
    },
    findForTenant(tenantId, id) {
      return database.knowledgeDocument.findFirst({
        where: { id, tenantId },
        select: { id: true, storageKey: true, uploadedById: true, approvalStatus: true },
      });
    },
    deleteForTenant(tenantId, id) {
      return database.knowledgeDocument.deleteMany({ where: { id, tenantId } });
    },
    updateApproval(tenantId, id, approvalStatus) {
      return database.knowledgeDocument.updateMany({
        where: { id, tenantId },
        data: { approvalStatus },
      });
    },
  };
}

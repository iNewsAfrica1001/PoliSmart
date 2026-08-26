export function createIntelligenceWorkflowRepository(db) {
  const policyScope = (tenantId, campaignId, id) => ({ id, tenantId, campaignId });
  const communicationScope = (tenantId, campaignId, id) => ({ id, tenantId, campaignId });
  return {
    listPolicies: (tenantId, campaignId) =>
      db.policyCase.findMany({
        where: { tenantId, campaignId },
        include: {
          evidence: true,
          options: true,
          revisions: { orderBy: { version: "desc" } },
          approvals: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { updatedAt: "desc" },
      }),
    createPolicy: (data) => db.policyCase.create({ data }),
    findPolicy: (tenantId, campaignId, id) =>
      db.policyCase.findFirst({
        where: policyScope(tenantId, campaignId, id),
        include: { evidence: true, options: true, revisions: { orderBy: { version: "desc" } } },
      }),
    updatePolicyStatus: (tenantId, campaignId, id, status) =>
      db.policyCase.updateMany({ where: policyScope(tenantId, campaignId, id), data: { status } }),
    addEvidence: (data) => db.policyEvidence.create({ data }),
    addOption: (data) => db.policyOption.create({ data }),
    addPolicyRevision: (data) =>
      db.$transaction(async (tx) => {
        const latest = await tx.policyRevision.findFirst({
          where: { tenantId: data.tenantId, policyCaseId: data.policyCaseId },
          select: { version: true },
          orderBy: { version: "desc" },
        });
        return tx.policyRevision.create({ data: { ...data, version: (latest?.version || 0) + 1 } });
      }),
    addPolicyApproval: (data) => db.policyApproval.create({ data }),
    listMedia: (tenantId, campaignId, filters = {}) =>
      db.mediaItem.findMany({
        where: {
          tenantId,
          campaignId,
          ...(filters.topic ? { topic: filters.topic } : {}),
          ...(filters.geography ? { geography: filters.geography } : {}),
        },
        orderBy: { publishedAt: "desc" },
        take: 100,
      }),
    upsertMedia: (data) =>
      db.mediaItem.upsert({
        where: {
          tenantId_integrationKey_externalId: {
            tenantId: data.tenantId,
            integrationKey: data.integrationKey,
            externalId: data.externalId,
          },
        },
        create: data,
        update: {
          headline: data.headline,
          publisher: data.publisher,
          publishedAt: data.publishedAt,
          topic: data.topic,
          geography: data.geography,
          source: data.source,
          sourceUrl: data.sourceUrl,
          summary: data.summary,
          aggregateSentiment: data.aggregateSentiment,
          campaignId: data.campaignId,
        },
      }),
    listCommunications: (tenantId, campaignId) =>
      db.communication.findMany({
        where: { tenantId, campaignId },
        include: {
          revisions: { orderBy: { version: "desc" } },
          approvals: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { updatedAt: "desc" },
      }),
    createCommunication: (data, content) =>
      db.$transaction(async (tx) => {
        const item = await tx.communication.create({ data });
        await tx.communicationRevision.create({
          data: {
            tenantId: data.tenantId,
            communicationId: item.id,
            authorId: data.createdById,
            version: 1,
            content,
          },
        });
        return item;
      }),
    findCommunication: (tenantId, campaignId, id) =>
      db.communication.findFirst({
        where: communicationScope(tenantId, campaignId, id),
        include: { revisions: { orderBy: { version: "desc" } }, approvals: true },
      }),
    updateCommunicationStatus: (tenantId, campaignId, id, status) =>
      db.communication.updateMany({
        where: communicationScope(tenantId, campaignId, id),
        data: { status },
      }),
    addCommunicationRevision: (data) =>
      db.$transaction(async (tx) => {
        const latest = await tx.communicationRevision.findFirst({
          where: { tenantId: data.tenantId, communicationId: data.communicationId },
          select: { version: true },
          orderBy: { version: "desc" },
        });
        return tx.communicationRevision.create({
          data: { ...data, version: (latest?.version || 0) + 1 },
        });
      }),
    addCommunicationApproval: (data) => db.communicationApproval.create({ data }),
  };
}

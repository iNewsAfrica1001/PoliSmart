const caseSelect = {
  id: true,
  tenantId: true,
  campaignId: true,
  caseReference: true,
  requestType: true,
  status: true,
  receivedAt: true,
  identityVerificationStatus: true,
  assignedOperatorId: true,
  resolutionStatus: true,
  completedAt: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
};

export function createPrivacyOperationsRepository(database) {
  const inScope = (tenantId, campaignId, extra = {}) => ({ tenantId, campaignId, ...extra });
  return {
    campaignInTenant: (tenantId, campaignId) =>
      database.campaign.count({ where: { id: campaignId, tenantId } }),
    listCases: (tenantId, campaignId) =>
      database.privacyRightsCase.findMany({
        where: inScope(tenantId, campaignId),
        select: caseSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 250,
      }),
    findCase: (tenantId, campaignId, id) =>
      database.privacyRightsCase.findFirst({
        where: inScope(tenantId, campaignId, { id }),
        select: { ...caseSelect, events: { orderBy: { createdAt: "asc" } } },
      }),
    createCase(data, actorId) {
      return database.$transaction(async (transaction) => {
        const privacyCase = await transaction.privacyRightsCase.create({
          data,
          select: caseSelect,
        });
        await transaction.privacyCaseEvent.create({
          data: {
            tenantId: data.tenantId,
            campaignId: data.campaignId,
            caseId: privacyCase.id,
            actorId,
            action: "PRIVACY_CASE_CREATED",
          },
        });
        return privacyCase;
      });
    },
    updateCase(tenantId, campaignId, id, expected, data, actorId) {
      return database.$transaction(async (transaction) => {
        const result = await transaction.privacyRightsCase.updateMany({
          where: inScope(tenantId, campaignId, {
            id,
            status: expected.status,
            identityVerificationStatus: expected.identityVerificationStatus,
          }),
          data,
        });
        if (result.count !== 1) return null;
        await transaction.privacyCaseEvent.create({
          data: {
            tenantId,
            campaignId,
            caseId: id,
            actorId,
            action: "PRIVACY_CASE_UPDATED",
            metadata: { changedFields: Object.keys(data).sort() },
          },
        });
        return transaction.privacyRightsCase.findUnique({ where: { id }, select: caseSelect });
      });
    },
    listSuppressions: (tenantId, campaignId) =>
      database.privacySuppression.findMany({
        where: inScope(tenantId, campaignId),
        select: {
          id: true,
          caseId: true,
          channel: true,
          reasonCategory: true,
          effectiveAt: true,
          status: true,
          reviewAt: true,
          reviewReference: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
    createSuppression(data, actorId) {
      return database.$transaction(async (transaction) => {
        const suppression = await transaction.privacySuppression.create({ data });
        await transaction.privacyCaseEvent.create({
          data: {
            tenantId: data.tenantId,
            campaignId: data.campaignId,
            caseId: data.caseId,
            actorId,
            action: "PRIVACY_SUPPRESSION_CREATED",
            metadata: { channel: data.channel, reasonCategory: data.reasonCategory },
          },
        });
        return suppression;
      });
    },
    async isSuppressed(tenantId, campaignId, subjectKeyHash, channel) {
      return (
        (await database.privacySuppression.count({
          where: {
            tenantId,
            campaignId,
            subjectKeyHash,
            status: "ACTIVE",
            channel: { in: [channel, "ALL"] },
          },
        })) > 0
      );
    },
    updateSuppression(tenantId, campaignId, id, status, reviewReference, actorId) {
      return database.$transaction(async (transaction) => {
        const existing = await transaction.privacySuppression.findFirst({
          where: inScope(tenantId, campaignId, { id }),
          select: { id: true, caseId: true },
        });
        if (!existing) return null;
        const suppression = await transaction.privacySuppression.update({
          where: { id },
          data: { status, reviewReference },
        });
        await transaction.privacyCaseEvent.create({
          data: {
            tenantId,
            campaignId,
            caseId: existing.caseId,
            actorId,
            action: "PRIVACY_SUPPRESSION_CHANGED",
            metadata: { status },
          },
        });
        return suppression;
      });
    },
    listLegalHolds: (tenantId, campaignId) =>
      database.privacyLegalHold.findMany({
        where: inScope(tenantId, campaignId),
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
    activeLegalHoldCount: (tenantId, campaignId, caseId) =>
      database.privacyLegalHold.count({
        where: inScope(tenantId, campaignId, { caseId, status: "ACTIVE" }),
      }),
    createLegalHold(data, actorId) {
      return database.$transaction(async (transaction) => {
        const hold = await transaction.privacyLegalHold.create({ data });
        await transaction.privacyCaseEvent.create({
          data: {
            tenantId: data.tenantId,
            campaignId: data.campaignId,
            caseId: data.caseId,
            actorId,
            action: "PRIVACY_LEGAL_HOLD_CREATED",
          },
        });
        return hold;
      });
    },
    releaseLegalHold(tenantId, campaignId, id, releaseAuthorization, actorId, releasedAt) {
      return database.$transaction(async (transaction) => {
        const existing = await transaction.privacyLegalHold.findFirst({
          where: inScope(tenantId, campaignId, { id, status: "ACTIVE" }),
          select: { id: true, caseId: true },
        });
        if (!existing) return null;
        const hold = await transaction.privacyLegalHold.update({
          where: { id },
          data: { status: "RELEASED", releaseAuthorization, releasedById: actorId, releasedAt },
        });
        await transaction.privacyCaseEvent.create({
          data: {
            tenantId,
            campaignId,
            caseId: existing.caseId,
            actorId,
            action: "PRIVACY_LEGAL_HOLD_RELEASED",
          },
        });
        return hold;
      });
    },
    async createPreview(tenantId, campaignId, caseId, action, actorId) {
      return database.$transaction(async (transaction) => {
        const privacyCase = await transaction.privacyRightsCase.findFirst({
          where: inScope(tenantId, campaignId, { id: caseId }),
          select: { id: true, identityVerificationStatus: true, status: true },
        });
        if (!privacyCase) return null;
        const legalHolds = await transaction.privacyLegalHold.count({
          where: inScope(tenantId, campaignId, { caseId, status: "ACTIVE" }),
        });
        const suppressions = await transaction.privacySuppression.count({
          where: inScope(tenantId, campaignId, { caseId, status: "ACTIVE" }),
        });
        const result = {
          action,
          affectedRecordCategories: [],
          affectedRecordCount: 0,
          legalHoldBlocked: legalHolds > 0,
          activeSuppressions: suppressions,
          executable: false,
          policyStatus: "POLICY_DECISION_REQUIRED",
        };
        await transaction.privacyCaseEvent.create({
          data: {
            tenantId,
            campaignId,
            caseId,
            actorId,
            action: "PRIVACY_ACTION_PREVIEWED",
            metadata: result,
          },
        });
        return result;
      });
    },
  };
}

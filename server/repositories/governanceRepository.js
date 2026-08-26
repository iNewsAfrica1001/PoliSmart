import { sha256 } from "../services/governance.js";
export function createGovernanceRepository(db) {
  return {
    appendAudit: (data) => db.securityAuditEvent.create({ data }),
    async appendAiUsage(data) {
      const providerRecord = await db.aiProviderRecord.upsert({
        where: { providerKey_modelKey: { providerKey: data.provider, modelKey: data.model } },
        create: {
          providerKey: data.provider,
          modelKey: data.model,
          displayName: `${data.provider} ${data.model}`,
        },
        update: { isActive: true },
      });
      const existing = await db.promptTemplateVersion.findFirst({
        where: { templateKey: data.templateKey, templateSha: sha256(data.template) },
      });
      const prompt =
        existing ||
        (await db.promptTemplateVersion.create({
          data: {
            templateKey: data.templateKey,
            version:
              (await db.promptTemplateVersion.count({ where: { templateKey: data.templateKey } })) +
              1,
            purpose: data.feature,
            templateSha: sha256(data.template),
            template: data.template,
          },
        }));
      return db.aiUsageLog.create({
        data: {
          tenantId: data.tenantId,
          campaignId: data.campaignId,
          actorId: data.actorId,
          providerRecordId: providerRecord.id,
          promptTemplateVersionId: prompt.id,
          feature: data.feature,
          requestId: data.requestId,
          generatedOutputReference: data.generatedOutputReference,
          approvalStatus: data.approvalStatus || "PENDING",
          safetyFlags: data.safetyFlags,
          sourceGroundingMetadata: data.sourceGroundingMetadata,
          providerResponseId: data.providerResponseId,
          inputSha256: data.inputSha256,
          status: data.status || "COMPLETED",
        },
      });
    },
    appendError: (data) => db.aiErrorReport.create({ data }),
    listAudit: (tenantId) =>
      db.securityAuditEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
    listAiUsage: (tenantId) =>
      db.aiUsageLog.findMany({
        where: { tenantId },
        include: {
          providerRecord: true,
          promptTemplateVersion: {
            select: { templateKey: true, version: true, templateSha: true },
          },
          errors: true,
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
    listErrors: (tenantId) =>
      db.aiErrorReport.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 250 }),
    updateMembershipRole: (tenantId, id, role) =>
      db.membership.updateMany({ where: { id, tenantId }, data: { role } }),
    findMembership: (tenantId, id) =>
      db.membership.findFirst({ where: { id, tenantId }, select: { id: true, role: true } }),
    async inviteMembership(tenantId, email, role) {
      const user = await db.authUser.findUnique({ where: { email } });
      if (!user) return null;
      return db.membership.upsert({
        where: { tenantId_userId: { tenantId, userId: user.id } },
        create: { tenantId, userId: user.id, role, status: "INVITED" },
        update: { role, status: "INVITED" },
      });
    },
    activateMembershipRole: (tenantId, id, role) =>
      db.membership.updateMany({ where: { id, tenantId }, data: { role, status: "ACTIVE" } }),
  };
}

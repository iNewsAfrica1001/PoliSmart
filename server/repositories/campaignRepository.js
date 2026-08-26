export function createCampaignRepository(database) {
  return {
    listForTenant(tenantId) {
      if (!tenantId) throw new TypeError("tenantId is required");
      return database.campaign.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    },
    findForTenant(tenantId, campaignId) {
      if (!tenantId || !campaignId) throw new TypeError("tenantId and campaignId are required");
      return database.campaign.findFirst({ where: { id: campaignId, tenantId } });
    },
    createForTenant(tenantId, data) {
      if (!tenantId) throw new TypeError("tenantId is required");
      return database.campaign.create({ data: { ...data, tenantId } });
    },
    updateForTenant(tenantId, campaignId, data) {
      if (!tenantId || !campaignId) throw new TypeError("tenantId and campaignId are required");
      return database.campaign.updateMany({ where: { id: campaignId, tenantId }, data });
    },
  };
}

import { AFROBAROMETER_MINIMUM_SAMPLE_SIZE } from "../config/afrobarometer.js";

export const COMMAND_CENTER_QUERY_COUNT = 13;

const countryCode = (country) => {
  const normalized = String(country || "")
    .trim()
    .toUpperCase();
  if (normalized === "NIGERIA" || normalized === "NG") return "NG";
  return null;
};

export function createCommandCenterRepository(database) {
  return {
    async campaignContext(tenantId, campaignId, geographicAreaId) {
      const campaign = await database.campaign.findFirst({
        where: { id: campaignId, tenantId },
        select: { id: true, country: true },
      });
      if (!campaign) return null;
      if (!geographicAreaId) return { campaign, selectedGeography: null };
      const code = countryCode(campaign.country);
      if (!code) return { campaign, selectedGeography: null };
      const selectedGeography = await database.campaignGeographicAssignment.findFirst({
        where: {
          tenantId,
          campaignId,
          masterGeographicAreaId: geographicAreaId,
          isActive: true,
          masterGeographicArea: {
            is: { countryCode: code, isActive: true, level: { is: { isActive: true } } },
          },
        },
        select: { masterGeographicAreaId: true },
      });
      return { campaign, selectedGeography };
    },
    async snapshot({ tenantId, campaignId, country, geographicAreaId, now = new Date() }) {
      const since = new Date(now.getTime() - 86_400_000);
      const eventWhere = {
        tenantId,
        campaignId,
        startsAt: { gte: now },
        ...(geographicAreaId ? { geographicAreaId } : {}),
      };
      const volunteerWhere = {
        tenantId,
        ...(geographicAreaId
          ? {
              preferredArea: {
                is: { id: geographicAreaId, tenantId, campaignId, isActive: true },
              },
            }
          : {}),
      };
      const results = await database.$transaction([
        database.campaign.findFirst({
          where: { id: campaignId, tenantId },
          select: {
            id: true,
            name: true,
            country: true,
            status: true,
            startsAt: true,
            endsAt: true,
          },
        }),
        database.campaignTask.groupBy({
          by: ["status"],
          where: { tenantId, campaignId },
          _count: { _all: true },
        }),
        database.campaignTask.findMany({
          where: { tenantId, campaignId, status: { in: ["AT_RISK", "BLOCKED"] } },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueAt: true,
            owner: { select: { displayName: true } },
          },
          orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
          take: 6,
        }),
        database.activity.findMany({
          where: { tenantId, campaignId },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            updatedAt: true,
            owner: { select: { displayName: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        }),
        database.campaignEvent.findMany({
          where: eventWhere,
          select: {
            id: true,
            title: true,
            type: true,
            startsAt: true,
            venue: true,
            status: true,
            geographicArea: { select: { id: true, name: true } },
          },
          orderBy: { startsAt: "asc" },
          take: 6,
        }),
        database.volunteer.groupBy({
          by: ["trainingStatus"],
          where: volunteerWhere,
          _count: { _all: true },
        }),
        database.knowledgeDocument.findMany({
          where: {
            tenantId,
            campaignId,
            approvalStatus: "APPROVED",
            processingStatus: "READY",
            category: { in: ["POLICY", "MANIFESTO", "RESEARCH"] },
          },
          select: { id: true, title: true, category: true, source: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 4,
        }),
        database.knowledgeDocument.findMany({
          where: {
            tenantId,
            campaignId,
            approvalStatus: "APPROVED",
            processingStatus: "READY",
            category: { in: ["SPEECH", "APPROVED_COMMUNICATION", "PUBLIC_REPORT"] },
          },
          select: { id: true, title: true, category: true, source: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 4,
        }),
        database.surveyAggregateResult.findMany({
          where: {
            isSuppressed: false,
            unweightedSampleSize: { gte: AFROBAROMETER_MINIMUM_SAMPLE_SIZE },
            surveyCountry: country ? { countryName: country } : undefined,
            indicatorDefinition: { isActive: true },
          },
          select: {
            responseCode: true,
            weightedPercentage: true,
            unweightedSampleSize: true,
            weightField: true,
            surveyCountry: { select: { countryName: true } },
            indicatorDefinition: {
              select: { indicatorName: true, category: true, questionCode: true },
            },
            surveyImport: {
              select: {
                surveyRound: true,
                dataSource: { select: { name: true, attribution: true, sourceUrl: true } },
              },
            },
          },
          orderBy: { unweightedSampleSize: "desc" },
          take: 6,
        }),
        database.campaignTask.count({ where: { tenantId, campaignId, updatedAt: { gte: since } } }),
        database.activity.count({ where: { tenantId, campaignId, updatedAt: { gte: since } } }),
        database.campaignEvent.count({
          where: { tenantId, campaignId, updatedAt: { gte: since } },
        }),
        database.knowledgeDocument.count({
          where: { tenantId, campaignId, approvalStatus: "APPROVED", updatedAt: { gte: since } },
        }),
      ]);
      const [
        campaign,
        taskStatus,
        tasksAtRisk,
        activities,
        events,
        volunteerStatus,
        policyWork,
        mediaDevelopments,
        intelligenceRows,
        changedTasks,
        changedActivities,
        changedEvents,
        changedKnowledge,
      ] = results;
      if (!campaign) return null;
      return {
        campaign,
        taskStatus,
        tasksAtRisk,
        activities,
        events,
        volunteerStatus,
        policyWork,
        mediaDevelopments,
        changedLast24Hours: changedTasks + changedActivities + changedEvents + changedKnowledge,
        intelligence: intelligenceRows.map((row) => ({
          country: row.surveyCountry.countryName,
          indicator: row.indicatorDefinition.indicatorName,
          category: row.indicatorDefinition.category,
          question: row.indicatorDefinition.questionCode,
          responseCode: row.responseCode,
          weightedPercentage: Number(row.weightedPercentage),
          unweightedSampleSize: row.unweightedSampleSize,
          weightField: row.weightField,
          surveyRound: row.surveyImport.surveyRound,
          source: row.surveyImport.dataSource.name,
          attribution: row.surveyImport.dataSource.attribution,
          sourceUrl: row.surveyImport.dataSource.sourceUrl,
        })),
      };
    },
    async geography(tenantId, campaignId, campaignCountry) {
      const code = countryCode(campaignCountry);
      if (!code) return [];
      const assignments = await database.campaignGeographicAssignment.findMany({
        where: {
          tenantId,
          campaignId,
          isActive: true,
          masterGeographicArea: {
            is: { countryCode: code, isActive: true, level: { is: { isActive: true } } },
          },
        },
        select: {
          masterGeographicArea: {
            select: {
              id: true,
              name: true,
              level: { select: { name: true, orderIndex: true } },
            },
          },
        },
        orderBy: [
          { masterGeographicArea: { level: { orderIndex: "asc" } } },
          { masterGeographicArea: { name: "asc" } },
          { masterGeographicAreaId: "asc" },
        ],
      });
      return assignments.map(({ masterGeographicArea }) => masterGeographicArea);
    },
  };
}

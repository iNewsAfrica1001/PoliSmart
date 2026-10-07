import { isValidNigeriaGeographicParent } from "../services/geographicManagement.js";

const areaSelect = {
  id: true,
  parentId: true,
  countryCode: true,
  name: true,
  code: true,
  isActive: true,
  level: { select: { id: true, name: true, orderIndex: true, isActive: true } },
};

export function createCampaignGeographyRepository(database) {
  const campaign = (tenantId, campaignId) =>
    database.campaign.findFirst({
      where: { id: campaignId, tenantId },
      select: { id: true, tenantId: true, name: true, country: true },
    });

  return {
    findCampaign: campaign,
    async listActiveAssignedOptions(tenantId, campaignId, countryCode, parentId = null) {
      if (parentId) {
        const parent = await database.campaignGeographicAssignment.findFirst({
          where: {
            tenantId,
            campaignId,
            isActive: true,
            masterGeographicArea: { is: { id: parentId, countryCode, isActive: true } },
          },
          select: { id: true },
        });
        if (!parent) return null;
      }
      const rows = await database.campaignGeographicAssignment.findMany({
        where: {
          tenantId,
          campaignId,
          isActive: true,
          masterGeographicArea: {
            is: { countryCode, isActive: true, parentId, level: { is: { isActive: true } } },
          },
        },
        select: { masterGeographicArea: { select: areaSelect } },
        orderBy: [
          { masterGeographicArea: { level: { orderIndex: "asc" } } },
          { masterGeographicArea: { name: "asc" } },
          { masterGeographicAreaId: "asc" },
        ],
        take: 100,
      });
      return rows.map((row) => row.masterGeographicArea);
    },
    async findActiveAssignedContext({ tenantId, campaignId, countryCode, masterAreaId }) {
      const ancestry = [];
      const visited = new Set();
      let areaId = masterAreaId;
      while (areaId) {
        if (ancestry.length >= 5 || visited.has(areaId)) return null;
        visited.add(areaId);
        const assignment = await database.campaignGeographicAssignment.findFirst({
          where: {
            tenantId,
            campaignId,
            isActive: true,
            masterGeographicArea: {
              is: { id: areaId, countryCode, isActive: true, level: { is: { isActive: true } } },
            },
          },
          select: { masterGeographicArea: { select: areaSelect } },
        });
        const area = assignment?.masterGeographicArea;
        if (!area) return null;
        const child = ancestry.at(-1);
        if (child && !isValidNigeriaGeographicParent(child.level.name, area.level.name))
          return null;
        ancestry.push(area);
        areaId = area.parentId;
      }
      const ordered = ancestry.reverse();
      if (
        !ordered.length ||
        ordered[0].level.name !== "Country" ||
        ordered[0].parentId ||
        ordered[0].countryCode !== countryCode
      )
        return null;
      return { selected: ordered.at(-1), ancestry: ordered };
    },
    async findActiveCountryAssignment(tenantId, campaignId, countryCode) {
      const assignment = await database.campaignGeographicAssignment.findFirst({
        where: {
          tenantId,
          campaignId,
          isActive: true,
          masterGeographicArea: {
            is: {
              countryCode,
              isActive: true,
              parentId: null,
              level: { is: { name: "Country", isActive: true } },
            },
          },
        },
        select: { masterGeographicArea: { select: areaSelect } },
      });
      return assignment?.masterGeographicArea || null;
    },
    async hierarchy(tenantId, campaignId, countryCode, filters) {
      if (filters.parentId) {
        const parent = await database.masterGeographicArea.findFirst({
          where: { id: filters.parentId, countryCode, isActive: true },
          select: { id: true },
        });
        if (!parent) return null;
      }
      const where = {
        countryCode,
        isActive: true,
        ...(filters.search
          ? { name: { contains: filters.search, mode: "insensitive" } }
          : { parentId: filters.parentId || null }),
        ...(filters.levelId ? { levelId: filters.levelId } : {}),
        ...(filters.assigned === undefined
          ? {}
          : {
              assignments: filters.assigned
                ? { some: { tenantId, campaignId, isActive: true } }
                : { none: { tenantId, campaignId, isActive: true } },
            }),
      };
      const [total, items] = await Promise.all([
        database.masterGeographicArea.count({ where }),
        database.masterGeographicArea.findMany({
          where,
          select: {
            id: true,
            parentId: true,
            countryCode: true,
            name: true,
            code: true,
            level: { select: { id: true, name: true, orderIndex: true } },
            assignments: {
              where: { tenantId, campaignId },
              select: { isActive: true, removedAt: true },
              take: 1,
            },
            _count: { select: { children: { where: { isActive: true } } } },
          },
          orderBy: [{ level: { orderIndex: "asc" } }, { name: "asc" }, { id: "asc" }],
          skip: (filters.page - 1) * filters.pageSize,
          take: filters.pageSize,
        }),
      ]);
      return { items, total };
    },
    async assignments(tenantId, campaignId, filters) {
      const where = {
        tenantId,
        campaignId,
        ...(filters.active === undefined ? {} : { isActive: filters.active }),
      };
      const [total, items] = await Promise.all([
        database.campaignGeographicAssignment.count({ where }),
        database.campaignGeographicAssignment.findMany({
          where,
          select: {
            id: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            removedAt: true,
            masterGeographicArea: {
              select: {
                id: true,
                parentId: true,
                name: true,
                code: true,
                countryCode: true,
                isActive: true,
                level: { select: { id: true, name: true, orderIndex: true } },
              },
            },
          },
          orderBy: [
            { masterGeographicArea: { level: { orderIndex: "asc" } } },
            { createdAt: "asc" },
          ],
          skip: (filters.page - 1) * filters.pageSize,
          take: filters.pageSize,
        }),
      ]);
      return { items, total };
    },
    async assign(tenantId, campaignId, actorId, masterAreaIds) {
      const [row] = await database.$queryRawUnsafe(
        "SELECT public.campaign_geography_assign($1::uuid,$2::uuid,$3::uuid,$4::uuid[]) AS result",
        tenantId,
        campaignId,
        actorId,
        masterAreaIds,
      );
      return row.result;
    },
    async deactivate(tenantId, campaignId, actorId, masterAreaIds) {
      const [row] = await database.$queryRawUnsafe(
        "SELECT public.campaign_geography_deactivate($1::uuid,$2::uuid,$3::uuid,$4::uuid[]) AS result",
        tenantId,
        campaignId,
        actorId,
        masterAreaIds,
      );
      return row.result;
    },
  };
}

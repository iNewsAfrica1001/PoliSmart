const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const fail = (message, status = 400, code = "INVALID_CAMPAIGN_GEOGRAPHY_REQUEST") => {
  throw Object.assign(new Error(message), { status, code });
};

const countryCode = (country) => {
  const normalized = String(country || "").trim().toUpperCase();
  if (normalized === "NIGERIA" || normalized === "NG") return "NG";
  fail("Campaign geography is unavailable for this campaign country.", 409, "COUNTRY_UNSUPPORTED");
};

const integer = (value, fallback, minimum, maximum, name) => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum)
    fail(`${name} is invalid.`);
  return parsed;
};

export function validateMasterAreaIds(value) {
  if (!Array.isArray(value) || value.length < 1) fail("masterAreaIds must be a non-empty array.");
  if (value.length > 500) fail("No more than 500 master areas may be submitted.", 413, "BULK_LIMIT_EXCEEDED");
  if (value.some((id) => typeof id !== "string" || !UUID.test(id)))
    fail("A master geographic area identifier is invalid.");
  return [...new Set(value)];
}

function pageResult(result, page, pageSize) {
  return {
    items: result.items,
    page,
    pageSize,
    total: result.total,
    totalPages: Math.ceil(result.total / pageSize),
  };
}

async function controlledMutation(operation) {
  try {
    return await operation();
  } catch (error) {
    const databaseMessage = String(error?.meta?.message || error?.message || "");
    if (databaseMessage.includes("Campaign not found."))
      fail("Campaign not found.", 404, "CAMPAIGN_NOT_FOUND");
    if (databaseMessage.includes("Campaign geography authorization failed."))
      fail("Campaign geography authorization failed.", 403, "CAMPAIGN_GEOGRAPHY_FORBIDDEN");
    if (
      databaseMessage.includes("master geographic area is inactive or unavailable") ||
      databaseMessage.includes("Master geographic ancestry is invalid") ||
      databaseMessage.includes("Campaign geography selection is")
    )
      fail("Campaign geography selection is invalid.", 400, "INVALID_CAMPAIGN_GEOGRAPHY_SELECTION");
    if (databaseMessage.includes("assigned descendant prevents geographic removal"))
      fail("An assigned descendant prevents geographic removal.", 409, "ASSIGNED_DESCENDANT_CONFLICT");
    throw error;
  }
}

export function createCampaignGeographyService(repository) {
  const requireCampaign = async (tenantId, campaignId) => {
    if (!UUID.test(String(campaignId || ""))) fail("Campaign not found.", 404, "CAMPAIGN_NOT_FOUND");
    const item = await repository.findCampaign(tenantId, campaignId);
    if (!item) fail("Campaign not found.", 404, "CAMPAIGN_NOT_FOUND");
    return item;
  };
  return {
    async hierarchy({ tenantId, campaignId, query = {} }) {
      const campaign = await requireCampaign(tenantId, campaignId);
      const allowed = new Set(["parentId", "levelId", "search", "page", "pageSize", "assigned"]);
      if (Object.keys(query).some((key) => !allowed.has(key))) fail("Unknown hierarchy query field.");
      for (const key of ["parentId", "levelId"])
        if (query[key] !== undefined && !UUID.test(String(query[key]))) fail(`${key} is invalid.`);
      const search = query.search === undefined ? undefined : String(query.search).trim();
      if (search && (search.length < 2 || search.length > 120)) fail("search is invalid.");
      if (query.assigned !== undefined && !["true", "false"].includes(String(query.assigned)))
        fail("assigned is invalid.");
      const page = integer(query.page, 1, 1, 1_000_000, "page");
      const pageSize = integer(query.pageSize, 50, 1, 100, "pageSize");
      const result = await repository.hierarchy(tenantId, campaignId, countryCode(campaign.country), {
        parentId: query.parentId ? String(query.parentId) : undefined,
        levelId: query.levelId ? String(query.levelId) : undefined,
        search: search || undefined,
        assigned: query.assigned === undefined ? undefined : query.assigned === "true",
        page,
        pageSize,
      });
      if (!result) fail("Geographic parent not found.", 404, "GEOGRAPHIC_PARENT_NOT_FOUND");
      return pageResult(result, page, pageSize);
    },
    async assignments({ tenantId, campaignId, query = {} }) {
      await requireCampaign(tenantId, campaignId);
      const allowed = new Set(["active", "page", "pageSize"]);
      if (Object.keys(query).some((key) => !allowed.has(key))) fail("Unknown assignment query field.");
      if (query.active !== undefined && !["true", "false"].includes(String(query.active)))
        fail("active is invalid.");
      const page = integer(query.page, 1, 1, 1_000_000, "page");
      const pageSize = integer(query.pageSize, 50, 1, 100, "pageSize");
      return pageResult(
        await repository.assignments(tenantId, campaignId, {
          active: query.active === undefined ? undefined : query.active === "true",
          page,
          pageSize,
        }),
        page,
        pageSize,
      );
    },
    async assign({ tenantId, campaignId, actorId, body }) {
      if (!body || Object.keys(body).some((key) => key !== "masterAreaIds")) fail("Unknown assignment field.");
      await requireCampaign(tenantId, campaignId);
      return controlledMutation(() =>
        repository.assign(tenantId, campaignId, actorId, validateMasterAreaIds(body.masterAreaIds)),
      );
    },
    async deactivate({ tenantId, campaignId, actorId, body }) {
      if (!body || Object.keys(body).some((key) => key !== "masterAreaIds")) fail("Unknown deactivation field.");
      await requireCampaign(tenantId, campaignId);
      return controlledMutation(() =>
        repository.deactivate(tenantId, campaignId, actorId, validateMasterAreaIds(body.masterAreaIds)),
      );
    },
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVercelApiRequest } from "../api/vercelRouting.js";
import { createCampaignGeographyService } from "../server/services/campaignGeography.js";

const tenantId = "10000000-0000-4000-8000-000000000001";
const campaignId = "20000000-0000-4000-8000-000000000002";

function serviceFixture() {
  const calls = [];
  const service = createCampaignGeographyService({
    findCampaign: async (tenant, campaign) =>
      tenant === tenantId && campaign === campaignId
        ? { id: campaignId, tenantId, country: "Nigeria" }
        : null,
    hierarchy: async (...args) => {
      calls.push(args);
      return { items: [], total: 0 };
    },
  });
  return { calls, service };
}

test("Vercel routing metadata is removed before strict hierarchy query validation", async () => {
  const request = {
    url: "/api/index?path=campaign-geography/example/hierarchy&page=2&pageSize=25",
    query: {
      path: `campaign-geography/${campaignId}/hierarchy`,
      page: "2",
      pageSize: "25",
    },
  };

  normalizeVercelApiRequest(request);

  assert.equal(request.url, `/api/campaign-geography/${campaignId}/hierarchy?page=2&pageSize=25`);
  assert.deepEqual(request.query, { page: "2", pageSize: "25" });

  const { calls, service } = serviceFixture();
  const result = await service.hierarchy({ tenantId, campaignId, query: request.query });
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 25);
  assert.deepEqual(calls[0].slice(0, 4), [
    tenantId,
    campaignId,
    "NG",
    {
      parentId: undefined,
      levelId: undefined,
      search: undefined,
      assigned: undefined,
      page: 2,
      pageSize: 25,
    },
  ]);
});

test("Vercel normalization preserves genuine unknown client query fields for rejection", async () => {
  const request = {
    url: "/api/index?path=campaign-geography/example/hierarchy&unexpected=true",
    query: {
      path: `campaign-geography/${campaignId}/hierarchy`,
      unexpected: "true",
    },
  };

  normalizeVercelApiRequest(request);

  assert.deepEqual(request.query, { unexpected: "true" });
  const { service } = serviceFixture();
  await assert.rejects(
    service.hierarchy({ tenantId, campaignId, query: request.query }),
    (error) => error.status === 400 && error.message === "Unknown hierarchy query field.",
  );
});

test("requests without Vercel routing metadata remain unchanged", async () => {
  const request = {
    url: `/api/campaign-geography/${campaignId}/hierarchy?assigned=true`,
    query: { assigned: "true" },
  };

  normalizeVercelApiRequest(request);

  assert.equal(request.url, `/api/campaign-geography/${campaignId}/hierarchy?assigned=true`);
  assert.deepEqual(request.query, { assigned: "true" });
  const { calls, service } = serviceFixture();
  await service.hierarchy({ tenantId, campaignId, query: request.query });
  assert.equal(calls[0][3].assigned, true);
});

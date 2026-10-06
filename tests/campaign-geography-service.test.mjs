import test from "node:test";
import assert from "node:assert/strict";
import { createCampaignGeographyService, validateMasterAreaIds } from "../server/services/campaignGeography.js";

const tenantId = "10000000-0000-4000-8000-000000000001";
const campaignId = "20000000-0000-4000-8000-000000000002";
const actorId = "30000000-0000-4000-8000-000000000003";
const areaId = "40000000-0000-4000-8000-000000000004";

function fixture(overrides = {}) {
  const calls = [];
  const repository = {
    findCampaign: async (tenant, campaign) =>
      tenant === tenantId && campaign === campaignId
        ? { id: campaignId, tenantId, country: "Nigeria" }
        : null,
    hierarchy: async (...args) => {
      calls.push(["hierarchy", ...args]);
      return { items: [{ id: areaId }], total: 1 };
    },
    assignments: async (...args) => {
      calls.push(["assignments", ...args]);
      return { items: [], total: 0 };
    },
    assign: async (...args) => {
      calls.push(["assign", ...args]);
      return { requested: args[3].length, added: args[3].length };
    },
    deactivate: async (...args) => {
      calls.push(["deactivate", ...args]);
      return { requested: args[3].length, deactivated: args[3].length };
    },
    ...overrides,
  };
  return { service: createCampaignGeographyService(repository), calls };
}

test("hierarchy is bounded, campaign scoped, and defaults to 50 rows", async () => {
  const { service, calls } = fixture();
  const result = await service.hierarchy({ tenantId, campaignId, query: {} });
  assert.equal(result.pageSize, 50);
  assert.deepEqual(calls[0].slice(0, 4), ["hierarchy", tenantId, campaignId, "NG"]);
  await assert.rejects(
    service.hierarchy({ tenantId, campaignId, query: { pageSize: "101" } }),
    (error) => error.status === 400,
  );
});

test("inaccessible campaigns fail closed and client tenant fields are rejected", async () => {
  const { service } = fixture();
  await assert.rejects(
    service.assign({ tenantId: "other", campaignId, actorId, body: { masterAreaIds: [areaId] } }),
    (error) => error.status === 404,
  );
  await assert.rejects(
    service.assign({ tenantId, campaignId, actorId, body: { tenantId, masterAreaIds: [areaId] } }),
    (error) => error.status === 400,
  );
  for (const field of ["actorId", "actor_id", "userId", "user_id", "createdById", "updatedById"])
    await assert.rejects(
      service.assign({
        tenantId,
        campaignId,
        actorId,
        body: { masterAreaIds: [areaId], [field]: "spoofed" },
      }),
      (error) => error.status === 400,
    );
});

test("bulk validation rejects malformed, unknown, and oversized inputs and deduplicates retry input", async () => {
  assert.throws(() => validateMasterAreaIds(["bad"]), { status: 400 });
  assert.throws(() => validateMasterAreaIds(Array.from({ length: 501 }, () => areaId)), {
    status: 413,
  });
  const { service, calls } = fixture();
  const result = await service.assign({
    tenantId,
    campaignId,
    actorId,
    body: { masterAreaIds: [areaId, areaId] },
  });
  assert.equal(result.requested, 1);
  assert.deepEqual(calls.at(-1), ["assign", tenantId, campaignId, actorId, [areaId]]);
});

test("assignment and deactivation preserve repository transaction results", async () => {
  const { service } = fixture();
  assert.deepEqual(
    await service.assign({ tenantId, campaignId, actorId, body: { masterAreaIds: [areaId] } }),
    { requested: 1, added: 1 },
  );
  assert.deepEqual(
    await service.deactivate({ tenantId, campaignId, actorId, body: { masterAreaIds: [areaId] } }),
    { requested: 1, deactivated: 1 },
  );
});

test("concurrent service calls remain isolated and delegate atomicity to the database functions", async () => {
  const { service, calls } = fixture();
  await Promise.all([
    service.assign({ tenantId, campaignId, actorId, body: { masterAreaIds: [areaId] } }),
    service.assign({ tenantId, campaignId, actorId, body: { masterAreaIds: [areaId] } }),
  ]);
  assert.equal(calls.filter(([name]) => name === "assign").length, 2);
});

test("database guard failures are mapped to stable sanitized API errors", async () => {
  const { service } = fixture({
    assign: async () => {
      throw Object.assign(new Error("Raw query failed"), {
        meta: { message: "ERROR: An assigned descendant prevents geographic removal.\nDETAIL: hidden" },
      });
    },
  });
  await assert.rejects(
    service.assign({ tenantId, campaignId, actorId, body: { masterAreaIds: [areaId] } }),
    (error) =>
      error.status === 409 &&
      error.code === "ASSIGNED_DESCENDANT_CONFLICT" &&
      error.message === "An assigned descendant prevents geographic removal.",
  );
});

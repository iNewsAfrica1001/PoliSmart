import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createOperationsRouter } from "../server/routes/operations.js";
import { createOperationsRepository } from "../server/repositories/operationsRepository.js";
import {
  GEOGRAPHIC_ACTIVATION_CONFIRMATION,
  NIGERIA_ACTIVATION_COUNTS,
} from "../server/services/geographicManagement.js";

const tenantId = "tenant-a";
const campaignId = "campaign-a";
const actorId = "actor-a";
const levelNames = Object.keys(NIGERIA_ACTIVATION_COUNTS);

function hierarchy() {
  const levels = levelNames.map((name, index) => ({
    id: `level-${index}`,
    tenantId,
    name,
    isActive: true,
  }));
  const areas = [];
  const add = (levelIndex, name, code, parentId = null) => {
    const item = {
      id: `area-${areas.length}`,
      tenantId,
      campaignId,
      levelId: levels[levelIndex].id,
      parentId,
      name,
      code,
      isActive: false,
    };
    areas.push(item);
    return item;
  };
  const country = add(0, "Nigeria", "NG");
  const zones = Array.from({ length: 6 }, (_, i) => add(1, `Zone ${i}`, `Z${i}`, country.id));
  const states = Array.from({ length: 37 }, (_, i) =>
    add(2, `State ${i}`, `S${i}`, zones[i % zones.length].id),
  );
  const lgas = Array.from({ length: 774 }, (_, i) =>
    add(3, `LGA ${i}`, `L${i}`, states[i % states.length].id),
  );
  Array.from({ length: 8809 }, (_, i) =>
    add(4, `Ward ${i}`, `W${i}`, lgas[i % lgas.length].id),
  );
  assert.equal(areas.length, 9627);
  return { levels, areas };
}

function atomicDatabase({ mutateFails = false, auditFails = false, optionsCapture } = {}) {
  const built = hierarchy();
  const state = {
    campaigns: [{ id: campaignId, tenantId }],
    levels: built.levels,
    areas: built.areas,
    audits: [],
  };
  let mutations = 0;
  const client = (draft) => ({
    campaign: {
      findFirst: async ({ where }) =>
        draft.campaigns.find((item) => item.id === where.id && item.tenantId === where.tenantId) ||
        null,
    },
    geographicLevel: {
      findMany: async ({ where }) => draft.levels.filter((item) => item.tenantId === where.tenantId),
    },
    geographicArea: {
      findMany: async ({ where }) =>
        draft.areas.filter(
          (item) => item.tenantId === where.tenantId && item.campaignId === where.campaignId,
        ),
      updateMany: async ({ where, data }) => {
        mutations += 1;
        let count = 0;
        for (const item of draft.areas)
          if (
            item.tenantId === where.tenantId &&
            item.campaignId === where.campaignId &&
            item.isActive === where.isActive
          ) {
            Object.assign(item, data);
            count += 1;
          }
        if (mutateFails) throw new Error("activation unavailable");
        return { count };
      },
    },
    securityAuditEvent: {
      create: async ({ data }) => {
        if (auditFails) throw new Error("audit unavailable");
        draft.audits.push(data);
        return data;
      },
    },
  });
  const database = {
    ...client(state),
    $transaction: async (callback, options) => {
      if (optionsCapture) optionsCapture.value = options;
      const draft = structuredClone(state);
      const result = await callback(client(draft));
      state.campaigns = draft.campaigns;
      state.levels = draft.levels;
      state.areas = draft.areas;
      state.audits = draft.audits;
      return result;
    },
  };
  return { database, state, mutationCount: () => mutations };
}

function appFor(role, repository) {
  const app = express();
  app.use(express.json());
  if (role)
    app.use((req, _res, next) => {
      req.auth = { user: { id: actorId, memberships: [{ tenantId, role }] } };
      next();
    });
  app.use("/operations", createOperationsRouter(repository));
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.status ? error.message : "Unexpected server error." }),
  );
  return app;
}

test("bulk activation requires authentication, authorization, tenant scope, and exact confirmation", async () => {
  for (const [role, organization, confirmation, status] of [
    [null, tenantId, GEOGRAPHIC_ACTIVATION_CONFIRMATION, 401],
    ["CAMPAIGN_ADMINISTRATOR", tenantId, GEOGRAPHIC_ACTIVATION_CONFIRMATION, 403],
    ["SUPER_ADMINISTRATOR", "tenant-b", GEOGRAPHIC_ACTIVATION_CONFIRMATION, 403],
    ["SUPER_ADMINISTRATOR", tenantId, undefined, 400],
    ["SUPER_ADMINISTRATOR", tenantId, `${GEOGRAPHIC_ACTIVATION_CONFIRMATION} `, 400],
  ]) {
    let calls = 0;
    const repository = { activateGeographicHierarchy: async () => (calls += 1) };
    await request(appFor(role, repository))
      .post(`/operations/${campaignId}/geography/activate`)
      .set("X-Organization-Id", organization)
      .send({ confirmation })
      .expect(status);
    assert.equal(calls, 0);
  }
});

test("valid 9,627-record hierarchy activates with one mutation and one atomic audit", async () => {
  const options = {};
  const { database, state, mutationCount } = atomicDatabase({ optionsCapture: options });
  const result = await createOperationsRepository(database).activateGeographicHierarchy(
    tenantId,
    campaignId,
    actorId,
  );
  assert.deepEqual({ targeted: result.rowsTargeted, activated: result.rowsActivated }, { targeted: 9627, activated: 9627 });
  assert.equal(state.areas.filter((item) => item.isActive).length, 9627);
  assert.equal(state.areas.filter((item) => !item.isActive).length, 0);
  assert.equal(mutationCount(), 1);
  assert.equal(state.audits.length, 1);
  assert.equal(state.audits[0].action, "GEOGRAPHIC_HIERARCHY_ACTIVATED");
  assert.deepEqual(
    {
      rowsTargeted: state.audits[0].metadata.rowsTargeted,
      rowsActivated: state.audits[0].metadata.rowsActivated,
      fullHierarchyActivation: state.audits[0].metadata.fullHierarchyActivation,
    },
    { rowsTargeted: 9627, rowsActivated: 9627, fullHierarchyActivation: true },
  );
  assert.deepEqual(options.value, { maxWait: 10_000, timeout: 30_000 });
});

test("successful route uses one server-side activation call", async () => {
  let call;
  const repository = {
    activateGeographicHierarchy: async (...args) => {
      call = args;
      return { rowsActivated: 9627 };
    },
  };
  const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/activate`)
    .set("X-Organization-Id", tenantId)
    .send({ confirmation: GEOGRAPHIC_ACTIVATION_CONFIRMATION, timeout: 1, chunkSize: 1 })
    .expect(201);
  assert.deepEqual(call, [tenantId, campaignId, actorId]);
  assert.equal(response.body.activated, 9627);
});

test("all-active repeat and mixed states reject without mutation or second audit", async () => {
  for (const stateType of ["all", "mixed"]) {
    const { database, state, mutationCount } = atomicDatabase();
    if (stateType === "all") for (const item of state.areas) item.isActive = true;
    else state.areas[0].isActive = true;
    const repository = createOperationsRepository(database);
    await assert.rejects(
      repository.activateGeographicHierarchy(tenantId, campaignId, actorId),
      stateType === "all" ? /already active/ : /mixed activation state/,
    );
    assert.equal(mutationCount(), 0);
    assert.equal(state.audits.length, 0);
  }
});

test("wrong campaign scope rejects before mutation", async () => {
  const { database, state, mutationCount } = atomicDatabase();
  await assert.rejects(
    createOperationsRepository(database).activateGeographicHierarchy(
      tenantId,
      "campaign-b",
      actorId,
    ),
    /unavailable in this organization/,
  );
  assert.equal(mutationCount(), 0);
  assert.equal(state.areas.some((item) => item.isActive), false);
  assert.equal(state.audits.length, 0);
});

test("fresh hierarchy defects reject before mutation", async () => {
  for (const defect of ["missing", "wrong-level", "cross-tenant", "cycle", "duplicate"]) {
    const { database, state, mutationCount } = atomicDatabase();
    const ward = state.areas.at(-1);
    if (defect === "missing") state.areas.pop();
    if (defect === "wrong-level") ward.parentId = state.areas[0].id;
    if (defect === "cross-tenant") ward.tenantId = "tenant-b";
    if (defect === "cycle") state.areas[0].parentId = ward.id;
    if (defect === "duplicate") ward.code = state.areas.at(-2).code;
    await assert.rejects(
      createOperationsRepository(database).activateGeographicHierarchy(tenantId, campaignId, actorId),
    );
    assert.equal(mutationCount(), 0);
    assert.equal(state.areas.some((item) => item.isActive), false);
    assert.equal(state.audits.length, 0);
  }
});

test("mutation and audit failures roll back the complete hierarchy", async () => {
  for (const failure of [{ mutateFails: true }, { auditFails: true }]) {
    const { database, state } = atomicDatabase(failure);
    await assert.rejects(
      createOperationsRepository(database).activateGeographicHierarchy(tenantId, campaignId, actorId),
    );
    assert.equal(state.areas.filter((item) => item.isActive).length, 0);
    assert.equal(state.audits.length, 0);
  }
});

test("activation failure logging is sanitized and client response remains generic", async () => {
  const entries = [];
  const original = console.error;
  console.error = (entry) => entries.push(entry);
  try {
    await request(
      appFor("SUPER_ADMINISTRATOR", {
        activateGeographicHierarchy: async () => {
          throw Object.assign(new Error("DATABASE_URL secret confirmation token"), {
            name: "PrismaClientKnownRequestError",
            code: "P2028",
          });
        },
      }),
    )
      .post(`/operations/${campaignId}/geography/activate`)
      .set("X-Organization-Id", tenantId)
      .send({ confirmation: GEOGRAPHIC_ACTIVATION_CONFIRMATION })
      .expect(500, { message: "Unexpected server error." });
  } finally {
    console.error = original;
  }
  const diagnostic = JSON.parse(entries[0]);
  assert.equal(diagnostic.operation, "FULL_HIERARCHY_ACTIVATION");
  assert.equal(diagnostic.prismaCode, "P2028");
  assert.equal(diagnostic.errorType, "PrismaClientKnownRequestError");
  assert.doesNotMatch(entries.join("\n"), /DATABASE_URL|secret|token|ACTIVATE AUTHORIZED/i);
});

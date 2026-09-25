import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createOperationsRouter } from "../server/routes/operations.js";
import { createOperationsRepository } from "../server/repositories/operationsRepository.js";
import { NIGERIA_GEOGRAPHIC_LEVELS } from "../server/services/geographicManagement.js";

const tenantId = "tenant-a";
const campaignId = "campaign-a";
const actorId = "actor-a";
const levelId = "00000000-0000-0000-0000-000000000001";
const areaId = "00000000-0000-0000-0000-000000000002";
const provenance = {
  sourceInstitution: "Reviewed institution",
  sourceDocument: "Reviewed dataset",
  sourceVersionDate: "2026-09-25",
  retrievalDate: "2026-09-26",
  validationStatus: "REVIEWED",
};
const importRow = {
  level: "State / FCT",
  name: "Reviewed area",
  code: "RA",
};

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
    res
      .status(error.status || 500)
      .json({ message: error.status ? error.message : "Unexpected server error." }),
  );
  return app;
}

function routeRepository() {
  const calls = { audits: [], importAudits: [], createdAreas: [], geographicWrites: 0, transactions: 0 };
  const levels = NIGERIA_GEOGRAPHIC_LEVELS.map((name, index) => ({
    id: index === 2 ? levelId : `level-${index}`,
    name,
    isActive: true,
  }));
  const repository = {
    listLevels: async () => levels,
    listAreas: async () => [],
    createGeographicLevel: async (_tenant, _actor, data) => {
      calls.geographicWrites += 1;
      return { id: levelId, ...data, isActive: true };
    },
    updateGeographicLevel: async () => ({ count: 1 }),
    createGeographicArea: async () => ({ id: areaId }),
    updateGeographicArea: async () => ({ count: 1 }),
    appendGeographicAudit: async (...args) => calls.audits.push(args),
    transaction: async (callback) => {
      calls.transactions += 1;
      const created = [];
      const transaction = {
        geographicArea: {
          create: async ({ data }) => {
            created.push(data);
            calls.createdAreas.push(data);
            calls.geographicWrites += 1;
            return { id: areaId, ...data };
          },
        },
        securityAuditEvent: { create: async ({ data }) => { calls.importAudits.push(data); return {}; } },
      };
      return callback(transaction);
    },
  };
  return { repository, calls };
}

test("geographic write routes reject unauthenticated and ordinary administrators", async () => {
  for (const [role, status] of [
    [null, 401],
    ["CAMPAIGN_ADMINISTRATOR", 403],
  ]) {
    const { repository, calls } = routeRepository();
    await request(appFor(role, repository))
      .post("/operations/geography/levels")
      .set("X-Organization-Id", tenantId)
      .send({ name: "Country", orderIndex: 0 })
      .expect(status);
    assert.equal(calls.geographicWrites, 0);
  }
});
test("geographic routes reject cross-tenant access before repository mutation", async () => {
  const { repository, calls } = routeRepository();
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post("/operations/geography/levels")
    .set("X-Organization-Id", "tenant-b")
    .send({ name: "Country", orderIndex: 0 })
    .expect(403);
  assert.equal(calls.geographicWrites, 0);
});

test("authorized Super Administrator reaches the atomic geographic mutation", async () => {
  const { repository, calls } = routeRepository();
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post("/operations/geography/levels")
    .set("X-Organization-Id", tenantId)
    .send({ name: "Country", orderIndex: 0 })
    .expect(201);
  assert.equal(calls.geographicWrites, 1);
});

test("VALIDATE and PREVIEW write durable audits but no geographic business state", async () => {
  for (const mode of ["VALIDATE", "PREVIEW"]) {
    const { repository, calls } = routeRepository();
    await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({ mode, provenance, rows: [importRow] })
      .expect(200);
    assert.equal(calls.geographicWrites, 0);
    assert.equal(calls.transactions, 0);
    assert.equal(calls.audits.length, 1);
    assert.equal(calls.audits[0][2], `GEOGRAPHIC_IMPORT_${mode}`);
    assert.equal(calls.audits[0][5].sourceVersionDate, "2026-09-25");
    assert.equal(calls.audits[0][5].retrievalDate, "2026-09-26");
  }
});

test("IMPORT requires exact confirmation before opening a transaction", async () => {
  for (const confirmation of [undefined, "incorrect"]) {
    const { repository, calls } = routeRepository();
    await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({ mode: "IMPORT", confirmation, provenance, rows: [importRow] })
      .expect(400);
    assert.equal(calls.transactions, 0);
    assert.equal(calls.geographicWrites, 0);
  }
  const { repository, calls } = routeRepository();
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({
      mode: "IMPORT",
      confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
      provenance,
      rows: [importRow],
    })
    .expect(201);
  assert.equal(calls.transactions, 1);
  assert.equal(calls.geographicWrites, 1);
  assert.equal(calls.createdAreas[0].sourceVersionDate.toISOString().slice(0, 10), "2026-09-25");
  assert.equal(calls.createdAreas[0].retrievalDate.toISOString().slice(0, 10), "2026-09-26");
  assert.equal(calls.importAudits[0].metadata.sourceVersionDate, "2026-09-25");
  assert.equal(calls.importAudits[0].metadata.retrievalDate, "2026-09-26");
});

test("imports preserve a null unpublished source version and distinct required retrieval date", async () => {
  const { repository, calls } = routeRepository();
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({
      mode: "IMPORT",
      confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
      provenance: { ...provenance, sourceVersionDate: undefined },
      rows: [importRow],
    })
    .expect(201);
  assert.equal(calls.createdAreas[0].sourceVersionDate, null);
  assert.equal(calls.createdAreas[0].retrievalDate.toISOString().slice(0, 10), "2026-09-26");
  assert.equal(calls.importAudits[0].metadata.sourceVersionDate, null);
  assert.equal(calls.importAudits[0].metadata.retrievalDate, "2026-09-26");
});

test("IMPORT audit failure rolls back every geographic insert", async () => {
  const { repository } = routeRepository();
  const persisted = [];
  repository.transaction = async (callback) => {
    const draft = [...persisted];
    const transaction = {
      geographicArea: {
        create: async ({ data }) => {
          const item = { id: areaId, ...data };
          draft.push(item);
          return item;
        },
      },
      securityAuditEvent: {
        create: async () => {
          throw new Error("audit unavailable");
        },
      },
    };
    const result = await callback(transaction);
    persisted.splice(0, persisted.length, ...draft);
    return result;
  };
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({
      mode: "IMPORT",
      confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
      provenance,
      rows: [importRow],
    })
    .expect(500);
  assert.equal(persisted.length, 0);
});

function atomicDatabase({ levelActive = true, parentActive = true, auditFails = false } = {}) {
  const state = {
    levels: [{ id: levelId, tenantId, isActive: levelActive }],
    areas: [
      { id: "parent", tenantId, campaignId, levelId, parentId: null, isActive: parentActive },
      { id: areaId, tenantId, campaignId, levelId, parentId: "parent", isActive: false },
    ],
    audits: [],
  };
  const client = (draft) => ({
    geographicLevel: {
      count: async ({ where }) =>
        draft.levels.filter(
          (item) =>
            item.id === where.id &&
            item.tenantId === where.tenantId &&
            item.isActive === where.isActive,
        ).length,
      create: async ({ data }) => {
        const item = { id: "new-level", isActive: true, ...data };
        draft.levels.push(item);
        return item;
      },
      updateMany: async ({ where, data }) => {
        const item = draft.levels.find(
          (candidate) => candidate.id === where.id && candidate.tenantId === where.tenantId,
        );
        if (!item) return { count: 0 };
        Object.assign(item, data);
        return { count: 1 };
      },
    },
    geographicArea: {
      findFirst: async ({ where }) =>
        draft.areas.find(
          (item) =>
            item.id === where.id &&
            item.tenantId === where.tenantId &&
            item.campaignId === where.campaignId,
        ) || null,
      findMany: async ({ where }) =>
        draft.areas.filter(
          (item) => item.tenantId === where.tenantId && item.campaignId === where.campaignId,
        ),
      count: async ({ where }) =>
        draft.areas.filter(
          (item) =>
            item.id === where.id &&
            item.tenantId === where.tenantId &&
            item.campaignId === where.campaignId &&
            item.isActive === where.isActive,
        ).length,
      create: async ({ data }) => {
        const item = { id: "new-area", isActive: true, ...data };
        draft.areas.push(item);
        return item;
      },
      updateMany: async ({ where, data }) => {
        const item = draft.areas.find(
          (candidate) =>
            candidate.id === where.id &&
            candidate.tenantId === where.tenantId &&
            candidate.campaignId === where.campaignId,
        );
        if (!item) return { count: 0 };
        Object.assign(item, data);
        return { count: 1 };
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
    $transaction: async (callback) => {
      const draft = structuredClone(state);
      const result = await callback(client(draft));
      Object.assign(state, draft);
      return result;
    },
  };
  return { database, state };
}

test("activation validates persisted level and parent dependencies", async () => {
  for (const configuration of [
    { levelActive: false, parentActive: true },
    { levelActive: true, parentActive: false },
  ]) {
    const { database, state } = atomicDatabase(configuration);
    const repository = createOperationsRepository(database);
    await assert.rejects(
      repository.updateGeographicArea(tenantId, campaignId, actorId, areaId, { isActive: true }),
      /inactive or unavailable/,
    );
    assert.equal(state.areas.find((item) => item.id === areaId).isActive, false);
    assert.equal(state.audits.length, 0);
  }
  const { database, state } = atomicDatabase();
  await createOperationsRepository(database).updateGeographicArea(
    tenantId,
    campaignId,
    actorId,
    areaId,
    { isActive: true },
  );
  assert.equal(state.areas.find((item) => item.id === areaId).isActive, true);
  assert.equal(state.audits.length, 1);
});

test("audit persistence failure rolls back the associated geographic mutation", async () => {
  const { database, state } = atomicDatabase({ auditFails: true });
  const repository = createOperationsRepository(database);
  await assert.rejects(
    repository.updateGeographicArea(tenantId, campaignId, actorId, areaId, { isActive: true }),
    /audit unavailable/,
  );
  assert.equal(state.areas.find((item) => item.id === areaId).isActive, false);
  assert.equal(state.audits.length, 0);
});

test("audit failure rolls back level and area creation", async () => {
  const { database, state } = atomicDatabase({ auditFails: true });
  const repository = createOperationsRepository(database);
  await assert.rejects(
    repository.createGeographicLevel(tenantId, actorId, { name: "New level", orderIndex: 8 }),
    /audit unavailable/,
  );
  assert.equal(
    state.levels.some((item) => item.id === "new-level"),
    false,
  );
  await assert.rejects(
    repository.createGeographicArea(tenantId, campaignId, actorId, {
      levelId,
      name: "New area",
      code: "NEW",
    }),
    /audit unavailable/,
  );
  assert.equal(
    state.areas.some((item) => item.id === "new-area"),
    false,
  );
  assert.equal(state.audits.length, 0);
});

test("cross-tenant and cross-campaign parents are rejected executably", async () => {
  for (const parent of [
    { id: "foreign", tenantId: "tenant-b", campaignId, isActive: true },
    { id: "foreign", tenantId, campaignId: "campaign-b", isActive: true },
  ]) {
    const state = {
      areas: [parent],
      levels: [{ id: levelId, tenantId, isActive: true }],
      audits: [],
    };
    const database = {
      $transaction: async (callback) =>
        callback({
          geographicLevel: {
            count: async ({ where }) =>
              state.levels.filter(
                (item) =>
                  item.id === where.id &&
                  item.tenantId === where.tenantId &&
                  item.isActive === where.isActive,
              ).length,
          },
          geographicArea: {
            count: async ({ where }) =>
              state.areas.filter(
                (item) =>
                  item.id === where.id &&
                  item.tenantId === where.tenantId &&
                  item.campaignId === where.campaignId &&
                  item.isActive === where.isActive,
              ).length,
            create: async () => {
              throw new Error("must not create");
            },
          },
          securityAuditEvent: {
            create: async () => {
              throw new Error("must not audit");
            },
          },
        }),
    };
    await assert.rejects(
      createOperationsRepository(database).createGeographicArea(tenantId, campaignId, actorId, {
        levelId,
        parentId: "foreign",
        name: "Area",
        code: "A",
      }),
      /inactive or unavailable/,
    );
    assert.equal(state.audits.length, 0);
  }
});

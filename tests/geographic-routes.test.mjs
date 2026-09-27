import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createOperationsRouter } from "../server/routes/operations.js";
import { createOperationsRepository } from "../server/repositories/operationsRepository.js";
import {
  GEOGRAPHIC_IMPORT_LIMITS,
  NIGERIA_GEOGRAPHIC_LEVELS,
} from "../server/services/geographicManagement.js";

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
function completeHierarchyRows() {
  const rows = [{ level: "Country", name: "Nigeria", code: "NG" }];
  for (let index = 0; index < 6; index += 1)
    rows.push({
      level: "Geopolitical Zone",
      name: `Zone ${index}`,
      code: `Z${index}`,
      parentLevel: "Country",
      parentCode: "NG",
    });
  for (let index = 0; index < 37; index += 1)
    rows.push({
      level: "State / FCT",
      name: `State ${index}`,
      code: `S${index}`,
      parentLevel: "Geopolitical Zone",
      parentCode: `Z${index % 6}`,
    });
  for (let index = 0; index < 774; index += 1)
    rows.push({
      level: "Local Government Area / FCT Area Council",
      name: `LGA ${index}`,
      code: `L${index}`,
      parentLevel: "State / FCT",
      parentCode: `S${index % 37}`,
    });
  for (let index = 0; index < 8809; index += 1)
    rows.push({
      level: "Ward / Registration Area",
      name: `Ward ${index}`,
      code: `W${index}`,
      parentLevel: "Local Government Area / FCT Area Council",
      parentCode: `L${index % 774}`,
    });
  return rows;
}

function independentImportRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    level: "State / FCT",
    name: `Reviewed area ${index}`,
    code: `PERF-${index}`,
  }));
}

function appFor(role, repository) {
  const app = express();
  app.use(express.json({ limit: GEOGRAPHIC_IMPORT_LIMITS.validateJsonBody }));
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
  const calls = {
    audits: [],
    importAudits: [],
    createdAreas: [],
    geographicWrites: 0,
    transactions: 0,
    bulkInserts: 0,
    administrativeReads: [],
  };
  const levels = NIGERIA_GEOGRAPHIC_LEVELS.map((name, index) => ({
    id: index === 2 ? levelId : `level-${index}`,
    name,
    isActive: true,
  }));
  const repository = {
    listLevels: async () => levels,
    listAreas: async () => [],
    listAdministrativeAreas: async (...args) => {
      calls.administrativeReads.push(args);
      return { items: [], page: args[2].page, pageSize: args[2].pageSize, total: 9627, totalPages: 386 };
    },
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
          createManyAndReturn: async ({ data }) => {
            calls.bulkInserts += 1;
            const items = data.map((item, index) => ({
              id: `${areaId}-${calls.createdAreas.length + index}`,
              ...item,
            }));
            created.push(...items);
            calls.createdAreas.push(...items);
            calls.geographicWrites += items.length;
            return items;
          },
        },
        securityAuditEvent: {
          create: async ({ data }) => {
            calls.importAudits.push(data);
            return {};
          },
        },
      };
      return callback(transaction);
    },
  };
  return { repository, calls };
}

test("administrative geography reads are authorized, scoped, filtered, and bounded", async () => {
  const { repository, calls } = routeRepository();
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .get(`/operations/${campaignId}/geography/admin-areas`)
    .query({ page: 2, pageSize: 25, parentId: "parent-a", levelId: "level-a", active: "true", search: "Abaji" })
    .set("X-Organization-Id", tenantId)
    .expect(200)
    .expect(({ body }) => {
      assert.equal(body.items.length, 0);
      assert.equal(body.total, 9627);
    });
  assert.deepEqual(calls.administrativeReads[0], [tenantId, campaignId, {
    page: 2,
    pageSize: 25,
    levelId: "level-a",
    parentId: "parent-a",
    rootOnly: false,
    isActive: true,
    search: "Abaji",
  }]);
});

test("administrative geography reads reject unauthorized users and unbounded page sizes", async () => {
  for (const role of [null, "CAMPAIGN_ADMINISTRATOR"]) {
    const { repository, calls } = routeRepository();
    await request(appFor(role, repository))
      .get(`/operations/${campaignId}/geography/admin-areas`)
      .set("X-Organization-Id", tenantId)
      .expect(role ? 403 : 401);
    assert.equal(calls.administrativeReads.length, 0);
  }
  const { repository, calls } = routeRepository();
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .get(`/operations/${campaignId}/geography/admin-areas?pageSize=9627`)
    .set("X-Organization-Id", tenantId)
    .expect(400);
  assert.equal(calls.administrativeReads.length, 0);
});

test("administrative repository pages a 9,627-record hierarchy without fetching it all", async () => {
  const observed = {};
  const database = {
    geographicArea: {
      count: async (args) => {
        if (args.where.id) return 1;
        observed.countWhere = args.where;
        return 9627;
      },
      findMany: async (args) => {
        observed.findMany = args;
        return Array.from({ length: args.take }, (_, index) => ({ id: `area-${index}` }));
      },
    },
    geographicLevel: { count: async () => 1 },
    $transaction: (queries) => Promise.all(queries),
  };
  const result = await createOperationsRepository(database).listAdministrativeAreas(
    tenantId,
    campaignId,
    { page: 2, pageSize: 25, parentId: "parent-a", isActive: true, search: "Ward" },
  );
  assert.equal(result.items.length, 25);
  assert.equal(result.total, 9627);
  assert.equal(result.totalPages, 386);
  assert.equal(observed.findMany.take, 25);
  assert.equal(observed.findMany.skip, 25);
  assert.equal(observed.findMany.where.tenantId, tenantId);
  assert.equal(observed.findMany.where.campaignId, campaignId);
  assert.equal(observed.findMany.where.parentId, "parent-a");
  assert.equal(observed.findMany.where.isActive, true);
  assert.deepEqual(observed.findMany.orderBy, [
    { level: { orderIndex: "asc" } },
    { name: "asc" },
    { id: "asc" },
  ]);
});

test("administrative repository rejects parent and level filters outside the scoped campaign", async () => {
  let reads = 0;
  const database = {
    geographicArea: {
      count: async ({ where }) => (where.id ? 0 : 9627),
      findMany: async () => {
        reads += 1;
        return [];
      },
    },
    geographicLevel: { count: async () => 0 },
    $transaction: (queries) => Promise.all(queries),
  };
  const repository = createOperationsRepository(database);
  await assert.rejects(
    repository.listAdministrativeAreas(tenantId, campaignId, {
      page: 1, pageSize: 25, parentId: "outside-parent",
    }),
    /parent is not available/,
  );
  await assert.rejects(
    repository.listAdministrativeAreas(tenantId, campaignId, {
      page: 1, pageSize: 25, levelId: "outside-level",
    }),
    /level is not available/,
  );
  assert.equal(reads, 0);
});

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
test("all controlled modes resolve reviewed inactive imported parents consistently", async () => {
  const inactiveState = {
    id: "state-a",
    tenantId,
    campaignId,
    level: { name: "State / FCT" },
    code: "01",
    isActive: false,
    importedAt: new Date("2026-09-25T00:00:00Z"),
    validationStatus: "VALIDATED",
  };
  const child = {
    level: "Local Government Area / FCT Area Council",
    name: "Reviewed LGA",
    code: "LGA-01",
    parentLevel: "State / FCT",
    parentCode: "01",
  };

  for (const mode of ["VALIDATE", "PREVIEW", "IMPORT"]) {
    const { repository, calls } = routeRepository();
    repository.listAreas = async (actualTenantId, actualCampaignId) => {
      assert.equal(actualTenantId, tenantId);
      assert.equal(actualCampaignId, campaignId);
      return [inactiveState];
    };
    const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({
        mode,
        confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
        provenance,
        rows: [child],
      })
      .expect(mode === "IMPORT" ? 201 : 200);
    if (mode === "IMPORT") {
      assert.equal(calls.transactions, 1);
      assert.equal(calls.createdAreas.length, 1);
      assert.equal(calls.createdAreas[0].isActive, false);
    } else {
      assert.equal(response.body.report.rowsValid, 1);
      assert.equal(response.body.report.rowsRejected, 0);
      assert.equal(calls.transactions, 0);
      assert.equal(calls.geographicWrites, 0);
    }
  }
});
test("all controlled modes reject inactive parents without import evidence", async () => {
  for (const mode of ["VALIDATE", "PREVIEW", "IMPORT"]) {
    const { repository, calls } = routeRepository();
    repository.listAreas = async () => [
      {
        id: "state-a",
        tenantId,
        campaignId,
        level: { name: "State / FCT" },
        code: "01",
        isActive: false,
        importedAt: null,
        validationStatus: "VALIDATED",
      },
    ];
    const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({
        mode,
        confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
        provenance,
        rows: [
          {
            level: "Local Government Area / FCT Area Council",
            name: "Reviewed LGA",
            code: "LGA-01",
            parentLevel: "State / FCT",
            parentCode: "01",
          },
        ],
      })
      .expect(mode === "IMPORT" ? 400 : 200);
    if (mode !== "IMPORT") {
      assert.equal(response.body.report.rowsRejected, 1);
      assert.equal(response.body.report.rejected[0].reason, "INACTIVE_PARENT");
    }
    assert.equal(calls.transactions, 0);
    assert.equal(calls.geographicWrites, 0);
  }
});
test("VALIDATE and PREVIEW receive only their server-controlled row allowances", async () => {
  const largeRows = Array(GEOGRAPHIC_IMPORT_LIMITS.rows + 1).fill(null);
  for (const mode of ["VALIDATE", "PREVIEW"]) {
    const { repository, calls } = routeRepository();
    const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({ mode, provenance, rows: largeRows })
      .expect(200);
    assert.equal(response.body.report.rowsReceived, largeRows.length);
    assert.equal(calls.geographicWrites, 0);
    assert.equal(calls.transactions, 0);
    assert.equal(calls.audits.length, 1);
  }
  {
    const { repository, calls } = routeRepository();
    await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({
        mode: "IMPORT",
        confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
        provenance,
        rows: largeRows,
      })
      .expect(413);
    assert.equal(calls.geographicWrites, 0);
    assert.equal(calls.transactions, 0);
    assert.equal(calls.audits.length, 0);
  }
});
test("PREVIEW resolves and audits a complete 9,627-row hierarchy without business writes", async () => {
  const { repository, calls } = routeRepository();
  const rows = completeHierarchyRows();
  const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({ mode: "PREVIEW", provenance, rows })
    .expect(200);
  assert.equal(response.body.report.rowsReceived, 9627);
  assert.equal(response.body.report.rowsValid, 9627);
  assert.equal(response.body.report.rowsRejected, 0);
  assert.equal(calls.geographicWrites, 0);
  assert.equal(calls.transactions, 0);
  assert.equal(calls.audits.length, 1);
  assert.equal(calls.audits[0][2], "GEOGRAPHIC_IMPORT_PREVIEW");
});
test("VALIDATE and PREVIEW fail closed above 12,000 rows while IMPORT remains capped at 5,000", async () => {
  for (const [mode, limit] of [
    ["VALIDATE", GEOGRAPHIC_IMPORT_LIMITS.validateRows],
    ["PREVIEW", GEOGRAPHIC_IMPORT_LIMITS.previewRows],
    ["IMPORT", GEOGRAPHIC_IMPORT_LIMITS.rows],
  ]) {
    const { repository, calls } = routeRepository();
    await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({
        mode,
        confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
        provenance,
        rows: Array(limit + 1).fill(null),
        rowLimit: Number.MAX_SAFE_INTEGER,
      })
      .expect(413);
    assert.equal(calls.geographicWrites, 0);
    assert.equal(calls.transactions, 0);
    assert.equal(calls.audits.length, 0);
  }
});
test("VALIDATE resolves and audits a complete 9,627-row hierarchy without business writes", async () => {
  const { repository, calls } = routeRepository();
  const rows = completeHierarchyRows();
  assert.equal(rows.length, 9627);
  const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({ mode: "VALIDATE", provenance, rows })
    .expect(200);
  assert.equal(response.body.report.rowsReceived, 9627);
  assert.equal(response.body.report.rowsValid, 9627);
  assert.equal(response.body.report.rowsRejected, 0);
  assert.equal(calls.geographicWrites, 0);
  assert.equal(calls.transactions, 0);
  assert.equal(calls.audits.length, 1);
  assert.equal(calls.audits[0][2], "GEOGRAPHIC_IMPORT_VALIDATE");
});
test("ordinary administrators cannot use enlarged VALIDATE or PREVIEW paths", async () => {
  for (const mode of ["VALIDATE", "PREVIEW"]) {
    const { repository, calls } = routeRepository();
    await request(appFor("CAMPAIGN_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({
        mode,
        provenance,
        rows: Array(GEOGRAPHIC_IMPORT_LIMITS.rows + 1).fill(null),
      })
      .expect(403);
    assert.equal(calls.geographicWrites, 0);
    assert.equal(calls.audits.length, 0);
  }
});

test("IMPORT requires exact confirmation before opening a transaction", async () => {
  for (const confirmation of [undefined, "incorrect"]) {
    const { repository, calls } = routeRepository();
    const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({ mode: "IMPORT", confirmation, provenance, rows: [importRow] })
      .expect(400);
    assert.equal(response.body.message, "Import confirmation must exactly match the required phrase.");
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
  assert.equal(calls.createdAreas[0].isActive, false);
  assert.equal(calls.createdAreas[0].sourceVersionDate.toISOString().slice(0, 10), "2026-09-25");
  assert.equal(calls.createdAreas[0].retrievalDate.toISOString().slice(0, 10), "2026-09-26");
  assert.equal(calls.importAudits[0].metadata.sourceVersionDate, "2026-09-25");
  assert.equal(calls.importAudits[0].metadata.retrievalDate, "2026-09-26");
  assert.equal(calls.importAudits[0].metadata.importedInactive, true);
  assert.equal(calls.importAudits[0].metadata.rowsSubmitted, 1);
});
test("IMPORT reports rejected rows distinctly without opening a transaction", async () => {
  const { repository, calls } = routeRepository();
  const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({
      mode: "IMPORT",
      confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
      provenance,
      rows: [{}],
    })
    .expect(400);
  assert.equal(
    response.body.message,
    "Import requires all submitted rows to pass fresh validation.",
  );
  assert.equal(calls.transactions, 0);
  assert.equal(calls.geographicWrites, 0);
  assert.equal(calls.importAudits.length, 0);
});

test("controlled IMPORT bulk-writes 774, 4,500, and 5,000 rows in one layer", async () => {
  for (const count of [774, 4500, 5000]) {
    const { repository, calls } = routeRepository();
    const response = await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({
        mode: "IMPORT",
        confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
        provenance,
        rows: independentImportRows(count),
      })
      .expect(201);
    assert.equal(response.body.imported, count);
    assert.equal(calls.bulkInserts, Math.ceil(count / 1000));
    assert.equal(calls.geographicWrites, count);
    assert.equal(calls.createdAreas.every((item) => item.isActive === false), true);
    assert.equal(calls.importAudits.length, 1);
    assert.equal(calls.importAudits[0].metadata.rowsSubmitted, count);
    assert.equal(calls.importAudits[0].metadata.rowsImported, count);
    assert.equal(calls.importAudits[0].metadata.importedInactive, true);
  }
});

test("controlled IMPORT rejects 5,001 rows before transaction or writes", async () => {
  const { repository, calls } = routeRepository();
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({
      mode: "IMPORT",
      confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
      provenance,
      rows: independentImportRows(5001),
    })
    .expect(413);
  assert.equal(calls.transactions, 0);
  assert.equal(calls.geographicWrites, 0);
  assert.equal(calls.importAudits.length, 0);
});

test("IMPORT ignores client activation input and always creates inactive areas", async () => {
  const { repository, calls } = routeRepository();
  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({
      mode: "IMPORT",
      confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
      provenance,
      rows: [{ ...importRow, isActive: true }],
    })
    .expect(201);
  assert.equal(calls.createdAreas[0].isActive, false);
});

test("four staged IMPORT batches resolve inactive parents and remain inactive", async () => {
  const allRows = completeHierarchyRows();
  const batches = [
    allRows.slice(0, 44),
    allRows.slice(44, 818),
    allRows.slice(818, 5318),
    allRows.slice(5318),
  ];
  const state = { areas: [], audits: [] };
  const levels = NIGERIA_GEOGRAPHIC_LEVELS.map((name, index) => ({
    id: `level-${index}`,
    name,
    isActive: true,
  }));
  const repository = {
    listLevels: async () => levels,
    listAreas: async (_tenant, requestedCampaign) =>
      state.areas.filter((item) => item.campaignId === requestedCampaign),
    appendGeographicAudit: async () => {
      throw new Error("not expected");
    },
    transaction: async (callback) => {
      const draft = structuredClone(state);
      const transaction = {
        geographicArea: {
          createManyAndReturn: async ({ data }) => {
            const items = data.map((entry, index) => {
              const level = levels.find((item) => item.id === entry.levelId);
              return { id: `area-${draft.areas.length + index + 1}`, ...entry, level };
            });
            draft.areas.push(...items);
            return items;
          },
        },
        securityAuditEvent: {
          create: async ({ data }) => {
            draft.audits.push(data);
            return data;
          },
        },
      };
      const result = await callback(transaction);
      state.areas = draft.areas;
      state.audits = draft.audits;
      return result;
    },
  };
  const expectedCounts = [44, 818, 5318, 9627];
  for (let index = 0; index < batches.length; index += 1) {
    await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({
        mode: "IMPORT",
        confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
        provenance,
        rows: batches[index],
      })
      .expect(201);
    assert.equal(state.areas.length, expectedCounts[index]);
    assert.equal(state.areas.every((item) => item.isActive === false), true);
  }
  assert.equal(state.audits.length, 4);

  await request(appFor("SUPER_ADMINISTRATOR", repository))
    .post(`/operations/${campaignId}/geography/import`)
    .set("X-Organization-Id", tenantId)
    .send({
      mode: "IMPORT",
      confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
      provenance,
      rows: batches[0],
    })
    .expect(400);
  assert.equal(state.areas.length, 9627);
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
        createManyAndReturn: async ({ data }) => {
          const items = data.map((item, index) => ({ id: `${areaId}-${index}`, ...item }));
          draft.push(...items);
          return items;
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

test("IMPORT insert failure rolls back rows and creates no audit", async () => {
  const { repository, calls } = routeRepository();
  const persisted = [];
  repository.transaction = async (callback) => {
    const draft = [...persisted];
    const transaction = {
      geographicArea: {
        createManyAndReturn: async ({ data }) => {
          draft.push(...data);
          throw Object.assign(new Error("database detail must stay private"), {
            name: "PrismaClientKnownRequestError",
            code: "P2002",
          });
        },
      },
      securityAuditEvent: {
        create: async ({ data }) => calls.importAudits.push(data),
      },
    };
    const result = await callback(transaction);
    persisted.splice(0, persisted.length, ...draft);
    return result;
  };
  const entries = [];
  const originalError = console.error;
  console.error = (entry) => entries.push(entry);
  try {
    await request(appFor("SUPER_ADMINISTRATOR", repository))
      .post(`/operations/${campaignId}/geography/import`)
      .set("X-Organization-Id", tenantId)
      .send({
        mode: "IMPORT",
        confirmation: "IMPORT AUTHORIZED GEOGRAPHIC DATA",
        provenance,
        rows: [importRow],
      })
      .expect(500, { message: "Unexpected server error." });
  } finally {
    console.error = originalError;
  }
  assert.equal(persisted.length, 0);
  assert.equal(calls.importAudits.length, 0);
  const diagnostic = JSON.parse(entries[0]);
  assert.deepEqual(
    {
      event: diagnostic.event,
      mode: diagnostic.mode,
      rowsSubmitted: diagnostic.rowsSubmitted,
      prismaCode: diagnostic.prismaCode,
      errorType: diagnostic.errorType,
    },
    {
      event: "geographic-controlled-import-failed",
      mode: "IMPORT",
      rowsSubmitted: 1,
      prismaCode: "P2002",
      errorType: "PrismaClientKnownRequestError",
    },
  );
  assert.equal(Number.isSafeInteger(diagnostic.durationMs), true);
  assert.doesNotMatch(entries.join("\n"), /database detail|DATABASE_URL|token|password/i);
});

test("geographic import transaction uses bounded server-controlled timing", async () => {
  let options;
  const repository = createOperationsRepository({
    $transaction: async (callback, suppliedOptions) => {
      options = suppliedOptions;
      return callback({});
    },
  });
  await repository.transaction(async () => "ok");
  assert.deepEqual(options, { maxWait: 10_000, timeout: 30_000 });
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

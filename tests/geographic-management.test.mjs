import test from "node:test";
import assert from "node:assert/strict";
import {
  GEOGRAPHIC_IMPORT_LIMITS,
  NIGERIA_GEOGRAPHIC_LEVELS,
  assertNoAreaCycle,
  validateGeographicRows,
  validateProvenance,
} from "../server/services/geographicManagement.js";
import { PERMISSIONS, ROLES, ROLE_PERMISSION_POLICY } from "../server/config/authorization.js";
import { readFileSync } from "node:fs";
const levels = NIGERIA_GEOGRAPHIC_LEVELS.map((name, index) => ({
  id: `l${index}`,
  name,
  orderIndex: index,
  isActive: true,
}));
const row = (level, name, code, parentLevel = "", parentCode = "") => ({
  level,
  name,
  code,
  parentLevel,
  parentCode,
});
test("Nigeria terminology and authorization are exact", () => {
  assert.equal(NIGERIA_GEOGRAPHIC_LEVELS.length, 7);
  for (const [role, p] of Object.entries(ROLE_PERMISSION_POLICY))
    assert.equal(p.includes(PERMISSIONS.GEOGRAPHY_MANAGE), role === ROLES.SUPER_ADMINISTRATOR);
});
test("malformed rows and field bounds are controlled", () => {
  const r = validateGeographicRows({
    rows: [null, [], "x", 1, true, {}, row("State / FCT", "x".repeat(121), "X")],
    levels,
  });
  assert.equal(r.rowsRejected, 7);
  assert.throws(
    () =>
      validateGeographicRows({ rows: Array(GEOGRAPHIC_IMPORT_LIMITS.rows + 1).fill({}), levels }),
    /limit/,
  );
});
test("inactive levels and inactive parents are rejected", () => {
  const inactive = levels.map((l, i) => (i === 2 ? { ...l, isActive: false } : l));
  assert.equal(
    validateGeographicRows({ rows: [row("State / FCT", "A", "A")], levels: inactive }).rejected[0]
      .reason,
    "INACTIVE_OR_UNKNOWN_LEVEL",
  );
  const existing = [
    {
      id: "p",
      levelId: levels[2].id,
      level: { name: "State / FCT" },
      name: "P",
      code: "P",
      isActive: false,
    },
  ];
  assert.equal(
    validateGeographicRows({
      rows: [row("Ward / Registration Area", "W", "W", "State / FCT", "P")],
      levels,
      existingAreas: existing,
    }).rejected[0].reason,
    "INACTIVE_PARENT",
  );
});
test("forward parents resolve deterministically and reports contain no internal ids", () => {
  const r = validateGeographicRows({
    rows: [
      row("Ward / Registration Area", "Ward", "W", "State / FCT", "S"),
      row("State / FCT", "State", "S"),
    ],
    levels,
  });
  assert.equal(r.rowsRejected, 0);
  assert.deepEqual(
    r.plan.map((x) => x.code),
    ["S", "W"],
  );
  assert.doesNotMatch(JSON.stringify(r), /levelId|"id"/);
});
test("ambiguous and unresolved parents fail", () => {
  const existing = [
    { id: "1", level: { name: "State / FCT" }, name: "A", code: "S" },
    { id: "2", level: { name: "State / FCT" }, name: "B", code: "S" },
  ];
  assert.equal(
    validateGeographicRows({
      rows: [row("Ward / Registration Area", "W", "W", "State / FCT", "S")],
      levels,
      existingAreas: existing,
    }).rejected[0].reason,
    "AMBIGUOUS_PARENT",
  );
  assert.equal(
    validateGeographicRows({
      rows: [row("Ward / Registration Area", "W", "W", "State / FCT", "X")],
      levels,
    }).rejected[0].reason,
    "INVALID_PARENT",
  );
});
test("children of rejected imported parents are also rejected", () => {
  const result = validateGeographicRows({
    rows: [
      row("State / FCT", "Broken", "S", "State / FCT", "MISSING"),
      row("Ward / Registration Area", "Child", "W", "State / FCT", "S"),
    ],
    levels,
  });
  assert.equal(result.rowsRejected, 2);
  assert.deepEqual(
    result.rejected.map((item) => item.reason),
    ["INVALID_PARENT", "INVALID_PARENT"],
  );
});
test("self, two-node, multi-node, and existing hierarchy cycles fail", () => {
  assert.equal(
    validateGeographicRows({ rows: [row("State / FCT", "A", "A", "State / FCT", "A")], levels })
      .rejected[0].reason,
    "SELF_PARENT",
  );
  assert.throws(
    () =>
      validateGeographicRows({
        rows: [
          row("State / FCT", "A", "A", "State / FCT", "B"),
          row("State / FCT", "B", "B", "State / FCT", "A"),
        ],
        levels,
      }),
    /cycle/,
  );
  assert.throws(
    () =>
      validateGeographicRows({
        rows: [
          row("State / FCT", "A", "A", "State / FCT", "B"),
          row("State / FCT", "B", "B", "State / FCT", "C"),
          row("State / FCT", "C", "C", "State / FCT", "A"),
        ],
        levels,
      }),
    /cycle/,
  );
  assert.throws(
    () =>
      validateGeographicRows({
        rows: [],
        levels,
        existingAreas: [
          { id: "a", level: { name: "State / FCT" }, code: "A", parentId: "b" },
          { id: "b", level: { name: "State / FCT" }, code: "B", parentId: "a" },
        ],
      }),
    /cycle/,
  );
});
test("partial activation is accepted while parent isolation and cycles are rejected", () => {
  assert.doesNotThrow(() => assertNoAreaCycle({ areaId: "a", parentId: null, areas: [] }));
  assert.throws(
    () => assertNoAreaCycle({ areaId: "a", parentId: "missing", areas: [] }),
    /unavailable/,
  );
  assert.throws(() => assertNoAreaCycle({ areaId: "a", parentId: "a", areas: [] }), /own parent/);
  assert.throws(
    () => assertNoAreaCycle({ areaId: "a", parentId: "b", areas: [{ id: "b", isActive: false }] }),
    /inactive/,
  );
});
test("provenance is bounded and complete", () => {
  assert.throws(() => validateProvenance({ sourceInstitution: "INEC" }), /provenance/);
  assert.equal(
    validateProvenance({
      sourceInstitution: "INEC",
      sourceDocument: "Dataset",
      sourceVersionDate: "2026-09-25",
      validationStatus: "APPROVED",
    }).sourceInstitution,
    "INEC",
  );
});
test("routes preserve authorization, tenant scope, atomic import, and audit coverage", () => {
  const routes = readFileSync(new URL("../server/routes/operations.js", import.meta.url), "utf8");
  const repository = readFileSync(
    new URL("../server/repositories/operationsRepository.js", import.meta.url),
    "utf8",
  );
  assert.match(routes, /PERMISSIONS\.GEOGRAPHY_MANAGE/);
  assert.match(routes, /repository\.transaction/);
  for (const action of [
    "GEOGRAPHIC_LEVEL_CREATED",
    "GEOGRAPHIC_LEVEL_CHANGED",
    "GEOGRAPHIC_AREA_CREATED",
    "GEOGRAPHIC_AREA_CHANGED",
    "GEOGRAPHIC_IMPORT_EXECUTED",
  ])
    assert.match(routes, new RegExp(action));
  assert.match(repository, /tenantId, campaignId/);
  assert.match(repository, /appendGeographicAudit/);
});
test("Super Administrator UI exposes search, filter, edit, path, and controlled modes", () => {
  const page = readFileSync(
    new URL("../src/pages/GeographicManagementPage.tsx", import.meta.url),
    "utf8",
  );
  const compactPage = page.replace(/\s+/g, " ");
  for (const label of [
    "Search areas",
    "Filter by level",
    "Edit approved fields",
    "Path parent",
    "VALIDATE checks data without database writes",
    "PREVIEW shows proposed changes without database writes",
    "IMPORT writes atomically only after exact confirmation",
  ])
    assert.match(compactPage, new RegExp(label));
  assert.match(page, /IMPORT AUTHORIZED GEOGRAPHIC DATA/);
});

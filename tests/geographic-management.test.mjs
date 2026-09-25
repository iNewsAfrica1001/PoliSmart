import test from "node:test";
import assert from "node:assert/strict";
import { NIGERIA_GEOGRAPHIC_LEVELS, assertNoAreaCycle, validateGeographicRows, validateProvenance } from "../server/services/geographicManagement.js";
import { PERMISSIONS, ROLES, ROLE_PERMISSION_POLICY } from "../server/config/authorization.js";

const levels = NIGERIA_GEOGRAPHIC_LEVELS.map((name, index) => ({ id: `level-${index}`, name, orderIndex: index }));

test("Nigeria terminology is supported without hard-coded hierarchy assumptions", () => {
  assert.deepEqual(NIGERIA_GEOGRAPHIC_LEVELS, ["Country","Geopolitical Zone","State / FCT","Senatorial District","Federal Constituency","Local Government Area / FCT Area Council","Ward / Registration Area"]);
});

test("geographic administration permission is exclusive to Super Administrators", () => {
  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_POLICY))
    assert.equal(permissions.includes(PERMISSIONS.GEOGRAPHY_MANAGE), role === ROLES.SUPER_ADMINISTRATOR);
});

test("VALIDATE and PREVIEW calculation is deterministic and reports duplicates and invalid parents without writes", () => {
  const existing = [{ id: "country", levelId: levels[0].id, name: "Nigeria", code: "NG" }];
  const rows = [
    { level: "State / FCT", name: "Example State", code: "EX", parentCode: "NG" },
    { level: "State / FCT", name: "Example State", code: "EX", parentCode: "NG" },
    { level: "Ward / Registration Area", name: "Unresolved Ward", code: "W1", parentCode: "MISSING" },
  ];
  const report = validateGeographicRows({ rows, levels, existingAreas: existing });
  assert.equal(report.rowsReceived, 3); assert.equal(report.rowsValid, 1); assert.equal(report.duplicates, 1); assert.equal(report.invalidParents, 1); assert.equal(report.proposedInserts.length, 1);
});

test("provenance requires institution, document, version date, and validation status", () => {
  assert.throws(() => validateProvenance({ sourceInstitution: "INEC" }), /Complete source provenance/);
  assert.deepEqual(validateProvenance({ sourceInstitution: "INEC", sourceDocument: "Reviewed dataset", sourceVersionDate: "2026-09-25", validationStatus: "APPROVED" }), { sourceInstitution: "INEC", sourceDocument: "Reviewed dataset", sourceVersionDate: "2026-09-25", validationStatus: "APPROVED" });
});

test("self-parent and indirect cycles are rejected", () => {
  assert.throws(() => assertNoAreaCycle({ areaId: "a", parentId: "a", areas: [] }), /own parent/);
  assert.throws(() => assertNoAreaCycle({ areaId: "a", parentId: "b", areas: [{ id: "b", parentId: "c" }, { id: "c", parentId: "a" }] }), /cycle/);
});

test("valid flexible relationships are accepted without adjacent-level assumptions", () => {
  assert.doesNotThrow(() => assertNoAreaCycle({ areaId: "ward", parentId: "state", areas: [{ id: "state", parentId: "country" }, { id: "country", parentId: null }] }));
});

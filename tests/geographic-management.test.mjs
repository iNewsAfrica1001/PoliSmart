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
test("VALIDATE capacity accepts the complete 9,627-row hierarchy and remains bounded", () => {
  const productionLevels = [
    "Country",
    "Geopolitical Zone",
    "State/FCT",
    "Local Government Area/FCT Area Council",
    "Ward/Registration Area",
  ].map((name, index) => ({ id: `production-${index}`, name, isActive: true }));
  const rows = [row("Country", "Nigeria", "NG")];
  for (let index = 0; index < 6; index += 1)
    rows.push(row("Geopolitical Zone", `Zone ${index}`, `Z${index}`, "Country", "NG"));
  for (let index = 0; index < 37; index += 1)
    rows.push(row("State/FCT", `State ${index}`, `S${index}`, "Geopolitical Zone", `Z${index % 6}`));
  for (let index = 0; index < 774; index += 1)
    rows.push(
      row(
        "Local Government Area/FCT Area Council",
        `LGA ${index}`,
        `L${index}`,
        "State/FCT",
        `S${index % 37}`,
      ),
    );
  for (let index = 0; index < 8809; index += 1)
    rows.push(
      row(
        "Ward/Registration Area",
        `Ward ${index}`,
        `W${index}`,
        "Local Government Area/FCT Area Council",
        `L${index % 774}`,
      ),
    );
  assert.equal(rows.length, 9627);
  const result = validateGeographicRows({
    rows,
    levels: productionLevels,
    rowLimit: GEOGRAPHIC_IMPORT_LIMITS.validateRows,
  });
  assert.equal(result.rowsValid, 9627);
  assert.equal(result.rowsRejected, 0);
  assert.equal(result.plan.length, 9627);
  assert.equal(result.plan[0].levelName, "Country");
  assert.throws(
    () =>
      validateGeographicRows({
        rows: Array(GEOGRAPHIC_IMPORT_LIMITS.validateRows + 1).fill(null),
        levels: productionLevels,
        rowLimit: GEOGRAPHIC_IMPORT_LIMITS.validateRows,
      }),
    /limit/,
  );
});
test("level field has an explicit enforced boundary and type", () => {
  const maximumLevel = "L".repeat(GEOGRAPHIC_IMPORT_LIMITS.level);
  assert.equal(
    validateGeographicRows({
      rows: [row(maximumLevel, "Area", "A")],
      levels: [{ id: "maximum", name: maximumLevel, isActive: true }],
    }).rowsValid,
    1,
  );
  assert.equal(
    validateGeographicRows({
      rows: [row(`${maximumLevel}X`, "Area", "A")],
      levels: [{ id: "too-long", name: `${maximumLevel}X`, isActive: true }],
    }).rejected[0].reason,
    "INVALID_FIELDS",
  );
  for (const value of ["", 1, true, {}, []]) {
    const result = validateGeographicRows({
      rows: [{ level: value, name: "Area", code: "A" }],
      levels,
    });
    assert.equal(result.rowsRejected, 1);
  }
});
test("every geographic import field boundary is enforced", () => {
  const stateLevel = "State / FCT";
  const accepted = validateGeographicRows({
    rows: [
      row(
        stateLevel,
        "N".repeat(GEOGRAPHIC_IMPORT_LIMITS.name),
        "C".repeat(GEOGRAPHIC_IMPORT_LIMITS.code),
      ),
    ],
    levels,
  });
  assert.equal(accepted.rowsValid, 1);
  for (const oversized of [
    row(stateLevel, "N".repeat(GEOGRAPHIC_IMPORT_LIMITS.name + 1), "A"),
    row(stateLevel, "Area", "C".repeat(GEOGRAPHIC_IMPORT_LIMITS.code + 1)),
    row(stateLevel, "Area", "A", "P".repeat(GEOGRAPHIC_IMPORT_LIMITS.parentReference + 1), "P"),
    row(
      stateLevel,
      "Area",
      "A",
      "Country",
      "P".repeat(GEOGRAPHIC_IMPORT_LIMITS.parentReference + 1),
    ),
  ])
    assert.equal(validateGeographicRows({ rows: [oversized], levels }).rowsRejected, 1);
  assert.doesNotThrow(() =>
    validateGeographicRows({ rows: Array(GEOGRAPHIC_IMPORT_LIMITS.rows).fill(null), levels }),
  );
  assert.throws(
    () =>
      validateProvenance({
        sourceInstitution: "S".repeat(GEOGRAPHIC_IMPORT_LIMITS.source + 1),
        sourceDocument: "Dataset",
        sourceVersionDate: "2026-09-25",
        retrievalDate: "2026-09-26",
        validationStatus: "REVIEWED",
      }),
    /provenance/,
  );
  assert.throws(
    () =>
      validateProvenance({
        sourceInstitution: "Institution",
        sourceDocument: "Dataset",
        sourceVersionDate: "2026-09-25",
        retrievalDate: "2026-09-26",
        validationStatus: "V".repeat(GEOGRAPHIC_IMPORT_LIMITS.validationStatus + 1),
      }),
    /provenance/,
  );
});
test("parent references accept explicit roots and reject invalid types or incomplete pairs", () => {
  for (const parentFields of [
    {},
    { parentLevel: null, parentCode: null },
    { parentLevel: "", parentCode: "" },
    { parentLevel: "   ", parentCode: "   " },
  ])
    assert.equal(
      validateGeographicRows({
        rows: [{ ...row("State / FCT", "Area", "A"), ...parentFields }],
        levels,
      }).rowsValid,
      1,
    );
  for (const invalid of [1, true, {}, []]) {
    for (const field of ["parentLevel", "parentCode"]) {
      const result = validateGeographicRows({
        rows: [{ ...row("State / FCT", "Area", "A"), [field]: invalid }],
        levels,
      });
      assert.equal(result.rejected[0].reason, "INVALID_FIELD_TYPE");
    }
  }
  for (const parentFields of [
    { parentLevel: "Country", parentCode: "" },
    { parentLevel: "", parentCode: "NG" },
  ])
    assert.equal(
      validateGeographicRows({
        rows: [{ ...row("State / FCT", "Area", "A"), ...parentFields }],
        levels,
      }).rejected[0].reason,
      "MALFORMED_PARENT_REFERENCE",
    );
  assert.equal(
    validateGeographicRows({
      rows: [row("State / FCT", "Area", "A", "Country", "NG")],
      levels,
      existingAreas: [{ id: "country", level: { name: "Country" }, code: "NG", isActive: true }],
    }).rowsValid,
    1,
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
  const complete = validateProvenance({
    sourceInstitution: "INEC",
    sourceDocument: "Dataset",
    sourceVersionDate: "2026-09-25",
    retrievalDate: "2026-09-26",
    validationStatus: "APPROVED",
  });
  assert.equal(complete.sourceInstitution, "INEC");
  assert.equal(complete.sourceVersionDate, "2026-09-25");
  assert.equal(complete.retrievalDate, "2026-09-26");
});
test("provenance accepts an unpublished source version without substituting retrieval date", () => {
  for (const sourceVersionDate of [undefined, null, "", "   "]) {
    const value = validateProvenance({
      sourceInstitution: "INEC",
      sourceDocument: "Live locator",
      sourceVersionDate,
      retrievalDate: "2026-09-25",
      validationStatus: "VALIDATED",
    });
    assert.equal(value.sourceVersionDate, "");
    assert.equal(value.retrievalDate, "2026-09-25");
  }
});
test("provenance rejects malformed supplied version dates and missing or malformed retrieval dates", () => {
  const base = {
    sourceInstitution: "INEC",
    sourceDocument: "Live locator",
    retrievalDate: "2026-09-25",
    validationStatus: "VALIDATED",
  };
  for (const sourceVersionDate of ["25-09-2026", "2026/09/25", "2026-02-30", "not-published", 123, true, {}])
    assert.throws(() => validateProvenance({ ...base, sourceVersionDate }), /version date/);
  for (const retrievalDate of [undefined, null, "", "25-09-2026", "2026/09/25", "2026-02-30"])
    assert.throws(() => validateProvenance({ ...base, retrievalDate }), /provenance|Retrieval date/);
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
  assert.match(page, /Enter only when the source publishes a version date/);
  assert.match(page, /name="retrievalDate" type="date" required/);
});

export const NIGERIA_GEOGRAPHIC_LEVELS = Object.freeze([
  "Country",
  "Geopolitical Zone",
  "State / FCT",
  "Senatorial District",
  "Federal Constituency",
  "Local Government Area / FCT Area Council",
  "Ward / Registration Area",
]);

const fail = (message, code) => Object.assign(new Error(message), { status: 400, code });
const clean = (value) => String(value ?? "").trim();

export function validateGeographicRows({ rows, levels, existingAreas = [] }) {
  if (!Array.isArray(rows)) throw fail("Import rows are required.", "ROWS_REQUIRED");
  const levelByName = new Map(levels.map((level) => [level.name, level]));
  const known = new Map(existingAreas.map((area) => [`${area.levelId}\0${area.code || ""}\0${area.name.toLowerCase()}`, area]));
  const incoming = new Map();
  const valid = [];
  const rejected = [];
  let duplicates = 0;
  for (const [index, source] of rows.entries()) {
    const row = { ...source, name: clean(source.name), level: clean(source.level), code: clean(source.code) || null, parentCode: clean(source.parentCode) || null };
    const level = levelByName.get(row.level);
    if (!row.name || !level) { rejected.push({ row: index + 1, reason: "INVALID_LEVEL_OR_NAME" }); continue; }
    const key = `${level.id}\0${row.code || ""}\0${row.name.toLowerCase()}`;
    if (known.has(key) || incoming.has(key)) { duplicates += 1; rejected.push({ row: index + 1, reason: "DUPLICATE" }); continue; }
    const normalized = { ...row, levelId: level.id, row: index + 1 };
    incoming.set(key, normalized); valid.push(normalized);
  }
  const resolvableCodes = new Set([...existingAreas.map((area) => area.code).filter(Boolean), ...valid.map((row) => row.code).filter(Boolean)]);
  const invalidParents = valid.filter((row) => row.parentCode && !resolvableCodes.has(row.parentCode));
  const invalidRows = new Set(invalidParents.map((row) => row.row));
  return {
    rowsReceived: rows.length,
    rowsValid: valid.length - invalidParents.length,
    rowsRejected: rejected.length + invalidParents.length,
    duplicates,
    invalidParents: invalidParents.length,
    unresolvedReferences: invalidParents.length,
    proposedInserts: valid.filter((row) => !invalidRows.has(row.row)),
    proposedUpdates: [],
    rejected: [...rejected, ...invalidParents.map((row) => ({ row: row.row, reason: "INVALID_PARENT" }))],
  };
}

export function assertNoAreaCycle({ areaId, parentId, areas }) {
  if (!parentId) return;
  if (areaId && areaId === parentId) throw fail("An area cannot be its own parent.", "SELF_PARENT");
  const parents = new Map(areas.map((area) => [area.id, area.parentId]));
  const seen = new Set();
  for (let current = parentId; current; current = parents.get(current)) {
    if (current === areaId) throw fail("The parent relationship would create a cycle.", "HIERARCHY_CYCLE");
    if (seen.has(current)) throw fail("The geographic hierarchy contains a cycle.", "HIERARCHY_CYCLE");
    seen.add(current);
  }
}

export function validateProvenance(provenance) {
  const value = {
    sourceInstitution: clean(provenance?.sourceInstitution),
    sourceDocument: clean(provenance?.sourceDocument),
    sourceVersionDate: clean(provenance?.sourceVersionDate),
    validationStatus: clean(provenance?.validationStatus),
  };
  if (!value.sourceInstitution || !value.sourceDocument || !value.sourceVersionDate || !value.validationStatus)
    throw fail("Complete source provenance is required.", "PROVENANCE_REQUIRED");
  return value;
}

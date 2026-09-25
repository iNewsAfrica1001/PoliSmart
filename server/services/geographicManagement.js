export const NIGERIA_GEOGRAPHIC_LEVELS = Object.freeze([
  "Country",
  "Geopolitical Zone",
  "State / FCT",
  "Senatorial District",
  "Federal Constituency",
  "Local Government Area / FCT Area Council",
  "Ward / Registration Area",
]);
export const GEOGRAPHIC_IMPORT_LIMITS = Object.freeze({
  rows: 5000,
  validateRows: 12000,
  previewRows: 12000,
  validateJsonBody: "2mb",
  level: 80,
  name: 120,
  code: 40,
  parentReference: 120,
  source: 240,
  validationStatus: 40,
});
const fail = (message, code, status = 400) => Object.assign(new Error(message), { status, code });
const clean = (value) => (typeof value === "string" ? value.trim() : "");
const areaKey = (level, code) => `${level}\0${code}`;
const isDateOnly = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};
export function validateProvenance(input) {
  if (
    input?.sourceVersionDate !== undefined &&
    input?.sourceVersionDate !== null &&
    typeof input.sourceVersionDate !== "string"
  )
    throw fail("Source version date is invalid.", "PROVENANCE_DATE_INVALID");
  const value = {
    sourceInstitution: clean(input?.sourceInstitution),
    sourceDocument: clean(input?.sourceDocument),
    sourceVersionDate: clean(input?.sourceVersionDate),
    retrievalDate: clean(input?.retrievalDate),
    validationStatus: clean(input?.validationStatus),
  };
  for (const [key, max] of [
    ["sourceInstitution", GEOGRAPHIC_IMPORT_LIMITS.source],
    ["sourceDocument", GEOGRAPHIC_IMPORT_LIMITS.source],
    ["retrievalDate", 10],
    ["validationStatus", GEOGRAPHIC_IMPORT_LIMITS.validationStatus],
  ])
    if (!value[key] || value[key].length > max)
      throw fail(
        "Source provenance is missing or exceeds an approved limit.",
        "PROVENANCE_INVALID",
      );
  if (value.sourceVersionDate && !isDateOnly(value.sourceVersionDate))
    throw fail("Source version date is invalid.", "PROVENANCE_DATE_INVALID");
  if (!isDateOnly(value.retrievalDate))
    throw fail("Retrieval date is invalid.", "PROVENANCE_RETRIEVAL_DATE_INVALID");
  return value;
}
function detectCycles(nodes) {
  const visiting = new Set(),
    visited = new Set(),
    ordered = [];
  function visit(key) {
    if (visiting.has(key))
      throw fail("The proposed geographic hierarchy contains a cycle.", "HIERARCHY_CYCLE");
    if (visited.has(key)) return;
    visiting.add(key);
    const node = nodes.get(key);
    if (node?.parentKey && nodes.has(node.parentKey)) visit(node.parentKey);
    visiting.delete(key);
    visited.add(key);
    if (node?.imported) ordered.push(node);
  }
  for (const key of nodes.keys()) visit(key);
  return ordered;
}
export function validateGeographicRows({
  rows,
  levels,
  existingAreas = [],
  rowLimit = GEOGRAPHIC_IMPORT_LIMITS.rows,
}) {
  if (!Array.isArray(rows)) throw fail("Import rows must be an array.", "ROWS_REQUIRED");
  if (rows.length > rowLimit) throw fail("Import row limit exceeded.", "ROW_LIMIT_EXCEEDED", 413);
  const activeLevels = new Map(
    levels.filter((item) => item.isActive !== false).map((item) => [item.name, item]),
  );
  const levelNameById = new Map(levels.map((item) => [item.id, item.name]));
  const nodes = new Map(),
    ambiguous = new Set();
  const existingKeyById = new Map();
  for (const area of existingAreas) {
    const key = areaKey(area.level?.name || levelNameById.get(area.levelId), area.code || "");
    existingKeyById.set(area.id, key);
    if (!area.code || nodes.has(key)) ambiguous.add(key);
    else
      nodes.set(key, {
        key,
        id: area.id,
        active: area.isActive !== false,
        parentId: area.parentId,
        imported: false,
      });
  }
  for (const node of nodes.values())
    if (node.parentId) node.parentKey = existingKeyById.get(node.parentId) || null;
  const rejected = [],
    candidates = [],
    candidateKeys = new Set();
  for (let index = 0; index < rows.length; index += 1) {
    const source = rows[index];
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      rejected.push({ row: index + 1, reason: "MALFORMED_ROW" });
      continue;
    }
    const parentValuesValid = [source.parentCode, source.parentLevel].every(
      (value) => value === undefined || value === null || typeof value === "string",
    );
    if (
      typeof source.name !== "string" ||
      typeof source.level !== "string" ||
      typeof source.code !== "string" ||
      !parentValuesValid
    ) {
      rejected.push({ row: index + 1, reason: "INVALID_FIELD_TYPE" });
      continue;
    }
    const name = clean(source.name),
      levelName = clean(source.level),
      code = clean(source.code),
      parentCode = clean(source.parentCode),
      parentLevel = clean(source.parentLevel);
    if (
      !name ||
      !levelName ||
      !code ||
      name.length > GEOGRAPHIC_IMPORT_LIMITS.name ||
      levelName.length > GEOGRAPHIC_IMPORT_LIMITS.level ||
      code.length > GEOGRAPHIC_IMPORT_LIMITS.code ||
      parentCode.length > GEOGRAPHIC_IMPORT_LIMITS.parentReference ||
      parentLevel.length > GEOGRAPHIC_IMPORT_LIMITS.parentReference
    ) {
      rejected.push({ row: index + 1, reason: "INVALID_FIELDS" });
      continue;
    }
    const level = activeLevels.get(levelName);
    if (!level) {
      rejected.push({ row: index + 1, reason: "INACTIVE_OR_UNKNOWN_LEVEL" });
      continue;
    }
    if ((parentCode && !parentLevel) || (!parentCode && parentLevel)) {
      rejected.push({ row: index + 1, reason: "MALFORMED_PARENT_REFERENCE" });
      continue;
    }
    const key = areaKey(levelName, code),
      parentKey = parentCode ? areaKey(parentLevel, parentCode) : null;
    if (key === parentKey) {
      rejected.push({ row: index + 1, reason: "SELF_PARENT" });
      continue;
    }
    if (nodes.has(key) || candidateKeys.has(key)) {
      rejected.push({ row: index + 1, reason: "DUPLICATE" });
      continue;
    }
    candidates.push({
      row: index + 1,
      key,
      parentKey,
      name,
      code,
      levelName,
      levelId: level.id,
      parentCode: parentCode || null,
      parentLevel: parentLevel || null,
      imported: true,
      active: true,
    });
    candidateKeys.add(key);
  }
  for (const item of candidates) nodes.set(item.key, item);
  for (const item of candidates)
    if (item.parentKey) {
      const parent = nodes.get(item.parentKey);
      if (!parent || ambiguous.has(item.parentKey))
        rejected.push({ row: item.row, reason: parent ? "AMBIGUOUS_PARENT" : "INVALID_PARENT" });
      else if (!parent.active) rejected.push({ row: item.row, reason: "INACTIVE_PARENT" });
    }
  const badRows = new Set(rejected.map((item) => item.row));
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of candidates) {
      if (badRows.has(item.row) || !item.parentKey) continue;
      const parent = nodes.get(item.parentKey);
      if (parent?.imported && badRows.has(parent.row)) {
        rejected.push({ row: item.row, reason: "INVALID_PARENT" });
        badRows.add(item.row);
        changed = true;
      }
    }
  }
  const usable = new Map([...nodes].filter(([, item]) => !item.imported || !badRows.has(item.row)));
  const ordered = detectCycles(usable);
  const safe = ordered.map(({ row, name, code, levelName, parentCode, parentLevel }) => ({
    row,
    name,
    code,
    level: levelName,
    parentCode,
    parentLevel,
    validationStatus: "VALID",
  }));
  const report = {
    rowsReceived: rows.length,
    rowsValid: safe.length,
    rowsRejected: rejected.length,
    duplicates: rejected.filter((item) => item.reason === "DUPLICATE").length,
    invalidParents: rejected.filter((item) => item.reason.includes("PARENT")).length,
    unresolvedReferences: rejected.filter((item) => item.reason === "INVALID_PARENT").length,
    proposedInserts: safe,
    proposedUpdates: [],
    rejected,
  };
  Object.defineProperty(report, "plan", { enumerable: false, value: ordered });
  return report;
}
export function assertNoAreaCycle({ areaId, parentId, areas }) {
  if (!parentId) return;
  if (areaId === parentId) throw fail("An area cannot be its own parent.", "SELF_PARENT");
  const byId = new Map(areas.map((area) => [area.id, area])),
    parent = byId.get(parentId);
  if (!parent) throw fail("The selected parent is unavailable in this campaign.", "INVALID_PARENT");
  if (parent.isActive === false)
    throw fail("An inactive area cannot be a parent.", "INACTIVE_PARENT");
  const seen = new Set();
  for (let current = parentId; current; current = byId.get(current)?.parentId) {
    if (current === areaId || seen.has(current))
      throw fail("The parent relationship would create a cycle.", "HIERARCHY_CYCLE");
    seen.add(current);
  }
}

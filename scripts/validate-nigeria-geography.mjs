import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve("data/geography/nigeria");
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
const productionLevels = [
  "Country",
  "Geopolitical Zone",
  "State/FCT",
  "Senatorial District",
  "Federal Constituency",
  "Local Government Area/FCT Area Council",
  "Ward/Registration Area",
];
const records = readFileSync(path.join(root, "preparation-records.jsonl"), "utf8")
  .split(/\r?\n/).filter(Boolean).map((line, index) => ({ ...JSON.parse(line), _line: index + 1 }));
const levels = new Set(productionLevels);
const issues = [];
if (JSON.stringify(manifest.importContract.levels) !== JSON.stringify(productionLevels))
  issues.push({ code: "PRODUCTION_LEVEL_CATALOG_MISMATCH" });
const byKey = new Map();
const counts = Object.fromEntries(productionLevels.map((level) => [level, 0]));
const max = { level: 80, name: 120, code: 40, parentLevel: 120, parentCode: 120 };

for (const record of records) {
  counts[record.level] = (counts[record.level] ?? 0) + 1;
  for (const field of ["level", "name", "code"])
    if (typeof record[field] !== "string" || !record[field].trim()) issues.push({ line: record._line, code: `BLANK_${field.toUpperCase()}` });
  if (!levels.has(record.level)) issues.push({ line: record._line, code: "UNKNOWN_LEVEL" });
  for (const [field, limit] of Object.entries(max))
    if (typeof record[field] === "string" && record[field].trim().length > limit) issues.push({ line: record._line, code: `${field.toUpperCase()}_TOO_LONG` });
  const hasParentLevel = typeof record.parentLevel === "string" && record.parentLevel.trim();
  const hasParentCode = typeof record.parentCode === "string" && record.parentCode.trim();
  if (Boolean(hasParentLevel) !== Boolean(hasParentCode)) issues.push({ line: record._line, code: "INCOMPLETE_PARENT_PAIR" });
  const key = `${record.level}\0${record.code}`;
  if (byKey.has(key)) issues.push({ line: record._line, code: "DUPLICATE_LEVEL_CODE" });
  byKey.set(key, record);
  if (record.codeAuthority === "INEC" && !/^\d{2}(?:-\d{2}){0,2}$/.test(record.code)) issues.push({ line: record._line, code: "MALFORMED_INEC_COMPONENT_CODE" });
  if (record.codeAuthority === "POLISMART_INTERNAL" && !/^PS-(?:NG|GPZ-(?:NC|NE|NW|SE|SS|SW))$/.test(record.code)) issues.push({ line: record._line, code: "MALFORMED_INTERNAL_CODE" });
  if (record.validationStatus !== "VALIDATED") issues.push({ line: record._line, code: "NOT_VALIDATED" });
}

for (const record of records) {
  if (!record.parentLevel || !record.parentCode) continue;
  const parentKey = `${record.parentLevel}\0${record.parentCode}`;
  if (!byKey.has(parentKey)) issues.push({ line: record._line, code: "MISSING_PARENT" });
  if (record.level === record.parentLevel && record.code === record.parentCode) issues.push({ line: record._line, code: "SELF_PARENT" });
  const visited = new Set([`${record.level}\0${record.code}`]);
  let cursor = record;
  while (cursor.parentLevel && cursor.parentCode) {
    const key = `${cursor.parentLevel}\0${cursor.parentCode}`;
    if (visited.has(key)) { issues.push({ line: record._line, code: "HIERARCHY_CYCLE" }); break; }
    visited.add(key);
    cursor = byKey.get(key);
    if (!cursor) break;
  }
}

for (const [level, expected] of Object.entries(manifest.resolvedTotals))
  if (counts[level] !== expected) issues.push({ level, code: "COUNT_MISMATCH", expected, actual: counts[level] });

const summary = {};
for (const issue of issues) summary[issue.code] = (summary[issue.code] ?? 0) + 1;
const result = { records: records.length, counts, issueSummary: summary, issues, ready: issues.length === 0 };
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ready ? 0 : 2;

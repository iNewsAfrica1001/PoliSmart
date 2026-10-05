import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("data/geography/nigeria");
const API = "https://cvr.inecnigeria.org/PublicApi";
const RETRIEVAL_DATE = "2026-09-25";
const LOCATOR = "https://cvr.inecnigeria.org/pu";
const STATE_DIRECTORY = "https://inecnigeria.org/about/state-offices/";

const zoneCodes = new Map([
  ["North Central", "PS-GPZ-NC"], ["North East", "PS-GPZ-NE"],
  ["North West", "PS-GPZ-NW"], ["South East", "PS-GPZ-SE"],
  ["South South", "PS-GPZ-SS"], ["South West", "PS-GPZ-SW"],
]);

const stateZones = new Map(Object.entries({
  Abia: "South East", Adamawa: "North East", "Akwa Ibom": "South South",
  Anambra: "South East", Bauchi: "North East", Bayelsa: "South South",
  Benue: "North Central", Borno: "North East", "Cross River": "South South",
  Delta: "South South", Ebonyi: "South East", Edo: "South South", Ekiti: "South West",
  Enugu: "South East", "Federal Capital Territory (FCT)": "North Central",
  Gombe: "North East", Imo: "South East", Jigawa: "North West", Kaduna: "North West",
  Kano: "North West", Katsina: "North West", Kebbi: "North West", Kogi: "North Central",
  Kwara: "North Central", Lagos: "South West", Nasarawa: "North Central",
  Niger: "North Central", Ogun: "South West", Ondo: "South West", Osun: "South West",
  Oyo: "South West", Plateau: "North Central", Rivers: "South South",
  Sokoto: "North West", Taraba: "North East", Yobe: "North East", Zamfara: "North West",
}));

function titleCase(value) {
  return value.toLowerCase().replace(/(^|[\s\-/()])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

function canonicalState(value) {
  return value === "FCT" ? "Federal Capital Territory (FCT)" : titleCase(value);
}

function parseOptions(payload, kind) {
  const object = Array.isArray(payload) ? payload[0] : payload;
  if (!object || typeof object !== "object") throw new Error(`${kind}: invalid INEC response`);
  return Object.entries(object)
    .filter(([key]) => key !== "selected" && key !== "0")
    .map(([id, label]) => {
      const match = String(label).match(/^(\d{2})\s*-\s*(.+)$/);
      if (!match) throw new Error(`${kind}: malformed coded label`);
      return { id, componentCode: match[1], name: titleCase(match[2].trim().replace(/\s+/g, " ")) };
    });
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`INEC endpoint returned HTTP ${response.status}`);
  return response.json();
}

async function workerMap(items, concurrency, callback) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await callback(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return output;
}

function provenance({ document, url, version = null, authority }) {
  return {
    sourceInstitution: "Independent National Electoral Commission (INEC)",
    sourceDocument: document,
    sourceURL: url,
    sourceVersionDate: version,
    retrievalDate: RETRIEVAL_DATE,
    codeAuthority: authority,
    validationStatus: "VALIDATED",
  };
}

function importRow(record) {
  const row = { level: record.level, name: record.name, code: record.code };
  if (record.parentLevel && record.parentCode) {
    row.parentLevel = record.parentLevel;
    row.parentCode = record.parentCode;
  }
  return row;
}

function validate(records) {
  const expected = {
    Country: 1, "Geopolitical Zone": 6, "State/FCT": 37,
    "Senatorial District": 0, "Federal Constituency": 0,
    "Local Government Area/FCT Area Council": 774,
    "Ward/Registration Area": 8809,
  };
  const counts = Object.fromEntries(Object.keys(expected).map((level) => [level, 0]));
  const issues = [];
  const byKey = new Map();
  for (const [index, record] of records.entries()) {
    const line = index + 1;
    counts[record.level] = (counts[record.level] ?? 0) + 1;
    for (const field of ["level", "name", "code"])
      if (typeof record[field] !== "string" || !record[field].trim()) issues.push({ line, code: `BLANK_${field.toUpperCase()}` });
    const parentPair = [record.parentLevel, record.parentCode].filter((v) => typeof v === "string" && v.trim()).length;
    if (parentPair === 1) issues.push({ line, code: "INCOMPLETE_PARENT_PAIR" });
    const key = `${record.level}\0${record.code}`;
    if (byKey.has(key)) issues.push({ line, code: "DUPLICATE_LEVEL_CODE" });
    byKey.set(key, record);
    if (record.codeAuthority === "INEC" && !/^\d{2}(?:-\d{2}){0,2}$/.test(record.code))
      issues.push({ line, code: "MALFORMED_INEC_COMPONENT_CODE" });
  }
  for (const [index, record] of records.entries()) {
    if (!record.parentLevel && !record.parentCode) continue;
    if (!byKey.has(`${record.parentLevel}\0${record.parentCode}`)) issues.push({ line: index + 1, code: "MISSING_PARENT" });
    if (record.level === record.parentLevel && record.code === record.parentCode) issues.push({ line: index + 1, code: "SELF_PARENT" });
  }
  for (const [level, count] of Object.entries(expected))
    if (counts[level] !== count) issues.push({ level, code: "COUNT_MISMATCH", expected: count, actual: counts[level] });
  return { records: records.length, counts, issues, ready: issues.length === 0 };
}

await mkdir(ROOT, { recursive: true });
const existing = (await readFile(path.join(ROOT, "preparation-records.jsonl"), "utf8"))
  .split(/\r?\n/).filter(Boolean).map(JSON.parse);
const expectedStateNames = new Set(existing.filter((r) => r.level === "State/FCT").map((r) => r.name));

const page = await (await fetch(LOCATOR)).text();
const states = [...page.matchAll(/<option value="(\d+)">(\d{2})\s*-\s*([^<]+)<\/option>/g)]
  .map(([, id, componentCode, rawName]) => ({ id, componentCode, name: canonicalState(rawName.trim()) }));
if (states.length !== 37) throw new Error(`Expected 37 INEC states/FCT, received ${states.length}`);

const stateMismatch = [
  ...states.map((s) => s.name).filter((name) => !expectedStateNames.has(name)).map((name) => ({ type: "NEW_FROM_INEC", name })),
  ...[...expectedStateNames].filter((name) => !states.some((s) => s.name === name)).map((name) => ({ type: "MISSING_FROM_INEC", name })),
];

const lgaGroups = await workerMap(states, 8, async (state) => {
  const query = new URLSearchParams({ "data[Search][state_id]": state.id });
  const payload = await getJson(`${API}/lgas/1/Search?${query}`);
  return parseOptions(payload, `LGA ${state.componentCode}`).map((lga) => ({ ...lga, state }));
});
const lgas = lgaGroups.flat();
if (lgas.length !== 774) throw new Error(`Expected 774 INEC LGAs/Area Councils, received ${lgas.length}`);

const wardGroups = await workerMap(lgas, 12, async (lga) => {
  const query = new URLSearchParams({ "data[Search][local_government_id]": lga.id });
  const payload = await getJson(`${API}/wards/1/Search?${query}`);
  return parseOptions(payload, `Ward ${lga.state.componentCode}-${lga.componentCode}`).map((ward) => ({ ...ward, lga }));
});
const rawWards = wardGroups.flat();
const wardByCode = new Map();
const upstreamExactDuplicates = [];
for (const ward of rawWards) {
  const code = `${ward.lga.state.componentCode}-${ward.lga.componentCode}-${ward.componentCode}`;
  const prior = wardByCode.get(code);
  if (!prior) wardByCode.set(code, ward);
  else if (prior.name === ward.name) upstreamExactDuplicates.push({ code, name: ward.name, retainedOfficialId: prior.id, duplicateOfficialId: ward.id });
  else throw new Error(`Ambiguous INEC ward code ${code}: conflicting names`);
}
const wards = [...wardByCode.values()];
if (wards.length !== 8809) throw new Error(`Expected 8,809 normalized INEC wards/RAs, received ${wards.length} from ${rawWards.length} official endpoint rows`);

const records = [];
records.push({
  level: "Country", name: "Nigeria", code: "PS-NG", parentLevel: null, parentCode: null,
  ...provenance({ document: "State Offices & Resident Electoral Commissioners", url: STATE_DIRECTORY, authority: "POLISMART_INTERNAL" }),
  operatorNotes: "PoliSmart organizational identifier; not an INEC-issued code.",
});
for (const [name, code] of zoneCodes) records.push({
  level: "Geopolitical Zone", name, code, parentLevel: "Country", parentCode: "PS-NG",
  ...provenance({ document: "State Offices & Resident Electoral Commissioners", url: STATE_DIRECTORY, authority: "POLISMART_INTERNAL" }),
  operatorNotes: "PoliSmart organizational identifier; zone classification is supported by INEC, but this code is not INEC-issued.",
});
for (const state of states) records.push({
  level: "State/FCT", name: state.name, code: state.componentCode,
  parentLevel: "Geopolitical Zone", parentCode: zoneCodes.get(stateZones.get(state.name)),
  inecStateCode: state.componentCode,
  ...provenance({ document: "INEC CVR Polling Unit Locator", url: LOCATOR, authority: "INEC" }),
});
for (const lga of lgas) records.push({
  level: "Local Government Area/FCT Area Council", name: lga.name,
  code: `${lga.state.componentCode}-${lga.componentCode}`,
  parentLevel: "State/FCT", parentCode: lga.state.componentCode,
  inecStateCode: lga.state.componentCode, inecLgaCode: lga.componentCode,
  ...provenance({ document: "INEC CVR Polling Unit Locator", url: LOCATOR, authority: "INEC" }),
});
for (const ward of wards) records.push({
  level: "Ward/Registration Area", name: ward.name,
  code: `${ward.lga.state.componentCode}-${ward.lga.componentCode}-${ward.componentCode}`,
  parentLevel: "Local Government Area/FCT Area Council",
  parentCode: `${ward.lga.state.componentCode}-${ward.lga.componentCode}`,
  inecStateCode: ward.lga.state.componentCode, inecLgaCode: ward.lga.componentCode,
  inecWardCode: ward.componentCode,
  ...provenance({ document: "INEC CVR Polling Unit Locator", url: LOCATOR, authority: "INEC" }),
});

const validation = validate(records);
validation.stateCodeReconciliation = { matched: stateMismatch.length === 0, mismatches: stateMismatch };
validation.sourceNormalization = {
  rawOfficialWardRows: rawWards.length,
  normalizedWardRecords: wards.length,
  exactDuplicateRowsRemoved: upstreamExactDuplicates,
  note: "Only byte-equivalent code/name duplicates from the official endpoint are collapsed; conflicting duplicate codes are fatal.",
};
validation.provenance = {
  officialHierarchy: LOCATOR,
  extractionEndpoints: ["/PublicApi/lgas/1/Search", "/PublicApi/wards/1/Search"],
  sourceVersionDate: null,
  sourceVersionNote: "The official live locator does not publish an explicit dataset version date.",
  retrievalDate: RETRIEVAL_DATE,
};
if (!validation.ready || stateMismatch.length) throw new Error(`Offline validation failed: ${JSON.stringify(validation)}`);

const manifest = {
  dataset: "Nigeria campaign geography preparation", release: "V1.1A", retrievalDate: RETRIEVAL_DATE,
  productionUseAuthorized: false,
  importContract: {
    requiredRowFields: ["level", "name", "code"], optionalPairedParentFields: ["parentLevel", "parentCode"],
    maximumRowsPerRequest: 5000,
    levels: ["Country", "Geopolitical Zone", "State/FCT", "Senatorial District", "Federal Constituency", "Local Government Area/FCT Area Council", "Ward/Registration Area"],
  },
  resolvedTotals: validation.counts,
  sources: [
    { sourceInstitution: "Independent National Electoral Commission (INEC)", sourceDocument: "INEC CVR Polling Unit Locator", sourceURL: LOCATOR, sourceVersionDate: null, retrievalDate: RETRIEVAL_DATE, supports: ["State/FCT, LGA/Area Council, and Ward/Registration Area names and codes"], limitations: "Live official hierarchy; no explicit dataset version date is published." },
    { sourceInstitution: "Independent National Electoral Commission (INEC)", sourceDocument: "State Offices & Resident Electoral Commissioners", sourceURL: STATE_DIRECTORY, sourceVersionDate: null, retrievalDate: RETRIEVAL_DATE, supports: ["37 State/FCT names", "Geopolitical-zone classifications", "774 LGA total"], limitations: "The linked LGA Directory PDFs returned HTTP 404 on retrieval date." },
    { sourceInstitution: "Independent National Electoral Commission (INEC)", sourceDocument: "Report of the 2023 General Election", sourceURL: "https://www.inecnigeria.org/wp-content/uploads/2024/02/2023-GENERAL-ELECTION-REPORT-1.pdf", sourceVersionDate: "2024-02-01", retrievalDate: RETRIEVAL_DATE, supports: ["109 Senatorial District total", "360 Federal Constituency total", "State/FCT mapping in INEC election systems"], limitations: "Count and mapping evidence only; it is not a normalized current national constituency-code register." },
  ],
  codeAuthorities: { POLISMART_INTERNAL: ["Country", "Geopolitical Zone"], INEC: ["State/FCT", "Local Government Area/FCT Area Council", "Ward/Registration Area"] },
  unresolved: ["Current authoritative Senatorial District register, codes, and State/FCT parent reconciliation", "Current authoritative Federal Constituency register, codes, and State/FCT parent reconciliation"],
};

const batches = [
  { file: "controlled-import-batches/01-country-zones-states.json", records: records.filter((r) => ["Country", "Geopolitical Zone", "State/FCT"].includes(r.level)) },
  { file: "controlled-import-batches/02-lgas-area-councils.json", records: records.filter((r) => r.level === "Local Government Area/FCT Area Council") },
];
const wardRecords = records.filter((r) => r.level === "Ward/Registration Area");
for (let index = 0; index < wardRecords.length; index += 4500)
  batches.push({ file: `controlled-import-batches/${String(batches.length + 1).padStart(2, "0")}-wards-${String(index + 1).padStart(4, "0")}-${String(Math.min(index + 4500, wardRecords.length)).padStart(4, "0")}.json`, records: wardRecords.slice(index, index + 4500) });

const files = new Map([
  ["preparation-records.jsonl", records.map((r) => JSON.stringify(r)).join("\n") + "\n"],
  ["manifest.json", JSON.stringify(manifest, null, 2) + "\n"],
  ["validation-report.json", JSON.stringify(validation, null, 2) + "\n"],
  ["batch-plan.json", JSON.stringify({ maximumRowsPerRequest: 5000, parentOrdering: "Earlier batch or same batch", batches: batches.map((b) => ({ file: b.file, recordCount: b.records.length })) }, null, 2) + "\n"],
]);
for (const batch of batches) files.set(batch.file, JSON.stringify(batch.records.map(importRow), null, 2) + "\n");

for (const [relative, content] of files) {
  const target = path.join(ROOT, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}
const checksums = [...files].map(([relative, content]) => `${createHash("sha256").update(content).digest("hex")}  ${relative}`).join("\n") + "\n";
await writeFile(path.join(ROOT, "checksums.sha256"), checksums, "utf8");
console.log(JSON.stringify({ counts: validation.counts, batches: batches.map((b) => ({ file: b.file, count: b.records.length })), stateMismatch }, null, 2));

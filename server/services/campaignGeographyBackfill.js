import { createHash } from "node:crypto";

export const CAMPAIGN_GEOGRAPHY_BACKFILL_VERSION = "1.0.0";
export const CAMPAIGN_GEOGRAPHY_CANONICAL_VERSION = "campaign-geography-backfill-canonical-v1";
export const MASTER_AREA_CHUNK_SIZE = 500;
export const ASSIGNMENT_CHUNK_SIZE = 500;
export const CAMPAIGN_GEOGRAPHY_ASSIGNMENT_NAMESPACE = "bb930f36-4da2-5ea8-9e35-093b8086ac32";
export const CAMPAIGN_GEOGRAPHY_EXECUTION_CONFIRMATION =
  "BACKFILL AUTHORIZED CAMPAIGN GEOGRAPHY";
export const PRODUCTION_DRY_RUN_AUTHORIZATION =
  "PRODUCTION DRY RUN AUTHORIZED CAMPAIGN GEOGRAPHY";
export const PRODUCTION_EXECUTE_AUTHORIZATION =
  "PRODUCTION EXECUTION AUTHORIZED CAMPAIGN GEOGRAPHY";
export const PRODUCTION_IDENTITY = Object.freeze({
  projectId: "young-base-56422836",
  branchId: "br-noisy-forest-axlven4c",
  branchName: "production",
  database: "neondb",
});
export const PRODUCTION_NEON_BRANCH_ID = "br-noisy-forest-axlven4c";
export const EXPECTED_LEVELS = Object.freeze([
  ["Country", 0, 1],
  ["Geopolitical Zone", 1, 6],
  ["State/FCT", 2, 37],
  ["Local Government Area/FCT Area Council", 5, 774],
  ["Ward/Registration Area", 6, 8809],
]);

const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
const normalizeString = (value) => value.normalize("NFC");
const stableDate = (value) => (value == null ? null : new Date(value).toISOString());
const canonicalValue = (value) => {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return normalizeString(value);
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  return value;
};
export const canonicalSerialize = (value) =>
  `${CAMPAIGN_GEOGRAPHY_CANONICAL_VERSION}\n${JSON.stringify(canonicalValue(value))}\n`;
const compareCanonicalStrings = (left, right) => left < right ? -1 : left > right ? 1 : 0;
export const canonicalHash = (rows) =>
  createHash("sha256")
    .update(canonicalSerialize(rows.map(canonicalValue).sort((a, b) => compareCanonicalStrings(JSON.stringify(a), JSON.stringify(b)))), "utf8")
    .digest("hex");
const chunk = (rows, size) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size));

export const normalizeMasterLevel = (row) => ({
  id: row.id, countryCode: row.countryCode, name: row.name, orderIndex: row.orderIndex,
  isActive: row.isActive, createdAt: stableDate(row.createdAt), updatedAt: stableDate(row.updatedAt),
});
export const normalizeMasterArea = (row) => ({
  id: row.id, levelId: row.levelId, parentId: row.parentId ?? null, countryCode: row.countryCode,
  name: row.name, code: row.code, isActive: row.isActive, sourceInstitution: row.sourceInstitution,
  sourceDocument: row.sourceDocument, sourceVersionDate: stableDate(row.sourceVersionDate),
  retrievalDate: stableDate(row.retrievalDate), importedAt: stableDate(row.importedAt),
  validationStatus: row.validationStatus, createdAt: stableDate(row.createdAt), updatedAt: stableDate(row.updatedAt),
});
export const normalizeAssignment = (row) => ({
  id: row.id, tenantId: row.tenantId, campaignId: row.campaignId,
  masterGeographicAreaId: row.masterGeographicAreaId, isActive: row.isActive,
  createdById: row.createdById, updatedById: row.updatedById, removedAt: stableDate(row.removedAt),
});

function uuidBytes(uuid) {
  return Buffer.from(uuid.replaceAll("-", ""), "hex");
}
export function uuidV5(name, namespace = CAMPAIGN_GEOGRAPHY_ASSIGNMENT_NAMESPACE) {
  const digest = createHash("sha1").update(uuidBytes(namespace)).update(name, "utf8").digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function assertSafeIdentity(identity, expected, control = {}) {
  if (!identity?.branchId || !identity?.database || !expected?.projectId || !expected?.branchId || !expected?.branchName || !expected?.database)
    fail("IDENTITY_UNPROVEN", "Database identity is incomplete.");
  if (identity.branchId !== expected.branchId || identity.database !== expected.database)
    fail("IDENTITY_MISMATCH", "Database identity does not match the authorized target.");
  const isProduction = identity.branchId === PRODUCTION_NEON_BRANCH_ID || expected.branchId === PRODUCTION_NEON_BRANCH_ID;
  if (isProduction) {
    if (expected.projectId !== PRODUCTION_IDENTITY.projectId || expected.branchId !== PRODUCTION_IDENTITY.branchId ||
        expected.branchName !== PRODUCTION_IDENTITY.branchName || expected.database !== PRODUCTION_IDENTITY.database)
      fail("IDENTITY_MISMATCH", "Database identity does not match the authorized target.");
    if (control.productionSelector === "dry-run") {
      if (control.mode !== "dry-run" || control.confirmation !== undefined ||
          control.dryRunAuthorization !== PRODUCTION_DRY_RUN_AUTHORIZATION)
        fail("PRODUCTION_PROHIBITED", "Production dry-run authorization is invalid.");
    } else if (control.productionSelector === "execute") {
      if (control.mode !== "execute" || control.executeAuthorization !== PRODUCTION_EXECUTE_AUTHORIZATION ||
          control.confirmation !== CAMPAIGN_GEOGRAPHY_EXECUTION_CONFIRMATION)
        fail("PRODUCTION_PROHIBITED", "Production execution authorization is invalid.");
    } else fail("PRODUCTION_PROHIBITED", "Production operation is prohibited without explicit authorization.");
  } else if (control.productionSelector) {
    fail("PRODUCTION_SELECTOR_TARGET_MISMATCH", "Production authorization cannot target a non-Production database.");
  }
  return {
    databaseVerified: { database: identity.database, branchId: identity.branchId },
    operatorExpected: { projectId: expected.projectId, branchName: expected.branchName },
  };
}

export function parseBackfillCliArgs(args) {
  let mode = "dry-run";
  let modeSeen = false;
  let confirmation;
  let productionSelector;
  for (const arg of args) {
    if (arg === "--dry-run" || arg === "--execute") {
      if (modeSeen) fail("CLI_AMBIGUOUS_MODE", "Specify at most one mode option.");
      modeSeen = true;
      mode = arg === "--execute" ? "execute" : "dry-run";
    } else if (arg === "--production-dry-run" || arg === "--production-execute") {
      if (productionSelector !== undefined) fail("CLI_AMBIGUOUS_PRODUCTION_SELECTOR", "Specify one Production selector once.");
      productionSelector = arg === "--production-execute" ? "execute" : "dry-run";
    } else if (arg.startsWith("--confirm=")) {
      if (confirmation !== undefined) fail("CLI_DUPLICATE_CONFIRMATION", "Specify confirmation once.");
      confirmation = arg.slice("--confirm=".length);
      if (!confirmation || /[\r\n]/u.test(confirmation)) fail("CLI_MALFORMED_CONFIRMATION", "Confirmation is malformed.");
    } else fail("CLI_UNKNOWN_ARGUMENT", "Unknown command option.");
  }
  if (mode === "dry-run" && confirmation !== undefined) fail("CLI_AMBIGUOUS_CONFIRMATION", "Confirmation is valid only with execute mode.");
  if (mode === "execute" && confirmation !== CAMPAIGN_GEOGRAPHY_EXECUTION_CONFIRMATION)
    fail("EXECUTION_NOT_AUTHORIZED", "Exact execution confirmation is required.");
  if (productionSelector !== undefined && (!modeSeen || productionSelector !== mode))
    fail("CLI_INCOMPATIBLE_PRODUCTION_SELECTOR", "Production selector requires its explicit matching mode.");
  return { mode, confirmation, productionSelector };
}

function detectCycles(areas) {
  const byId = new Map(areas.map((area) => [area.id, area]));
  for (const area of areas) {
    const seen = new Set([area.id]);
    let parent = area.parentId;
    while (parent) {
      if (seen.has(parent)) return true;
      seen.add(parent);
      parent = byId.get(parent)?.parentId;
    }
  }
  return false;
}

export function buildCampaignGeographyPlan(source, eligibleActors) {
  const areas = [...source.areas];
  const populated = source.levels.filter((level) => areas.some((area) => area.levelId === level.id));
  if (new Set(areas.map((area) => area.tenantId)).size !== 1) fail("SOURCE_TENANT_COUNT", "Source must contain one tenant.");
  if (new Set(areas.map((area) => area.campaignId)).size !== 1) fail("SOURCE_CAMPAIGN_COUNT", "Source must contain one campaign.");
  if (areas.length !== 9627 || areas.filter((area) => area.isActive).length !== 9627)
    fail("SOURCE_COUNT", "Source geography counts do not match the reviewed dataset.");
  if (areas.some((area) => !area.isActive)) fail("SOURCE_INACTIVE", "Source contains inactive geography.");
  if (source.country !== "Nigeria") fail("COUNTRY_UNSUPPORTED", "Only the reviewed Nigeria mapping is supported.");
  if (populated.length !== EXPECTED_LEVELS.length) fail("LEVEL_COUNT", "Populated level count is invalid.");
  const levelById = new Map(populated.map((level) => [level.id, level]));
  for (const [name, orderIndex, count] of EXPECTED_LEVELS) {
    const level = populated.find((item) => item.name === name);
    if (!level || level.orderIndex !== orderIndex || areas.filter((a) => a.levelId === level.id).length !== count)
      fail("LEVEL_BREAKDOWN", "Source level breakdown is invalid.");
  }
  if (areas.some((area) => area.code == null || area.code.trim() === "")) fail("INVALID_CODE", "Every source area must have a code.");
  const canonicalKeys = new Set();
  const siblingKeys = new Set();
  const byId = new Map(areas.map((area) => [area.id, area]));
  if (detectCycles(areas)) fail("HIERARCHY_CYCLE", "Source hierarchy contains a cycle.");
  for (const area of areas) {
    const canonicalKey = `${area.levelId}\0${area.code}`;
    if (canonicalKeys.has(canonicalKey)) fail("DUPLICATE_CANONICAL", "Duplicate canonical identity.");
    canonicalKeys.add(canonicalKey);
    const siblingKey = `${area.levelId}\0${area.parentId ?? "ROOT"}\0${area.name}`;
    if (siblingKeys.has(siblingKey)) fail("DUPLICATE_SIBLING", "Duplicate sibling name.");
    siblingKeys.add(siblingKey);
    if (area.parentId === area.id) fail("SELF_PARENT", "Self-parenting geography is invalid.");
    if (area.parentId && !byId.has(area.parentId)) fail("MISSING_PARENT", "A source parent is missing.");
    if (area.parentId) {
      const parent = byId.get(area.parentId);
      if (parent.tenantId !== area.tenantId || parent.campaignId !== area.campaignId) fail("CROSS_SCOPE_PARENT", "A source parent crosses scope.");
      const childIndex = EXPECTED_LEVELS.findIndex(([name]) => name === levelById.get(area.levelId)?.name);
      const parentIndex = EXPECTED_LEVELS.findIndex(([name]) => name === levelById.get(parent.levelId)?.name);
      if (childIndex !== parentIndex + 1) fail("WRONG_LEVEL_PARENT", "A source parent has the wrong level.");
    } else if (levelById.get(area.levelId)?.name !== "Country") fail("MISSING_PARENT", "Only Country may be a root.");
  }
  if (eligibleActors.length !== 1) fail(eligibleActors.length ? "MULTIPLE_ACTORS" : "ACTOR_NOT_FOUND", "Exactly one eligible actor is required.");
  const actorId = eligibleActors[0].id;
  const masterLevels = populated
    .map((level) => ({ id: level.id, countryCode: "NG", name: level.name, orderIndex: level.orderIndex, isActive: level.isActive, createdAt: level.createdAt, updatedAt: level.updatedAt }))
    .sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));
  const masterAreas = areas
    .map((area) => ({ id: area.id, levelId: area.levelId, parentId: area.parentId, countryCode: "NG", name: area.name, code: area.code, isActive: area.isActive, sourceInstitution: area.sourceInstitution, sourceDocument: area.sourceDocument, sourceVersionDate: area.sourceVersionDate, retrievalDate: area.retrievalDate, importedAt: area.importedAt, validationStatus: area.validationStatus, createdAt: area.createdAt, updatedAt: area.updatedAt }))
    .sort((a, b) => levelById.get(a.levelId).orderIndex - levelById.get(b.levelId).orderIndex || a.id.localeCompare(b.id));
  const assignments = masterAreas.map((area) => ({ id: uuidV5(`${areas[0].tenantId}\0${areas[0].campaignId}\0${area.id}`), tenantId: areas[0].tenantId, campaignId: areas[0].campaignId, masterGeographicAreaId: area.id, isActive: area.isActive, createdById: actorId, updatedById: actorId, removedAt:null }));
  if (assignments.some((item) => item.id === item.masterGeographicAreaId)) fail("ASSIGNMENT_ID_COLLISION", "Assignment ID collides with master identity.");
  const legacyRows = areas.map((a) => ({ id:a.id,levelId:a.levelId,parentId:a.parentId,name:a.name,code:a.code,isActive:a.isActive,sourceInstitution:a.sourceInstitution,sourceDocument:a.sourceDocument,sourceVersionDate:stableDate(a.sourceVersionDate),retrievalDate:stableDate(a.retrievalDate),importedAt:stableDate(a.importedAt),createdAt:stableDate(a.createdAt),updatedAt:stableDate(a.updatedAt) }));
  return { actorId, masterLevels, masterAreas, assignments, evidence: { canonicalVersion:CAMPAIGN_GEOGRAPHY_CANONICAL_VERSION, legacyHierarchy:canonicalHash(legacyRows), masterHierarchy:canonicalHash(masterAreas.map(normalizeMasterArea)), identityMapping:canonicalHash(masterAreas.map((a)=>({legacyAreaId:a.id,masterAreaId:a.id}))), assignments:canonicalHash(assignments.map(normalizeAssignment)), levelMapping:canonicalHash(masterLevels.map((l)=>({legacyLevelId:l.id,masterLevelId:l.id,countryCode:l.countryCode,name:l.name,orderIndex:l.orderIndex,isActive:l.isActive}))) } };
}

export function classifyTarget(target, plan) {
  const counts = [target.levels.length, target.areas.length, target.assignments.length];
  if (counts.every((count) => count === 0)) return "EMPTY";
  if (counts[0] !== 5 || counts[1] !== 9627 || counts[2] !== 9627) fail("PARTIAL_TARGET", "Target state is partial or unexpected.");
  const same = canonicalHash(target.levels.map(normalizeMasterLevel)) === canonicalHash(plan.masterLevels.map(normalizeMasterLevel)) && canonicalHash(target.areas.map(normalizeMasterArea)) === canonicalHash(plan.masterAreas.map(normalizeMasterArea)) && canonicalHash(target.assignments.map(normalizeAssignment)) === canonicalHash(plan.assignments.map(normalizeAssignment));
  if (!same) fail("CONFLICTING_TARGET", "Complete target does not match the reviewed plan.");
  return "ALREADY_COMPLETE";
}

export async function runCampaignGeographyBackfill({ repository, expectedIdentity, mode = "dry-run", confirmation, productionSelector, productionDryRunAuthorization, productionExecuteAuthorization, commit, checkpointId = null }) {
  const identity = assertSafeIdentity(await repository.getIdentity(), expectedIdentity, {
    mode,
    confirmation,
    productionSelector,
    dryRunAuthorization: productionDryRunAuthorization,
    executeAuthorization: productionExecuteAuthorization,
  });
  const prepare = async (repo) => {
    const source = await repo.readSource();
    const actors = await repo.findEligibleActors(source.areas[0]?.tenantId);
    const plan = buildCampaignGeographyPlan(source, actors);
    const target = await repo.readTarget();
    return { source, plan, state: classifyTarget(target, plan) };
  };
  const initial = await prepare(repository);
  const report = { mode, target:identity, targetState:initial.state, sourceCount:initial.source.areas.length, plannedMasterLevels:5, plannedMasterAreas:9627, plannedAssignments:9627, actorEligibility:1, hashes:initial.plan.evidence, commit, checkpointId, toolVersion:CAMPAIGN_GEOGRAPHY_BACKFILL_VERSION };
  if (mode === "dry-run" || initial.state === "ALREADY_COMPLETE") return { ...report, outcome:initial.state === "ALREADY_COMPLETE" ? "ALREADY_COMPLETE" : "DRY_RUN_VALID" };
  if (mode !== "execute" || confirmation !== CAMPAIGN_GEOGRAPHY_EXECUTION_CONFIRMATION) fail("EXECUTION_NOT_AUTHORIZED", "Exact execution confirmation is required.");
  return repository.transaction(async (tx) => {
    await tx.acquireAdvisoryLock();
    const current = await prepare(tx);
    if (current.state !== "EMPTY") fail("TARGET_CHANGED", "Target changed before execution.");
    await tx.insertMasterLevels(current.plan.masterLevels);
    for (const [, orderIndex] of EXPECTED_LEVELS) {
      const levelRows = current.plan.masterAreas.filter((area) => current.source.levels.find((level) => level.id === area.levelId)?.orderIndex === orderIndex);
      for (const rows of chunk(levelRows, MASTER_AREA_CHUNK_SIZE)) await tx.insertMasterAreas(rows);
    }
    for (const rows of chunk(current.plan.assignments, ASSIGNMENT_CHUNK_SIZE)) await tx.insertAssignments(rows);
    const complete = await prepare(tx);
    if (complete.state !== "ALREADY_COMPLETE") fail("POSTCHECK_FAILED", "Post-backfill verification failed.");
    await tx.appendAudit({ tenantId:current.source.areas[0].tenantId, actorId:current.plan.actorId, action:"CAMPAIGN_GEOGRAPHY_BACKFILL_EXECUTED", entity:"campaign", entityId:current.source.areas[0].campaignId, metadata:{ counts:{masterLevels:5,masterAreas:9627,assignments:9627}, hashes:current.plan.evidence, commit, checkpointId, toolVersion:CAMPAIGN_GEOGRAPHY_BACKFILL_VERSION } });
    return { ...report, outcome:"EXECUTED" };
  });
}

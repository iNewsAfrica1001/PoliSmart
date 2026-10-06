import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildRehearsalSentinelRetirement,
  buildRehearsalSentinelSetup,
  PRODUCTION_BRANCH_ID,
  validateRehearsalAuthorization,
  validateRehearsalSentinel,
  validateSentinelInstallationAuthorization,
} from "./campaign-geography-postgres-harness.mjs";

export const REHEARSAL_ROLES = Object.freeze({
  migrator: "polismart_migrator",
  runtime: "polismart_runtime",
  unprivileged: "polismart_rehearsal_unprivileged",
});
export const REHEARSAL_ENV_FILE = ".env.campaign-geography-rehearsal.local";

const fail = (message) => new Error(`Campaign Geography rehearsal control refused: ${message}`);
const assert = (condition, message) => { if (!condition) throw fail(message); };

export function parseRequiredJson(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} is required`);
  try { return JSON.parse(value); } catch { throw fail(`${label} is malformed`); }
}

export function validateControlTarget({ authorization, controlPlane, databaseIdentity, now = new Date() }) {
  validateSentinelInstallationAuthorization({ authorization, controlPlane, now });
  assert(controlPlane.branchId !== PRODUCTION_BRANCH_ID, "Production branch is denied");
  assert(databaseIdentity?.database === controlPlane.database, "database identity mismatch");
  assert(databaseIdentity?.branchId === controlPlane.branchId, "database branch identity mismatch");
  return true;
}

export function validateBootstrapEnvironment(environment) {
  assert(!environment.DATABASE_URL, "generic DATABASE_URL substitution is prohibited");
  assert(!environment.MIGRATION_DATABASE_URL, "MIGRATION_DATABASE_URL substitution is prohibited");
  for (const name of ["CAMPAIGN_GEOGRAPHY_REHEARSAL_OWNER_URL", "CAMPAIGN_GEOGRAPHY_REHEARSAL_AUTHORIZATION",
    "CAMPAIGN_GEOGRAPHY_REHEARSAL_CONTROL_PLANE"])
    assert(environment[name], `${name} is required`);
  return true;
}

export function securePassword(bytes = 32) {
  assert(Number.isInteger(bytes) && bytes >= 24, "password entropy is insufficient");
  return crypto.randomBytes(bytes).toString("base64url");
}

export function roleUrl(ownerUrl, role, password) {
  const url = new URL(ownerUrl);
  url.username = role;
  url.password = password;
  return url.toString();
}

export function renderCredentialEnvironment(urls) {
  return [
    `CAMPAIGN_GEOGRAPHY_REHEARSAL_MIGRATOR_URL=${urls.migrator}`,
    `CAMPAIGN_GEOGRAPHY_REHEARSAL_RUNTIME_URL=${urls.runtime}`,
    `CAMPAIGN_GEOGRAPHY_REHEARSAL_UNPRIVILEGED_URL=${urls.unprivileged}`,
    "",
  ].join("\n");
}

export function assertGitIgnored(filePath, cwd = process.cwd()) {
  const relative = path.relative(cwd, filePath);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "credential output must be inside the repository");
  try { execFileSync("git", ["check-ignore", "--quiet", "--", relative], { cwd, stdio: "ignore" }); }
  catch { throw fail("credential output is not Git-ignored"); }
  return true;
}

export async function writeCredentialEnvironment({ filePath, urls, cwd = process.cwd() }) {
  assertGitIgnored(filePath, cwd);
  const temporary = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, renderCredentialEnvironment(urls), { encoding: "utf8", flag: "wx", mode: 0o600 });
    await fs.link(temporary, filePath);
    await fs.rm(temporary);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

export async function bootstrapRehearsalCredentials({ adapter, authorization, controlPlane, passwordFactory = securePassword }) {
  validateRehearsalAuthorization(authorization);
  assert(controlPlane?.branchId !== PRODUCTION_BRANCH_ID, "Production branch is denied");
  validateSentinelInstallationAuthorization({ authorization, controlPlane });
  const identity = await adapter.readIdentity();
  validateControlTarget({ authorization, controlPlane, databaseIdentity: identity });
  const passwords = Object.fromEntries(Object.keys(REHEARSAL_ROLES).map((key) => [key, passwordFactory()]));
  await adapter.transaction(async (tx) => {
    await tx.assertExistingRole(REHEARSAL_ROLES.migrator);
    await tx.assertExistingRole(REHEARSAL_ROLES.runtime);
    await tx.rotateLogin(REHEARSAL_ROLES.migrator, passwords.migrator);
    await tx.rotateLogin(REHEARSAL_ROLES.runtime, passwords.runtime);
    await tx.ensureUnprivilegedLogin(REHEARSAL_ROLES.unprivileged, passwords.unprivileged);
    await tx.verifyRoleSeparation(REHEARSAL_ROLES);
  });
  return Object.freeze({
    migrator: roleUrl(adapter.ownerUrl, REHEARSAL_ROLES.migrator, passwords.migrator),
    runtime: roleUrl(adapter.ownerUrl, REHEARSAL_ROLES.runtime, passwords.runtime),
    unprivileged: roleUrl(adapter.ownerUrl, REHEARSAL_ROLES.unprivileged, passwords.unprivileged),
  });
}

export async function installRehearsalSentinel({ adapter, authorization, controlPlane }) {
  validateRehearsalAuthorization(authorization);
  assert(controlPlane?.branchId !== PRODUCTION_BRANCH_ID, "Production branch is denied");
  validateSentinelInstallationAuthorization({ authorization, controlPlane });
  const identity = await adapter.readIdentity();
  validateControlTarget({ authorization, controlPlane, databaseIdentity: identity });
  const setup = buildRehearsalSentinelSetup({ authorization, controlPlane });
  await adapter.transaction(async (tx) => {
    assert((await tx.findSentinelLifecycle(authorization.nonce)).length === 0, "authorization nonce was already used");
    await tx.insertAudit(setup.record);
    const rows = await tx.findSentinelLifecycle(authorization.nonce);
    assert(rows.length === 1, "sentinel installation verification failed");
    validateRehearsalSentinel(authorization, rows[0]);
  });
  return true;
}

export async function retireRehearsalSentinel({ adapter, authorization, controlPlane, retiredAt = new Date().toISOString() }) {
  validateRehearsalAuthorization(authorization);
  assert(controlPlane?.branchId !== PRODUCTION_BRANCH_ID, "Production branch is denied");
  validateSentinelInstallationAuthorization({ authorization, controlPlane });
  const identity = await adapter.readIdentity();
  validateControlTarget({ authorization, controlPlane, databaseIdentity: identity });
  const retirement = buildRehearsalSentinelRetirement({ authorization, retiredAt });
  await adapter.transaction(async (tx) => {
    const before = await tx.findSentinelLifecycle(authorization.nonce);
    assert(before.length === 1, "exact active sentinel was not found");
    validateRehearsalSentinel(authorization, before[0]);
    await tx.insertAudit(retirement.record);
    const after = await tx.findSentinelLifecycle(authorization.nonce);
    assert(after.length === 1 && after[0].retired_at, "sentinel retirement verification failed");
    try { validateRehearsalSentinel(authorization, after[0]); }
    catch { return; }
    throw fail("retired sentinel remained reusable");
  });
  return true;
}

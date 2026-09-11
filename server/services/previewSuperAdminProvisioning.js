import { ROLES } from "../config/authorization.js";

export const PREVIEW_SUPER_ADMIN_ROLE = ROLES.SUPER_ADMINISTRATOR;

function provisioningError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function assertPreviewProvisioningEnvironment({ nodeEnv, vercelEnv, expectedBranchId }) {
  if (String(nodeEnv || "").toLowerCase() === "production") {
    throw provisioningError("Provisioning is prohibited in Production.", "PRODUCTION_BLOCKED");
  }
  if (String(vercelEnv || "").toLowerCase() !== "preview") {
    throw provisioningError("VERCEL_ENV must be preview.", "PREVIEW_ENV_REQUIRED");
  }
  if (!String(expectedBranchId || "").trim()) {
    throw provisioningError("The expected Preview branch identity is required.", "BRANCH_ID_REQUIRED");
  }
}

export function assertPreviewDatabaseIdentity(identity, expectedBranchId) {
  if (identity?.database !== "neondb") {
    throw provisioningError("The connected database is not the approved Preview database.", "DATABASE_MISMATCH");
  }
  if (!identity?.branchId || identity.branchId !== expectedBranchId) {
    throw provisioningError("The connected Neon branch does not match the approved Preview branch.", "BRANCH_MISMATCH");
  }
}

export function validateProvisioningTarget({ user, organization, requestedRole }) {
  if (requestedRole !== PREVIEW_SUPER_ADMIN_ROLE) {
    throw provisioningError("Only SUPER_ADMINISTRATOR provisioning is supported.", "ROLE_NOT_SUPPORTED");
  }
  if (!user) throw provisioningError("The registered user was not found.", "USER_NOT_FOUND");
  if (!user.emailVerifiedAt) {
    throw provisioningError("The Preview account must be verified first.", "USER_NOT_VERIFIED");
  }
  if (!organization) {
    throw provisioningError("The Preview organization was not found.", "ORGANIZATION_NOT_FOUND");
  }
  const memberships = user.memberships || [];
  const targetMembership = memberships.find(
    (membership) => membership.tenantId === organization.id && membership.status === "ACTIVE",
  );
  if (!targetMembership) {
    throw provisioningError("The user has no active membership in the selected organization.", "MEMBERSHIP_NOT_FOUND");
  }
  if (memberships.some((membership) => membership.tenantId !== organization.id)) {
    throw provisioningError("The user belongs to an unexpected organization.", "UNEXPECTED_ORGANIZATION");
  }
  if (targetMembership.role === PREVIEW_SUPER_ADMIN_ROLE) {
    throw provisioningError("The membership is already SUPER_ADMINISTRATOR.", "ALREADY_PROVISIONED");
  }
  return targetMembership;
}

export async function preparePreviewSuperAdminProvisioning({
  repository,
  email,
  organizationId,
  expectedBranchId,
  nodeEnv,
  vercelEnv,
  requestedRole = PREVIEW_SUPER_ADMIN_ROLE,
}) {
  assertPreviewProvisioningEnvironment({ nodeEnv, vercelEnv, expectedBranchId });
  const identity = await repository.getDatabaseIdentity();
  assertPreviewDatabaseIdentity(identity, expectedBranchId);
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !String(organizationId || "").trim()) {
    throw provisioningError("A user email and organization ID are required.", "TARGET_REQUIRED");
  }
  const [user, organization] = await Promise.all([
    repository.findUserByEmail(normalizedEmail),
    repository.findOrganizationById(organizationId),
  ]);
  const membership = validateProvisioningTarget({ user, organization, requestedRole });
  return { identity, user, organization, membership, requestedRole };
}

export async function executePreviewSuperAdminProvisioning({ repository, prepared, confirmed }) {
  if (confirmed !== true) {
    throw provisioningError("Explicit operator confirmation is required.", "CONFIRMATION_REQUIRED");
  }
  return repository.assignSuperAdministratorAndAudit({
    userId: prepared.user.id,
    tenantId: prepared.organization.id,
    membershipId: prepared.membership.id,
    expectedCurrentRole: prepared.membership.role,
    role: PREVIEW_SUPER_ADMIN_ROLE,
    environment: "preview",
    branchId: prepared.identity.branchId,
  });
}

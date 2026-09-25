import { PERMISSIONS, ROLE_PERMISSION_POLICY, ROLES } from "../config/authorization.js";

export const PRODUCTION_SUPER_ADMIN_CONFIRMATION = "ASSIGN PRODUCTION SUPER ADMINISTRATOR";

function bootstrapError(message, code) {
  return Object.assign(new Error(message), { code });
}

function unique(values, code) {
  const set = new Set(values);
  if (set.size !== values.length) throw bootstrapError("Duplicate policy entry detected.", code);
  return set;
}

export function expectedProductionCatalog() {
  const permissionKeys = Object.values(PERMISSIONS);
  const permissionSet = unique(permissionKeys, "DUPLICATE_PERMISSION_SOURCE");
  const mappings = [];
  for (const [role, keys] of Object.entries(ROLE_PERMISSION_POLICY)) {
    const roleKeys = unique([...keys], "DUPLICATE_ROLE_PERMISSION_SOURCE");
    for (const key of roleKeys) {
      if (!permissionSet.has(key))
        throw bootstrapError(
          "Role policy references an unknown permission.",
          "UNKNOWN_POLICY_PERMISSION",
        );
      mappings.push({ role, permissionKey: key });
    }
  }
  return { permissionKeys: [...permissionSet].sort(), mappings };
}

export async function bootstrapProductionCatalog(repository) {
  const expected = expectedProductionCatalog();
  return repository.synchronizeCatalog(expected);
}

export function validateProductionSuperAdminTarget({ user, organization, operatorUserId }) {
  if (!user) throw bootstrapError("The target user was not found.", "USER_NOT_FOUND");
  if (!organization)
    throw bootstrapError("The target organization was not found.", "ORGANIZATION_NOT_FOUND");
  if (!user.emailVerifiedAt)
    throw bootstrapError("The target user must have a verified email.", "USER_NOT_VERIFIED");
  if (
    String(organization.country || "")
      .trim()
      .toLowerCase() !== "nigeria"
  )
    throw bootstrapError("The target organization must be in Nigeria.", "NIGERIA_REQUIRED");
  if (!String(operatorUserId || "").trim())
    throw bootstrapError("An independent operator identifier is required.", "OPERATOR_REQUIRED");
  if (operatorUserId === user.id)
    throw bootstrapError("Self-promotion is prohibited.", "SELF_PROMOTION_PROHIBITED");

  const memberships = user.memberships || [];
  if (memberships.length !== 1)
    throw bootstrapError(
      "The target user has an unexpected membership state.",
      "UNEXPECTED_MEMBERSHIP",
    );
  const membership = memberships[0];
  if (membership.tenantId !== organization.id || membership.status !== "ACTIVE")
    throw bootstrapError(
      "The target membership is not active in the selected organization.",
      "MEMBERSHIP_MISMATCH",
    );
  if (!ROLE_PERMISSION_POLICY[membership.role])
    throw bootstrapError("The target membership has an unknown role.", "UNKNOWN_MEMBERSHIP_ROLE");
  if (membership.role === ROLES.SUPER_ADMINISTRATOR)
    throw bootstrapError(
      "The membership is already SUPER_ADMINISTRATOR.",
      "ALREADY_SUPER_ADMINISTRATOR",
    );
  return membership;
}

export async function prepareProductionSuperAdminAssignment({
  repository,
  userId,
  organizationId,
  operatorUserId,
}) {
  if (!String(userId || "").trim() || !String(organizationId || "").trim())
    throw bootstrapError(
      "Explicit user and organization identifiers are required.",
      "TARGET_REQUIRED",
    );
  const [user, organization] = await Promise.all([
    repository.findUserById(userId),
    repository.findOrganizationById(organizationId),
  ]);
  const membership = validateProductionSuperAdminTarget({ user, organization, operatorUserId });
  return { user, organization, membership, operatorUserId };
}

export async function assignProductionSuperAdmin({ repository, prepared, confirmation }) {
  if (confirmation !== PRODUCTION_SUPER_ADMIN_CONFIRMATION)
    throw bootstrapError(
      "Exact independent operator confirmation is required.",
      "CONFIRMATION_REQUIRED",
    );
  return repository.assignSuperAdministratorAndAudit({
    userId: prepared.user.id,
    tenantId: prepared.organization.id,
    membershipId: prepared.membership.id,
    expectedCurrentRole: prepared.membership.role,
    role: ROLES.SUPER_ADMINISTRATOR,
    operatorUserId: prepared.operatorUserId,
  });
}

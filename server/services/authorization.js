import { ROLE_PERMISSION_POLICY, ROLES } from "../config/authorization.js";

export function hasPermission(actor, permission) {
  if (!actor || typeof actor.role !== "string" || typeof permission !== "string") return false;
  return ROLE_PERMISSION_POLICY[actor.role]?.includes(permission) === true;
}

export function belongsToOrganization(actor, organizationId) {
  if (!actor || !organizationId) return false;
  return actor.organizationId === organizationId || actor.tenantId === organizationId;
}

export function authorize({ actor, permission, organizationId, requireOrganizationMatch = false }) {
  if (!hasPermission(actor, permission)) {
    return { allowed: false, reason: "missing-permission" };
  }
  if (requireOrganizationMatch && !belongsToOrganization(actor, organizationId)) {
    return { allowed: false, reason: "organization-mismatch" };
  }
  return { allowed: true, reason: null };
}

export function requireAuthorization(input) {
  const decision = authorize(input);
  if (!decision.allowed) {
    const error = new Error("You do not have permission to perform this action.");
    error.status = 403;
    error.code = decision.reason;
    throw error;
  }
  return decision;
}

export function canAssignRole({ actorRole, currentRole = null, requestedRole }) {
  if (!ROLE_PERMISSION_POLICY[actorRole] || !ROLE_PERMISSION_POLICY[requestedRole]) {
    return { allowed: false, reason: "unknown-role" };
  }
  if (actorRole === ROLES.SUPER_ADMINISTRATOR) {
    return { allowed: true, reason: null };
  }
  if (currentRole === ROLES.SUPER_ADMINISTRATOR || requestedRole === ROLES.SUPER_ADMINISTRATOR) {
    return { allowed: false, reason: "protected-platform-role" };
  }
  if (actorRole !== ROLES.CAMPAIGN_ADMINISTRATOR) {
    return { allowed: false, reason: "role-assignment-not-authorized" };
  }
  return { allowed: true, reason: null };
}

export function requireRoleAssignmentAuthorization(input) {
  const decision = canAssignRole(input);
  if (!decision.allowed) {
    const error = new Error("You do not have permission to assign this role.");
    error.status = 403;
    error.code = decision.reason;
    throw error;
  }
  return decision;
}

import { ROLE_PERMISSION_POLICY } from "../config/authorization.js";

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

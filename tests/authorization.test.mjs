import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS, ROLES } from "../server/config/authorization.js";
import {
  authorize,
  belongsToOrganization,
  hasPermission,
  requireAuthorization,
  canAssignRole,
  requireRoleAssignmentAuthorization,
} from "../server/services/authorization.js";

test("unknown and missing roles fail closed", () => {
  assert.equal(hasPermission(null, PERMISSIONS.LEARNING_PARTICIPATE), false);
  assert.equal(hasPermission({ role: "candidate" }, PERMISSIONS.LEARNING_PARTICIPATE), false);
});

test("every role transition follows the server-side role hierarchy", () => {
  const roles = [...new Set(Object.values(ROLES))];
  for (const actorRole of roles) {
    for (const currentRole of roles) {
      for (const requestedRole of roles) {
        const decision = canAssignRole({ actorRole, currentRole, requestedRole });
        const expected =
          actorRole === ROLES.SUPER_ADMINISTRATOR ||
          (actorRole === ROLES.CAMPAIGN_ADMINISTRATOR &&
            currentRole !== ROLES.SUPER_ADMINISTRATOR &&
            requestedRole !== ROLES.SUPER_ADMINISTRATOR);
        assert.equal(
          decision.allowed,
          expected,
          `${actorRole} changing ${currentRole} to ${requestedRole}`,
        );
      }
    }
  }
});

test("campaign administrators cannot invite, promote, modify, or obtain Super Administrator", () => {
  for (const input of [
    { actorRole: ROLES.CAMPAIGN_ADMINISTRATOR, requestedRole: ROLES.SUPER_ADMINISTRATOR },
    {
      actorRole: ROLES.CAMPAIGN_ADMINISTRATOR,
      currentRole: ROLES.SUPER_ADMINISTRATOR,
      requestedRole: ROLES.ANALYST,
    },
  ]) {
    assert.throws(
      () => requireRoleAssignmentAuthorization(input),
      (error) => error.status === 403 && error.code === "protected-platform-role",
    );
  }
});

test("learner permissions do not include privileged course management", () => {
  const learner = { id: "learner-1", role: ROLES.LEARNER, organizationId: "org-1" };
  assert.equal(hasPermission(learner, PERMISSIONS.LEARNING_PARTICIPATE), true);
  assert.equal(hasPermission(learner, PERMISSIONS.COURSE_MANAGE), false);
});

test("platform administrators receive the complete deterministic policy", () => {
  const administrator = { id: "admin-1", role: ROLES.PLATFORM_ADMIN };
  for (const permission of Object.values(PERMISSIONS)) {
    assert.equal(hasPermission(administrator, permission), true);
  }
});

test("organization-scoped authorization rejects cross-tenant access", () => {
  const organizationAdmin = {
    id: "org-admin-1",
    role: ROLES.ORGANIZATION_ADMIN,
    organizationId: "org-1",
  };
  assert.equal(belongsToOrganization(organizationAdmin, "org-1"), true);
  assert.deepEqual(
    authorize({
      actor: organizationAdmin,
      permission: PERMISSIONS.ORGANIZATION_REPORTS_READ,
      organizationId: "org-2",
      requireOrganizationMatch: true,
    }),
    { allowed: false, reason: "organization-mismatch" },
  );
});

test("authorization errors are safe and carry a machine-readable reason", () => {
  assert.throws(
    () =>
      requireAuthorization({
        actor: { role: ROLES.LEARNER },
        permission: PERMISSIONS.PLATFORM_USERS_MANAGE,
      }),
    (error) =>
      error.status === 403 &&
      error.code === "missing-permission" &&
      !error.message.includes(PERMISSIONS.PLATFORM_USERS_MANAGE),
  );
});

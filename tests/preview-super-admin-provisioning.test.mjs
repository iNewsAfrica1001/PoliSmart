import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PREVIEW_SUPER_ADMIN_ROLE,
  executePreviewSuperAdminProvisioning,
  preparePreviewSuperAdminProvisioning,
} from "../server/services/previewSuperAdminProvisioning.js";
import { canAssignRole } from "../server/services/authorization.js";

const organization = { id: "org-preview", name: "Preview Organization" };
const user = {
  id: "user-preview",
  email: "preview@example.test",
  displayName: "Preview Tester",
  emailVerifiedAt: new Date(),
  memberships: [
    { id: "membership-preview", tenantId: organization.id, role: "CAMPAIGN_ADMINISTRATOR", status: "ACTIVE" },
  ],
};

function repository(overrides = {}) {
  return {
    getDatabaseIdentity: async () => ({ database: "neondb", branchId: "br-preview" }),
    findUserByEmail: async () => user,
    findOrganizationById: async () => organization,
    assignSuperAdministratorAndAudit: async (input) => input,
    ...overrides,
  };
}

function prepare(overrides = {}) {
  return preparePreviewSuperAdminProvisioning({
    repository: repository(),
    email: user.email,
    organizationId: organization.id,
    expectedBranchId: "br-preview",
    nodeEnv: "development",
    vercelEnv: "preview",
    ...overrides,
  });
}

test("controlled provisioning rejects Production and wrong database identity", async () => {
  await assert.rejects(prepare({ nodeEnv: "production" }), { code: "PRODUCTION_BLOCKED" });
  await assert.rejects(prepare({ vercelEnv: "production" }), { code: "PREVIEW_ENV_REQUIRED" });
  await assert.rejects(
    prepare({ repository: repository({ getDatabaseIdentity: async () => ({ database: "neondb", branchId: "br-main" }) }) }),
    { code: "BRANCH_MISMATCH" },
  );
});

test("controlled provisioning validates user, verification, organization, and membership tenant", async () => {
  await assert.rejects(prepare({ repository: repository({ findUserByEmail: async () => null }) }), { code: "USER_NOT_FOUND" });
  await assert.rejects(prepare({ repository: repository({ findUserByEmail: async () => ({ ...user, emailVerifiedAt: null }) }) }), { code: "USER_NOT_VERIFIED" });
  await assert.rejects(prepare({ repository: repository({ findOrganizationById: async () => null }) }), { code: "ORGANIZATION_NOT_FOUND" });
  await assert.rejects(prepare({ repository: repository({ findUserByEmail: async () => ({ ...user, memberships: [...user.memberships, { ...user.memberships[0], id: "other", tenantId: "other-org" }] }) }) }), { code: "UNEXPECTED_ORGANIZATION" });
});

test("only the fixed SUPER_ADMINISTRATOR operation can execute after explicit confirmation", async () => {
  await assert.rejects(prepare({ requestedRole: "CAMPAIGN_ADMINISTRATOR" }), { code: "ROLE_NOT_SUPPORTED" });
  const prepared = await prepare();
  await assert.rejects(executePreviewSuperAdminProvisioning({ repository: repository(), prepared, confirmed: false }), { code: "CONFIRMATION_REQUIRED" });
  const result = await executePreviewSuperAdminProvisioning({ repository: repository(), prepared, confirmed: true });
  assert.equal(result.role, PREVIEW_SUPER_ADMIN_ROLE);
  assert.equal(result.environment, "preview");
});

test("Campaign Administrators cannot promote themselves and no public provisioning route exists", () => {
  assert.equal(canAssignRole({ actorRole: "CAMPAIGN_ADMINISTRATOR", currentRole: "CAMPAIGN_ADMINISTRATOR", requestedRole: PREVIEW_SUPER_ADMIN_ROLE }).allowed, false);
  const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  assert.doesNotMatch(server, /provision-preview-super-admin|previewSuperAdminProvisioning/);
});

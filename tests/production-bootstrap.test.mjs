import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PERMISSIONS, ROLE_PERMISSION_POLICY } from "../server/config/authorization.js";
import { createProductionBootstrapRepository } from "../server/repositories/productionBootstrapRepository.js";
import {
  PRODUCTION_SUPER_ADMIN_CONFIRMATION,
  assignProductionSuperAdmin,
  bootstrapProductionCatalog,
  expectedProductionCatalog,
  prepareProductionSuperAdminAssignment,
} from "../server/services/productionBootstrap.js";

function memoryDatabase({ permissions = [], mappings = [], failAudit = false } = {}) {
  const state = {
    permissions: structuredClone(permissions),
    mappings: structuredClone(mappings),
    membershipRole: "CAMPAIGN_ADMINISTRATOR",
    audits: [],
  };
  let nextId = 1;
  const tx = {
    permission: {
      findMany: async () => structuredClone(state.permissions),
      upsert: async ({ where, update, create }) => {
        const found = state.permissions.find((item) => item.key === where.key);
        if (found) Object.assign(found, update);
        else state.permissions.push({ id: `p${nextId++}`, ...create });
      },
    },
    rolePermission: {
      findMany: async () =>
        state.mappings.map((item) => ({ ...item, permission: { key: item.permissionKey } })),
      upsert: async ({ where, create }) => {
        const permission = state.permissions.find((item) => item.id === create.permissionId);
        const identity = where.role_permissionId;
        if (
          !state.mappings.some(
            (item) => item.role === identity.role && item.permissionId === identity.permissionId,
          )
        )
          state.mappings.push({
            id: `rp${nextId++}`,
            role: create.role,
            permissionId: create.permissionId,
            permissionKey: permission.key,
          });
      },
    },
    membership: {
      updateMany: async ({ where, data }) => {
        if (state.membershipRole !== where.role) return { count: 0 };
        state.membershipRole = data.role;
        return { count: 1 };
      },
    },
    securityAuditEvent: {
      create: async ({ data }) => {
        if (failAudit) throw new Error("audit failed");
        state.audits.push(data);
      },
    },
  };
  return {
    state,
    $transaction: async (callback) => {
      const snapshot = structuredClone(state);
      try {
        return await callback(tx);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    },
  };
}

const organization = { id: "org-nigeria", country: "Nigeria" };
const user = {
  id: "user-target",
  emailVerifiedAt: new Date(),
  memberships: [
    {
      id: "membership-1",
      tenantId: organization.id,
      role: "CAMPAIGN_ADMINISTRATOR",
      status: "ACTIVE",
    },
  ],
};

function targetRepository(overrides = {}) {
  return {
    findUserById: async () => user,
    findOrganizationById: async () => organization,
    assignSuperAdministratorAndAudit: async (input) => input,
    ...overrides,
  };
}

test("catalog uses exactly the authorization source of truth and is idempotent", async () => {
  const expected = expectedProductionCatalog();
  assert.deepEqual(expected.permissionKeys, Object.values(PERMISSIONS).sort());
  assert.deepEqual(
    new Set(expected.mappings.map(({ role, permissionKey }) => `${role}:${permissionKey}`)),
    new Set(
      Object.entries(ROLE_PERMISSION_POLICY).flatMap(([role, keys]) =>
        keys.map((item) => `${role}:${item}`),
      ),
    ),
  );
  const db = memoryDatabase();
  const repository = createProductionBootstrapRepository(db);
  const first = await bootstrapProductionCatalog(repository);
  const second = await bootstrapProductionCatalog(repository);
  assert.deepEqual(second, first);
  assert.equal(db.state.permissions.length, expected.permissionKeys.length);
  assert.equal(db.state.mappings.length, expected.mappings.length);
});

test("catalog rejects stale permissions and stale role mappings", async () => {
  const stalePermissionDb = memoryDatabase({
    permissions: [{ id: "stale", key: "unknown:permission" }],
  });
  await assert.rejects(
    bootstrapProductionCatalog(createProductionBootstrapRepository(stalePermissionDb)),
    {
      code: "STALE_PERMISSION_CATALOG",
    },
  );

  const expected = expectedProductionCatalog();
  const permissions = expected.permissionKeys.map((key, index) => ({ id: `p${index}`, key }));
  const staleMappingDb = memoryDatabase({
    permissions,
    mappings: [
      {
        id: "stale",
        role: "VOLUNTEER",
        permissionId: permissions[0].id,
        permissionKey: permissions[0].key,
      },
    ],
  });
  await assert.rejects(
    bootstrapProductionCatalog(createProductionBootstrapRepository(staleMappingDb)),
    {
      code: "STALE_ROLE_MAPPING",
    },
  );
});

test("Super Administrator preparation enforces verified Nigeria target and independent operator", async () => {
  const input = {
    userId: user.id,
    organizationId: organization.id,
    operatorUserId: "independent-operator",
  };
  await assert.rejects(
    prepareProductionSuperAdminAssignment({
      repository: targetRepository({
        findUserById: async () => ({ ...user, emailVerifiedAt: null }),
      }),
      ...input,
    }),
    { code: "USER_NOT_VERIFIED" },
  );
  await assert.rejects(
    prepareProductionSuperAdminAssignment({
      repository: targetRepository({
        findOrganizationById: async () => ({ ...organization, country: "Ghana" }),
      }),
      ...input,
    }),
    { code: "NIGERIA_REQUIRED" },
  );
  await assert.rejects(
    prepareProductionSuperAdminAssignment({
      repository: targetRepository(),
      ...input,
      operatorUserId: user.id,
    }),
    { code: "SELF_PROMOTION_PROHIBITED" },
  );
});

test("Super Administrator preparation rejects existing role and incorrect membership state", async () => {
  const input = { userId: user.id, organizationId: organization.id, operatorUserId: "operator" };
  await assert.rejects(
    prepareProductionSuperAdminAssignment({
      repository: targetRepository({
        findUserById: async () => ({
          ...user,
          memberships: [{ ...user.memberships[0], role: "SUPER_ADMINISTRATOR" }],
        }),
      }),
      ...input,
    }),
    { code: "ALREADY_SUPER_ADMINISTRATOR" },
  );
  await assert.rejects(
    prepareProductionSuperAdminAssignment({
      repository: targetRepository({
        findUserById: async () => ({
          ...user,
          memberships: [{ ...user.memberships[0], status: "SUSPENDED" }],
        }),
      }),
      ...input,
    }),
    { code: "MEMBERSHIP_MISMATCH" },
  );
});

test("assignment requires exact confirmation and writes a sanitized audit event atomically", async () => {
  const db = memoryDatabase();
  const repository = createProductionBootstrapRepository(db);
  const prepared = {
    user,
    organization,
    membership: user.memberships[0],
    operatorUserId: "operator-2",
  };
  await assert.rejects(assignProductionSuperAdmin({ repository, prepared, confirmation: "yes" }), {
    code: "CONFIRMATION_REQUIRED",
  });
  await assignProductionSuperAdmin({
    repository,
    prepared,
    confirmation: PRODUCTION_SUPER_ADMIN_CONFIRMATION,
  });
  assert.equal(db.state.membershipRole, "SUPER_ADMINISTRATOR");
  assert.equal(db.state.audits.length, 1);
  assert.equal(db.state.audits[0].action, "PRODUCTION_SUPER_ADMINISTRATOR_ASSIGNED");
  assert.doesNotMatch(JSON.stringify(db.state.audits[0]), /password|token|database_url|@/i);

  const failing = memoryDatabase({ failAudit: true });
  await assert.rejects(
    assignProductionSuperAdmin({
      repository: createProductionBootstrapRepository(failing),
      prepared,
      confirmation: PRODUCTION_SUPER_ADMIN_CONFIRMATION,
    }),
    /audit failed/,
  );
  assert.equal(failing.state.membershipRole, "CAMPAIGN_ADMINISTRATOR");
  assert.equal(failing.state.audits.length, 0);
});

test("bootstrap implementation has no demo, tenant, financial, or intelligence creation path", () => {
  const files = [
    "scripts/bootstrap-production-application.mjs",
    "server/services/productionBootstrap.js",
    "server/repositories/productionBootstrapRepository.js",
  ];
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(
    source,
    /\.(?:authUser|organization|campaign|fundraising\w*|survey\w*)\.create\s*\(/,
  );
  assert.doesNotMatch(
    source,
    /example\.(?:com|test|invalid)|demo password|DATABASE_URL.*(?:write|log)/i,
  );
});

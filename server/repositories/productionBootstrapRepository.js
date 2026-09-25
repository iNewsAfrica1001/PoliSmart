function key(role, permissionKey) {
  return `${role}\u0000${permissionKey}`;
}

function catalogError(message, code) {
  return Object.assign(new Error(message), { code });
}

export const PRODUCTION_BOOTSTRAP_TRANSACTION_OPTIONS = Object.freeze({
  maxWait: 10_000,
  timeout: 30_000,
});

export function createProductionBootstrapRepository(db) {
  return {
    async getDatabaseIdentity() {
      const [identity] = await db.$queryRaw`
        SELECT current_database() AS database,
               current_setting('neon.branch_id', true) AS "branchId"
      `;
      return identity;
    },
    async synchronizeCatalog(expected) {
      return db.$transaction(async (transaction) => {
        const existingPermissions = await transaction.permission.findMany({
          select: { id: true, key: true },
        });
        const expectedKeys = new Set(expected.permissionKeys);
        const staleKeys = existingPermissions
          .map((item) => item.key)
          .filter((item) => !expectedKeys.has(item));
        if (staleKeys.length)
          throw catalogError(
            "The permission catalog contains stale or unknown keys.",
            "STALE_PERMISSION_CATALOG",
          );

        await transaction.permission.createMany({
          data: expected.permissionKeys.map((permissionKey) => ({
            key: permissionKey,
            description: `${permissionKey} permission`,
          })),
          skipDuplicates: true,
        });

        const permissions = await transaction.permission.findMany({
          select: { id: true, key: true },
        });
        if (permissions.length !== expected.permissionKeys.length)
          throw catalogError(
            "The permission catalog is incomplete.",
            "PERMISSION_CATALOG_MISMATCH",
          );
        const permissionIds = new Map(permissions.map((item) => [item.key, item.id]));
        const existingMappings = await transaction.rolePermission.findMany({
          include: { permission: { select: { key: true } } },
        });
        const expectedMappings = new Set(
          expected.mappings.map((item) => key(item.role, item.permissionKey)),
        );
        const staleMappings = existingMappings.filter(
          (item) => !expectedMappings.has(key(item.role, item.permission.key)),
        );
        if (staleMappings.length)
          throw catalogError(
            "The role-permission catalog contains stale mappings.",
            "STALE_ROLE_MAPPING",
          );

        await transaction.rolePermission.createMany({
          data: expected.mappings.map((mapping) => ({
            role: mapping.role,
            permissionId: permissionIds.get(mapping.permissionKey),
          })),
          skipDuplicates: true,
        });

        const finalMappings = await transaction.rolePermission.findMany({
          include: { permission: { select: { key: true } } },
        });
        const actualMappings = new Set(
          finalMappings.map((item) => key(item.role, item.permission.key)),
        );
        if (
          actualMappings.size !== expectedMappings.size ||
          [...expectedMappings].some((item) => !actualMappings.has(item))
        )
          throw catalogError("The role-permission catalog is incomplete.", "ROLE_MAPPING_MISMATCH");
        return { permissions: permissions.length, mappings: finalMappings.length };
      }, PRODUCTION_BOOTSTRAP_TRANSACTION_OPTIONS);
    },
    findUserById(id) {
      return db.authUser.findUnique({
        where: { id },
        select: {
          id: true,
          emailVerifiedAt: true,
          memberships: { select: { id: true, tenantId: true, role: true, status: true } },
        },
      });
    },
    findOrganizationById(id) {
      return db.organization.findUnique({ where: { id }, select: { id: true, country: true } });
    },
    async assignSuperAdministratorAndAudit(input) {
      return db.$transaction(async (transaction) => {
        const updated = await transaction.membership.updateMany({
          where: {
            id: input.membershipId,
            tenantId: input.tenantId,
            userId: input.userId,
            role: input.expectedCurrentRole,
            status: "ACTIVE",
          },
          data: { role: input.role },
        });
        if (updated.count !== 1)
          throw catalogError(
            "The membership changed before assignment completed.",
            "MEMBERSHIP_CHANGED",
          );
        await transaction.securityAuditEvent.create({
          data: {
            tenantId: input.tenantId,
            actorId: null,
            action: "PRODUCTION_SUPER_ADMINISTRATOR_ASSIGNED",
            entity: "membership",
            entityId: input.membershipId,
            metadata: {
              targetUserId: input.userId,
              targetOrganizationId: input.tenantId,
              assignedRole: input.role,
              independentOperatorUserId: input.operatorUserId,
              operatorSource: "controlled-production-bootstrap-cli",
              environment: "production",
            },
          },
        });
        return { membershipId: input.membershipId, role: input.role };
      });
    },
  };
}

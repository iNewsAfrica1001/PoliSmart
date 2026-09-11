export function createPreviewSuperAdminProvisioningRepository(db) {
  return {
    async getDatabaseIdentity() {
      const [identity] = await db.$queryRaw`
        SELECT current_database() AS database,
               current_setting('neon.branch_id', true) AS "branchId"
      `;
      return identity;
    },
    findUserByEmail(email) {
      return db.authUser.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          displayName: true,
          emailVerifiedAt: true,
          memberships: { select: { id: true, tenantId: true, role: true, status: true } },
        },
      });
    },
    findOrganizationById(id) {
      return db.organization.findUnique({ where: { id }, select: { id: true, name: true } });
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
        if (updated.count !== 1) {
          const error = new Error("The membership changed before provisioning could complete.");
          error.code = "MEMBERSHIP_CHANGED";
          throw error;
        }
        await transaction.securityAuditEvent.create({
          data: {
            tenantId: input.tenantId,
            actorId: null,
            action: "PREVIEW_SUPER_ADMINISTRATOR_PROVISIONED",
            entity: "membership",
            entityId: input.membershipId,
            metadata: {
              targetUserId: input.userId,
              targetOrganizationId: input.tenantId,
              assignedRole: input.role,
              operatorSource: "controlled-operator-cli",
              environment: input.environment,
              branchId: input.branchId,
            },
          },
        });
        return { membershipId: input.membershipId, role: input.role };
      });
    },
  };
}

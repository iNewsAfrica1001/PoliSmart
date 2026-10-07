const invitationSelect = {
  id: true,
  recipientEmail: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  organization: { select: { name: true } },
};

const audit = (tx, data) => tx.securityAuditEvent.create({ data });
const fail = (message, status = 409, code = "TEAM_CHANGE_REJECTED") =>
  Object.assign(new Error(message), { status, code });

export function createTeamAdministrationRepository(db) {
  return {
    async list(tenantId, now) {
      const [members, invitations] = await Promise.all([
        db.membership.findMany({
          where: { tenantId },
          select: {
            id: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { displayName: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        db.teamInvitation.findMany({
          where: { tenantId },
          select: invitationSelect,
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ]);
      return {
        members,
        invitations: invitations.map((item) => ({
          ...item,
          effectiveStatus:
            item.status === "PENDING" && item.expiresAt <= now ? "EXPIRED" : item.status,
        })),
      };
    },
    async createInvitation(data) {
      return db.$transaction(
        async (tx) => {
          const user = await tx.authUser.findUnique({
            where: { email: data.recipientEmail },
            include: { memberships: { where: { status: "ACTIVE" } } },
          });
          if (user?.memberships.some((item) => item.tenantId === data.tenantId))
            return {
              created: false,
              invitation: {
                id: null,
                recipientEmail: data.recipientEmail,
                role: data.role,
                status: "ACTIVE",
              },
            };
          const pending = await tx.teamInvitation.findFirst({
            where: {
              tenantId: data.tenantId,
              recipientEmail: data.recipientEmail,
              status: "PENDING",
            },
            select: invitationSelect,
          });
          if (pending && pending.expiresAt > new Date())
            return { created: false, invitation: pending };
          if (pending)
            await tx.teamInvitation.update({
              where: { id: pending.id },
              data: { status: "SUPERSEDED", revokedAt: new Date() },
            });
          const invitation = await tx.teamInvitation.create({
            data: {
              tenantId: data.tenantId,
              recipientEmail: data.recipientEmail,
              role: data.role,
              tokenHash: data.tokenHash,
              expiresAt: data.expiresAt,
              invitedById: data.actorId,
            },
            select: invitationSelect,
          });
          await audit(tx, {
            tenantId: data.tenantId,
            actorId: data.actorId,
            action: "TEAM_INVITATION_CREATED",
            entity: "team_invitation",
            entityId: invitation.id,
            metadata: { role: data.role },
          });
          return { created: true, invitation };
        },
        { isolationLevel: "Serializable" },
      );
    },
    async rotateInvitation(data) {
      return db.$transaction(
        async (tx) => {
          const current = await tx.teamInvitation.findFirst({
            where: { id: data.invitationId, tenantId: data.tenantId, status: "PENDING" },
            include: { organization: { select: { name: true } } },
          });
          if (!current) return null;
          await tx.teamInvitation.update({
            where: { id: current.id },
            data: { status: "SUPERSEDED", revokedAt: new Date() },
          });
          const replacement = await tx.teamInvitation.create({
            data: {
              tenantId: data.tenantId,
              recipientEmail: current.recipientEmail,
              role: current.role,
              tokenHash: data.tokenHash,
              expiresAt: data.expiresAt,
              invitedById: data.actorId,
            },
            include: { organization: { select: { name: true } } },
          });
          await audit(tx, {
            tenantId: data.tenantId,
            actorId: data.actorId,
            action: "TEAM_INVITATION_RESENT",
            entity: "team_invitation",
            entityId: replacement.id,
            metadata: { replacedInvitationId: current.id, role: current.role },
          });
          return replacement;
        },
        { isolationLevel: "Serializable" },
      );
    },
    async revokeInvitation({ tenantId, actorId, invitationId, now }) {
      return db.$transaction(
        async (tx) => {
          const changed = await tx.teamInvitation.updateMany({
            where: { id: invitationId, tenantId, status: "PENDING", expiresAt: { gt: now } },
            data: { status: "REVOKED", revokedAt: now, revokedById: actorId },
          });
          if (!changed.count) return false;
          await audit(tx, {
            tenantId,
            actorId,
            action: "TEAM_INVITATION_REVOKED",
            entity: "team_invitation",
            entityId: invitationId,
          });
          return true;
        },
        { isolationLevel: "Serializable" },
      );
    },
    async inspectInvitation(tokenHash, now) {
      const item = await db.teamInvitation.findUnique({
        where: { tokenHash },
        select: invitationSelect,
      });
      if (!item || item.status !== "PENDING" || item.expiresAt <= now) return null;
      const [local, domain] = item.recipientEmail.split("@");
      return {
        organizationName: item.organization.name,
        role: item.role,
        expiresAt: item.expiresAt,
        maskedEmail: `${local.slice(0, 1)}***@${domain}`,
      };
    },
    async acceptExisting({ tokenHash, userId, userEmail, now }) {
      return db.$transaction(
        async (tx) => {
          const invite = await tx.teamInvitation.findUnique({ where: { tokenHash } });
          if (
            !invite ||
            invite.status !== "PENDING" ||
            invite.expiresAt <= now ||
            invite.recipientEmail !== userEmail
          )
            return null;
          const other = await tx.membership.count({
            where: { userId, status: "ACTIVE", tenantId: { not: invite.tenantId } },
          });
          if (other) return null;
          const membership = await tx.membership.upsert({
            where: { tenantId_userId: { tenantId: invite.tenantId, userId } },
            create: { tenantId: invite.tenantId, userId, role: invite.role, status: "ACTIVE" },
            update: { role: invite.role, status: "ACTIVE" },
          });
          const changed = await tx.teamInvitation.updateMany({
            where: { id: invite.id, status: "PENDING", expiresAt: { gt: now } },
            data: { status: "ACCEPTED", acceptedAt: now, acceptedById: userId },
          });
          if (!changed.count) throw fail("Invitation is no longer available.");
          await audit(tx, {
            tenantId: invite.tenantId,
            actorId: userId,
            action: "TEAM_INVITATION_ACCEPTED",
            entity: "team_invitation",
            entityId: invite.id,
            metadata: { role: invite.role },
          });
          return membership;
        },
        { isolationLevel: "Serializable" },
      );
    },
    async acceptNew({ tokenHash, displayName, passwordHash, now }) {
      return db.$transaction(
        async (tx) => {
          const invite = await tx.teamInvitation.findUnique({ where: { tokenHash } });
          if (!invite || invite.status !== "PENDING" || invite.expiresAt <= now) return null;
          if (await tx.authUser.findUnique({ where: { email: invite.recipientEmail } }))
            throw fail("Sign in to accept this invitation.", 409, "INVITATION_SIGN_IN_REQUIRED");
          const user = await tx.authUser.create({
            data: { email: invite.recipientEmail, displayName, passwordHash, emailVerifiedAt: now },
          });
          const membership = await tx.membership.create({
            data: {
              tenantId: invite.tenantId,
              userId: user.id,
              role: invite.role,
              status: "ACTIVE",
            },
          });
          const changed = await tx.teamInvitation.updateMany({
            where: { id: invite.id, status: "PENDING", expiresAt: { gt: now } },
            data: { status: "ACCEPTED", acceptedAt: now, acceptedById: user.id },
          });
          if (!changed.count) throw fail("Invitation is no longer available.");
          await audit(tx, {
            tenantId: invite.tenantId,
            actorId: user.id,
            action: "TEAM_INVITATION_ACCEPTED",
            entity: "team_invitation",
            entityId: invite.id,
            metadata: { role: invite.role },
          });
          return membership;
        },
        { isolationLevel: "Serializable" },
      );
    },
    async changeRole({ tenantId, actorId, actorRole, membershipId, role, now }) {
      return db.$transaction(
        async (tx) => {
          const member = await tx.membership.findFirst({
            where: { id: membershipId, tenantId },
            select: { id: true, userId: true, role: true, status: true },
          });
          if (!member) throw fail("Membership not found.", 404);
          if (member.userId === actorId || member.role === "SUPER_ADMINISTRATOR")
            throw fail("This membership cannot be changed.", 403);
          if (member.role === "CAMPAIGN_ADMINISTRATOR" && actorRole !== "SUPER_ADMINISTRATOR")
            throw fail("Only a Super Administrator may change an administrator.", 403);
          if (member.role === "CAMPAIGN_ADMINISTRATOR") {
            const admins = await tx.membership.count({
              where: { tenantId, role: "CAMPAIGN_ADMINISTRATOR", status: "ACTIVE" },
            });
            if (admins <= 1) throw fail("The last administrator cannot be changed.");
          }
          await tx.membership.update({ where: { id: member.id }, data: { role } });
          await tx.authSession.deleteMany({ where: { userId: member.userId } });
          await audit(tx, {
            tenantId,
            actorId,
            action: "MEMBERSHIP_ROLE_CHANGED",
            entity: "membership",
            entityId: member.id,
            metadata: { oldRole: member.role, role, at: now.toISOString(), actorRole },
          });
          return true;
        },
        { isolationLevel: "Serializable" },
      );
    },
    async setMembershipStatus({ tenantId, actorId, actorRole, membershipId, status, now }) {
      return db.$transaction(
        async (tx) => {
          const member = await tx.membership.findFirst({
            where: { id: membershipId, tenantId },
            select: { id: true, userId: true, role: true, status: true },
          });
          if (!member) throw fail("Membership not found.", 404);
          if (member.userId === actorId || member.role === "SUPER_ADMINISTRATOR")
            throw fail("This membership cannot be changed.", 403);
          if (member.role === "CAMPAIGN_ADMINISTRATOR" && actorRole !== "SUPER_ADMINISTRATOR")
            throw fail("Only a Super Administrator may change an administrator.", 403);
          if (status === "SUSPENDED" && member.role === "CAMPAIGN_ADMINISTRATOR") {
            const admins = await tx.membership.count({
              where: { tenantId, role: "CAMPAIGN_ADMINISTRATOR", status: "ACTIVE" },
            });
            if (admins <= 1) throw fail("The last administrator cannot be suspended.");
          }
          await tx.membership.update({ where: { id: member.id }, data: { status } });
          await tx.authSession.deleteMany({ where: { userId: member.userId } });
          await audit(tx, {
            tenantId,
            actorId,
            action: status === "ACTIVE" ? "MEMBERSHIP_REACTIVATED" : "MEMBERSHIP_SUSPENDED",
            entity: "membership",
            entityId: member.id,
            metadata: { previousStatus: member.status, at: now.toISOString() },
          });
          return true;
        },
        { isolationLevel: "Serializable" },
      );
    },
  };
}

import { hashToken, hashPassword, newOpaqueToken, normalizeEmail } from "./authentication.js";
import { ROLES } from "../config/authorization.js";

const INVITATION_HOURS = 72;
export const SUBORDINATE_TEAM_ROLES = Object.freeze([
  ROLES.CANDIDATE,
  ROLES.CAMPAIGN_MANAGER,
  ROLES.POLICY_DIRECTOR,
  ROLES.COMMUNICATIONS_DIRECTOR,
  ROLES.FIELD_DIRECTOR,
  ROLES.VOLUNTEER_COORDINATOR,
  ROLES.ANALYST,
  ROLES.VOLUNTEER,
]);

function safeError(message, status = 400, code = "TEAM_REQUEST_INVALID") {
  return Object.assign(new Error(message), { status, code });
}

export function assignableTeamRoles(actorRole) {
  if (actorRole === ROLES.SUPER_ADMINISTRATOR)
    return [...SUBORDINATE_TEAM_ROLES, ROLES.CAMPAIGN_ADMINISTRATOR];
  if (actorRole === ROLES.CAMPAIGN_ADMINISTRATOR) return [...SUBORDINATE_TEAM_ROLES];
  return [];
}

export function createTeamAdministrationService(
  repository,
  { tokenSecret, notifications, now = () => new Date() } = {},
) {
  if (!tokenSecret || tokenSecret.length < 32)
    throw new Error("Team invitation token secret must be at least 32 characters.");
  const digest = (token) => hashToken(token, tokenSecret);
  const assertRole = (actorRole, role) => {
    if (!assignableTeamRoles(actorRole).includes(role))
      throw safeError(
        "You do not have permission to assign this role.",
        403,
        "ROLE_NOT_ASSIGNABLE",
      );
  };
  const invitationInvalid = () =>
    safeError("Invitation is invalid or no longer available.", 400, "INVITATION_INVALID");

  return {
    assignableRoles: assignableTeamRoles,
    list: (tenantId) => repository.list(tenantId, now()),
    async invite({ tenantId, actorId, actorRole, email, role }) {
      const recipientEmail = normalizeEmail(email);
      if (!/^\S+@\S+\.\S+$/.test(recipientEmail))
        throw safeError("A valid email address is required.");
      assertRole(actorRole, role);
      const token = newOpaqueToken();
      const result = await repository.createInvitation({
        tenantId,
        actorId,
        recipientEmail,
        role,
        tokenHash: digest(token),
        expiresAt: new Date(now().getTime() + INVITATION_HOURS * 3600000),
      });
      if (result.created)
        await notifications?.sendTeamInvitation?.({
          email: recipientEmail,
          token,
          organizationName: result.invitation.organization.name,
          role,
        });
      return { invitation: result.invitation, delivered: result.created };
    },
    async resend({ tenantId, actorId, actorRole, invitationId }) {
      const token = newOpaqueToken();
      const result = await repository.rotateInvitation({
        tenantId,
        actorId,
        actorRole,
        invitationId,
        tokenHash: digest(token),
        expiresAt: new Date(now().getTime() + INVITATION_HOURS * 3600000),
      });
      if (!result) throw invitationInvalid();
      await notifications?.sendTeamInvitation?.({
        email: result.recipientEmail,
        token,
        organizationName: result.organization.name,
        role: result.role,
      });
      return result;
    },
    async revoke(input) {
      if (!(await repository.revokeInvitation({ ...input, now: now() }))) throw invitationInvalid();
    },
    inspect: (token) => repository.inspectInvitation(digest(String(token || "")), now()),
    async acceptExisting({ token, user }) {
      if (!user) throw safeError("Authentication required to accept this invitation.", 401);
      const result = await repository.acceptExisting({
        tokenHash: digest(String(token || "")),
        userId: user.id,
        userEmail: normalizeEmail(user.email),
        now: now(),
      });
      if (!result) throw invitationInvalid();
      return result;
    },
    async acceptNew({ token, displayName, password }) {
      if (!String(displayName || "").trim()) throw safeError("Display name is required.");
      const passwordHash = await hashPassword(password);
      const result = await repository.acceptNew({
        tokenHash: digest(String(token || "")),
        displayName: String(displayName).trim(),
        passwordHash,
        now: now(),
      });
      if (!result) throw invitationInvalid();
      return result;
    },
    async changeRole(input) {
      assertRole(input.actorRole, input.role);
      return repository.changeRole({ ...input, now: now() });
    },
    suspend: (input) =>
      repository.setMembershipStatus({ ...input, status: "SUSPENDED", now: now() }),
    reactivate: (input) =>
      repository.setMembershipStatus({ ...input, status: "ACTIVE", now: now() }),
  };
}

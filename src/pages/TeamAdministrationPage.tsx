import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "../lib/auth";
import { teamApi, type TeamInvitation, type TeamMember } from "../lib/teamAdministration";

const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export function TeamAdministrationPage({ user }: { user: SessionUser }) {
  const membership = user.memberships.find((item) => item.canManageTeam);
  const tenantId = membership?.tenantId || "";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError("");
    try {
      const data = await teamApi.list(tenantId);
      setMembers(data.members);
      setInvitations(data.invitations);
      setRoles(data.assignableRoles);
      setRole((current) => current || data.assignableRoles[0] || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Team information could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function invite(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await teamApi.invite(tenantId, email, role);
      setEmail("");
      setMessage("Invitation is pending. Delivery is limited to the intended recipient.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invitation failed.");
    }
  }
  async function action(callback: () => Promise<unknown>, confirmation: string, success: string) {
    if (!window.confirm(confirmation)) return;
    setError("");
    setMessage("");
    try {
      await callback();
      setMessage(success);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Team update failed.");
    }
  }
  if (!membership)
    return (
      <section className="restricted-state">
        <h1>Restricted access</h1>
        <p>Team Administration requires authorized tenant administration.</p>
      </section>
    );
  return (
    <section className="team-admin" aria-labelledby="team-title">
      <header>
        <span className="eyebrow">TENANT ADMINISTRATION</span>
        <h1 id="team-title">Team Administration</h1>
        <p>
          Invite and manage authorized members of {membership.organization.name}. Access applies to
          this organization workspace.
        </p>
      </header>
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <form className="team-invite-form" onSubmit={invite}>
        <h2>Invite member</h2>
        <label htmlFor="invite-email">Work email</label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <label htmlFor="invite-role">Role</label>
        <select id="invite-role" required value={role} onChange={(e) => setRole(e.target.value)}>
          {roles.map((item) => (
            <option value={item} key={item}>
              {label(item)}
            </option>
          ))}
        </select>
        <p className="field-help">Invitation links expire after 72 hours and can be used once.</p>
        <button type="submit" disabled={!role}>
          Send invitation
        </button>
      </form>
      <section aria-labelledby="members-title">
        <h2 id="members-title">Members</h2>
        {loading ? (
          <p role="status">Loading team…</p>
        ) : members.length === 0 ? (
          <p>No members are available.</p>
        ) : (
          <div className="team-grid">
            {members.map((member) => (
              <article key={member.id} className="team-card">
                <h3>{member.user.displayName}</h3>
                <p>{member.user.email}</p>
                <p>
                  <strong>{label(member.role)}</strong> · {label(member.status)}
                </p>
                {roles.includes(member.role) && (
                  <>
                    <label htmlFor={`role-${member.id}`}>Role</label>
                    <select
                      id={`role-${member.id}`}
                      value={member.role}
                      disabled={!roles.includes(member.role)}
                      onChange={(e) =>
                        void action(
                          () => teamApi.role(tenantId, member.id, e.target.value),
                          "Change this member's role and sign them out?",
                          "Role updated.",
                        )
                      }
                    >
                      {[...new Set([member.role, ...roles])].map((item) => (
                        <option key={item} value={item}>
                          {label(item)}
                        </option>
                      ))}
                    </select>
                    {member.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void action(
                            () => teamApi.status(tenantId, member.id, "suspend"),
                            "Suspend this membership and sign the member out?",
                            "Membership suspended.",
                          )
                        }
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void action(
                            () => teamApi.status(tenantId, member.id, "reactivate"),
                            "Reactivate this membership?",
                            "Membership reactivated.",
                          )
                        }
                      >
                        Reactivate
                      </button>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="invitations-title">
        <h2 id="invitations-title">Invitations</h2>
        {!loading && invitations.length === 0 ? (
          <p>No invitations have been created.</p>
        ) : (
          <div className="team-grid">
            {invitations.map((invite) => (
              <article key={invite.id} className="team-card">
                <h3>{invite.recipientEmail}</h3>
                <p>
                  {label(invite.role)} · {label(invite.effectiveStatus)}
                </p>
                <p>Expires {new Date(invite.expiresAt).toLocaleString()}</p>
                {invite.effectiveStatus === "PENDING" && (
                  <div className="form-row">
                    <button
                      type="button"
                      onClick={() =>
                        void action(
                          () => teamApi.resend(tenantId, invite.id),
                          "Replace the current invitation link?",
                          "Invitation resent with a new secure link.",
                        )
                      }
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void action(
                          () => teamApi.revoke(tenantId, invite.id),
                          "Revoke this invitation?",
                          "Invitation revoked.",
                        )
                      }
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

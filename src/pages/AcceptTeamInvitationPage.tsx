import { useEffect, useState, type FormEvent } from "react";
import { teamApi } from "../lib/teamAdministration";
export function AcceptTeamInvitationPage({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<{
    organizationName: string;
    role: string;
    expiresAt: string;
    maskedEmail: string;
  } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    teamApi
      .inspect(token)
      .then((result) => setInvitation(result.invitation))
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Invitation is unavailable."),
      );
  }, [token]);
  async function accept(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await teamApi.acceptNew(token, displayName, password);
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invitation could not be accepted.");
    }
  }
  async function acceptExisting() {
    setError("");
    try {
      await teamApi.acceptExisting(token);
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Sign in with the invited account, then reopen this link.",
      );
    }
  }
  return (
    <main className="login-page">
      <section className="login-form-wrap">
        <form onSubmit={accept}>
          <span className="eyebrow">SECURE TEAM INVITATION</span>
          <h1>Join PoliSmart Africa AI</h1>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {done ? (
            <>
              <p className="form-success" role="status">
                Invitation accepted. Continue to your secure workspace.
              </p>
              <a href="/login">Continue to sign in</a>
            </>
          ) : invitation ? (
            <>
              <p>
                You were invited to <strong>{invitation.organizationName}</strong> as{" "}
                {invitation.role.toLowerCase().replaceAll("_", " ")}.
              </p>
              <p>Intended recipient: {invitation.maskedEmail}</p>
              <button type="button" onClick={() => void acceptExisting()}>
                Accept with my signed-in account
              </button>
              <hr />
              <p>Or create a new invited account:</p>
              <label htmlFor="invite-name">Full name</label>
              <input
                id="invite-name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
              <label htmlFor="invite-password">Create password</label>
              <input
                id="invite-password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-describedby="invite-password-help"
              />
              <small id="invite-password-help" className="field-help">
                Use 12–128 characters with upper-case, lower-case, and numeric characters.
              </small>
              <p className="registration-legal">
                By creating an account, you acknowledge the <a href="/privacy">Privacy Policy</a>{" "}
                and <a href="/terms">Terms of Service</a>. No consent option is pre-selected.
              </p>
              <button type="submit">Create account and accept</button>
              <p>
                Already registered but signed out? <a href="/login">Sign in</a>, then reopen this
                invitation link.
              </p>
            </>
          ) : (
            !error && <p role="status">Validating invitation…</p>
          )}
        </form>
      </section>
    </main>
  );
}

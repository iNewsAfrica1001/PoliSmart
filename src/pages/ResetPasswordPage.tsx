import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authApi } from "../lib/auth";

type ResetPasswordPageProps = { token: string };

export function ResetPasswordPage({ token }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This password-reset link is invalid or incomplete.");
      return;
    }
    if (password !== confirmation) {
      setError("The password confirmation does not match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setComplete(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The password could not be reset. Request a new link and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page reset-page">
      <section className="login-story">
        <a className="login-brand" href="/">
          <span className="brand-symbol">P</span>
          <span>
            <strong>PoliSmart</strong>
            <small>AFRICA AI</small>
          </span>
        </a>
        <div>
          <span className="eyebrow eyebrow--light">SECURE ACCOUNT RECOVERY</span>
          <h1>
            Restore access.
            <br />
            <em>Return securely.</em>
          </h1>
          <p>Reset links are time-limited, single-use, and protected by server-side validation.</p>
        </div>
      </section>
      <section className="login-form-wrap">
        {complete ? (
          <div className="reset-success" role="status">
            <div className="login-lock">
              <ShieldCheck />
            </div>
            <span className="eyebrow">PASSWORD UPDATED</span>
            <h2>Reset complete</h2>
            <p>Your password has been changed and existing sessions have been signed out.</p>
            <a className="sign-in-button" href="/">
              Continue to sign in <ArrowRight />
            </a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="login-lock">
              <KeyRound />
            </div>
            <span className="eyebrow">PASSWORD RESET</span>
            <h2>Choose a new password</h2>
            <p>Use 12–128 characters with upper-case, lower-case, and a number.</p>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="sign-in-button" type="submit" disabled={submitting || !token}>
              {submitting ? "Updating password…" : "Update password"} <ArrowRight />
            </button>
            {!token && <p className="form-error">Request a new password-reset email.</p>}
          </form>
        )}
      </section>
    </main>
  );
}

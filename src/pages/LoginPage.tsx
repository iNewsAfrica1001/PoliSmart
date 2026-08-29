import { ArrowLeft, ArrowRight, Check, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authApi } from "../lib/auth";

type LoginPageProps = { onContinue: (email: string, password: string) => Promise<void> };

export function LoginPage({ onContinue }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "forgot" | "register" | "resend">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setConfirmation("");
    try {
      if (mode === "forgot") {
        await authApi.requestPasswordReset(email);
        setConfirmation("If the account exists, reset instructions will be sent.");
      } else if (mode === "resend") {
        await authApi.requestEmailVerification(email);
        setConfirmation(
          "If the account exists and is unverified, verification instructions will be sent.",
        );
      } else if (mode === "register") {
        const result = await authApi.register({
          email,
          password,
          displayName,
          organizationName,
          country,
        });
        setConfirmation(result.message);
      } else {
        await onContinue(email, password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }
  function changeMode(nextMode: "login" | "forgot" | "register" | "resend") {
    setMode(nextMode);
    setError("");
    setConfirmation("");
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <a className="login-brand" href="/">
          <span className="brand-symbol">P</span>
          <span>
            <strong>PoliSmart</strong>
            <small>AFRICA AI</small>
          </span>
        </a>
        <div>
          <span className="eyebrow eyebrow--light">INTELLIGENCE • OPERATIONS • IMPACT</span>
          <h1>
            Run smarter campaigns.
            <br />
            <em>Serve people better.</em>
          </h1>
          <p>A secure, Africa-focused platform for campaign leaders and their teams.</p>
          <ul>
            <li>
              <Check /> Unified campaign operations
            </li>
            <li>
              <Check /> Responsible AI assistance
            </li>
            <li>
              <Check /> Built-in accountability
            </li>
          </ul>
        </div>
        <footer>
          © 2026 Sentinel LLC <span>polismartafrica.ai</span>
        </footer>
      </section>
      <section className="login-form-wrap">
        <form onSubmit={submit}>
          <div className="login-lock">
            {mode === "forgot" || mode === "resend" ? (
              <KeyRound />
            ) : mode === "register" ? (
              <UserPlus />
            ) : (
              <ShieldCheck />
            )}
          </div>
          <span className="eyebrow">
            {mode === "forgot" || mode === "resend"
              ? "ACCOUNT RECOVERY"
              : mode === "register"
                ? "CREATE WORKSPACE"
                : "SECURE WORKSPACE"}
          </span>
          <h2>
            {mode === "forgot" || mode === "resend"
              ? mode === "resend"
                ? "Resend verification"
                : "Reset password"
              : mode === "register"
                ? "Create your account"
                : "Welcome back"}
          </h2>
          <p>
            {mode === "forgot" || mode === "resend"
              ? mode === "resend"
                ? "Enter your work email. We will send verification instructions if an unverified account exists."
                : "Enter your work email. We will send reset instructions if an account exists."
              : mode === "register"
                ? "Create a campaign workspace and verify your email before use."
                : "Sign in to continue to PoliSmart Africa AI."}
          </p>
          {mode === "register" && (
            <>
              <label htmlFor="display-name">Full name</label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                autoComplete="name"
              />
              <label htmlFor="organization-name">Organization</label>
              <input
                id="organization-name"
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                required
                autoComplete="organization"
              />
              <label htmlFor="country">Country</label>
              <input
                id="country"
                type="text"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                required
                autoComplete="country-name"
              />
            </>
          )}
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@organization.com"
            required
            autoComplete="email"
          />
          {mode !== "forgot" && mode !== "resend" && (
            <>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </>
          )}
          {mode === "login" && (
            <div className="form-row">
              <label className="check-label">
                <input type="checkbox" /> Remember me
              </label>
              <button type="button" className="link-button" onClick={() => changeMode("forgot")}>
                Forgot password?
              </button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {confirmation && (
            <p className="form-success" role="status">
              {confirmation}
            </p>
          )}
          <button className="sign-in-button" type="submit" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : mode === "forgot"
                ? "Send reset instructions"
                : mode === "resend"
                  ? "Send verification instructions"
                  : mode === "register"
                    ? "Create account"
                    : "Enter workspace"}{" "}
            <ArrowRight />
          </button>
          {mode === "login" ? (
            <div className="auth-action-stack">
              <button
                type="button"
                className="secondary-auth-action"
                onClick={() => changeMode("register")}
              >
                Create a new organization account
              </button>
              <button
                type="button"
                className="secondary-auth-action"
                onClick={() => changeMode("resend")}
              >
                Resend verification email
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="secondary-auth-action"
              onClick={() => changeMode("login")}
            >
              <ArrowLeft /> Back to sign in
            </button>
          )}
        </form>
        <p className="support-copy">
          Team invitations are managed by your organization administrator.
        </p>
      </section>
    </main>
  );
}

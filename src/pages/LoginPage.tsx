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
            <strong>PoliSmart Africa AI</strong>
            <small>CAMPAIGN INTELLIGENCE</small>
          </span>
        </a>
        <div>
          <span className="eyebrow eyebrow--light">
            POLITICAL INTELLIGENCE • CAMPAIGN OPERATIONS
          </span>
          <h1>
            Grounded intelligence.
            <br />
            <em>Better campaign decisions.</em>
          </h1>
          <p className="positioning-copy">
            AI-powered political campaign intelligence and management platform designed for African
            political and governance environments.
          </p>
          <p className="audience-copy">
            Built for candidates, campaign teams, policy leaders, analysts, field teams, and
            organization administrators who need evidence-aware coordination.
          </p>
          <ul className="brand-capabilities" aria-label="Version 1 capabilities">
            <li>
              <Check /> Campaign management
            </li>
            <li>
              <Check /> Grounded public-opinion intelligence
            </li>
            <li>
              <Check /> AI-assisted analysis
            </li>
            <li>
              <Check /> Afrobarometer-supported intelligence
            </li>
            <li>
              <Check /> Policy workflows and event management
            </li>
            <li>
              <Check /> Volunteer management
            </li>
            <li>
              <Check /> Organization accounts
            </li>
            <li>
              <Check /> Role-based administration
            </li>
          </ul>
          <p className="evidence-note">
            Grounded evidence helps teams separate observed data from AI interpretation. AI does not
            guarantee outcomes; people remain responsible for campaign and policy decisions.
          </p>
          <p className="source-note">
            Afrobarometer is an independent public research source. Coverage varies by country and
            survey round; its use here does not imply endorsement or partnership.
          </p>
        </div>
        <footer>
          © 2026 SentinelAI LLC <span>polismartafrica.ai</span>
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
              <label htmlFor="display-name">Authorized account owner</label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                autoComplete="name"
                aria-describedby="display-name-help"
              />
              <small id="display-name-help" className="field-help">
                Enter the full name of the person authorized to administer this organization.
              </small>
              <label htmlFor="organization-name">Organization name</label>
              <input
                id="organization-name"
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                required
                autoComplete="organization"
                aria-describedby="organization-name-help"
              />
              <small id="organization-name-help" className="field-help">
                This creates an isolated organization workspace for your campaign team.
              </small>
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
                aria-describedby={mode === "register" ? "password-requirements" : undefined}
              />
              {mode === "register" && (
                <small id="password-requirements" className="field-help">
                  Use 12–128 characters with an uppercase letter, lowercase letter, and number.
                </small>
              )}
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
            <div className="form-success" role="status">
              <strong>{confirmation}</strong>
              {mode === "register" && (
                <span>
                  Next, open the time-limited verification link in your email, then return here to
                  sign in. If it does not arrive, use “Resend verification email.”
                </span>
              )}
            </div>
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
          {mode === "register" && (
            <p className="registration-legal">
              By creating an account, you confirm authority to act for the organization and
              acknowledge the <a href="/privacy">Privacy Policy</a> and{" "}
              <a href="/terms">Terms of Service</a>. No consent option is pre-selected.
            </p>
          )}
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
          Team invitations are managed by your organization administrator. Need help?{" "}
          <a href="mailto:support@polismartafrica.ai">Contact PoliSmart Africa AI support</a>.
        </p>
        <nav className="legal-placeholders" aria-label="Legal information">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </nav>
      </section>
    </main>
  );
}

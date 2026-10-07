import { ArrowLeft, ArrowRight, Check, KeyRound, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authApi } from "../lib/auth";

type LoginPageProps = { onContinue: (email: string, password: string) => Promise<void> };

export function LoginPage({ onContinue }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "forgot" | "resend">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      } else {
        await onContinue(email, password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }
  function changeMode(nextMode: "login" | "forgot" | "resend") {
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
            {mode === "forgot" || mode === "resend" ? <KeyRound /> : <ShieldCheck />}
          </div>
          <span className="eyebrow">
            {mode === "forgot" || mode === "resend" ? "ACCOUNT RECOVERY" : "SECURE WORKSPACE"}
          </span>
          <h2>
            {mode === "forgot" || mode === "resend"
              ? mode === "resend"
                ? "Resend verification"
                : "Reset password"
              : "Welcome back"}
          </h2>
          <p>
            {mode === "forgot" || mode === "resend"
              ? mode === "resend"
                ? "Enter your work email. We will send verification instructions if an unverified account exists."
                : "Enter your work email. We will send reset instructions if an account exists."
              : "Sign in to continue to PoliSmart Africa AI."}
          </p>
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
                autoComplete="current-password"
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
            <div className="form-success" role="status">
              <strong>{confirmation}</strong>
            </div>
          )}
          <button className="sign-in-button" type="submit" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : mode === "forgot"
                ? "Send reset instructions"
                : mode === "resend"
                  ? "Send verification instructions"
                  : "Enter workspace"}{" "}
            <ArrowRight />
          </button>
          {mode === "login" ? (
            <div className="auth-action-stack">
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

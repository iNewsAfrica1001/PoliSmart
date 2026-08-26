import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

type LoginPageProps = { onContinue: (email: string, password: string) => Promise<void> };

export function LoginPage({ onContinue }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onContinue(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
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
            <ShieldCheck />
          </div>
          <span className="eyebrow">SECURE WORKSPACE</span>
          <h2>Welcome back</h2>
          <p>Sign in to continue to PoliSmart Africa AI.</p>
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
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
          <div className="form-row">
            <label className="check-label">
              <input type="checkbox" /> Remember me
            </label>
            <button type="button" className="link-button" disabled>
              Forgot password?
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="sign-in-button" type="submit" disabled={submitting}>
            Enter workspace <ArrowRight />
          </button>
          <small className="demo-note">Use an account provisioned for your organization.</small>
        </form>
        <p className="support-copy">Need access? Contact your organization administrator.</p>
      </section>
    </main>
  );
}

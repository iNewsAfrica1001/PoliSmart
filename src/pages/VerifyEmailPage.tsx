import { ArrowRight, CheckCircle2, MailWarning, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, authApi } from "../lib/auth";

type VerifyEmailPageProps = { token: string };
type VerificationState =
  "verifying" | "success" | "invalid" | "expired" | "used" | "verified" | "failure";

const messages: Record<VerificationState, { heading: string; body: string }> = {
  verifying: {
    heading: "Verifying your email…",
    body: "Please wait while we securely confirm your email address.",
  },
  success: {
    heading: "Email verified successfully",
    body: "Your account is verified. You can now continue to login.",
  },
  invalid: {
    heading: "Verification link invalid",
    body: "This verification link is invalid. Request a new verification email.",
  },
  expired: {
    heading: "Verification link expired",
    body: "This verification link has expired. Request a new verification email.",
  },
  used: {
    heading: "Verification link already used",
    body: "This verification link has already been used. Continue to login or request a new email if needed.",
  },
  verified: {
    heading: "Email already verified",
    body: "This account is already verified. You can continue to login.",
  },
  failure: {
    heading: "Verification could not be completed",
    body: "Please request a new verification email and try again.",
  },
};

export function VerifyEmailPage({ token }: VerifyEmailPageProps) {
  const started = useRef(false);
  const [state, setState] = useState<VerificationState>(token ? "verifying" : "invalid");

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void authApi.verifyEmail(token).then(
      () => setState("success"),
      (error: unknown) => {
        const code = error instanceof ApiError ? error.code : undefined;
        setState(
          code === "VERIFICATION_TOKEN_EXPIRED"
            ? "expired"
            : code === "VERIFICATION_TOKEN_ALREADY_USED"
              ? "used"
              : code === "ACCOUNT_ALREADY_VERIFIED"
                ? "verified"
                : code === "VERIFICATION_TOKEN_INVALID"
                  ? "invalid"
                  : "failure",
        );
      },
    );
  }, [token]);

  const message = messages[state];
  return (
    <main className="login-page reset-page">
      <section className="login-story">
        <a className="login-brand" href="/">
          <span className="brand-symbol">P</span>
          <span>
            <strong>PoliSmart Africa AI</strong>
            <small>SECURE ACCOUNT ACCESS</small>
          </span>
        </a>
        <div>
          <span className="eyebrow eyebrow--light">SECURE EMAIL VERIFICATION</span>
          <h1>
            Confirm access.
            <br />
            <em>Protect your account.</em>
          </h1>
          <p>Verification links are time-limited, single-use, and validated on the server.</p>
        </div>
      </section>
      <section className="login-form-wrap">
        <div
          className="reset-success"
          role={state === "verifying" || state === "success" ? "status" : "alert"}
        >
          <div className="login-lock">
            {state === "success" || state === "verified" ? (
              <CheckCircle2 />
            ) : state === "verifying" ? (
              <ShieldCheck />
            ) : (
              <MailWarning />
            )}
          </div>
          <span className="eyebrow">EMAIL VERIFICATION</span>
          <h2>{message.heading}</h2>
          <p>{message.body}</p>
          {state !== "verifying" && (
            <a className="sign-in-button" href="/">
              Continue to login <ArrowRight />
            </a>
          )}
        </div>
        <p className="support-copy">
          Need help?{" "}
          <a href="mailto:support@polismartafrica.ai">Contact PoliSmart Africa AI support</a>.
        </p>
      </section>
    </main>
  );
}

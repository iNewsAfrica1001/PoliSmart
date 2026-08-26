import nodemailer from "nodemailer";

export class AccountNotificationError extends Error {
  constructor(code) {
    super("Transactional email delivery failed.");
    this.name = "AccountNotificationError";
    this.code = code;
  }
}

export function classifySmtpError(error) {
  if (error?.code === "EAUTH") return "SMTP_AUTHENTICATION_FAILED";
  if (error?.code === "ETIMEDOUT") return "SMTP_TIMEOUT";
  if (error?.command === "MAIL FROM") return "SMTP_SENDER_REJECTED";
  if (error?.command === "RCPT TO" || error?.code === "EENVELOPE") return "SMTP_RECIPIENT_REJECTED";
  if (error?.code === "ESOCKET" && /tls|certificate|ssl/i.test(String(error?.message || "")))
    return "SMTP_TLS_FAILED";
  if (["ECONNECTION", "ECONNREFUSED", "ENOTFOUND", "ESOCKET"].includes(error?.code))
    return "SMTP_CONNECTION_FAILED";
  return "SMTP_PROVIDER_FAILED";
}

export function createAccountNotificationService(config = {}, options = {}) {
  const usesSmtp = ["smtp", "microsoft365"].includes(config.emailProvider);
  const createTransport = options.createTransport || nodemailer.createTransport;
  const smtpTransport = usesSmtp
    ? options.smtpTransport ||
      createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: { user: config.smtpUser, pass: config.smtpPassword },
        requireTLS: !config.smtpSecure,
        tls: { minVersion: "TLSv1.2", servername: config.smtpHost },
      })
    : null;

  async function send({ email, subject, path }) {
    if (config.emailProvider === "console" || !config.emailProvider) {
      console.info(JSON.stringify({ event: "account-email-queued", delivery: "console", subject }));
      return;
    }
    if (usesSmtp) {
      if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.emailFrom)
        throw new Error("Production SMTP delivery is not configured.");
      try {
        await smtpTransport.sendMail({
          from: config.emailFrom,
          to: email,
          subject,
          html: `<p>${subject}</p><p><a href="${config.publicUrl}${path}">Continue securely</a></p>`,
        });
      } catch (error) {
        const code = classifySmtpError(error);
        console.error(
          JSON.stringify({
            at: new Date().toISOString(),
            level: "error",
            event: "transactional-email-failed",
            provider: config.emailProvider,
            code,
          }),
        );
        throw new AccountNotificationError(code);
      }
      return;
    }
    if (config.emailProvider !== "resend" || !config.emailApiKey || !config.emailFrom)
      throw new Error("Production email delivery is not configured.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.emailApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: [email],
        subject,
        html: `<p>${subject}</p><p><a href="${config.publicUrl}${path}">Continue securely</a></p>`,
      }),
    });
    if (!response.ok) throw new Error("Account email delivery failed.");
  }
  return {
    sendEmailVerification: ({ email, token }) =>
      send({
        email,
        subject: "Verify your PoliSmart account",
        path: `/verify-email?token=${encodeURIComponent(token)}`,
      }),
    sendPasswordReset: ({ email, token }) =>
      send({
        email,
        subject: "Reset your PoliSmart password",
        path: `/reset-password?token=${encodeURIComponent(token)}`,
      }),
  };
}

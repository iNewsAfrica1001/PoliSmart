import nodemailer from "nodemailer";

export function createAccountNotificationService(config = {}, options = {}) {
  const smtpTransport =
    config.emailProvider === "smtp"
      ? options.smtpTransport ||
        nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          auth: { user: config.smtpUser, pass: config.smtpPassword },
          requireTLS: !config.smtpSecure,
        })
      : null;

  async function send({ email, subject, path }) {
    if (config.emailProvider === "console" || !config.emailProvider) {
      console.info(JSON.stringify({ event: "account-email-queued", delivery: "console", subject }));
      return;
    }
    if (config.emailProvider === "smtp") {
      if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.emailFrom)
        throw new Error("Production SMTP delivery is not configured.");
      await smtpTransport.sendMail({
        from: config.emailFrom,
        to: email,
        subject,
        html: `<p>${subject}</p><p><a href="${config.publicUrl}${path}">Continue securely</a></p>`,
      });
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

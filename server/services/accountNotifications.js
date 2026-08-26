import nodemailer from "nodemailer";
import { ConfidentialClientApplication } from "@azure/msal-node";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

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

export function classifyGraphError(error) {
  if (error?.notificationCode) return error.notificationCode;
  const code = String(error?.errorCode || error?.code || "").toLowerCase();
  if (/tenant|invalid_instance/.test(code)) return "GRAPH_INVALID_TENANT";
  if (/invalid_client|unauthorized_client|700016/.test(code)) return "GRAPH_INVALID_CLIENT";
  if (/invalid.*secret|7000215|credential/.test(code)) return "GRAPH_INVALID_CLIENT_SECRET";
  return "GRAPH_TOKEN_ACQUISITION_FAILED";
}

function graphResponseCode(status) {
  if (status === 401) return "GRAPH_TOKEN_REJECTED";
  if (status === 403) return "GRAPH_ACCESS_DENIED";
  if (status === 404) return "GRAPH_SENDER_NOT_FOUND";
  if (status === 429) return "GRAPH_RATE_LIMITED";
  if (status >= 500) return "GRAPH_SERVICE_FAILURE";
  if (status >= 400 && status < 500) return "GRAPH_RECIPIENT_REJECTED";
  return "GRAPH_PROVIDER_FAILURE";
}

function mailboxAddress(value) {
  return (
    String(value || "")
      .match(/<([^>]+)>|([^\s<>]+@[^\s<>]+)/)
      ?.slice(1)
      .find(Boolean)
      ?.toLowerCase() || ""
  );
}

export function createAccountNotificationService(config = {}, options = {}) {
  const usesSmtp = ["smtp", "microsoft365"].includes(config.emailProvider);
  const createTransport = options.createTransport || nodemailer.createTransport;
  const smtpDeliveryTimeoutMs = options.smtpDeliveryTimeoutMs ?? 12_000;
  const graphFetch = options.graphFetch || fetch;
  const graphTimeoutMs = options.graphTimeoutMs ?? 10_000;
  const sleep = options.sleep || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const graphClient =
    config.emailProvider === "microsoft_graph"
      ? options.graphClient ||
        new ConfidentialClientApplication({
          auth: {
            authority: `https://login.microsoftonline.com/${config.microsoftTenantId}`,
            clientId: config.microsoftClientId,
            clientSecret: config.microsoftClientSecret,
          },
          system: { loggerOptions: { piiLoggingEnabled: false } },
        })
      : null;
  let cachedGraphToken = null;
  const smtpTransport = usesSmtp
    ? options.smtpTransport ||
      createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: { user: config.smtpUser, pass: config.smtpPassword },
        requireTLS: !config.smtpSecure,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
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
      let timeoutHandle;
      try {
        await Promise.race([
          smtpTransport.sendMail({
            from: config.emailFrom,
            to: email,
            subject,
            html: `<p>${subject}</p><p><a href="${config.publicUrl}${path}">Continue securely</a></p>`,
          }),
          new Promise((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(Object.assign(new Error("SMTP delivery deadline exceeded."), { code: "ETIMEDOUT" })),
              smtpDeliveryTimeoutMs,
            );
          }),
        ]);
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
      } finally {
        clearTimeout(timeoutHandle);
      }
      return;
    }
    if (config.emailProvider === "microsoft_graph") {
      const sender = mailboxAddress(config.emailFrom);
      if (
        sender !== "no-reply@polismartafrica.ai" ||
        !config.microsoftTenantId ||
        !config.microsoftClientId ||
        !config.microsoftClientSecret
      )
        throw new AccountNotificationError("GRAPH_CONFIGURATION_INVALID");
      try {
        if (!cachedGraphToken || cachedGraphToken.expiresAt <= Date.now() + 60_000) {
          const token = await graphClient.acquireTokenByClientCredential({ scopes: [GRAPH_SCOPE] });
          if (!token?.accessToken) throw new Error("Microsoft Graph token was unavailable.");
          cachedGraphToken = {
            accessToken: token.accessToken,
            expiresAt: token.expiresOn?.getTime?.() || Date.now() + 5 * 60_000,
          };
        }
      } catch (error) {
        const code = classifyGraphError(error);
        console.error(JSON.stringify({ at: new Date().toISOString(), level: "error", event: "transactional-email-failed", provider: "microsoft_graph", code }));
        throw new AccountNotificationError(code);
      }

      const requestBody = JSON.stringify({
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: `<p>${subject}</p><p><a href="${config.publicUrl}${path}">Continue securely</a></p>`,
          },
          toRecipients: [{ emailAddress: { address: email } }],
        },
        saveToSentItems: true,
      });
      let response;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), graphTimeoutMs);
        try {
          response = await graphFetch(`${GRAPH_BASE_URL}/users/${encodeURIComponent(sender)}/sendMail`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cachedGraphToken.accessToken}`,
              "Content-Type": "application/json",
            },
            body: requestBody,
            signal: controller.signal,
          });
        } catch (error) {
          const code = error?.name === "AbortError" ? "GRAPH_TIMEOUT" : "GRAPH_NETWORK_FAILURE";
          console.error(JSON.stringify({ at: new Date().toISOString(), level: "error", event: "transactional-email-failed", provider: "microsoft_graph", code }));
          throw new AccountNotificationError(code);
        } finally {
          clearTimeout(timeoutHandle);
        }
        if (response.status !== 429 || attempt === 1) break;
        const retryAfterHeader = response.headers.get("retry-after");
        if (retryAfterHeader === null) break;
        const retryAfter = Number(retryAfterHeader);
        if (!Number.isFinite(retryAfter) || retryAfter < 0 || retryAfter > 5) break;
        await sleep(retryAfter * 1000);
      }
      if (response.status !== 202) {
        const code = graphResponseCode(response.status);
        console.error(JSON.stringify({ at: new Date().toISOString(), level: "error", event: "transactional-email-failed", provider: "microsoft_graph", code, status: response.status }));
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

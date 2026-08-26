import { ConfidentialClientApplication } from "@azure/msal-node";
import { inspectGraphAccessToken } from "../server/services/accountNotifications.js";

const required = [
  "MICROSOFT_TENANT_ID",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "EMAIL_FROM",
];
const missing = required.filter((name) => !String(process.env[name] || "").trim());
if (missing.length) {
  console.error(JSON.stringify({ status: "configuration-error", missing }));
  process.exitCode = 1;
} else if (process.env.EMAIL_FROM.trim().toLowerCase() !== "no-reply@polismartafrica.ai") {
  console.error(JSON.stringify({ status: "configuration-error", reason: "sender-not-authorized" }));
  process.exitCode = 1;
} else {
  const recipient = String(process.argv[2] || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    console.error(JSON.stringify({ status: "configuration-error", reason: "valid-recipient-argument-required" }));
    process.exitCode = 1;
  } else {
    const client = new ConfidentialClientApplication({
      auth: {
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      },
      system: { loggerOptions: { piiLoggingEnabled: false } },
    });
    try {
      const token = await client.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"],
      });
      if (!token?.accessToken) throw new Error("token-unavailable");
      const tokenClaims = inspectGraphAccessToken(token.accessToken, {
        microsoftTenantId: process.env.MICROSOFT_TENANT_ID,
        microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
      });
      const result = {
        tokenAcquired: true,
        tokenExpires: token.expiresOn?.toISOString?.(),
        tokenClaims,
      };
      if (!tokenClaims.graphAudience || !tokenClaims.applicationToken || !tokenClaims.mailSendGranted) {
        console.error(JSON.stringify({ ...result, status: "token-permission-invalid" }));
        process.exitCode = 1;
      } else {
        const response = await fetch(
          "https://graph.microsoft.com/v1.0/users/no-reply%40polismartafrica.ai/sendMail",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                subject: "PoliSmart Microsoft Graph delivery diagnostic",
                body: {
                  contentType: "HTML",
                  content: "<p>This is an authorized PoliSmart transactional-email diagnostic.</p>",
                },
                toRecipients: [{ emailAddress: { address: recipient } }],
              },
              saveToSentItems: true,
            }),
          },
        );
        let errorCode;
        if (response.status !== 202) {
          try {
            errorCode = String((await response.json())?.error?.code || "").slice(0, 100) || undefined;
          } catch {
            // Never print an untrusted raw provider response.
          }
        }
        const safeResult = {
          ...result,
          graphStatus: response.status,
          graphErrorCode: errorCode,
          microsoftRequestId: response.headers.get("request-id") || undefined,
          microsoftClientRequestId: response.headers.get("client-request-id") || undefined,
          date: response.headers.get("date") || undefined,
          status: response.status === 202 ? "accepted" : "rejected",
        };
        console[response.status === 202 ? "log" : "error"](JSON.stringify(safeResult));
        if (response.status !== 202) process.exitCode = 1;
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          status: "token-acquisition-failed",
          errorCode: String(error?.errorCode || error?.code || "unknown").slice(0, 100),
          correlationId: String(error?.correlationId || "").slice(0, 200) || undefined,
        }),
      );
      process.exitCode = 1;
    }
  }
}

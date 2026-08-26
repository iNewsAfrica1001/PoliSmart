import test from "node:test";
import assert from "node:assert/strict";
import { scamSimulations } from "../server/data/catalog.js";
import {
  answerOperationsCopilot,
  explainScam,
  gradePrompt,
  moderateInput,
} from "../server/services/aiTutor.js";
import {
  AccountNotificationError,
  classifyGraphError,
  classifySmtpError,
  createAccountNotificationService,
} from "../server/services/accountNotifications.js";
import { gradeMultipleChoice } from "../server/services/grading.js";

test("moderation labels sensitive data risk", () => {
  const result = moderateInput("My password and SSN are 123");
  assert.equal(result.blocked, true);
  assert.equal(result.risk, "high");
});

test("prompt grader rewards structured campaign prompts", () => {
  const result = gradePrompt({
    prompt:
      "Act as a communications director. Draft a campaign speech with country context, a bullet list, source checks, confidence, and ask me to verify missing details before approval.",
    level: "Communications",
  });
  assert.ok(result.score >= 80);
  assert.match(result.improvedPrompt, /Do not invent facts/);
});

test("routing simulation scoring identifies missed signals", () => {
  const simulation = scamSimulations[0];
  const result = explainScam({ simulation, selectedFlags: [simulation.redFlags[0]] });
  assert.ok(result.score < 100);
  assert.ok(result.missed.length > 0);
});

test("quiz grading uses catalog passing score", () => {
  const result = gradeMultipleChoice({
    assessmentId: "quiz-campaign-governance",
    answers: [
      { questionId: "q1", answer: 1 },
      { questionId: "q2", answer: 1 },
      { questionId: "q3", answer: 0 },
    ],
  });
  assert.equal(result.passed, true);
  assert.equal(result.score, 100);
});

test("campaign copilot summarizes priority queue", () => {
  const result = answerOperationsCopilot({
    question: "Show all critical campaign tasks",
    catalog: {
      operationalTickets: [
        { id: "INC-1", urgency: "Critical" },
        { id: "INC-2", urgency: "Standard" },
      ],
      deviceHealth: [],
    },
  });
  assert.equal(result.intent, "campaign-queue");
  assert.equal(result.items.length, 1);
});

test("Microsoft 365 notifications preserve verification and reset workflows", async () => {
  const messages = [];
  const service = createAccountNotificationService(
    {
      emailProvider: "microsoft365",
      emailFrom: "PoliSmart <noreply@example.invalid>",
      publicUrl: "https://polismartafrica.ai",
      smtpHost: "smtp.office365.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "noreply@example.invalid",
      smtpPassword: "test-only-app-password",
    },
    { smtpTransport: { sendMail: async (message) => messages.push(message) } },
  );
  await service.sendEmailVerification({ email: "user@example.invalid", token: "verify token" });
  await service.sendPasswordReset({ email: "user@example.invalid", token: "test token" });
  assert.equal(messages.length, 2);
  assert.match(messages[0].html, /verify-email\?token=verify%20token/);
  assert.match(messages[1].html, /reset-password\?token=test%20token/);
  assert.ok(messages.every((message) => message.from === "PoliSmart <noreply@example.invalid>"));
});

test("Microsoft 365 transport requires STARTTLS on port 587", () => {
  let transportConfig;
  createAccountNotificationService(
    {
      emailProvider: "microsoft365",
      emailFrom: "PoliSmart <noreply@example.invalid>",
      publicUrl: "https://polismartafrica.ai",
      smtpHost: "smtp.office365.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "noreply@example.invalid",
      smtpPassword: "test-only-password",
    },
    {
      createTransport: (config) => {
        transportConfig = config;
        return { sendMail: async () => undefined };
      },
    },
  );
  assert.equal(transportConfig.host, "smtp.office365.com");
  assert.equal(transportConfig.port, 587);
  assert.equal(transportConfig.secure, false);
  assert.equal(transportConfig.requireTLS, true);
  assert.equal(transportConfig.connectionTimeout, 10_000);
  assert.equal(transportConfig.greetingTimeout, 10_000);
  assert.equal(transportConfig.socketTimeout, 15_000);
  assert.equal(transportConfig.tls.minVersion, "TLSv1.2");
});

test("SMTP failures are classified without exposing provider details or secrets", async () => {
  assert.equal(classifySmtpError({ code: "EAUTH" }), "SMTP_AUTHENTICATION_FAILED");
  assert.equal(classifySmtpError({ code: "ETIMEDOUT" }), "SMTP_TIMEOUT");
  assert.equal(classifySmtpError({ code: "ECONNECTION" }), "SMTP_CONNECTION_FAILED");
  assert.equal(
    classifySmtpError({ code: "ESOCKET", message: "TLS certificate failed" }),
    "SMTP_TLS_FAILED",
  );
  assert.equal(classifySmtpError({ command: "MAIL FROM" }), "SMTP_SENDER_REJECTED");
  assert.equal(classifySmtpError({ command: "RCPT TO" }), "SMTP_RECIPIENT_REJECTED");

  const secret = "test-only-secret-that-must-not-escape";
  const service = createAccountNotificationService(
    {
      emailProvider: "microsoft365",
      emailFrom: "noreply@example.invalid",
      publicUrl: "https://polismartafrica.ai",
      smtpHost: "smtp.office365.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "noreply@example.invalid",
      smtpPassword: secret,
    },
    {
      smtpTransport: {
        sendMail: async () => {
          throw Object.assign(new Error(secret), { code: "EAUTH" });
        },
      },
    },
  );
  await assert.rejects(
    () => service.sendPasswordReset({ email: "user@example.invalid", token: "token" }),
    (error) =>
      error instanceof AccountNotificationError &&
      error.code === "SMTP_AUTHENTICATION_FAILED" &&
      !error.message.includes(secret),
  );
});

test("Microsoft 365 delivery has an application deadline below the serverless timeout", async () => {
  const service = createAccountNotificationService(
    {
      emailProvider: "microsoft365",
      emailFrom: "noreply@example.invalid",
      publicUrl: "https://polismartafrica.ai",
      smtpHost: "smtp.office365.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "noreply@example.invalid",
      smtpPassword: "test-only-password",
    },
    {
      smtpDeliveryTimeoutMs: 5,
      smtpTransport: { sendMail: () => new Promise(() => undefined) },
    },
  );

  await assert.rejects(
    service.sendPasswordReset({ email: "recipient@example.invalid", token: "test-token" }),
    (error) => error instanceof AccountNotificationError && error.code === "SMTP_TIMEOUT",
  );
});

function graphConfig(overrides = {}) {
  return {
    emailProvider: "microsoft_graph",
    emailFrom: "PoliSmart <no-reply@polismartafrica.ai>",
    publicUrl: "https://polismartafrica.ai",
    microsoftTenantId: "test-tenant",
    microsoftClientId: "test-client",
    microsoftClientSecret: "test-client-secret",
    ...overrides,
  };
}

test("Microsoft Graph sends verification and reset email with one cached app token", async () => {
  const requests = [];
  let tokenRequests = 0;
  const service = createAccountNotificationService(graphConfig(), {
    graphClient: {
      acquireTokenByClientCredential: async (request) => {
        tokenRequests += 1;
        assert.deepEqual(request.scopes, ["https://graph.microsoft.com/.default"]);
        return { accessToken: "test-access-token", expiresOn: new Date(Date.now() + 300_000) };
      },
    },
    graphFetch: async (url, options) => {
      requests.push({ url, options });
      return new Response(null, { status: 202 });
    },
  });
  await service.sendEmailVerification({ email: "user@example.invalid", token: "verify token" });
  await service.sendPasswordReset({ email: "user@example.invalid", token: "reset token" });
  assert.equal(tokenRequests, 1);
  assert.equal(requests.length, 2);
  assert.ok(
    requests.every(
      ({ url }) =>
        url ===
        "https://graph.microsoft.com/v1.0/users/no-reply%40polismartafrica.ai/sendMail",
    ),
  );
  assert.ok(requests.every(({ options }) => options.headers.Authorization === "Bearer test-access-token"));
  assert.match(requests[0].options.body, /verify-email\?token=verify%20token/);
  assert.match(requests[1].options.body, /reset-password\?token=reset%20token/);
  assert.doesNotMatch(requests[0].options.body, /test-client-secret|test-access-token/);
});

test("Microsoft Graph token failures are classified without exposing credentials", async () => {
  assert.equal(classifyGraphError({ errorCode: "invalid_client" }), "GRAPH_INVALID_CLIENT");
  assert.equal(
    classifyGraphError({ errorCode: "AADSTS7000215" }),
    "GRAPH_INVALID_CLIENT_SECRET",
  );
  assert.equal(classifyGraphError({ errorCode: "invalid_tenant" }), "GRAPH_INVALID_TENANT");
  const service = createAccountNotificationService(graphConfig(), {
    graphClient: {
      acquireTokenByClientCredential: async () => {
        throw Object.assign(new Error("test-client-secret"), { errorCode: "invalid_client" });
      },
    },
  });
  await assert.rejects(
    service.sendPasswordReset({ email: "user@example.invalid", token: "token" }),
    (error) =>
      error instanceof AccountNotificationError &&
      error.code === "GRAPH_INVALID_CLIENT" &&
      !error.message.includes("test-client-secret"),
  );
});

for (const [status, code] of [
  [401, "GRAPH_TOKEN_REJECTED"],
  [403, "GRAPH_ACCESS_DENIED"],
  [404, "GRAPH_SENDER_NOT_FOUND"],
  [429, "GRAPH_RATE_LIMITED"],
  [500, "GRAPH_SERVICE_FAILURE"],
]) {
  test(`Microsoft Graph ${status} is safely classified`, async () => {
    const service = createAccountNotificationService(graphConfig(), {
      graphClient: {
        acquireTokenByClientCredential: async () => ({
          accessToken: "test-access-token",
          expiresOn: new Date(Date.now() + 300_000),
        }),
      },
      graphFetch: async () => new Response(null, { status }),
    });
    await assert.rejects(
      service.sendPasswordReset({ email: "user@example.invalid", token: "token" }),
      (error) => error instanceof AccountNotificationError && error.code === code,
    );
  });
}

test("Microsoft Graph rejects arbitrary sender configuration before requesting a token", async () => {
  let tokenRequested = false;
  const service = createAccountNotificationService(
    graphConfig({ emailFrom: "attacker@example.invalid" }),
    {
      graphClient: {
        acquireTokenByClientCredential: async () => {
          tokenRequested = true;
        },
      },
    },
  );
  await assert.rejects(
    service.sendPasswordReset({ email: "user@example.invalid", token: "token" }),
    (error) => error.code === "GRAPH_CONFIGURATION_INVALID",
  );
  assert.equal(tokenRequested, false);
});

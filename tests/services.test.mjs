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

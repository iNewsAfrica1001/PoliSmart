import test from "node:test";
import assert from "node:assert/strict";
import { scamSimulations } from "../server/data/catalog.js";
import {
  answerOperationsCopilot,
  explainScam,
  gradePrompt,
  moderateInput,
} from "../server/services/aiTutor.js";
import { createAccountNotificationService } from "../server/services/accountNotifications.js";
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

test("SMTP account notifications use the configured server transport", async () => {
  const messages = [];
  const service = createAccountNotificationService(
    {
      emailProvider: "smtp",
      emailFrom: "PoliSmart <noreply@example.invalid>",
      publicUrl: "https://polismartafrica.ai",
      smtpHost: "smtp.zoho.com",
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: "noreply@example.invalid",
      smtpPassword: "test-only-app-password",
    },
    { smtpTransport: { sendMail: async (message) => messages.push(message) } },
  );
  await service.sendPasswordReset({ email: "user@example.invalid", token: "test token" });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, "user@example.invalid");
  assert.match(messages[0].html, /reset-password\?token=test%20token/);
});

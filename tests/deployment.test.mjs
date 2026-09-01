import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import request from "supertest";
import express from "express";

import { loadConfig, validateProductionEnvironment } from "../server/config/env.js";
import { createApiErrorHandler } from "../server/middleware/http.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("legacy Socket.IO classroom surface is absent from the V1 runtime", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const viteSource = fs.readFileSync(path.join(root, "vite.config.js"), "utf8");
  const serviceWorkerSource = fs.readFileSync(path.join(root, "public", "sw.js"), "utf8");

  assert.equal(packageJson.dependencies?.["socket.io"], undefined);
  assert.equal(packageJson.dependencies?.["socket.io-client"], undefined);
  assert.doesNotMatch(serverSource, /socket\.io|createClassroomRouter|registerClassroomSockets/);
  assert.doesNotMatch(viteSource, /\/socket\.io/);
  assert.doesNotMatch(serviceWorkerSource, /\/socket\.io/);
  assert.equal(fs.existsSync(path.join(root, "server", "routes", "classrooms.js")), false);
  assert.equal(fs.existsSync(path.join(root, "server", "sockets", "classroom.js")), false);
  assert.equal(
    fs.existsSync(path.join(root, "src", "components", "classroom", "LiveClassroom.jsx")),
    false,
  );
});

test("legacy non-tenant assessment, training, and user APIs are absent", () => {
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const removedFiles = [
    ["server", "routes", "assessments.js"],
    ["server", "routes", "training.js"],
    ["server", "routes", "users.js"],
    ["server", "data", "store.js"],
    ["server", "data", "catalog.js"],
    ["server", "services", "grading.js"],
    ["server", "services", "aiTutor.js"],
    ["src", "components", "assessments", "AssessmentPanel.jsx"],
    ["src", "components", "platform", "FeatureWorkspace.jsx"],
  ];

  assert.doesNotMatch(
    serverSource,
    /createAssessmentRouter|createTrainingRouter|\/api\/assessments|\/api\/training/,
  );
  for (const segments of removedFiles) {
    assert.equal(fs.existsSync(path.join(root, ...segments)), false, segments.join("/"));
  }
});

function withEnvironment(values, callback) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  }
}

test("production environment rejects absent deployment secrets", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: undefined,
      DATABASE_URL: undefined,
      OPENAI_API_KEY: undefined,
      OPENAI_MODEL: undefined,
      AUTH_SECRET: undefined,
      JWT_SECRET: undefined,
      SESSION_SECRET: undefined,
      BLOB_READ_WRITE_TOKEN: undefined,
      BLOB_STORE_ID: undefined,
      EMAIL_API_KEY: undefined,
      SMTP_HOST: undefined,
      SMTP_USER: undefined,
      SMTP_PASSWORD: undefined,
      EMAIL_FROM: undefined,
    },
    () => {
      const errors = validateProductionEnvironment(loadConfig(root));
      assert.ok(errors.some((error) => error.startsWith("DATABASE_URL")));
      assert.ok(errors.some((error) => error.startsWith("OPENAI_API_KEY")));
      assert.ok(errors.some((error) => error.startsWith("OPENAI_MODEL")));
      assert.ok(errors.some((error) => error.startsWith("AUTH_SECRET")));
      assert.ok(errors.some((error) => error.startsWith("APP_URL")));
      assert.ok(errors.some((error) => error.startsWith("BLOB_READ_WRITE_TOKEN or")));
      assert.ok(errors.some((error) => error.startsWith("EMAIL_API_KEY")));
    },
  );
});

test("production accepts complete Microsoft 365 SMTP configuration", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: "https://polismartafrica.ai",
      DATABASE_URL: "postgresql://example.invalid/db?sslmode=require",
      OPENAI_API_KEY: "test-only-key",
      OPENAI_MODEL: "test-model",
      AUTH_SECRET: "a".repeat(48),
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "test-only-blob-token",
      EMAIL_PROVIDER: "microsoft365",
      EMAIL_API_KEY: undefined,
      SMTP_HOST: "smtp.office365.com",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
      SMTP_USER: "noreply@example.invalid",
      SMTP_PASSWORD: "test-only-app-password",
      EMAIL_FROM: "PoliSmart <noreply@example.invalid>",
    },
    () => assert.deepEqual(validateProductionEnvironment(loadConfig(root)), []),
  );
});

test("production accepts Microsoft Graph without SMTP variables", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: "https://polismartafrica.ai",
      DATABASE_URL: "postgresql://example.invalid/db?sslmode=require",
      OPENAI_API_KEY: "test-only-key",
      OPENAI_MODEL: "test-model",
      AUTH_SECRET: "a".repeat(48),
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "test-only-blob-token",
      EMAIL_PROVIDER: "microsoft_graph",
      EMAIL_FROM: "no-reply@polismartafrica.ai",
      MICROSOFT_TENANT_ID: "test-tenant",
      MICROSOFT_CLIENT_ID: "test-client",
      MICROSOFT_CLIENT_SECRET: "test-client-secret",
      SMTP_HOST: undefined,
      SMTP_USER: undefined,
      SMTP_PASSWORD: undefined,
    },
    () => assert.deepEqual(validateProductionEnvironment(loadConfig(root)), []),
  );
});

test("Microsoft Graph requires credentials and the fixed sender", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: "https://polismartafrica.ai",
      DATABASE_URL: "postgresql://example.invalid/db?sslmode=require",
      OPENAI_API_KEY: "test-only-key",
      OPENAI_MODEL: "test-model",
      AUTH_SECRET: "a".repeat(48),
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "test-only-blob-token",
      EMAIL_PROVIDER: "microsoft_graph",
      EMAIL_FROM: "attacker@example.invalid",
      MICROSOFT_TENANT_ID: undefined,
      MICROSOFT_CLIENT_ID: undefined,
      MICROSOFT_CLIENT_SECRET: undefined,
    },
    () => {
      const errors = validateProductionEnvironment(loadConfig(root));
      assert.ok(errors.includes("MICROSOFT_TENANT_ID is required for Microsoft Graph."));
      assert.ok(errors.includes("MICROSOFT_CLIENT_ID is required for Microsoft Graph."));
      assert.ok(errors.includes("MICROSOFT_CLIENT_SECRET is required for Microsoft Graph."));
      assert.ok(
        errors.includes(
          "EMAIL_FROM must be exactly no-reply@polismartafrica.ai for Microsoft Graph.",
        ),
      );
    },
  );
});

test("production environment accepts complete Vercel configuration", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: "https://polismartafrica.ai",
      DATABASE_URL: "postgresql://example.invalid/db?sslmode=require",
      OPENAI_API_KEY: "test-only-key",
      OPENAI_MODEL: "test-model",
      AUTH_SECRET: "a".repeat(48),
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "test-only-blob-token",
      EMAIL_PROVIDER: "resend",
      EMAIL_API_KEY: "test-only-email-key",
      EMAIL_FROM: "PoliSmart <noreply@polismartafrica.ai>",
    },
    () => assert.deepEqual(validateProductionEnvironment(loadConfig(root)), []),
  );
});

test("production environment accepts Vercel Blob OIDC configuration", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://demo:demo@localhost:5432/polismart",
      OPENAI_API_KEY: "test-only-openai-key",
      OPENAI_MODEL: "test-model",
      AUTH_SECRET: "test-only-auth-secret-that-is-long-enough",
      APP_URL: "https://polismartafrica.ai",
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: undefined,
      BLOB_STORE_ID: "store_test_only",
      EMAIL_PROVIDER: "resend",
      EMAIL_API_KEY: "test-only-email-key",
      EMAIL_FROM: "PoliSmart Demo <demo@example.test>",
    },
    () => {
      const config = loadConfig(process.cwd());
      assert.deepEqual(validateProductionEnvironment(config), []);
    },
  );
});

test("Vercel routes APIs before the SPA and excludes raw survey data", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(config.buildCommand, "npm run vercel-build");
  assert.equal(config.rewrites[0].source, "/api/:path*");
  assert.equal(config.rewrites.at(-1).destination, "/index.html");

  const ignored = fs.readFileSync(path.join(root, ".vercelignore"), "utf8");
  assert.match(ignored, /^data\/raw\/$/m);
  assert.match(ignored, /^storage\/$/m);
});

test("password-reset frontend preserves the email token and submits the backend contract", () => {
  const appSource = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
  const pageSource = fs.readFileSync(
    path.join(root, "src", "pages", "ResetPasswordPage.tsx"),
    "utf8",
  );
  const authSource = fs.readFileSync(path.join(root, "src", "lib", "auth.ts"), "utf8");
  assert.match(appSource, /pathname === "\/reset-password"/);
  assert.match(appSource, /searchParams\.get\("token"\)/);
  assert.match(pageSource, /authApi\.resetPassword\(token, password\)/);
  assert.match(authSource, /\/api\/auth\/password-reset\/confirm/);
  assert.match(authSource, /JSON\.stringify\(\{ token, password \}\)/);
});

test("email-verification frontend confirms once and exposes safe verification states", () => {
  const appSource = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
  const pageSource = fs.readFileSync(
    path.join(root, "src", "pages", "VerifyEmailPage.tsx"),
    "utf8",
  );
  const authSource = fs.readFileSync(path.join(root, "src", "lib", "auth.ts"), "utf8");
  assert.match(appSource, /pathname === "\/verify-email"/);
  assert.match(appSource, /searchParams\.get\("token"\)/);
  assert.match(pageSource, /started\.current/);
  assert.match(pageSource, /authApi\.verifyEmail\(token\)/);
  assert.match(pageSource, /Verification link invalid/);
  assert.match(pageSource, /Verification link expired/);
  assert.match(pageSource, /Verification link already used/);
  assert.match(pageSource, /Continue to login/);
  assert.match(authSource, /\/api\/auth\/email-verification\/confirm/);
  assert.match(authSource, /\/api\/auth\/email-verification\/request/);
});

test("dashboard and assistant terminate loading safely when no campaign is assigned", () => {
  const appSource = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
  const dashboardSource = fs.readFileSync(
    path.join(root, "src", "pages", "DashboardPage.tsx"),
    "utf8",
  );
  const assistantSource = fs.readFileSync(
    path.join(root, "src", "pages", "AssistantPage.tsx"),
    "utf8",
  );
  assert.match(dashboardSource, /if \(list\.length === 0\) setLoading\(false\)/);
  assert.match(dashboardSource, /Unable to load campaigns[\s\S]*setLoading\(false\)/);
  assert.match(dashboardSource, /No campaigns are assigned to this account yet/);
  assert.match(dashboardSource, /onClick=\{onCreateCampaign\}/);
  assert.match(appSource, /onCreateCampaign=\{\(\) => setPage\("campaigns"\)\}/);
  assert.match(assistantSource, /AI Assistant is campaign-scoped/);
  assert.match(assistantSource, /campaignsLoaded && !campaignId && !error/);
});

test("Version 1 scope formally defers Reports and documents campaign-scoped intelligence", () => {
  const checklist = fs.readFileSync(path.join(root, "PRODUCTION_CHECKLIST.md"), "utf8");
  const assistantDocs = fs.readFileSync(path.join(root, "docs", "AI_ASSISTANT.md"), "utf8");
  const navigationSource = fs.readFileSync(
    path.join(root, "src", "config", "navigation.ts"),
    "utf8",
  );
  assert.match(checklist, /Reports is intentionally deferred/);
  assert.match(checklist, /out of scope for Version 1 launch acceptance/);
  assert.match(assistantDocs, /Version 1 AI Assistant is intentionally campaign-scoped/);
  assert.match(navigationSource, /label: "Reports"[\s\S]*page: "reports"[\s\S]*enabled: false/);
});

test("Version 1 reserves Billing without enabling payment processing", () => {
  const checklist = fs.readFileSync(path.join(root, "PRODUCTION_CHECKLIST.md"), "utf8");
  const billingDocs = fs.readFileSync(path.join(root, "docs", "FUTURE_BILLING.md"), "utf8");
  const navigationSource = fs.readFileSync(
    path.join(root, "src", "config", "navigation.ts"),
    "utf8",
  );
  const environmentExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  const prismaSchema = fs.readFileSync(path.join(root, "prisma", "schema.prisma"), "utf8");

  assert.match(navigationSource, /label: "Billing"[\s\S]*page: "billing"[\s\S]*enabled: false/);
  assert.match(checklist, /Billing and payment processing are intentionally deferred/);
  assert.match(billingDocs, /does not[\s\S]*process payments/);
  assert.match(billingDocs, /must never store raw card numbers/);
  assert.doesNotMatch(environmentExample, /STRIPE|PAYPAL|FLUTTERWAVE|PAYSTACK/i);
  assert.doesNotMatch(prismaSchema, /model\s+(Payment|Invoice|Subscription|Billing)/);
});

test("production branding, public positioning and legal navigation are consistent", () => {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const manifest = fs.readFileSync(path.join(root, "public", "manifest.webmanifest"), "utf8");
  const login = fs.readFileSync(path.join(root, "src", "pages", "LoginPage.tsx"), "utf8");
  const assistant = fs.readFileSync(path.join(root, "src", "pages", "AssistantPage.tsx"), "utf8");
  const shell = fs.readFileSync(
    path.join(root, "src", "components", "layout", "AppShell.tsx"),
    "utf8",
  );
  const reset = fs.readFileSync(path.join(root, "src", "pages", "ResetPasswordPage.tsx"), "utf8");
  const verification = fs.readFileSync(
    path.join(root, "src", "pages", "VerifyEmailPage.tsx"),
    "utf8",
  );
  const notifications = fs.readFileSync(
    path.join(root, "server", "services", "accountNotifications.js"),
    "utf8",
  );

  assert.match(index, /PoliSmart Africa AI \| Grounded campaign intelligence/);
  assert.match(index, /AI-powered political campaign intelligence and management platform/);
  assert.match(manifest, /"name": "PoliSmart Africa AI"/);
  assert.doesNotMatch(manifest, /pTech|adaptive AI coach/);
  assert.match(login, /PoliSmart Africa AI/);
  assert.match(login, /Grounded public-opinion intelligence/);
  assert.match(login, /does not imply endorsement or partnership/);
  assert.match(login, /href="\/privacy">Privacy Policy/);
  assert.match(login, /href="\/terms">Terms of Service/);
  assert.match(login, /mailto:support@polismartafrica\.ai/);
  assert.match(reset, /mailto:support@polismartafrica\.ai/);
  assert.match(verification, /mailto:support@polismartafrica\.ai/);
  assert.match(assistant, /AI interpretation is not a guaranteed prediction/);
  assert.match(assistant, /independent public research source/);
  assert.match(shell, /workspaceName/);
  assert.match(shell, /Sign out of PoliSmart Africa AI/);
  assert.match(shell, /mailto:support@polismartafrica\.ai/);
  assert.match(notifications, /mailto:support@polismartafrica\.ai/);
  assert.match(notifications, /sender !== "no-reply@polismartafrica\.ai"/);
});

test("Stage 4 legal pages accurately describe V1 and remain owner-review drafts", () => {
  const app = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
  const login = fs.readFileSync(path.join(root, "src", "pages", "LoginPage.tsx"), "utf8");
  const shell = fs.readFileSync(
    path.join(root, "src", "components", "layout", "AppShell.tsx"),
    "utf8",
  );
  const legal = fs.readFileSync(path.join(root, "src", "pages", "LegalPage.tsx"), "utf8");

  assert.match(app, /currentUrl\.pathname === "\/privacy"/);
  assert.match(app, /currentUrl\.pathname === "\/terms"/);
  assert.match(login, /acknowledge the <a href="\/privacy">Privacy Policy<\/a>/);
  assert.match(login, /No consent option is pre-selected/);
  assert.match(shell, /href="\/privacy">Privacy<\/a>/);
  assert.match(shell, /href="\/terms">Terms<\/a>/);
  assert.match(legal, /AI-generated content may contain errors/);
  assert.match(legal, /Observed Data/);
  assert.match(legal, /AI Interpretation/);
  assert.match(legal, /does not imply endorsement, sponsorship, or partnership/);
  assert.match(legal, /Payments and Billing are not implemented in V1/);
  assert.match(legal, /does not currently process\s+payments/);
  assert.match(legal, /SentinelAI LLC/);
  assert.match(legal, /3204 Pearsall Ave, Bronx, NY 10469/);
  assert.match(legal, /EFFECTIVE DATE: TO BE CONFIRMED AT PUBLIC RELEASE/);
  assert.match(legal, /laws of the State of New York/);
  assert.match(legal, /state courts located in Bronx County, New York/);
  assert.match(legal, /does not include mandatory arbitration/);
  assert.match(legal, /LEGAL REVIEW \/ OPERATIONAL POLICY/);
  assert.match(legal, /Mandatory privacy rights under\s+applicable law are not waived/);
  assert.match(legal, /qualified legal review/);
  assert.match(legal, /support@polismartafrica\.ai/);
  assert.doesNotMatch(legal, /guarantee(?:s|d)? (?:absolute )?security/i);
  assert.doesNotMatch(legal, /Stripe|PayPal|Paystack|Flutterwave/);
  assert.doesNotMatch(legal, /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i);
  assert.doesNotMatch(legal, /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/);
});

test("login exposes safe password-reset requests and public registration", () => {
  const pageSource = fs.readFileSync(path.join(root, "src", "pages", "LoginPage.tsx"), "utf8");
  const authSource = fs.readFileSync(path.join(root, "src", "lib", "auth.ts"), "utf8");
  assert.match(pageSource, /onClick=\{\(\) => changeMode\("forgot"\)\}/);
  assert.doesNotMatch(pageSource, /Forgot password\?<\/button>\s*\n?\s*<\/div>/);
  assert.match(pageSource, /If the account exists, reset instructions will be sent\./);
  assert.match(authSource, /\/api\/auth\/password-reset\/request/);
  assert.match(authSource, /\/api\/auth\/register/);
  assert.match(pageSource, /Create a new organization account/);
});

test("Stage 2 onboarding guides a new organization without changing security boundaries", () => {
  const app = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
  const login = fs.readFileSync(path.join(root, "src", "pages", "LoginPage.tsx"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "src", "pages", "DashboardPage.tsx"), "utf8");
  const operations = fs.readFileSync(path.join(root, "src", "pages", "OperationsPage.tsx"), "utf8");
  const assistant = fs.readFileSync(path.join(root, "src", "pages", "AssistantPage.tsx"), "utf8");
  const workflows = fs.readFileSync(
    path.join(root, "src", "pages", "IntelligenceWorkflowsPage.tsx"),
    "utf8",
  );
  const navigation = fs.readFileSync(path.join(root, "src", "config", "navigation.ts"), "utf8");

  assert.match(login, /Authorized account owner/);
  assert.match(login, /12–128 characters with an uppercase letter, lowercase letter, and number/);
  assert.match(login, /open the time-limited verification link/);
  assert.match(login, /Resend verification email/);
  assert.match(dashboard, /Create and select your first campaign/);
  assert.match(dashboard, /campaign-scoped intelligence/);
  assert.match(operations, /Campaigns scope intelligence, policy, events, and field work/);
  assert.match(operations, /Open dashboard/);
  assert.match(operations, /No events yet/);
  assert.match(operations, /No volunteers yet/);
  assert.match(assistant, /How grounded answers work/);
  assert.match(assistant, /Observed Data/);
  assert.match(assistant, /AI Interpretation/);
  assert.match(assistant, /Citations/);
  assert.match(workflows, /No policy projects yet/);
  assert.match(app, /onCreateCampaign=\{\(\) => setPage\("campaigns"\)\}/);
  assert.match(navigation, /label: "Reports"[\s\S]*enabled: false/);
  assert.match(navigation, /label: "Billing"[\s\S]*enabled: false/);
  assert.doesNotMatch(operations, /SUPER_ADMINISTRATOR|Super Administrator/);
});

test("Stage 3 administrator guide documents V1 operations without secret values", () => {
  const guide = fs.readFileSync(
    path.join(root, "docs", "POLISMART_ADMINISTRATOR_GUIDE.md"),
    "utf8",
  );

  for (const role of [
    "Super Administrator",
    "Campaign Administrator",
    "Candidate",
    "Campaign Manager",
    "Policy Director",
    "Communications Director",
    "Field Director",
    "Volunteer Coordinator",
    "Analyst",
    "Volunteer",
  ]) {
    assert.match(
      guide,
      new RegExp(`\\|\\s+${role.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s+\\|`),
    );
  }
  assert.match(guide, /Campaign Administrator must never promote themselves/);
  assert.match(
    guide,
    /Microsoft Graph HTTP `202 Accepted` means Graph accepted the message for processing/,
  );
  assert.match(guide, /Public Services\s+\|\s+`Q40B`/);
  assert.match(guide, /Youth\s+\|\s+`Q1`/);
  assert.match(guide, /Reports — Coming Soon/);
  assert.match(guide, /Payments\/Billing — Reserved \/ Coming Soon/);
  assert.match(guide, /Do not modify production database roles, migrations, mappings/);
  assert.doesNotMatch(guide, /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i);
  assert.doesNotMatch(guide, /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(guide, /BEGIN (?:RSA )?PRIVATE KEY/);
});

test("production persistence is PostgreSQL and rejects an explicit memory fallback", () => {
  withEnvironment({ NODE_ENV: "production", PERSISTENCE_MODE: undefined }, () =>
    assert.equal(loadConfig(root).persistenceMode, "postgresql"),
  );
  withEnvironment({ NODE_ENV: "production", PERSISTENCE_MODE: "memory" }, () =>
    assert.ok(
      validateProductionEnvironment(loadConfig(root)).includes(
        "PERSISTENCE_MODE must be postgresql in production.",
      ),
    ),
  );
});

test("production data import is explicit and absent from deployment builds", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["import:afrobarometer:production"],
    "node scripts/import-afrobarometer-production.mjs",
  );
  assert.doesNotMatch(packageJson.scripts.build, /afrobarometer|migrate/i);
  assert.doesNotMatch(packageJson.scripts["vercel-build"], /prisma migrate deploy/);
  assert.equal(packageJson.scripts["db:migrate:production"], "node scripts/migrate-production.mjs");
  assert.doesNotMatch(packageJson.scripts["vercel-build"], /afrobarometer/i);
  assert.doesNotMatch(packageJson.scripts["db:migrate"], /afrobarometer/i);
});

test("malformed JSON returns a stable client message", async () => {
  const app = express();
  app.use(express.json());
  app.post("/api/test", (_request, response) => response.json({ ok: true }));
  app.use("/api", createApiErrorHandler({ isProduction: true }));
  const response = await request(app)
    .post("/api/test")
    .set("Content-Type", "application/json")
    .send("{bad")
    .expect(400);
  assert.equal(response.body.message, "Malformed JSON request.");
  assert.doesNotMatch(response.body.message, /position|expected|syntax/i);
});

test("production Microsoft 365 sender must match the authorized mailbox", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: "https://polismartafrica.ai",
      DATABASE_URL: "postgresql://example.invalid/db?sslmode=require",
      OPENAI_API_KEY: "test-only-key",
      OPENAI_MODEL: "test-model",
      AUTH_SECRET: "a".repeat(48),
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "test-only-blob-token",
      EMAIL_PROVIDER: "microsoft365",
      SMTP_HOST: "smtp.office365.com",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
      SMTP_USER: "authorized@example.invalid",
      SMTP_PASSWORD: "test-only-app-password",
      EMAIL_FROM: "PoliSmart <different@example.invalid>",
    },
    () => {
      const errors = validateProductionEnvironment(loadConfig(root));
      assert.ok(errors.includes("EMAIL_FROM must use the authorized SMTP_USER mailbox."));
    },
  );
});

test("Microsoft 365 rejects missing credentials and non-STARTTLS configuration", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: "https://polismartafrica.ai",
      DATABASE_URL: "postgresql://example.invalid/db?sslmode=require",
      OPENAI_API_KEY: "test-only-key",
      OPENAI_MODEL: "test-model",
      AUTH_SECRET: "a".repeat(48),
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "test-only-blob-token",
      EMAIL_PROVIDER: "microsoft365",
      SMTP_HOST: "mail.example.invalid",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      SMTP_USER: undefined,
      SMTP_PASSWORD: undefined,
      EMAIL_FROM: "noreply@example.invalid",
    },
    () => {
      const errors = validateProductionEnvironment(loadConfig(root));
      assert.ok(errors.includes("SMTP_USER is required for SMTP email."));
      assert.ok(errors.includes("SMTP_PASSWORD is required for SMTP email."));
      assert.ok(errors.includes("SMTP_HOST must be smtp.office365.com for Microsoft 365."));
      assert.ok(errors.includes("SMTP_PORT must be 587 for Microsoft 365."));
      assert.ok(errors.includes("SMTP_SECURE must be false for Microsoft 365 STARTTLS."));
    },
  );
});

test("public readiness is minimal and operational metrics require authentication", async () => {
  const previousVercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    const { default: app } = await import("../server.js");
    const health = await request(app).get("/api/health");
    assert.equal(health.status, 200);
    assert.deepEqual(health.body, { status: "ok" });
    const ready = await request(app).get("/api/ready");
    assert.equal(ready.status, 200);
    assert.deepEqual(Object.keys(ready.body), ["status"]);

    const metrics = await request(app).get("/api/metrics");
    assert.equal(metrics.status, 401);
    assert.equal(metrics.body.message, "Authentication required.");

    const unknownApiRoute = await request(app).get("/api/not-a-route");
    assert.equal(unknownApiRoute.status, 404);
    assert.match(unknownApiRoute.headers["content-type"], /^application\/json/);
    assert.equal(unknownApiRoute.body.message, "API route not found.");
    assert.equal(typeof unknownApiRoute.body.requestId, "string");
  } finally {
    if (previousVercel === undefined) Reflect.deleteProperty(process.env, "VERCEL");
    else process.env.VERCEL = previousVercel;
  }
});

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

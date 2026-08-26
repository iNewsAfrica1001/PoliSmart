import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import request from "supertest";

import { loadConfig, validateProductionEnvironment } from "../server/config/env.js";

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
      AUTH_SECRET: undefined,
      JWT_SECRET: undefined,
      SESSION_SECRET: undefined,
      BLOB_READ_WRITE_TOKEN: undefined,
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
      assert.ok(errors.some((error) => error.startsWith("AUTH_SECRET")));
      assert.ok(errors.some((error) => error.startsWith("APP_URL")));
      assert.ok(errors.some((error) => error.startsWith("BLOB_READ_WRITE_TOKEN")));
      assert.ok(errors.some((error) => error.startsWith("EMAIL_API_KEY")));
    },
  );
});

test("production accepts complete SMTP configuration", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: "https://polismartafrica.ai",
      DATABASE_URL: "postgresql://example.invalid/db?sslmode=require",
      OPENAI_API_KEY: "test-only-key",
      AUTH_SECRET: "a".repeat(48),
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "test-only-blob-token",
      EMAIL_PROVIDER: "smtp",
      EMAIL_API_KEY: undefined,
      SMTP_HOST: "smtp.zoho.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      SMTP_USER: "noreply@example.invalid",
      SMTP_PASSWORD: "test-only-app-password",
      EMAIL_FROM: "PoliSmart <noreply@example.invalid>",
    },
    () => assert.deepEqual(validateProductionEnvironment(loadConfig(root)), []),
  );
});

test("production environment accepts complete Vercel configuration", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      APP_URL: "https://polismartafrica.ai",
      DATABASE_URL: "postgresql://example.invalid/db?sslmode=require",
      OPENAI_API_KEY: "test-only-key",
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

test("Vercel routes APIs before the SPA and excludes raw survey data", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.rewrites[0].source, "/api/:path*");
  assert.equal(config.rewrites.at(-1).destination, "/index.html");

  const ignored = fs.readFileSync(path.join(root, ".vercelignore"), "utf8");
  assert.match(ignored, /^data\/raw\/$/m);
  assert.match(ignored, /^storage\/$/m);
});

test("production data import is explicit and absent from deployment builds", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["import:afrobarometer:production"],
    "node scripts/import-afrobarometer-production.mjs",
  );
  assert.doesNotMatch(packageJson.scripts.build, /afrobarometer|migrate/i);
  assert.doesNotMatch(packageJson.scripts["db:migrate"], /afrobarometer/i);
});

test("public readiness is minimal and operational metrics require authentication", async () => {
  const previousVercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    const { default: app } = await import("../server.js");
    const ready = await request(app).get("/api/ready");
    assert.equal(ready.status, 200);
    assert.deepEqual(Object.keys(ready.body), ["status"]);

    const metrics = await request(app).get("/api/metrics");
    assert.equal(metrics.status, 401);
    assert.equal(metrics.body.message, "Authentication required.");
  } finally {
    if (previousVercel === undefined) Reflect.deleteProperty(process.env, "VERCEL");
    else process.env.VERCEL = previousVercel;
  }
});

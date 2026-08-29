import fs from "node:fs";
import path from "node:path";

function parseList(value, fallback = []) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .concat(fallback)
    .filter((item, index, all) => all.indexOf(item) === index);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

export function loadConfig(rootDir) {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const publicUrl = process.env.APP_URL || process.env.PUBLIC_APP_URL || "http://127.0.0.1:4000";
  const mobileOrigins = ["capacitor://localhost", "ionic://localhost", "https://localhost"];
  const defaultOrigins = isProduction
    ? [publicUrl, ...mobileOrigins]
    : [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4000",
        "http://localhost:4000",
        ...mobileOrigins,
      ];
  const distPath = path.join(rootDir, "dist");
  const authSecret = process.env.AUTH_SECRET || "";
  const jwtSecret = process.env.JWT_SECRET || authSecret;
  const sessionSecret =
    process.env.SESSION_SECRET ||
    authSecret ||
    jwtSecret ||
    (isProduction ? "" : "development-only-session-secret-change-me");
  const clientOrigins = parseList(process.env.CLIENT_ORIGIN, defaultOrigins);
  const productionWarnings = [];

  if (isProduction && jwtSecret.length < 32)
    productionWarnings.push("JWT_SECRET must be at least 32 characters.");
  if (isProduction && sessionSecret.length < 32)
    productionWarnings.push("SESSION_SECRET must be at least 32 characters.");
  if (isProduction && publicUrl.startsWith("http://"))
    productionWarnings.push("PUBLIC_APP_URL should use HTTPS in production.");
  if (isProduction && !process.env.OPENAI_API_KEY)
    productionWarnings.push("OPENAI_API_KEY is required for the AI Assistant in production.");
  if (isProduction && !String(process.env.OPENAI_MODEL || "").trim())
    productionWarnings.push("OPENAI_MODEL must name an explicitly approved model.");
  if (
    isProduction &&
    clientOrigins.some(
      (origin) =>
        origin.startsWith("http://") &&
        !origin.includes("127.0.0.1") &&
        !origin.includes("localhost"),
    )
  ) {
    productionWarnings.push("CLIENT_ORIGIN should use HTTPS for public production origins.");
  }

  return {
    env: nodeEnv,
    isProduction,
    host: process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1"),
    port: parseNumber(process.env.PORT, 4000),
    publicUrl,
    clientOrigins,
    jwtSecret,
    authSecret: authSecret || sessionSecret,
    sessionSecret,
    databaseUrl: process.env.DATABASE_URL || "",
    redisUrl: process.env.REDIS_URL || "",
    openAiApiKey: process.env.OPENAI_API_KEY || "",
    openAiModel: process.env.OPENAI_MODEL || (isProduction ? "" : "gpt-5.4"),
    aiProvider: process.env.AI_PROVIDER || "openai",
    aiRateLimitWindowMs: parseNumber(process.env.AI_RATE_LIMIT_WINDOW_MS, 60_000),
    aiRateLimitMaxRequests: parseNumber(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 12),
    persistenceMode: process.env.PERSISTENCE_MODE || (isProduction ? "postgresql" : "memory"),
    documentStoragePath:
      process.env.DOCUMENT_STORAGE_PATH || path.join(rootDir, "storage", "documents"),
    storageProvider: process.env.STORAGE_PROVIDER || (isProduction ? "vercel-blob" : "local"),
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN || "",
    blobStoreId: process.env.BLOB_STORE_ID || "",
    emailProvider: process.env.EMAIL_PROVIDER || (isProduction ? "resend" : "console"),
    emailApiKey: process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || "",
    emailFrom: process.env.EMAIL_FROM || "",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: parseNumber(process.env.SMTP_PORT, 465),
    smtpSecure: String(process.env.SMTP_SECURE || "true").toLowerCase() === "true",
    smtpUser: process.env.SMTP_USER || "",
    smtpPassword: process.env.SMTP_PASSWORD || "",
    microsoftTenantId: process.env.MICROSOFT_TENANT_ID || "",
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID || "",
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    jsonLimit: process.env.JSON_LIMIT || "1mb",
    rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMaxRequests: parseNumber(
      process.env.RATE_LIMIT_MAX_REQUESTS,
      isProduction ? 180 : 300,
    ),
    productionWarnings,
    distPath,
    isDistReady: () => fs.existsSync(path.join(distPath, "index.html")),
  };
}

export function validateProductionEnvironment(config) {
  if (!config.isProduction) return [];
  const errors = [];
  if (!config.databaseUrl) errors.push("DATABASE_URL is required.");
  if (config.persistenceMode !== "postgresql")
    errors.push("PERSISTENCE_MODE must be postgresql in production.");
  if (!config.openAiApiKey) errors.push("OPENAI_API_KEY is required.");
  if (!config.openAiModel.trim()) errors.push("OPENAI_MODEL is required.");
  if (config.authSecret.length < 32) errors.push("AUTH_SECRET must be at least 32 characters.");
  if (!config.publicUrl.startsWith("https://")) errors.push("APP_URL must use HTTPS.");
  if (config.storageProvider !== "vercel-blob")
    errors.push("STORAGE_PROVIDER must be vercel-blob on Vercel.");
  if (!config.blobReadWriteToken && !config.blobStoreId)
    errors.push("BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID is required.");
  if (!["resend", "smtp", "microsoft365", "microsoft_graph"].includes(config.emailProvider))
    errors.push(
      "EMAIL_PROVIDER must be resend, smtp, microsoft365, or microsoft_graph in production.",
    );
  if (config.emailProvider === "resend" && !config.emailApiKey)
    errors.push("EMAIL_API_KEY or RESEND_API_KEY is required for Resend.");
  if (["smtp", "microsoft365"].includes(config.emailProvider)) {
    if (!config.smtpHost) errors.push("SMTP_HOST is required for SMTP email.");
    if (!config.smtpUser) errors.push("SMTP_USER is required for SMTP email.");
    if (!config.smtpPassword) errors.push("SMTP_PASSWORD is required for SMTP email.");
    if (
      config.smtpUser &&
      config.emailFrom &&
      mailboxAddress(config.emailFrom) !== config.smtpUser.toLowerCase()
    )
      errors.push("EMAIL_FROM must use the authorized SMTP_USER mailbox.");
  }
  if (config.emailProvider === "microsoft365") {
    if (config.smtpHost !== "smtp.office365.com")
      errors.push("SMTP_HOST must be smtp.office365.com for Microsoft 365.");
    if (config.smtpPort !== 587) errors.push("SMTP_PORT must be 587 for Microsoft 365.");
    if (config.smtpSecure) errors.push("SMTP_SECURE must be false for Microsoft 365 STARTTLS.");
  }
  if (config.emailProvider === "microsoft_graph") {
    if (!config.microsoftTenantId)
      errors.push("MICROSOFT_TENANT_ID is required for Microsoft Graph.");
    if (!config.microsoftClientId)
      errors.push("MICROSOFT_CLIENT_ID is required for Microsoft Graph.");
    if (!config.microsoftClientSecret)
      errors.push("MICROSOFT_CLIENT_SECRET is required for Microsoft Graph.");
    if (config.emailFrom.trim().toLowerCase() !== "no-reply@polismartafrica.ai")
      errors.push("EMAIL_FROM must be exactly no-reply@polismartafrica.ai for Microsoft Graph.");
  }
  if (!config.emailFrom) errors.push("EMAIL_FROM is required.");
  return errors;
}

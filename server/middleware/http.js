import { Prisma } from "@prisma/client";

const SAFE_PRISMA_META_FIELDS = Object.freeze([
  "modelName",
  "table",
  "column",
  "field_name",
  "constraint",
  "target",
]);
const SAFE_PRISMA_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_.$"]{0,127}$/;

function safePrismaMeta(meta) {
  if (!meta || typeof meta !== "object") return undefined;
  const result = {};
  for (const field of SAFE_PRISMA_META_FIELDS) {
    const value = meta[field];
    if (typeof value === "string" && SAFE_PRISMA_IDENTIFIER.test(value)) result[field] = value;
    else if (
      Array.isArray(value) &&
      value.length <= 20 &&
      value.every((item) => typeof item === "string" && SAFE_PRISMA_IDENTIFIER.test(item))
    )
      result[field] = value;
  }
  return Object.keys(result).length ? result : undefined;
}

export function assignRequestId(request, response, next) {
  const id =
    request.headers["x-request-id"] ||
    `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  request.id = Array.isArray(id) ? id[0] : id;
  response.setHeader("X-Request-Id", request.id);
  next();
}

export function securityHeaders({ isProduction = false } = {}) {
  return (_request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    if (isProduction) {
      response.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
      response.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'none'; worker-src 'self'; media-src 'self'; manifest-src 'self'; upgrade-insecure-requests",
      );
    }
    next();
  };
}

export function logRequest(request, response, next) {
  const startedAt = Date.now();
  response.on("finish", () => {
    const entry = {
      at: new Date().toISOString(),
      requestId: request.id,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
    };
    if (response.statusCode >= 500) console.error(JSON.stringify(entry));
    else console.info(JSON.stringify(entry));
  });
  next();
}

export function asyncRoute(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

export function createApiErrorHandler({
  isProduction = false,
  includePrismaDiagnostics = !isProduction,
} = {}) {
  return (error, request, response, _next) => {
    const malformedJson = error?.type === "entity.parse.failed";
    const status = malformedJson ? 400 : Number(error.status || 500);
    const payload = {
      message: malformedJson
        ? "Malformed JSON request."
        : status >= 500
          ? "Unexpected server error."
          : error.message,
      requestId: request.id,
    };
    if (status >= 500 || malformedJson) {
      const prismaMeta =
        includePrismaDiagnostics && error instanceof Prisma.PrismaClientKnownRequestError
          ? safePrismaMeta(error.meta)
          : undefined;
      const prismaDiagnostics =
        includePrismaDiagnostics && error instanceof Prisma.PrismaClientKnownRequestError
          ? { prismaCode: error.code, ...(prismaMeta ? { prismaMeta } : {}) }
          : {};
      console.error(
        JSON.stringify({
          at: new Date().toISOString(),
          level: "error",
          requestId: request.id,
          status,
          error: error.name || "Error",
          message: malformedJson
            ? "Malformed JSON request body"
            : isProduction
              ? "Unhandled API error"
              : error.message,
          stack: isProduction ? undefined : error.stack,
          ...prismaDiagnostics,
        }),
      );
    }
    response.status(status).json(payload);
  };
}

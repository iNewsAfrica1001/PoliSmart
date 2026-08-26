const buckets = new Map();

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
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (isProduction) {
      response.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
      response.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
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

export function rateLimit({ windowMs, maxRequests }) {
  return (request, response, next) => {
    const key = `${request.ip}:${request.path}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    response.setHeader("RateLimit-Limit", String(maxRequests));
    response.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - bucket.count)));
    if (bucket.count > maxRequests) {
      response.status(429).json({ message: "Too many requests. Please retry shortly." });
      return;
    }
    next();
  };
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

export function createApiErrorHandler({ isProduction = false } = {}) {
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
    if (status >= 500 || malformedJson)
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
        }),
      );
    response.status(status).json(payload);
  };
}

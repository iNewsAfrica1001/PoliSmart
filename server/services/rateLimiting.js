import { createHmac } from "node:crypto";

const ATOMIC_INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if count == 1 or ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function privacyHash(value, secret) {
  return createHmac("sha256", secret).update(String(value ?? "")).digest("hex");
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function createUpstashRateLimitStore({ url, token, fetchImpl = globalThis.fetch }) {
  const endpoint = String(url || "").replace(/\/+$/, "");
  const credential = String(token || "");
  return {
    configured: Boolean(endpoint && credential),
    async increment(key, windowMs) {
      if (!endpoint || !credential) throw new Error("Shared rate-limit storage is unavailable.");
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credential}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["EVAL", ATOMIC_INCREMENT_SCRIPT, "1", key, String(windowMs)]),
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) throw new Error(`Shared rate-limit request failed (${response.status}).`);
      const payload = await response.json();
      if (payload?.error) throw new Error("Shared rate-limit command failed.");
      const [count, ttlMs] = Array.isArray(payload?.result) ? payload.result : [];
      if (!Number.isFinite(Number(count)) || !Number.isFinite(Number(ttlMs)))
        throw new Error("Shared rate-limit response was invalid.");
      return { count: Number(count), ttlMs: Math.max(1, Number(ttlMs)) };
    },
  };
}

export function createLocalFallbackStore({ now = Date.now, maxEntries = 10_000 } = {}) {
  const buckets = new Map();
  const cleanup = (current) => {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= current) buckets.delete(key);
    while (buckets.size >= maxEntries) buckets.delete(buckets.keys().next().value);
  };
  return {
    async increment(key, windowMs) {
      const current = now();
      cleanup(current);
      const prior = buckets.get(key);
      const bucket =
        !prior || prior.resetAt <= current
          ? { count: 0, resetAt: current + windowMs }
          : prior;
      bucket.count += 1;
      buckets.set(key, bucket);
      return { count: bucket.count, ttlMs: Math.max(1, bucket.resetAt - current) };
    },
    size: () => buckets.size,
  };
}

export function createRateLimitService({ sharedStore, fallbackStore, secret, logger = console }) {
  if (!secret) throw new Error("A server-side secret is required for privacy-safe rate-limit keys.");
  let lastWarningAt = 0;
  const warnUnavailable = () => {
    const now = Date.now();
    if (now - lastWarningAt < 60_000) return;
    lastWarningAt = now;
    logger.warn(
      JSON.stringify({
        at: new Date(now).toISOString(),
        level: "warn",
        event: "rate-limit-backend-unavailable",
        message: "Shared rate limiting is unavailable; configured failure policy applied.",
      }),
    );
  };
  return {
    hash: (value) => privacyHash(value, secret),
    async check({ purpose, identifiers, limit, windowMs, failurePolicy = "fallback" }) {
      const safePurpose = String(purpose).toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const safeIdentifier = privacyHash(
        identifiers.map((item) => String(item ?? "")).join("\u001f"),
        secret,
      );
      const key = `rl:v1:${safePurpose}:${safeIdentifier}`;
      const normalizedLimit = positiveInteger(limit, 1);
      const normalizedWindow = positiveInteger(windowMs, 60_000);
      let result;
      let backend = "shared";
      try {
        result = await sharedStore.increment(key, normalizedWindow);
      } catch {
        warnUnavailable();
        if (failurePolicy === "closed") return { unavailable: true };
        backend = "fallback";
        result = await fallbackStore.increment(key, normalizedWindow);
      }
      return {
        allowed: result.count <= normalizedLimit,
        limit: normalizedLimit,
        remaining: Math.max(0, normalizedLimit - result.count),
        retryAfterSeconds: Math.max(1, Math.ceil(result.ttlMs / 1000)),
        backend,
      };
    },
  };
}

export function createRateLimitMiddleware({
  service,
  purpose,
  limit,
  windowMs,
  identifiers,
  failurePolicy = "fallback",
  unavailableMessage = "Service temporarily unavailable.",
}) {
  return async (request, response, next) => {
    try {
      const result = await service.check({
        purpose,
        identifiers: identifiers(request),
        limit,
        windowMs,
        failurePolicy,
      });
      if (result.unavailable)
        return response.status(503).json({ message: unavailableMessage, requestId: request.id });
      response.setHeader("RateLimit-Limit", String(result.limit));
      response.setHeader("RateLimit-Remaining", String(result.remaining));
      if (!result.allowed) {
        response.setHeader("Retry-After", String(result.retryAfterSeconds));
        return response
          .status(429)
          .json({ message: "Too many requests. Please retry shortly.", requestId: request.id });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function noRateLimit(_request, _response, next) {
  next();
}

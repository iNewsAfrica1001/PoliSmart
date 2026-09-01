import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createLocalFallbackStore,
  createRateLimitMiddleware,
  createRateLimitService,
  createUpstashRateLimitStore,
  privacyHash,
} from "../server/services/rateLimiting.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const secret = "test-only-rate-limit-secret-that-is-long-enough";

function atomicMemoryStore(now = () => 0) {
  const buckets = new Map();
  return {
    keys: [],
    async increment(key, windowMs) {
      this.keys.push(key);
      const current = now();
      const prior = buckets.get(key);
      const bucket =
        !prior || prior.resetAt <= current
          ? { count: 0, resetAt: current + windowMs }
          : prior;
      bucket.count += 1;
      buckets.set(key, bucket);
      return { count: bucket.count, ttlMs: bucket.resetAt - current };
    },
  };
}

function service(sharedStore, options = {}) {
  return createRateLimitService({
    sharedStore,
    fallbackStore: options.fallbackStore || createLocalFallbackStore({ now: () => 0 }),
    secret,
    logger: options.logger || { warn: () => undefined },
  });
}

test("shared atomic counters enforce limits across independent service instances", async () => {
  const sharedStore = atomicMemoryStore();
  const first = service(sharedStore);
  const second = service(sharedStore);
  assert.equal(
    (await first.check({ purpose: "login", identifiers: ["ip", "user"], limit: 1, windowMs: 1000 }))
      .allowed,
    true,
  );
  const result = await second.check({
    purpose: "login",
    identifiers: ["ip", "user"],
    limit: 1,
    windowMs: 1000,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.retryAfterSeconds, 1);
});

test("Upstash REST command atomically increments and attaches a TTL", async () => {
  let request;
  const store = createUpstashRateLimitStore({
    url: "https://rate-limit.example.test",
    token: "test-secret-token",
    fetchImpl: async (_url, options) => {
      request = options;
      return new Response(JSON.stringify({ result: [1, 60_000] }), { status: 200 });
    },
  });
  const result = await store.increment("rl:v1:test:safe", 60_000);
  const command = JSON.parse(request.body);
  assert.equal(command[0], "EVAL");
  assert.match(command[1], /INCR/);
  assert.match(command[1], /PEXPIRE/);
  assert.deepEqual(command.slice(2), ["1", "rl:v1:test:safe", "60000"]);
  assert.deepEqual(result, { count: 1, ttlMs: 60_000 });
  assert.doesNotMatch(request.body, /test-secret-token/);
});

test("rate-limit keys contain neither raw emails nor raw recovery tokens", async () => {
  const sharedStore = atomicMemoryStore();
  const limiter = service(sharedStore);
  const email = "Person@Example.test";
  const token = "raw-reset-or-verification-token";
  await limiter.check({ purpose: "registration", identifiers: ["ip", email], limit: 2, windowMs: 1000 });
  await limiter.check({ purpose: "reset", identifiers: ["ip", token], limit: 2, windowMs: 1000 });
  assert.equal(sharedStore.keys.length, 2);
  assert.ok(sharedStore.keys.every((key) => key.startsWith("rl:v1:")));
  assert.ok(sharedStore.keys.every((key) => !key.includes(email) && !key.includes(token)));
  assert.notEqual(privacyHash(email, secret), email);
});

test("middleware returns neutral 429 responses with Retry-After", async () => {
  const limiter = service(atomicMemoryStore());
  const middleware = createRateLimitMiddleware({
    service: limiter,
    purpose: "auth-login",
    limit: 1,
    windowMs: 1000,
    identifiers: () => ["ip", "email-hash"],
  });
  const invoke = () =>
    new Promise((resolve, reject) => {
      const headers = {};
      const response = {
        setHeader: (key, value) => (headers[key] = value),
        status(value) {
          this.statusCode = value;
          return this;
        },
        json(body) {
          resolve({ status: this.statusCode, body, headers });
          return this;
        },
      };
      middleware({ id: "request-id" }, response, (error) =>
        error ? reject(error) : resolve({ status: 200, headers }),
      );
    });
  assert.equal((await invoke()).status, 200);
  const limited = await invoke();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers["Retry-After"], "1");
  assert.doesNotMatch(JSON.stringify(limited.body), /redis|email|tenant|key/i);
});

test("Redis outage fails AI closed and uses bounded expiring fallback elsewhere", async () => {
  let now = 0;
  const unavailable = { increment: async () => Promise.reject(new Error("contains-secret")) };
  const fallback = createLocalFallbackStore({ now: () => now, maxEntries: 2 });
  const warnings = [];
  const limiter = service(unavailable, { fallbackStore: fallback, logger: { warn: (line) => warnings.push(line) } });
  const ai = await limiter.check({
    purpose: "ai-chat",
    identifiers: ["tenant", "user"],
    limit: 1,
    windowMs: 1000,
    failurePolicy: "closed",
  });
  assert.equal(ai.unavailable, true);
  const first = await limiter.check({ purpose: "login", identifiers: ["ip"], limit: 1, windowMs: 1000 });
  const second = await limiter.check({ purpose: "login", identifiers: ["ip"], limit: 1, windowMs: 1000 });
  assert.equal(first.backend, "fallback");
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  now = 1001;
  assert.equal(
    (await limiter.check({ purpose: "login", identifiers: ["ip"], limit: 1, windowMs: 1000 })).allowed,
    true,
  );
  assert.ok(fallback.size() <= 2);
  assert.doesNotMatch(warnings.join(" "), /contains-secret/);
});

test("all authentication and OpenAI-backed operations have dedicated shared policies", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const auth = fs.readFileSync(path.join(root, "server", "routes", "auth.js"), "utf8");
  const ai = fs.readFileSync(path.join(root, "server", "routes", "ai.js"), "utf8");
  const workflows = fs.readFileSync(
    path.join(root, "server", "routes", "intelligenceWorkflows.js"),
    "utf8",
  );
  for (const name of [
    "login",
    "registration",
    "verificationResend",
    "passwordResetRequest",
    "passwordResetConfirmation",
  ]) {
    assert.match(server, new RegExp(`${name}: sharedLimiter`));
    assert.ok(auth.includes(`limited("${name}")`));
  }
  assert.match(ai, /rateLimiters\.user/);
  assert.match(ai, /rateLimiters\.organization/);
  assert.match(workflows, /aiRateLimiters\.policyUser/);
  assert.match(workflows, /aiRateLimiters\.policyOrganization/);
  assert.match(workflows, /aiRateLimiters\.communicationsUser/);
  assert.match(workflows, /aiRateLimiters\.communicationsOrganization/);
  assert.doesNotMatch(server, /createAiRateLimiter/);
});

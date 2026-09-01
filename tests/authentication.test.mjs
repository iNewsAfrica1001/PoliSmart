import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import {
  createAuthenticationService,
  hashPassword,
  hashToken,
  newOpaqueToken,
  validatePassword,
  verifyPassword,
} from "../server/services/authentication.js";
import { expiredSessionCookie, sessionCookie } from "../server/middleware/authentication.js";
import { createAuthRouter } from "../server/routes/auth.js";
import { assignRequestId, createApiErrorHandler } from "../server/middleware/http.js";

const neutralRegistrationMessage =
  "If the information provided can be used to create or access an account, follow the instructions sent to the email address.";

test("passwords use a slow one-way hash and reject weak values", async () => {
  assert.throws(() => validatePassword("short"), /12-128/);
  const password = "Fictional-Test-2026";
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("Incorrect-Test-2026", hash), false);
});

test("opaque credentials are random and stored as deterministic hashes", () => {
  const first = newOpaqueToken();
  const second = newOpaqueToken();
  assert.notEqual(first, second);
  assert.notEqual(hashToken(first, "a-secure-test-secret-that-is-long-enough"), first);
});

test("session cookies are httpOnly, same-site, scoped, and secure in production", () => {
  const cookie = sessionCookie("secret", true);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Path=\//);
  assert.match(expiredSessionCookie(true), /Max-Age=0/);
});

test("notification provider failure does not invalidate a completed registration", async () => {
  const created = [];
  const database = {
    authUser: { findUnique: async () => null },
    $transaction: async (callback) =>
      callback({
        authUser: { create: async ({ data }) => ({ id: "user-1", ...data }) },
        organization: { create: async ({ data }) => ({ id: "tenant-1", ...data }) },
        membership: { create: async ({ data }) => ({ id: "membership-1", ...data }) },
      }),
    emailVerificationToken: {
      create: async ({ data }) => {
        created.push(data);
        return data;
      },
    },
  };
  const service = createAuthenticationService(database, {
    tokenSecret: "test-only-token-secret-that-is-long-enough",
    notifications: {
      sendEmailVerification: async () => {
        throw new Error("provider unavailable");
      },
    },
  });

  const result = await service.register({
    email: "acceptance@example.test",
    password: "AcceptancePass2026",
    displayName: "Acceptance Tester",
    organizationName: "Acceptance Organization",
    country: "Kisiwa",
  });

  assert.equal(result.notificationDelivered, false);
  assert.equal(created.length, 1);
});

test("registration delivers the verification token through the configured provider", async () => {
  let delivered;
  const database = {
    authUser: { findUnique: async () => null },
    $transaction: async (callback) =>
      callback({
        authUser: { create: async ({ data }) => ({ id: "user-1", ...data }) },
        organization: { create: async ({ data }) => ({ id: "tenant-1", ...data }) },
        membership: { create: async ({ data }) => ({ id: "membership-1", ...data }) },
      }),
    emailVerificationToken: { create: async ({ data }) => data },
  };
  const service = createAuthenticationService(database, {
    tokenSecret: "test-only-token-secret-that-is-long-enough",
    notifications: {
      sendEmailVerification: async (payload) => {
        delivered = payload;
      },
    },
  });
  const result = await service.register({
    email: "verification@example.test",
    password: "VerificationPass2026",
    displayName: "Verification Tester",
    organizationName: "Verification Organization",
    country: "Kisiwa",
  });
  assert.equal(result.notificationDelivered, true);
  assert.equal(delivered.email, "verification@example.test");
  assert.equal(typeof delivered.token, "string");
  assert.ok(delivered.token.length > 32);
});

test("existing unverified registration is neutral and safely rotates verification", async () => {
  let transactionCalls = 0;
  let deleted = 0;
  let created = 0;
  let delivered = 0;
  const database = {
    authUser: {
      findUnique: async () => ({
        id: "existing-user",
        email: "existing@example.test",
        emailVerifiedAt: null,
      }),
    },
    $transaction: async () => {
      transactionCalls += 1;
    },
    emailVerificationToken: {
      deleteMany: async () => {
        deleted += 1;
      },
      create: async ({ data }) => {
        created += 1;
        return data;
      },
    },
  };
  const service = createAuthenticationService(database, {
    tokenSecret: "test-only-token-secret-that-is-long-enough",
    logger: { info: () => undefined },
    notifications: {
      sendEmailVerification: async () => {
        delivered += 1;
      },
    },
  });

  const result = await service.register({
    email: "Existing@Example.test",
    password: "ExistingPass2026",
    displayName: "Existing User",
    organizationName: "Existing Organization",
    country: "Kisiwa",
  });

  assert.equal(result.created, false);
  assert.equal(transactionCalls, 0);
  assert.equal(deleted, 1);
  assert.equal(created, 1);
  assert.equal(delivered, 1);
});

test("existing verified registration is neutral without issuing another token", async () => {
  let tokenOperations = 0;
  const database = {
    authUser: {
      findUnique: async () => ({
        id: "verified-user",
        email: "verified@example.test",
        emailVerifiedAt: new Date(),
      }),
    },
    emailVerificationToken: {
      deleteMany: async () => {
        tokenOperations += 1;
      },
      create: async () => {
        tokenOperations += 1;
      },
    },
  };
  const service = createAuthenticationService(database, {
    tokenSecret: "test-only-token-secret-that-is-long-enough",
    logger: { info: () => undefined },
  });

  const result = await service.register({
    email: "verified@example.test",
    password: "VerifiedPass2026",
    displayName: "Verified User",
    organizationName: "Verified Organization",
    country: "Kisiwa",
  });

  assert.equal(result.created, false);
  assert.equal(tokenOperations, 0);
});

function registrationTestApp(authService, registrationTiming = {}) {
  const app = express();
  app.use(express.json());
  app.use(assignRequestId);
  app.use(
    "/api/auth",
    createAuthRouter({
      authService,
      config: { sessionSecret: "test-only-session-secret-that-is-long-enough" },
      registrationTiming,
    }),
  );
  app.use(createApiErrorHandler({ isProduction: true }));
  return app;
}

test("registration returns identical neutral 202 responses and normalizes timing", async () => {
  const delays = [];
  let calls = 0;
  const app = registrationTestApp(
    {
      register: async () => ({ created: calls++ === 0 }),
    },
    {
      minimumMs: 50,
      jitterMs: 0,
      sleep: async (milliseconds) => delays.push(milliseconds),
    },
  );
  const payload = {
    email: "fictional@example.test",
    password: "FictionalPass2026",
    displayName: "Fictional User",
    organizationName: "Fictional Organization",
    country: "Kisiwa",
  };

  const first = await request(app).post("/api/auth/register").send(payload);
  const second = await request(app).post("/api/auth/register").send(payload);

  assert.equal(first.status, 202);
  assert.equal(second.status, 202);
  assert.deepEqual(first.body, { message: neutralRegistrationMessage });
  assert.deepEqual(second.body, first.body);
  assert.equal(delays.length, 2);
  assert.ok(delays.every((delay) => delay > 0 && delay <= 50));
});

test("registration suppresses unique details but preserves validation errors", async () => {
  const uniqueError = Object.assign(new Error("Unique constraint failed on auth_users_email_key"), {
    code: "P2002",
  });
  const conflictApp = registrationTestApp(
    { register: async () => Promise.reject(uniqueError) },
    { minimumMs: 0, jitterMs: 0 },
  );
  const invalidApp = registrationTestApp(
    {
      register: async () =>
        Promise.reject(Object.assign(new Error("A valid email address is required."), { status: 400 })),
    },
    { minimumMs: 0, jitterMs: 0 },
  );

  const conflict = await request(conflictApp).post("/api/auth/register").send({});
  const invalid = await request(invalidApp).post("/api/auth/register").send({});

  assert.equal(conflict.status, 202);
  assert.deepEqual(conflict.body, { message: neutralRegistrationMessage });
  assert.doesNotMatch(JSON.stringify(conflict.body), /P2002|unique|account.*exists/i);
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.message, "A valid email address is required.");
});

test("unverified public registrations cannot authenticate", async () => {
  const database = {
    authUser: {
      findUnique: async () => ({
        id: "user-unverified",
        email: "unverified@example.test",
        displayName: "Unverified User",
        emailVerifiedAt: null,
        passwordHash: await hashPassword("StrongPassword123"),
        memberships: [],
      }),
    },
  };
  const service = createAuthenticationService(database, {
    tokenSecret: "test-only-token-secret-that-is-long-enough",
  });
  await assert.rejects(
    service.login({
      email: "unverified@example.test",
      password: "StrongPassword123",
      userAgent: "test",
      ipHash: "test",
    }),
    (error) => error.status === 401 && error.message === "Invalid email or password.",
  );
});

test("password reset delivers a newly generated secure token", async () => {
  let delivered;
  const created = [];
  const database = {
    authUser: { findUnique: async () => ({ id: "user-1", email: "reset@example.test" }) },
    passwordResetToken: {
      deleteMany: async () => ({ count: 0 }),
      create: async ({ data }) => {
        created.push(data);
        return data;
      },
    },
  };
  const service = createAuthenticationService(database, {
    tokenSecret: "test-only-token-secret-that-is-long-enough",
    notifications: {
      sendPasswordReset: async (payload) => {
        delivered = payload;
      },
    },
  });
  const token = await service.requestPasswordReset("reset@example.test");
  assert.equal(created.length, 1);
  assert.equal(delivered.email, "reset@example.test");
  assert.equal(delivered.token, token);
  assert.notEqual(created[0].tokenHash, token);
});

test("password reset updates the hash, revokes sessions, and consumes the token once", async () => {
  const secret = "test-only-token-secret-that-is-long-enough";
  const rawToken = newOpaqueToken();
  const oldPassword = "OldPassword2026";
  const newPassword = "NewPassword2026";
  const state = {
    user: { id: "user-1", passwordHash: await hashPassword(oldPassword) },
    reset: {
      id: "reset-1",
      userId: "user-1",
      tokenHash: hashToken(rawToken, secret),
      expiresAt: new Date(Date.now() + 10 * 60_000),
      usedAt: null,
    },
    sessionsDeleted: false,
  };
  const database = {
    passwordResetToken: {
      findUnique: async ({ where }) =>
        where.tokenHash === state.reset.tokenHash ? { ...state.reset } : null,
      update:
        ({ data }) =>
        async () =>
          Object.assign(state.reset, data),
    },
    authUser: {
      update:
        ({ data }) =>
        async () =>
          Object.assign(state.user, data),
    },
    authSession: {
      deleteMany: () => async () => {
        state.sessionsDeleted = true;
      },
    },
    $transaction: async (operations) => Promise.all(operations.map((operation) => operation())),
  };
  const service = createAuthenticationService(database, { tokenSecret: secret });

  await service.resetPassword(rawToken, newPassword);
  assert.equal(await verifyPassword(oldPassword, state.user.passwordHash), false);
  assert.equal(await verifyPassword(newPassword, state.user.passwordHash), true);
  assert.ok(state.reset.usedAt instanceof Date);
  assert.equal(state.sessionsDeleted, true);
  await assert.rejects(
    service.resetPassword(rawToken, "AnotherPassword2026"),
    /invalid or expired/,
  );
});

test("password reset rejects malformed, unknown, expired, and weak-password attempts", async () => {
  const secret = "test-only-token-secret-that-is-long-enough";
  const expiredToken = newOpaqueToken();
  const database = {
    passwordResetToken: {
      findUnique: async ({ where }) =>
        where.tokenHash === hashToken(expiredToken, secret)
          ? {
              id: "expired",
              userId: "user-1",
              expiresAt: new Date(Date.now() - 1_000),
              usedAt: null,
            }
          : null,
    },
  };
  const service = createAuthenticationService(database, { tokenSecret: secret });
  await assert.rejects(service.resetPassword("invalid", "ValidPassword2026"), /invalid or expired/);
  await assert.rejects(
    service.resetPassword(newOpaqueToken(), "ValidPassword2026"),
    /invalid or expired/,
  );
  await assert.rejects(
    service.resetPassword(expiredToken, "ValidPassword2026"),
    /invalid or expired/,
  );
});

test("email verification is single-use and enables login without bypassing password checks", async () => {
  const secret = "verification-test-secret-that-is-long-enough";
  const rawToken = newOpaqueToken();
  const now = new Date("2026-08-29T12:00:00.000Z");
  const user = {
    id: "user-verify",
    email: "verified@example.test",
    displayName: "Verified User",
    emailVerifiedAt: null,
    passwordHash: await hashPassword("VerifiedPassword2026"),
    memberships: [],
  };
  const verification = {
    id: "verification-1",
    userId: user.id,
    tokenHash: hashToken(rawToken, secret),
    expiresAt: new Date(now.getTime() + 60_000),
    usedAt: null,
  };
  let session;
  const database = {
    authUser: {
      findUnique: async ({ where }) =>
        where.id === user.id || where.email === user.email ? user : null,
      update: ({ data }) => {
        Object.assign(user, data);
        return user;
      },
    },
    emailVerificationToken: {
      findUnique: async ({ where }) =>
        where.tokenHash === verification.tokenHash ? verification : null,
      update: ({ data }) => {
        Object.assign(verification, data);
        return verification;
      },
    },
    authSession: {
      create: async ({ data }) => {
        session = { id: "session-verify", ...data };
        return session;
      },
      findUnique: async ({ where }) => (session?.tokenHash === where.tokenHash ? session : null),
      deleteMany: async () => {
        session = null;
        return { count: 1 };
      },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  const service = createAuthenticationService(database, { tokenSecret: secret, now: () => now });
  await service.verifyEmail(rawToken);
  assert.equal(user.emailVerifiedAt, now);
  assert.equal(verification.usedAt, now);
  const login = await service.login({
    email: "VERIFIED@example.test",
    password: "VerifiedPassword2026",
    userAgent: "test",
    ipHash: "test",
  });
  assert.equal(login.session.id, "session-verify");
  assert.equal((await service.authenticate(login.token))?.id, "session-verify");
  await service.logout(login.token);
  assert.equal(await service.authenticate(login.token), null);
  await assert.rejects(
    service.verifyEmail(rawToken),
    (error) => error.verificationCode === "VERIFICATION_TOKEN_ALREADY_USED",
  );
});

test("email verification distinguishes safe invalid, expired, used and already-verified states", async () => {
  const secret = "verification-state-secret-that-is-long-enough";
  const now = new Date("2026-08-29T12:00:00.000Z");
  const tokens = {
    expired: newOpaqueToken(),
    used: newOpaqueToken(),
    verified: newOpaqueToken(),
  };
  const records = new Map([
    [
      hashToken(tokens.expired, secret),
      { id: "expired", userId: "user", expiresAt: new Date(now.getTime() - 1), usedAt: null },
    ],
    [
      hashToken(tokens.used, secret),
      { id: "used", userId: "user", expiresAt: new Date(now.getTime() + 60_000), usedAt: now },
    ],
    [
      hashToken(tokens.verified, secret),
      { id: "verified", userId: "user", expiresAt: new Date(now.getTime() + 60_000), usedAt: null },
    ],
  ]);
  const database = {
    emailVerificationToken: {
      findUnique: async ({ where }) => records.get(where.tokenHash) || null,
    },
    authUser: { findUnique: async () => ({ id: "user", emailVerifiedAt: now }) },
  };
  const service = createAuthenticationService(database, { tokenSecret: secret, now: () => now });
  await assert.rejects(
    service.verifyEmail("invalid"),
    (error) => error.verificationCode === "VERIFICATION_TOKEN_INVALID",
  );
  await assert.rejects(
    service.verifyEmail(tokens.expired),
    (error) => error.verificationCode === "VERIFICATION_TOKEN_EXPIRED",
  );
  await assert.rejects(
    service.verifyEmail(tokens.used),
    (error) => error.verificationCode === "VERIFICATION_TOKEN_ALREADY_USED",
  );
  await assert.rejects(
    service.verifyEmail(tokens.verified),
    (error) => error.verificationCode === "ACCOUNT_ALREADY_VERIFIED",
  );
});

test("verification resend is neutral for unknown and verified accounts and rotates unverified tokens", async () => {
  const created = [];
  const delivered = [];
  let lookup = null;
  const database = {
    authUser: { findUnique: async () => lookup },
    emailVerificationToken: {
      deleteMany: async () => ({ count: 1 }),
      create: async ({ data }) => {
        created.push(data);
        return data;
      },
    },
  };
  const service = createAuthenticationService(database, {
    tokenSecret: "verification-resend-secret-that-is-long-enough",
    notifications: { sendEmailVerification: async (payload) => delivered.push(payload) },
  });
  assert.equal(await service.requestEmailVerification("unknown@example.test"), null);
  lookup = { id: "verified", email: "verified@example.test", emailVerifiedAt: new Date() };
  assert.equal(await service.requestEmailVerification(lookup.email), null);
  lookup = { id: "unverified", email: "unverified@example.test", emailVerifiedAt: null };
  assert.equal(
    typeof (await service.requestEmailVerification("UNVERIFIED@example.test")),
    "string",
  );
  assert.equal(created.length, 1);
  assert.equal(delivered.length, 1);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  createAuthenticationService,
  hashPassword,
  hashToken,
  newOpaqueToken,
  validatePassword,
  verifyPassword,
} from "../server/services/authentication.js";
import { expiredSessionCookie, sessionCookie } from "../server/middleware/authentication.js";

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

import { Router } from "express";
import {
  expiredSessionCookie,
  hashIp,
  readCookie,
  requireSession,
  SESSION_COOKIE,
  sessionCookie,
} from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { noRateLimit } from "../services/rateLimiting.js";
import { PERMISSIONS } from "../config/authorization.js";
import { hasPermission } from "../services/authorization.js";

const REGISTRATION_NEUTRAL_MESSAGE =
  "If the information provided can be used to create or access an account, follow the instructions sent to the email address.";

async function normalizeRegistrationTiming(startedAt, timing = {}) {
  const minimumMs = timing.minimumMs ?? 650;
  const jitterMs = timing.jitterMs ?? 200;
  const random = timing.random ?? Math.random;
  const sleep =
    timing.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const targetMs = minimumMs + Math.floor(random() * (jitterMs + 1));
  const remainingMs = targetMs - (Date.now() - startedAt);
  if (remainingMs > 0) await sleep(remainingMs);
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerified: Boolean(user.emailVerifiedAt),
    memberships:
      user.memberships?.map(({ tenantId, role, organization }) => ({
        tenantId,
        role,
        canCreateEvents: hasPermission({ role }, PERMISSIONS.EVENTS_CREATE),
        canCreateVolunteers: hasPermission({ role }, PERMISSIONS.VOLUNTEERS_CREATE),
        organization: {
          id: organization.id,
          name: organization.name,
          country: organization.country,
          isDemo: organization.isDemo,
        },
      })) ?? [],
  };
}

export function createAuthRouter({
  authService,
  config,
  governance,
  registrationTiming,
  rateLimiters = {},
}) {
  const router = Router();
  const limited = (name) => rateLimiters[name] || noRateLimit;
  router.post(
    "/register",
    limited("registration"),
    asyncRoute(async (request, response) => {
      const startedAt = Date.now();
      try {
        await authService.register(request.body);
      } catch (error) {
        if (error.code !== "P2002") throw error;
        console.info(
          JSON.stringify({
            at: new Date().toISOString(),
            level: "info",
            event: "registration",
            code: "UNIQUE_CONSTRAINT_SUPPRESSED",
            requestId: request.id,
          }),
        );
      }
      await normalizeRegistrationTiming(startedAt, registrationTiming);
      response.status(202).json({
        message: REGISTRATION_NEUTRAL_MESSAGE,
      });
    }),
  );
  router.post(
    "/login",
    limited("login"),
    asyncRoute(async (request, response) => {
      let result;
      try {
        result = await authService.login({
          ...request.body,
          userAgent: request.get("user-agent"),
          ipHash: hashIp(request.ip, config.sessionSecret),
        });
      } catch (error) {
        await governance?.audit({
          tenantId: null,
          actorId: null,
          action: "LOGIN_FAILED",
          entity: "auth_session",
          metadata: { successful: false, ipHash: hashIp(request.ip, config.sessionSecret) },
        });
        throw error;
      }
      response.setHeader("Set-Cookie", sessionCookie(result.token, config.isProduction));
      await governance?.audit({
        tenantId: result.user.memberships[0]?.tenantId || null,
        actorId: result.user.id,
        action: "LOGIN",
        entity: "auth_session",
        entityId: result.session.id,
        metadata: { successful: true },
      });
      response.json({ user: publicUser(result.user) });
    }),
  );
  router.post(
    "/logout",
    asyncRoute(async (request, response) => {
      await authService.logout(readCookie(request, SESSION_COOKIE));
      response.setHeader("Set-Cookie", expiredSessionCookie(config.isProduction));
      response.status(204).end();
    }),
  );
  router.post(
    "/password-reset/request",
    limited("passwordResetRequest"),
    asyncRoute(async (request, response) => {
      await authService.requestPasswordReset(request.body?.email);
      response
        .status(202)
        .json({ message: "If the account exists, reset instructions will be sent." });
    }),
  );
  router.post(
    "/password-reset/confirm",
    limited("passwordResetConfirmation"),
    asyncRoute(async (request, response) => {
      await authService.resetPassword(request.body?.token, request.body?.password);
      response.status(204).end();
    }),
  );
  router.post(
    "/email-verification/request",
    limited("verificationResend"),
    asyncRoute(async (request, response) => {
      await authService.requestEmailVerification(request.body?.email);
      response.status(202).json({
        message: "If the account exists and is unverified, verification instructions will be sent.",
      });
    }),
  );
  router.post(
    "/email-verification/confirm",
    asyncRoute(async (request, response) => {
      try {
        await authService.verifyEmail(request.body?.token);
        response.status(204).end();
      } catch (error) {
        if (error.verificationCode)
          return response.status(error.status || 400).json({
            message: error.message,
            code: error.verificationCode,
          });
        throw error;
      }
    }),
  );
  router.get("/me", requireSession, (request, response) =>
    response.json({ user: publicUser(request.auth.user) }),
  );
  return router;
}

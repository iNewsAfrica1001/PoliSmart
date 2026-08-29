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
        organization: {
          id: organization.id,
          name: organization.name,
          country: organization.country,
          isDemo: organization.isDemo,
        },
      })) ?? [],
  };
}

export function createAuthRouter({ authService, config, governance }) {
  const router = Router();
  router.post(
    "/register",
    asyncRoute(async (request, response) => {
      try {
        const result = await authService.register(request.body);
        response.status(201).json({
          user: publicUser(result.user),
          organization: {
            id: result.organization.id,
            name: result.organization.name,
            country: result.organization.country,
          },
          message: result.notificationDelivered
            ? "Registration complete. Check your email to verify your address."
            : "Registration complete. Verification email delivery is delayed; contact support to resend it.",
        });
      } catch (error) {
        if (error.code === "P2002")
          throw Object.assign(
            new Error("An account or organization with those details already exists."),
            { status: 409 },
          );
        throw error;
      }
    }),
  );
  router.post(
    "/login",
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
    asyncRoute(async (request, response) => {
      await authService.requestPasswordReset(request.body?.email);
      response
        .status(202)
        .json({ message: "If the account exists, reset instructions will be sent." });
    }),
  );
  router.post(
    "/password-reset/confirm",
    asyncRoute(async (request, response) => {
      await authService.resetPassword(request.body?.token, request.body?.password);
      response.status(204).end();
    }),
  );
  router.post(
    "/email-verification/request",
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

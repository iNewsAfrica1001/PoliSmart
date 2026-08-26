import { createHash } from "node:crypto";
import { hasPermission } from "../services/authorization.js";

export const SESSION_COOKIE = "polismart_session";
export function readCookie(request, name) {
  const cookies = String(request.headers.cookie ?? "")
    .split(";")
    .map((part) => part.trim().split("="));
  const value = cookies.find(([key]) => key === name)?.[1];
  return value ? decodeURIComponent(value) : null;
}
export function sessionCookie(token, isProduction) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${isProduction ? "; Secure" : ""}`;
}
export function expiredSessionCookie(isProduction) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isProduction ? "; Secure" : ""}`;
}
export function hashIp(ip, secret) {
  return createHash("sha256")
    .update(`${secret}:${ip ?? ""}`)
    .digest("hex");
}

export function authenticateRequests(authService) {
  return async (request, _response, next) => {
    try {
      const session = await authService.authenticate(readCookie(request, SESSION_COOKIE));
      request.auth = session ? { sessionId: session.id, user: session.user } : null;
      next();
    } catch (error) {
      next(error);
    }
  };
}
export function requireSession(request, _response, next) {
  if (!request.auth)
    return next(Object.assign(new Error("Authentication required."), { status: 401 }));
  next();
}
export function requireTenantPermission(permission) {
  return (request, _response, next) => {
    const tenantId = request.headers["x-organization-id"];
    const membership = request.auth?.user.memberships.find((item) => item.tenantId === tenantId);
    if (!membership || !hasPermission({ role: membership.role }, permission))
      return next(
        Object.assign(new Error("You do not have permission to access this organization."), {
          status: 403,
        }),
      );
    request.tenant = { id: tenantId, membership };
    next();
  };
}

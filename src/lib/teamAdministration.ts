import { ApiError } from "./auth";

const api = async <T>(path: string, tenantId: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Organization-Id": tenantId,
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.message || "Team request failed.", body.code);
  return body as T;
};
export type TeamMember = {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: { displayName: string; email: string };
};
export type TeamInvitation = {
  id: string;
  recipientEmail: string;
  role: string;
  status: string;
  effectiveStatus: string;
  expiresAt: string;
  createdAt: string;
};
export const teamApi = {
  list: (tenantId: string) =>
    api<{ members: TeamMember[]; invitations: TeamInvitation[]; assignableRoles: string[] }>(
      "/api/team",
      tenantId,
    ),
  invite: (tenantId: string, email: string, role: string) =>
    api("/api/team/invitations", tenantId, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  resend: (tenantId: string, id: string) =>
    api(`/api/team/invitations/${id}/resend`, tenantId, { method: "POST" }),
  revoke: (tenantId: string, id: string) =>
    api(`/api/team/invitations/${id}/revoke`, tenantId, { method: "POST" }),
  role: (tenantId: string, id: string, role: string) =>
    api(`/api/team/members/${id}/role`, tenantId, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  status: (tenantId: string, id: string, action: "suspend" | "reactivate") =>
    api(`/api/team/members/${id}/${action}`, tenantId, { method: "POST" }),
  inspect: (token: string) =>
    api<{
      invitation: {
        organizationName: string;
        role: string;
        expiresAt: string;
        maskedEmail: string;
      };
    }>("/api/team/invitations/inspect", "", { method: "POST", body: JSON.stringify({ token }) }),
  acceptNew: (token: string, displayName: string, password: string) =>
    api("/api/team/invitations/accept-new", "", {
      method: "POST",
      body: JSON.stringify({ token, displayName, password }),
    }),
  acceptExisting: (token: string) =>
    api("/api/team/invitations/accept-existing", "", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
};

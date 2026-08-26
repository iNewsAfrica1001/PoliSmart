import type { SessionUser } from "./auth";
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
async function request<T>(tenantId: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Organization-Id": tenantId,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Operation failed.");
  }
  return response.json() as Promise<T>;
}
export type Campaign = {
  id: string;
  name: string;
  status: string;
  country: string;
  electionType: string;
  startsAt?: string;
  endsAt?: string;
};
export type OperationsItem = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  startsAt?: string;
  dueAt?: string;
  type?: string;
  venue?: string;
};
export const activeTenant = (user: SessionUser) => user.memberships[0]?.tenantId ?? "";
export const operationsApi = {
  campaigns: (tenantId: string) => request<{ campaigns: Campaign[] }>(tenantId, "/api/campaigns"),
  createCampaign: (tenantId: string, data: Record<string, unknown>) =>
    request<{ campaign: Campaign }>(tenantId, "/api/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCampaign: (tenantId: string, id: string, data: Record<string, unknown>) =>
    request<{ updated: true }>(tenantId, `/api/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  list: (tenantId: string, campaignId: string, kind: string) =>
    request<{ items: OperationsItem[] }>(tenantId, `/api/operations/${campaignId}/${kind}`),
  create: (tenantId: string, campaignId: string, kind: string, data: Record<string, unknown>) =>
    request<{ item: OperationsItem }>(tenantId, `/api/operations/${campaignId}/${kind}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  volunteers: (tenantId: string) =>
    request<{
      volunteers: Array<{
        id: string;
        displayName: string;
        trainingStatus: string;
        languages: string[];
        skills: string[];
      }>;
    }>(tenantId, "/api/operations/volunteers/list"),
  createVolunteer: (tenantId: string, data: Record<string, unknown>) =>
    request(tenantId, "/api/operations/volunteers", { method: "POST", body: JSON.stringify(data) }),
};

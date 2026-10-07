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
  ownerId?: string;
  owner?: { displayName: string };
  geographicAreaId?: string;
  geographicArea?: { name: string };
};
export type VolunteerRecord = {
  id: string;
  displayName: string;
  contactAuthorized: boolean;
  email?: string;
  phone?: string;
  availability: Record<string, unknown>;
  trainingStatus: string;
  languages: string[];
  skills: string[];
};
export type ManagementOptions = {
  members: Array<{ id: string; displayName: string }>;
  tasks: Array<{ id: string; title: string }>;
  events: Array<{ id: string; title: string }>;
};
export type EventGeographyOption = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
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
  update: (
    tenantId: string,
    campaignId: string,
    kind: string,
    id: string,
    data: Record<string, unknown>,
  ) =>
    request<{ updated: true }>(tenantId, `/api/operations/${campaignId}/${kind}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  addDependency: (tenantId: string, campaignId: string, taskId: string, dependsOnTaskId: string) =>
    request(tenantId, `/api/operations/${campaignId}/tasks/${taskId}/dependencies`, {
      method: "POST",
      body: JSON.stringify({ dependsOnTaskId }),
    }),
  volunteers: (tenantId: string) =>
    request<{
      volunteers: VolunteerRecord[];
    }>(tenantId, "/api/operations/volunteers/list"),
  createVolunteer: (tenantId: string, data: Record<string, unknown>) =>
    request(tenantId, "/api/operations/volunteers", { method: "POST", body: JSON.stringify(data) }),
  updateVolunteer: (tenantId: string, id: string, data: Record<string, unknown>) =>
    request<{ updated: true }>(tenantId, `/api/operations/volunteers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  managementOptions: (tenantId: string, campaignId: string) =>
    request<ManagementOptions>(tenantId, `/api/operations/${campaignId}/management-options`),
  assignVolunteer: (
    tenantId: string,
    campaignId: string,
    data: { volunteerId: string; taskId?: string; title: string; status: string },
  ) =>
    request(tenantId, `/api/operations/${campaignId}/assignments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addEventParticipant: (
    tenantId: string,
    campaignId: string,
    eventId: string,
    data: { volunteerId: string; status: string },
  ) =>
    request(tenantId, `/api/operations/${campaignId}/events/${eventId}/participants`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  eventGeography: (tenantId: string, campaignId: string, search = "") => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    return request<{ items: EventGeographyOption[] }>(
      tenantId,
      `/api/operations/${campaignId}/event-geography?${query}`,
    );
  },
};

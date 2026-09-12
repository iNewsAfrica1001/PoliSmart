import { ApiError } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type PrelaunchLead = {
  id: string;
  requestType: "EARLY_ACCESS" | "DEMO";
  name: string;
  email: string;
  organization: string;
  country: string;
  role: string;
  interest: string | null;
  organizationType: string | null;
  timing: string | null;
  note: string | null;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  nextFollowUp: { id: string; scheduledAt: string } | null;
  followUpState: "OVERDUE" | "UPCOMING" | "NONE";
};

export type PrelaunchLeadFollowUp = {
  id: string;
  leadId: string;
  note: string;
  scheduledAt: string;
  createdAt: string;
  completedAt: string | null;
  createdBy: { id: string; displayName: string };
  completedBy: { id: string; displayName: string } | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
    const error = new ApiError(payload.message ?? "Request failed.", payload.code) as ApiError & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export const prelaunchAdminApi = {
  list: (filters: { requestType?: string; country?: string; status?: string }) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
    return request<{ leads: PrelaunchLead[] }>(`/api/admin/prelaunch-leads?${query}`);
  },
  detail: (id: string) => request<{ lead: PrelaunchLead }>(`/api/admin/prelaunch-leads/${id}`),
  updateStatus: (id: string, status: PrelaunchLead["status"]) =>
    request<{ lead: PrelaunchLead }>(`/api/admin/prelaunch-leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  listFollowUps: (leadId: string) =>
    request<{ followUps: PrelaunchLeadFollowUp[] }>(
      `/api/admin/prelaunch-leads/${leadId}/follow-ups`,
    ),
  createFollowUp: (leadId: string, input: { note: string; scheduledAt: string }) =>
    request<{ followUp: PrelaunchLeadFollowUp }>(
      `/api/admin/prelaunch-leads/${leadId}/follow-ups`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  completeFollowUp: (leadId: string, followUpId: string) =>
    request<{ followUp: PrelaunchLeadFollowUp }>(
      `/api/admin/prelaunch-leads/${leadId}/follow-ups/${followUpId}/complete`,
      { method: "PATCH" },
    ),
};

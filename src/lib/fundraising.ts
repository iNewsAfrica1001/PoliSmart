const API_BASE = import.meta.env.VITE_API_BASE ?? "";
async function request<T>(tenantId: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init, credentials: "include",
    headers: { "Content-Type": "application/json", "X-Organization-Id": tenantId, ...init?.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || "Fundraising records are temporarily unavailable.");
  }
  return response.json() as Promise<T>;
}
export type FundraisingRecord = {
  id: string; title?: string; displayName?: string; amount?: string; targetAmount?: string;
  contributedAt?: string; occursAt?: string; dueAt?: string; status: string;
  affiliation?: string; sourceMethod?: string; contactId?: string;
  currency?: string; goalId?: string; confirmedAmount?: number;
};
export type FundraisingOverview = {
  goals: FundraisingRecord[]; contacts: FundraisingRecord[]; contributions: FundraisingRecord[];
  activities: FundraisingRecord[]; followUps: FundraisingRecord[];
  confirmedTotals: Array<{ currency: string; amount: number }>;
};
export type FundraisingHistoryRecord = { id: string; entityType: string; entityId: string; action: string; changes: unknown; createdAt: string };
export const fundraisingApi = {
  overview: (tenantId: string, campaignId: string) => request<FundraisingOverview>(tenantId, `/api/fundraising/${campaignId}`),
  create: (tenantId: string, campaignId: string, kind: string, data: Record<string, unknown>) =>
    request<{ item: FundraisingRecord }>(tenantId, `/api/fundraising/${campaignId}/${kind}`, { method: "POST", body: JSON.stringify(data) }),
  archive: (tenantId: string, campaignId: string, kind: string, id: string) =>
    request<{ archived: true }>(tenantId, `/api/fundraising/${campaignId}/${kind}/${id}/archive`, { method: "POST" }),
  updateContributionStatus: (tenantId: string, campaignId: string, id: string, status: string) =>
    request(tenantId, `/api/fundraising/${campaignId}/contributions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  history: (tenantId: string, campaignId: string) => request<{ items: FundraisingHistoryRecord[] }>(tenantId, `/api/fundraising/${campaignId}/history`),
};

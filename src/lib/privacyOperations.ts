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
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Privacy operation failed.");
  return payload;
}
export type PrivacyCase = {
  id: string;
  caseReference: string;
  requestType: string;
  status: string;
  receivedAt: string;
  identityVerificationStatus: string;
  resolutionStatus?: string | null;
};
export const privacyOperationsApi = {
  listCases: (tenantId: string, campaignId: string) =>
    request<{ cases: PrivacyCase[] }>(tenantId, `/api/privacy-operations/${campaignId}/cases`),
  createCase: (tenantId: string, campaignId: string, data: Record<string, unknown>) =>
    request<{ case: PrivacyCase }>(tenantId, `/api/privacy-operations/${campaignId}/cases`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  preview: (tenantId: string, campaignId: string, caseId: string, action: string) =>
    request<{ preview: { executable: boolean; policyStatus: string; legalHoldBlocked: boolean } }>(
      tenantId,
      `/api/privacy-operations/${campaignId}/cases/${caseId}/preview`,
      { method: "POST", body: JSON.stringify({ action }) },
    ),
};

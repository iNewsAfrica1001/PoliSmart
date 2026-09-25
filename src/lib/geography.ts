import { activeTenant } from "./operations";
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
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Geographic operation failed.");
  return payload as T;
}
export const geographyTenant = (user: SessionUser) => activeTenant(user);
export const geographyApi = {
  levels: (tenantId: string) =>
    request<{ levels: Array<{ id: string; name: string; orderIndex: number; isActive: boolean }> }>(
      tenantId,
      "/api/operations/geography/levels",
    ),
  campaigns: (tenantId: string) =>
    request<{ campaigns: Array<{ id: string; name: string }> }>(tenantId, "/api/campaigns"),
  areas: (tenantId: string, campaignId: string) =>
    request<{
      items: Array<{
        id: string;
        name: string;
        code?: string;
        isActive: boolean;
        level: { id: string; name: string };
        parent?: { id: string; name: string };
      }>;
    }>(tenantId, `/api/operations/${campaignId}/geography/areas`),
  createLevel: (tenantId: string, data: object) =>
    request(tenantId, "/api/operations/geography/levels", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateLevel: (tenantId: string, id: string, data: object) =>
    request(tenantId, `/api/operations/geography/levels/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createArea: (tenantId: string, campaignId: string, data: object) =>
    request(tenantId, `/api/operations/${campaignId}/geography/areas`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateArea: (tenantId: string, campaignId: string, id: string, data: object) =>
    request(tenantId, `/api/operations/${campaignId}/geography/areas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  importRows: (tenantId: string, campaignId: string, data: object) =>
    request<{ mode: string; report: Record<string, unknown> }>(
      tenantId,
      `/api/operations/${campaignId}/geography/import`,
      { method: "POST", body: JSON.stringify(data) },
    ),
};
